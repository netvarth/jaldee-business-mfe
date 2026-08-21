import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { enrichApiError } from "./apiError";

interface RequestConfigWithMeta extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
  _skipAuth?: boolean;
  _skipCsrf?: boolean;
  _skipLocationParam?: boolean;
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
  if (handlers.refreshSession !== undefined) {
    _refreshSessionHandler = handlers.refreshSession;
  }
  if (handlers.onSessionExpired !== undefined) {
    _sessionExpiredHandler = handlers.onSessionExpired;
  }
}

function getCsrfToken(): string {
  if (_csrfToken) return _csrfToken;
  if (typeof document === "undefined") return "";

  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    const val = meta.getAttribute("content");
    if (val) {
      _csrfToken = val;
      return val;
    }
  }

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  if (match) {
    _csrfToken = decodeURIComponent(match[1]);
    return _csrfToken;
  }

  return "";
}

export function normalizeServiceGatewayUrl(url?: string): string {
  if (!url) return "";
  let normalized = url;

  if (typeof window !== "undefined" && window.location?.origin && /^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (parsed.origin === window.location.origin) {
        normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // ignore invalid URL
    }
  }

  normalized = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const metaEnv = (import.meta as any).env;
  const configuredPrefix = (typeof metaEnv === "object" && metaEnv ? metaEnv.VITE_SERVICE_GATEWAY_PREFIX : "")?.trim();
  const isLocalHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const gatewayPrefix = !isLocalHost && configuredPrefix && configuredPrefix !== "/"
    ? `/${configuredPrefix.replace(/^\/+|\/+$/g, "")}`
    : "";

  if (
    gatewayPrefix &&
    !normalized.startsWith(`${gatewayPrefix}/`) &&
    /^\/(auth-service|base-service|booking-service|finance-service|hr-service|platform-service)\//i.test(normalized)
  ) {
    return `${gatewayPrefix}${normalized}`;
  }

  return normalized;
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
      if (config.url) {
        config.url = normalizeServiceGatewayUrl(config.url);
      }
      if (_sessionExpired && !config._skipAuthRefresh) {
        const sessionExpiredError = new Error("Session expired");
        (sessionExpiredError as Error & { code?: string }).code = "SESSION_EXPIRED";
        return Promise.reject(sessionExpiredError);
      }

      config.metadata = { startTime: performance.now() };

      if (_mfeName) config.headers["X-MFE-Name"] = _mfeName;
      if (_productScope) config.headers["X-Product"] = _productScope;

      const isAuthEndpoint = Boolean(
        config._skipAuth ||
        (config.url &&
          (config.url.includes("/login") ||
           config.url.includes("/auth-service/v1/api/auth/token") ||
           config.url.includes("/provider/login")))
      );

      if (_authMode === "token" && _authToken && !isAuthEndpoint) {
        config.headers["Authorization"] = `Bearer ${_authToken}`;
      } else if (isAuthEndpoint && config.headers) {
        delete config.headers["Authorization"];
        delete config.headers["authorization"];
      }

      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        const headers = config.headers as unknown as {
          delete?: (name: string) => void;
          [key: string]: unknown;
        };

        if (typeof headers.delete === "function") {
          headers.delete("Content-Type");
          headers.delete("content-type");
        } else {
          delete headers["Content-Type"];
          delete headers["content-type"];
        }
      }

      const method = config.method?.toLowerCase() ?? "";
      const isMutating = ["post", "put", "patch", "delete"].includes(method);
      if (isMutating) {
        if (!config._skipLocationParam) {
          let locationId = "";
          try {
            const shellStoreStr = localStorage.getItem("jaldee-shell-store");
            if (shellStoreStr) {
              const parsed = JSON.parse(shellStoreStr);
              if (parsed?.state?.activeLocation?.id) {
                locationId = String(parsed.state.activeLocation.id);
              }
            }
            if (!locationId) {
              locationId = localStorage.getItem("p-location") || "";
            }
          } catch (e) {
            // ignore localStorage errors in non-browser environments
          }

          if (locationId) {
            config.params = config.params || {};
            if (config.params.location === undefined) {
              config.params.location = locationId;
            }
          }
        }

        if (_authMode === "session" && !config._skipCsrf) {
          const csrf = getCsrfToken();
          if (csrf) config.headers["X-CSRF-Token"] = csrf;
        }
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
      const config = (error.config || {}) as RequestConfigWithMeta;

      if (status === 401 && !config._retry && !config._skipAuthRefresh) {
        config._retry = true;

        if (_refreshSessionHandler) {
          try {
            if (!_refreshInFlight) {
              _refreshInFlight = _refreshSessionHandler().finally(() => {
                _refreshInFlight = null;
              });
            }

            const refreshResult = await _refreshInFlight;
            if (refreshResult && refreshResult.authToken) {
              setApiClientContext({ authToken: refreshResult.authToken });
            }

            return client(config);
          } catch (refreshErr) {
            _sessionExpired = true;
            if (_sessionExpiredHandler) {
              _sessionExpiredHandler();
            }
            return Promise.reject(enrichApiError(refreshErr));
          }
        } else {
          _sessionExpired = true;
          if (_sessionExpiredHandler) {
            _sessionExpiredHandler();
          }
        }
      }

      return Promise.reject(enrichApiError(error));
    }
  );

  return client;
}

export const apiClient = createApiClient("");

export function initApiClient(options?: {
  authToken?: string;
  mfeName?: string;
  productScope?: string;
  authMode?: ApiClientAuthMode;
  refreshSession?: RefreshSessionHandler | null;
  onSessionExpired?: SessionExpiredHandler | null;
}) {
  if (!options) return apiClient;

  setApiClientContext({
    authToken: options.authToken,
    mfeName: options.mfeName,
    productScope: options.productScope,
    authMode: options.authMode,
  });

  setApiClientAuthHandlers({
    refreshSession: options.refreshSession,
    onSessionExpired: options.onSessionExpired,
  });

  return apiClient;
}
