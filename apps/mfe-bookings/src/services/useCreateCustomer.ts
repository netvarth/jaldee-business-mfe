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

  /** POSTs to /customers; on no live backend, returns an optimistic local record. */
  const createCustomer = async (input: NewCustomerInput): Promise<Customer> => {
    setSubmitting(true);
    const payload = { ...input, phoneNumber: toPhoneNumber(input.phoneNumber), status: "ACTIVE" };
    try {
      const dto = await api.post<CustomerDtoLike>("/customers", payload);
      return toCustomer(input, dto);
    } catch {
      return toCustomer(input);
    } finally {
      setSubmitting(false);
    }
  };

  return { createCustomer, submitting };
}
