import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { apiClient, getReadableApiError } from "@jaldee/api-client";

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
const GATEWAY_PREFIX = import.meta.env.VITE_SERVICE_GATEWAY_PREFIX
  ? `/${import.meta.env.VITE_SERVICE_GATEWAY_PREFIX.replace(/^\/+|\/+$/g, "")}`
  : "";
const DEFAULT_BASE_PATH = import.meta.env.VITE_BOOKINGS_API_BASE_PATH;

function buildBookingServiceUrl(endpoint: string) {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (
    normalizedEndpoint.startsWith("/base-service/") ||
    normalizedEndpoint.startsWith("/booking-service/") ||
    normalizedEndpoint.startsWith("/platform-service/")
  ) {
    return new URL(normalizedEndpoint, window.location.origin).toString();
  }

  let basePath = DEFAULT_BASE_PATH || `${GATEWAY_PREFIX}/booking-service/v1/api/tenant`;
  
  if (!DEFAULT_BASE_PATH) {
    if (
      normalizedEndpoint.startsWith("/users") ||
      normalizedEndpoint.startsWith("/consumers")
    ) {
      basePath = `${GATEWAY_PREFIX}/base-service/v1/api/tenant`;
    } else if (normalizedEndpoint.startsWith("/customers")) {
      basePath = `${GATEWAY_PREFIX}/v1/api/tenant`;
    } else if (
      normalizedEndpoint.startsWith("/services") ||
      normalizedEndpoint.startsWith("/bookings") ||
      normalizedEndpoint.startsWith("/calendars") ||
      normalizedEndpoint.startsWith("/preferences") ||
      normalizedEndpoint.startsWith("/booking-preferences")
    ) {
      basePath = `${GATEWAY_PREFIX}/booking-service/v1/api/tenant`;
    }
  }

  return new URL(`${basePath}${normalizedEndpoint}`, window.location.origin).toString();
}

interface BookingRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  _skipLocationParam?: boolean;
  signal?: AbortSignal;
}

export function useBookingApi() {
  const { authToken, location } = useMFEProps();

  return useMemo(() => {
    // Fail fast when the backend/gateway is unreachable (e.g. standalone dev
    // with no live booking-service) so callers fall back to samples instead of
    // hanging. Override via VITE_BOOKING_API_TIMEOUT_MS.
    const TIMEOUT = Number(import.meta.env.VITE_BOOKING_API_TIMEOUT_MS) || 4000;

    async function request<T>(
      endpoint: string,
      method: "GET" | "POST" | "PUT" | "DELETE",
      body?: any,
      options?: BookingRequestOptions,
    ): Promise<T> {
      try {
        const params =
          options?._skipLocationParam || options?.params?.location !== undefined
            ? options?.params
            : {
                ...options?.params,
                ...(location?.id ? { location: location.id } : {}),
              };

        const res = await apiClient.request<any>({
          url: buildBookingServiceUrl(endpoint),
          method,
          data: body,
          params,
          _skipLocationParam: options?._skipLocationParam,
          signal: options?.signal,
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
        const readable = getReadableApiError(err, "Booking request failed.");
        throw Object.assign(new Error(readable.message), readable);
      }
    }

    return {
      get<T>(endpoint: string, options?: BookingRequestOptions): Promise<T> {
        return request<T>(endpoint, "GET", undefined, options);
      },
      post<T>(endpoint: string, data: unknown, options?: BookingRequestOptions): Promise<T> {
        return request<T>(endpoint, "POST", data, options);
      },
      put<T>(endpoint: string, data: unknown): Promise<T> {
        return request<T>(endpoint, "PUT", data);
      },
    };
  }, [authToken, location?.id]);
}
