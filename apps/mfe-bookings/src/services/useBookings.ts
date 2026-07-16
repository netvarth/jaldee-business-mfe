import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "../services/useBookingApi";
import { createdBookings } from "../data/sessionStore";
import { formatIsoTime } from "../utils/dateTime";
import { buildBookingSearchBody, getBookingDateRange } from "./bookingSearch";
import { unwrapList } from "./response";
import { useBookingPreferences } from "./useBookingPreferences";

interface BookingDto {
  uid?: string;
  calendarUid?: string;
  serviceUid?: string;
  userUid?: string;
  customerName?: string;
  customer?: any;
  patient?: any;
  patientName?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}

const STATUS_MAP: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked-in",
  IN_PROGRESS: "In-progress",
  WAITING: "Waiting",
  COMPLETED: "Confirmed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Cancelled",
  UNBLOCKED: "Unblocked",
  BLOCKED: "Blocked",
};

function toCalendarBooking(d: BookingDto, timeZone?: string | null) {
  const start = formatIsoTime(d.startTime, timeZone);
  const derivedCustomerName =
    d.customerName ||
    d.patientName ||
    d.customer?.firstName ||
    d.customer?.name ||
    d.patient?.firstName ||
    d.patient?.name ||
    d.patient ||
    "Walk-in";

  return {
    id: d.uid,
    uid: d.uid,
    calendarId: d.calendarUid,
    calendarUid: d.calendarUid,
    serviceId: d.serviceUid,
    serviceUid: d.serviceUid,
    serviceName: (d as any).serviceName || (d as any).service?.name || "Service",
    userId: d.userUid,
    userUid: d.userUid,
    providerId: d.userUid,
    patientName: derivedCustomerName,
    customerName: derivedCustomerName,
    bookingDate: d.bookingDate,
    date: d.bookingDate,
    startTime: start,
    endTime: formatIsoTime(d.endTime, timeZone),
    time: start,
    status: d.status ? STATUS_MAP[d.status] ?? d.status : "Confirmed",
  };
}

export function useBookings(
  date: string,
  viewMode: "DAY" | "WEEK" | "MONTH" = "DAY",
  filterClauses: SearchFilterClause[] = [],
  schema: SearchSchema | null | undefined = null,
  options?: { enabled?: boolean }
) {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [bookings, setBookings] = useState<ReturnType<typeof toCalendarBooking>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;
  const inFlightRequestKeyRef = useRef<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    const { fromDate, toDate } = getBookingDateRange(date, viewMode);
    const payload = buildBookingSearchBody({
      date,
      viewMode,
      filterClauses,
      schema,
      page: 0,
      size: 500,
    });
    const requestKey = JSON.stringify(payload);

    if (inFlightRequestKeyRef.current === requestKey) {
      setLoading(false);
      return;
    }

    inFlightRequestKeyRef.current = requestKey;

    const sessionBookings = createdBookings.filter((booking) => {
      if (viewMode === "DAY") {
        return booking.bookingDate === date;
      }

      const bookingDate = booking.bookingDate ? new Date(booking.bookingDate) : new Date();
      return bookingDate >= new Date(fromDate) && bookingDate <= new Date(toDate);
    }) as never[];

    try {
      const data = await api.post<unknown>("/bookings/search", payload);
      const live = unwrapList<BookingDto>(data).map((booking) =>
        toCalendarBooking(booking, preference?.timezone)
      ) as never[];
      setBookings([...sessionBookings, ...live]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load bookings.");
      setBookings([...sessionBookings]);
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setLoading(false);
    }
  }, [api, date, enabled, filterClauses, preference?.timezone, schema, viewMode]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchBookings();
  }, [enabled, fetchBookings]);

  return { bookings, loading, error, refresh: fetchBookings };
}
