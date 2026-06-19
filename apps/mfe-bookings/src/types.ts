export type Role = "ADMIN" | "MANAGER" | "ASSISTANT";

/** UI-facing staff/provider card model (matches the calendar mock data). */
export interface StaffUser {
  id: string;
  name: string;
  code: string;
  role: Role;
  status: "online" | "offline" | "leave";
  color: string; // tailwind classes e.g. "bg-emerald-100 text-emerald-700"
  title: string;
}

export interface ServiceCard {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface BookingCard {
  id: string;
  patientName: string;
  time: string;
  status: string;
  serviceId: string;
  providerId: string;
}

// ─── API domain models ────────────────────────────────

export interface Calendar {
  uid: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  locationName?: string;
  services?: string[];
  users?: string[];
  bookingChannels?: string[];
  capacityOverride?: number | null;
  tags?: string[];
}

export interface CalendarSettingsRequest {
  color?: string | null;
  users?: string[];
  bookingChannels?: string[];
  capacityOverride?: number | null;
  tags?: string[];
}

export interface Schedule {
  uid: string;
  name: string;
  description: string;
  calendarUid: string;
  calendarName: string;
  startDate: string;
  endDate: string | null;
  slotCapacity: number;
  qrLinkRequired: boolean;
}

export interface Provider {
  uid: string;
  name: string;
  status: "online" | "offline" | "leave";
  type: string;
  capacity?: number;
}

export interface TimeWindow {
  uid: string;
  calendarUid: string;
  scheduleUid: string;
  weekDays: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  slotCapacity: number;
  channel: string;
  qrLinkRequired: boolean;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  labels: string[];
  visits: number;
  avatarColor?: string;
  status?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  department: string;
  description?: string;
  duration: number; // minutes
  price: number;
  status: "Active" | "Inactive";
  serviceType?: string;
  labels?: string[];
}

export type BookingStatus =
  | "REQUESTED" | "CONFIRMED" | "CHECKED_IN" | "WAITING"
  | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";

export type AllowedAction =
  | "CONFIRM" | "CHECK_IN" | "MOVE_TO_WAITING" | "START" | "COMPLETE"
  | "CANCEL" | "NO_SHOW" | "RESCHEDULE" | "EDIT" | "CREATE_INVOICE"
  | "VIEW_SUMMARY" | "VIEW_INVOICE" | "CREATE_FOLLOWUP";

export interface BookingDetails {
  uid: string;
  encId?: string;
  status: BookingStatus;
  bookingType?: string;
  bookingChannel?: string;
  bookingMode?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  serviceUid?: string;
  serviceName?: string;
  userUid?: string;
  userName?: string;
  calendarUid?: string;
  calendarName?: string;
  locationName?: string;
  customerId?: string;
  customerName?: string;
  customerReferenceNumber?: string;
  consumerNotes?: string[];
  userNotes?: string[];
  label?: string[];
  isInvoiceCreated?: boolean;
  allowedActions: AllowedAction[];
}

export interface TimelineEvent {
  eventType: string;
  eventLabel: string;
  previousStatus?: string;
  newStatus?: string;
  actor?: string;
  sourceChannel?: string;
  remarks?: string;
  occurredAt?: string;
  relatedRecordId?: string;
}

export interface Slot {
  startTime: string; // "HH:mm:ss" or "HH:mm"
  endTime: string;
  availableCount?: number;
  isAvailable?: boolean;
}

export type BookingChannel = "Online" | "Walk-in" | "Phone-in";

export interface CreateBookingInput {
  calendarUid: string;
  serviceUid: string;
  providerUid: string;
  scheduleUid: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  patientName: string;
  phone: string;
  email?: string;
  channel: BookingChannel;
  notes?: string;
}

export interface TimeWindowDetails {
  uid: string;
  timeWindowUid: string;
  scheduleUid: string;
  userUid: string;
  userName: string;
  serviceUid: string;
  serviceName: string;
  servicePrice: number;
  currencyCode: string;
}
