import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { apiClient, getReadableApiError } from "@jaldee/api-client";

/**
 * HR service client.
 *
 * feature-hr-service uses context-path `/hr-service` and the API gateway routes
 * `/hr-service/**` straight to it. We call same-origin and let the shell's Vite
 * proxy forward `/hr-service` to the gateway. Auth rides the HttpOnly cookie in
 * the browser (credentials: include); a bearer token is attached when present
 * (native shell).
 *
 * All responses are wrapped in `ApiResponse<T> = { status, data, timestamp }`,
 * so we unwrap `.data` here and hand callers the raw payload.
 */
const GATEWAY_PREFIX = import.meta.env.VITE_SERVICE_GATEWAY_PREFIX
  ? `/${import.meta.env.VITE_SERVICE_GATEWAY_PREFIX.replace(/^\/+|\/+$/g, "")}`
  : "";
export const HR_SERVICE_API_ROOT = `${GATEWAY_PREFIX}/hr-service/v1/api`;
const BASE =
  import.meta.env.VITE_HR_API_BASE_PATH ||
  `${HR_SERVICE_API_ROOT}/tenant`;

type Json = Record<string, unknown> | unknown[];

function buildHrServiceUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith(`${GATEWAY_PREFIX}/hr-service/`) || endpoint.startsWith("/hr-service/")) {
    return new URL(endpoint, window.location.origin).toString();
  }
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return new URL(`${BASE}${normalizedEndpoint}`, window.location.origin).toString();
}

interface CacheEntry {
  promise: Promise<any>;
  timestamp: number;
}
const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2000; // 2 seconds cache

export function useHrApi() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    async function request<T>(
      endpoint: string,
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      body?: Json
    ): Promise<T> {
      const timeout = Number(import.meta.env.VITE_HR_API_TIMEOUT_MS) || 4000;

      if (method === "GET") {
        const cacheKey = buildHrServiceUrl(endpoint);
        const cached = getCache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_TTL_MS) {
          return cached.promise as Promise<T>;
        }

        const promise = (async () => {
          try {
            const res = await apiClient.request<any>({
              url: cacheKey,
              method,
              data: body,
              timeout,
              _skipLocationParam: true,
            });

            const parsed = res.data;
            return parsed && typeof parsed === "object" && "data" in parsed
              ? (parsed as { data: T }).data
              : (parsed as T);
          } catch (err: any) {
            getCache.delete(cacheKey);
            if (err.code === "ECONNABORTED") {
              throw new Error(`Request timed out after ${timeout}ms. Ensure the backend is running and reachable.`);
            }
            const readable = getReadableApiError(err, "HR request failed.");
            throw Object.assign(new Error(readable.message), readable);
          }
        })();

        getCache.set(cacheKey, { promise, timestamp: now });
        return promise;
      }

      // If mutating (POST, PUT, DELETE), invalidate cache to load fresh values next time
      getCache.clear();

      try {
        const res = await apiClient.request<any>({
          url: buildHrServiceUrl(endpoint),
          method,
          data: body,
          timeout,
          _skipLocationParam: true,
        });

        const parsed = res.data;
        // Unwrap ApiResponse<T> = { status, data, timestamp }
        return parsed && typeof parsed === "object" && "data" in parsed
          ? (parsed as { data: T }).data
          : (parsed as T);
      } catch (err: any) {
        if (err.code === "ECONNABORTED") {
          throw new Error(`Request timed out after ${timeout}ms. Ensure the backend is running and reachable.`);
        }
        const readable = getReadableApiError(err, "HR request failed.");
        throw Object.assign(new Error(readable.message), readable);
      }
    }

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, "GET"),
      post: <T>(endpoint: string, body?: Json) => request<T>(endpoint, "POST", body),
      put: <T>(endpoint: string, body?: Json) => request<T>(endpoint, "PUT", body),
      patch: <T>(endpoint: string, body?: Json) => request<T>(endpoint, "PATCH", body),
      del: <T>(endpoint: string) => request<T>(endpoint, "DELETE"),
    };
  }, [authToken]);
}
