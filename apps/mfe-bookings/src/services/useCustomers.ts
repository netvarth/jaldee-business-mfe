import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useToast } from "../contexts/ToastContext";
import type { Customer } from "../types";
import { unwrapList } from "./response";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

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
    id: pickFirstString(record.uid, record.id, record.consumerId, record.jaldeeConsumerId) || `consumer-${index}`,
    firstName: pickFirstString(record.firstName, record.fname, record.givenName) || "Unknown",
    lastName: pickFirstString(record.lastName, record.lname, record.familyName),
    phoneNumber: pickFirstString(record.phoneNumber, record.primaryPhoneNumber, record.phone, record.mobileNumber),
    email: pickFirstString(record.email, record.emailId),
    labels: Array.isArray(record.labels) ? record.labels.filter((value): value is string => typeof value === "string") : [],
    visits: typeof record.totalBookings === "number" ? record.totalBookings : 0,
    status: pickFirstString(record.status),
    avatarColor: COLORS[index % COLORS.length],
  };
}

export const useCustomers = () => {
  const api = useBookingApi();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        "/consumers/search",
        {},
        { params: { page: 0, size: 100 } },
      );
      setCustomers(unwrapList<unknown>(data).map(normalizeCustomer));
    } catch (e) {
      // No sample fallback — real/empty data only so a backend gap is visible.
      setError(e instanceof Error ? e.message : "Failed to load customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const addLocal = useCallback((c: Customer) => {
    setCustomers((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
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
      }),
    );
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, error, refresh: fetchCustomers, addLocal, updateLocal, toggleLocalStatus, showToast };
};
