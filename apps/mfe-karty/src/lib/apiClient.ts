import { apiClient, initApiClient, setApiClientContext } from "@jaldee/api-client";

declare global {
  interface Window {
    __JALDEE_PROVIDER_BASE_URL__?: string;
    __JALDEE_LEGACY_PROVIDER_APP_URL__?: string;
  }
}

function resolveApiBaseUrl() {
  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("provider/karty", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider/karty`;
    }
  }

  return new URL("/api/provider/karty", window.location.origin).toString();
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
