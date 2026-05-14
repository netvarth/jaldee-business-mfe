import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi } from "./financeApi";
import type {
  FinanceActivity,
  FinanceCashEntry,
  FinanceCategory,
  FinanceEstimate,
  FinanceInvoice,
  FinanceLedgerEntry,
  FinancePayable,
  FinancePayment,
  FinanceReceivable,
  FinanceReportMetric,
  FinanceStatus,
  FinanceStatusItem,
  FinanceSummaryCard,
  FinanceVendor,
  FinanceExpense,
} from "./financeData";
import { formatCurrency } from "./financeData";

type FinanceLiveState = {
  financeSummaryCards: FinanceSummaryCard[];
  financeInvoices: FinanceInvoice[];
  financePayments: FinancePayment[];
  financeEstimates: FinanceEstimate[];
  financeReportMetrics: FinanceReportMetric[];
  financeVendors: FinanceVendor[];
  financeLedgerEntries: FinanceLedgerEntry[];
  financeReceivables: FinanceReceivable[];
  financePayables: FinancePayable[];
  financeExpenses: FinanceExpense[];
  financeCategories: FinanceCategory[];
  financeStatuses: FinanceStatusItem[];
  financeCashInHand: FinanceCashEntry[];
  financeCashRegisters: FinanceCashEntry[];
  financeActivityLogs: FinanceActivity[];
  financeStatistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[];
  monthlyStatistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[];
  totalTransactionCount: number;
  accountBalance: number;
  loading: boolean;
};

const defaultState: FinanceLiveState = {
  financeSummaryCards: [],
  financeInvoices: [],
  financePayments: [],
  financeEstimates: [],
  financeReportMetrics: [],
  financeVendors: [],
  financeLedgerEntries: [],
  financeReceivables: [],
  financePayables: [],
  financeExpenses: [],
  financeCategories: [],
  financeStatuses: [],
  financeCashInHand: [],
  financeCashRegisters: [],
  financeActivityLogs: [],
  financeStatistics: [],
  monthlyStatistics: [],
  totalTransactionCount: 0,
  accountBalance: 10,
  loading: true,
};

const FinanceLiveContext = createContext<FinanceLiveState>(defaultState);

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.content,
    payload.records,
    payload.data,
    payload.items,
    payload.results,
    payload.list,
    payload.invoices,
    payload.payments,
    payload.vendors,
    payload.categories,
    payload.statuses,
    payload.logs,
    payload.customers,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function text(value: any, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function amount(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: any): string {
  if (!value || value === "-") return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(value);
  }
}

function mapInvoiceStatus(value: any): FinanceStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("partiallypaid") || normalized.includes("partially")) return "Partially Paid";
  if (normalized.includes("paid") || normalized.includes("settled")) return "Paid";
  if (normalized.includes("overdue") || normalized.includes("due")) return "Overdue";
  return "Pending";
}

function normalizeInvoices(payload: any): FinanceInvoice[] {
  return extractList(payload).map((item: any, index) => {
    const pcd = item.providerConsumerData;
    const fullName = pcd?.firstName ? `${pcd.firstName} ${pcd.lastName ?? ""}`.trim() : undefined;
    return {
      id: text(item.invoiceNum || item.uid || item.invoiceUid || item.invoiceId || item.uuid || item.id || `invoice-${index}`),
      customer: text(fullName || item.customerName || item.consumerName || item.customer?.name || item.invoiceFor || item.providerConsumer?.firstName),
      category: text(item.categoryName || item.invoiceCategoryName || item.category?.name || item.invoiceCategory || item.notes),
      amount: amount(item.netTotal || item.totalAmount || item.amount || item.total || item.invoiceAmount),
      dueDate: formatDate(item.dueDate || item.invoiceDate || item.createdDate),
      status: mapInvoiceStatus(item.billPaymentStatus || item.billStatus || item.status || item.paymentStatus),
    };
  });
}

