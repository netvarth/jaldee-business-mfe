import { useState, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type {
  BookingDetails,
  TimelineEvent,
  AllowedAction,
} from "../types";
import { unwrapList } from "./response";

export interface ActionExtra {
  reason?: string;
  notes?: string;
  newDate?: string;
  newStartTime?: string; // ISO OffsetDateTime
  newEndTime?: string;
  cancelSeries?: boolean;
  rescheduleSeries?: boolean;
}

/** Payment modes accepted by feature-finance (mirrors shared PaymentMode enum). */
export const PAYMENT_MODES = [
  "Cash", "CC", "DC", "UPI", "NB", "BANK_TRANSFER", "WALLET", "Other",
] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** Finance summary for a booking (backend InvoiceAdapterDto). */
export interface BookingFinance {
  uid?: string;
  bookingUid?: string;
  invoiceNumber?: string;
  amountDue?: number;
  amountPaid?: number;
  paymentStatus?: string;
}

/** A single payment record (subset of shared PaymentResponseDto). */
export interface PaymentRecord {
  uid?: string;
  amount?: number;
  currency?: string;
  mode?: string;
  acceptedBy?: string;
  paymentOn?: string;
  receiptNum?: string;
  paymentRefId?: string;
  note?: Array<{ note?: string } | string> | string;
}

export interface PayInput {
  amount: number;
  mode?: PaymentMode;
  transactionId?: string;
  note?: string;
  paymentOn?: string; // ISO OffsetDateTime; defaults to now server-side
}

export function paymentNoteText(n: PaymentRecord["note"]): string {
  if (!n) return "";
  if (typeof n === "string") return n;
  return n
    .map((x) => (typeof x === "string" ? x : x?.note ?? ""))
    .filter(Boolean)
    .join(" · ");
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
      return {
        path: `/bookings/${uid}/cancel`,
        body: {
          cancelReason: extra?.reason ?? "",
          cancelledBy: "staff",
          cancelSeries: Boolean(extra?.cancelSeries),
        },
      };
    case "NO_SHOW":
      return { path: `/bookings/${uid}/no-show`, body: {} };
    case "RESCHEDULE":
      return {
        path: `/bookings/${uid}/reschedule`,
        body: {
          newDate: extra?.newDate,
          newStartTime: extra?.newStartTime,
          newEndTime: extra?.newEndTime,
          notifyPatient: false,
          rescheduleSeries: Boolean(extra?.rescheduleSeries),
        },
      };
    case "CREATE_INVOICE":
      // Finance controller is mounted at /finance/{uid}/finance (NOT /bookings).
      return { path: `/finance/${uid}/finance`, body: {} };
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
  const [finance, setFinance] = useState<BookingFinance | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paying, setPaying] = useState(false);

  const refreshFinance = useCallback(
    async (uid: string) => {
      // Finance summary is optional (no invoice yet ⇒ 404). Payment history is
      // best-effort so a missing endpoint never blocks the details panel.
      try {
        const f = await api.get<BookingFinance>(`/finance/${uid}/finance`);
        setFinance(f ?? null);
      } catch {
        setFinance(null);
      }
      try {
        const history = await api.get<unknown>(`/finance/${uid}/payment/history`);
        setPayments(unwrapList<PaymentRecord>(history));
      } catch {
        setPayments([]);
      }
    },
    [api]
  );

  const refreshTimeline = useCallback(
    async (uid: string) => {
      try {
        const response = await api.get<unknown>(`/bookings/${uid}/timeline`);
        setTimeline(unwrapList<TimelineEvent>(response));
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
        await Promise.all([refreshTimeline(id), refreshFinance(id)]);
      } catch (e) {
        // No sample fallback — clear details and surface the error so the UI
        // shows an error state instead of a fabricated booking.
        setError(e instanceof Error ? e.message : "Failed to load booking details.");
        setDetails(null);
        setTimeline([]);
        setFinance(null);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [api, refreshTimeline, refreshFinance]
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

  /** Create the finance invoice for the current booking (idempotent server-side). */
  const createInvoice = useCallback(async () => {
    if (!details) return;
    setPaying(true);
    try {
      await api.post(`/finance/${details.uid}/finance`, {});
      await Promise.all([load(details.uid), refreshFinance(details.uid)]);
    } finally {
      setPaying(false);
    }
  }, [api, details, load, refreshFinance]);

  /**
   * Record an offline payment against the booking. Cash goes through the
   * dedicated cash endpoint (server defaults mode/acceptedBy); any other mode
   * uses the generic offline-pay endpoint.
   */
  const recordPayment = useCallback(
    async (input: PayInput) => {
      if (!details) return;
      const isCash = !input.mode || input.mode === "Cash";
      const path = isCash
        ? `/finance/${details.uid}/pay/cash`
        : `/finance/${details.uid}/pay`;
      const body = {
        amount: input.amount,
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.transactionId ? { transactionId: input.transactionId } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.paymentOn ? { paymentOn: input.paymentOn } : {}),
      };
      setPaying(true);
      try {
        await api.post(path, body);
        await Promise.all([refreshFinance(details.uid), refreshTimeline(details.uid)]);
      } finally {
        setPaying(false);
      }
    },
    [api, details, refreshFinance, refreshTimeline]
  );

  return {
    details, timeline, loading, acting, error,
    finance, payments, paying,
    load, act, createInvoice, recordPayment,
  };
}
