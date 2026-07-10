import { useCallback, useEffect, useState } from "react";
import { useBookingApi } from "./useBookingApi";
import { useToast } from "../contexts/ToastContext";

export interface BookingPreference {
  uid?: string;
  defaultSlotDuration?: number | null;
  leadTimeMinutes?: number | null;
  bookingWindowDays?: number | null;
  bufferTimeMinutes?: number | null;
  minAdvanceMinutes?: number | null;
  maxAdvanceDays?: number | null;
  cancellationPolicy?: string | null;
  timezone?: string | null;
  brandColor?: string | null;
  depositRequired?: boolean | null;
  intakeFields?: Record<string, unknown> | null;
}

export function useBookingPreferences() {
  const api = useBookingApi();
  const { showToast } = useToast();
  const [preference, setPreference] = useState<BookingPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPreference((await api.get<BookingPreference>("/booking-preferences")) ?? {});
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Failed to load booking preferences.";
      setError(message);
      setPreference(null);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  const savePreference = async (value: BookingPreference) => {
    setSaving(true);
    try {
      const saved = await api.put<BookingPreference>("/booking-preferences", value);
      setPreference(saved ?? value);
      showToast("Booking preferences saved", "success");
      return saved;
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Failed to save booking preferences.";
      showToast(message, "error");
      throw cause;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { preference, loading, saving, error, savePreference, refresh };
}
