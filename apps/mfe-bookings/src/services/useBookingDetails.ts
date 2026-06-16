import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type {
  BookingDetails,
  TimelineEvent,
  AllowedAction,
} from "../types";

export interface ActionExtra {
  reason?: string;
  notes?: string;
  newDate?: string;
  newStartTime?: string; // ISO OffsetDateTime
  newEndTime?: string;
}

function actionRequest(
  uid: string,
  action: AllowedAction,
  extra?: ActionExtra
): { path: string; body: unknown } | null {
  switch (action) {
    case "CONFIRM":
      return { path: `/bookings/${uid}/confirm`, body: {} };
    case "CHECK_IN":
      return { path: `/bookings/${uid}/check-in`, body: {} };
    case "MOVE_TO_WAITING":
      return { path: `/bookings/${uid}/waiting?notes=${encodeURIComponent(extra?.notes ?? "")}`, body: {} };
    case "START":
      return { path: `/bookings/${uid}/start`, body: {} };
    case "COMPLETE":
      return { path: `/bookings/${uid}/complete`, body: {} };
    case "CANCEL":
      return { path: `/bookings/${uid}/cancel`, body: { cancelReason: extra?.reason ?? "", cancelledBy: "staff" } };
    case "NO_SHOW":
      return { path: `/bookings/${uid}/no-show`, body: {} };
    case "RESCHEDULE":
      return {
        path: `/bookings/${uid}/reschedule`,
        body: { newDate: extra?.newDate, newStartTime: extra?.newStartTime, newEndTime: extra?.newEndTime, notifyPatient: false },
      };
    case "CREATE_INVOICE":
      return { path: `/bookings/${uid}/finance`, body: {} };
    default:
      return null; // VIEW_* / EDIT / CREATE_FOLLOWUP handled in the UI
  }
}


export function useBookingDetails() {
  const api = useBookingApi();
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<AllowedAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshTimeline = useCallback(
    async (uid: string) => {
      try {
        const t = await api.get<TimelineEvent[]>(`/bookings/${uid}/timeline`);
        setTimeline(t ?? []);
      } catch {
        /* timeline optional */
      }
    },
    [api]
  );

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const d = await api.get<BookingDetails>(`/bookings/${id}/details`);
        setDetails(d);
        await refreshTimeline(id);
      } catch (e) {
        // No sample fallback — clear details and surface the error so the UI
        // shows an error state instead of a fabricated booking.
        setError(e instanceof Error ? e.message : "Failed to load booking details.");
        setDetails(null);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    },
    [api, refreshTimeline]
  );

  const act = useCallback(
    async (action: AllowedAction, extra?: ActionExtra) => {
      if (!details) return;
      const req = actionRequest(details.uid, action, extra);
      if (!req) return;
      setActing(action);
      try {
        // Backend-only — no offline simulation of status transitions.
        const updated = await api.post<BookingDetails>(req.path, req.body);
        setDetails(updated);
        await refreshTimeline(details.uid);
      } finally {
        setActing(null);
      }
    },
    [api, details, refreshTimeline]
  );

  return { details, timeline, loading, acting, error, load, act };
}
