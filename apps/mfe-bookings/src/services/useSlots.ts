import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Slot } from "../types";

interface SlotQuery {
  scheduleUid: string;
  serviceUid: string;
  date?: string;
  startDate?: string;
  endDate?: string;
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
    async ({ scheduleUid, serviceUid, date, startDate, endDate }: SlotQuery) => {
      if (!scheduleUid || !serviceUid || (!date && !startDate)) {
        setSlots([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ scheduleUid, serviceUid });
        if (date) params.append("date", date);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        
        const url = `/bookings/availability?${params.toString()}`;
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
