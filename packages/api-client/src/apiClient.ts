import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Extend config to hold request start time
interface RequestConfigWithMeta extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

// These are set by the shell after login
// MFEs never set these directly
let _authToken = "";
let _mfeName = "";
let _productScope = "";
let _csrfToken = "";

export function setApiClientContext(ctx: {
  authToken?: string;
  mfeName?: string;
  productScope?: string;
}) {
  if (ctx.authToken !== undefined) _authToken = ctx.authToken;
  if (ctx.mfeName !== undefined) _mfeName = ctx.mfeName;
  if (ctx.productScope !== undefined) _productScope = ctx.productScope;
}

function getCsrfToken(): string {
  // Read from non-HttpOnly csrf_token cookie
  // Only used in browser strategy
  const match = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrf_token="));
  return match ? match.split("=")[1] : _csrfToken;
}

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true, // sends HttpOnly cookies automatically
    headers: {
      "Content-Type": "application/json",
    },
  });

  // ─── Request interceptor ──────────────────────────
  client.interceptors.request.use(
    (config: RequestConfigWithMeta) => {
      // Track request start time for telemetry
      config.metadata = { startTime: performance.now() };

      // MFE identity headers
      if (_mfeName) config.headers["X-MFE-Name"] = _mfeName;
      if (_productScope) config.headers["X-Product"] = _productScope;

      // Native strategy — Bearer token
      // Browser strategy — HttpOnly cookie sent automatically
      if (_authToken) {
        config.headers["Authorization"] = `Bearer ${_authToken}`;
      }

      // CSRF token on all mutating requests (browser strategy)
      const method = config.method?.toLowerCase() ?? "";
      const isMutating = ["post", "put", "patch", "delete"].includes(method);
      if (isMutating && !_authToken) {
        const csrf = getCsrfToken();
        if (csrf) config.headers["X-CSRF-Token"] = csrf;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // ─── Response interceptor ─────────────────────────
  client.interceptors.response.use(
    (response) => {
      // Log timing in development
      const config = response.config as RequestConfigWithMeta;
      if (config.metadata) {
        const duration = Math.round(
          performance.now() - config.metadata.startTime
        );
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[api-client] ${response.config.method?.toUpperCase()} ${response.config.url} — ${duration}ms`
          );
        }
      }
      return response;
    },
    (error) => {
      const status = error.response?.status;

      // Strip response body — may contain patient data
      if (error.response?.data) {
        delete error.response.data;
      }

      // 401 / 419 — session expired
      // Shell handles redirect via EventBus
      // MFEs never handle auth errors directly
      if (status === 401 || status === 419) {
        window.dispatchEvent(
          new CustomEvent("jaldee:session:expired")
        );
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// Singleton instance
// Base URL injected at shell boot
// MFEs import this directly
export let apiClient: AxiosInstance;

export function initApiClient(baseURL: string): void {
  apiClient = createApiClient(baseURL);
}