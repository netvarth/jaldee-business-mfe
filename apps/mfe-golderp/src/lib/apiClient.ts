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
      return new URL("provider/golderp", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider/golderp`;
    }
  }

  return new URL("/api/provider/golderp", window.location.origin).toString();
}

export function ensureApiClientInitialized(mfeName = "mfe_golderp", authToken = "") {
  if (!apiClient) {
    initApiClient(resolveApiBaseUrl());
  }

  setApiClientContext({
    mfeName,
    productScope: "golderp",
    authMode: authToken ? "token" : "session",
    authToken,
  });
}
