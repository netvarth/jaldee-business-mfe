import { useMemo } from "react";
import type { ScopeAwareRequestConfig } from "./types";
import { useSharedModulesContext } from "./context";

type ScopedRequestConfig = {
  skipLocationScope?: boolean;
  [key: string]: unknown;
};

function isTenantScopedPath(path: string) {
  return path.includes("/finance-service/v1/api/tenant/") || path.includes("/v1/api/tenant/");
}

function buildScopedUrl(path: string, apiScope: ScopeAwareRequestConfig["apiScope"], locationId?: string | null) {
  const isAbsolute = path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//");
  const normalizedPath = isAbsolute ? path : (path.startsWith("/") ? path : `/${path}`);

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

/**
 * Set _skipLocationParam: true so the api-client request interceptor does NOT
 * inject ?location=<id> into the query string for tenant-wide requests
 * (e.g. membership, where data is not location-scoped).
 */
function withSkipLocation(config?: unknown): unknown {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { _skipLocationParam: true };
  }
  const c = config as Record<string, unknown>;
  const { skipLocationScope, ...rest } = c;
  return {
    ...rest,
    _skipLocationParam: true,
  };
}

export function useApiScope() {
  const { api, apiScope, location } = useSharedModulesContext();

  return useMemo(() => {
    const locationId = location?.id ?? null;

    const normalizePath = (path: string) => {
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
        return path;
      }
      return path.startsWith("/") ? path : `/${path}`;
    };
    const isTenantRequest = (path: string) => isTenantScopedPath(normalizePath(path));
    const isScopedRequestConfig = (config: unknown): config is ScopedRequestConfig =>
      Boolean(config) && typeof config === "object" && !Array.isArray(config);
    const shouldSkip = (config: unknown) =>
      isScopedRequestConfig(config) && Boolean((config as ScopedRequestConfig).skipLocationScope);

    const preparePostRequest = (path: string, config?: unknown) => {
      if (isTenantRequest(path)) {
        return {
          url: normalizePath(path),
          config: withSkipLocation(config),
        };
      }

      if (!isScopedRequestConfig(config) || !config.skipLocationScope) {
        return {
          url: buildScopedUrl(path, apiScope, locationId),
          config,
        };
      }

      const { skipLocationScope, ...requestConfig } = config;
      return {
        url: normalizePath(path),
        config: { ...requestConfig, _skipLocationParam: true },
      };
    };

    return {
      apiScope,
      locationId,
      buildUrl: (path: string) => buildScopedUrl(path, apiScope, locationId),
      get: <T>(path: string, config?: unknown) => {
        const cfg = isTenantRequest(path) ? withSkipLocation(config) : (shouldSkip(config) ? withSkipLocation(config) : config);
        return api.get<T>(normalizePath(path), cfg);
      },
      post: <T>(path: string, data?: unknown, config?: unknown) => {
        const request = preparePostRequest(path, config);
        return api.post<T>(request.url, data, request.config);
      },
      put: <T>(path: string, data?: unknown, config?: unknown) => {
        const cfg = isTenantRequest(path) ? withSkipLocation(config) : (shouldSkip(config) ? withSkipLocation(config) : config);
        return api.put<T>(normalizePath(path), data, cfg);
      },
      patch: <T>(path: string, data?: unknown, config?: unknown) => {
        const cfg = isTenantRequest(path) ? withSkipLocation(config) : (shouldSkip(config) ? withSkipLocation(config) : config);
        return api.patch<T>(normalizePath(path), data, cfg);
      },
      delete: <T>(path: string, config?: unknown) => {
        const cfg = isTenantRequest(path) ? withSkipLocation(config) : (shouldSkip(config) ? withSkipLocation(config) : config);
        return api.delete<T>(normalizePath(path), cfg);
      },
    };
  }, [api, apiScope, location]);
}
