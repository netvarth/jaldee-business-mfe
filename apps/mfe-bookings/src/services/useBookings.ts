import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { createdBookings } from "../data/sessionStore";
import { unwrapList } from "./response";
import { useBookingPreferences } from "./useBookingPreferences";
import { formatIsoTime } from "../utils/dateTime";

/** Raw booking row from POST /bookings/search (BookingDto). */
interface BookingDto {
  uid?: string;
  calendarUid?: string;
  serviceUid?: string;
  userUid?: string;
  customerName?: string;
  bookingDate?: string;
  startTime?: string; // ISO OffsetDateTime
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
};

/** Map a live BookingDto into the shape the calendar grid expects (mock-compatible). */
function toCalendarBooking(d: BookingDto, timeZone?: string | null) {
  const start = formatIsoTime(d.startTime, timeZone);
  return {
    id: d.uid,
    uid: d.uid,
    calendarId: d.calendarUid,
    calendarUid: d.calendarUid,
    serviceId: d.serviceUid,
    serviceUid: d.serviceUid,
    userId: d.userUid,
    userUid: d.userUid,
    providerId: d.userUid,
    patientName: d.customerName,
    customerName: d.customerName,
    startTime: start,
    endTime: formatIsoTime(d.endTime, timeZone),
    time: start,
    status: d.status ? STATUS_MAP[d.status] ?? d.status : "Confirmed",
  };
}

export function useBookings(date: string) {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [bookings, setBookings] = useState<ReturnType<typeof toCalendarBooking>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Bookings created in this session are real user actions — always shown.
    const sessionForDate = createdBookings.filter((b) => b.bookingDate === date) as never[];
    try {
      const data = await api.post<unknown>(
        "/bookings/search",
        { date },
        { params: { page: 0, size: 100 } },
      );
      const live = unwrapList<BookingDto>(data).map((booking) => toCalendarBooking(booking, preference?.timezone)) as never[];
      setBookings([...sessionForDate, ...live]);
    } catch (e) {
      // No sample/mock fallback — surface the failure and show only real
      // (session) data so empty/error states are never masked by fake bookings.
      setError(e instanceof Error ? e.message : "Failed to load bookings.");
      setBookings([...sessionForDate]);
    } finally {
      setLoading(false);
    }
  }, [api, date, preference?.timezone]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refresh: fetchBookings };
}
