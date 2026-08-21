import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";

/**
 * Commerce service client.
 *
 * feature-commerce-service uses context-path `/commerce-service` and the API gateway routes
 * `/commerce-service/**` straight to it.
 */
const BASE = "/commerce-service";

type Json = Record<string, unknown> | unknown[];

/**
 * Resolve the product-isolation context (Axis 1) for a commerce call. feature-commerce-service
 * fails OPEN to E_COMMERCE when `X-Product-Context` is missing/unrecognised, so any health/pharmacy
 * screen that doesn't stamp HEALTHCARE leaks retail data (orders, inventory, items, stock). Prefer
 * explicit props; only then fall back to the route — and match every health/pharmacy sub-section,
 * not just a bare '/health' or '/pharmacy'.
 */
export function resolveCommerceProductContext(mfeProps: unknown): "HEALTHCARE" | "E_COMMERCE" {
  const raw =
    (mfeProps as any)?.productContext ||
    (mfeProps as any)?.product ||
    (typeof window !== "undefined" && (window as any).__JALDEE_PRODUCT_CONTEXT__) ||
    "";
  const s = String(raw).toLowerCase();
  if (s) {
    if (s.includes("health") || s.includes("pharma") || s.includes("ayush") || s.includes("ayurveda")) {
      return "HEALTHCARE";
    }
    if (s.includes("commerce") || s.includes("retail")) {
      return "E_COMMERCE";
    }
  }
  if (typeof window !== "undefined") {
    const p = window.location.pathname.toLowerCase();
    const healthSegments = ["/health", "/pharmacy", "/rx", "/dispense", "/drug-register", "/ayush", "/ayurveda"];
    if (healthSegments.some((seg) => p.includes(seg))) {
      return "HEALTHCARE";
    }
  }
  return "E_COMMERCE";
}

export function useCommerceApi() {
  const mfeProps = useMFEProps();
  const authToken = mfeProps?.authToken;
  const productContext = resolveCommerceProductContext(mfeProps);

  return useMemo(() => {
    // Reads can fail fast; writes (order/return/stock create) run a real transaction — stock
    // reservation, consumer stamping, outbox — so a 4s cap aborted them client-side while the
    // server still committed, showing a false "timeout" AND duplicating the order on retry.
    // Give writes a much larger budget so a successful save is never reported as a failure.
    const READ_TIMEOUT = Number((import.meta as any).env?.VITE_COMMERCE_API_TIMEOUT_MS) || 15000;
    const WRITE_TIMEOUT = Number((import.meta as any).env?.VITE_COMMERCE_API_WRITE_TIMEOUT_MS) || 45000;

    async function request<T>(endpoint: string, init: RequestInit, isFormData: boolean = false, timeoutMs: number = READ_TIMEOUT): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const reqHeaders: Record<string, string> = {};
      if (!isFormData) {
        reqHeaders["Content-Type"] = "application/json";
      }
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      reqHeaders["X-Product-Context"] = productContext;
      reqHeaders["X-Product"] = productContext;
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
            throw new Error(`Request timed out after ${timeoutMs}ms.`);
          }
          throw err;
        });

        if (!res.ok) {
          let detail = "";
          let parsed: any = null;
          try {
            const errText = await res.text();
            if (errText) {
              try {
                parsed = JSON.parse(errText);
                detail = parsed?.message || parsed?.error || parsed?.detail || errText;
              } catch {
                detail = errText;
              }
            }
          } catch { /* ignore body read errors */ }
          const e: any = new Error(`Commerce API ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
          e.status = res.status;
          e.code = parsed?.code;
          e.serverMessage = parsed?.message;
          e.details = parsed?.details;
          throw e;
        }

        const text = await res.text();
        return (text ? JSON.parse(text) : {}) as T;
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      productContext,
      get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
      post: <T>(endpoint: string, body?: Json | FormData) => {
        const isFormData = body instanceof FormData;
        return request<T>(
          endpoint,
          {
            method: "POST",
            body: isFormData ? body : JSON.stringify(body ?? {})
          },
          isFormData,
          WRITE_TIMEOUT
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
          isFormData,
          WRITE_TIMEOUT
        );
      },
      patch: <T>(endpoint: string, body?: Json | FormData) => {
        const isFormData = body instanceof FormData;
        return request<T>(
          endpoint,
          {
            method: "PATCH",
            body: isFormData ? body : JSON.stringify(body ?? {})
          },
          isFormData,
          WRITE_TIMEOUT
        );
      },
      del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }, false, WRITE_TIMEOUT),
    };
  }, [authToken, productContext]);
}
