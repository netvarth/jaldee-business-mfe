import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";

export type Period = "today" | "week" | "month";

interface BookingDto {
  status?: string;
  bookingChannel?: string;
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
}

export const AVG_PRICE = 500;

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
  bks.forEach((b) => {
    const k = bucket(b.status ?? "");
    if (k === "confirmed") confirmed++;
    else if (k === "completed") completed++;
    else if (k === "pending") pending++;
    else cancelled++;
    const ch = (b.bookingChannel ?? "").toUpperCase();
    if (ch.includes("WALK")) walkin++;
    else online++;
  });
  const total = bks.length;
  return {
    total, confirmed, completed, pending, cancelled,
    online, walkin,
    revenue: (total - cancelled) * AVG_PRICE,
    live, loading,
  };
}

/** Live booking analytics for the dashboard, computed from GET /bookings/range. */
export function useBookingAnalytics(period: Period): Analytics {
  const api = useBookingApi();
  // Start from zeros (loading) — never seed the dashboard with sample numbers.
  const [data, setData] = useState<Analytics>(() => compute([], false, true));

  const load = useCallback(async () => {
    const { from, to } = rangeFor(period);
    try {
      const bks = await api.get<BookingDto[]>(`/bookings/range?from=${from}&to=${to}`);
      // `live` reflects whether real data came back; no mock fallback.
      setData(compute(bks ?? [], Boolean(bks && bks.length), false));
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
