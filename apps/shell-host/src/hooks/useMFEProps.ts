import { useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { eventBus } from "../eventBus/eventBus";
import { apiClient } from "@jaldee/api-client";
import { normalizeAccountContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";

declare global {
  interface Window {
    __JALDEE_SUPERADMIN_API_BASE_URL__?: string;
  }
}

export function useBuildMFEProps(
  mfeName: string,
  basePath: string
): MFEProps | null {
  const navigate = useNavigate();
  const { user, account, accessToken, activeLocation, availableLocations } = useShellStore();
  const resolvedLocation = activeLocation ?? availableLocations[0] ?? null;
  console.log("[useBuildMFEProps]", { 
    user: !!user, 
    account: !!account, 
    activeLocation: !!activeLocation,
    resolvedLocation: !!resolvedLocation,
  });

  if (!user || !account || !resolvedLocation) return null;
  const normalizedAccount = normalizeAccountContext(account);
  const superadminBaseUrl = import.meta.env.VITE_SUPERADMIN_API_BASE_URL?.trim();

  if (typeof window !== "undefined" && superadminBaseUrl) {
    window.__JALDEE_SUPERADMIN_API_BASE_URL__ = superadminBaseUrl.replace(/\/$/, "");
  }

  return {
    mfeName,
    basePath,
    assetsBaseUrl: import.meta.env.VITE_ASSETS_URL?.trim(),
    authToken:  accessToken ?? "",
    user,
    account: normalizedAccount,
    theme:      { primaryColor: normalizedAccount.theme.primaryColor },
    locale:     "en-IN",
    location:   resolvedLocation,
    navigate:   (route: string) => navigate(route),
    eventBus,
    api: {
      get: (url, config) => apiClient.get(url, config),
      post: (url, data, config) => apiClient.post(url, data, config),
      put: (url, data, config) => apiClient.put(url, data, config),
      patch: (url, data, config) => apiClient.patch(url, data, config),
      delete: (url, config) => apiClient.delete(url, config),
    },
    onError:    (error) => {
      console.error(`[${mfeName}] MFE Error:`, error);
    },
    telemetry: {
      captureError: (error) => console.error("[telemetry]", error),
      trackEvent:   (name, props) => console.debug("[telemetry]", name, props),
      trackPageView:(path) => console.debug("[telemetry:pageview]", path),
    },
  };
}
