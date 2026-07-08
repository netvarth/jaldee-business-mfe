import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface Branch {
  id: string;
  uid?: string;
  name: string;
  code?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Branches are owned by core-base-crm-service (locations). feature-hr-service
 * proxies them read-only at GET /locations, returning PageResponse<LocationDto>
 * ({ items, total, page, size }) where the display name field is `place`.
 */
interface LocationDto {
  uid?: string;
  place?: string;
  address?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  [key: string]: unknown;
}

interface PageResponse<T> {
  items?: T[];
  total?: number;
  page?: number;
  size?: number;
}

function toBranch(l: LocationDto): Branch {
  const lat = l.latitude != null ? Number(l.latitude) : undefined;
  const lng = l.longitude != null ? Number(l.longitude) : undefined;
  return {
    id: String(l.uid ?? ""),
    uid: l.uid,
    name: l.place ?? l.address ?? "(unnamed location)",
    address: l.address,
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
  };
}

/** Loads branches (read-only) from /locations. */
export function useBranches() {
  const api = useHrApi();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PageResponse<LocationDto>>("/locations?size=200");
      const items = Array.isArray(res?.items) ? res.items : [];
      setData(items.map(toBranch));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load branches");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
