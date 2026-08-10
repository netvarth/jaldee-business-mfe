import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildCustomerSearchBody } from "./customerSearch";

/** Mirrors backend QrLinkEntity (qr_link_tbl). */
export interface QrLinkServiceEntry {
  serviceUid: string;
  userUids?: string[] | null;
}

export interface QrLinkServiceDetailsEntry {
  service: {
    uid: string;
    name: string;
    duration?: number;
    price?: number;
    status?: string;
  };
  users: Array<{ uid: string }>;
}

export interface QrLink {
  uid?: string;
  name: string;
  description?: string;
  type?: string; // QrLinkType
  calendarUid?: string;
  calendarName?: string;
  schedule?: string[];
  schedules?: Array<{ uid?: string; name?: string; [key: string]: any }>;
  timeWindow?: string[];
  timeWindows?: Array<{ uid?: string; name?: string; [key: string]: any }>;
  service?: QrLinkServiceEntry[];
  services?: QrLinkServiceDetailsEntry[];
  startDate?: string; // ISO yyyy-mm-dd
  expiryDate?: string; // ISO yyyy-mm-dd
  qrLink?: string;
  status?: string;
}

export interface QrLinkQuery {
  q?: string;
  type?: string;
  status?: string;
}

/**
 * QR links — QrLinkController @ /qr-links:
 *   POST /search · GET /{id} · POST · PUT /{id}
 */
const emptyFilterClauses: SearchFilterClause[] = [];

export function useQrLinks(options?: {
  filterClauses?: SearchFilterClause[];
  schema?: SearchSchema | null;
} = {}) {
  const api = useBookingApi();
  const [qrLinks, setQrLinks] = useState<QrLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterClauses = options?.filterClauses ?? emptyFilterClauses;
  const schema = options?.schema ?? null;

  const search = useCallback(
    async (query: QrLinkQuery = {}) => {
      setLoading(true);
      setError(null);
      try {
        const requestBody = buildCustomerSearchBody({ filterClauses, schema, page: 0, size: 200 });
        
        // Merge any explicit query params into the request body if needed, 
        // though typically they are handled via filterClauses now.
        if (query.q) {
           requestBody.filters = requestBody.filters || { logic: "AND", conditions: [] };
           requestBody.filters.conditions.push({ field: "name", operator: "CONTAINS", values: [query.q] });
        }

        const data = await api.post<unknown>("/qr-links/search", requestBody, {
          params: { page: 0, size: 200 },
        });
        setQrLinks(unwrapList<QrLink>(data));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load QR links.");
        setQrLinks([]);
      } finally {
        setLoading(false);
      }
    },
    [api, filterClauses, schema],
  );

  useEffect(() => {
    void search();
  }, [search]);

  const create = useCallback(
    async (qrLink: QrLink) => {
      const saved = await api.post<QrLink>("/qr-links", qrLink);
      await search();
      return saved;
    },
    [api, search],
  );

  const update = useCallback(
    async (id: string, qrLink: QrLink) => {
      const saved = await api.put<QrLink>(`/qr-links/${id}`, qrLink);
      await search();
      return saved;
    },
    [api, search],
  );

  const updateSelection = useCallback(
    async (id: string, selection: { service: QrLinkServiceEntry[] }) => {
      const saved = await api.patch<QrLink>(`/qr-links/${id}/selection`, selection);
      await search();
      return saved;
    },
    [api, search],
  );

  const getById = useCallback(
    async (id: string) => {
      return api.get<QrLink>(`/qr-links/details/${id}`);
    },
    [api],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/qr-links/${id}`);
      await search();
    },
    [api, search],
  );

  return { qrLinks, loading, error, search, create, update, updateSelection, remove, getById };
}
