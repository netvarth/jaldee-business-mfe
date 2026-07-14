import { apiClient, initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import type { LoginRequest, SessionResponse, AppUser, AppWorkspace } from "../types";

const audience = "employee";
const authMode: "session" | "token" = "token";
const testTenantUid = "532eae3c-67b9-43a0-98d1-26c0873c737e";
const storageKey = `jaldee-${audience}-session`;
const credentialsKey = `jaldee-${audience}-credentials`;
const mUniqueIdKey = "mUniqueId";
const sessionEncryptionKeyB64 = "amFsZGVlRW5jcnlwdGlvbkRlY3J5cHRpb24xNDA2MjM=";
const sessionEncryptionIvB64 = "RW5jRGVjSmFsZGVlMDYyMw==";
const tokenEncryptionKeyB64 = "amFsZGVlRW5jcnlwdGlvbkRlY3J5cHRpb24xMTA1MjY=";
const tokenEncryptionIvB64 = "H/x9FjXoH0ZfXHMK";
const gcmIvLengthBytes = 12;
const gcmTagLengthBits = 128;

const TOKEN_AUTH_ENDPOINTS = {
  passwordLogin: "/auth-service/v1/api/auth/login/password",
  logout: "/auth-service/v1/api/auth/logout",
  me: "/auth-service/v1/api/auth/me",
  refresh: "/auth-service/v1/api/auth/refresh",
} as const;

interface StoredSession {
  token?: string;
  refreshToken?: string;
}

interface TokenLoginResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds?: number;
  refreshExpiresInSeconds?: number;
}

function authPath(name: "login" | "me" | "logout" | "refresh") {
  const defaults = {
    login: TOKEN_AUTH_ENDPOINTS.passwordLogin,
    me: TOKEN_AUTH_ENDPOINTS.me,
    logout: TOKEN_AUTH_ENDPOINTS.logout,
    refresh: TOKEN_AUTH_ENDPOINTS.refresh,
  } as const;

  const overrideKey = `VITE_${name.toUpperCase()}_PATH` as const;
  return (import.meta.env[overrideKey] as string | undefined)?.trim() || defaults[name];
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function getStoredMUniqueId(): string {
  return getStorage()?.getItem(mUniqueIdKey) ?? "";
}

function readStoredSession(): StoredSession | null {
  const raw = getStorage()?.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession) {
  getStorage()?.setItem(storageKey, JSON.stringify(session));
}

function clearStoredSession() {
  getStorage()?.removeItem(storageKey);
}

function readStoredCredentials(): LoginRequest | null {
  const raw = getStorage()?.getItem(credentialsKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginRequest;
  } catch {
    return null;
  }
}

function writeStoredCredentials(payload: LoginRequest) {
  if (authMode === "session") {
    getStorage()?.setItem(credentialsKey, JSON.stringify({
      loginId: payload.loginId,
      password: payload.password,
      mUniqueId: payload.mUniqueId ?? getStoredMUniqueId(),
    }));
  }
}

function clearStoredCredentials() {
  getStorage()?.removeItem(credentialsKey);
}

function getConfiguredAuthServiceBaseUrl() {
  return import.meta.env.VITE_AUTH_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
}

function getServiceGatewayPrefix() {
  const prefix = import.meta.env.VITE_SERVICE_GATEWAY_PREFIX?.trim();
  if (!prefix || prefix === "/") return "";
  return `/${prefix.replace(/^\/+|\/+$/g, "")}`;
}

function buildAuthServiceUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase = getConfiguredAuthServiceBaseUrl() || getServiceGatewayPrefix();
  if (!configuredBase) {
    return typeof window !== "undefined" ? `${window.location.origin}${normalizedPath}` : normalizedPath;
  }
  const combinedPath = `${configuredBase}${normalizedPath}`;
  return typeof window !== "undefined" && configuredBase.startsWith("/")
    ? new URL(combinedPath, window.location.origin).toString()
    : combinedPath;
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
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("\"") && trimmed.endsWith("\"") ? JSON.parse(trimmed) as string : trimmed;
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function concatBytes(first: Uint8Array, second: Uint8Array): Uint8Array {
  const result = new Uint8Array(first.length + second.length);
  result.set(first, 0);
  result.set(second, first.length);
  return result;
}

function xorIv(nonce: Uint8Array, ivKey: Uint8Array): Uint8Array {
  const iv = new Uint8Array(gcmIvLengthBytes);
  for (let i = 0; i < gcmIvLengthBytes; i += 1) {
    iv[i] = nonce[i] ^ ivKey[i];
  }
  return iv;
}

async function importAesGcmTokenKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    decodeBase64Utf8(import.meta.env.VITE_AES_SECRET_KEY_BASE64 || tokenEncryptionKeyB64),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function getTokenIvKeyBytes(): Uint8Array {
  return decodeBase64Utf8(import.meta.env.VITE_AES_IV_KEY_BASE64 || tokenEncryptionIvB64);
}

async function encryptUsingAES256(payload: LoginRequest): Promise<string> {
  const encodedPayload = new TextEncoder().encode(JSON.stringify({
    loginId: payload.loginId,
    password: payload.password,
    mUniqueId: (payload.mUniqueId ?? getStoredMUniqueId()) || undefined,
    multiFactorAuthenticationLogin: payload.multiFactorAuthenticationLogin,
    otp: payload.otp,
  }));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    decodeBase64Utf8(sessionEncryptionKeyB64),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: decodeBase64Utf8(sessionEncryptionIvB64) },
    cryptoKey,
    encodedPayload,
  );
  return encodeBase64(new Uint8Array(encrypted));
}

