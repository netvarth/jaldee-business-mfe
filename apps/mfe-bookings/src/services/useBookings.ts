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
  UNBLOCKED: "Unblocked",
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
    bookingDate: d.bookingDate,
    date: d.bookingDate,
    startTime: start,
    endTime: formatIsoTime(d.endTime, timeZone),
    time: start,
    status: d.status ? STATUS_MAP[d.status] ?? d.status : "Confirmed",
  };
}

export function useBookings(date: string, viewMode: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [bookings, setBookings] = useState<ReturnType<typeof toCalendarBooking>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Calculate date range based on viewMode
    const currentDate = new Date(date);
    let fromDate = new Date(currentDate);
    let toDate = new Date(currentDate);

    if (viewMode === 'WEEK') {
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        fromDate = new Date(currentDate.setDate(diff));
        toDate = new Date(fromDate);
        toDate.setDate(fromDate.getDate() + 6);
    } else if (viewMode === 'MONTH') {
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        toDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    // For now, if viewMode is DAY, we might just pass `date` to match the old API, 
    // but typically `fromDate` and `toDate` or `startDate` and `endDate` are supported.
    // Let's pass `fromDate` and `toDate` to the payload.
    const payload: any = viewMode === 'DAY' ? { date } : { fromDate: fromDateStr, toDate: toDateStr };

    // Bookings created in this session are real user actions — always shown.
    const sessionBookings = createdBookings.filter((b) => {
        if (viewMode === 'DAY') return b.bookingDate === date;
        const bDate = b.bookingDate ? new Date(b.bookingDate) : new Date();
        return bDate >= fromDate && bDate <= toDate;
    }) as never[];

    try {
      const data = await api.post<unknown>(
        "/bookings/search",
        payload,
        { params: { page: 0, size: 500 } }, // increase size for week/month
      );
      const live = unwrapList<BookingDto>(data).map((booking) => toCalendarBooking(booking, preference?.timezone)) as never[];
      setBookings([...sessionBookings, ...live]);
    } catch (e) {
      // No sample/mock fallback — surface the failure and show only real
      // (session) data so empty/error states are never masked by fake bookings.
      setError(e instanceof Error ? e.message : "Failed to load bookings.");
      setBookings([...sessionBookings]);
    } finally {
      setLoading(false);
    }
  }, [api, date, viewMode, preference?.timezone]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refresh: fetchBookings };
}
