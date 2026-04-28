import type { Store, StoreFilters, StoreLocation, StoreType } from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

function toStore(raw: Record<string, unknown>): Store {
  const logoRaw = raw.storeLogo;
  const storeLogo =
    logoRaw && typeof logoRaw === "object" && typeof (logoRaw as Record<string, unknown>).s3path === "string"
      ? { s3path: String((logoRaw as Record<string, unknown>).s3path) }
      : undefined;

  return {
    id: String(raw.encId ?? raw.id ?? ""),
    name: String(raw.name ?? ""),
    locationName: typeof raw.locationName === "string" ? raw.locationName : undefined,
    storeNature: typeof raw.storeNature === "string" ? raw.storeNature : undefined,
    status: typeof raw.status === "string" ? raw.status : "Unknown",
    storeLogo,
  };
}

function buildStoreQuery(filters: StoreFilters): Record<string, string | number> {
  const query: Record<string, string | number> = {};

  if (filters.status) query["status-eq"] = filters.status;
  if (filters.locationName) query["locationName-like"] = filters.locationName;
  if (filters.storeNature) query["storeNature-eq"] = filters.storeNature;
  if (filters.name) query["name-eq"] = filters.name;

  query.from = (filters.page - 1) * filters.pageSize;
  query.count = filters.pageSize;

  return query;
}

export async function listStores(api: ScopedApi, filters: StoreFilters): Promise<Store[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/store", {
    params: buildStoreQuery(filters),
  });
  return Array.isArray(response.data) ? response.data.map(toStore) : [];
}

export async function getStoreCount(api: ScopedApi, filters: StoreFilters): Promise<number> {
  const countFilters = { ...filters };
  delete countFilters.page;
  delete countFilters.pageSize;

  const countQuery: Record<string, string | number> = {};
  if (countFilters.status) countQuery["status-eq"] = countFilters.status;
  if (countFilters.locationName) countQuery["locationName-like"] = countFilters.locationName;
  if (countFilters.storeNature) countQuery["storeNature-eq"] = countFilters.storeNature;
  if (countFilters.name) countQuery["name-eq"] = countFilters.name;

  const response = await api.get<number>("provider/store/count", { params: countQuery });
  return typeof response.data === "number" ? response.data : 0;
}

export async function getStoreTypes(api: ScopedApi): Promise<StoreType[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/store/type");
  if (!Array.isArray(response.data)) return [];
  return response.data
    .filter((raw) => typeof (raw as Record<string, unknown>).storeNature === "string")
    .map((raw) => ({ storeNature: String((raw as Record<string, unknown>).storeNature) }));
}

export async function getStoreLocations(api: ScopedApi): Promise<StoreLocation[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/locations");
  if (!Array.isArray(response.data)) return [];
  return response.data
    .filter((raw) => (raw as Record<string, unknown>).status === "ACTIVE")
    .map((raw) => ({
      id: String((raw as Record<string, unknown>).id ?? ""),
      place: String((raw as Record<string, unknown>).place ?? ""),
      status: String((raw as Record<string, unknown>).status ?? ""),
    }));
}