async function decryptUsingAES256(encryptedText: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    decodeBase64Utf8(sessionEncryptionKeyB64),
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: decodeBase64Utf8(sessionEncryptionIvB64) },
    cryptoKey,
    decodeBase64Bytes(encryptedText),
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptTokenLogin(payload: LoginRequest): Promise<string> {
  const aesKey = await importAesGcmTokenKey();
  const ivKey = getTokenIvKeyBytes();
  const nonce = crypto.getRandomValues(new Uint8Array(gcmIvLengthBytes));
  const iv = xorIv(nonce, ivKey);
  const plainText = JSON.stringify({
    userType: "TENANT_USER",
    identifierType: "LOGIN_ID",
    identifier: payload.loginId,
    password: payload.password,
  });
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: gcmTagLengthBits,
    },
    aesKey,
    new TextEncoder().encode(plainText),
  );
  return encodeBase64(concatBytes(nonce, new Uint8Array(encryptedBuffer)));
}

function buildTokenLoginRequest(payload: LoginRequest) {
  return {
    tenantUid: testTenantUid,
    userType: "TENANT_EMPLOYEE",
    identifierType: "EMPLOYEE_ID",
    identifier: payload.loginId,
    password: payload.password,
  };
}

async function decryptTokenLoginResponse(encryptedText: string): Promise<string> {
  const aesKey = await importAesGcmTokenKey();
  const ivKey = getTokenIvKeyBytes();
  const payload = decodeBase64Bytes(encryptedText);
  const nonce = payload.slice(0, gcmIvLengthBytes);
  const encryptedBytes = payload.slice(gcmIvLengthBytes);
  const iv = xorIv(nonce, ivKey);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: gcmTagLengthBits,
    },
    aesKey,
    encryptedBytes,
  );
  return new TextDecoder().decode(decryptedBuffer);
}

function normalizeUser(raw: Record<string, unknown>): AppUser {
  return {
    id: String(raw.id ?? raw.userId ?? raw.employeeId ?? "employee-user"),
    name: String(raw.name ?? raw.userName ?? raw.firstName ?? raw.employeeName ?? "Employee"),
    email: String(raw.email ?? raw.emailId ?? raw.loginId ?? ""),
    roles: Array.isArray(raw.roles) ? raw.roles.map((role) => String(role)) : ["employee"],
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map((permission) => String(permission)) : [],
  };
}

function normalizeWorkspace(raw: Record<string, unknown>, user: AppUser): AppWorkspace {
  return {
    id: String(raw.tenantUid ?? raw.tenantId ?? raw.uid ?? raw.id ?? raw.accountId ?? raw.providerId ?? user.id),
    name: String(raw.name ?? raw.businessName ?? raw.tenantName ?? "Employee Workspace"),
    kind: "employee",
    themeColor: typeof raw.primaryColor === "string" ? raw.primaryColor : "#1d4ed8",
  };
}

