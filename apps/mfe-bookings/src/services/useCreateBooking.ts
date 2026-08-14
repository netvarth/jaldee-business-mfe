import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { CreateBookingInput, BookingChannel, BookingCustomerDetails } from "../types";
import { useBookingPreferences } from "./useBookingPreferences";
import { buildOffsetDateTime } from "../utils/dateTime";

function channelToApi(channel: BookingChannel): string {
  if (channel === "Walk-in") return "WALK_IN";
  if (channel === "Phone-in") return "PHONE_IN";
  if (channel === "IVR") return "IVR";
  return "ONLINE";
}

function toPhoneNumber(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/[^\d+]/g, "");
  if (!normalized) return undefined;

  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);
    const countryCodeLength = digits.length > 10 ? Math.min(3, digits.length - 10) : 2;
    return {
      countryCode: `+${digits.slice(0, countryCodeLength) || "91"}`,
      number: digits.slice(countryCodeLength) || digits,
    };
  }

  return {
    countryCode: "+91",
    number: normalized,
  };
}

function compactCustomerDetails(customerDetails: BookingCustomerDetails) {
  return Object.fromEntries(
    Object.entries(customerDetails).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export function useCreateBooking() {
  const api = useBookingApi();
  const { preference } = useBookingPreferences();
  const [submitting, setSubmitting] = useState(false);

  /** Returns { success: boolean, uid?: string } upon completion (live or local fallback). */
  const createBooking = async (input: CreateBookingInput): Promise<{ success: boolean; uid?: string }> => {
    setSubmitting(true);
    const [firstName, ...rest] = (input.patientName || "Walk-in").trim().split(" ");
    const payload = {
      serviceUid: input.serviceUid,
      userUid: input.providerUid,
      scheduleUid: input.scheduleUid,
      slotDateTime: buildOffsetDateTime(input.date, input.startTime, preference?.timezone),
      slotEndDateTime: buildOffsetDateTime(input.date, input.endTime, preference?.timezone),
      bookingChannel: channelToApi(input.channel),
      notes: input.notes ?? "",
      customerDetails: input.customerDetails
        ? compactCustomerDetails(input.customerDetails)
        : {
            firstName: firstName || "Walk-in",
            lastName: rest.join(" ") || "Patient",
            phoneNumber: toPhoneNumber(input.phone),
            email: input.email ?? "",
          },
      ...(input.status && { status: input.status }),
      ...(input.recurringRule && { recurringRule: input.recurringRule }),
      ...(input.attachments && input.attachments.length > 0 && { attachments: input.attachments }),
    };
    try {
      const response = await api.post("/bookings", payload);
      // Try to extract uid from the response
      const uid = (response?.data as any)?.uid || (response as any)?.uid || undefined;
      return { success: true, uid };
    } finally {
      setSubmitting(false);
    }
  };

  const validateBooking = async (input: CreateBookingInput): Promise<{ valid: boolean; errors?: string[] }> => {
    try {
      const payload = {
        calendarUid: input.calendarUid,
        serviceUid: input.serviceUid,
        userUid: input.providerUid,
        bookingDate: input.date,
        startTime: input.startTime
      };
      
      const response = await api.post<any>("/bookings/validate", payload) as any;
      
      if (response && response.valid === false) {
         return { valid: false, errors: response.errors || ["Validation failed"] };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, errors: [e.message || "Validation failed"] };
    }
  };

  return { createBooking, validateBooking, submitting };
}
