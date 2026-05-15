import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { useApiScope } from "../../useApiScope";
import {
  assembleFinanceDataset,
  financeAmt,
  financeExtractList,
  financeFormatDate,
  normalizeFinanceActivityLogs,
  normalizeFinanceExpenseBreakdown,
  normalizeFinanceExpenses,
  normalizeFinanceInvoiceCategories,
  normalizeFinanceInvoices,
  normalizeFinancePayments,
  normalizeFinanceRevenue,
  normalizeFinanceVendorStatuses,
  normalizeFinanceVendors,
} from "../services/finance";
import type { FinanceExpenseBreakdownRow, FinanceInvoiceCreatePayload } from "../types";

export type FinanceExpenseBreakdownFilter = "TODAY" | "PREVIOUS_WEEK" | "CURRENT_MONTH" | "PREVIOUS_MONTH" | "DATE_RANGE";

function mapExpenseBreakdownFrequency(filter: FinanceExpenseBreakdownFilter): string {
  switch (filter) {
    case "PREVIOUS_MONTH":
      return "LAST_MONTH";
    case "PREVIOUS_WEEK":
      return "WEEKLY";
    case "CURRENT_MONTH":
      return "THIS_MONTH";
    case "TODAY":
      return "TODAY";
    case "DATE_RANGE":
      return "NONE";
    default:
      return "TODAY";
  }
}

function extractFinanceAccountId(payload: unknown): string {
  const profile = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const accountId = String(profile.accountId ?? "").trim();
  if (accountId) {
    return accountId;
  }

  const profileId = String(profile.id ?? "").trim();
  if (profileId) {
    return profileId;
  }

  return "";
}

function isPlaceholderLocationId(locationId: string | null | undefined): boolean {
  if (!locationId) {
    return true;
  }

  return locationId === "loc-default";
}

function shouldIncludeExpenseComparisonLocation(location: { id?: string | null; name?: string | null } | null | undefined): boolean {
  if (!location) {
    return false;
  }

  if (isPlaceholderLocationId(location.id)) {
    return false;
  }

  const normalizedName = String(location.name ?? "").trim().toLowerCase();
  return normalizedName !== "all locations";
}

