import { useState } from "react";
import { useBookingApi } from "./useBookingApi";
import type { InstantAvailabilitySlot } from "../types";

function parseSlots(payload: unknown): InstantAvailabilitySlot[] {
  if (Array.isArray(payload)) {
    return payload as InstantAvailabilitySlot[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of ["slots", "items", "results", "content", "data"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as InstantAvailabilitySlot[];
    }
    if (candidate && typeof candidate === "object") {
      const nested = parseSlots(candidate);
      if (nested.length) {
        return nested;
      }
    }
  }

  return [];
}

interface InstantAvailabilityQuery {
  serviceUid: string;
  providerUid?: string;
  date?: string;
}

export function useInstantAvailability() {
  const api = useBookingApi();
  const [slots, setSlots] = useState<InstantAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async ({ serviceUid, providerUid, date }: InstantAvailabilityQuery) => {
    if (!serviceUid) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ serviceUid });
      if (providerUid) params.append("providerUid", providerUid);
      if (date) params.append("date", date);
      const response = await api.get<unknown>(`/bookings/instant-availability?${params.toString()}`);
      setSlots(parseSlots(response));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch instant availability.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  return { slots, loading, error, search };
}
