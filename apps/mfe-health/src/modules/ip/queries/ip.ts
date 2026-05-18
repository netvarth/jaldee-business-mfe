import { useQuery } from "@tanstack/react-query";
import { useSharedModulesContext } from "@jaldee/shared-modules";
import { loadIpDataset, loadIpDetail } from "../services/ip";

export function useIpDataset() {
  const { api, location } = useSharedModulesContext();

  return useQuery({
    queryKey: ["ip-dataset", location?.id ?? null],
    queryFn: () => loadIpDataset(api, location?.id ?? null),
    staleTime: 60_000,
  });
}

export function useIpPatients() {
  const datasetQuery = useIpDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.patients ?? [],
  };
}

export function useIpAdmissions() {
  const datasetQuery = useIpDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.admissions ?? [],
  };
}

export function useIpBeds() {
  const datasetQuery = useIpDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.beds ?? [],
  };
}

export function useIpBilling() {
  const datasetQuery = useIpDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.billing ?? [],
  };
}

export function useIpDetail(ipUid?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: ["ip-detail", ipUid ?? null],
    queryFn: () => loadIpDetail(api, ipUid || ""),
    enabled: Boolean(ipUid),
  });
}