export function useFinanceDataset() {
  const { product, location } = useSharedModulesContext();
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-shared-dataset", product, location?.id, location?.name],
    queryFn: async () => {
      const locParams = location?.id ? { params: { "locationId-eq": location.id } } : undefined;
      const listParams = location?.id ? { params: { "locationId-eq": location.id, from: 0, count: 15 } } : { params: { from: 0, count: 15 } };

      const analyticsParams = location?.id ? { params: { frequency: "TODAY", config_metric_type: "FINANCE_GRAPH", locationId: location.id } } : { params: { frequency: "TODAY", config_metric_type: "FINANCE_GRAPH" } };

      const graphWeeklyPayload = {
        category: "WEEKLY",
        type: "BARCHART",
        filter: location?.id ? { config_metric_type: "FINANCE_GRAPH", locationId: location.id } : { config_metric_type: "FINANCE_GRAPH" },
      };

      const graphMonthlyPayload = {
        category: "MONTHLY",
        type: "BARCHART",
        filter: location?.id ? { config_metric_type: "FINANCE_GRAPH", locationId: location.id } : { config_metric_type: "FINANCE_GRAPH" },
      };

      const [invoicesResult, paymentsResult, expensesResult, payoutsResult, vendorsResult, cashResult, totalsResult, countResult, analyticsResult, graphWeeklyResult, graphMonthlyResult] = await Promise.allSettled([
        api.get<unknown>("provider/jp/finance/invoice/general", listParams),
        api.get<unknown>("provider/jp/finance/paymentsIn", listParams),
        api.get<unknown>("provider/jp/finance/expense", listParams),
        api.get<unknown>("provider/jp/finance/paymentsOut", listParams),
        api.get<unknown>("provider/vendor", { params: { from: 0, count: 8 } }),
        api.get<unknown>("provider/jp/finance/cashbalance"),
        api.get<unknown>("provider/jp/finance/paymentsIn/paymentsInOut", listParams),
        api.get<number>("provider/jp/finance/paymentsIn/paymentsInOut/count", locParams),
        api.get<unknown>("provider/analytics", analyticsParams),
        api.put<unknown>("provider/analytics/graph", graphWeeklyPayload),
        api.put<unknown>("provider/analytics/graph", graphMonthlyPayload),
      ]);

      const paymentsNormal = paymentsResult.status === "fulfilled" ? normalizeFinancePayments((paymentsResult.value as { data: unknown }).data) : [];
      const totalsData = totalsResult.status === "fulfilled" ? financeExtractList((totalsResult.value as { data: unknown }).data) : [];
      const totalsPayments = normalizeFinancePayments(totalsData.filter((t) => {
        const i = t as Record<string, unknown>;
        return i?.["isPaymentsIn"] === true || String(i?.["paymentType"] || i?.["type"] || "").toLowerCase().includes("in") || i?.["paymentsInUid"];
      }));
      const payments = [...paymentsNormal, ...totalsPayments];

      const invoices = invoicesResult.status === "fulfilled" ? normalizeFinanceInvoices((invoicesResult.value as { data: unknown }).data) : [];
      const expensesRaw = expensesResult.status === "fulfilled" ? normalizeFinanceExpenses((expensesResult.value as { data: unknown }).data) : [];
      const payoutsRaw = payoutsResult.status === "fulfilled" ? normalizeFinanceExpenses((payoutsResult.value as { data: unknown }).data) : [];
      const totalsPayouts = normalizeFinanceExpenses(totalsData.filter((t) => {
        const i = t as Record<string, unknown>;
        return i?.["isPaymentsIn"] === false || (!i?.["isPaymentsIn"] && !String(i?.["paymentType"] || i?.["type"] || "").toLowerCase().includes("in") && !i?.["paymentsInUid"]);
      }));

      const expenses = [...expensesRaw, ...payoutsRaw, ...totalsPayouts];
      const vendors = vendorsResult.status === "fulfilled" ? normalizeFinanceVendors((vendorsResult.value as { data: unknown }).data) : [];

      const cashPayload = cashResult.status === "fulfilled" ? (cashResult.value as { data: any }).data : null;
      const cashInHand = cashPayload ? financeAmt(cashPayload.cashInHand ?? cashPayload.balance) : 0;
      const cashUpdatedOn = cashPayload ? financeFormatDate(cashPayload.updatedOn ?? cashPayload.updatedDate) : "-";

      const totalCount = countResult.status === "fulfilled" ? Number((countResult.value as { data: number }).data) || 0 : 0;

      const analyticsData = analyticsResult.status === "fulfilled" ? (analyticsResult.value as { data: any }).data?.metricValues || [] : [];
      const accountBalanceObj = analyticsData.find((m: any) => m.metricId === 178);
      const accountBalance = accountBalanceObj ? Number(accountBalanceObj.amount || 0) : 10;

      const graphRes = graphWeeklyResult.status === "fulfilled" ? (graphWeeklyResult.value as { data: any }).data : [];
      const graphItem = Array.isArray(graphRes) ? graphRes[0] : graphRes;
      const labels = graphItem?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const expAmounts = graphItem?.datasets?.[0]?.data?.[0]?.amount || [80, 150, 100, 200, 250, 120, 180];
      const revAmounts = graphItem?.datasets?.[0]?.data?.[1]?.amount || [120, 250, 180, 320, 450, 210, 390];
      const payoutAmounts = graphItem?.datasets?.[0]?.data?.[2]?.amount || [40, 90, 70, 110, 160, 80, 140];

      const statistics = labels.map((label: string, idx: number) => ({
        label: String(label).slice(0, 3),
        value: Number(revAmounts[idx] || 0),
        revenue: Number(revAmounts[idx] || 0),
        payout: Number(payoutAmounts[idx] || 0),
        expense: Number(expAmounts[idx] || 0),
      }));

      const graphMonthlyRes = graphMonthlyResult.status === "fulfilled" ? (graphMonthlyResult.value as { data: any }).data : [];
      const graphMonthlyItem = Array.isArray(graphMonthlyRes) ? graphMonthlyRes[0] : graphMonthlyRes;
      const monthlyLabels = graphMonthlyItem?.labels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mExpAmounts = graphMonthlyItem?.datasets?.[0]?.data?.[0]?.amount || [300, 400, 350, 500, 600, 450, 700, 800, 750, 900, 850, 950];
      const mRevAmounts = graphMonthlyItem?.datasets?.[0]?.data?.[1]?.amount || [500, 700, 600, 850, 950, 800, 1100, 1250, 1150, 1400, 1300, 1550];
      const mPayoutAmounts = graphMonthlyItem?.datasets?.[0]?.data?.[2]?.amount || [150, 250, 200, 300, 400, 250, 450, 500, 450, 600, 550, 650];

      const monthlyStatistics = monthlyLabels.map((label: string, idx: number) => ({
        label: String(label).slice(0, 3),
        value: Number(mRevAmounts[idx] || 0),
        revenue: Number(mRevAmounts[idx] || 0),
        payout: Number(mPayoutAmounts[idx] || 0),
        expense: Number(mExpAmounts[idx] || 0),
      }));

      return assembleFinanceDataset(product, location?.name, invoices, payments, expenses, vendors, cashInHand, cashUpdatedOn, totalCount, accountBalance, statistics, monthlyStatistics);
    },
  });
}

