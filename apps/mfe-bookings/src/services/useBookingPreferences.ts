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
  confirmationEnabled?: boolean | null;
  reminderEnabled?: boolean | null;
  reminderOffsets?: string[] | null;
  cancellationEnabled?: boolean | null;
  notifyCustomer?: boolean | null;
  notifyProvider?: boolean | null;
  currency?: string | null;
  refundOnCancel?: boolean | null;
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
      const [pref, notif] = await Promise.all([
        api.get<BookingPreference>("/booking-preferences").catch(() => ({})),
        api.get<BookingPreference>("/booking-preferences/notifications").catch(() => ({})),
      ]);
      setPreference({ ...pref, ...notif });
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
      const [savedPref, savedNotif] = await Promise.all([
        api.put<BookingPreference>("/booking-preferences", value),
        api.put<BookingPreference>("/booking-preferences/notifications", {
          confirmationEnabled: value.confirmationEnabled ?? false,
          reminderEnabled: value.reminderEnabled ?? false,
          reminderOffsets: value.reminderOffsets ?? [],
          cancellationEnabled: value.cancellationEnabled ?? false,
        }),
      ]);
      const merged = { ...savedPref, ...savedNotif };
      setPreference(merged);
      showToast("Booking preferences saved", "success");
      return merged;
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
