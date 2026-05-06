import { apiClient } from "@jaldee/api-client";
import type { MFEHttpBridge } from "@jaldee/auth-context";

let shellHttpBridge: MFEHttpBridge | null = null;

export function setShellHttpBridge(bridge: MFEHttpBridge | null) {
  shellHttpBridge = bridge;
}

function getHttpClient() {
  return shellHttpBridge ?? apiClient;
}

export const httpClient = {
  get<T>(url: string, config?: unknown) {
    return getHttpClient().get<T>(url, config);
  },

  post<T>(url: string, data?: unknown, config?: unknown) {
    return getHttpClient().post<T>(url, data, config);
  },

  put<T>(url: string, data?: unknown, config?: unknown) {
    return getHttpClient().put<T>(url, data, config);
  },

  patch<T>(url: string, data?: unknown, config?: unknown) {
    return getHttpClient().patch<T>(url, data, config);
  },

  delete<T>(url: string, config?: unknown) {
    return getHttpClient().delete<T>(url, config);
  },
};
