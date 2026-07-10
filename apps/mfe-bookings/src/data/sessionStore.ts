import type { ServiceGroupItem, ServiceItem } from "../types";

/**
 * In-session store for records created during this browser session, so they
 * survive route navigation even when the backend isn't persisting (offline/dev).
 */
export const createdServices: ServiceItem[] = [];

export function addCreatedService(s: ServiceItem) {
  createdServices.unshift(s);
}

export const createdServiceGroups: ServiceGroupItem[] = [];

export function addCreatedServiceGroup(group: ServiceGroupItem) {
  createdServiceGroups.unshift(group);
}

export function updateCreatedServiceGroup(updatedGroup: ServiceGroupItem) {
  const index = createdServiceGroups.findIndex((group) => group.id === updatedGroup.id);
  if (index >= 0) {
    createdServiceGroups[index] = updatedGroup;
  } else {
    createdServiceGroups.unshift(updatedGroup);
  }
}

export function removeCreatedServiceGroup(groupId: string) {
  const index = createdServiceGroups.findIndex((group) => group.id === groupId);
  if (index >= 0) {
    createdServiceGroups.splice(index, 1);
  }
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
