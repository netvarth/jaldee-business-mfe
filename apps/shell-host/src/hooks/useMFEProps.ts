import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { eventBus } from "../eventBus/eventBus";
import { apiClient } from "@jaldee/api-client";
import { normalizeAccountContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import { telemetryService, identifyUser } from "../services/telemetry";

declare global {
  interface Window {
    __JALDEE_SUPERADMIN_API_BASE_URL__?: string;
  }
}

function buildMfeApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  const configuredPrefix = import.meta.env.VITE_SERVICE_GATEWAY_PREFIX?.trim();
  const gatewayPrefix = configuredPrefix && configuredPrefix !== "/"
    ? `/${configuredPrefix.replace(/^\/+|\/+$/g, "")}`
    : "";

  if (
    gatewayPrefix &&
    !normalizedUrl.startsWith(`${gatewayPrefix}/`) &&
    /^\/(auth-service|base-service|booking-service|finance-service|hr-service|platform-service)\//.test(normalizedUrl)
  ) {
    return `${gatewayPrefix}${normalizedUrl}`;
  }

  return normalizedUrl;
}

export function useBuildMFEProps(
  mfeName: string,
  basePath: string
): MFEProps | null {
  const navigate = useNavigate();
  const { user, account, accessToken, activeLocation, availableLocations } = useShellStore();
  const resolvedLocation = activeLocation ?? availableLocations[0] ?? null;
  const normalizedAccount = useMemo(
    () => (account ? normalizeAccountContext(account) : null),
    [account]
  );
  console.log("[useBuildMFEProps] store state:", { 
    user: !!user, 
    account: !!account, 
    activeLocation,
    availableLocations,
    resolvedLocation,
  });
  const superadminBaseUrl = import.meta.env.VITE_SUPERADMIN_API_BASE_URL?.trim();

  if (typeof window !== "undefined" && superadminBaseUrl) {
    window.__JALDEE_SUPERADMIN_API_BASE_URL__ = superadminBaseUrl.replace(/\/$/, "");
  }

  const mfeProps = useMemo<MFEProps | null>(
    () =>
      !user || !normalizedAccount || !resolvedLocation
        ? null
        : ({
      mfeName,
      basePath,
      assetsBaseUrl: import.meta.env.VITE_ASSETS_URL?.trim(),
      authToken: accessToken ?? "",
      user,
      account: normalizedAccount,
      theme: { primaryColor: normalizedAccount.theme.primaryColor },
      locale: "en-IN",
      location: resolvedLocation,
      navigate: (route: string) => navigate(route),
      eventBus,
      api: {
        get: (url, config) => apiClient.get(buildMfeApiUrl(url), config),
        post: (url, data, config) => apiClient.post(buildMfeApiUrl(url), data, config),
        put: (url, data, config) => apiClient.put(buildMfeApiUrl(url), data, config),
        patch: (url, data, config) => apiClient.patch(buildMfeApiUrl(url), data, config),
        delete: (url, config) => apiClient.delete(buildMfeApiUrl(url), config),
      },
      onError: (error) => {
        console.error(`[${mfeName}] MFE Error:`, error);
        telemetryService.captureError(
          new Error(error.message),
          { mfe: error.mfe, code: error.code, severity: error.severity, ...error.context }
        );
      },
      telemetry: telemetryService,
    }),
    [accessToken, basePath, mfeName, navigate, normalizedAccount, resolvedLocation, user]
  );

  // Identify the user in PostHog once the session is established.
  useMemo(() => {
    if (user && normalizedAccount) {
      identifyUser(
        { id: user.id, name: user.name, email: user.email },
        normalizedAccount.id
      );
    }
  }, [user, normalizedAccount]);

  return mfeProps;
}
