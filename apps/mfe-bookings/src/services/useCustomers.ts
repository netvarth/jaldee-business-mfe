import { useState, useEffect, useCallback, useRef } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "../services/useBookingApi";
import { useToast } from "../contexts/ToastContext";
import type { Customer } from "../types";
import { unwrapList } from "./response";
import { buildCustomerSearchBody } from "./customerSearch";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
const EMPTY_FILTER_CLAUSES: SearchFilterClause[] = [];

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeCustomer(item: unknown, index: number): Customer {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return {
    id:
      pickFirstString(record.uid, record.id, record.consumerId, record.jaldeeConsumerId) ||
      `consumer-${index}`,
    firstName: pickFirstString(record.firstName, record.fname, record.givenName) || "Unknown",
    lastName: pickFirstString(record.lastName, record.lname, record.familyName),
    phoneNumber: pickFirstString(
      record.phoneNumber,
      record.primaryPhoneNumber,
      record.phone,
      record.mobileNumber
    ),
    email: pickFirstString(record.email, record.emailId),
    labels: Array.isArray(record.labels)
      ? record.labels.filter((value): value is string => typeof value === "string")
      : [],
    visits: typeof record.totalBookings === "number" ? record.totalBookings : 0,
    status: pickFirstString(record.status),
    avatarColor: COLORS[index % COLORS.length],
  };
}

export const useCustomers = (
  filterClauses: SearchFilterClause[] = EMPTY_FILTER_CLAUSES,
  schema: SearchSchema | null | undefined = null,
  options?: { enabled?: boolean }
) => {
  const api = useBookingApi();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;
  const inFlightRequestKeyRef = useRef<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestBody = buildCustomerSearchBody({ filterClauses, schema, page: 0, size: 100 });
    const requestKey = JSON.stringify(requestBody);

    if (inFlightRequestKeyRef.current === requestKey) {
      return;
    }

    inFlightRequestKeyRef.current = requestKey;
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<unknown>("/consumers/search", requestBody);
      setCustomers(unwrapList<unknown>(data).map(normalizeCustomer));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers.");
      setCustomers([]);
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setLoading(false);
    }
  }, [api, enabled, filterClauses, schema]);

  const addLocal = useCallback((customer: Customer) => {
    setCustomers((prev) => [customer, ...prev.filter((item) => item.id !== customer.id)]);
  }, []);

  const updateLocal = useCallback((customer: Customer) => {
    setCustomers((prev) => prev.map((item) => (item.id === customer.id ? customer : item)));
  }, []);

  const toggleLocalStatus = useCallback((id: string) => {
    setCustomers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = String(item.status || "").toUpperCase();
        const next = current === "ENABLED" ? "DISABLED" : "ENABLED";
        return { ...item, status: next };
      })
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchCustomers();
  }, [enabled, fetchCustomers]);

  return {
    customers,
    loading,
    error,
    refresh: fetchCustomers,
    addLocal,
    updateLocal,
    toggleLocalStatus,
    showToast,
  };
};
