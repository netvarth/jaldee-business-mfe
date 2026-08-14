import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import type { Customer } from "../types";

export interface NewCustomerInput {
  title?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

interface CustomerDtoLike {
  id?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
}

function buildPhoneE164(phoneNumber?: string): string {
  const trimmed = phoneNumber?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function toCustomer(input: NewCustomerInput, dto?: CustomerDtoLike): Customer {
  return {
    id: dto?.id ?? `cust-${Date.now()}`,
    firstName: dto?.firstName ?? input.firstName,
    lastName: dto?.lastName ?? input.lastName,
    phoneNumber: dto?.phoneNumber ?? input.phoneNumber,
    email: dto?.email ?? input.email,
    labels: [],
    visits: 0,
    status: "Active",
    avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

/** Build the customer record immediately (for optimistic UI), no network. */
export function buildOptimisticCustomer(input: NewCustomerInput): Customer {
  return toCustomer(input);
}

export function useCreateCustomer() {
  const api = useBookingApi();
  const [submitting, setSubmitting] = useState(false);

  /** POSTs to /consumers; on no live backend, returns an optimistic local record. */
  const createCustomer = async (input: NewCustomerInput): Promise<Customer> => {
    setSubmitting(true);
    
    const phoneE164 = buildPhoneE164(input.phoneNumber) || undefined;
    const displayName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
    
    const payload = {
      firstName: input.firstName,
      lastName: input.lastName || undefined,
      displayName: displayName || input.firstName,
      phoneE164,
      email: input.email || undefined,
      gender: input.gender ? input.gender.toUpperCase() : undefined,
      dob: input.dob || undefined,
      address: input.address || undefined,
      status: "ACTIVE",
    };

    try {
      const dto = await api.post<CustomerDtoLike>("/customers", payload);
      return toCustomer(input, dto);
    } finally {
      setSubmitting(false);
    }
  };

  return { createCustomer, submitting };
}

export function useUpdateCustomer() {
  const api = useBookingApi();
  const [submitting, setSubmitting] = useState(false);

  const updateCustomer = async (id: string, input: NewCustomerInput): Promise<Customer> => {
    setSubmitting(true);
    
    const phoneE164 = buildPhoneE164(input.phoneNumber) || undefined;
    const displayName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
    
    const payload = {
      id,
      firstName: input.firstName,
      lastName: input.lastName || undefined,
      displayName: displayName || input.firstName,
      phoneE164,
      email: input.email || undefined,
      gender: input.gender ? input.gender.toUpperCase() : undefined,
      dob: input.dob || undefined,
      address: input.address || undefined,
      status: "ACTIVE",
    };

    try {
      const dto = await api.put<CustomerDtoLike>(`/v1/api/tenant/customers/${id}`, payload);
      return toCustomer(input, dto);
    } finally {
      setSubmitting(false);
    }
  };

  return { updateCustomer, submitting };
}
