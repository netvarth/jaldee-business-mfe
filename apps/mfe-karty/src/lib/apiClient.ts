import { apiClient, initApiClient, setApiClientContext } from "@jaldee/api-client";

declare global {
  interface Window {
    __JALDEE_PROVIDER_BASE_URL__?: string;
    __JALDEE_LEGACY_PROVIDER_APP_URL__?: string;
  }
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    const normalized = configuredUrl.replace(/\/$/, "");
    if (normalized.endsWith("/provider/karty")) {
      return normalized;
    }
    if (normalized.endsWith("/provider")) {
      return `${normalized}/karty`;
    }
    return `${normalized}/provider/karty`;
  }

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("provider/karty", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider/karty`;
    }
  }

  return "/api/provider/karty";
}

export function ensureApiClientInitialized(mfeName = "mfe_karty", authToken = "") {
  if (!apiClient) {
    initApiClient(resolveApiBaseUrl());
  }

  setApiClientContext({
    mfeName,
    productScope: "karty",
    authMode: authToken ? "token" : "session",
    authToken,
  });
}
