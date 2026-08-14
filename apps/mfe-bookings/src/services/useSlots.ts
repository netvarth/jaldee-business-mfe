import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Slot } from "../types";

interface SlotQuery {
  scheduleUid?: string;
  serviceUid: string;
  calendarUid?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  providerUid?: string;
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
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(
    async ({ scheduleUid, serviceUid, calendarUid, date, startDate, endDate, providerUid }: SlotQuery) => {
      if (!serviceUid || (!date && !startDate)) {
        setSlots([]);
        setIsHoliday(false);
        setHolidayMessage(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ serviceUid });
        if (scheduleUid) params.append("scheduleUid", scheduleUid);
        if (calendarUid) params.append("calendarUid", calendarUid);
        if (date) params.append("date", date);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (providerUid) {
          params.append("tenantUserUid", providerUid);
        }
        
        const url = `/bookings/availability?${params.toString()}`;
        const body = await api.get<unknown>(url);
        // Real availability only — no generated sample slots. An empty result
        // correctly means "no slots", never fabricated openings.
        setSlots(parseSlots(body));
        
        const b = body as { isHoliday?: boolean; message?: string; data?: { isHoliday?: boolean; message?: string } };
        setIsHoliday(b?.data?.isHoliday ?? b?.isHoliday ?? false);
        setHolidayMessage(b?.data?.message ?? b?.message ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load availability.");
        setSlots([]);
        setIsHoliday(false);
        setHolidayMessage(null);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const clearSlots = useCallback(() => {
    setSlots([]);
    setIsHoliday(false);
    setHolidayMessage(null);
  }, []);

  return { slots, isHoliday, holidayMessage, loading, error, fetchSlots, clearSlots };
}
