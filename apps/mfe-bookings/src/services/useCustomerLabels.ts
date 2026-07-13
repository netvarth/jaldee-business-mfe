import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

/** Mirrors backend BookingLabelResponse. */
export interface CustomerLabel {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  isSystem?: boolean;
  status?: string;
}

/**
 * Customer labels:
 *   BookingConsumerLabelController @ /booking-consumer-labels —
 *     POST (create) · GET /{id} · POST /search · PUT /{id} ·
 *     PATCH /{id}/enable · PATCH /{id}/disable · DELETE /{id}
 *   CustomerController @ /customers —
 *     POST /apply-labels · POST /remove-labels  (body: { labelUids, targetUids })
 */
export function useCustomerLabels() {
  const api = useBookingApi();
  const [labels, setLabels] = useState<CustomerLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        "/booking-consumer-labels/search",
        {},
        { params: { page: 0, size: 200, sort: "createdAt,desc" } },
      );
      setLabels(unwrapList<CustomerLabel>(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load labels.");
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void search();
  }, [search]);

  const create = useCallback(
    async (label: CustomerLabel) => {
      const saved = await api.post<CustomerLabel>("/booking-consumer-labels", label);
      await search();
      return saved;
    },
    [api, search],
  );

  const update = useCallback(
    async (id: string, label: CustomerLabel) => {
      const saved = await api.put<CustomerLabel>(`/booking-consumer-labels/${id}`, label);
      await search();
      return saved;
    },
    [api, search],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      await api.patch(`/booking-consumer-labels/${id}/${enabled ? "enable" : "disable"}`);
      await search();
    },
    [api, search],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.del(`/booking-consumer-labels/${id}`);
      await search();
    },
    [api, search],
  );

  /** Apply/remove labels to/from a set of customers (booking consumers). */
  const applyLabels = useCallback(
    async (labelUids: string[], targetUids: string[]) => {
      await api.post("/customers/apply-labels", { labelUids, targetUids });
    },
    [api],
  );

  const removeLabels = useCallback(
    async (labelUids: string[], targetUids: string[]) => {
      await api.post("/customers/remove-labels", { labelUids, targetUids });
    },
    [api],
  );

  return { labels, loading, error, search, create, update, setEnabled, remove, applyLabels, removeLabels };
}
