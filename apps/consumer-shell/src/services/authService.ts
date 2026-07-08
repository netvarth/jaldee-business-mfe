import { apiClient, initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import type {
  PhoneOtpStartRequest,
  PhoneOtpStartResponse,
  PhoneOtpVerifyRequest,
  ConsumerSignupRequest,
  SessionResponse,
  AppUser,
  AppWorkspace,
} from "../types";

const audience = "consumer";
const authMode = import.meta.env.VITE_AUTH_MODE === "token" ? "token" : "session";
const storageKey = `jaldee-${audience}-session`;

interface StoredSession {
  token?: string;
  refreshToken?: string;
}

function authPath(name: "login" | "me" | "logout" | "refresh") {
  const defaults = {
    login: "/auth-service/consumer/login",
    me: "/auth-service/consumer/me",
    logout: "/auth-service/consumer/logout",
    refresh: "/auth-service/consumer/refresh",
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
    token: typeof candidate.token === "string" ? candidate.token : tokenFallback,
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
  const candidate = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  return {
    otpId: String(candidate.otpId ?? candidate.id ?? candidate.uuid ?? ""),
    phone,
    consumerExists: candidate.consumerExists === true || candidate.exists === true || candidate.registered === true,
    otpLength: typeof candidate.otpLength === "number" ? candidate.otpLength : undefined,
    maskedDestination: typeof candidate.maskedDestination === "string" ? candidate.maskedDestination : undefined,
    expiresInSeconds: typeof candidate.expiresInSeconds === "number" ? candidate.expiresInSeconds : undefined,
    nextResendInSeconds: typeof candidate.nextResendInSeconds === "number" ? candidate.nextResendInSeconds : undefined,
  };
}

async function startPhoneOtp(payload: PhoneOtpStartRequest): Promise<PhoneOtpStartResponse> {
  const response = await apiClient.post<unknown>(
    buildAuthServiceUrl(endpoint("CONSUMER_OTP_START_PATH", "/auth-service/v1/api/auth/login/otp/start")),
    {
      identifierType: "MOBILE",
      identifier: payload.phone.trim(),
      userType: "CONSUMER",
      accountSlug: payload.accountSlug,
    },
    { _skipAuthRefresh: true } as unknown,
  );

  return normalizeOtpStart(response.data, payload.phone.trim());
}

async function verifyPhoneOtp(payload: PhoneOtpVerifyRequest): Promise<SessionResponse> {
  const response = await apiClient.post<unknown>(
    buildAuthServiceUrl(endpoint("CONSUMER_OTP_VERIFY_PATH", "/auth-service/v1/api/auth/login/otp/verify")),
    {
      otpId: payload.otpId,
      otp: payload.otp.trim(),
      identifierType: "MOBILE",
      identifier: payload.phone.trim(),
      userType: "CONSUMER",
      accountSlug: payload.accountSlug,
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
      accountSlug: payload.accountSlug,
    },
    { _skipAuthRefresh: true } as unknown,
  );
  const session = normalizeSession(response.data);
  persistTokenSession(session);
  return session;
}

function getGoogleLoginUrl(accountSlug?: string) {
  const path = endpoint("CONSUMER_GOOGLE_LOGIN_PATH", "/auth-service/v1/api/auth/login/google");
  const url = new URL(buildAuthServiceUrl(path), window.location.origin);
  url.searchParams.set("userType", "CONSUMER");
  if (accountSlug) {
    url.searchParams.set("accountSlug", accountSlug);
  }
  url.searchParams.set("redirectUri", window.location.href);
  return url.toString();
}

function startGoogleLogin(accountSlug?: string) {
  window.location.assign(getGoogleLoginUrl(accountSlug));
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
  initApiClient(import.meta.env.VITE_API_BASE_URL);
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
  return Boolean(readStoredSession()?.token);
}

export const consumerAuthService = {
  authMode,
  login,
  startPhoneOtp,
  verifyPhoneOtp,
  signupWithPhone,
  startGoogleLogin,
  getGoogleLoginUrl,
  checkSession,
  refreshSession,
  logout,
  configureApiClient,
  hasStoredAuthSession,
};