export function useFinanceInvoices() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.invoices ?? [],
  };
}

export function useFinancePaginatedInvoices(filters: Record<string, any>) {
  const api = useApiScope();
  
  return useQuery({
    queryKey: ["finance-paginated-invoices", filters],
    queryFn: async () => {
      // Add default filter out of PREPAYMENT_PENDING_INVOICE and FAILED_ORDER_INVOICE if no billStatus filter
      const apiFilters = { ...filters };
      if (!apiFilters["billStatus-eq"] && !apiFilters["billStatus-in"] && !apiFilters["billStatus"]) {
        apiFilters["billStatus-neq"] = ["PREPAYMENT_PENDING_INVOICE", "FAILED_ORDER_INVOICE"].join(",");
      }

      const response = await api.get<unknown>("provider/jp/finance/invoice/general", { params: apiFilters });
      return normalizeFinanceInvoices((response as { data: unknown }).data);
    },
  });
}

export function useFinanceInvoicesCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-invoices-count", filters],
    queryFn: async () => {
      const apiFilters = { ...filters };
      if (!apiFilters["billStatus-eq"] && !apiFilters["billStatus-in"] && !apiFilters["billStatus"]) {
        apiFilters["billStatus-neq"] = ["PREPAYMENT_PENDING_INVOICE", "FAILED_ORDER_INVOICE"].join(",");
      }
      
      const response = await api.get<number>("provider/jp/finance/invoice/general/count", { params: apiFilters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinanceInvoiceCategories() {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-invoice-categories"],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/category/list", {
        params: {
          "categoryType-eq": "Invoice",
          "status-eq": "Enable",
        },
      });
      return normalizeFinanceInvoiceCategories((response as { data: unknown }).data);
    },
  });
}

export function useFinanceCategories(categoryType: "Expense" | "PaymentsInOut" | "Invoice") {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-categories", categoryType],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/category/list", {
        params: {
          "categoryType-eq": categoryType,
          "status-eq": "Enable",
        },
      });
      return normalizeFinanceInvoiceCategories((response as { data: unknown }).data);
    },
  });
}

export function useFinanceStatuses(categoryType: "Expense" | "PaymentsInOut" | "Invoice") {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-statuses", categoryType],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/status/list", {
        params: {
          "categoryType-eq": categoryType,
          "status-eq": "Enable",
        },
      });
      return normalizeFinanceInvoiceCategories((response as { data: unknown }).data);
    },
  });
}

export function useCreateFinanceInvoice() {
  const api = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FinanceInvoiceCreatePayload) => {
      const response = await api.post<unknown>("provider/jp/finance/invoice/general", payload);
      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-paginated-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance-paginated-invoices-count"] });
      queryClient.invalidateQueries({ queryKey: ["finance-shared-dataset"] });
    },
  });
}

function useFinanceCreateMutation(endpoint: string, invalidateKeys: string[]) {
  const api = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post<unknown>(endpoint, payload);
      return (response as { data: unknown }).data;
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["finance-shared-dataset"] });
    },
  });
}

export function useCreateFinanceExpense() {
  return useFinanceCreateMutation("provider/jp/finance/expense", [
    "finance-paginated-expenses",
    "finance-paginated-expenses-count",
  ]);
}

export function useCreateFinanceRevenue() {
  return useFinanceCreateMutation("provider/jp/finance/paymentsIn", [
    "finance-paginated-revenue",
    "finance-paginated-revenue-count",
  ]);
}

export function useCreateFinancePayout() {
  return useFinanceCreateMutation("provider/jp/finance/paymentsOut", [
    "finance-paginated-expenses",
    "finance-paginated-expenses-count",
  ]);
}

export function useCreateFinanceCategory() {
  return useFinanceCreateMutation("provider/jp/finance/category", [
    "finance-invoice-categories",
    "finance-categories",
  ]);
}

export function useCreateFinanceVendor() {
  return useFinanceCreateMutation("provider/vendor", [
    "finance-paginated-vendors",
    "finance-paginated-vendors-count",
  ]);
}

export function useFinancePaginatedExpenses(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-expenses", filters],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/expense", { params: filters });
      return normalizeFinanceExpenses((response as { data: unknown }).data);
    },
  });
}

