import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Slot } from "../types";

interface SlotQuery {
  scheduleUid: string;
  serviceUid: string;
  providerUid?: string;
  date: string;
}

function parseSlots(body: unknown): Slot[] {
  if (!body) return [];
  const b = body as { slots?: Slot[]; data?: { slots?: Slot[] } };
  if (Array.isArray(body)) return body as Slot[];
  return b.data?.slots ?? b.slots ?? [];
}

export function useSlots() {
  const api = useBookingApi();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(
    async ({ scheduleUid, serviceUid, providerUid, date }: SlotQuery) => {
      if (!scheduleUid || !serviceUid || !date) {
        setSlots([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let url = `/bookings/availability?date=${date}&scheduleUid=${scheduleUid}&serviceUid=${serviceUid}`;
        if (providerUid) url += `&providerUid=${providerUid}`;
        const body = await api.get<unknown>(url);
        // Real availability only — no generated sample slots. An empty result
        // correctly means "no slots", never fabricated openings.
        setSlots(parseSlots(body));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load availability.");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const clearSlots = useCallback(() => setSlots([]), []);

  return { slots, loading, error, fetchSlots, clearSlots };
}
