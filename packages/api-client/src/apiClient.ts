import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

interface RequestConfigWithMeta extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

interface RefreshResult {
  authToken?: string;
}

type RefreshSessionHandler = () => Promise<RefreshResult | void>;
type SessionExpiredHandler = () => void;
export type ApiClientAuthMode = "session" | "token";

let _authToken = "";
let _mfeName = "";
let _productScope = "";
let _csrfToken = "";
let _authMode: ApiClientAuthMode = "session";
let _refreshInFlight: Promise<RefreshResult | void> | null = null;
let _refreshSessionHandler: RefreshSessionHandler | null = null;
let _sessionExpiredHandler: SessionExpiredHandler | null = null;
let _sessionExpired = false;

export function setApiClientContext(ctx: {
  authToken?: string;
  mfeName?: string;
  productScope?: string;
  authMode?: ApiClientAuthMode;
}) {
  if (ctx.authToken !== undefined) _authToken = ctx.authToken;
  if (ctx.mfeName !== undefined) _mfeName = ctx.mfeName;
  if (ctx.productScope !== undefined) _productScope = ctx.productScope;
  if (ctx.authMode !== undefined) _authMode = ctx.authMode;
  if (ctx.authToken !== undefined || ctx.authMode !== undefined) {
    _sessionExpired = false;
  }
}

export function setApiClientAuthHandlers(handlers: {
  refreshSession?: RefreshSessionHandler | null;
  onSessionExpired?: SessionExpiredHandler | null;
}) {
  _refreshSessionHandler = handlers.refreshSession ?? null;
  _sessionExpiredHandler = handlers.onSessionExpired ?? null;
}

function getCsrfToken(): string {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="));
  return match ? match.split("=")[1] : _csrfToken;
}

function notifySessionExpired() {
  _sessionExpired = true;
  if (_sessionExpiredHandler) {
    _sessionExpiredHandler();
    return;
  }

  window.dispatchEvent(new CustomEvent("jaldee:session:expired"));
}

async function refreshSessionOnce(): Promise<RefreshResult | void> {
  if (!_refreshSessionHandler) {
    return undefined;
  }

  if (_refreshInFlight) {
    return _refreshInFlight;
  }

  _refreshInFlight = _refreshSessionHandler().finally(() => {
    _refreshInFlight = null;
  });

  return _refreshInFlight;
}

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    (config: RequestConfigWithMeta) => {
      if (_sessionExpired && !config._skipAuthRefresh) {
        const sessionExpiredError = new Error("Session expired");
        (sessionExpiredError as Error & { code?: string }).code = "SESSION_EXPIRED";
        return Promise.reject(sessionExpiredError);
      }

      config.metadata = { startTime: performance.now() };

      if (_mfeName) config.headers["X-MFE-Name"] = _mfeName;
      if (_productScope) config.headers["X-Product"] = _productScope;

      if (_authMode === "token" && _authToken) {
        config.headers["Authorization"] = `Bearer ${_authToken}`;
      }

      const method = config.method?.toLowerCase() ?? "";
      const isMutating = ["post", "put", "patch", "delete"].includes(method);
      if (isMutating && _authMode === "session") {
        const csrf = getCsrfToken();
        if (csrf) config.headers["X-CSRF-Token"] = csrf;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => {
      const config = response.config as RequestConfigWithMeta;
      if (config.metadata) {
        const duration = Math.round(performance.now() - config.metadata.startTime);
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[api-client] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`
          );
        }
      }
      return response;
    },
    async (error) => {
      const status = error.response?.status;
      const originalRequest = error.config as RequestConfigWithMeta | undefined;

      if (status === 401 || status === 419) {
        const canRefresh =
          Boolean(_refreshSessionHandler) &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest._skipAuthRefresh;

        if (canRefresh) {
          originalRequest._retry = true;

          try {
            const refreshResult = await refreshSessionOnce();
            _sessionExpired = false;

            if (_authMode === "token" && refreshResult?.authToken !== undefined) {
              _authToken = refreshResult.authToken;
              originalRequest.headers["Authorization"] = `Bearer ${refreshResult.authToken}`;
            }

            return client.request(originalRequest);
          } catch (refreshError) {
            notifySessionExpired();
            return Promise.reject(refreshError);
          }
        }

        notifySessionExpired();
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export let apiClient: AxiosInstance;

export function initApiClient(baseURL: string): void {
  apiClient = createApiClient(baseURL);
}
