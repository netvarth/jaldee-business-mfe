
import {
  DEFAULT_ENABLED_MODULES,
  DEFAULT_LICENSED_PRODUCTS,
  normalizeAccountContext,
} from "@jaldee/auth-context";
import type { UserContext, AccountContext, BranchLocation } from "@jaldee/auth-context";
import { apiClient, setApiClientContext } from "@jaldee/api-client";
import { baseService } from "./baseService";
import { BASE_SERVICE_ENDPOINTS, TOKEN_AUTH_ENDPOINTS, buildAuthServiceUrl, buildBaseServiceUrl } from "./serviceUrls";

export interface SessionResponse {
  user: UserContext;
  account: AccountContext;
  locations: BranchLocation[];
  token?: string;
  refreshToken?: string;
  multiFactorAuthenticationRequired?: boolean;
  otpLength?: number;
  maskedDestination?: string;
}

export interface LoginRequest {
  loginId: string;
  password: string;
  mUniqueId?: string;
  multiFactorAuthenticationLogin?: boolean;
  otp?: string;
}

export interface EncryptedLoginRequest {
  loginId: string;
  password: string;
  mUniqueId?: string;
  multiFactorAuthenticationLogin?: boolean;
  otp?: string;
}

interface TokenEncryptedLoginRequest {
  userType: "TENANT_USER";
  identifierType: "LOGIN_ID";
  identifier: string;
  password: string;
}

export interface AccountSettingsResponse {
  enableTask?: boolean;
  enableLead?: boolean;
  enableMembership?: boolean;
  enableCrmLead?: boolean;
  enableItemGroup?: boolean;
  enableSalesOrder?: boolean;
  onlinePayment?: boolean;
}

interface TokenLoginResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds?: number;
  refreshExpiresInSeconds?: number;
}

interface StoredTokenSession extends TokenLoginResponse {
  accessExpiresAt?: number;
  refreshExpiresAt?: number;
}

export interface TenantSignupOtpRequest {
  loginId: string;
  mobile?: string;
  email?: string;
  firstName: string;
  lastName?: string;
  password: string;
}

export interface TenantSignupOtpResponse {
  otpId: string;
  expiresInSeconds?: number;
  nextResendInSeconds?: number;
  maskedTarget?: string;
}

export interface TenantSignupVerifyRequest {
  otpId: string;
  otp: string;
  purpose?: "TENANT_SIGNUP_VERIFY_MOBILE" | "TENANT_SIGNUP_VERIFY_EMAIL";
}

const isMock = import.meta.env.VITE_USE_MOCK === "true";
const authMode = import.meta.env.VITE_AUTH_MODE === "token" ? "token" : "session";
const M_UNIQUE_ID_KEY = "mUniqueId";
const LOGIN_CREDENTIALS_KEY = "ynw-credentials";
const TOKEN_SESSION_KEY = "jaldee-token-session";
const SESSION_ENCRYPTION_KEY_B64 = "amFsZGVlRW5jcnlwdGlvbkRlY3J5cHRpb24xNDA2MjM=";
const SESSION_ENCRYPTION_IV_B64 = "RW5jRGVjSmFsZGVlMDYyMw==";
const TOKEN_ENCRYPTION_KEY_B64 = "amFsZGVlRW5jcnlwdGlvbkRlY3J5cHRpb24xMTA1MjY=";
const TOKEN_ENCRYPTION_IV_B64 = "H/x9FjXoH0ZfXHMK";

const GCM_IV_LENGTH_BYTES = 12;
const GCM_TAG_LENGTH_BITS = 128;

const SECRET_KEY_BASE64 = import.meta.env.VITE_AES_SECRET_KEY_BASE64 || TOKEN_ENCRYPTION_KEY_B64;
const IV_KEY_BASE64 = import.meta.env.VITE_AES_IV_KEY_BASE64 || TOKEN_ENCRYPTION_IV_B64;

function concatBytes(first: Uint8Array, second: Uint8Array): Uint8Array {
  const result = new Uint8Array(first.length + second.length);
  result.set(first, 0);
  result.set(second, first.length);
  return result;
}

