import { useMemo } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import type { BranchLocation } from "@jaldee/auth-context";

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
export function useBranches() {
  const mfeProps = useMFEProps() as ReturnType<typeof useMFEProps> & {
    availableLocations?: RuntimeLocation[];
  };

  const data = useMemo(
    () => mapAvailableLocationsToBranches(mfeProps.availableLocations),
    [mfeProps.availableLocations]
  );

  return {
    data,
    loading: false,
    error: null,
    reload: async () => undefined,
  };
}
