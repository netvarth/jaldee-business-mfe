import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useToast } from "../contexts/ToastContext";
import type { Customer } from "../types";
import { unwrapList } from "./response";

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
        "/customers/search",
        {},
        { params: { page: 0, size: 100 } },
      );
      setCustomers(unwrapList<Customer>(data));
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

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, error, refresh: fetchCustomers, addLocal, showToast };
};
