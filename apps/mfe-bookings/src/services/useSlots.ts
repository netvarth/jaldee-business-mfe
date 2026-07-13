import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Slot } from "../types";

interface SlotQuery {
  scheduleUid: string;
  serviceUid: string;
  /**
   * The availability endpoint's `scheduleUid` query param is a misnomer: the
   * backend (SlotAvailabilityServiceImpl.getAvailableSlots) looks the value up
   * as a calendar (calendarRepository.findById) and derives schedules from it.
   * So we must send the calendarUid here; passing a real scheduleUid yields a
   * 400 "Calendar not found". Falls back to scheduleUid when absent.
   */
  calendarUid?: string;
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
    async ({ scheduleUid, serviceUid, calendarUid, date, startDate, endDate }: SlotQuery) => {
      if (!scheduleUid || !serviceUid || (!date && !startDate)) {
        setSlots([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Backend reads the `scheduleUid` param as a calendarUid (see SlotQuery).
        const params = new URLSearchParams({ scheduleUid: calendarUid ?? scheduleUid, serviceUid });
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