function xorIv(nonce: Uint8Array, ivKey: Uint8Array): Uint8Array {
  if (nonce.length !== GCM_IV_LENGTH_BYTES) {
    throw new Error("Nonce must be 12 bytes");
  }

  if (ivKey.length !== GCM_IV_LENGTH_BYTES) {
    throw new Error("IV key must be 12 bytes");
  }

  const iv = new Uint8Array(GCM_IV_LENGTH_BYTES);

  for (let i = 0; i < GCM_IV_LENGTH_BYTES; i++) {
    iv[i] = nonce[i] ^ ivKey[i];
  }

  return iv;
}

async function importAesGcmTokenKey(): Promise<CryptoKey> {
  const keyBytes = decodeBase64Utf8(SECRET_KEY_BASE64);

  if (keyBytes.length !== 32) {
    throw new Error("AES secret key must be 32 bytes after Base64 decode");
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function getTokenIvKeyBytes(): Uint8Array {
  const ivKey = decodeBase64Utf8(IV_KEY_BASE64);

  if (ivKey.length !== GCM_IV_LENGTH_BYTES) {
    throw new Error("AES-GCM IV key must be 12 bytes after Base64 decode");
  }

  return ivKey;
}
export function getAuthMode() {
  return authMode;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getStoredMUniqueId(): string {
  return getStorage()?.getItem(M_UNIQUE_ID_KEY) ?? "";
}

export function setStoredMUniqueId(value: string) {
  if (!value) return;
  getStorage()?.setItem(M_UNIQUE_ID_KEY, value);
}

export function getStoredCredentials(): LoginRequest | null {
  const raw = getStorage()?.getItem(LOGIN_CREDENTIALS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginRequest;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string {
  return getStoredTokenSession()?.accessToken ?? "";
}

export function hasStoredAuthSession(): boolean {
  return authMode === "token" ? Boolean(getStoredAccessToken()) : Boolean(getStoredCredentials());
}

export function setStoredCredentials(payload: LoginRequest) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    LOGIN_CREDENTIALS_KEY,
    JSON.stringify({
      loginId: payload.loginId,
      password: payload.password,
      mUniqueId: payload.mUniqueId ?? getStoredMUniqueId(),
    })
  );
}

export function clearStoredCredentials() {
  getStorage()?.removeItem(LOGIN_CREDENTIALS_KEY);
  clearStoredTokenSession();
}

function getStoredTokenSession(): StoredTokenSession | null {
  const raw = getStorage()?.getItem(TOKEN_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredTokenSession;
  } catch {
    return null;
  }
}

function setStoredTokenSession(tokens: TokenLoginResponse) {
  const storage = getStorage();
  if (!storage) return;

  const now = Date.now();
  storage.setItem(
    TOKEN_SESSION_KEY,
    JSON.stringify({
      ...tokens,
      accessExpiresAt: tokens.accessExpiresInSeconds ? now + tokens.accessExpiresInSeconds * 1000 : undefined,
      refreshExpiresAt: tokens.refreshExpiresInSeconds ? now + tokens.refreshExpiresInSeconds * 1000 : undefined,
    })
  );
}

function clearStoredTokenSession() {
  getStorage()?.removeItem(TOKEN_SESSION_KEY);
}

async function establishTokenSession(tokens: TokenLoginResponse): Promise<SessionResponse> {
  setStoredTokenSession(tokens);
  setApiClientContext({ authMode: "token", authToken: tokens.accessToken });

  const context = await authService.checkSession();
  return {
    ...context,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

function buildLoginRequest(payload: LoginRequest): EncryptedLoginRequest {
  const storedMUniqueId = getStoredMUniqueId();

  return {
    loginId: payload.loginId,
    password: payload.password,
    mUniqueId: (payload.mUniqueId ?? storedMUniqueId) || undefined,
    multiFactorAuthenticationLogin: payload.multiFactorAuthenticationLogin,
    otp: payload.otp,
  };
}

function buildTokenLoginRequest(payload: LoginRequest): TokenEncryptedLoginRequest {
  return {
    userType: "TENANT_USER",
    identifierType: "LOGIN_ID",
    identifier: payload.loginId,
    password: payload.password,
  };
}

function decodeBase64Utf8(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64Bytes(value: string): Uint8Array {
  const normalized = normalizeEncryptedPayload(value);
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function normalizeEncryptedPayload(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Encrypted payload is empty");
  }

  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return JSON.parse(trimmed) as string;
  }

  return trimmed;
}

async function encryptUsingAES256(
  payload: EncryptedLoginRequest,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array
): Promise<string> {
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    encodedPayload
  );

  return encodeBase64(new Uint8Array(encrypted));
}

async function decryptUsingAES256(encryptedText: string): Promise<string> {
  const keyBytes = decodeBase64Utf8(SESSION_ENCRYPTION_KEY_B64);
  const ivBytes = decodeBase64Utf8(SESSION_ENCRYPTION_IV_B64);
  const encryptedBytes = decodeBase64Bytes(encryptedText);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decrypted);
}

async function encryptSessionLogin(payload: EncryptedLoginRequest): Promise<string> {
  return encryptUsingAES256(
    payload,
    decodeBase64Utf8(SESSION_ENCRYPTION_KEY_B64),
    decodeBase64Utf8(SESSION_ENCRYPTION_IV_B64)
  );
}

async function encryptTokenLogin(payload: TokenEncryptedLoginRequest): Promise<string> {
  const aesKey = await importAesGcmTokenKey();
  const ivKey = getTokenIvKeyBytes();
  const nonce = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES));

  const iv = xorIv(nonce, ivKey);

  const plainText = JSON.stringify(payload);
  const plainBytes = new TextEncoder().encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: GCM_TAG_LENGTH_BITS,
    },
    aesKey,
    plainBytes
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const finalPayload = concatBytes(nonce, encryptedBytes);

  return encodeBase64(finalPayload);
}