function normalizePayments(payload: any): FinancePayment[] {
  return extractList(payload).map((item: any, index) => {
    const pcd = item?.providerConsumerDto;
    const fullName = pcd?.firstName ? `${pcd.firstName} ${pcd.lastName ?? ""}`.trim() : undefined;
    return {
      id: text(item.paymentsInUid || item.payInOutUid || item.uid || item.id || item.paymentRefId || item.receiptNo || `payment-${index}`),
      payer: text(fullName || item.customerName || item.consumerName || item.payerName || item.accountName || item.vendorName),
      method: text(item.paymentMode || item.method || item.paymentMethod, "Unknown"),
      amount: amount(item.amount || item.paymentAmount || item.receivedAmount || item.netTotal),
      receivedOn: formatDate(item.receivedDate || item.paymentDate || item.receivedOn || item.createdDate || item.date),
    };
  });
}

function normalizeVendors(payload: any): FinanceVendor[] {
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.vendorId || `vendor-${index}`),
    name: text(item.name || item.vendorName || `${item.firstName || ""} ${item.lastName || ""}`.trim()),
    category: text(item.categoryName || item.category || item.vendorCategory, "General"),
    payable: amount(item.payable || item.amountDue || item.balanceAmount || item.pendingAmount),
    lastPayment: formatDate(item.lastPayment || item.lastPaymentDate || item.updatedDate || item.createdDate),
    status: String(item.status || item.vendorStatus || "").toLowerCase().includes("hold") ? "On Hold" : "Active",
  }));
}

function normalizeLedger(payload: any): FinanceLedgerEntry[] {
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.refId || `ledger-${index}`),
    account: text(item.accountName || item.name || item.creditSystemName || item.description),
    type: String(item.type || item.transactionType || item.entryType || "").toLowerCase().includes("debit") ? "Debit" : "Credit",
    amount: amount(item.amount || item.credit || item.debit),
    balance: amount(item.balance || item.balanceAmount || item.currentBalance),
    updatedOn: formatDate(item.updatedOn || item.updatedDate || item.createdDate || item.date),
  }));
}

function normalizeReceivables(invoices: FinanceInvoice[]): FinanceReceivable[] {
  return invoices
    .filter((item) => item.status !== "Paid" && item.amount > 0)
    .map((item, index) => ({
      id: `receivable-${item.id}-${index}`,
      customer: item.customer,
      invoiceId: item.id,
      amountDue: item.amount,
      ageing: "-",
      owner: "Finance",
    }));
}

function normalizePayables(payload: any): FinancePayable[] {
  return extractList(payload).map((item: any, index) => {
    const pcd = item?.providerConsumerDto;
    const fullName = pcd?.firstName ? `${pcd.firstName} ${pcd.lastName ?? ""}`.trim() : undefined;
    return {
      id: text(item.paymentsOutUid || item.payInOutUid || item.uid || item.id || item.paymentOutUid || `payable-${index}`),
      vendor: text(fullName || item.vendorName || item.name || item.payeeName),
      billRef: text(item.billRef || item.refNo || item.invoiceNumber || item.referenceNo),
      amountDue: amount(item.amountDue || item.amount || item.totalAmount || item.pendingAmount),
      dueOn: formatDate(item.paidDate || item.receivedDate || item.dueDate || item.paymentDate || item.createdDate),
      priority: amount(item.amountDue || item.amount) > 50000 ? "High" : amount(item.amountDue || item.amount) > 10000 ? "Medium" : "Low",
    };
  });
}

function normalizeExpenses(payload: any): FinanceExpense[] {
  return extractList(payload).map((item: any, index) => {
    const pcd = item?.providerConsumerDto;
    const fullName = pcd?.firstName ? `${pcd.firstName} ${pcd.lastName ?? ""}`.trim() : undefined;
    return {
      id: text(item.paymentsOutUid || item.payInOutUid || item.uid || item.id || item.expenseUid || `expense-${index}`),
      title: text(item.title || item.categoryName || item.name || item.description || item.notes),
      category: text(item.categoryName || item.expenseCategoryName || item.category || "General"),
      owner: text(fullName || item.owner || item.createdByName || item.assignedTo || "Finance"),
      amount: amount(item.amount || item.totalAmount || item.expenseAmount),
      bookedOn: formatDate(item.paidDate || item.receivedDate || item.bookedOn || item.expenseDate || item.createdDate),
    };
  });
}

