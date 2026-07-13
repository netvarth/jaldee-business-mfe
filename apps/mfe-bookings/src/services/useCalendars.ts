import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Calendar, CalendarSettingsRequest, CalendarStatus, Schedule } from "../types";
import { useToast } from "../contexts/ToastContext";
import { unwrapList } from "./response";

export interface AccountLocation {
  id: number;
  uid?: string;
  name: string;
}

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
  status: CalendarStatus;
  defaultServiceId?: string;
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

function normalizeCalendarStatus(status?: string | null): CalendarStatus {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
    case "ENABLED":
      return "ACTIVE";
    case "INACTIVE":
    case "DISABLED":
      return "INACTIVE";
    default:
      return "DRAFT";
  }
}

// Distinct, readable calendar colors. The create wizard currently persists a
// single hardcoded color (#0f172a) for every calendar, so we treat that (and
// empty) as "unset" and assign a stable palette color derived from the uid —
// this gives every calendar a distinct color that appointments inherit.
const CALENDAR_PALETTE = [
  "#9333EA", "#2563EB", "#059669", "#D97706",
  "#DC2626", "#0891B2", "#DB2777", "#7C3AED",
];

function resolveCalendarColor(calendar: Calendar): string {
  const raw = (calendar.color ?? "").trim();
  if (raw && raw.toLowerCase() !== "#0f172a") return raw;
  const key = String(calendar.uid ?? calendar.id ?? calendar.name ?? "");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CALENDAR_PALETTE[hash % CALENDAR_PALETTE.length];
}

function normalizeCalendar(calendar: Calendar): Calendar {
  return {
    ...calendar,
    color: resolveCalendarColor(calendar),
    status: normalizeCalendarStatus(calendar.status),
  };
}

function normalizeLocation(raw: Record<string, unknown>): AccountLocation {
  const idValue = raw.id ?? raw.locationId ?? raw.uid ?? raw.encId;
  const numericId = typeof idValue === "number" ? idValue : Number(idValue);
  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    uid: typeof raw.uid === "string" ? raw.uid : typeof raw.encId === "string" ? raw.encId : undefined,
    name:
      (typeof raw.place === "string" && raw.place) ||
      (typeof raw.name === "string" && raw.name) ||
      (typeof raw.displayName === "string" && raw.displayName) ||
      "Unnamed location",
  };
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
      setCalendars(unwrapList<Calendar>(data).map(normalizeCalendar));
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
    const newCalendar = normalizeCalendar(await api.post<Calendar>("/calendars", payload));
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
    async (uid: string) => normalizeCalendar(await api.get<Calendar>(`/calendars/${uid}`)),
    [api],
  );

  const getLocations = useCallback(async () => {
    const data = await api.get<unknown>("/base-service/v1/api/tenant/locations", { _skipLocationParam: true });
    return unwrapList<Record<string, unknown>>(data).map(normalizeLocation);
  }, [api]);

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
    const updated = normalizeCalendar(await api.put<Calendar>(`/calendars/${uid}/settings`, settings));
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
    const updated = normalizeCalendar(await api.put<Calendar>(`/calendars/${uid}`, payload));
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
    const updated = normalizeCalendar(await api.put<Calendar>(`/calendars/${uid}/extended-settings`, settings));
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
    getLocations,
    getSchedule,
    searchSchedules,
    updateCalendar,
    updateCalendarSettings,
    updateCalendarExtendedSettings,
    updateSchedule,
    updateTimeWindow,
    normalizeCalendarStatus,
    refresh: fetchCalendars,
  };
};
