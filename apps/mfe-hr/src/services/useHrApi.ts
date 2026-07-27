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
export const HR_SERVICE_API_ROOT = "/hr-service/v1/api";
const BASE =
  import.meta.env.VITE_HR_API_BASE_PATH ||
  `${HR_SERVICE_API_ROOT}/tenant`;

type RequestBody = Record<string, unknown> | unknown[] | FormData | string | number | boolean | null;

function buildHrServiceUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (/^\/?(provider|base-service|auth-service)\//i.test(endpoint)) {
    return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  }
  if (endpoint.startsWith("/hr-service/")) {
    return endpoint;
  }
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${BASE}${normalizedEndpoint}`;
}

interface CacheEntry {
  promise: Promise<any>;
  timestamp: number;
}
const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2000; // 2 seconds cache
const searchRequestCache = new Map<string, CacheEntry>();
const SEARCH_DEDUPE_TTL_MS = 1000;

export function useHrApi() {
  const { authToken, api } = useMFEProps();

  return useMemo(() => {
    async function request<T>(
      endpoint: string,
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      body?: RequestBody
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
            const res = api
              ? await api.get<any>(cacheKey, { timeout, _skipLocationParam: true })
              : await apiClient.request<any>({
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

      const requestUrl = buildHrServiceUrl(endpoint);
      const isSearchRequest = method === "POST" && /\/search(?:\?|$)/.test(endpoint);
      const searchKey = isSearchRequest ? `${requestUrl}:${JSON.stringify(body ?? null)}` : "";
      const cachedSearch = isSearchRequest ? searchRequestCache.get(searchKey) : undefined;
      const now = Date.now();
      if (cachedSearch && now - cachedSearch.timestamp < SEARCH_DEDUPE_TTL_MS) {
        return cachedSearch.promise as Promise<T>;
      }

      const mutationPromise = (async () => {
        getCache.clear();
        try {
          const requestConfig = { timeout, _skipLocationParam: true };
          const res = api
            ? method === "POST"
              ? await api.post<any>(requestUrl, body, requestConfig)
              : method === "PUT"
                ? await api.put<any>(requestUrl, body, requestConfig)
                : method === "PATCH"
                  ? await api.patch<any>(requestUrl, body, requestConfig)
                  : await api.delete<any>(requestUrl, requestConfig)
            : await apiClient.request<any>({
                url: requestUrl,
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
          if (err.code === "ECONNABORTED") {
            throw new Error(`Request timed out after ${timeout}ms. Ensure the backend is running and reachable.`);
          }
          const readable = getReadableApiError(err, "HR request failed.");
          throw Object.assign(new Error(readable.message), readable);
        }
      })();

      if (isSearchRequest) {
        searchRequestCache.set(searchKey, { promise: mutationPromise, timestamp: now });
      }
      return mutationPromise;
    }

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, "GET"),
      post: <T>(endpoint: string, body?: RequestBody) => request<T>(endpoint, "POST", body),
      put: <T>(endpoint: string, body?: RequestBody) => request<T>(endpoint, "PUT", body),
      patch: <T>(endpoint: string, body?: RequestBody) => request<T>(endpoint, "PATCH", body),
      del: <T>(endpoint: string) => request<T>(endpoint, "DELETE"),
    };
  }, [api, authToken]);
}