function normalizeSession(data: unknown, tokenFallback?: string, refreshFallback?: string): SessionResponse {
  const candidate = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const rawUser =
    typeof candidate.user === "object" && candidate.user !== null
      ? (candidate.user as Record<string, unknown>)
      : candidate;
  const rawWorkspace =
    typeof candidate.account === "object" && candidate.account !== null
      ? (candidate.account as Record<string, unknown>)
      : typeof candidate.workspace === "object" && candidate.workspace !== null
        ? (candidate.workspace as Record<string, unknown>)
        : candidate;
  const user = normalizeUser(rawUser);
  const workspace = normalizeWorkspace(rawWorkspace, user);

  return {
    user,
    workspace,
    token: typeof candidate.token === "string" ? candidate.token : tokenFallback,
    refreshToken: typeof candidate.refreshToken === "string" ? candidate.refreshToken : refreshFallback,
    multiFactorAuthenticationRequired: candidate.multiFactorAuthenticationRequired === true,
    otpLength: typeof candidate.otpLength === "number" ? candidate.otpLength : undefined,
    maskedDestination: typeof candidate.maskedDestination === "string" ? candidate.maskedDestination : undefined,
  };
}

async function establishTokenSession(tokens: TokenLoginResponse): Promise<SessionResponse> {
  writeStoredSession({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
  setApiClientContext({ authMode: "token", authToken: tokens.accessToken });
  const context = await checkSession();
  return {
    ...context,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function login(payload: LoginRequest): Promise<SessionResponse> {
  writeStoredCredentials(payload);
  if (authMode === "token") {
    const response = await apiClient.post<TokenLoginResponse>(
      buildAuthServiceUrl(authPath("login")),
      buildTokenLoginRequest(payload),
      {
      _skipAuthRefresh: true,
      } as unknown,
    );
    return establishTokenSession(response.data);
  }

  const encryptedInput = await encryptUsingAES256(payload);
  const response = await apiClient.post<string>("/provider/login/encrypt", encryptedInput, {
    headers: {
      "Content-Type": "text/plain",
    },
    transformRequest: [(data) => data],
    transformResponse: [(data) => data],
    _skipAuthRefresh: true,
    _skipCsrf: true,
  } as unknown);
  return normalizeSession(JSON.parse(await decryptUsingAES256(response.data)));
}

async function checkSession(): Promise<SessionResponse> {
  const stored = readStoredSession();
  if (authMode === "token" && stored?.token) {
    setApiClientContext({ authMode: "token", authToken: stored.token });
  }

  const response = await apiClient.get<unknown>(buildAuthServiceUrl(authPath("me")));
  return normalizeSession(response.data, stored?.token, stored?.refreshToken);
}

async function refreshSession(): Promise<SessionResponse> {
  if (authMode === "token") {
    const stored = readStoredSession();
    if (!stored?.refreshToken) {
      throw new Error("No refresh token available.");
    }

    const response = await apiClient.post<{ accessToken?: string; refreshToken?: string }>(
      buildAuthServiceUrl(authPath("refresh")),
      { refreshToken: stored.refreshToken },
      { _skipAuthRefresh: true } as unknown,
    );

    const nextSession = {
      token: response.data.accessToken || stored.token,
      refreshToken: response.data.refreshToken || stored.refreshToken,
    };
    writeStoredSession(nextSession);
    setApiClientContext({ authMode: "token", authToken: nextSession.token ?? "" });
    return checkSession();
  }

  const credentials = readStoredCredentials();
  if (!credentials) {
    throw new Error("No stored credentials available.");
  }

  return login(credentials);
}

async function logout(): Promise<void> {
  const method = (import.meta.env.VITE_LOGOUT_METHOD?.trim().toUpperCase() || (authMode === "session" ? "DELETE" : "POST")) as "POST" | "DELETE";
  try {
    if (method === "DELETE") {
      await apiClient.delete(buildAuthServiceUrl(authPath("logout")), { _skipAuthRefresh: true } as unknown);
    } else {
      await apiClient.post(buildAuthServiceUrl(authPath("logout")), null, { _skipAuthRefresh: true } as unknown);
    }
  } catch {
    // Ignore logout transport failures and clear client session anyway.
  } finally {
    clearStoredSession();
    clearStoredCredentials();
  }
}

export function configureApiClient(onSessionExpired: () => void) {
  initApiClient(import.meta.env.VITE_API_BASE_URL);
  setApiClientAuthHandlers({
    refreshSession,
    onSessionExpired: () => {
      clearStoredSession();
      clearStoredCredentials();
      onSessionExpired();
    },
  });
  setApiClientContext({
    authMode,
    authToken: readStoredSession()?.token ?? "",
  });
}

export function hasStoredAuthSession() {
  return authMode === "token" ? Boolean(readStoredSession()?.token) : Boolean(readStoredCredentials());
}

export const employeeAuthService = {
  authMode,
  login,
  checkSession,
  refreshSession,
  logout,
  configureApiClient,
  hasStoredAuthSession,
};
