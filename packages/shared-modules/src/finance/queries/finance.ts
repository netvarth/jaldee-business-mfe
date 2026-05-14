import { useQuery } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { useApiScope } from "../../useApiScope";
import {
  assembleFinanceDataset,
  financeAmt,
  financeExtractList,
  financeFormatDate,
  normalizeFinanceExpenses,
  normalizeFinanceInvoices,
  normalizeFinancePayments,
  normalizeFinanceVendors,
} from "../services/finance";

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
        api.get<unknown>("provider/jp/finance/vendor", listParams),
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
