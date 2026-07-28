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

  return window.location.origin;
}

export function ensureApiClientInitialized(mfeName = "mfe_bookings", authToken = "") {
  if (!apiClient) {
    initApiClient(resolveApiBaseUrl());
  }

  setApiClientContext({
    mfeName,
    productScope: "bookings",
    authMode: authToken ? "token" : "session",
    authToken,
  });
}
