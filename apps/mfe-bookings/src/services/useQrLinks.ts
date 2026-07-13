import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

/** Mirrors backend QrLinkEntity (qr_link_tbl). */
export interface QrLink {
  uid?: string;
  name: string;
  description?: string;
  type?: string; // QrLinkType
  calendarUid?: string;
  calendarName?: string;
  schedule?: string[];
  timeWindow?: string[];
  user?: unknown[];
  service?: unknown[];
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
export function useQrLinks() {
  const api = useBookingApi();
  const [qrLinks, setQrLinks] = useState<QrLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: QrLinkQuery = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<unknown>("/qr-links/search", query, {
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
    [api],
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

  return { qrLinks, loading, error, search, create, update };
}
