import { useMemo } from "react";
import { getIpDataset } from "../services/ip";

export function useIpDataset() {
  return useMemo(() => getIpDataset(), []);
}

export function useIpPatients() {
  return useIpDataset().patients;
}

export function useIpAdmissions() {
  return useIpDataset().admissions;
}

export function useIpBeds() {
  return useIpDataset().beds;
}

export function useIpBilling() {
  return useIpDataset().billing;
}
