import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Barcode registry + generation + label rendering.
 *
 * Backend: feature-commerce-service, context-path `/commerce-service`, prefix `/v1/api/tenant`.
 *   registry   POST /barcodes/registry, GET /barcodes/registry/scope/{scopeType}/{scopeUid},
 *              GET /barcodes/registry/lookup?barcode=, DELETE /barcodes/registry/{uid}
 *   generate   POST /barcodes/inventory-items/generate, /barcodes/batches/generate,
 *              GET  /barcodes/generate?count=&type=
 *   labels     POST /barcodes/labels/render (binary), GET /barcodes/labels/preview?barcode=
 */

export type BarcodeScopeType = "ITEM" | "ITEM_VARIANT" | "CATALOG_ITEM" | "BATCH";
export type BarcodeType =
  | "GTIN_EAN13" | "GTIN_UPC" | "GTIN_EAN8" | "ITF14" | "INTERNAL" | "MANUFACTURER";
export type BarcodeFormat = "EAN13" | "CODE128";
export type LabelOutputFormat = "ZPL" | "PNG";

export interface Barcode {
  uid: string;
  barcode: string;
  barcodeType: BarcodeType;
  scopeType: BarcodeScopeType;
  scopeUid: string;
  unitUid?: string | null;
  primary: boolean;
  active: boolean;
}

export interface RegisterBarcodeInput {
  barcode: string;
  barcodeType: BarcodeType;
  scopeType: BarcodeScopeType;
  scopeUid: string;
  unitUid?: string | null;
  primary?: boolean;
}

const registryKey = (scopeType?: BarcodeScopeType, scopeUid?: string) =>
  ["barcode-registry", scopeType, scopeUid] as const;

/** Active barcodes registered against one scope row (e.g. a product or a batch). */
export function useScopeBarcodes(scopeType?: BarcodeScopeType, scopeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: registryKey(scopeType, scopeUid),
    enabled: !!scopeType && !!scopeUid,
    queryFn: async () =>
      api.get<Barcode[]>(`/v1/api/tenant/barcodes/registry/scope/${scopeType}/${scopeUid}`),
  });
}

export function useRegisterBarcode() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterBarcodeInput) =>
      api.post<Barcode>(`/v1/api/tenant/barcodes/registry`, {
        primary: true,
        ...input,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: registryKey(v.scopeType, v.scopeUid) }),
  });
}

export function useRetireBarcode() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid }: { uid: string; scopeType: BarcodeScopeType; scopeUid: string }) =>
      api.del<boolean>(`/v1/api/tenant/barcodes/registry/${uid}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: registryKey(v.scopeType, v.scopeUid) }),
  });
}

/** Auto-generate + assign an internal barcode to inventory catalog items. */
export function useGenerateCatalogItemBarcodes() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uids: string[]; format?: BarcodeFormat; overwriteExisting?: boolean }) =>
      api.post(`/v1/api/tenant/barcodes/inventory-items/generate`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barcode-registry"] }),
  });
}

/** Auto-generate + assign an internal barcode to stock batches. */
export function useGenerateBatchBarcodes() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uids: string[]; format?: BarcodeFormat; overwriteExisting?: boolean }) =>
      api.post(`/v1/api/tenant/barcodes/batches/generate`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barcode-registry"] }),
  });
}

/**
 * Label rendering returns binary (a ZPL command stream or a PNG), which the JSON-only
 * useCommerceApi cannot carry — so this hook fetches blobs directly, reusing the same
 * base path, auth header and cookie credentials.
 */
export function useBarcodeLabels() {
  const { authToken } = useMFEProps();

  return useMemo(() => {
    const BASE = "/commerce-service";

    async function blob(endpoint: string, init: RequestInit): Promise<Blob> {
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      if (init.body) headers["Content-Type"] = "application/json";
      if (init.headers) Object.assign(headers, init.headers);

      const res = await fetch(`${BASE}${endpoint}`, { ...init, headers, credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Label API ${res.status}${text ? ` — ${text}` : ""}`);
      }
      return res.blob();
    }

    return {
      /** PNG preview of a single code, as an object URL the caller must revoke. */
      previewUrl: async (barcode: string, format?: BarcodeFormat) => {
        const qs = new URLSearchParams({ barcode });
        if (format) qs.set("format", format);
        const b = await blob(`/v1/api/tenant/barcodes/labels/preview?${qs}`, { method: "GET" });
        return URL.createObjectURL(b);
      },
      /** Render labels and trigger a download of the resulting ZPL / PNG file. */
      renderAndDownload: async (body: {
        labels?: unknown[];
        batchUids?: string[];
        catalogItemUids?: string[];
        outputFormat?: LabelOutputFormat;
        labelWidthMm?: number;
        labelHeightMm?: number;
        dpi?: number;
        showBarcodeText?: boolean;
        showPrice?: boolean;
        showBatchInfo?: boolean;
      }) => {
        const b = await blob(`/v1/api/tenant/barcodes/labels/render`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const ext = (body.outputFormat ?? "ZPL") === "PNG" ? "png" : "zpl";
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `labels.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
    };
  }, [authToken]);
}
