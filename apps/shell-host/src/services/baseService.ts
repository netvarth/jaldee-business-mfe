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

  if (typeof candidate._embedded === "object" && candidate._embedded !== null) {
    const embedded = candidate._embedded as Record<string, unknown>;
    const firstList = Object.values(embedded).find(Array.isArray);
    if (Array.isArray(firstList)) {
      return firstList;
    }
  }

  return [];
}

export function normalizeBaseLocations(input: unknown): BranchLocation[] {
  const list = extractCollection(input);

  if (list.length > 0) {
    return list.map((location, index) => {
      if (typeof location === "string") {
        return {
          id: location,
          name: location,
          code: location,
        };
      }

      const candidate = (typeof location === "object" && location !== null
        ? location
        : {}) as Record<string, unknown>;

      return {
        id: String(candidate.uid ?? candidate.locationUid ?? candidate.id ?? candidate.locationId ?? `loc-${index + 1}`),
        name: String(candidate.name ?? candidate.locationName ?? candidate.branchName ?? candidate.displayName ?? `Location ${index + 1}`),
        code: String(candidate.code ?? candidate.locationCode ?? candidate.branchCode ?? candidate.shortName ?? `LOC${index + 1}`),
      };
    });
  }

  return [{ id: "loc-default", name: "Default Location", code: "DEF" }];
}

export const baseService = {
  async getLocations(): Promise<BranchLocation[]> {
    const response = await apiClient.get<unknown>(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.search),
      { params: { size: 100 } },
    );
    return normalizeBaseLocations(response.data);
  },
};