async function decryptTokenLoginResponse(encryptedText: string): Promise<string> {
  const aesKey = await importAesGcmTokenKey();
  const ivKey = getTokenIvKeyBytes();
  const payload = decodeBase64Bytes(encryptedText);

  if (payload.length < GCM_IV_LENGTH_BYTES) {
    throw new Error("Invalid encrypted payload");
  }

  const nonce = payload.slice(0, GCM_IV_LENGTH_BYTES);
  const encryptedBytes = payload.slice(GCM_IV_LENGTH_BYTES);

  const iv = xorIv(nonce, ivKey);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: GCM_TAG_LENGTH_BITS,
    },
    aesKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

function normalizeRoles(input: unknown): UserContext["roles"] {
  if (Array.isArray(input) && input.length > 0) {
    return input.map((role, index) => {
      if (typeof role === "string") {
        return {
          id: `role-${index}`,
          name: role,
          tier: index === 0 ? "owner" : "custom",
        } as const;
      }

      if (typeof role === "object" && role !== null) {
        const candidate = role as Record<string, unknown>;
        return {
          id: String(candidate.id ?? `role-${index}`),
          name: String(candidate.name ?? candidate.roleName ?? "Role"),
          tier: candidate.tier === "custom" ? "custom" : "owner",
        } as const;
      }

      return {
        id: `role-${index}`,
        name: "Role",
        tier: "custom",
      } as const;
    });
  }

  return [{ id: "role-owner", name: "Admin", tier: "owner" }];
}

function normalizeLocations(input: unknown): BranchLocation[] {
  if (Array.isArray(input) && input.length > 0) {
    return input.map((location, index) => {
      if (typeof location === "string") {
        return {
          id: location,
          name: location,
          code: location,
        };
      }

      const candidate = (typeof location === "object" && location !== null
        ? location
        : {}) as Record<string, unknown>;

      return {
        id: String(candidate.id ?? candidate.locationId ?? `loc-${index + 1}`),
        name: String(candidate.name ?? candidate.locationName ?? candidate.branchName ?? `Location ${index + 1}`),
        code: String(candidate.code ?? candidate.branchCode ?? `LOC${index + 1}`),
      };
    });
  }

  return [{ id: "loc-default", name: "Default Location", code: "DEF" }];
}

async function fetchProviderLocations(): Promise<BranchLocation[]> {
  if (isMock) {
    const { mockLocations } = await import("../mocks/mockAuth");
    return mockLocations;
  }

  if (authMode === "token") {
    return baseService.getLocations();
  }

  const response = await apiClient.get<unknown>("/provider/locations");
  return normalizeLocations(response.data);
}

