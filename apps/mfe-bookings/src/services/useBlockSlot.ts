import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useBookingPreferences } from "./useBookingPreferences";
import { buildOffsetDateTime } from "../utils/dateTime";

export interface BlockSlotInput {
  scheduleUid: string;
  serviceUid?: string;
  providerUid?: string;
  /** ISO yyyy-mm-dd */
  date: string;
  /** "HH:mm" / "HH:mm:ss" */
  startTime: string;
  endTime: string;
  notes?: string;
}

/**
 * Block / unblock a slot on a provider's schedule. A block is stored as a
 * BLOCKED booking; unblocking flips it to UNBLOCKED, freeing the slot.
 */
export function useBlockSlot() {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [submitting, setSubmitting] = useState(false);

  const blockSlot = async (input: BlockSlotInput): Promise<boolean> => {
    const payload = {
      scheduleUid: input.scheduleUid,
      serviceUid: input.serviceUid || undefined,
      userUid: input.providerUid || undefined,
      slotDateTime: buildOffsetDateTime(input.date, input.startTime, preference?.timezone),
      slotEndDateTime: buildOffsetDateTime(input.date, input.endTime, preference?.timezone),
      notes: input.notes || undefined,
    };
    setSubmitting(true);
    try {
      await api.post("/bookings/block", payload);
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const unblockSlot = async (uid: string): Promise<boolean> => {
    setSubmitting(true);
    try {
      await api.put(`/bookings/${uid}/unblock`, {});
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  return { blockSlot, unblockSlot, submitting };
}