function normalizeCategories(payload: any): FinanceCategory[] {
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.categoryId || `category-${index}`),
    name: text(item.categoryName || item.name),
    usageCount: amount(item.usageCount || item.count || item.linkedCount),
    linkedTo: text(item.categoryType || item.linkedTo || item.type, "General"),
  }));
}

function normalizeStatuses(payload: any): FinanceStatusItem[] {
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.statusId || `status-${index}`),
    name: text(item.statusName || item.name),
    appliesTo: text(item.categoryType || item.appliesTo || item.type, "General"),
    colorHint: text(item.colorHint || item.color || item.statusColor, "Default"),
  }));
}

function normalizeCashEntries(payload: any): FinanceCashEntry[] {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && ("cashInHand" in payload || "balance" in payload)) {
    return [{
      id: "cash-balance",
      source: "Cash Inhand",
      amount: amount(payload.cashInHand ?? payload.balance),
      updatedOn: formatDate(payload.updatedOn ?? payload.updatedDate),
      owner: "Finance",
    }];
  }
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.payId || `cash-${index}`),
    source: text(item.source || item.accountName || item.locationName || item.description, "Cash Reserve"),
    amount: amount(item.amount || item.balance || item.currentBalance),
    updatedOn: formatDate(item.updatedOn || item.updatedDate || item.createdDate),
    owner: text(item.owner || item.userName || item.createdByName || "Finance"),
  }));
}

function normalizeActivity(payload: any): FinanceActivity[] {
  return extractList(payload).map((item: any, index) => ({
    id: text(item.uid || item.id || item.logId || `activity-${index}`),
    action: text(item.action || item.event || item.activity || item.description),
    actor: text(item.actor || item.userName || item.createdByName || "System"),
    target: text(item.target || item.referenceId || item.entityName || item.module),
    timestamp: formatDate(item.timestamp || item.createdDate || item.updatedDate),
  }));
}

function buildSummaryCards(invoices: FinanceInvoice[], receivables: FinanceReceivable[], payables: FinancePayable[]): FinanceSummaryCard[] {
  const grossRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const openReceivables = receivables.reduce((sum, item) => sum + item.amountDue, 0);
  const openPayables = payables.reduce((sum, item) => sum + item.amountDue, 0);
  const settledInvoices = invoices.filter((invoice) => invoice.status === "Paid").length;

  return [
    { label: "Gross Revenue", value: formatCurrency(grossRevenue), accent: "emerald" },
    { label: "Open Receivables", value: formatCurrency(openReceivables), accent: "amber" },
    { label: "Open Payables", value: formatCurrency(openPayables), accent: "rose" },
    { label: "Settled Invoices", value: String(settledInvoices), accent: "indigo" },
  ];
}

function buildReportMetrics(invoices: FinanceInvoice[], payments: FinancePayment[], receivables: FinanceReceivable[]): FinanceReportMetric[] {
  const paidInvoices = invoices.filter((invoice) => invoice.status === "Paid");
  const averageInvoiceValue = invoices.length ? invoices.reduce((sum, item) => sum + item.amount, 0) / invoices.length : 0;
  const collectionEfficiency = invoices.length ? Math.round((paidInvoices.length / invoices.length) * 100) : 0;
  const averagePaymentValue = payments.length ? payments.reduce((sum, item) => sum + item.amount, 0) / payments.length : 0;
  const overdueExposure = receivables.reduce((sum, item) => sum + item.amountDue, 0);

  return [
    { id: "rep-1", metric: "Collection efficiency", value: `${collectionEfficiency}%`, note: "Share of invoices currently marked paid." },
    { id: "rep-2", metric: "Average invoice value", value: formatCurrency(averageInvoiceValue), note: "Average across loaded invoices." },
    { id: "rep-3", metric: "Average payment value", value: formatCurrency(averagePaymentValue), note: "Average across loaded incoming payments." },
    { id: "rep-4", metric: "Overdue exposure", value: formatCurrency(overdueExposure), note: "Derived from unpaid invoice totals." },
  ];
}

