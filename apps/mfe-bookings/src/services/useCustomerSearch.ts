import { useCallback, useState } from "react";
import { useBookingApi } from "./useBookingApi";
import { unwrapList } from "./response";
import type { CustomerSearchResult } from "../types";

function normalizeCustomer(result: CustomerSearchResult): CustomerSearchResult {
  return {
    ...result,
    uid: String(result.uid ?? "").trim(),
    firstName: result.firstName?.trim(),
    lastName: result.lastName?.trim(),
    phone: result.phone?.trim(),
    email: result.email?.trim(),
    gender: result.gender?.trim(),
    dateOfBirth: result.dateOfBirth?.trim(),
  };
}

function resolveQueryParams(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    return { email: trimmed };
  }

  const digitCount = trimmed.replace(/\D/g, "").length;
  if (digitCount >= 3 && digitCount >= Math.max(1, trimmed.length - 2)) {
    return { phone: trimmed };
  }

  return { name: trimmed };
}

export function useCustomerSearch() {
  const api = useBookingApi();
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  const searchCustomers = useCallback(
    async (query: string, signal?: AbortSignal) => {
      const params = resolveQueryParams(query);
      if (!params) {
        clearResults();
        return [];
      }

      setLoading(true);
      setError(null);
      try {
        const data = await api.get<unknown>("/customers/search", { params, signal });
        const list = unwrapList<CustomerSearchResult>(data)
          .map(normalizeCustomer)
          .filter((customer) => customer.uid);
        setResults(list);
        return list;
      } catch (error) {
        if (signal?.aborted) {
          return [];
        }
        const message = error instanceof Error ? error.message : "Failed to search customers.";
        setError(message);
        setResults([]);
        return [];
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [api, clearResults],
  );

  return { results, loading, error, searchCustomers, clearResults };
}
