import { useCallback, useEffect, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

const DEFAULT_OPERATOR_CATALOG = [
  { operator: "EQ", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "NE", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "CONTAINS", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "STARTS_WITH", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "IN", arity: "AT_LEAST_ONE", minValues: 1, maxValues: -1 },
  { operator: "NOT_IN", arity: "AT_LEAST_ONE", minValues: 1, maxValues: -1 },
  { operator: "GT", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "GTE", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "LT", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "LTE", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
  { operator: "BETWEEN", arity: "EXACTLY_TWO", minValues: 2, maxValues: 2 },
];

const FALLBACK_FIELDS = [
  { name: "email", label: "Email", type: "STRING", searchable: false, filterable: true, sortable: false, operators: ["EQ", "CONTAINS"], values: [] },
  { name: "primaryClassification", label: "Primary Classification", type: "ENUM", searchable: false, filterable: true, sortable: false, operators: ["EQ", "IN", "NOT_IN"], values: ["SERVICE_PROVIDER", "SCHEDULER", "RECEPTIONIST", "BOOKING_MANAGER", "SUPPORT_STAFF"] },
  { name: "userStatus", label: "User Status", type: "ENUM", searchable: false, filterable: true, sortable: false, operators: ["EQ", "IN"], values: ["INACTIVE", "ACTIVE", "DEBARRED", "DISABLE", "SUSPENDED"] },
  { name: "status", label: "Booking Status", type: "ENUM", searchable: false, filterable: true, sortable: false, operators: ["EQ", "NE", "IN", "NOT_IN"], values: ["ACTIVE", "INACTIVE"] },
  { name: "createdAt", label: "Created At", type: "DATETIME", searchable: false, filterable: true, sortable: true, operators: ["GT", "GTE", "LT", "LTE", "BETWEEN"], values: [] },
  { name: "primaryPhoneE164", label: "Phone", type: "STRING", searchable: false, filterable: true, sortable: false, operators: ["EQ", "CONTAINS"], values: [] },
  { name: "displayName", label: "Display Name", type: "STRING", searchable: false, filterable: true, sortable: true, operators: ["EQ", "STARTS_WITH", "CONTAINS"], values: [] }
];

export function useUserSearchSchema() {
  const api = useBookingApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<SearchSchema>("/booking-users/search/schema");
      const normalized = normalizeSearchSchema(response);
      setSchema({
        fields: normalized?.fields?.length ? normalized.fields : normalizeSearchSchema(FALLBACK_FIELDS)!.fields,
        operatorCatalog: normalized?.operatorCatalog ?? DEFAULT_OPERATOR_CATALOG,
      } as SearchSchema);
    } catch (loadError) {
      setSchema({
        fields: normalizeSearchSchema(FALLBACK_FIELDS)!.fields,
        operatorCatalog: DEFAULT_OPERATOR_CATALOG,
      } as SearchSchema);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}
