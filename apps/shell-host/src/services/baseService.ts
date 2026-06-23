import type { BranchLocation } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";
import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "./serviceUrls";

function extractCollection(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input !== "object" || input === null) {
    return [];
  }

  const candidate = input as Record<string, unknown>;
  if (Array.isArray(candidate.content)) {
    return candidate.content;
  }

  if (Array.isArray(candidate.data)) {
    return candidate.data;
  }

  for (const key of ["data", "result", "response", "payload"]) {
    const nested = candidate[key];
    if (typeof nested === "object" && nested !== null && nested !== input) {
      const collection = extractCollection(nested);
      if (collection.length > 0) {
        return collection;
      }
    }
  }

  for (const key of ["items", "locations", "results", "records"]) {
    if (Array.isArray(candidate[key])) {
      return candidate[key] as unknown[];
    }
  }

  if (typeof candidate._embedded === "object" && candidate._embedded !== null) {
    const embedded = candidate._embedded as Record<string, unknown>;
    const firstList = Object.values(embedded).find(Array.isArray);
    if (Array.isArray(firstList)) {
      return firstList;
    }
  }

  const hasId =
    candidate.uid != null ||
    candidate.locationUid != null ||
    candidate.id != null ||
    candidate.locationId != null;
  const hasName =
    candidate.place != null ||
    candidate.name != null ||
    candidate.locationName != null ||
    candidate.branchName != null ||
    candidate.displayName != null;

  if (hasId && hasName) {
    return [candidate];
  }

  return [];
}

export function normalizeBaseLocations(input: unknown): BranchLocation[] {
  const list = extractCollection(input);

  if (list.length > 0) {
    return list.flatMap((location) => {
      if (typeof location === "string") {
        const value = location.trim();
        if (!value) return [];
        return {
          id: value,
          name: value,
          code: value,
        };
      }

      const candidate = (typeof location === "object" && location !== null
        ? location
        : {}) as Record<string, unknown>;
      const id = candidate.uid ?? candidate.locationUid ?? candidate.id ?? candidate.locationId;
      const name = candidate.place ?? candidate.name ?? candidate.locationName ?? candidate.branchName ?? candidate.displayName;

      if (id == null || name == null || !String(id).trim() || !String(name).trim()) {
        return [];
      }

      return [{
        id: String(id),
        locationId: candidate.id ?? candidate.locationId,
        uid: String(id),
        name: String(name),
        code: String(candidate.code ?? candidate.locationCode ?? candidate.branchCode ?? candidate.shortName ?? id),
      } as any];
    });
  }

  return [];
}

export const baseService = {
  async getLocations(): Promise<BranchLocation[]> {
    console.log("[baseService] fetching locations from API...");
    try {
      const response = await apiClient.get<unknown>(
        buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.search),
        { params: { page: 0, size: 100 } },
      );
      console.log("[baseService] raw response data:", response.data);
      const normalized = normalizeBaseLocations(response.data);
      console.log("[baseService] normalized locations:", normalized);
      return normalized;
    } catch (err) {
      console.error("[baseService] failed to fetch locations:", err);
      throw err;
    }
  },
};
