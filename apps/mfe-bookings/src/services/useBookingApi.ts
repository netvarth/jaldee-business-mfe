import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";

/**
 * Booking service client.
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
    const headers = (): Record<string, string> => {
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) h["Authorization"] = `Bearer ${authToken}`;
      return h;
    };

    // Fail fast when the backend/gateway is unreachable (e.g. standalone dev
    // with no live booking-service) so callers fall back to samples instead of
    // hanging. Override via VITE_BOOKING_API_TIMEOUT_MS.
    const TIMEOUT = Number(import.meta.env.VITE_BOOKING_API_TIMEOUT_MS) || 4000;

    async function request<T>(endpoint: string, init: RequestInit): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const res = await fetch(`${BASE}${endpoint}`, {
          ...init,
          headers: headers(),
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Booking API error ${res.status}`);
        const body = (await res.json()) as unknown;
        if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
          return (body as { data: T }).data;
        }
        return body as T;
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      get<T>(endpoint: string): Promise<T> {
        return request<T>(endpoint, { method: "GET" });
      },
      post<T>(endpoint: string, data: unknown): Promise<T> {
        return request<T>(endpoint, { method: "POST", body: JSON.stringify(data) });
      },
      put<T>(endpoint: string, data: unknown): Promise<T> {
        return request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) });
      },
    };
  }, [authToken]);
}
