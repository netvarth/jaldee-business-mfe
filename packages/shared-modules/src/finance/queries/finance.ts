import { useQuery } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { getFinanceDataset } from "../services/finance";

export function useFinanceDataset() {
  const { product, location } = useSharedModulesContext();
  return useQuery({
    queryKey: ["finance-shared-dataset", product, location?.id, location?.name],
    queryFn: () => Promise.resolve(getFinanceDataset(product, location?.name)),
  });
}

export function useFinanceInvoices() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.invoices ?? [],
  };
}

export function useFinancePayments() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.payments ?? [],
  };
}

export function useFinanceReports() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.reports ?? [],
  };
}

export function useFinanceSummaries() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.summaries ?? [],
  };
}