function normalizeAccountSettings(raw: unknown): AccountSettingsResponse {
  const candidate = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  return {
    enableTask: candidate.enableTask === true,
    enableLead: candidate.enableLead === true,
    enableMembership: candidate.enableMembership === true,
    enableCrmLead: candidate.enableCrmLead === true,
    enableItemGroup: candidate.enableItemGroup === true,
    enableSalesOrder: candidate.enableSalesOrder === true,
    onlinePayment: candidate.onlinePayment === true
  };
}

async function fetchAccountSettings(): Promise<AccountSettingsResponse> {
  if (isMock) {
    return {
      enableTask: true,
      enableLead: true,
      enableMembership: true,
      enableCrmLead: true,
      enableItemGroup: false,
      enableSalesOrder: true,
      onlinePayment: true
    };
  }

  try {
    const response = await apiClient.get<unknown>("provider/account/settings");
    return normalizeAccountSettings(response.data);
  } catch (error) {
    console.warn("[authService] failed to fetch account settings", error);
    return {};
  }
}

function deriveEnabledModules(
  enabledModules: AccountContext["enabledModules"],
  settings: AccountSettingsResponse,
  licensedProducts?: AccountContext["licensedProducts"]
): AccountContext["enabledModules"] {
  const modules = new Set<string>(
    Array.isArray(enabledModules)
      ? enabledModules.map(String)
      : [...DEFAULT_ENABLED_MODULES, "membership", "tasks", "leads"]
  );

  if (licensedProducts?.includes("finance")) {
    modules.add("finance");
  }

  if (settings.enableMembership) {
    modules.add("membership");
  } else {
    modules.delete("membership");
  }

  if (settings.enableTask) {
    modules.add("tasks");
  } else {
    modules.delete("tasks");
  }

  if (settings.enableLead || settings.enableCrmLead) {
    modules.add("leads");
  } else {
    modules.delete("leads");
  }

  return Array.from(modules) as AccountContext["enabledModules"];
}

async function normalizeLoginResponse(raw: unknown): Promise<SessionResponse> {
  const normalized = normalizeSessionResponse(raw);
  const settings = await fetchAccountSettings();

  return {
    ...normalized,
    account: normalizeAccountContext({
      ...normalized.account,
      enabledModules: deriveEnabledModules(
        normalized.account.enabledModules,
        settings,
        normalized.account.licensedProducts
      ),
    }),
  };
}