export function FinanceLiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceLiveState>(defaultState);
  const mfeProps = useMFEProps();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const locFilter = mfeProps.location?.id ? { "locationId-eq": mfeProps.location.id } : {};
      const listFilter = mfeProps.location?.id ? { "locationId-eq": mfeProps.location.id, from: 0, count: 15 } : { from: 0, count: 15 };

      const analyticsFilter = mfeProps.location?.id ? { frequency: "TODAY", config_metric_type: "FINANCE_GRAPH", locationId: mfeProps.location.id } : { frequency: "TODAY", config_metric_type: "FINANCE_GRAPH" };

      const graphWeeklyPayload = {
        category: "WEEKLY",
        type: "BARCHART",
        filter: mfeProps.location?.id ? { config_metric_type: "FINANCE_GRAPH", locationId: mfeProps.location.id } : { config_metric_type: "FINANCE_GRAPH" },
      };

      const graphMonthlyPayload = {
        category: "MONTHLY",
        type: "BARCHART",
        filter: mfeProps.location?.id ? { config_metric_type: "FINANCE_GRAPH", locationId: mfeProps.location.id } : { config_metric_type: "FINANCE_GRAPH" },
      };

      const [
        invoicesResult,
        paymentsResult,
        vendorsResult,
        ledgerResult,
        payablesResult,
        expensesResult,
        categoriesResult,
        statusesResult,
        cashResult,
        activityResult,
        totalsResult,
        totalsCountResult,
        analyticsResult,
        graphWeeklyResult,
        graphMonthlyResult,
      ] = await Promise.allSettled([
        financeApi.invoices.listGeneral(listFilter),
        financeApi.revenue.list(listFilter),
        financeApi.vendors.list({ from: 0, count: 8 }),
        financeApi.ledger.list(listFilter),
        financeApi.payables.list(listFilter),
        financeApi.expenses.list(listFilter),
        financeApi.categories.byFilter({}),
        financeApi.statuses.byFilter({}),
        financeApi.cash.balance(),
        financeApi.activity.list(listFilter),
        financeApi.totals.list(listFilter),
        financeApi.totals.count(locFilter),
        financeApi.analytics.all(analyticsFilter),
        financeApi.analytics.graph([graphWeeklyPayload]),
        financeApi.analytics.graph([graphMonthlyPayload]),
      ]);

      if (!mounted) {
        return;
      }

      const financeInvoices = invoicesResult.status === "fulfilled" ? normalizeInvoices(invoicesResult.value.data) : [];
      const paymentsNormal = paymentsResult.status === "fulfilled" ? normalizePayments(paymentsResult.value.data) : [];
      const totalsData = totalsResult.status === "fulfilled" ? extractList(totalsResult.value.data) : [];
      const totalsPayments = normalizePayments(totalsData.filter((t) => t?.isPaymentsIn === true || String(t?.paymentType || t?.type || "").toLowerCase().includes("in") || t?.paymentsInUid));
      const financePayments = [...paymentsNormal, ...totalsPayments];

      const financeVendors = vendorsResult.status === "fulfilled" ? normalizeVendors(vendorsResult.value.data) : [];
      const financeLedgerEntries = ledgerResult.status === "fulfilled" ? normalizeLedger(ledgerResult.value.data) : [];

      const payablesNormal = payablesResult.status === "fulfilled" ? normalizePayables(payablesResult.value.data) : [];
      const totalsPayables = normalizePayables(totalsData.filter((t) => t?.isPaymentsIn === false || (!t?.isPaymentsIn && !String(t?.paymentType || t?.type || "").toLowerCase().includes("in") && !t?.paymentsInUid)));
      const financePayables = [...payablesNormal, ...totalsPayables];

      const expensesNormal = expensesResult.status === "fulfilled" ? normalizeExpenses(expensesResult.value.data) : [];
      const totalsExpenses = normalizeExpenses(totalsData.filter((t) => t?.isPaymentsIn === false || (!t?.isPaymentsIn && !String(t?.paymentType || t?.type || "").toLowerCase().includes("in") && !t?.paymentsInUid)));
      const financeExpenses = [...expensesNormal, ...totalsExpenses];

      const financeCategories = categoriesResult.status === "fulfilled" ? normalizeCategories(categoriesResult.value.data) : [];
      const financeStatuses = statusesResult.status === "fulfilled" ? normalizeStatuses(statusesResult.value.data) : [];
      const financeCashInHand = cashResult.status === "fulfilled" ? normalizeCashEntries(cashResult.value.data) : [];
      const financeActivityLogs = activityResult.status === "fulfilled" ? normalizeActivity(activityResult.value.data) : [];
      const financeReceivables = normalizeReceivables(financeInvoices);
      const totalTransactionCount = totalsCountResult.status === "fulfilled" ? Number(totalsCountResult.value.data) || 0 : 0;

      const analyticsData = analyticsResult.status === "fulfilled" ? (analyticsResult.value.data as any)?.metricValues || [] : [];
      const accountBalanceObj = analyticsData.find((m: any) => m.metricId === 178);
      const accountBalance = accountBalanceObj ? Number(accountBalanceObj.amount || 0) : 10;

      const graphRes = graphWeeklyResult.status === "fulfilled" ? graphWeeklyResult.value : [];
      const graphItem = Array.isArray(graphRes) ? graphRes[0] : graphRes;
      const labels = graphItem?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const expAmounts = graphItem?.datasets?.[0]?.data?.[0]?.amount || [80, 150, 100, 200, 250, 120, 180];
      const revAmounts = graphItem?.datasets?.[0]?.data?.[1]?.amount || [120, 250, 180, 320, 450, 210, 390];
      const payoutAmounts = graphItem?.datasets?.[0]?.data?.[2]?.amount || [40, 90, 70, 110, 160, 80, 140];
      const financeStatistics = labels.map((label: string, idx: number) => ({
        label: String(label).slice(0, 3),
        value: Number(revAmounts[idx] || [120, 250, 180, 320, 450, 210, 390][idx] || 0),
        revenue: Number(revAmounts[idx] || [120, 250, 180, 320, 450, 210, 390][idx] || 0),
        payout: Number(payoutAmounts[idx] || [40, 90, 70, 110, 160, 80, 140][idx] || 0),
        expense: Number(expAmounts[idx] || [80, 150, 100, 200, 250, 120, 180][idx] || 0),
      }));

      const graphMonthlyRes = graphMonthlyResult.status === "fulfilled" ? graphMonthlyResult.value : [];
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

      setState({
        financeInvoices,
        financePayments,
        financeEstimates: [],
        financeReportMetrics: buildReportMetrics(financeInvoices, financePayments, financeReceivables),
        financeVendors,
        financeLedgerEntries,
        financeReceivables,
        financePayables,
        financeExpenses,
        financeCategories,
        financeStatuses,
        financeCashInHand,
        financeCashRegisters: financeCashInHand,
        financeActivityLogs,
        financeStatistics,
        monthlyStatistics,
        financeSummaryCards: buildSummaryCards(financeInvoices, financeReceivables, financePayables),
        totalTransactionCount,
        accountBalance,
        loading: false,
      });
    }

    load().catch((error) => {
      console.error("[mfe-finance] Failed to load finance data", error);
      if (mounted) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <FinanceLiveContext.Provider value={value}>{children}</FinanceLiveContext.Provider>;
}

export function useFinanceLiveData() {
  return useContext(FinanceLiveContext);
}
