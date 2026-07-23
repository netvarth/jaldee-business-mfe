import { useState, useEffect, useCallback, useRef } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "../services/useBookingApi";
import type {
  Calendar,
  CalendarCustomizationRequest,
  CalendarSettingsRequest,
  CalendarStatus,
  Schedule,
  ScheduleCustomizationRequest,
  TimeWindow,
  TimeWindowCustomizationRequest,
} from "../types";
import { useToast } from "../contexts/ToastContext";
import { unwrapList } from "./response";
import { buildCalendarSearchBody } from "./calendarSearch";
import { loadCalendarSearchSchema } from "./calendarSearchSchema";
import { buildScheduleSearchBody } from "./scheduleSearch";
import { loadScheduleSearchSchema } from "./scheduleSearchSchema";

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
  services: Array<{
    serviceUid: string;
    users: Array<{
      userUid: string;
    }>;
  }>;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeCalendarUserIds(userIds: string[] | undefined) {
  if (!Array.isArray(userIds)) {
    return [];
  }

  return userIds.filter((userUid) => typeof userUid === "string" && isUuid(userUid));
}

function sanitizeCalendarSettingsRequest(settings: CalendarSettingsRequest): CalendarSettingsRequest {
  return {
    ...settings,
    users: sanitizeCalendarUserIds(settings.users),
  };
}

function sanitizeCreateCalendarPayload(payload: CreateCalendarPayload): CreateCalendarPayload {
  return {
    ...payload,
    users: sanitizeCalendarUserIds(payload.users),
    services: payload.services.map((service) => ({
      ...service,
      users: service.users.filter((user) => isUuid(user.userUid)),
    })),
  };
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

const EMPTY_FILTER_CLAUSES: SearchFilterClause[] = [];

export const useCalendars = (
  filterClauses: SearchFilterClause[] = EMPTY_FILTER_CLAUSES,
  schema: SearchSchema | null | undefined = null,
  options?: { enabled?: boolean; loadSchema?: boolean }
) => {
  const api = useBookingApi();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const enabled = options?.enabled ?? true;
  const loadSchema = options?.loadSchema ?? true;
  const inFlightRequestKeyRef = useRef<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resolvedSchema =
        schema ?? (loadSchema ? await loadCalendarSearchSchema(api).catch(() => null) : null);
      const requestBody = buildCalendarSearchBody({
        filterClauses,
        schema: resolvedSchema,
        page: 0,
        size: 100,
      });
      const requestKey = JSON.stringify(requestBody);

      if (inFlightRequestKeyRef.current === requestKey) {
        setLoading(false);
        return;
      }

      inFlightRequestKeyRef.current = requestKey;
      const data = await api.post<unknown>(
        "/calendars/search",
        requestBody,
        { _skipLocationParam: true },
      );
      setCalendars(unwrapList<Calendar>(data).map(normalizeCalendar));
    } catch (e) {
      // No mock fallback — surface the failure and leave the list empty.
      const msg = e instanceof Error ? e.message : "Failed to load calendars.";
      setError(msg);
      showToast(msg, "error");
      setCalendars([]);
    } finally {
      inFlightRequestKeyRef.current = null;
      setLoading(false);
    }
  }, [api, enabled, filterClauses, loadSchema, schema, showToast]);

  const createCalendar = async (payload: CreateCalendarPayload) => {
    // No mock-create fallback — a failure propagates so the caller never thinks
    // a calendar was persisted when it wasn't.
    const newCalendar = normalizeCalendar(
      await api.post<Calendar>("/calendars", sanitizeCreateCalendarPayload(payload))
    );
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
      const schema = await loadScheduleSearchSchema(api).catch(() => null);
      const requestBody = buildScheduleSearchBody({
        filterClauses: [],
        schema,
        page: 0,
        size: 200,
      });
      const conditions = [
        {
          field: "calendarUid",
          operator: "EQ",
          values: [calendarUid],
        },
      ];
      const query = q.trim();
      if (query) {
        conditions.push({
          field: "name",
          operator: "CONTAINS",
          values: [query],
        });
      }

      const data = await api.post<unknown>(
        "/calendars/schedules/search",
        {
          ...requestBody,
          filters: {
            logic: "AND",
            conditions,
          },
        },
        { _skipLocationParam: true },
      );

      return unwrapList<Schedule>(data);
    },
    [api],
  );

  const getSchedule = useCallback(
    async (_calendarUid: string, scheduleUid: string) => {
      const response = await api.get<{ schedule?: Schedule } | Schedule>(`/schedules/${scheduleUid}`, {
        _skipLocationParam: true,
      });
      if (response && typeof response === "object" && "schedule" in response) {
        return response.schedule ?? null;
      }
      return response as Schedule;
    },
    [api],
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

  const getTimeWindowDetails = useCallback(
    async (timeWindowUid: string) => {
      return api.get<TimeWindow>(`/calendars/schedules/time-windows/${timeWindowUid}`, {
        _skipLocationParam: true,
      });
    },
    [api],
  );

  const customizeTimeWindow = async (
    uid: string,
    payload: TimeWindowCustomizationRequest,
  ) => {
    const updated = await api.put<TimeWindow>(`/calendars/schedules/time-windows/${uid}/customizations`, payload);
    showToast("Time window customization saved", "success");
    return updated;
  };

  const updateCalendarSettings = async (
    uid: string,
    settings: CalendarSettingsRequest,
  ) => {
    const updated = normalizeCalendar(
      await api.put<Calendar>(`/calendars/${uid}/settings`, sanitizeCalendarSettingsRequest(settings))
    );
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
    const updated = normalizeCalendar(
      await api.put<Calendar>(`/calendars/${uid}`, sanitizeCreateCalendarPayload(payload))
    );
    setCalendars((prev) =>
      prev.map((calendar) =>
        calendar.uid === uid ? { ...calendar, ...updated } : calendar,
      ),
    );
    showToast("Calendar updated successfully", "success");
    return updated;
  };

  const customizeCalendar = async (
    uid: string,
    payload: CalendarCustomizationRequest,
  ) => {
    const updated = normalizeCalendar(
      await api.put<Calendar>(`/calendars/${uid}/customizations`, payload),
    );
    setCalendars((prev) =>
      prev.map((calendar) =>
        calendar.uid === uid ? { ...calendar, ...updated } : calendar,
      ),
    );
    showToast("Calendar customization saved", "success");
    return updated;
  };

  const customizeSchedule = async (
    scheduleUid: string,
    payload: ScheduleCustomizationRequest,
  ) => {
    const updated = await api.put<Schedule>(`/schedules/${scheduleUid}/customizations`, payload);
    showToast("Schedule customization saved", "success");
    return updated;
  };

  const updateCalendarExtendedSettings = async (
    uid: string,
    settings: CalendarSettingsRequest,
  ) => {
    const updated = normalizeCalendar(
      await api.put<Calendar>(`/calendars/${uid}/extended-settings`, sanitizeCalendarSettingsRequest(settings))
    );
    setCalendars((prev) =>
      prev.map((calendar) =>
        calendar.uid === uid ? { ...calendar, ...updated } : calendar,
      ),
    );
    showToast("Calendar settings saved", "success");
    return updated;
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchCalendars();
  }, [enabled, fetchCalendars]);

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
    customizeCalendar,
    customizeSchedule,
    updateCalendar,
    updateCalendarSettings,
    updateCalendarExtendedSettings,
    updateSchedule,
    updateTimeWindow,
    getTimeWindowDetails,
    customizeTimeWindow,
    normalizeCalendarStatus,
    refresh: fetchCalendars,
  };
};
