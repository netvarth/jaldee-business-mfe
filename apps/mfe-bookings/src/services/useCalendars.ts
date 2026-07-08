import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Calendar, CalendarSettingsRequest, Schedule } from "../types";
import { useToast } from "../contexts/ToastContext";
import { unwrapList } from "./response";

export interface CreateCalendarPayload {
  uid?: string;
  name: string;
  description: string;
  locationId: number;
  locationName: string;
  services: string[];
  users: string[];
  channel: string;
  label: string[];
  qrLinkRequired: boolean;
  feature: string;
  status: string;
  color: string;
  bookingChannels: string[];
  capacityOverride: number;
  tags: string[];
}

export interface CreateTimeWindowPayload {
  uid?: string;
  calendarUid: string;
  calendarName: string;
  scheduleUid?: string;
  scheduleName: string;
  weekDays: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  slotCapacity: number;
  channel: string;
  label: string[];
  qrLinkRequired: boolean;
}

export interface CreateSchedulePayload {
  uid?: string;
  name: string;
  description: string;
  calendarUid: string;
  calendarName: string;
  startDate: string;
  endDate: string;
  slotCapacity: number;
  qrLinkRequired: boolean;
  timeWindows: CreateTimeWindowPayload[];
}

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

  const createCalendar = async (payload: CreateCalendarPayload) => {
    // No mock-create fallback — a failure propagates so the caller never thinks
    // a calendar was persisted when it wasn't.
    const newCalendar = await api.post<Calendar>("/calendars", payload);
    setCalendars((prev) => [...prev, newCalendar]);
    showToast("Calendar created successfully", "success");
    return newCalendar;
  };

  const createSchedule = async (
    calendarUid: string,
    payload: CreateSchedulePayload,
  ) => {
    const schedule = await api.post(
      `/calendars/${calendarUid}/schedules`,
      payload,
    );
    showToast("Schedule saved", "success");
    return schedule;
  };

  const getCalendar = useCallback(
    (uid: string) => api.get<Calendar>(`/calendars/${uid}`),
    [api],
  );

  const searchSchedules = useCallback(
    async (calendarUid: string, q = "") => {
      const data = await api.post<unknown>("/calendars/schedules/search", {
        q,
        calendarUid,
      });
      return unwrapList<Schedule>(data);
    },
    [api],
  );

  const getSchedule = useCallback(
    async (calendarUid: string, scheduleUid: string) => {
      const schedules = await searchSchedules(calendarUid);
      return schedules.find((schedule) => schedule.uid === scheduleUid) ?? null;
    },
    [searchSchedules],
  );

  const updateSchedule = async (
    scheduleUid: string,
    payload: CreateSchedulePayload,
  ) => {
    const schedule = await api.put(
      `/calendars/schedules/${scheduleUid}`,
      payload,
    );
    showToast("Schedule updated", "success");
    return schedule;
  };

  const updateTimeWindow = async (
    scheduleUid: string,
    payload: CreateTimeWindowPayload,
  ) => {
    const response = await api.put(
      `/calendars/schedules/${scheduleUid}/time-windows`,
      payload,
    );
    return response;
  };

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

  const updateCalendar = async (
    uid: string,
    payload: CreateCalendarPayload,
  ) => {
    const updated = await api.put<Calendar>(`/calendars/${uid}`, payload);
    setCalendars((prev) =>
      prev.map((calendar) =>
        calendar.uid === uid ? { ...calendar, ...updated } : calendar,
      ),
    );
    showToast("Calendar updated successfully", "success");
    return updated;
  };

  const updateCalendarExtendedSettings = async (
    uid: string,
    settings: CalendarSettingsRequest,
  ) => {
    const updated = await api.put<Calendar>(`/calendars/${uid}/extended-settings`, settings);
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
    createSchedule,
    getCalendar,
    getSchedule,
    searchSchedules,
    updateCalendar,
    updateCalendarSettings,
    updateCalendarExtendedSettings,
    updateSchedule,
    updateTimeWindow,
    refresh: fetchCalendars,
  };
};
