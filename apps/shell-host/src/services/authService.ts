
import type { UserContext, AccountContext, BranchLocation } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";

export interface SessionResponse {
  user:      UserContext;
  account:   AccountContext;
  locations: BranchLocation[];
  token?:    string;
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

export interface AccountSettingsResponse {
  enableTask?: boolean;
  enableLead?: boolean;
  enableMembership?: boolean;
  enableCrmLead?: boolean;
  enableItemGroup?: boolean;
  enableSalesOrder?: boolean;
}

const isMock = import.meta.env.VITE_USE_MOCK === "true";
const M_UNIQUE_ID_KEY = "mUniqueId";
const LOGIN_CREDENTIALS_KEY = "ynw-credentials";
const ENCRYPTION_KEY_B64 = "amFsZGVlRW5jcnlwdGlvbkRlY3J5cHRpb24xNDA2MjM=";
const ENCRYPTION_IV_B64 = "RW5jRGVjSmFsZGVlMDYyMw==";

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

async function encryptUsingAES256(payload: EncryptedLoginRequest): Promise<string> {
  const keyBytes = decodeBase64Utf8(ENCRYPTION_KEY_B64);
  const ivBytes = decodeBase64Utf8(ENCRYPTION_IV_B64);
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
  const keyBytes = decodeBase64Utf8(ENCRYPTION_KEY_B64);
  const ivBytes = decodeBase64Utf8(ENCRYPTION_IV_B64);
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
  settings: AccountSettingsResponse
): AccountContext["enabledModules"] {
  const modules = new Set<string>(
    Array.isArray(enabledModules) ? enabledModules.map(String) : ["customers", "users", "reports", "settings"]
  );

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
    account: {
      ...normalized.account,
      enabledModules: deriveEnabledModules(normalized.account.enabledModules, settings),
    },
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
      : [],
  };

  const account: AccountContext = {
    id: String(rawAccount.id ?? rawAccount.accountId ?? rawAccount.providerId ?? user.id),
    name: String(rawAccount.name ?? rawAccount.businessName ?? user.name ?? "Jaldee Business"),
    licensedProducts: Array.isArray(rawAccount.licensedProducts)
      ? (rawAccount.licensedProducts as AccountContext["licensedProducts"])
      : ["health", "bookings", "golderp"],
    enabledModules: Array.isArray(rawAccount.enabledModules)
      ? (rawAccount.enabledModules as AccountContext["enabledModules"])
      : ["customers", "users", "reports", "settings"],
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

  const locations = normalizeLocations(candidate.locations ?? candidate.location ?? candidate.branch);

  return {
    user,
    account,
    locations,
    token: typeof candidate.token === "string" ? candidate.token : undefined,
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
      user:      mockUser,
      account:   mockAccount,
      locations: mockLocations,
      token:     mockToken,
    };
  }
  const res = await apiClient.get<SessionResponse>("/auth/me");
  return res.data;
},

  async login(payload: LoginRequest): Promise<SessionResponse> {
    const requestBody = buildLoginRequest(payload);

    if (isMock) {
      const { mockLogin: doMockLogin } = await import("../mocks/mockAuth");
      return doMockLogin(payload.loginId, payload.password);
    }

    const encryptedInput = await encryptUsingAES256(requestBody);
    return this.encryptLogin(encryptedInput);
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
    });

    console.log("[authService] raw encrypted login response:", res.data);
    const decryptedResponse = await decryptUsingAES256(res.data);
    const parsedResponse = JSON.parse(decryptedResponse) as unknown;
    const normalizedResponse = await normalizeLoginResponse(parsedResponse);
    console.log("[authService] decrypted login response:", parsedResponse);
    console.log("[authService] normalized login response:", normalizedResponse);
    return normalizedResponse;
  },

  async refreshSession(): Promise<SessionResponse> {
    const credentials = getStoredCredentials();
    if (!credentials) {
      throw new Error("No stored credentials available for session refresh");
    }

    return this.login(credentials);
  },

  async logout(): Promise<void> {
    if (isMock) return;
    await apiClient.delete("/provider/login").catch(() => {});
  },
};