function normalizeSessionResponse(raw: unknown): SessionResponse {
  const candidate =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const rawUser =
    typeof candidate.user === "object" && candidate.user !== null
      ? (candidate.user as Record<string, unknown>)
      : candidate;

  const rawAccount =
    typeof candidate.account === "object" && candidate.account !== null
      ? (candidate.account as Record<string, unknown>)
      : candidate;

  const user: UserContext = {
    id: String(rawUser.id ?? rawUser.userId ?? rawUser.providerId ?? "user-1"),
    name: String(rawUser.name ?? rawUser.userName ?? rawUser.firstName ?? rawUser.businessName ?? "Jaldee User"),
    email: String(rawUser.email ?? rawUser.loginId ?? rawUser.userId ?? "user@jaldee.com"),
    avatar: typeof rawUser.avatar === "string" ? rawUser.avatar : undefined,
    roles: normalizeRoles(rawUser.roles),
    permissions: Array.isArray(rawUser.permissions)
      ? rawUser.permissions.map((permission) => String(permission))
      : Array.isArray(rawUser.perms)
        ? rawUser.perms.map((permission) => String(permission))
        : [],
  };

  const account: AccountContext = {
    id: String(rawAccount.id ?? rawAccount.accountId ?? rawAccount.providerId ?? user.id),
    name: String(rawAccount.name ?? rawAccount.businessName ?? rawAccount.tenantName ?? user.name ?? "Jaldee Business"),
    licensedProducts: Array.isArray(rawAccount.licensedProducts)
      ? (rawAccount.licensedProducts as AccountContext["licensedProducts"])
      : DEFAULT_LICENSED_PRODUCTS,
    enabledModules: Array.isArray(rawAccount.enabledModules)
      ? (rawAccount.enabledModules as AccountContext["enabledModules"])
      : DEFAULT_ENABLED_MODULES,
    theme: {
      primaryColor: String(
        (rawAccount.theme as Record<string, unknown> | undefined)?.primaryColor ??
        rawAccount.primaryColor ??
        "#5B21D1"
      ),
      logoUrl: String(
        (rawAccount.theme as Record<string, unknown> | undefined)?.logoUrl ??
        rawAccount.logoUrl ??
        ""
      ),
      faviconUrl: typeof (rawAccount.theme as Record<string, unknown> | undefined)?.faviconUrl === "string"
        ? String((rawAccount.theme as Record<string, unknown>).faviconUrl)
        : undefined,
    },
    plan:
      rawAccount.plan === "starter" || rawAccount.plan === "enterprise"
        ? rawAccount.plan
        : "growth",
    domain:
      rawAccount.domain === "retail" ||
        rawAccount.domain === "service" ||
        rawAccount.domain === "finance" ||
        rawAccount.domain === "corporate" ||
        rawAccount.domain === "education" ||
        rawAccount.domain === "other"
        ? rawAccount.domain
        : "healthcare",
    labels: {
      customer: String((rawAccount.labels as Record<string, unknown> | undefined)?.customer ?? "Patient"),
      staff: String((rawAccount.labels as Record<string, unknown> | undefined)?.staff ?? "Doctor"),
      service: String((rawAccount.labels as Record<string, unknown> | undefined)?.service ?? "Service"),
      appointment: String((rawAccount.labels as Record<string, unknown> | undefined)?.appointment ?? "Appointment"),
      order: String((rawAccount.labels as Record<string, unknown> | undefined)?.order ?? "Order"),
      lead: String((rawAccount.labels as Record<string, unknown> | undefined)?.lead ?? "Lead"),
    },
  };
  const normalizedAccount = normalizeAccountContext(account);

  const locations = normalizeLocations(candidate.locations ?? candidate.location ?? candidate.branch);

  return {
    user,
    account: normalizedAccount,
    locations,
    token: typeof candidate.token === "string" ? candidate.token : getStoredAccessToken() || undefined,
    multiFactorAuthenticationRequired:
      candidate.multiFactorAuthenticationRequired === true,
    otpLength:
      typeof candidate.otpLength === "number" ? candidate.otpLength : undefined,
    maskedDestination:
      typeof candidate.maskedDestination === "string" ? candidate.maskedDestination : undefined,
  };
}

