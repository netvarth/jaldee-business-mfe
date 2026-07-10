import { useState } from "react";
import { useBookingApi } from "./useBookingApi";
import { addCreatedService } from "../data/sessionStore";
import type { ServiceItem } from "../types";
import { useServiceDetails } from "./useServiceDetails";

export interface SchemaField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface ServiceFormInput {
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
  meetingLink?: string;
  phoneNumber?: string;
  durHrs: number;
  durMins: number;
  numResources: number;
  maxBookings: number;
  showDuration: boolean;
  leadDays: number;
  leadHrs: number;
  leadMins: number;
  safeSlots: boolean;
  hasPricing: boolean;
  price: number;
  taxApplicable: boolean;
  hsnCode: string;
  preServiceSchema: SchemaField[];
  postServiceSchema: SchemaField[];
  currencyCode: string;
  practitionerPrices: Record<string, number>;
  assignUsers?: boolean;
}

interface CreateServiceDtoLike {
  id?: string | number;
  uid?: string;
  serviceId?: string | number;
  encId?: string;
  name?: string;
  displayName?: string;
  description?: string;
  shortDescription?: string;
  serviceDuration?: string | number;
  duration?: string | number;
  approxDuration?: string | number;
  price?: string | number;
  serviceCharge?: string | number;
  amount?: string | number;
  serviceType?: string;
  department?: string;
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDurationMinutes(input: Pick<ServiceFormInput, "durHrs" | "durMins">) {
  return Math.max(0, input.durHrs) * 60 + Math.max(0, input.durMins);
}

function toApiServiceType(value: ServiceFormInput["serviceType"]) {
  return value === "Teleservice" ? "TELESERVICE" : "ONSITE";
}

function toApiAppointmentType(value: ServiceFormInput["apptType"]) {
  return value === "Request" ? "REQUEST" : "BOOKING";
}

function toApiRequestType(value?: ServiceFormInput["requestType"]) {
  if (value === "With Date & Time") return "DATE_TIME";
  if (value === "With Date Only") return "DATE_ONLY";
  if (value === "No Date & Time") return "NONE";
  return undefined;
}

function toApiTeleMode(value?: ServiceFormInput["teleServiceMode"]) {
  if (value === "Video Mode") return "VIDEO";
  if (value === "Audio Mode") return "AUDIO";
  return undefined;
}

function toApiTelePlatform(value?: ServiceFormInput["teleServicePlatform"]) {
  if (value === "Zoom") return "ZOOM";
  if (value === "Google Meet") return "GOOGLE_MEET";
  if (value === "Jaldee Video") return "JALDEE_VIDEO";
  if (value === "WhatsApp") return "WHATSAPP";
  if (value === "Phone") return "PHONE";
  return undefined;
}

function toApiPayload(input: ServiceFormInput) {
  const teleService =
    input.serviceType === "Teleservice"
      ? {
          mode: toApiTeleMode(input.teleServiceMode),
          platform: toApiTelePlatform(input.teleServicePlatform),
          ...(input.meetingLink?.trim() ? { meetingLink: input.meetingLink.trim() } : {}),
          ...(input.phoneNumber?.trim() ? { phoneNumber: input.phoneNumber.trim() } : {}),
        }
      : undefined;

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    displayOrder: input.displayOrder,
    serviceContext: input.serviceContext,
    serviceType: toApiServiceType(input.serviceType),
    appointmentType: toApiAppointmentType(input.apptType),
    ...(input.apptType === "Request"
      ? { requestType: toApiRequestType(input.requestType) }
      : {}),
    ...(teleService ? { teleService } : {}),
    apptType: input.apptType,
    serviceCategory: input.serviceCategory,
    duration: toDurationMinutes(input),
    durHrs: input.durHrs,
    durMins: input.durMins,
    numResources: input.numResources,
    maxBookings: input.maxBookings,
    showDuration: input.showDuration,
    leadDays: input.leadDays,
    leadHrs: input.leadHrs,
    leadMins: input.leadMins,
    safeSlots: input.safeSlots,
    hasPricing: input.hasPricing,
    price: input.hasPricing ? input.price : 0,
    taxApplicable: input.taxApplicable,
    hsnCode: input.hsnCode,
    currencyCode: input.currencyCode,
    preServiceSchema: input.preServiceSchema,
    postServiceSchema: input.postServiceSchema,
    practitionerPrices: input.assignUsers ? input.practitionerPrices : {},
    status: "Enabled",
  };
}

function toCreatedService(input: ServiceFormInput, dto?: CreateServiceDtoLike): ServiceItem {
  const rawId = dto?.uid ?? dto?.id ?? dto?.serviceId ?? dto?.encId;
  return {
    id: rawId != null ? String(rawId) : `srv-${Date.now()}`,
    uid: dto?.uid ?? (rawId != null ? String(rawId) : undefined),
    name: dto?.name ?? dto?.displayName ?? input.name.trim(),
    department: dto?.department ?? input.serviceContext,
    description: dto?.description ?? dto?.shortDescription ?? input.description.trim(),
    duration: toNumber(dto?.serviceDuration ?? dto?.duration ?? dto?.approxDuration) || toDurationMinutes(input),
    price: toNumber(dto?.price ?? dto?.serviceCharge ?? dto?.amount) || (input.hasPricing ? input.price : 0),
    status: "Active",
    serviceType: dto?.serviceType ?? input.serviceType,
    labels: [input.apptType],
  };
}

export function useCreateService() {
  const api = useBookingApi();
  const { updateService } = useServiceDetails();
  const [submitting, setSubmitting] = useState(false);

  const saveService = async (input: ServiceFormInput, serviceId?: string): Promise<ServiceItem> => {
    setSubmitting(true);
    try {
      const dto = serviceId
        ? await updateService(serviceId, toApiPayload(input))
        : await api.post<CreateServiceDtoLike>("/services", toApiPayload(input));
      const service = toCreatedService(input, dto);
      addCreatedService(service);
      return service;
    } catch {
      const service = toCreatedService(input);
      addCreatedService(service);
      return service;
    } finally {
      setSubmitting(false);
    }
  };

  return { saveService, submitting };
}
