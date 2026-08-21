import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";

/**
 * Finance service client.
 *
 * feature-finance-service uses context-path `/finance-service` and the API gateway routes
 * `/finance-service/**` straight to it.
 */
const BASE = "/finance-service";

type Json = Record<string, unknown> | unknown[];

export function useFinanceApi() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    const TIMEOUT = Number((import.meta as any).env?.VITE_FINANCE_API_TIMEOUT_MS) || 4000;

    async function request<T>(endpoint: string, init: RequestInit, isFormData: boolean = false): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);

      const reqHeaders: Record<string, string> = {};
      if (!isFormData) {
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
          throw new Error(`Finance API ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
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