export const authService = {
  getProviderLocations: fetchProviderLocations,

  async checkSession(): Promise<SessionResponse> {
    if (isMock) {
      const { mockUser, mockAccount, mockLocations, mockToken } =
        await import("../mocks/mockAuth");

      console.log("[authService] mock locations:", mockLocations);

      return {
        user: mockUser,
        account: mockAccount,
        locations: mockLocations,
        token: mockToken,
      };
    }
    const storedTokens = authMode === "token" ? getStoredTokenSession() : null;
    if (storedTokens?.accessToken) {
      setApiClientContext({ authMode: "token", authToken: storedTokens.accessToken });
    }

    const res = await apiClient.get<SessionResponse>(
      authMode === "token" ? buildAuthServiceUrl(TOKEN_AUTH_ENDPOINTS.me) : "/auth/me",
    );
    return normalizeLoginResponse(res.data);
  },

  async login(payload: LoginRequest): Promise<SessionResponse> {
    if (authMode === "token" && !isMock) {
      return this.tokenLogin(payload);
    }

    const requestBody = buildLoginRequest(payload);

    if (isMock) {
      const { mockLogin: doMockLogin } = await import("../mocks/mockAuth");
      return doMockLogin(payload.loginId, payload.password);
    }

    const encryptedInput = await encryptSessionLogin(requestBody);
    return this.encryptLogin(encryptedInput);
  },

  async tokenLogin(payload: LoginRequest): Promise<SessionResponse> {
    const requestBody = buildTokenLoginRequest(payload);
    const encryptedInput = await encryptTokenLogin(requestBody);

    return this.tokenEncryptedLogin(encryptedInput);
  },

  async tokenEncryptedLogin(body: string): Promise<SessionResponse> {
    const res = await apiClient.post<string | TokenLoginResponse>(
      buildAuthServiceUrl(TOKEN_AUTH_ENDPOINTS.encryptedPasswordLogin),
      body,
      {
        headers: {
          "Content-Type": "text/plain",
        },
        transformRequest: [(data) => data],
        transformResponse: [(data) => data],
        _skipAuthRefresh: true,
      } as unknown,
    );

    const tokens =
      typeof res.data === "string"
        ? (JSON.parse(await decryptTokenLoginResponse(res.data)) as TokenLoginResponse)
        : res.data;
    return establishTokenSession(tokens);
  },

  async issueTenantSignupOtp(payload: TenantSignupOtpRequest): Promise<TenantSignupOtpResponse> {
    const response = await apiClient.post<TenantSignupOtpResponse>(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSignup.issueOtp),
      {
        loginId: payload.loginId.trim(),
        mobile: payload.mobile?.trim() || undefined,
        email: payload.email?.trim() || undefined,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName?.trim() || undefined,
        password: payload.password,
      },
      { _skipAuthRefresh: true } as unknown,
    );

    return response.data;
  },

  async verifyTenantSignupOtp(payload: TenantSignupVerifyRequest): Promise<SessionResponse> {
    const response = await apiClient.post<TokenLoginResponse & { verified?: boolean }>(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSignup.verifyOtp),
      {
        otpId: payload.otpId,
        otp: payload.otp.trim(),
        purpose: payload.purpose ?? "TENANT_SIGNUP_VERIFY_EMAIL",
      },
      { _skipAuthRefresh: true } as unknown,
    );

    return establishTokenSession(response.data);
  },

  async encryptLogin(body: string): Promise<SessionResponse> {
    if (isMock) {
      const { mockLogin: doMockLogin } = await import("../mocks/mockAuth");
      const payload = JSON.parse(await decryptUsingAES256(body)) as Partial<LoginRequest>;
      return doMockLogin(payload.loginId ?? "", payload.password ?? "");
    }

    const res = await apiClient.post<string>("/provider/login/encrypt", body, {
      headers: {
        "Content-Type": "text/plain",
      },
      transformRequest: [(data) => data],
      transformResponse: [(data) => data],
      _skipAuthRefresh: true,
      _skipCsrf: true,
    } as unknown);

    console.log("[authService] raw encrypted login response:", res.data);
    const decryptedResponse = await decryptUsingAES256(res.data);
    const parsedResponse = JSON.parse(decryptedResponse) as unknown;
    const normalizedResponse = await normalizeLoginResponse(parsedResponse);
    console.log("[authService] decrypted login response:", parsedResponse);
    console.log("[authService] normalized login response:", normalizedResponse);
    return normalizedResponse;
  },

  async refreshSession(): Promise<SessionResponse> {
    if (authMode === "token") {
      const storedTokens = getStoredTokenSession();
      if (!storedTokens?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const refreshPath = import.meta.env.VITE_AUTH_REFRESH_PATH?.trim() || TOKEN_AUTH_ENDPOINTS.refresh;

      const res = await apiClient.post<TokenLoginResponse>(
        buildAuthServiceUrl(refreshPath),
        { refreshToken: storedTokens.refreshToken },
        { _skipAuthRefresh: true } as unknown,
      );

      const tokens = {
        ...res.data,
        refreshToken: res.data.refreshToken || storedTokens.refreshToken,
      };
      setStoredTokenSession(tokens);
      setApiClientContext({ authMode: "token", authToken: tokens.accessToken });

      const context = await this.checkSession();
      return {
        ...context,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    }

    const credentials = getStoredCredentials();
    if (!credentials) {
      throw new Error("No stored credentials available for session refresh");
    }

    return this.login(credentials);
  },

  async logout(): Promise<void> {
    if (isMock) return;
    if (authMode === "token") {
      await apiClient.post(
        buildAuthServiceUrl(TOKEN_AUTH_ENDPOINTS.logout),
        null,
        { _skipAuthRefresh: true } as unknown,
      ).catch(() => { });
      clearStoredTokenSession();
      return;
    }
    await apiClient.delete("/provider/login").catch(() => { });
  },
};
