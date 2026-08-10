import { apiClient, initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import type { LoginRequest, SessionResponse, AppUser, AppWorkspace } from "../types";

const audience = "employee";
const authMode = "token" as const;
const storageKey = `jaldee-${audience}-session`;
const refreshStorageKey = `jaldee-${audience}-refresh-session`;
const accountSlugKey = `jaldee-${audience}-account-slug`;

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

function getAccessTokenStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function readStoredSession(): StoredSession | null {
  const accessStorage = getAccessTokenStorage();
  const persistentStorage = getStorage();
  let accessToken = accessStorage?.getItem(storageKey) ?? undefined;
  let refreshToken = persistentStorage?.getItem(refreshStorageKey) ?? undefined;
  const legacyRaw = persistentStorage?.getItem(storageKey);
  if (legacyRaw && persistentStorage) {
    try {
      const legacy = JSON.parse(legacyRaw) as StoredSession;
      accessToken ||= legacy.token;
      refreshToken ||= legacy.refreshToken;
      if (accessToken) accessStorage?.setItem(storageKey, accessToken);
      if (refreshToken) persistentStorage.setItem(refreshStorageKey, refreshToken);
    } catch {
      // Ignore malformed legacy session data.
    }
    persistentStorage.removeItem(storageKey);
  }
  if (!accessToken && !refreshToken) return null;

  return { token: accessToken, refreshToken };
}

function writeStoredSession(session: StoredSession) {
  if (session.token) getAccessTokenStorage()?.setItem(storageKey, session.token);
  if (session.refreshToken) getStorage()?.setItem(refreshStorageKey, session.refreshToken);
  getStorage()?.removeItem(storageKey);
}

function clearStoredSession() {
  getAccessTokenStorage()?.removeItem(storageKey);
  getStorage()?.removeItem(storageKey);
  getStorage()?.removeItem(refreshStorageKey);
}

function getStoredAccountSlug() {
  return getStorage()?.getItem(accountSlugKey) ?? "";
}

function getConfiguredAuthServiceBaseUrl() {
  return import.meta.env.VITE_AUTH_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
}

function getConfiguredBaseServiceBaseUrl() {
  return import.meta.env.VITE_BASE_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
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

function buildTokenLoginRequest(payload: LoginRequest, tenantUid: string) {
  return {
    tenantUid,
    userType: "TENANT_EMPLOYEE",
    identifierType: "EMPLOYEE_ID",
    identifier: payload.loginId,
    password: payload.password,
  };
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
    logoUrl:
      typeof raw.logoUrl === "string" ? raw.logoUrl :
      typeof raw.logo === "string" ? raw.logo :
      typeof raw.imageUrl === "string" ? raw.imageUrl :
      typeof raw.businessLogo === "string" ? raw.businessLogo :
      undefined,
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
  const tenantUid = await resolveTenantUid(payload.accountSlug);
  const response = await apiClient.post<TokenLoginResponse>(
    buildAuthServiceUrl(authPath("login")),
    buildTokenLoginRequest(payload, tenantUid),
    {
      _skipAuthRefresh: true,
    } as unknown,
  );
  const session = await establishTokenSession(response.data);
  getStorage()?.setItem(accountSlugKey, payload.accountSlug.trim());
  return session;
}

async function checkSession(): Promise<SessionResponse> {
  const stored = readStoredSession();
  if (!stored?.token && stored?.refreshToken) {
    return refreshSession();
  }
  if (stored?.token) {
    setApiClientContext({ authMode: "token", authToken: stored.token });
  }

  const response = await apiClient.get<unknown>(buildAuthServiceUrl(authPath("me")));
  return normalizeSession(response.data, stored?.token, stored?.refreshToken);
}

async function refreshSession(): Promise<SessionResponse> {
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

async function logout(): Promise<void> {
  const method = (import.meta.env.VITE_LOGOUT_METHOD?.trim().toUpperCase() || "POST") as "POST" | "DELETE";
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
  }
}

export function configureApiClient(onSessionExpired: () => void) {
  // Keep the Axios base at the host origin. buildAuthServiceUrl (and the
  // shared request interceptor) already applies the configured `/api`
  // gateway prefix; using `/api` as the base as well produces `/api/api/...`.
  initApiClient(window.location.origin);
  setApiClientAuthHandlers({
    refreshSession,
    onSessionExpired: () => {
      clearStoredSession();
      onSessionExpired();
    },
  });
  setApiClientContext({
    authMode,
    authToken: readStoredSession()?.token ?? "",
  });
}

export function hasStoredAuthSession() {
  const stored = readStoredSession();
  return Boolean(stored?.token || stored?.refreshToken);
}

function buildBaseServiceUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase = getConfiguredBaseServiceBaseUrl() || getServiceGatewayPrefix();
  if (!configuredBase) {
    return typeof window !== "undefined" ? `${window.location.origin}${normalizedPath}` : normalizedPath;
  }
  const combinedPath = `${configuredBase}${normalizedPath}`;
  return typeof window !== "undefined" && configuredBase.startsWith("/")
    ? new URL(combinedPath, window.location.origin).toString()
    : combinedPath;
}

const tenantUidBySlug = new Map<string, Promise<string>>();

async function resolveTenantUid(accountSlug: string): Promise<string> {
  const slug = accountSlug.trim();
  if (!slug) throw new Error("An employee account is required.");
  const cached = tenantUidBySlug.get(slug);
  if (cached) return cached;

  const request = apiClient.get<unknown>(
    buildBaseServiceUrl(`/base-service/v1/api/tenant/public/custom-id/${encodeURIComponent(slug)}`),
    { _skipAuthRefresh: true } as unknown,
  ).then((response) => {
    const candidate = typeof response.data === "object" && response.data !== null
      ? response.data as Record<string, unknown>
      : {};
    const tenantUid = String(candidate.uid ?? "").trim();
    if (!tenantUid) throw new Error("The employee account could not be resolved.");
    return tenantUid;
  }).catch((error) => {
    tenantUidBySlug.delete(slug);
    throw error;
  });

  tenantUidBySlug.set(slug, request);
  return request;
}

export const employeeAuthService = {
  authMode,
  login,
  checkSession,
  refreshSession,
  logout,
  configureApiClient,
  hasStoredAuthSession,
  getStoredAccountSlug,
};
