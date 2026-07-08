import type { ServiceItem } from "../types";

/**
 * In-session store for records created during this browser session, so they
 * survive route navigation even when the backend isn't persisting (offline/dev).
 */
export const createdServices: ServiceItem[] = [];

export function addCreatedService(s: ServiceItem) {
  createdServices.unshift(s);
}

/** Appointments created this session, keyed in calendar-grid shape, by date (YYYY-MM-DD). */
export const createdBookings: Array<Record<string, unknown> & { bookingDate?: string }> = [];

export function addCreatedBooking(b: Record<string, unknown> & { bookingDate?: string }) {
  createdBookings.unshift(b);
}

export interface BookingUser {
  userUid: string;
  title?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  status: "Active" | "Inactive";
  hasLogin: boolean; // true when connected to base CRM (provisioned login)
}

export const createdUsers: BookingUser[] = [];

export function addCreatedUser(u: BookingUser) {
  createdUsers.unshift(u);
}
