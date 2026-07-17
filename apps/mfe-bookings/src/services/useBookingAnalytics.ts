import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

export type Period = "today" | "week" | "month";

export interface BookingDto {
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
  bookingChannel?: string;
  amount?: number;
  totalAmount?: number;
  price?: number;
}

export interface Analytics {
  total: number;
  confirmed: number;
  completed: number;
  pending: number;
  cancelled: number;
  online: number;
  walkin: number;
  revenue: number;
  live: boolean;     // true when numbers came from the backend
  loading: boolean;
  rawBookings: BookingDto[]; // Export raw bookings for dashboard widgets
}

function bucket(status: string): "confirmed" | "completed" | "pending" | "cancelled" {
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("no_show") || s.includes("no-show")) return "cancelled";
  if (s.includes("complet")) return "completed";
  if (s.includes("request") || s.includes("waiting") || s.includes("pending")) return "pending";
  return "confirmed"; // CONFIRMED / CHECKED_IN / IN_PROGRESS
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeFor(period: Period): { from: string; to: string } {
  const today = new Date();
  if (period === "today") return { from: isoDate(today), to: isoDate(today) };
  if (period === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { from: isoDate(start), to: isoDate(today) };
  }
  // "All Time" — a wide window
  const start = new Date(today);
  start.setMonth(today.getMonth() - 12);
  const end = new Date(today);
  end.setMonth(today.getMonth() + 1);
  return { from: isoDate(start), to: isoDate(end) };
}

function compute(bks: BookingDto[], live: boolean, loading: boolean): Analytics {
  let confirmed = 0, completed = 0, pending = 0, cancelled = 0, online = 0, walkin = 0;
  let revenue = 0;
  bks.forEach((b) => {
    const k = bucket(b.status ?? "");
    if (k === "confirmed") confirmed++;
    else if (k === "completed") completed++;
    else if (k === "pending") pending++;
    else cancelled++;
    const ch = (b.bookingChannel ?? "").toUpperCase();
    if (ch.includes("WALK")) walkin++;
    else online++;
    if (k !== "cancelled") {
      revenue += Number(b.totalAmount ?? b.amount ?? b.price ?? 0);
    }
  });
  const total = bks.length;
  return {
    total, confirmed, completed, pending, cancelled,
    online, walkin,
    revenue,
    live, loading,
    rawBookings: bks,
  };
}

/** Live booking analytics for the dashboard, computed from POST /bookings/search. */
export function useBookingAnalytics(period: Period): Analytics {
  const api = useBookingApi();
  // Start from zeros (loading) — never seed the dashboard with sample numbers.
  const [data, setData] = useState<Analytics>(() => compute([], false, true));

  const load = useCallback(async () => {
    const { from, to } = rangeFor(period);
    try {
      const response = await api.post<unknown>(
        "/bookings/search",
        { from, to, page: 0, size: 100 },
        { _skipLocationParam: true },
      );
      const bks = unwrapList<BookingDto>(response);
      // `live` reflects whether real data came back; no mock fallback.
      setData(compute(bks, true, false));
    } catch {
      // No live backend — show zeros (live=false), not sample data.
      setData(compute([], false, false));
    }
  }, [api, period]);

  useEffect(() => {
    setData((d) => ({ ...d, loading: true }));
    load();
  }, [load]);

  return data;
}
