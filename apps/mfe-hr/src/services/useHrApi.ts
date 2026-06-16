import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";

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
    const headers = (): Record<string, string> => {
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) h["Authorization"] = `Bearer ${authToken}`;
      return h;
    };

    // Fail fast when backend/gateway is unreachable so callers can fall back to
    // samples instead of hanging. Override via VITE_HR_API_TIMEOUT_MS.
    const TIMEOUT = Number(import.meta.env.VITE_HR_API_TIMEOUT_MS) || 4000;

    async function request<T>(endpoint: string, init: RequestInit): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const res = await fetch(`${BASE}${endpoint}`, {
          ...init,
          headers: headers(),
          credentials: "include",
          signal: controller.signal,
        }).catch(err => {
          if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${TIMEOUT}ms. Ensure the backend is running and reachable.`);
          }
          throw err;
        });
        if (!res.ok) {
          let detail = "";
          try {
            const errText = await res.text();
            if (errText) {
              try {
                const j = JSON.parse(errText);
                detail = j?.message || j?.error || j?.detail || errText;
              } catch {
                detail = errText;
              }
            }
          } catch { /* ignore body read errors */ }
          throw new Error(`HR API ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
        }
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : {};
        // Unwrap ApiResponse<T> = { status, data, timestamp }
        return (parsed && typeof parsed === "object" && "data" in parsed
          ? (parsed as { data: T }).data
          : (parsed as T));
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
      post: <T>(endpoint: string, body?: Json) =>
        request<T>(endpoint, { method: "POST", body: JSON.stringify(body ?? {}) }),
      put: <T>(endpoint: string, body?: Json) =>
        request<T>(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}) }),
      del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
    };
  }, [authToken]);
}
