import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";

/**
 * Commerce service client.
 *
 * feature-commerce-service uses context-path `/base-service` and the API gateway routes
 * `/base-service/**` straight to it.
 */
const BASE = "/base-service";

type Json = Record<string, unknown> | unknown[];

export function useCrmApi() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    const TIMEOUT = Number((import.meta as any).env?.VITE_COMMERCE_API_TIMEOUT_MS) || 4000;

    async function request<T>(endpoint: string, init: RequestInit, isFormData: boolean = false): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);

      const reqHeaders: Record<string, string> = {};
      if (!isFormData) {
        const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.jaldee.com';
        const authHeader = (import.meta as any).env?.VITE_AUTH_TOKEN ? {
          'Authorization': `Bearer ${(import.meta as any).env.VITE_AUTH_TOKEN}`
        } : {};
        reqHeaders["Content-Type"] = "application/json";
      }
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      if (init.headers) {
        Object.assign(reqHeaders, init.headers);
      }

      try {
        const res = await fetch(`${BASE}${endpoint}`, {
          ...init,
          headers: reqHeaders,
          credentials: "include",
          signal: controller.signal,
        }).catch(err => {
          if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${TIMEOUT}ms.`);
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
          throw new Error(`Commerce API ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
        }

        const text = await res.text();
        return (text ? JSON.parse(text) : {}) as T;
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
      post: <T>(endpoint: string, body?: Json | FormData) => {
        const isFormData = body instanceof FormData;
        return request<T>(
          endpoint,
          {
            method: "POST",
            body: isFormData ? body : JSON.stringify(body ?? {})
          },
          isFormData
        );
      },
      put: <T>(endpoint: string, body?: Json | FormData) => {
        const isFormData = body instanceof FormData;
        return request<T>(
          endpoint,
          {
            method: "PUT",
            body: isFormData ? body : JSON.stringify(body ?? {})
          },
          isFormData
        );
      },
      del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
    };
  }, [authToken]);
}
