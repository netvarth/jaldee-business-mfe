import { useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useBookingApi } from "./useBookingApi";
import { addCreatedService } from "../data/sessionStore";
import type { ServiceItem } from "../types";
import { useServiceDetails } from "./useServiceDetails";

export interface SchemaField {
  id: string;
  name?: string;
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

function toApiCategory(value: ServiceFormInput["serviceCategory"]) {
  return value === "Sub Service" ? "SUB_SERVICE" : "MAIN_SERVICE";
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

function toApiSchema(fields: SchemaField[]) {
  return fields.reduce<Record<string, unknown>>((schema, field, index) => {
    const key = field.name?.trim() || field.id?.trim() || `field_${index + 1}`;
    schema[key] = {
      id: field.id,
      name: field.name?.trim() || key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      ...(field.options?.length ? { options: field.options } : {}),
    };
    return schema;
  }, {});
}

function toLeadTimeMinutes(input: Pick<ServiceFormInput, "leadDays" | "leadHrs" | "leadMins">) {
  return Math.max(0, input.leadDays) * 24 * 60 + Math.max(0, input.leadHrs) * 60 + Math.max(0, input.leadMins);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toApiPayload(input: ServiceFormInput, locationId?: string | number) {
  const userEntries = input.assignUsers
    ? Object.entries(input.practitionerPrices)
        .filter(([userUid]) => isUuid(userUid))
        .map(([userUid, amount]) => ({
        userUid,
        price: amount,
        currencyCode: input.currencyCode,
      }))
    : [];

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    duration: toDurationMinutes(input),
    price: input.hasPricing ? input.price : 0,
    autoGenerateInvoice: false,
    isDefaultService: false,
    status: "Enabled",
    currencyCode: input.currencyCode,
    category: toApiCategory(input.serviceCategory),
    serviceMode: input.serviceType === "Teleservice" ? "TELESERVICE" : "ONSITE",
    bookingMode: input.apptType === "Request" ? "REQUEST" : "BOOKING",
    ...(userEntries.length ? { users: userEntries } : {}),
    displayOrder: input.displayOrder,
    maxBookingsPerConsumer: input.maxBookings,
    prepaymentRequired: false,
    internationalPriceRequired: false,
    hsnCode: input.hsnCode === "None" ? "" : input.hsnCode,
    taxPreference: input.taxApplicable ? "TAXABLE" : "NON_TAXABLE",
    feature: toApiAppointmentType(input.apptType) === "REQUEST" ? "REQUEST" : "BOOKING",
    preServiceSchema: toApiSchema(input.preServiceSchema),
    postServiceSchema: toApiSchema(input.postServiceSchema),
    notification: true,
    livetrack: false,
    preLivetrack: false,
    preInfoEnabled: input.preServiceSchema.length > 0,
    postInfoEnabled: input.postServiceSchema.length > 0,
    consumerNoteMandatory: false,
    priceDynamic: false,
    serviceDurationEnabled: input.showDuration,
    showPrice: input.hasPricing,
    showOnlyAvailableSlots: input.safeSlots,
    isFixedAmount: true,
    channelRestricted: false,
    supportInternationalConsumer: false,
    enableMultiCurrency: false,
    resourcesRequired: input.numResources,
    leadTime: toLeadTimeMinutes(input),
    serviceBookingType: "APPOINTMENT",
    prePaymentType: "NONE",
    ...(locationId != null ? { location: [String(locationId)] } : {}),
    ...(input.serviceCategory === "Sub Service" ? { labels: ["SUB_SERVICE"] } : {}),
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
  const { location } = useMFEProps();
  const { updateService } = useServiceDetails();
  const [submitting, setSubmitting] = useState(false);

  const saveService = async (input: ServiceFormInput, serviceId?: string): Promise<ServiceItem> => {
    setSubmitting(true);
    try {
      const dto = serviceId
        ? await updateService(serviceId, toApiPayload(input, location?.id))
        : await api.post<CreateServiceDtoLike>("/services", toApiPayload(input, location?.id));
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
