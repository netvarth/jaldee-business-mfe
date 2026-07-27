import { apiClient, initApiClient, setApiClientContext } from "@jaldee/api-client";

declare global {
  interface Window {
    __JALDEE_PROVIDER_BASE_URL__?: string;
  }
}

function resolveApiBaseUrl() {
  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("api", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/api`;
    }
  }

  return new URL("/api/", window.location.origin).toString().replace(/\/$/, "");
}

export function ensureApiClientInitialized(mfeName = "mfe_finance", authToken = "") {
  if (!apiClient) {
    initApiClient(resolveApiBaseUrl());
  }

  setApiClientContext({
    mfeName,
    productScope: "finance",
    authMode: authToken ? "token" : "session",
    authToken,
  });
}
