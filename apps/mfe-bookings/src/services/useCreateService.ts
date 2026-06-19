import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { addCreatedService } from "../data/sessionStore";
import type { ServiceItem } from "../types";

export interface ServiceFormInput {
  name: string;
  displayOrder: number;
  department: string;
  description: string;
  serviceContext: string;
  serviceType: "Onsite Service" | "Teleservice";
  apptType: "Booking" | "Request";
  serviceCategory: "Main Service" | "Sub Service";
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
  customIntake: boolean;
}

/** Builds the booking-service POST /services payload from the form. */
function buildPayload(f: ServiceFormInput) {
  const totalDuration = f.durHrs * 60 + f.durMins;
  const displayServiceType = f.serviceType === "Onsite Service" ? "Onsite Consultation" : "Tele-Consultation";
  const labels = ["OPD"];
  labels.push(f.hasPricing ? `Price: ₹${f.price}` : "Free/No-Charge");
  if (f.serviceType === "Teleservice") labels.push("Teleservice");
  labels.push(f.apptType);

  const additionalSettings = {
    serviceContext: f.serviceContext,
    serviceCategory: f.serviceCategory,
    durHrs: f.durHrs, durMins: f.durMins,
    numResources: f.numResources, maxBookings: f.maxBookings,
    showDuration: f.showDuration,
    leadDays: f.leadDays, leadHrs: f.leadHrs, leadMins: f.leadMins,
    safeSlots: f.safeSlots,
    hasPricing: f.hasPricing, taxApplicable: f.taxApplicable, hsnCode: f.hsnCode,
    customIntake: f.customIntake,
  };

  return {
    name: f.name.trim(),
    displayOrder: f.displayOrder,
    department: f.department,
    description: f.description.trim() ? f.description.trim() : JSON.stringify(additionalSettings),
    serviceType: displayServiceType,
    appointmentType: f.apptType,
    duration: totalDuration || 30,
    price: f.hasPricing ? f.price : 0,
    status: "Active",
    labels,
    additionalSettings,
    category: f.serviceCategory || f.department,
    serviceMode: displayServiceType,
    bookingMode: f.apptType,
    isDefaultService: false,
    currencyCode: "INR",
    userIds: [] as string[],
  };
}

function toServiceItem(f: ServiceFormInput, id?: string): ServiceItem {
  return {
    id: id ?? `srv-${Date.now()}`,
    name: f.name.trim(),
    department: f.department,
    description: f.description.trim(),
    duration: f.durHrs * 60 + f.durMins || 30,
    price: f.hasPricing ? f.price : 0,
    status: "Active",
    serviceType: f.serviceType === "Onsite Service" ? "Onsite Consultation" : "Tele-Consultation",
    labels: ["OPD"],
  };
}

export function useCreateService() {
  const api = useBookingApi();
  const [submitting, setSubmitting] = useState(false);

  const createService = async (form: ServiceFormInput): Promise<ServiceItem> => {
    setSubmitting(true);
    try {
      const dto = await api.post<{ id?: string; uid?: string }>("/services", buildPayload(form));
      const item = toServiceItem(form, dto?.id ?? dto?.uid);
      addCreatedService(item);
      return item;
    } catch {
      const item = toServiceItem(form);
      addCreatedService(item);
      return item;
    } finally {
      setSubmitting(false);
    }
  };

  return { createService, submitting };
}
