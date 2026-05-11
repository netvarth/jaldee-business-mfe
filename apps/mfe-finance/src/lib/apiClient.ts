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
    if (normalized.endsWith("/api")) {
      return normalized;
    }
    if (normalized.endsWith("/provider")) {
      return normalized.replace(/\/provider$/, "");
    }
    return `${normalized}/api`;
  }

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("api", providerBaseUrl).toString().replace(/\/$/, "");
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/api`;
    }
  }

  return "/api";
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
