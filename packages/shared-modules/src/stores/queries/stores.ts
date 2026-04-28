import { useQuery } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { getStoreCount, getStoreLocations, getStoreTypes, listStores } from "../services/stores";
import type { StoreFilters } from "../types";

const STORES_KEY = "stores";

export function useStoresList(filters: StoreFilters) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [STORES_KEY, "list", filters],
    queryFn: () => listStores(api, filters),
    placeholderData: (prev) => prev,
  });
}

export function useStoresCount(filters: StoreFilters) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [STORES_KEY, "count", filters],
    queryFn: () => getStoreCount(api, filters),
    placeholderData: (prev) => prev,
  });
}

export function useStoreTypes() {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [STORES_KEY, "types"],
    queryFn: () => getStoreTypes(api),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreLocations() {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [STORES_KEY, "locations"],
    queryFn: () => getStoreLocations(api),
    staleTime: 5 * 60 * 1000,
  });
}
