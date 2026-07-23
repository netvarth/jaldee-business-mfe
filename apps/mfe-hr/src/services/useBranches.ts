import { useCallback, useEffect, useMemo, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import type { BranchLocation } from "@jaldee/auth-context";
import { useHrApi } from "./useHrApi";

export interface Branch {
  id: string;
  uid?: string;
  name: string;
  code?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

type RuntimeLocation = BranchLocation & {
  uid?: string;
  address?: string;
  latitude?: string | number;
  longitude?: string | number;
};

function toNumber(value: unknown) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractCollection(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (typeof input !== "object" || input === null) return [];

  const candidate = input as Record<string, unknown>;
  if (Array.isArray(candidate.content)) return candidate.content;
  if (Array.isArray(candidate.data)) return candidate.data;
  if (Array.isArray(candidate.locations)) return candidate.locations;

  for (const key of ["data", "result", "response", "payload"]) {
    const nested = candidate[key];
    if (typeof nested === "object" && nested !== null && nested !== input) {
      const collection = extractCollection(nested);
      if (collection.length > 0) return collection;
    }
  }

  return [];
}

function mapApiLocationsToBranches(input: unknown): Branch[] {
  return extractCollection(input).flatMap((location) => {
    if (typeof location !== "object" || location === null) return [];
    const candidate = location as Record<string, unknown>;
    const id = candidate.uid ?? candidate.locationUid ?? candidate.id ?? candidate.locationId;
    const name = candidate.place ?? candidate.name ?? candidate.locationName ?? candidate.branchName ?? candidate.displayName;
    if (!id || !name) return [];

    return [{
      id: String(id),
      uid: String(candidate.uid ?? id),
      name: String(name),
      code: typeof candidate.code === "string" ? candidate.code : typeof candidate.locationCode === "string" ? candidate.locationCode : undefined,
      address: typeof candidate.address === "string" ? candidate.address : undefined,
      latitude: toNumber(candidate.latitude),
      longitude: toNumber(candidate.longitude),
    }];
  });
}

export function mapAvailableLocationsToBranches(locations: RuntimeLocation[] | undefined): Branch[] {
  if (!Array.isArray(locations)) return [];

  return locations.map((location) => ({
    id: String(location.uid ?? location.id ?? ""),
    uid: location.uid ?? location.id,
    name: location.name || location.code || "(unnamed location)",
    code: location.code,
    address: location.address,
    latitude: toNumber(location.latitude),
    longitude: toNumber(location.longitude),
  }));
}

/** Reads branches from shell-provided availableLocations instead of refetching locations in HR. */
export function useBranches({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useHrApi();
  const mfeProps = useMFEProps() as ReturnType<typeof useMFEProps> & {
    availableLocations?: RuntimeLocation[];
  };
  const [fallbackData, setFallbackData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shellData = useMemo(
    () => mapAvailableLocationsToBranches(mfeProps.availableLocations),
    [mfeProps.availableLocations]
  );

  const loadFallback = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (shellData.length > 0) {
      setFallbackData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<unknown>("/base-service/v1/api/tenant/locations?page=0&size=100");
      setFallbackData(mapApiLocationsToBranches(response));
    } catch (e) {
      setFallbackData([]);
      setError(e instanceof Error ? e.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [api, enabled, shellData.length]);

  useEffect(() => {
    void loadFallback();
  }, [loadFallback]);

  const data = shellData.length > 0 ? shellData : fallbackData;

  return {
    data,
    loading,
    error,
    reload: loadFallback,
  };
}