export function useFinanceExpensesCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-expenses-count", filters],
    queryFn: async () => {
      const response = await api.get<number>("provider/jp/finance/expense/count", { params: filters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinancePaginatedRevenue(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-revenue", filters],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/paymentsIn", { params: filters });
      return normalizeFinanceRevenue((response as { data: unknown }).data);
    },
  });
}

export function useFinanceRevenueCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-revenue-count", filters],
    queryFn: async () => {
      const response = await api.get<number>("provider/jp/finance/paymentsIn/count", { params: filters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinancePaginatedPayouts(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-payouts", filters],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/paymentsOut", { params: filters });
      return normalizeFinanceExpenses((response as { data: unknown }).data);
    },
  });
}

export function useFinancePayoutsCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-payouts-count", filters],
    queryFn: async () => {
      const response = await api.get<number>("provider/jp/finance/paymentsOut/count", { params: filters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinanceActivityLogs(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-activity-logs", filters],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/jp/finance/log", { params: filters });
      return normalizeFinanceActivityLogs((response as { data: unknown }).data);
    },
  });
}

export function useFinanceActivityLogsCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-activity-logs-count", filters],
    queryFn: async () => {
      const response = await api.get<number>("provider/jp/finance/log/count", { params: filters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinancePaginatedVendors(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-vendors", filters],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/vendor", { params: filters });
      return normalizeFinanceVendors((response as { data: unknown }).data);
    },
  });
}

export function useFinanceVendorsCount(filters: Record<string, any>) {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-paginated-vendors-count", filters],
    queryFn: async () => {
      const response = await api.get<number>("provider/vendor/count", { params: filters });
      return Number((response as { data: number }).data) || 0;
    },
  });
}

export function useFinanceVendorStatuses() {
  const api = useApiScope();

  return useQuery({
    queryKey: ["finance-vendor-statuses", "enabled"],
    queryFn: async () => {
      const response = await api.get<unknown>("provider/vendor/status", { params: { "isEnabled-eq": "Enable" } });
      return normalizeFinanceVendorStatuses((response as { data: unknown }).data);
    },
  });
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

export function useFinanceExpenseBreakdown(
  filter: FinanceExpenseBreakdownFilter,
  fromDate?: string,
  toDate?: string,
) {
  const { account, location } = useSharedModulesContext();
  const api = useApiScope();
  const businessProfileQuery = useQuery({
    queryKey: ["finance-business-profile", account.id],
    queryFn: () => api.get<unknown>("provider/bProfile").then((response) => response.data),
    staleTime: 300_000,
  });
  const resolvedAccountId = extractFinanceAccountId(businessProfileQuery.data);
  const expenseComparisonLocationId = shouldIncludeExpenseComparisonLocation(location) ? location?.id ?? null : null;

  return useQuery<FinanceExpenseBreakdownRow[]>({
    queryKey: ["finance-expense-breakdown", resolvedAccountId, expenseComparisonLocationId, filter, fromDate, toDate],
    queryFn: async () => {
      if (filter === "DATE_RANGE" && (!fromDate || !toDate)) {
        return [];
      }

      const params: Record<string, unknown> = {
        accId: resolvedAccountId,
        metricId: 168,
        categoryType: "Expense",
        from: 0,
        count: 6,
      };

      if (expenseComparisonLocationId) {
        params.locationId = expenseComparisonLocationId;
      }

      if (filter === "DATE_RANGE") {
        params.frequency = mapExpenseBreakdownFrequency(filter);
        params.dateFrom = fromDate;
        params.dateTo = toDate;
      } else {
        params.frequency = mapExpenseBreakdownFrequency(filter);
      }

      const response = await api.get<unknown>("provider/jp/finance/analytics/categorywise/comparison", { params });
      return normalizeFinanceExpenseBreakdown((response as { data: unknown }).data);
    },
    enabled: businessProfileQuery.isSuccess && Boolean(resolvedAccountId),
  });
}

export function useFinanceExpenseCount(
  enabled = true,
) {
  const { api } = useSharedModulesContext();

  return useQuery<number>({
    queryKey: ["finance-expense-count"],
    queryFn: async () => {
      const response = await api.get<number>("provider/jp/finance/expense/count");
      return Number((response as { data: number }).data) || 0;
    },
    enabled,
  });
}

export function useFinanceSummaries() {
  const datasetQuery = useFinanceDataset();
  return {
    ...datasetQuery,
    data: datasetQuery.data?.summaries ?? [],
  };
}
