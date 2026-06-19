import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Calendar, CalendarSettingsRequest } from "../types";
import { useToast } from "../contexts/ToastContext";
import { unwrapList } from "./response";

export const useCalendars = () => {
  const api = useBookingApi();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        "/calendars/search",
        {},
        { params: { page: 0, size: 100 } },
      );
      setCalendars(unwrapList<Calendar>(data));
    } catch (e) {
      // No mock fallback — surface the failure and leave the list empty.
      const msg = e instanceof Error ? e.message : "Failed to load calendars.";
      setError(msg);
      showToast(msg, "error");
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  const createCalendar = async (name: string, description: string) => {
    // No mock-create fallback — a failure propagates so the caller never thinks
    // a calendar was persisted when it wasn't.
    const newCalendar = await api.post<Calendar>("/calendars", {
      name,
      description,
      status: "Active",
    });
    setCalendars((prev) => [...prev, newCalendar]);
    showToast("Calendar created successfully", "success");
    return newCalendar;
  };

  const getCalendar = useCallback(
    (uid: string) => api.get<Calendar>(`/calendars/${uid}`),
    [api],
  );

  const updateCalendarSettings = async (
    uid: string,
    settings: CalendarSettingsRequest,
  ) => {
    const updated = await api.put<Calendar>(`/calendars/${uid}/settings`, settings);
    setCalendars((prev) =>
      prev.map((calendar) =>
        calendar.uid === uid ? { ...calendar, ...updated } : calendar,
      ),
    );
    showToast("Calendar settings saved", "success");
    return updated;
  };

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return {
    calendars,
    loading,
    error,
    createCalendar,
    getCalendar,
    updateCalendarSettings,
    refresh: fetchCalendars,
  };
};
