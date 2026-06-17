import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";

/**
 * HR service client.
 *
 * feature-hr-service uses context-path `/hr-service` and the API gateway routes
 * `/hr-service/**` straight to it. We call same-origin and let the shell's Vite
 * proxy forward `/hr-service` to the gateway. Auth rides the HttpOnly cookie in
 * the browser (credentials: include); a bearer token is attached when present
 * (native shell).
 *
 * All responses are wrapped in `ApiResponse<T> = { status, data, timestamp }`,
 * so we unwrap `.data` here and hand callers the raw payload.
 */
const BASE = "/hr-service";

type Json = Record<string, unknown> | unknown[];

export function useHrApi() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    async function request<T>(
      endpoint: string,
      method: "GET" | "POST" | "PUT" | "DELETE",
      body?: Json
    ): Promise<T> {
      const timeout = Number(import.meta.env.VITE_HR_API_TIMEOUT_MS) || 4000;
      try {
        const res = await apiClient.request<any>({
          url: `${BASE}${endpoint}`,
          method,
          data: body,
          timeout,
        });

        const parsed = res.data;
        // Unwrap ApiResponse<T> = { status, data, timestamp }
        return parsed && typeof parsed === "object" && "data" in parsed
          ? (parsed as { data: T }).data
          : (parsed as T);
      } catch (err: any) {
        if (err.code === "ECONNABORTED") {
          throw new Error(`Request timed out after ${timeout}ms. Ensure the backend is running and reachable.`);
        }
        const status = err.response?.status;
        const statusText = err.response?.statusText || "";
        const data = err.response?.data;
        let detail = "";
        if (data) {
          detail = data.message || data.error || data.detail || (typeof data === "string" ? data : "");
        }
        throw new Error(
          `HR API ${status || "Error"} ${statusText}${detail ? ` — ${detail}` : err.message ? ` — ${err.message}` : ""}`
        );
      }
    }

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, "GET"),
      post: <T>(endpoint: string, body?: Json) => request<T>(endpoint, "POST", body),
      put: <T>(endpoint: string, body?: Json) => request<T>(endpoint, "PUT", body),
      del: <T>(endpoint: string) => request<T>(endpoint, "DELETE"),
    };
  }, [authToken]);
}
