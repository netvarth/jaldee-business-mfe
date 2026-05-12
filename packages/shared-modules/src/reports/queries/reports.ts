import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiScope } from "../../useApiScope";
import { buildScopedListQueryKey } from "../../queryKeys";
import { useSharedModulesContext } from "../../context";
import {
  deleteSavedReport,
  generateReport,
  getReportCreateConfig,
  getGeneratedReportCount,
  getGeneratedReportDetail,
  getReportCatalog,
  getSavedReportCount,
  listGeneratedReports,
  listSavedReports,
} from "../services/reports";
import type { ReportGeneratePayload, ReportsPageFilter, SavedReportRow } from "../types";

export function useReportCatalog() {
  const scopedApi = useApiScope();
  const { account, product, user } = useSharedModulesContext();

  return useQuery({
    queryKey: ["report-catalog", scopedApi.apiScope, scopedApi.locationId, product, account.id, user.id],
    queryFn: () => getReportCatalog(scopedApi, { account, product, user }),
  });
}

export function useGeneratedReports(filter: ReportsPageFilter) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("generated-reports", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => listGeneratedReports(scopedApi, filter),
  });
}

export function useGeneratedReportCount(filter: ReportsPageFilter) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("generated-reports-count", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getGeneratedReportCount(scopedApi, filter),
  });
}

export function useGeneratedReportDetail(token?: string) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: ["generated-report-detail", scopedApi.apiScope, scopedApi.locationId, token],
    queryFn: () => getGeneratedReportDetail(scopedApi, token || ""),
    enabled: Boolean(token),
  });
}

export function useSavedReports(filter: ReportsPageFilter) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("saved-reports", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => listSavedReports(scopedApi, filter),
  });
}

export function useSavedReportCount(filter: ReportsPageFilter) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("saved-reports-count", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getSavedReportCount(scopedApi, filter),
  });
}

export function useGenerateReport() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReportGeneratePayload) => generateReport(scopedApi, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-reports"] });
    },
  });
}

export function useReportCreateConfig(reportType?: string, reportName?: string) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: ["report-create-config", scopedApi.apiScope, scopedApi.locationId, reportType, reportName],
    queryFn: () => getReportCreateConfig(scopedApi, reportType || "", reportName),
    enabled: Boolean(reportType),
  });
}

export function useDeleteSavedReport() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (report: SavedReportRow) => deleteSavedReport(scopedApi, report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
    },
  });
}
