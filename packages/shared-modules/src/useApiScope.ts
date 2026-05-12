import { useMemo } from "react";
import type { ScopeAwareRequestConfig } from "./types";
import { useSharedModulesContext } from "./context";

type ScopedRequestConfig = {
  skipLocationScope?: boolean;
  [key: string]: unknown;
};

function buildScopedUrl(path: string, apiScope: ScopeAwareRequestConfig["apiScope"], locationId?: string | null) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (apiScope === "global") {
    return normalizedPath;
  }

  if (!locationId) {
    throw new Error("Location scope requires a locationId.");
  }

  if (normalizedPath.includes("locationId=")) {
    return normalizedPath;
  }

  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${normalizedPath}${separator}locationId=${encodeURIComponent(locationId)}`;
}

export function useApiScope() {
  const { api, apiScope, location } = useSharedModulesContext();

  return useMemo(() => {
    const locationId = location?.id ?? null;

    const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);
    const isScopedRequestConfig = (config: unknown): config is ScopedRequestConfig =>
      Boolean(config) && typeof config === "object" && !Array.isArray(config);
    const preparePostRequest = (path: string, config?: unknown) => {
      if (!isScopedRequestConfig(config) || !config.skipLocationScope) {
        return {
          url: buildScopedUrl(path, apiScope, locationId),
          config,
        };
      }

      const { skipLocationScope, ...requestConfig } = config;
      return {
        url: normalizePath(path),
        config: requestConfig,
      };
    };

    return {
      apiScope,
      locationId,
      buildUrl: (path: string) => buildScopedUrl(path, apiScope, locationId),
      get: <T>(path: string, config?: unknown) => api.get<T>(normalizePath(path), config),
      post: <T>(path: string, data?: unknown, config?: unknown) => {
        const request = preparePostRequest(path, config);
        return api.post<T>(request.url, data, request.config);
      },
      put: <T>(path: string, data?: unknown, config?: unknown) => api.put<T>(normalizePath(path), data, config),
      patch: <T>(path: string, data?: unknown, config?: unknown) => api.patch<T>(normalizePath(path), data, config),
      delete: <T>(path: string, config?: unknown) => api.delete<T>(normalizePath(path), config),
    };
  }, [api, apiScope, location]);
}
