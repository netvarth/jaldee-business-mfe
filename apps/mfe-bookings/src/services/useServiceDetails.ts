import { useCallback, useState } from "react";
import { createdServices } from "../data/sessionStore";
import type { PhoneInputValue } from "@jaldee/design-system";
import { useBookingApi } from "./useBookingApi";
import type { SchemaField } from "./useCreateService";
import type { ServiceItem } from "../types";

export interface ServiceFormPrefill {
  name: string;
  displayOrder: number;
  description: string;
  serviceContext: "General Service" | "Inpatient Service";
  serviceType: "Onsite Service" | "Teleservice";
  apptType: "Booking" | "Request";
  requestType?: "With Date & Time" | "With Date Only" | "No Date & Time";
  serviceCategory: "Main Service" | "Sub Service";
  teleServiceMode?: "Video Mode" | "Audio Mode";
  teleServicePlatform?: "Zoom" | "Google Meet" | "Jaldee Video" | "WhatsApp" | "Phone";
  meetingLink: string;
  phoneValue: PhoneInputValue;
  durHrs: number;
  durMins: number;
  numResources: number;
  maxBookings: number;
  showDuration: boolean;
  leadDays: number;
  leadHrs: number;
  leadMins: number;
  safeSlots: boolean;
  assignUsers: boolean;
  hasPricing: boolean;
  price: number;
  taxApplicable: boolean;
  hsnCode: string;
  preServiceSchema: SchemaField[];
  postServiceSchema: SchemaField[];
  currencyCode: string;
  practitionerOverrides: Record<string, { enabled: boolean; price: number }>;
}

