import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";

/**
 * Booking service client using apiClient.
 *
 * The service's context-path is `/booking-service` and the API gateway routes
 * `/booking-service/**` straight to it (see infra-api-gateway). That sits at the
 * gateway root — NOT under the shared api-client base (`/api` → `/v1/rest`) — so
 * we call it same-origin and let the shell's Vite proxy forward `/booking-service`
 * to the gateway. Auth rides the HttpOnly cookie in the browser (credentials:
 * include); a bearer token is attached when present (native shell).
 *
 * All responses are wrapped in `ApiResponse<T> = { status, data, timestamp }`,
 * so we unwrap `.data` here and hand callers the raw payload.
 */
const BASE = "/booking-service";

export function useBookingApi() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    // Fail fast when the backend/gateway is unreachable (e.g. standalone dev
    // with no live booking-service) so callers fall back to samples instead of
    // hanging. Override via VITE_BOOKING_API_TIMEOUT_MS.
    const TIMEOUT = Number(import.meta.env.VITE_BOOKING_API_TIMEOUT_MS) || 4000;

    async function request<T>(
      endpoint: string,
      method: "GET" | "POST" | "PUT" | "DELETE",
      body?: any
    ): Promise<T> {
      try {
        const res = await apiClient.request<any>({
          url: `${BASE}${endpoint}`,
          method,
          data: body,
          timeout: TIMEOUT,
        });

        const parsed = res.data;
        // Unwrap ApiResponse<T> = { status, data, timestamp }
        return parsed && typeof parsed === "object" && "data" in parsed
          ? (parsed as { data: T }).data
          : (parsed as T);
      } catch (err: any) {
        if (err.code === "ECONNABORTED") {
          throw new Error(`Request timed out after ${TIMEOUT}ms. Ensure the backend is running and reachable.`);
        }
        const status = err.response?.status;
        const statusText = err.response?.statusText || "";
        const data = err.response?.data;
        let detail = "";
        if (data) {
          detail = data.message || data.error || data.detail || (typeof data === "string" ? data : "");
        }
        throw new Error(
          `Booking API error ${status || "Error"} ${statusText}${detail ? ` — ${detail}` : err.message ? ` — ${err.message}` : ""}`
        );
      }
    }

    return {
      get<T>(endpoint: string): Promise<T> {
        return request<T>(endpoint, "GET");
      },
      post<T>(endpoint: string, data: unknown): Promise<T> {
        return request<T>(endpoint, "POST", data);
      },
      put<T>(endpoint: string, data: unknown): Promise<T> {
        return request<T>(endpoint, "PUT", data);
      },
    };
  }, [authToken]);
}

