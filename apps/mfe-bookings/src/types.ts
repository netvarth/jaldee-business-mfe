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
  status: CalendarStatus;
  locationId?: number;
  color?: string;
  locationName?: string;
  services?: string[];
  users?: string[];
  channel?: string;
  label?: string[];
  qrLinkRequired?: boolean;
  feature?: string;
  bookingChannels?: string[];
  capacityOverride?: number | null;
  tags?: string[];
  scheduleCount?: number;
  timeWindowCount?: number;
}

export interface CalendarSettingsRequest {
  color?: string | null;
  users?: string[];
  bookingChannels?: string[];
  capacityOverride?: number | null;
  tags?: string[];
  status?: CalendarStatus;
}

export type CalendarStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

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
  timeWindows?: TimeWindow[];
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
  calendarName?: string;
  scheduleUid: string;
  scheduleName?: string;
  weekDays: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  slotCapacity: number;
  channel: string;
  label?: string[];
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

export interface CustomerSearchResult {
  uid: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  status?: string;
  lastVisitDate?: string;
  totalBookings?: number;
  createdAt?: string;
  exactMatch?: boolean;
}

export interface BookingCustomerDetails {
  uid?: string;
  firstName?: string;
  lastName?: string;
  primaryNumber?: string;
  email?: string;
  gender?: string;
  dob?: string;
}

export interface ServiceItem {
  id: string;
  uid?: string;
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
  | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED" | "UNBLOCKED";

export type AllowedAction =
  | "CONFIRM" | "CHECK_IN" | "MOVE_TO_WAITING" | "START" | "COMPLETE"
  | "CANCEL" | "NO_SHOW" | "RESCHEDULE" | "EDIT" | "CREATE_INVOICE"
  | "VIEW_SUMMARY" | "VIEW_INVOICE" | "CREATE_FOLLOWUP";

export interface BookingDetails {
  uid: string;
  encId?: string;
  status: BookingStatus;
  seriesUid?: string | null;
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

export type BookingChannel = "Online" | "Walk-in" | "Phone-in" | "IVR";

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
  customerDetails?: BookingCustomerDetails;
  recurringRule?: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    until: string;
  };
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

export interface ServiceGroupItem {
  id: string;
  name: string;
  description?: string;
  serviceIds: string[];
  priceMode: "sum" | "fixed";
  price?: number;
  durationMode: "sum" | "override";
  duration?: number;
  status: "Active" | "Inactive";
}

export interface InstantAvailabilitySlot {
  startTime: string;
  endTime: string;
  providerUid?: string;
  providerName?: string;
  serviceUid?: string;
  serviceName?: string;
  availableCount?: number;
}
