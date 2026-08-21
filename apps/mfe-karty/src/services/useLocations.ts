import { useQuery } from "@tanstack/react-query";
import { useCrmApi } from "./useCrmApi";

/**
 * Tenant locations ("branches") from core-base-crm-service — the SAME locations every
 * other module (health, bookings, finance) uses. A commerce Store references one of these
 * by `locationUid`; it must never be a free-text label.
 *
 * Backed by LocationController: GET /base-service/v1/api/tenant/locations returns a raw
 * Spring `Page<LocationDto>` (NOT ApiResponse-wrapped), so we read `content` directly.
 * useCrmApi already targets /base-service.
 */

/** Mirrors com.jaldee.shared.base.dto.LocationDto (only the fields Karty needs). */
export interface LocationDto {
  uid?: string;
  place?: string;
  address?: string;
  /** base-crm StatusEnum, serialized as "Enabled" / "Disabled" (NOT "ACTIVE"). */
  status?: string;
  baseLocation?: boolean;
}

interface PageDto<T> {
  content?: T[];
}

/** A branch as Karty consumes it — always has a usable uid and label. */
export interface StoreLocation {
  uid: string;
  name: string;
  isBase: boolean;
}

function toLocation(dto: LocationDto): StoreLocation | null {
  const uid = dto.uid;
  if (!uid) return null;
  return {
    uid,
    name: (dto.place || "").trim() || "Unnamed location",
    isBase: Boolean(dto.baseLocation),
  };
}

/**
 * Active tenant locations, base location first then alphabetical. Never throws —
 * a failed load yields an empty list so the store form still renders.
 */
export function useLocations() {
  const api = useCrmApi();

  return useQuery({
    queryKey: ["base-crm", "locations"],
    queryFn: async () => {
      // NB: base-crm StatusEnum is Enabled/Disabled — passing ?status=ACTIVE fails Spring's
      // enum binding and 400s the whole request. Fetch all, exclude Disabled client-side.
      const page = await api.get<PageDto<LocationDto>>(
        "/v1/api/tenant/locations?size=100&sort=place,asc"
      );
      const rows = Array.isArray(page?.content) ? page.content : [];
      return rows
        .filter((l) => l.status !== "Disabled")
        .map(toLocation)
        .filter((l): l is StoreLocation => l !== null)
        .sort((a, b) => {
          if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    },
    staleTime: 5 * 60_000,
  });
}