export interface ServiceDetailsRecord {
  id: string;
  uid?: string;
  name: string;
  description: string;
  status: string;
  serviceCode?: string;
  serviceCategory?: string;
  serviceType?: string;
  appointmentType?: string;
  requestType?: string;
  durationMinutes?: number;
  displayOrder?: number;
  color?: string;
  consultationType?: string;
  bookingEnabled?: boolean;
  onlineBooking?: boolean;
  leadTime?: string;
  slotDuration?: number;
  maxBookings?: number;
  visibilityRules?: string[];
  price?: number;
  taxApplicable?: boolean;
  hsnCode?: string;
  currencyCode?: string;
  assignedProviders?: string[];
  labels?: string[];
  tags?: string[];
  teleService?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

const EMPTY_PHONE: PhoneInputValue = { countryCode: "+91", number: "", e164Number: "" };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "enabled", "active"].includes(normalized)) return true;
    if (["false", "no", "disabled", "inactive"].includes(normalized)) return false;
  }
  return fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        for (const key of ["displayName", "name", "label", "title", "value", "uid", "id"]) {
          if (typeof record[key] === "string" && record[key]) return record[key] as string;
        }
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeSchemaFields(value: unknown): SchemaField[] {
  if (Array.isArray(value)) {
    return value as SchemaField[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([fallbackKey, item], index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const rawOptions = Array.isArray(record.options)
      ? record.options.filter((option): option is string => typeof option === "string")
      : undefined;

    return [{
      id: asString(record.id) || `field-${index + 1}`,
      name: asString(record.name) || fallbackKey,
      label: asString(record.label) || fallbackKey,
      type: asString(record.type) || "string",
      required: toBoolean(record.required),
      ...(rawOptions?.length ? { options: rawOptions } : {}),
    }];
  });
}

function normalizeStatus(value: unknown) {
  const normalized = asString(value).toUpperCase();
  if (!normalized) return "Active";
  if (normalized === "DISABLED" || normalized === "INACTIVE") return "Inactive";
  return "Active";
}

function toUiServiceType(value: unknown): ServiceFormPrefill["serviceType"] {
  return asString(value).toUpperCase().includes("TELE") ? "Teleservice" : "Onsite Service";
}

function toUiApptType(value: unknown): ServiceFormPrefill["apptType"] {
  return asString(value).toUpperCase() === "REQUEST" ? "Request" : "Booking";
}

function toUiRequestType(value: unknown): ServiceFormPrefill["requestType"] {
  const normalized = asString(value).toUpperCase();
  if (normalized === "DATE_TIME") return "With Date & Time";
  if (normalized === "DATE_ONLY") return "With Date Only";
  if (normalized === "NONE") return "No Date & Time";
  return undefined;
}

function toUiTeleMode(value: unknown): ServiceFormPrefill["teleServiceMode"] {
  const normalized = asString(value).toUpperCase();
  if (normalized === "VIDEO") return "Video Mode";
  if (normalized === "AUDIO") return "Audio Mode";
  return undefined;
}

function toUiTelePlatform(value: unknown): ServiceFormPrefill["teleServicePlatform"] {
  const normalized = asString(value).toUpperCase();
  if (normalized === "ZOOM") return "Zoom";
  if (normalized === "GOOGLE_MEET") return "Google Meet";
  if (normalized === "JALDEE_VIDEO") return "Jaldee Video";
  if (normalized === "WHATSAPP") return "WhatsApp";
  if (normalized === "PHONE") return "Phone";
  return undefined;
}

function toDurationParts(totalMinutes: number) {
  return {
    durHrs: Math.floor(totalMinutes / 60),
    durMins: totalMinutes % 60,
  };
}

function toPhoneValue(value: unknown): PhoneInputValue {
  const raw = asString(value).trim();
  if (!raw) return EMPTY_PHONE;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return EMPTY_PHONE;
  if (digits.startsWith("+")) {
    const stripped = digits.slice(1);
    const countryCodeLength = stripped.length > 10 ? Math.min(3, stripped.length - 10) : 2;
    return {
      countryCode: `+${stripped.slice(0, countryCodeLength) || "91"}`,
      number: stripped.slice(countryCodeLength),
      e164Number: digits,
    };
  }
  return { countryCode: "+91", number: digits, e164Number: `+91${digits}` };
}

export function normalizeServiceDetails(payload: unknown): ServiceDetailsRecord {
  const raw = asRecord(payload);
  const teleService = asRecord(raw.teleService);
  const idValue = raw.uid ?? raw.id ?? raw.serviceId ?? raw.encId;
  const durationMinutes = toNumber(raw.duration ?? raw.serviceDuration ?? raw.approxDuration ?? raw.slotDuration);

  return {
    id: idValue != null ? String(idValue) : `srv-${Math.random().toString(36).slice(2, 8)}`,
    uid: typeof raw.uid === "string" ? raw.uid : undefined,
    name: asString(raw.name ?? raw.displayName) || "Unnamed service",
    description: asString(raw.description ?? raw.shortDescription),
    status: normalizeStatus(raw.status),
    serviceCode: asString(raw.serviceCode ?? raw.code ?? raw.encId) || undefined,
    serviceCategory: asString(raw.serviceCategory ?? raw.category) || undefined,
    serviceType: asString(raw.serviceType) || undefined,
    appointmentType: asString(raw.appointmentType ?? raw.apptType) || undefined,
    requestType: asString(raw.requestType) || undefined,
    durationMinutes: durationMinutes || undefined,
    displayOrder: toNumber(raw.displayOrder),
    color: asString(raw.color) || undefined,
    consultationType: asString(raw.consultationType ?? raw.serviceContext) || undefined,
    bookingEnabled: toBoolean(raw.bookingEnabled, true),
    onlineBooking: toBoolean(raw.onlineBooking, true),
    leadTime: [raw.leadDays, raw.leadHrs, raw.leadMins].some((value) => value != null)
      ? `${toNumber(raw.leadDays)}d ${toNumber(raw.leadHrs)}h ${toNumber(raw.leadMins)}m`
      : undefined,
    slotDuration: toNumber(raw.slotDuration ?? raw.duration),
    maxBookings: toNumber(raw.maxBookings),
    visibilityRules: asStringArray(raw.visibilityRules),
    price: toNumber(raw.price ?? raw.serviceCharge ?? raw.amount),
    taxApplicable: toBoolean(raw.taxApplicable),
    hsnCode: asString(raw.hsnCode) || undefined,
    currencyCode: asString(raw.currencyCode) || undefined,
    assignedProviders: asStringArray(raw.assignedProviders ?? raw.providers ?? raw.users),
    labels: asStringArray(raw.labels),
    tags: asStringArray(raw.tags),
    teleService,
    raw,
  };
}

export function toServiceFormPrefill(payload: unknown): ServiceFormPrefill {
  const raw = asRecord(payload);
  const teleService = asRecord(raw.teleService);
  const duration = toNumber(raw.duration ?? raw.serviceDuration ?? raw.approxDuration ?? 30);
  const { durHrs, durMins } = toDurationParts(duration || 30);
  const practitionerPrices = asRecord(raw.practitionerPrices);
  const practitionerOverrides = Object.fromEntries(
    Object.entries(practitionerPrices).map(([uid, price]) => [
      uid,
      { enabled: true, price: toNumber(price) },
    ]),
  );

  return {
    name: asString(raw.name ?? raw.displayName),
    displayOrder: toNumber(raw.displayOrder),
    description: asString(raw.description ?? raw.shortDescription),
    serviceContext: asString(raw.serviceContext).toUpperCase().includes("INPATIENT") ? "Inpatient Service" : "General Service",
    serviceType: toUiServiceType(raw.serviceType),
    apptType: toUiApptType(raw.appointmentType ?? raw.apptType),
    requestType: toUiRequestType(raw.requestType),
    serviceCategory: asString(raw.serviceCategory).toUpperCase().includes("SUB") ? "Sub Service" : "Main Service",
    teleServiceMode: toUiTeleMode(teleService.mode),
    teleServicePlatform: toUiTelePlatform(teleService.platform),
    meetingLink: asString(teleService.meetingLink),
    phoneValue: toPhoneValue(teleService.phoneNumber),
    durHrs,
    durMins,
    numResources: toNumber(raw.numResources) || 1,
    maxBookings: toNumber(raw.maxBookings) || 1,
    showDuration: toBoolean(raw.showDuration, true),
    leadDays: toNumber(raw.leadDays),
    leadHrs: toNumber(raw.leadHrs),
    leadMins: toNumber(raw.leadMins),
    safeSlots: toBoolean(raw.safeSlots, true),
    assignUsers: Object.keys(practitionerOverrides).length > 0,
    hasPricing: toNumber(raw.price ?? raw.serviceCharge ?? raw.amount) > 0,
    price: toNumber(raw.price ?? raw.serviceCharge ?? raw.amount),
    taxApplicable: toBoolean(raw.taxApplicable),
    hsnCode: asString(raw.hsnCode) || "None",
    preServiceSchema: normalizeSchemaFields(raw.preServiceSchema),
    postServiceSchema: normalizeSchemaFields(raw.postServiceSchema),
    currencyCode: asString(raw.currencyCode) || "INR",
    practitionerOverrides,
  };
}

export function useServiceDetails() {
  const api = useBookingApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getService = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<unknown>(`/services/${id}`);
      return normalizeServiceDetails(data);
    } catch (e) {
      const local = createdServices.find((service) => service.id === id || service.uid === id);
      if (local) {
        return normalizeServiceDetails(local as unknown as Record<string, unknown>);
      }
      const message = e instanceof Error ? e.message : "Failed to load service details.";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const updateService = useCallback(async (id: string, payload: Record<string, unknown>) => {
    return api.put<unknown>(`/services/${id}`, payload);
  }, [api]);

  return { loading, error, getService, updateService };
}

export function toServiceItem(details: ServiceDetailsRecord): ServiceItem {
  return {
    id: details.id,
    uid: details.uid,
    name: details.name,
    department: details.consultationType ?? "",
    description: details.description,
    duration: details.durationMinutes ?? 0,
    price: details.price ?? 0,
    status: details.status === "Inactive" ? "Inactive" : "Active",
    serviceType: details.serviceType,
    labels: details.labels,
  };
}
