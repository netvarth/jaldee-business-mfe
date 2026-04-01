import { apiClient, initApiClient, setApiClientContext } from "@jaldee/api-client";

declare global {
  interface Window {
    __JALDEE_PROVIDER_BASE_URL__?: string;
  }
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    const normalized = configuredUrl.replace(/\/$/, "");
    if (normalized.endsWith("/provider/golderp")) {
      return normalized;
    }
    if (normalized.endsWith("/provider")) {
      return `${normalized}/golderp`;
    }
    return `${normalized}/provider/golderp`;
  }

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("provider/golderp", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider/golderp`;
    }
  }

  return "/api/provider/golderp";
}

export function ensureApiClientInitialized(mfeName = "mfe_golderp", authToken = "") {
  if (!apiClient) {
    initApiClient(resolveApiBaseUrl());
  }

  setApiClientContext({
    mfeName,
    productScope: "golderp",
    authMode: "session",
    authToken,
  });
}
