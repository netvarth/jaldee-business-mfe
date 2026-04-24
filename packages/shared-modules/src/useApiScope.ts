import { useMemo } from "react";
import type { ScopeAwareRequestConfig } from "./types";
import { useSharedModulesContext } from "./context";

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

    return {
      apiScope,
      locationId,
      buildUrl: (path: string) => buildScopedUrl(path, apiScope, locationId),
      get: <T>(path: string, config?: unknown) => api.get<T>(normalizePath(path), config),
      post: <T>(path: string, data?: unknown, config?: unknown) =>
        api.post<T>(buildScopedUrl(path, apiScope, locationId), data, config),
      put: <T>(path: string, data?: unknown, config?: unknown) => api.put<T>(normalizePath(path), data, config),
      delete: <T>(path: string, config?: unknown) => api.delete<T>(normalizePath(path), config),
    };
  }, [api, apiScope, location]);
}
