import { apiClient, initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import type {
  PhoneOtpStartRequest,
  PhoneOtpStartResponse,
  PhoneOtpVerifyRequest,
  ConsumerSignupRequest,
  SessionResponse,
  AppUser,
  AppWorkspace,
  GoogleLoginRequest,
  PublicTenant,
} from "../types";

const audience = "consumer";
const authMode = "token";
const storageKey = `jaldee-${audience}-session`;
const refreshStorageKey = `jaldee-${audience}-refresh-session`;

interface StoredSession {
  token?: string;
  refreshToken?: string;
}

function authPath(name: "login" | "me" | "logout" | "refresh") {
  const defaults = {
    login: "/auth-service/v1/api/auth/login/password",
    me: "/auth-service/v1/api/auth/me",
    logout: "/auth-service/v1/api/auth/logout",
    refresh: "/auth-service/v1/api/auth/refresh",
  } as const;

  const overrideKey = `VITE_${name.toUpperCase()}_PATH` as const;
  return (import.meta.env[overrideKey] as string | undefined)?.trim() || defaults[name];
}

function endpoint(name: string, fallback: string) {
  const key = `VITE_${name}`;
  return (import.meta.env[key] as string | undefined)?.trim() || fallback;
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
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return "";
  return `/${prefix.replace(/^\/+|\/+$/g, "")}`;
}

function buildServiceUrl(path: string, baseUrl: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase = baseUrl || getServiceGatewayPrefix();
  if (!configuredBase) {
    return normalizedPath;
  }
  return `${configuredBase}${normalizedPath}`;
}

function buildAuthServiceUrl(path: string) {
  return buildServiceUrl(path, getConfiguredAuthServiceBaseUrl());
}

function buildBaseServiceUrl(path: string) {
  return buildServiceUrl(path, getConfiguredBaseServiceBaseUrl());
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
  setApiClientContext({ authMode, authToken: "" });
}

function normalizeUser(raw: Record<string, unknown>): AppUser {
  return {
    id: String(raw.id ?? raw.userId ?? raw.consumerId ?? "consumer-user"),
    name: String(raw.name ?? raw.userName ?? raw.firstName ?? raw.consumerName ?? "Consumer"),
    email: String(raw.email ?? raw.emailId ?? raw.loginId ?? ""),
    roles: Array.isArray(raw.roles) ? raw.roles.map((role) => String(role)) : ["consumer"],
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map((permission) => String(permission)) : [],
  };
}

function normalizeWorkspace(raw: Record<string, unknown>, user: AppUser): AppWorkspace {
  return {
    id: String(raw.id ?? raw.uid ?? raw.accountId ?? raw.tenantId ?? user.id),
    name: String(raw.name ?? raw.businessName ?? raw.tenantName ?? "Consumer Portal"),
    kind: "consumer",
    themeColor: typeof raw.primaryColor === "string" ? raw.primaryColor : "#0f766e",
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
    token: typeof candidate.accessToken === "string"
      ? candidate.accessToken
      : typeof candidate.token === "string" ? candidate.token : tokenFallback,
    refreshToken: typeof candidate.refreshToken === "string" ? candidate.refreshToken : refreshFallback,
  };
}

function persistTokenSession(session: SessionResponse) {
  if (authMode === "token" && session.token) {
    writeStoredSession({ token: session.token, refreshToken: session.refreshToken });
    setApiClientContext({ authMode: "token", authToken: session.token });
  }
}

function normalizeOtpStart(data: unknown, phone: string): PhoneOtpStartResponse {
  const envelope = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const candidate = typeof envelope.data === "object" && envelope.data !== null
    ? envelope.data as Record<string, unknown>
    : typeof envelope.result === "object" && envelope.result !== null
      ? envelope.result as Record<string, unknown>
      : envelope;
  const otpId = String(candidate.otpId ?? candidate.id ?? candidate.uuid ?? "").trim();
  if (!otpId) {
    throw new Error("The OTP service did not return an OTP ID. Please request a new code.");
  }
  return {
    otpId,
    phone,
    consumerExists: true,
    otpLength: typeof candidate.otpLength === "number" ? candidate.otpLength : undefined,
    maskedDestination: typeof candidate.maskedTarget === "string"
      ? candidate.maskedTarget
      : typeof candidate.maskedDestination === "string" ? candidate.maskedDestination : undefined,
    expiresInSeconds: typeof candidate.expiresInSeconds === "number" ? candidate.expiresInSeconds : undefined,
    nextResendInSeconds: typeof candidate.nextResendInSeconds === "number" ? candidate.nextResendInSeconds : undefined,
  };
}

const tenantUidBySlug = new Map<string, string>();
const publicTenantBySlug = new Map<string, Promise<PublicTenant>>();

export function resolvePublicTenant(accountSlug?: string): Promise<PublicTenant> {
  const slug = accountSlug?.trim();
  if (!slug) return Promise.reject(new Error("A consumer account is required."));
  const cached = publicTenantBySlug.get(slug);
  if (cached) return cached;

  const request = apiClient.get<unknown>(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/public/custom-id/${encodeURIComponent(slug)}`),
      { _skipAuthRefresh: true } as unknown,
    )
    .then((response): PublicTenant => {
      const candidate = typeof response.data === "object" && response.data !== null
        ? response.data as Record<string, unknown>
        : {};
      const tenantUid = String(candidate.uid ?? "");
      if (!tenantUid) throw new Error("The consumer account could not be resolved.");
      tenantUidBySlug.set(slug, tenantUid);
      return {
        uid: tenantUid,
        customId: String(candidate.customId ?? slug),
        tenantName: String(candidate.tenantName ?? ""),
        brandName: String(candidate.brandName ?? candidate.tenantName ?? ""),
        timezone: candidate.timezone ? String(candidate.timezone) : undefined,
        customDomainName: candidate.customDomainName ? String(candidate.customDomainName) : undefined,
      };
    })
    .catch((error) => {
      publicTenantBySlug.delete(slug);
      throw error;
    });
  publicTenantBySlug.set(slug, request);
  return request;
}

async function resolveTenantUid(accountSlug?: string) {
  const slug = accountSlug?.trim();
  if (!slug) throw new Error("A consumer account is required.");
  const cached = tenantUidBySlug.get(slug);
  if (cached) return cached;
  return (await resolvePublicTenant(slug)).uid;
}

async function startPhoneOtp(payload: PhoneOtpStartRequest): Promise<PhoneOtpStartResponse> {
  const tenantUid = await resolveTenantUid(payload.accountSlug);
  const response = await apiClient.post<unknown>(
    buildAuthServiceUrl(endpoint("CONSUMER_OTP_START_PATH", "/auth-service/v1/api/auth/login/otp/start")),
    {
      tenantUid,
      identifierType: "MOBILE",
      identifier: payload.phone.trim(),
      userType: "TENANT_CONSUMER",
    },
    { _skipAuthRefresh: true } as unknown,
  );

  return normalizeOtpStart(response.data, payload.phone.trim());
}

async function startPhoneSignup(payload: PhoneOtpStartRequest & { firstName: string; lastName: string }): Promise<PhoneOtpStartResponse> {
  const tenantUid = await resolveTenantUid(payload.accountSlug);
  const response = await apiClient.post<unknown>(
    buildBaseServiceUrl(endpoint("CONSUMER_SIGNUP_OTP_START_PATH", "/base-service/v1/api/tenant/consumer/signup/issue-otp")),
    {
      tenantUid,
      mobile: payload.phone.trim(),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
    },
    { _skipAuthRefresh: true } as unknown,
  );
  return { ...normalizeOtpStart(response.data, payload.phone.trim()), consumerExists: false };
}

async function verifyPhoneOtp(payload: PhoneOtpVerifyRequest): Promise<SessionResponse> {
  const response = await apiClient.post<unknown>(
    buildAuthServiceUrl(endpoint("CONSUMER_OTP_VERIFY_PATH", "/auth-service/v1/api/auth/login/otp/verify")),
    {
      otpId: payload.otpId,
      otp: payload.otp.trim(),
      purpose: "TENANT_CONSUMER_PASSWORDLESS_LOGIN",
    },
    { _skipAuthRefresh: true } as unknown,
  );
  const session = normalizeSession(response.data);
  persistTokenSession(session);
  return session;
}

async function signupWithPhone(payload: ConsumerSignupRequest): Promise<SessionResponse> {
  const response = await apiClient.post<unknown>(
    buildBaseServiceUrl(endpoint("CONSUMER_SIGNUP_VERIFY_PATH", "/base-service/v1/api/tenant/consumer/signup/verify-otp")),
    {
      otpId: payload.otpId,
      otp: payload.otp.trim(),
      mobile: payload.phone.trim(),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      purpose: "TENANT_CONSUMER_SIGNUP_VERIFY_MOBILE",
    },
    { _skipAuthRefresh: true } as unknown,
  );
  const session = normalizeSession(response.data);
  persistTokenSession(session);
  return session;
}

async function loginWithGoogle(payload: GoogleLoginRequest): Promise<SessionResponse> {
  const tenantUid = await resolveTenantUid(payload.accountSlug);
  const response = await apiClient.post<unknown>(
    buildBaseServiceUrl(endpoint("CONSUMER_GOOGLE_LOGIN_PATH", "/base-service/v1/api/tenant/consumer/signup/google")),
    { tenantUid, idToken: payload.idToken, firstName: payload.firstName, lastName: payload.lastName },
    { _skipAuthRefresh: true } as unknown,
  );
  const session = normalizeSession(response.data);
  persistTokenSession(session);
  return session;
}

async function login(): Promise<SessionResponse> {
  const response = await apiClient.post<unknown>(authPath("login"), null, {
    _skipAuthRefresh: true,
  } as unknown);
  const session = normalizeSession(response.data);
  persistTokenSession(session);
  return session;
}

async function checkSession(): Promise<SessionResponse> {
  const stored = readStoredSession();
  if (!stored?.token && stored?.refreshToken) {
    return refreshSession();
  }
  if (authMode === "token" && stored?.token) {
    setApiClientContext({ authMode: "token", authToken: stored.token });
  }

  const response = await apiClient.get<unknown>(authPath("me"));
  return normalizeSession(response.data, stored?.token, stored?.refreshToken);
}

async function refreshSession(): Promise<SessionResponse> {
  if (authMode === "token") {
    const stored = readStoredSession();
    if (!stored?.refreshToken) {
      throw new Error("No refresh token available.");
    }

    const response = await apiClient.post<{ accessToken?: string; refreshToken?: string }>(
      authPath("refresh"),
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

  throw new Error("No refresh token available.");
}

async function logout(): Promise<void> {
  const method = (import.meta.env.VITE_LOGOUT_METHOD?.trim().toUpperCase() || "POST") as "POST" | "DELETE";
  try {
    if (method === "DELETE") {
      await apiClient.delete(authPath("logout"), { _skipAuthRefresh: true } as unknown);
    } else {
      await apiClient.post(authPath("logout"), null, { _skipAuthRefresh: true } as unknown);
    }
  } catch {
    // Ignore logout transport failures and clear client session anyway.
  } finally {
    clearStoredSession();
  }
}

export function configureApiClient(onSessionExpired: () => void) {
  const gatewayPrefix = getServiceGatewayPrefix();
  initApiClient(new URL(`${gatewayPrefix || "/"}`, window.location.origin).toString().replace(/\/$/, ""));
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
  const session = readStoredSession();
  return Boolean(session?.token || session?.refreshToken);
}

export const consumerAuthService = {
  authMode,
  login,
  startPhoneOtp,
  startPhoneSignup,
  verifyPhoneOtp,
  signupWithPhone,
  loginWithGoogle,
  checkSession,
  refreshSession,
  logout,
  configureApiClient,
  hasStoredAuthSession,
};
