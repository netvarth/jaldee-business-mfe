import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useBookingPreferences } from "./useBookingPreferences";
import { buildOffsetDateTime } from "../utils/dateTime";
import type { BookingChannel } from "../types";

function channelToApi(channel: BookingChannel): string {
  if (channel === "Walk-in") return "WALK_IN";
  if (channel === "Phone-in") return "PHONE_IN";
  if (channel === "IVR") return "IVR";
  return "ONLINE";
}

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface SeriesBookingInput {
  customerId: string;
  serviceUid: string;
  scheduleUid: string;
  providerUid: string;
  channel: BookingChannel;
  /** Time-of-day for every occurrence, e.g. "09:00" / "09:00:00". */
  startTime: string;
  endTime: string;
  /** First occurrence date, ISO yyyy-mm-dd. */
  startDate: string;
  frequency: RecurrenceFrequency;
  interval: number;
  /** Inclusive end date, ISO yyyy-mm-dd. */
  until: string;
}

/** One occurrence outcome mirrored from the backend SeriesOccurrenceResult. */
export interface SeriesOccurrenceResult {
  date?: string;
  created?: boolean;
  reason?: string;
  booking?: unknown;
}

export interface SeriesBookingResult {
  seriesUid?: string;
  results: SeriesOccurrenceResult[];
}

/** Hard cap so a bad "until" can never generate an unbounded request. */
const MAX_OCCURRENCES = 60;

/**
 * Expand a recurrence rule into concrete occurrence dates (inclusive of the
 * start date, up to and including `until`), stepping by frequency × interval.
 */
export function generateOccurrenceDates(
  startISO: string,
  frequency: RecurrenceFrequency,
  interval: number,
  untilISO: string,
): Date[] {
  const start = new Date(`${startISO}T00:00:00`);
  const until = new Date(`${untilISO}T00:00:00`);
  const step = Math.max(1, Math.floor(interval) || 1);
  const dates: Date[] = [];
  if (isNaN(start.getTime()) || isNaN(until.getTime()) || until < start) return dates;

  const cursor = new Date(start);
  while (cursor <= until && dates.length < MAX_OCCURRENCES) {
    dates.push(new Date(cursor));
    if (frequency === "DAILY") cursor.setDate(cursor.getDate() + step);
    else if (frequency === "WEEKLY") cursor.setDate(cursor.getDate() + 7 * step);
    else cursor.setMonth(cursor.getMonth() + step); // MONTHLY
  }
  return dates;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useCreateSeriesBooking() {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Create a recurring booking series. Returns the per-occurrence results so the
   * caller can report partial success (some slots may be unavailable). Throws on
   * a hard request failure so the caller never reports a false success.
   */
  const createSeries = async (input: SeriesBookingInput): Promise<SeriesBookingResult> => {
    const dates = generateOccurrenceDates(input.startDate, input.frequency, input.interval, input.until);
    if (dates.length === 0) {
      throw new Error("The repeat-until date must be on or after the first appointment date.");
    }

    const occurrences = dates.map((d) => ({
      scheduleUid: input.scheduleUid,
      userUid: input.providerUid,
      slotDateTime: buildOffsetDateTime(iso(d), input.startTime, preference?.timezone),
      slotEndDateTime: buildOffsetDateTime(iso(d), input.endTime, preference?.timezone),
    }));

    const payload = {
      customerId: input.customerId,
      serviceUid: input.serviceUid,
      bookingChannel: channelToApi(input.channel),
      occurrences,
    };

    setSubmitting(true);
    try {
      const res = await api.post<SeriesBookingResult>("/bookings/series", payload);
      return { seriesUid: res?.seriesUid, results: res?.results ?? [] };
    } finally {
      setSubmitting(false);
    }
  };

  return { createSeries, submitting };
}
