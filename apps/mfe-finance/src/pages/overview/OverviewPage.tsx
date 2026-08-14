import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, BarChart, Button, DataTable, DatePicker, EmptyState, Icon, Popover, SectionCard, Select, StatCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { formatCurrency, getStatusVariant } from "../../lib/financeData";
import type { FinanceExpenseBreakdown, FinanceReceivable, FinanceExpense } from "../../lib/financeData";
import { financeApi } from "../../lib/financeApi";
import { useFinanceLiveData } from "../../lib/financeLive";
import { normalizeReceivableRows } from "../../lib/receivableMappers";
import { normalizePayableRows } from "../../lib/payableMappers";
import { FeedCard, PageShell, QuickActions } from "../../components/FinancePageLayout";

function toFinanceRoute(routePath: string) {
  const n = String(routePath || "").trim();
  if (!n) return "/";
  return n.replace(/^\/finance(?=\/|$)/, "") || "/";
}

type Accent = "indigo" | "emerald" | "amber" | "rose";
type ExpenseBreakdownFilter = "TODAY" | "PREVIOUS_WEEK" | "CURRENT_MONTH" | "PREVIOUS_MONTH" | "DATE_RANGE";
type QuickAction = {
  label: string; path: string;
  icon: "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";
  tone: string; note: string;
};

function normalizeExpenseBreakdownResponse(payload: any): FinanceExpenseBreakdown[] {
  const metricValues = Array.isArray(payload?.metricValues) ? payload.metricValues : [];
  const expenseMetric = metricValues.find((item: any) =>
    Number(item?.metricId) === 168 || String(item?.metricName || "").toUpperCase() === "FINANCE_EXPENSE_TOTAL"
  );
  const compareData = Array.isArray(expenseMetric?.compareData) ? expenseMetric.compareData : [];
  return compareData.map((item: any, index: number) => ({
    id: String(item?.categoryName || `expense-breakdown-${index}`),
    category: String(item?.categoryName || "General"),
    amountDifference: Number(item?.amountDifference) || 0,
    percentage: Number(item?.percentage) || 0,
    increased: Boolean(item?.increased),
  }));
}

function OverviewPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { financeCashInHand, financeExpenses, financeStatistics, monthlyStatistics } = useFinanceLiveData();
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [financeInvoices, setFinanceInvoices] = useState<Array<{
    id: string;
    detailUid: string;
    customer: string;
    amount: number;
    status: string;
  }>>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [financePayments, setFinancePayments] = useState<Array<{
    id: string;
    payer: string;
    amount: number;
    receivedOn: string;
  }>>([]);
  const [financePayables, setFinancePayables] = useState<Array<{
    id: string;
    vendor: string;
    amountDue: number;
    dueOn: string;
  }>>([]);
  const [financeVendors, setFinanceVendors] = useState<Array<{
    id: string;
    name: string;
    category: string;
  }>>([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Revenue" | "Payout">("All");
  const [statsRange, setStatsRange] = useState("today");
  const [statsChartRange, setStatsChartRange] = useState("week");
  const [expenseBreakdownFilter, setExpenseBreakdownFilter] = useState<ExpenseBreakdownFilter>("PREVIOUS_MONTH");
  const [expenseBreakdownFrom, setExpenseBreakdownFrom] = useState("");
  const [expenseBreakdownTo, setExpenseBreakdownTo] = useState("");
  const [expenseBreakdownRows, setExpenseBreakdownRows] = useState<FinanceExpenseBreakdown[]>([]);

  useEffect(() => {
    let active = true;

    function extractRecords(payload: any) {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.content)) return payload.content;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data?.content)) return payload.data.content;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.results)) return payload.results;
      return [];
    }

    async function loadOverview() {
      setOverviewLoading(true);

      try {
        const [invoiceResponse, vendorResponse, paymentInResponse, paymentOutResponse] = await Promise.allSettled([
          financeApi.invoices.listGeneral<any>({ page: 0, size: 5 }),
          financeApi.vendors.search<any>({
            page: 0,
            size: 5,
            sort: [{ field: "createdAt", direction: "DESC" }],
          }),
          financeApi.revenue.list<any>({
            page: 0,
            size: 100,
          }),
          financeApi.payables.list<any>({
            page: 0,
            size: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        if (invoiceResponse.status === "fulfilled") {
          const invoiceRecords = extractRecords(invoiceResponse.value.data);
          setFinanceInvoices(
            invoiceRecords.map((item: any, index: number) => ({
              id: String(item.invoiceNum || item.invoiceId || item.uid || `invoice-${index}`),
              detailUid: String(item.uid || item.invoiceUid || item.invoiceEncId || item.id || item.invoiceId || `invoice-${index}`),
              customer: String(item.consumerName || item.customerName || item.invoiceFor || item.userName || "-"),
              amount: Number(item.netRate || item.netTotal || item.totalAmount || item.amountDue || 0) || 0,
              status: String(item.invoiceStatus || item.invoicePaymentStatus || item.billStatus || item.status || "New"),
            })),
          );
          setInvoiceCount(Number(invoiceResponse.value.data?.totalElements ?? invoiceResponse.value.data?.total ?? invoiceRecords.length ?? 0) || 0);
        } else {
          console.error("[mfe-finance] Failed to load overview invoices", invoiceResponse.reason);
          setFinanceInvoices([]);
          setInvoiceCount(0);
        }

        if (vendorResponse.status === "fulfilled") {
          const vendorRecords = extractRecords(vendorResponse.value.data);
          setFinanceVendors(
            vendorRecords.map((item: any, index: number) => ({
              id: String(item.uid ?? item.id ?? item.vendorId ?? `vendor-${index}`),
              name: String(item.name ?? item.vendorName ?? "-"),
              category: String(item.vendorCategoryName ?? item.categoryName ?? item.vendorCategory ?? item.category ?? "-"),
            })),
          );
          setVendorCount(Number(vendorResponse.value.data?.totalElements ?? vendorResponse.value.data?.total ?? vendorRecords.length ?? 0) || 0);
        } else {
          console.error("[mfe-finance] Failed to load overview vendors", vendorResponse.reason);
          setFinanceVendors([]);
          setVendorCount(0);
        }

        if (paymentInResponse.status === "fulfilled") {
          const paymentInRecords = extractRecords(paymentInResponse.value.data);
          setFinancePayments(
            normalizeReceivableRows(paymentInRecords).map((item) => ({
              id: item.id,
              payer: item.customer,
              amount: item.amountDue,
              receivedOn: item.date,
            })),
          );
        } else {
          console.error("[mfe-finance] Failed to load overview payments-in", paymentInResponse.reason);
          setFinancePayments([]);
        }

        if (paymentOutResponse.status === "fulfilled") {
          const paymentOutRecords = extractRecords(paymentOutResponse.value.data);
          setFinancePayables(
            normalizePayableRows(paymentOutRecords).map((item) => ({
              id: item.id,
              vendor: item.vendor,
              amountDue: item.amountDue,
              dueOn: item.date,
            })),
          );
        } else {
          console.error("[mfe-finance] Failed to load overview payments-out", paymentOutResponse.reason);
          setFinancePayables([]);
        }
      } finally {
        if (active) {
          setOverviewLoading(false);
        }
      }
    }

    void loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const filteredFinancePayments = useMemo(() => {
    if (statsRange === "all") return financePayments;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return financePayments.filter((p) => {
      const d = new Date(p.receivedOn);
      if (Number.isNaN(d.getTime())) return true;
      if (statsRange === "today") return d.getTime() >= now.getTime();
      if (statsRange === "week") {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        return d.getTime() >= w.getTime();
      }
      if (statsRange === "month") {
        const m = new Date(now);
        m.setDate(m.getDate() - 30);
        return d.getTime() >= m.getTime();
      }
      return true;
    });
  }, [financePayments, statsRange]);

  const filteredFinancePayables = useMemo(() => {
    if (statsRange === "all") return financePayables;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return financePayables.filter((p) => {
      const d = new Date(p.dueOn);
      if (Number.isNaN(d.getTime())) return true;
      if (statsRange === "today") return d.getTime() >= now.getTime();
      if (statsRange === "week") {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        return d.getTime() >= w.getTime();
      }
      if (statsRange === "month") {
        const m = new Date(now);
        m.setDate(m.getDate() - 30);
        return d.getTime() >= m.getTime();
      }
      return true;
    });
  }, [financePayables, statsRange]);

  const dashboardActions: QuickAction[] = [
    { label: "Create Invoice", path: "/finance/invoice/newInvoice", icon: "packagePlus", tone: "bg-indigo-50 text-indigo-600", note: "Issue new billing" },
    { label: "Create Expense", path: "/finance/expense/new", icon: "alert", tone: "bg-rose-50 text-rose-600", note: "Book operations cost" },
    { label: "Discounts", path: "/finance/discount", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Manage discounts" },
    { label: "Coupons", path: "/finance/coupons", icon: "history", tone: "bg-lime-50 text-lime-700", note: "Manage coupons" },
    { label: "Taxes", path: "/finance/taxes", icon: "list", tone: "bg-sky-50 text-sky-700", note: "Manage taxes" },
    { label: "Add Revenue", path: "/finance/receivables/create", icon: "trend", tone: "bg-emerald-50 text-emerald-600", note: "Record collections" },
    { label: "Create Payout", path: "/finance/payable/create", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Queue vendor payout" },
    { label: "Create Vendor", path: "/finance/vendors/create", icon: "globe", tone: "bg-sky-50 text-sky-600", note: "Add vendor profile" },
    { label: "Invoices", path: "/finance/invoice", icon: "list", tone: "bg-indigo-50 text-indigo-600", note: "See all invoices" },
    { label: "Order Invoices", path: "/finance/receivables", icon: "layers", tone: "bg-violet-50 text-violet-600", note: "Track order billing" },
    { label: "Expenses", path: "/finance/expense", icon: "alert", tone: "bg-rose-50 text-rose-600", note: "Monitor spends" },
    { label: "Revenue", path: "/finance/receivables", icon: "trend", tone: "bg-emerald-50 text-emerald-600", note: "Review inflows" },
    { label: "Payouts", path: "/finance/payable", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Manage outflows" },
    { label: "Vendors", path: "/finance/vendors", icon: "globe", tone: "bg-slate-100 text-slate-700", note: "Vendor directory" },
    { label: "Cash Reserve", path: "/finance/cashInhand", icon: "database", tone: "bg-emerald-50 text-emerald-600", note: "Cash in hand" },
    { label: "Cash Register", path: "/finance/cashRegister", icon: "database", tone: "bg-lime-50 text-lime-700", note: "Register balances" },
    { label: "Ledger", path: "/finance/ledger", icon: "warehouse", tone: "bg-sky-50 text-sky-700", note: "Account movements" },
    { label: "Activity Log", path: "/finance/activity-log", icon: "history", tone: "bg-slate-100 text-slate-700", note: "Audit trail" },
    { label: "Edit Actions", path: "/finance/settings", icon: "list", tone: "bg-slate-100 text-slate-700", note: "Configure dashboard" },
  ];

  const transactionRows = useMemo(() => {
    const revenueRows = financePayments.map((payment) => {
      const maskedId = payment.id.length > 5 ? `${payment.id.slice(0, 5)}***` : payment.id;
      return {
        id: payment.id,
        title: `Order/${maskedId}`,
        subtitle: payment.payer || "Unknown",
        kind: "Revenue" as const,
        date: payment.receivedOn,
        amount: payment.amount,
        note: "Revenue ↙",
      };
    });

    const payablePayouts = financePayables.map((payable) => {
      const maskedId = payable.id.length > 5 ? `${payable.id.slice(0, 5)}***` : payable.id;
      return {
        id: payable.id,
        title: `Order/${maskedId}`,
        subtitle: payable.vendor || "Unknown",
        kind: "Payout" as const,
        date: payable.dueOn,
        amount: payable.amountDue,
        note: "Payout ↗",
      };
    });

    const expensePayouts = financeExpenses.map((expense) => {
      const maskedId = expense.id.length > 5 ? `${expense.id.slice(0, 5)}***` : expense.id;
      return {
        id: expense.id,
        title: `Order/${maskedId}`,
        subtitle: expense.owner || "Unknown",
        kind: "Payout" as const,
        date: expense.bookedOn,
        amount: expense.amount,
        note: "Payout ↗",
      };
    });

    const payoutRows = [...payablePayouts, ...expensePayouts];

    const combined = [...revenueRows, ...payoutRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (transactionFilter === "Revenue") {
      return combined.filter((row) => row.kind === "Revenue");
    }

    if (transactionFilter === "Payout") {
      return combined.filter((row) => row.kind === "Payout");
    }

    return combined;
  }, [financePayables, financeExpenses, financePayments, transactionFilter]);

  const statisticsData = statsChartRange === "month" ? monthlyStatistics : financeStatistics;

  const accountBalance = 0;
  const cashInHandTotal = financeCashInHand.reduce((sum, entry) => sum + entry.amount, 0);
  const revenueTotal = filteredFinancePayments.reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = 0;
  const payoutTotal = filteredFinancePayables.reduce((sum, entry) => sum + entry.amountDue, 0);
  const latestCashUpdate = financeCashInHand.at(-1)?.updatedOn ?? "-";
  const recentInvoices = financeInvoices.slice(0, 5);
  const recentVendors = financeVendors.slice(0, 5);

  const userRecord = (mfeProps.user ?? {}) as Record<string, unknown>;
  const userName = String(userRecord.firstName || userRecord.name || userRecord.userName || "Sachin Sathish").trim();

  return (
    <div className="bg-transparent px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Welcome back, {userName} 👋
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
              Finance Manager Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Keep a tab on your Finance and manage your finance operations smoothly.
            </p>
          </div>
        </div>

        <QuickActions actions={dashboardActions} />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-semibold text-[var(--color-text-primary)]">Account Balance</div>
                <div className="w-32">
                  <Select
                    options={[
                      { value: "today", label: "Today" },
                      { value: "week", label: "Previous Week" },
                      { value: "month", label: "Current Month" },
                      { value: "all", label: "All Time" },
                    ]}
                    value={statsRange}
                    onChange={(e) => setStatsRange(e.target.value)}
                  />
                </div>
              </div>
              <div className="relative overflow-hidden mt-4 flex min-h-[92px] items-start justify-between rounded-2xl bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-active)_100%)] px-6 py-6 text-white shadow-lg border border-[var(--color-primary-active)]">
                {/* Decorative background shapes */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-white/5 blur-lg pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">Your Account</div>
                  <div className="text-[16px] font-semibold text-white mt-0.5">Balance</div>
                </div>
                <div className="relative z-10 pt-1 text-right text-3xl font-extrabold tracking-tight">{formatCurrency(accountBalance)}</div>
              </div>

              <div className="mt-8 text-[18px] font-semibold text-[var(--color-text-primary)]">Recent Summary</div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-5 pr-4 py-4 shadow-sm hover:shadow-md transition duration-200">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenue</div>
                  <div className="mt-1 text-[22px] font-extrabold text-[var(--color-text-primary)]">{formatCurrency(revenueTotal)}</div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-5 pr-4 py-4 shadow-sm hover:shadow-md transition duration-200">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Expenses</div>
                  <div className="mt-1 text-[22px] font-extrabold text-[var(--color-text-primary)]">{formatCurrency(expenseTotal)}</div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-5 pr-4 py-4 shadow-sm hover:shadow-md transition duration-200">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Payout</div>
                  <div className="mt-1 text-[22px] font-extrabold text-[var(--color-text-primary)]">{formatCurrency(payoutTotal)}</div>
                </div>
              </div>

              <div className="mt-6 flex gap-6 border-b border-slate-200 text-sm font-semibold">
                {(["All", "Revenue", "Payout"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTransactionFilter(tab)}
                    className={`border-b-2 px-1 pb-2.5 transition duration-150 ${transactionFilter === tab
                        ? "border-[var(--color-primary)] text-[var(--color-primary)] font-bold"
                        : "border-transparent text-slate-500 hover:text-[var(--color-primary)]"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {transactionRows.slice(0, 15).map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => mfeProps.navigate(row.kind === "Revenue" ? "/finance/payments" : "/finance/payable")}
                    className="flex w-full items-center justify-between gap-4 py-4 px-2 text-left transition rounded-xl hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {row.kind === "Revenue" ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19M5 19h10M5 19V9" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 19L19 5M19 5H9M19 5v10" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{row.title}</div>
                        <div className="text-xs text-slate-500 truncate">{row.subtitle || "-"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{row.date}</div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(row.amount)}</div>
                      <div className={`mt-0.5 text-xs font-semibold ${row.kind === "Revenue" ? "text-emerald-600" : "text-rose-600"}`}>
                        {row.note}
                      </div>
                    </div>
                  </button>
                ))}
                {!transactionRows.length ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    {overviewLoading ? "Loading transactions..." : "No transactions found."}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex justify-start">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      transactionFilter === "Revenue"
                        ? toFinanceRoute("/finance/receivables")
                        : transactionFilter === "Payout"
                          ? toFinanceRoute("/finance/payable")
                          : toFinanceRoute("/finance/total"),
                    )
                  }
                  className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition"
                >
                  See All Transactions ({transactionRows.length}) &rarr;
                </button>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-semibold text-[var(--color-text-primary)]">Cash Inhand</div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Refresh"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="relative overflow-hidden mt-4 flex min-h-[92px] items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#374151_0%,#111827_100%)] px-6 py-6 text-white shadow-lg">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/5 blur-lg pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Amount</div>
                  <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">{formatCurrency(cashInHandTotal)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => mfeProps.navigate("/finance/cashRegister")}
                  className="relative z-10 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  Cash Register &rarr;
                </button>
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Last Updated: {latestCashUpdate}
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-semibold text-[var(--color-text-primary)]">Expenses Breakdown</div>
                <div className="w-48">
                  <Select
                    options={[
                      { value: "TODAY", label: "Today" },
                      { value: "PREVIOUS_WEEK", label: "Previous Week" },
                      { value: "CURRENT_MONTH", label: "Current Month" },
                      { value: "PREVIOUS_MONTH", label: "Previous Month" },
                      { value: "DATE_RANGE", label: "Date Range" },
                    ]}
                    value={expenseBreakdownFilter}
                    onChange={(e) => setExpenseBreakdownFilter(e.target.value as ExpenseBreakdownFilter)}
                  />
                </div>
              </div>
              {expenseBreakdownFilter === "DATE_RANGE" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DatePicker value={expenseBreakdownFrom} max={expenseBreakdownTo || undefined} onChange={(e) => setExpenseBreakdownFrom(e.target.value)} />
                  <DatePicker value={expenseBreakdownTo} min={expenseBreakdownFrom || undefined} onChange={(e) => setExpenseBreakdownTo(e.target.value)} />
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                {expenseBreakdownRows.length ? (
                  expenseBreakdownRows.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-800">{item.category}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.percentage === 0 
                                ? "bg-slate-100 text-slate-600" 
                                : item.increased 
                                  ? "bg-rose-50 text-rose-700" 
                                  : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {item.percentage === 0 ? "No change" : item.increased ? "↑" : "↓"} {Math.abs(item.percentage).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-slate-900">{formatCurrency(item.amountDifference)}</div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.percentage === 0 ? "bg-slate-300" : item.increased ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.max(6, Math.min(Math.abs(item.percentage), 100))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <img
                      src="/assets/images/finance/no-data.gif"
                      alt="No Data Found"
                      className="h-36 w-36 object-contain mx-auto"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="mt-4 text-[15px] font-bold text-slate-900">No Expenses Found for Today</div>
                  </div>
                )}
              </div>
              <div className="mt-4 text-left border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => mfeProps.navigate("/finance/expense")}
                  className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition"
                >
                  See All Expenses ({expenseBreakdownRows.length}) &rarr;
                </button>
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[22px] font-semibold text-slate-900">Statistics</div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: "week", label: "Last 7 Days" },
                      { value: "month", label: "Past 12 Months" },
                    ]}
                    value={statsChartRange}
                    onChange={(e) => setStatsChartRange(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-600">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />Revenue</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />Payout</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" />Expense</div>
              </div>
              <div className="mt-4">
                <BarChart data={statisticsData} />
              </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <FeedCard title="Invoices" actionLabel="+ Add New" onAction={() => mfeProps.navigate("/finance/invoice/newInvoice")}>
                <div className="space-y-0">
                  {recentInvoices.map((invoice, index) => (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => mfeProps.navigate(`/finance/invoice/view/${invoice.detailUid || invoice.id}`)}
                      className="block w-full border-b border-slate-100 py-3.5 text-left transition hover:bg-slate-50 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {index === 0 ? <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] mb-0.5">Most Recent</div> : null}
                          <div className="truncate text-sm font-semibold text-slate-700">Invoice : #{invoice.id.replace("INV-", "")}</div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-900">{invoice.customer}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {invoice.status === "Paid" ? "Fully Paid" : invoice.status}
                          </div>
                        </div>
                        <div className="pt-1 text-sm font-medium text-slate-700">{formatCurrency(invoice.amount)}</div>
                      </div>
                    </button>
                  ))}
                  {!recentInvoices.length ? (
                    <div className="py-6 text-sm text-slate-500">
                      {overviewLoading ? "Loading invoices..." : "No invoices found."}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex justify-start">
                  <button type="button" onClick={() => navigate(toFinanceRoute("/finance/invoice"))} className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition">
                    See All Invoices ({invoiceCount}) &rarr;
                  </button>
                </div>
              </FeedCard>

              <FeedCard title="Vendors" actionLabel="+ Add New" onAction={() => mfeProps.navigate("/finance/vendors/create")}>
                <div className="space-y-0">
                  {recentVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => mfeProps.navigate(`/finance/vendors/${vendor.id}`)}
                      className="flex w-full items-center justify-between border-b border-slate-100 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                          <Icon name="globe" className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{vendor.name}</div>
                        </div>
                      </div>
                      <div className="text-slate-400 transition group-hover:translate-x-1">&rarr;</div>
                    </button>
                  ))}
                  {!recentVendors.length ? (
                    <div className="py-6 text-sm text-slate-500">
                      {overviewLoading ? "Loading vendors..." : "No vendors found."}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex justify-start">
                  <button type="button" onClick={() => navigate(toFinanceRoute("/finance/vendors"))} className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition">
                    See All Vendors ({vendorCount}) &rarr;
                  </button>
                </div>
              </FeedCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewPage;
