import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  BarChart,
  Button,
  DataTable,
  DatePicker,
  Dialog,
  DialogFooter,
  EmptyState,
  Icon,
  Input,
  PageErrorBoundary,
  PageHeader,
  Popover,
  SectionCard,
  StatCard,
  Select,
  Textarea,
  Switch,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import {
  formatCurrency,
  getStatusVariant,
} from "./lib/financeData";
import type { FinanceExpenseBreakdown, FinanceReceivable, FinanceExpense } from "./lib/financeData";
import { financeApi } from "./lib/financeApi";
import { FinanceLiveProvider, useFinanceLiveData } from "./lib/financeLive";
import FinanceInvoiceForm from "./FinanceInvoiceForm";

type Accent = "indigo" | "emerald" | "amber" | "rose";

type QuickAction = {
  label: string;
  path: string;
  icon: "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";
  tone: string;
  note: string;
};

type ExpenseBreakdownFilter = "TODAY" | "PREVIOUS_WEEK" | "CURRENT_MONTH" | "PREVIOUS_MONTH" | "DATE_RANGE";
type SequenceTemplateFeature = "FINANCE" | "BOOKING" | "HEALTHCARE" | "BASE_CRM" | "PLATFORM" | "AUTH" | "E_COMMERCE" | "LENDING" | "HR";
type FinanceFeatureModule = "FINANCE_CORE" | "FINANCE_INVOICE" | "FINANCE_PAYMENT" | "FINANCE_EXPENSE";
type DiscountCalculationType = "FIXED_AMOUNT" | "FIXED_PCT";
type DiscountType = "PREDEFINED" | "ONDEMAND";
type DiscountStatus = "ACTIVE" | "INACTIVE" | "RETIRED";
type CouponStatus = "ACTIVE" | "INACTIVE" | "RETIRED";

const sequenceTemplateFeatureOptions: Array<{ value: SequenceTemplateFeature; label: string }> = [
  { value: "FINANCE", label: "Finance" },
  { value: "BOOKING", label: "Booking" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "BASE_CRM", label: "Base CRM" },
  { value: "PLATFORM", label: "Platform" },
  { value: "AUTH", label: "Auth" },
  { value: "E_COMMERCE", label: "E-Commerce" },
  { value: "LENDING", label: "Lending" },
  { value: "HR", label: "HR" },
];

const financeFeatureModuleOptions: Array<{ value: FinanceFeatureModule; label: string }> = [
  { value: "FINANCE_CORE", label: "Finance Core" },
  { value: "FINANCE_INVOICE", label: "Finance Invoice" },
  { value: "FINANCE_PAYMENT", label: "Finance Payment" },
  { value: "FINANCE_EXPENSE", label: "Finance Expense" },
];

function toFinanceRoute(path: string) {
  const normalized = String(path || "").trim();
  if (!normalized) return "/";
  const stripped = normalized.replace(/^\/finance(?=\/|$)/, "");
  return stripped || "/";
}

function normalizeExpenseBreakdownResponse(payload: any): FinanceExpenseBreakdown[] {
  const metricValues = Array.isArray(payload?.metricValues) ? payload.metricValues : [];
  const expenseMetric = metricValues.find(
    (item: any) =>
      Number(item?.metricId) === 168 ||
      String(item?.metricName || "").toUpperCase() === "FINANCE_EXPENSE_TOTAL"
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

function normalizeReceivableRows(payload: any): FinanceReceivable[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

  return records.map((item: any, index: number) => {
    const providerConsumer = item?.providerConsumerDto;
    const customerName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.customerName || item?.consumerName || item?.payerName || item?.accountName || "Unknown");
    const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate;
    const invoiceNo = item?.invoiceNum || item?.receiptNum || item?.paymentLabel || item?.paymentRefId || "-";
    const reference = item?.referenceNo || "-";
    const invoiceCategory = item?.paymentCategory || item?.comingFromCategoryName || item?.purpose || "-";
    const status = item?.statusName || item?.gatewayStatus || "New";

    return {
      id: String(item?.paymentsInUid || item?.payInOutUid || item?.uid || item?.id || `receivable-${index}`),
      customer: customerName,
      invoiceId: String(invoiceNo),
      amountDue: Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0,
      ageing: String(paymentDate || "-"),
      owner: String(item?.createdByName || item?.userName || item?.owner || "Finance"),
      date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      revenueCategory: String(item?.categoryName || item?.paymentLabel || "-"),
      invoiceCategory: String(invoiceCategory),
      invoiceNo: String(invoiceNo),
      reference: String(reference),
      patientName: String(item?.consumerName || customerName || "-"),
      vendor: String(item?.vendorName || item?.userName || "-"),
      location: String(item?.locationName || "-"),
      status: String(status),
    };
  });
}

function normalizePayableRows(payload: any): FinancePayable[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

  return records.map((item: any, index: number) => {
    const providerConsumer = item?.providerConsumerDto;
    const vendorName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.vendorName || item?.consumerName || item?.payerName || item?.accountName || "-");
    const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate;
    const amount = Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0;
    const patientName = String(item?.consumerName || "-");
    const reference = String(item?.referenceNo || "-");
    const payoutCategory = String(item?.paymentCategory || item?.categoryName || "-");
    const expenseCategory = String(item?.comingFromCategoryName || "-");
    const status = String(item?.statusName || item?.gatewayStatus || "-");
    const location = String(item?.locationName || "-");

    return {
      id: String(item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || `payable-${index}`),
      vendor: vendorName,
      billRef: reference,
      amountDue: amount,
      dueOn: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      priority: amount > 50000 ? "High" : amount > 10000 ? "Medium" : "Low",
      date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      payoutCategory,
      expenseCategory,
      reference,
      patientName,
      location,
      status,
    };
  });
}

function normalizeExpenseRows(payload: any): FinanceExpense[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

  return records.map((item: any, index: number) => {
    const providerConsumer = item?.providerConsumerDto;
    const ownerName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.createdByName || item?.userName || item?.owner || "Finance");
    const bookedDate = item?.paidDate || item?.receivedDate || item?.bookedOn || item?.expenseDate || item?.createdDate;
    const title = String(item?.expenseFor || item?.title || item?.categoryName || item?.name || item?.description || item?.notes || "-");
    const category = String(item?.categoryName || item?.expenseCategoryName || item?.category || "General");
    const amount = Number(item?.amount || item?.totalAmount || item?.expenseAmount || 0) || 0;

    return {
      id: String(item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || item?.expenseUid || `expense-${index}`),
      title,
      category,
      owner: ownerName,
      amount,
      bookedOn: bookedDate ? new Date(bookedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
    };
  });
}

function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </div>
    </div>
  );
}

function FinanceFeatureLayout({
  title,
  subtitle,
  actions,
  stats,
  main,
  aside,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: string; accent: Accent }>;
  main: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <PageShell title={title} subtitle={subtitle} actions={actions}>
      {stats && stats.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </div>
      ) : null}

      <div className={`grid gap-6 ${aside ? "xl:grid-cols-[1.45fr_0.85fr]" : ""}`}>
        <div className="space-y-6">{main}</div>
        {aside ? <div className="space-y-6">{aside}</div> : null}
      </div>
    </PageShell>
  );
}

function QuickActions({
  actions,
}: {
  actions: QuickAction[];
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => navigate(toFinanceRoute(action.path))}
          className="min-h-[92px] w-[110px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.tone}`}>
            <Icon name={action.icon} className="h-4 w-4" />
          </div>
          <div className="mt-3 text-xs font-semibold leading-4 text-slate-900">{action.label}</div>
        </button>
      ))}
    </div>
  );
}

function DataTableCard<T extends object>({
  title,
  subtitle,
  actions,
  data,
  columns,
  emptyTitle,
  emptyDescription,
  getRowId,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyDescription: string;
  getRowId: (row: T) => string;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[22px] font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
        {actions}
      </div>
      <DataTable
        data={data}
        columns={columns}
        getRowId={getRowId}
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </SectionCard>
  );
}

function FeedCard({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[22px] font-semibold text-slate-900">{title}</div>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="text-base font-semibold text-indigo-700">
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </SectionCard>
  );
}

function SummaryList({
  rows,
}: {
  rows: Array<{ label: string; value: string; note?: string }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{row.label}</div>
              {row.note ? <div className="mt-1 text-sm text-slate-500">{row.note}</div> : null}
            </div>
            <div className="text-base font-semibold text-slate-900">{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewPage() {
  const mfeProps = useMFEProps();
  const {
    financeCashInHand,
    financeInvoices,
    financePayments,
    financePayables,
    financeExpenses,
    financeVendors,
    financeStatistics,
    monthlyStatistics,
    totalTransactionCount,
  } = useFinanceLiveData();
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Revenue" | "Payout">("All");
  const [statsRange, setStatsRange] = useState("today");
  const [statsChartRange, setStatsChartRange] = useState("week");
  const [expenseBreakdownFilter, setExpenseBreakdownFilter] = useState<ExpenseBreakdownFilter>("PREVIOUS_MONTH");
  const [expenseBreakdownFrom, setExpenseBreakdownFrom] = useState("");
  const [expenseBreakdownTo, setExpenseBreakdownTo] = useState("");
  const [expenseBreakdownRows, setExpenseBreakdownRows] = useState<FinanceExpenseBreakdown[]>([]);

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

  useEffect(() => {
    let active = true;

    async function loadExpenseBreakdown() {
      const filter: Record<string, unknown> = {
        metricId: 168,
        categoryType: "Expense",
        from: 0,
        count: 6,
      };

      if (mfeProps.location?.id) {
        filter.locationId = mfeProps.location.id;
      }

      if (expenseBreakdownFilter === "DATE_RANGE") {
        if (!expenseBreakdownFrom || !expenseBreakdownTo) {
          if (active) {
            setExpenseBreakdownRows([]);
          }
          return;
        }
        filter.frequency = "DATE_RANGE";
        filter["date-ge"] = expenseBreakdownFrom;
        filter["date-le"] = expenseBreakdownTo;
      } else {
        filter.frequency = expenseBreakdownFilter;
      }

      try {
        const response = await financeApi.expenses.listByCategory(filter);
        if (active) {
          setExpenseBreakdownRows(normalizeExpenseBreakdownResponse(response.data));
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load expense breakdown", error);
        if (active) {
          setExpenseBreakdownRows([]);
        }
      }
    }

    loadExpenseBreakdown();

    return () => {
      active = false;
    };
  }, [expenseBreakdownFilter, expenseBreakdownFrom, expenseBreakdownTo, mfeProps.location?.id]);

  const dashboardActions: QuickAction[] = [
    { label: "Create Invoice", path: "/finance/invoice/newInvoice", icon: "packagePlus", tone: "bg-indigo-50 text-indigo-600", note: "Issue new billing" },
    { label: "Create Expense", path: "/finance/expense/new", icon: "alert", tone: "bg-rose-50 text-rose-600", note: "Book operations cost" },
    { label: "Discounts", path: "/finance/discount", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Manage discounts" },
    { label: "Coupons", path: "/finance/coupons", icon: "history", tone: "bg-lime-50 text-lime-700", note: "Manage coupons" },
    { label: "Add Revenue", path: "/finance/receivables/create", icon: "trend", tone: "bg-emerald-50 text-emerald-600", note: "Record collections" },
    { label: "Create Payout", path: "/finance/payable/create", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Queue vendor payout" },
    { label: "Create Vendor", path: "/finance/vendors", icon: "globe", tone: "bg-sky-50 text-sky-600", note: "Add vendor profile" },
    { label: "Invoices", path: "/finance/invoice", icon: "list", tone: "bg-indigo-50 text-indigo-600", note: "See all invoices" },
    { label: "Order Invoices", path: "/finance/receivables", icon: "layers", tone: "bg-violet-50 text-violet-600", note: "Track order billing" },
    { label: "Expenses", path: "/finance/expense", icon: "alert", tone: "bg-rose-50 text-rose-600", note: "Monitor spends" },
    { label: "Revenue", path: "/finance/receivables", icon: "trend", tone: "bg-emerald-50 text-emerald-600", note: "Review inflows" },
    { label: "Payouts", path: "/finance/payable", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Manage outflows" },
    { label: "Vendors", path: "/finance/vendors", icon: "globe", tone: "bg-slate-100 text-slate-700", note: "Vendor directory" },
    { label: "Cash Reserve", path: "/finance/cashInhand", icon: "database", tone: "bg-emerald-50 text-emerald-600", note: "Cash in hand" },
    { label: "Cash Register", path: "/finance/cashRegister", icon: "database", tone: "bg-lime-50 text-lime-700", note: "Register balances" },
    { label: "Ledger", path: "/finance/ledger", icon: "warehouse", tone: "bg-sky-50 text-sky-700", note: "Account movements" },
    { label: "Sequence Templates", path: "/finance/sequence-template", icon: "list", tone: "bg-slate-100 text-slate-700", note: "Manage numbering templates" },
    { label: "Sequence Settings", path: "/finance/sequence-settings", icon: "list", tone: "bg-slate-100 text-slate-700", note: "Configure sequence settings" },
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
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="text-base font-semibold text-slate-800">
          Welcome back, {userName} 👋
        </div>

        <div>
          <div className="text-2xl font-bold text-indigo-950">Finance Manager Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">Keep a tab on your Finance and manage your finance operations smoothly.</div>
        </div>

        <QuickActions actions={dashboardActions} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[18px] font-semibold text-slate-900">Account Balance</div>
              <div className="w-28">
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
            <div className="mt-4 flex min-h-[78px] items-start justify-between rounded-xl bg-[#33009c] px-5 py-5 text-white shadow-sm">
              <div>
                <div className="text-sm font-semibold text-white/70">Your Account</div>
                <div className="text-[15px] font-semibold text-white">Balance</div>
              </div>
              <div className="pt-2 text-right text-2xl font-bold">{formatCurrency(accountBalance)}</div>
            </div>

            <div className="mt-6 text-[18px] font-semibold text-slate-900">Recent Transaction</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-sm text-slate-500">Revenue</div>
                <div className="mt-1 text-[22px] font-semibold text-slate-900">{formatCurrency(revenueTotal)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-sm text-slate-500">Expenses</div>
                <div className="mt-1 text-[22px] font-semibold text-slate-900">{formatCurrency(expenseTotal)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-sm text-slate-500">Payout</div>
                <div className="mt-1 text-[22px] font-semibold text-slate-900">{formatCurrency(payoutTotal)}</div>
              </div>
            </div>

            <div className="mt-5 flex gap-7 border-b border-slate-200 text-[15px] font-semibold">
              {(["All", "Revenue", "Payout"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTransactionFilter(tab)}
                  className={`border-b-2 px-0 pb-3 transition ${
                    transactionFilter === tab
                      ? "border-indigo-700 text-indigo-700"
                      : "border-transparent text-slate-800 hover:text-indigo-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
              {transactionRows.slice(0, 15).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => mfeProps.navigate(row.kind === "Revenue" ? "/finance/payments" : "/finance/payable")}
                  className="grid w-full gap-4 py-5 text-left transition hover:bg-slate-50 md:grid-cols-[1.5fr_0.9fr_auto] md:items-start"
                >
                  <div>
                    <div className="text-[14px] font-semibold text-slate-900">{row.title}</div>
                    <div className="text-[14px] text-slate-500">{row.subtitle || "-"}</div>
                    <div className={`mt-1 text-[12px] font-semibold ${row.kind === "Revenue" ? "text-[#42A89D]" : "text-rose-500"}`}>
                      {row.note}
                    </div>
                  </div>
                  <div className="text-[14px] text-slate-500 md:pt-1">{row.date}</div>
                  <div className="text-right text-[14px] font-bold text-slate-900 md:pt-1">{formatCurrency(row.amount)}</div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                mfeProps.navigate(
                  transactionFilter === "Revenue"
                    ? "/finance/payments"
                    : transactionFilter === "Payout"
                      ? "/finance/payable"
                      : "/finance/total",
                )
              }
              className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              See All({totalTransactionCount || transactionRows.length})
            </button>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[18px] font-semibold text-slate-900">Cash Inhand</div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md p-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                title="Refresh"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex min-h-[78px] items-center justify-between rounded-xl bg-[#768087] px-5 py-5 text-white shadow-sm">
              <div>
                <div className="text-sm font-medium text-slate-200">Amount</div>
                <div className="mt-1 text-2xl font-bold text-white">{formatCurrency(cashInHandTotal)}</div>
              </div>
              <button
                type="button"
                onClick={() => mfeProps.navigate("/finance/cashRegister")}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#4B1FCF] transition hover:bg-slate-50 shadow-sm"
              >
                Cash Register &rarr;
              </button>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-400">
              Last Updated On {latestCashUpdate}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[22px] font-semibold text-slate-900">Expenses Breakdown</div>
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
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900">{item.category}</div>
                        <div className={`text-sm ${item.percentage === 0 ? "text-slate-500" : item.increased ? "text-rose-500" : "text-emerald-600"}`}>
                          {item.percentage === 0 ? "No change" : item.increased ? "Increase" : "Decrease"} {Math.abs(item.percentage).toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900">{formatCurrency(item.amountDifference)}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${item.percentage === 0 ? "bg-slate-300" : item.increased ? "bg-rose-400" : "bg-emerald-400"}`}
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
            <div className="mt-4 text-left">
              <button
                type="button"
                onClick={() => mfeProps.navigate("/finance/expense")}
                className="text-sm font-semibold text-[#4B1FCF] hover:text-indigo-800"
              >
                See All Expenses({expenseBreakdownRows.length})
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
            <FeedCard title="Invoices" actionLabel="+ Add New" onAction={() => mfeProps.navigate("/finance/invoice")}>
              <div className="space-y-0">
                {recentInvoices.map((invoice, index) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => mfeProps.navigate(`/finance/master-invoice/${invoice.id}`)}
                    className="block w-full border-b border-slate-200 py-3 text-left last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {index === 0 ? <div className="text-sm font-semibold text-indigo-700">Most Recent</div> : null}
                        <div className="font-semibold text-slate-900">Invoice : #{invoice.id.replace("INV-", "")}</div>
                        <div className="font-semibold text-slate-800">{invoice.customer}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {invoice.status === "Paid" ? "Fully Paid" : invoice.status}
                        </div>
                      </div>
                      <div className="pt-1 font-medium text-slate-700">{formatCurrency(invoice.amount)}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => mfeProps.navigate("/finance/invoice")} className="mt-4 text-lg font-semibold text-indigo-700">
                See All({financeInvoices.length})
              </button>
            </FeedCard>

            <FeedCard title="Vendors" actionLabel="+ Add New" onAction={() => mfeProps.navigate("/finance/vendors")}>
              <div className="space-y-3">
                {recentVendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => mfeProps.navigate("/finance/vendors")}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon name="globe" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{vendor.name}</div>
                        <div className="text-sm text-slate-500">{vendor.category}</div>
                      </div>
                    </div>
                    <div className="text-xl text-slate-400">→</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => mfeProps.navigate("/finance/vendors")} className="mt-4 text-lg font-semibold text-indigo-700">
                See All({financeVendors.length})
              </button>
            </FeedCard>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function DashboardRedirect() {
  return <Navigate to="/finance" replace />;
}

function EstimatesPage() {
  const { financeEstimates } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeEstimates)[number]>[]>(
    () => [
      { key: "id", header: "Estimate" },
      { key: "account", header: "Account" },
      { key: "title", header: "Title" },
      { key: "validUntil", header: "Valid Until" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "stage", header: "Stage" },
    ],
    []
  );

  const approvedValue = financeEstimates.filter((item) => item.stage === "Approved").reduce((sum, item) => sum + item.amount, 0);

  // return (
  //   <FinanceFeatureLayout
  //     title="Estimates"
  //     subtitle="Proposal and estimate tracking aligned with the finance module route structure."
  //     actions={<Button>Create Estimate</Button>}
  //     stats={[
  //       { label: "Total Estimates", value: String(financeEstimates.length), accent: "indigo" },
  //       { label: "Approved Value", value: formatCurrency(approvedValue), accent: "emerald" },
  //       { label: "Pending Review", value: String(financeEstimates.filter((item) => item.stage !== "Approved").length), accent: "amber" },
  //       { label: "Expiring Soon", value: String(financeEstimates.filter((item) => item.stage === "Sent").length), accent: "rose" },
  //     ]}
  //     main={
  //       <DataTableCard
  //         title="Estimate Register"
  //         subtitle="Track proposals before they become invoices or formal billing."
  //         data={financeEstimates}
  //         columns={columns}
  //         getRowId={(row) => row.id}
  //         emptyTitle="No estimates"
  //         emptyDescription="Estimates will appear here."
  //       />
  //     }
  //     aside={
  //       <FeedCard title="Pipeline Summary">
  //         <SummaryList
  //           rows={financeEstimates.map((estimate) => ({
  //             label: estimate.account,
  //             value: formatCurrency(estimate.amount),
  //             note: `${estimate.title} | ${estimate.stage}`,
  //           }))}
  //         />
  //       </FeedCard>
  //     }
  //   />
  // );
}

function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const response = await financeApi.customers.search<any>({
          page: 0,
          size: 200,
          // view: "SUMMARY",
        });
        if (!active) {
          return;
        }

        const records = Array.isArray(response.data?.content)
          ? response.data.content
          : Array.isArray(response.data?.data?.content)
            ? response.data.data.content
            : Array.isArray(response.data?.data)
              ? response.data.data
              : Array.isArray(response.data)
                ? response.data
                : [];

        setCustomers(
          records.map((item: any, index: number) => ({
            uid: String(item.uid ?? item.consumerUid ?? item.id ?? item.userId ?? `consumer-${index}`),
            name: String(
              item.name
              || item.consumerName
              || [item.firstName, item.lastName].filter(Boolean).join(" ")
              || "Consumer"
            ).trim(),
            phone: String(
              item.consumerPhone
              || item.mobile
              || item.mobileNo
              || item.phoneNo
              || item.phone
              || item.primaryPhone
              || "-"
            ).trim(),
            email: String(item.consumerEmail || item.email || item.primaryEmail || "-").trim(),
            address: String(
              item.billedToAddress
              || item.consumerGstAddress
              || item.address
              || item.addressLine1
              || item.location
              || "-"
            ).trim(),
          }))
        );
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to fetch finance consumers", error);
        setCustomers([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { key: "name", header: "Consumer Name", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "address", header: "Address" },
  ], []);

  return (
    <PageShell
      title="Finance Consumers"
      subtitle="Manage consumers available in the finance module."
      actions={<Button onClick={() => navigate("create")}>Create Consumer</Button>}
    >
      <DataTableCard
        title={`Consumers (${customers.length})`}
        subtitle="Finance consumer directory."
        actions={loading ? <span className="text-sm text-slate-500">Loading consumers...</span> : undefined}
        data={customers}
        columns={columns}
        emptyTitle="No finance consumers found"
        emptyDescription="Finance consumers will appear here once available from the finance consumer API."
        getRowId={(row) => row.uid}
      />
    </PageShell>
  );
}

function CustomerCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [consumerType, setConsumerType] = useState("NONE");
  const [status, setStatus] = useState("INACTIVE");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("MALE");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!firstName.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!phoneNo.trim() && !email.trim()) {
      setFormError("Phone number or email is required.");
      return;
    }

    setSaving(true);
    try {
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
      const normalizedPhone = phoneNo.trim().replace(/\s+/g, "");
      const normalizedCountryCode = countryCode.trim() || "+91";
      const phoneE164 = normalizedPhone ? `${normalizedCountryCode}${normalizedPhone}`.replace(/\s+/g, "") : undefined;
      const statusEnum = status === "ACTIVE" ? "Enabled" : "Disabled";

      await financeApi.customers.create({
        consumerType,
        title: title.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phoneNumber: normalizedPhone ? {
          countryCode: normalizedCountryCode,
          number: normalizedPhone,
        } : undefined,
        email: email.trim() || undefined,
        status,
        consumerSnapshot: {
          title: title.trim() || undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          displayName: displayName || firstName.trim(),
          statusEnum,
          phoneE164,
          email: email.trim() || undefined,
          gender,
          dob: dob || undefined,
          systemGeneratedDob: false,
          address: address.trim() || undefined,
          allowLogin: false,
          internationalConsumer: normalizedCountryCode !== "+91",
        },
      });

      navigate("..", { relative: "path", replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to create consumer", error);
      setFormError(error instanceof Error ? error.message : "Could not create consumer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Consumer"
      subtitle="Create a finance consumer using the finance consumer API."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              options={[
                { value: "Mr", label: "Mr" },
                { value: "Ms", label: "Ms" },
                { value: "Mrs", label: "Mrs" },
                { value: "Dr", label: "Dr" },
              ]}
              fullWidth
            />
            <Select
              label="Consumer Type"
              value={consumerType}
              onChange={(event) => setConsumerType(event.target.value)}
              options={[{ value: "NONE", label: "None" }]}
              fullWidth
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" fullWidth />
            <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" fullWidth />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
              fullWidth
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
              fullWidth
            />
          </div>
          <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
            <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} placeholder="+91" fullWidth />
            <Input label="Phone Number" value={phoneNo} onChange={(event) => setPhoneNo(event.target.value)} placeholder="9876543210" fullWidth />
          </div>
          <Input label="Date of Birth" type="date" value={dob} onChange={(event) => setDob(event.target.value)} fullWidth />
          <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="john@example.com" fullWidth />
          <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Add address" />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Consumer"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  function getInvoiceTypeMeta(type: string) {
    const normalized = String(type || "").toUpperCase();
    if (normalized.includes("MASTER")) {
      return { label: "Master Invoice", className: "text-[#0F3D91]" };
    }
    if (normalized.includes("LINKED")) {
      return { label: "Linked Invoice", className: "text-emerald-500" };
    }
    return { label: "Individual Invoice", className: "text-amber-500" };
  }

  function formatInvoicePaymentStatus(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }
    return normalized
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\bnotpaid\b/i, "Not Paid")
      .replace(/\bpartiallypaid\b/i, "Partially Paid")
      .replace(/\bfullypaid\b/i, "Fully Paid")
      .replace(/\bpaid\b/i, "Paid");
  }

  function formatInvoiceStatus(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }
    if (/cancel/i.test(normalized)) {
      return "Cancelled";
    }
    return normalized
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  function getStatusText(row: any) {
    const invoiceStatus = String(row.invoiceStatus || row.status || "");
    const paymentStatus = String(row.invoicePaymentStatus || "");
    const formattedPaymentStatus = formatInvoicePaymentStatus(paymentStatus);
    const formattedInvoiceStatus = formatInvoiceStatus(invoiceStatus);
    const invoiceStatusClass =
      /settled/i.test(invoiceStatus)
        ? "text-emerald-600"
        : /cancel/i.test(invoiceStatus)
          ? "text-rose-600"
          : "text-slate-700";

    return (
      <span className="text-slate-800">
        {formattedPaymentStatus}{" "}
        <span className={invoiceStatusClass}>({formattedInvoiceStatus})</span>
      </span>
    );
  }

  useEffect(() => {
    let active = true;
    async function loadInvoices() {
      setLoading(true);
      try {
        const res = await financeApi.invoices.listGeneral<any>({ from: page * pageSize, count: pageSize });
        if (active) {
          const payload = res.data?.content || res.data || [];
          const normalized = (Array.isArray(payload) ? payload : []).map((item: any, index: number) => ({
            id: String(item.uid || item.invoiceNum || item.invoiceId || `invoice-${index}`),
            detailUid: String(item.uid || item.invoiceUid || item.invoiceEncId || item.id || item.invoiceId || ""),
            invoiceNum: String(item.invoiceNum || item.invoiceId || item.uid || `invoice-${index}`),
            customer: String(item.consumerName || item.customerName || item.invoiceFor || item.userName || ""),
            customerCode:
              item.consumerUid &&
              String(item.consumerUid) !== "00000000-0000-0000-0000-000000000000"
                ? String(item.consumerUid)
                : "",
            assignedFor: String(item.assignedUserName || item.createdByName || item.userName || item.consumerPhone || "-"),
            category: String(item.categoryName || item.invoiceCategoryName || "Finance"),
            product: String(item.product || item.productName || item.featureModule || "FINANCE"),
            invoiceType: String(item.internalInvoiceType || item.invoiceType || item.type || "INDIVIDUAL_INVOICE"),
            amount: Number(item.netRate || item.netTotal || item.totalAmount || item.amountDue || 0),
            amountDue: Number(item.amountDue || item.netRate || item.netTotal || item.totalAmount || 0),
            date: item.invoiceDate || item.createdDate || item.createdAt
              ? new Date(item.invoiceDate || item.createdDate || item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            location: String(item.locationName || item.location || item.locationPlace || item.locationUid || "-"),
            invoiceStatus: String(item.invoiceStatus || item.billStatus || item.status || "New"),
            invoicePaymentStatus: String(item.invoicePaymentStatus || item.paymentStatus || "NotPaid"),
            status: String(item.invoiceStatus || item.billStatus || item.status || item.invoicePaymentStatus || "New"),
          }));
          setInvoices(normalized);
          setTotalRecords(res.data?.totalElements ?? res.data?.length ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch invoices", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInvoices();
    return () => { active = false; };
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : page * pageSize + 1;
  const endRecord = Math.min(totalRecords, (page + 1) * pageSize);
  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    if (totalPages <= 5) {
      return index;
    }
    const start = Math.min(Math.max(page - 2, 0), totalPages - 5);
    return start + index;
  });

  return (
    <PageShell
      title={`Invoice (${totalRecords})`}
      subtitle=" "
      actions={
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value="Finance"
              onChange={() => undefined}
              options={[{ value: "Finance", label: "Finance" }]}
            />
          </div>
          <Button onClick={() => navigate("newInvoice")}>Create Invoice</Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-[#4B1FCF] transition hover:bg-slate-100"
            aria-label="Filter invoices"
          >
            <Icon name="filter" className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <SectionCard className="border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-800">
                <th className="px-4 py-4 font-semibold">ID</th>
                <th className="px-4 py-4 font-semibold">Date</th>
                <th className="px-4 py-4 font-semibold">Invoice For</th>
                <th className="px-4 py-4 font-semibold">Assigned For</th>
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold text-right">Amount (₹)</th>
                <th className="px-4 py-4 font-semibold text-right">Amount Due (₹)</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 font-semibold">Product</th>
                <th className="px-4 py-4 font-semibold">Invoice Type</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.length ? invoices.map((row) => {
                const typeMeta = getInvoiceTypeMeta(row.invoiceType);
                return (
                  <tr key={row.id} className="text-slate-800">
                    <td className="px-4 py-4 font-medium">{row.invoiceNum}</td>
                    <td className="px-4 py-4">{row.date}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{row.customer || "-"}</div>
                      {row.customerCode ? <div className="mt-1 text-xs text-[#4B1FCF]">{row.customerCode}</div> : null}
                    </td>
                    <td className="px-4 py-4">{row.assignedFor || "-"}</td>
                    <td className="px-4 py-4">{row.location || "-"}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(row.amount).replace("₹", "").trim()}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(row.amountDue).replace("₹", "").trim()}</td>
                    <td className="px-4 py-4">{row.category}</td>
                    <td className="px-4 py-4">{row.product}</td>
                    <td className={`px-4 py-4 font-semibold ${typeMeta.className}`}>{typeMeta.label}</td>
                    <td className="px-4 py-4">{getStatusText(row)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => navigate(`view/${row.detailUid || row.id}`)}>
                          View
                        </Button>
                        <button
                          type="button"
                          className="flex h-9 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                          aria-label={`More actions for invoice ${row.invoiceNum}`}
                        >
                          <Icon name="moreVertical" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                    {loading ? "Loading invoices..." : "No invoices found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <div>
            Showing {startRecord} to {endRecord} of {totalRecords} Invoices
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage(0)}
              disabled={page === 0 || loading}
            >
              «
            </button>
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || loading}
            >
              ‹
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  page === pageNumber ? "bg-indigo-100 font-semibold text-[#4B1FCF]" : "text-slate-700"
                }`}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              ›
            </button>
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1 || loading}
            >
              »
            </button>
            <div className="w-20">
              <Select
                value={String(pageSize)}
                onChange={(event) => {
                  setPage(0);
                  setPageSize(Number(event.target.value) || 10);
                }}
                options={[
                  { value: "10", label: "10" },
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                ]}
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}

function PaymentsPage() {
  const { financePayments } = useFinanceLiveData();
  const mfeProps = useMFEProps();
  const columns = useMemo<ColumnDef<(typeof financePayments)[number]>[]>(
    () => [
      { key: "id", header: "Payment" },
      { key: "payer", header: "Payer" },
      { key: "method", header: "Method" },
      { key: "receivedOn", header: "Received On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  const totalCollections = financePayments.reduce((sum, row) => sum + row.amount, 0);
  const upiCollections = financePayments.filter((row) => row.method === "UPI").reduce((sum, row) => sum + row.amount, 0);

  return (
    <FinanceFeatureLayout
      title="Payments"
      subtitle="Collections, settlements, and incoming finance entries."
      actions={<Button onClick={() => mfeProps.navigate("/finance/receivables/create")}>Record Payment</Button>}
      stats={[
        { label: "Collections", value: formatCurrency(totalCollections), accent: "emerald" },
        { label: "UPI", value: formatCurrency(upiCollections), accent: "indigo" },
        { label: "Cash", value: formatCurrency(financePayments.filter((row) => row.method === "Cash").reduce((sum, row) => sum + row.amount, 0)), accent: "amber" },
        { label: "Transactions", value: String(financePayments.length), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Payment Register"
          subtitle="Incoming revenue captured against invoices and accounts."
          data={financePayments}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No payments"
          emptyDescription="Payment activity will appear here."
        />
      }
      aside={
        <FeedCard title="Collection Channels">
          <SummaryList
            rows={["Bank Transfer", "UPI", "Card", "Cash", "Net Banking"].map((method) => ({
              label: method,
              value: formatCurrency(financePayments.filter((row) => row.method === method).reduce((sum, row) => sum + row.amount, 0)),
              note: `${financePayments.filter((row) => row.method === method).length} entries`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function VendorsPage() {
  const { financeVendors } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeVendors)[number]>[]>(
    () => [
      { key: "name", header: "Vendor" },
      { key: "category", header: "Category" },
      { key: "payable", header: "Payable", align: "right", render: (row) => formatCurrency(row.payable) },
      { key: "lastPayment", header: "Last Payment" },
      { key: "status", header: "Status" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Vendors"
      subtitle="Vendor-facing finance operations migrated into the new app."
      actions={<Button>Add Vendor</Button>}
      // stats={[
      //   { label: "Vendors", value: String(financeVendors.length), accent: "indigo" },
      //   { label: "Active", value: String(financeVendors.filter((vendor) => vendor.status === "Active").length), accent: "emerald" },
      //   { label: "On Hold", value: String(financeVendors.filter((vendor) => vendor.status === "On Hold").length), accent: "amber" },
      //   { label: "Payables", value: formatCurrency(financeVendors.reduce((sum, vendor) => sum + vendor.payable, 0)), accent: "rose" },
      // ]}
      main={
        <DataTableCard
          title="Vendor Directory"
          subtitle="Recently used and outstanding vendor records."
          data={financeVendors}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No vendors"
          emptyDescription="Vendor records will appear here."
        />
      }
      // aside={
      //   <FeedCard title="Priority Vendors">
      //     <SummaryList
      //       rows={financeVendors.slice(0, 6).map((vendor) => ({
      //         label: vendor.name,
      //         value: formatCurrency(vendor.payable),
      //         note: `${vendor.category} | ${vendor.status}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function LedgerPage() {
  const { financeLedgerEntries } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeLedgerEntries)[number]>[]>(
    () => [
      { key: "account", header: "Account" },
      { key: "type", header: "Type" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "balance", header: "Balance", align: "right", render: (row) => formatCurrency(row.balance) },
      { key: "updatedOn", header: "Updated On" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Ledger"
      subtitle="Ledger movements, credits, debits, and running balances."
      actions={<Button>Add Credit</Button>}
      stats={[
        { label: "Entries", value: String(financeLedgerEntries.length), accent: "indigo" },
        { label: "Credits", value: formatCurrency(financeLedgerEntries.filter((item) => item.type === "Credit").reduce((sum, item) => sum + item.amount, 0)), accent: "emerald" },
        { label: "Debits", value: formatCurrency(financeLedgerEntries.filter((item) => item.type === "Debit").reduce((sum, item) => sum + item.amount, 0)), accent: "amber" },
        { label: "Closing Balance", value: formatCurrency(financeLedgerEntries[0]?.balance ?? 0), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Ledger Register"
          subtitle="Latest account-level finance movements."
          data={financeLedgerEntries}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No ledger entries"
          emptyDescription="Ledger entries will appear here."
        />
      }
      aside={
        <FeedCard title="Top Accounts">
          <SummaryList
            rows={financeLedgerEntries.map((entry) => ({
              label: entry.account,
              value: formatCurrency(entry.balance),
              note: `${entry.type} posted on ${entry.updatedOn}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function ReceivablesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeReceivables, setFinanceReceivables] = useState<FinanceReceivable[]>([]);

  useEffect(() => {
    let active = true;

    async function loadReceivables() {
      const filter = mfeProps.location?.id
        ? { "locationId-eq": mfeProps.location.id, from: 0, count: 15 }
        : { from: 0, count: 15 };

      try {
        const response = await financeApi.revenue.list(filter);
        if (active) {
          setFinanceReceivables(normalizeReceivableRows(response.data));
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load receivables", error);
        if (active) {
          setFinanceReceivables([]);
        }
      }
    }

    void loadReceivables();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof financeReceivables)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "amountDue", header: "Amount", align: "right", render: (row) => formatCurrency(row.amountDue) },
      { key: "revenueCategory", header: "Revenue Category" },
      { key: "invoiceCategory", header: "Invoice Category" },
      { key: "invoiceNo", header: "Invoice No." },
      { key: "reference", header: "Reference" },
      { key: "patientName", header: "Patient Name" },
      { key: "vendor", header: "Vendor" },
      { key: "location", header: "Location" },
      { key: "status", header: "Status" },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.id}`)}>
            Edit
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Revenues"
      subtitle="Outstanding incoming balances and collections ownership."
      actions={<Button onClick={() => navigate("create")}>Add Revenue</Button>}
      // stats={[
      //   { label: "Receivable Accounts", value: String(financeReceivables.length), accent: "indigo" },
      //   { label: "Outstanding", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
      //   { label: "Largest Dues", value: formatCurrency(financeReceivables.length ? Math.max(...financeReceivables.map((row) => row.amountDue)) : 0), accent: "rose" },
      //   { label: "Collections Owners", value: String(new Set(financeReceivables.map((row) => row.owner)).size), accent: "emerald" },
      // ]}
      main={
        <DataTableCard
          title={`Revenue(${financeReceivables.length})`}
          subtitle=""
          data={financeReceivables}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No Revenue"
          emptyDescription="Revenue will appear here."
        />
      }
      // aside={
      //   <FeedCard title="Ageing View">
      //     <SummaryList
      //       rows={financeReceivables.map((row) => ({
      //         label: row.patientName || row.customer,
      //         value: formatCurrency(row.amountDue),
      //         note: `${row.reference || row.invoiceId} | ${row.location || row.ageing}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function toIsoDateTime(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function ReceivablesCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        const [categoriesResult, statusesResult, vendorsResult] = await Promise.allSettled([
          financeApi.categories.byFilter<any>({
            "categoryType-eq": "PaymentsInOut",
            "status-eq": "Enabled",
            from: 0,
            count: 100,
          }),
          financeApi.statuses.byFilter<any>({
            "categoryType-eq": "PaymentsInOut",
            "status-eq": "Enabled",
            from: 0,
            count: 100,
          }),
          financeApi.vendors.list<any>({ from: 0, count: 100 }),
        ]);

        if (!active) return;

        const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
        const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
        const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;

        const categories = Array.isArray(categoriesResponse?.data)
          ? categoriesResponse.data
          : Array.isArray(categoriesResponse?.data?.content)
            ? categoriesResponse.data.content
            : [];
        const statuses = Array.isArray(statusesResponse?.data)
          ? statusesResponse.data
          : Array.isArray(statusesResponse?.data?.content)
            ? statusesResponse.data.content
            : [];
        const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];

        const filteredCategories = categories.filter((item: any) => {
          const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
          const status = String(item?.status ?? "").toLowerCase();
          return type === "paymentsinout" && (status === "" || status === "enabled" || status === "enable");
        });
        const filteredStatuses = statuses.filter((item: any) => {
          const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
          const status = String(item?.status ?? "").toLowerCase();
          return type === "paymentsinout" && (status === "" || status === "enabled" || status === "enable");
        });

        const nextCategoryOptions = filteredCategories.map((item: any, index: number) => ({
          value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
          label: `${String(item.name ?? item.categoryName ?? item.displayName ?? "Category")}`,
        }));
        const nextStatusOptions = filteredStatuses.map((item: any, index: number) => ({
          value: String(item.id ?? item.uid ?? item.encId ?? `status-${index}`),
          label: `${String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status")}`,
        }));
        const nextVendorOptions = vendors.map((item: any, index: number) => ({
          value: String(item.encId ?? item.uid ?? item.id ?? `vendor-${index}`),
          label: String(item.name ?? item.vendorName ?? "Vendor"),
        }));

        setCategoryOptions(nextCategoryOptions);
        setStatusOptions(nextStatusOptions);
        setVendorOptions(nextVendorOptions);
        setCategoryId((current) => current || nextCategoryOptions[0]?.value || "");
        setStatusId((current) => current || nextStatusOptions[0]?.value || "");
      } catch (error) {
        if (!active) return;
        console.error("[mfe-finance] Failed to load receivable create form", error);
      }
    }

    loadFormData();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!label.trim()) {
      setFormError("Revenue From is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.revenue.create({
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        paymentLabel: label.trim(),
        paymentOn: toIsoDateTime(receivedDate),
        mode: paymentMode || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
        isPaymentsIn: true,
        financeDirect: true,
        paymentsInCategoryId: categoryId || undefined,
        paymentsInStatus: statusId || undefined,
        paymentsInLabel: label.trim(),
        receivedDate,
        referenceNo: referenceNo.trim() || undefined,
        amount: parsedAmount,
        vendorUid: vendorUid || undefined,
        locationId: mfeProps.location?.id ?? undefined,
        description: description.trim() || undefined,
        paymentMode: paymentMode || undefined,
        paymentInfo: paymentMode ? [{ paymentMode }] : undefined,
      });
      navigate("..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to create revenue", error);
      setFormError(error instanceof Error ? error.message : "Could not create revenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Revenue"
      subtitle="Create a finance record for incoming revenue."
      actions={<Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              options={[{ value: "", label: "Select category" }, ...categoryOptions]}
            />
            <Select
              label="Status"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              options={[{ value: "", label: "Select status" }, ...statusOptions]}
            />
            <Input label="Received Date" type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} required />
            <Input label="Revenue From" value={label} onChange={(event) => setLabel(event.target.value)} required />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <Select
              label="Vendor"
              value={vendorUid}
              onChange={(event) => setVendorUid(event.target.value)}
              options={[{ value: "", label: "Select vendor" }, ...vendorOptions]}
            />
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "CC", label: "Credit Card" },
                { value: "DC", label: "Debit Card" },
                { value: "NB", label: "Net banking" },
                { value: "UPI", label: "UPI" },
              ]}
            />
          </div>

          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Revenue"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function PayablesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financePayables, setFinancePayables] = useState<FinancePayable[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPayables() {
      const filter = mfeProps.location?.id
        ? { "locationId-eq": mfeProps.location.id, from: 0, count: 15 }
        : { from: 0, count: 15 };

      try {
        const response = await financeApi.payables.list(filter);
        if (active) {
          setFinancePayables(normalizePayableRows(response.data));
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load payables", error);
        if (active) {
          setFinancePayables([]);
        }
      }
    }

    void loadPayables();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof financePayables)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "amountDue", header: "Amount", align: "right", render: (row) => formatCurrency(row.amountDue) },
      { key: "payoutCategory", header: "Payout Category" },
      { key: "expenseCategory", header: "Expense Category" },
      { key: "reference", header: "Reference" },
      { key: "patientName", header: "Patient Name" },
      { key: "vendor", header: "Vendor" },
      { key: "location", header: "Location" },
      { key: "status", header: "Status" },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.id}`)}>
            Edit
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Payouts"
      subtitle="Payouts and outgoing vendor commitments."
      actions={<Button onClick={() => navigate("create")}>Create Payout</Button>}
      // stats={[
      //   { label: "Open Bills", value: String(financePayables.length), accent: "indigo" },
      //   { label: "Amount Due", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
      //   { label: "High Priority", value: String(financePayables.filter((row) => row.priority === "High").length), accent: "rose" },
      //   { label: "Vendors", value: String(new Set(financePayables.map((row) => row.vendor)).size), accent: "emerald" },
      // ]}
      main={
        <DataTableCard
          title={`Payout(${financePayables.length})`}
          subtitle=""
          data={financePayables}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No Payouts"
          emptyDescription="Payout entries will appear here."
        />
      }
      // aside={
      //   <FeedCard title="Due Soon">
      //     <SummaryList
      //       rows={financePayables.map((row) => ({
      //         label: row.vendor,
      //         value: row.dueOn,
      //         note: `${row.billRef} | ${formatCurrency(row.amountDue)} | ${row.priority}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function ReceivablesEditPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const params = useParams();
  const uid = params.id ?? "";
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const [categoriesResult, statusesResult, vendorsResult, detailResult] = await Promise.allSettled([
        financeApi.categories.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.statuses.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.vendors.list<any>({ from: 0, count: 100 }),
        financeApi.revenue.detail<any>(uid),
      ]);

      if (!active) return;

      const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
      const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
      const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;
      const detailResponse = detailResult.status === "fulfilled" ? detailResult.value : null;

      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];
      const statuses = Array.isArray(statusesResponse?.data)
        ? statusesResponse.data
        : Array.isArray(statusesResponse?.data?.content)
          ? statusesResponse.data.content
          : [];
      const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];

      const filteredCategories = categories.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "paymentsinout" && (status === "" || status === "enabled" || status === "enable");
      });
      const filteredStatuses = statuses.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "paymentsinout" && (status === "" || status === "enabled" || status === "enable");
      });

      const nextCategoryOptions = filteredCategories.map((item: any, index: number) => ({
        value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));
      const nextStatusOptions = filteredStatuses.map((item: any, index: number) => ({
        value: String(item.id ?? item.uid ?? item.encId ?? `status-${index}`),
        label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status"),
      }));
      const nextVendorOptions = vendors.map((item: any, index: number) => ({
        value: String(item.encId ?? item.uid ?? item.id ?? `vendor-${index}`),
        label: String(item.name ?? item.vendorName ?? "Vendor"),
      }));

      setCategoryOptions(nextCategoryOptions);
      setStatusOptions(nextStatusOptions);
      setVendorOptions(nextVendorOptions);

      const detail = detailResponse?.data ?? {};
      setCategoryId(String(detail.categoryId ?? detail.categoryUid ?? detail.uid ?? ""));
      setStatusId(String(detail.statusId ?? detail.statusUid ?? ""));
      setVendorUid(String(detail.vendorUid ?? detail.consumerUid ?? ""));
      setReceivedDate(String(detail.paymentOn ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10));
      setLabel(String(detail.paymentLabel ?? detail.paymentsInLabel ?? ""));
      setReferenceNo(String(detail.referenceNo ?? ""));
      setAmount(String(detail.amount ?? ""));
      setPaymentMode(String(detail.mode ?? detail.paymentMode ?? "Cash"));
      setDescription(String(detail.description ?? ""));
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, [uid]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!label.trim()) {
      setFormError("Revenue From is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.revenue.update(uid, {
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        paymentLabel: label.trim(),
        paymentOn: toIsoDateTime(receivedDate),
        mode: paymentMode || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
        isPaymentsIn: true,
        financeDirect: true,
        referenceNo: referenceNo.trim() || undefined,
        amount: parsedAmount,
        consumerUid: vendorUid || undefined,
        description: description.trim() || undefined,
        paymentCategory: "Invoice",
      });
      navigate("../..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to update revenue", error);
      setFormError(error instanceof Error ? error.message : "Could not update revenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Edit Revenue"
      subtitle="Update a finance payment-in record."
      actions={<Button variant="outline" onClick={() => navigate("../..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Select category" }, ...categoryOptions]} />
            <Select label="Status" value={statusId} onChange={(event) => setStatusId(event.target.value)} options={[{ value: "", label: "Select status" }, ...statusOptions]} />
            <Input label="Received Date" type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} required />
            <Input label="Revenue From" value={label} onChange={(event) => setLabel(event.target.value)} required />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <Select label="Vendor" value={vendorUid} onChange={(event) => setVendorUid(event.target.value)} options={[{ value: "", label: "Select vendor" }, ...vendorOptions]} />
            <Select label="Payment Mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} options={[{ value: "Cash", label: "Cash" }, { value: "Bank Transfer", label: "Bank Transfer" }, { value: "UPI", label: "UPI" }]} />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("../..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Revenue"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function PayablesCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const [categoriesResult, statusesResult, vendorsResult] = await Promise.allSettled([
        financeApi.categories.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.statuses.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.vendors.list<any>({ from: 0, count: 100 }),
      ]);

      if (!active) return;

      const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
      const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
      const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;

      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];
      const statuses = Array.isArray(statusesResponse?.data)
        ? statusesResponse.data
        : Array.isArray(statusesResponse?.data?.content)
          ? statusesResponse.data.content
          : [];
      const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];

      const nextCategoryOptions = categories.map((item: any, index: number) => ({
        value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));
      const nextStatusOptions = statuses.map((item: any, index: number) => ({
        value: String(item.id ?? item.uid ?? item.encId ?? `status-${index}`),
        label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status"),
      }));
      const nextVendorOptions = vendors.map((item: any, index: number) => ({
        value: String(item.encId ?? item.uid ?? item.id ?? `vendor-${index}`),
        label: String(item.name ?? item.vendorName ?? "Vendor"),
      }));

      setCategoryOptions(nextCategoryOptions);
      setStatusOptions(nextStatusOptions);
      setVendorOptions(nextVendorOptions);
      setCategoryId((current) => current || nextCategoryOptions[0]?.value || "");
      setStatusId((current) => current || nextStatusOptions[0]?.value || "");
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!label.trim()) {
      setFormError("Payout label is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.payables.create({
        locationUid: mfeProps.location?.id,
        locationName: mfeProps.location?.name,
        amount: parsedAmount,
        currency: "INR",
        mode: paymentMode,
        acceptedBy: paymentMode.toUpperCase() === "CASH" ? "CASH" : paymentMode.toUpperCase(),
        paymentOn: toIsoDateTime(paymentDate),
        referenceNo: referenceNo || undefined,
        paymentLabel: label.trim(),
        description: description || undefined,
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        consumerUid: vendorUid || undefined,
        vendorUid: vendorUid || undefined,
        paymentFor: "VERIFY",
        purpose: "REVENUE",
        isPaymentsIn: false,
        financeDirect: true,
      });
      navigate("..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to create payout", error);
      setFormError(error instanceof Error ? error.message : "Could not create payout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Payout"
      subtitle="Create an outgoing payment using the tenant payments-out API."
      actions={<Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Select category" }, ...categoryOptions]} />
            <Select label="Status" value={statusId} onChange={(event) => setStatusId(event.target.value)} options={[{ value: "", label: "Select status" }, ...statusOptions]} />
            <Input label="Payment Date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            <Input label="Payout Label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Vendor payout" />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Select label="Vendor" value={vendorUid} onChange={(event) => setVendorUid(event.target.value)} options={[{ value: "", label: "Select vendor" }, ...vendorOptions]} />
            <Select label="Payment Mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} options={[{ value: "Cash", label: "Cash" }, { value: "Bank Transfer", label: "Bank Transfer" }, { value: "UPI", label: "UPI" }]} />
          </div>

          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />

          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Payout"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ExpensesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeExpenses, setFinanceExpenses] = useState<FinanceExpense[]>([]);

  useEffect(() => {
    let active = true;

    async function loadExpenses() {
      const filter = mfeProps.location?.id
        ? { "locationId-eq": mfeProps.location.id, from: 0, count: 100 }
        : { from: 0, count: 100 };

      try {
        const response = await financeApi.expenses.list(filter);
        if (active) {
          setFinanceExpenses(normalizeExpenseRows(response.data));
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load expenses", error);
        if (active) {
          setFinanceExpenses([]);
        }
      }
    }

    void loadExpenses();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof financeExpenses)[number]>[]>(
    () => [
      { key: "title", header: "Expense" },
      { key: "category", header: "Category" },
      { key: "owner", header: "Owner" },
      { key: "bookedOn", header: "Booked On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.id}`)}>
            Edit
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Expenses"
      subtitle="Operational and compliance expense tracking."
      actions={<Button onClick={() => navigate("new")}>Add Expense</Button>}
      main={
        <DataTableCard
          title="Expense"
          subtitle=""
          data={financeExpenses}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No expenses"
          emptyDescription="Expense entries will appear here."
        />
      }
    />
  );
}

function PayablesEditPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const params = useParams();
  const uid = params.id ?? "";
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const [categoriesResult, statusesResult, vendorsResult, detailResult] = await Promise.allSettled([
        financeApi.categories.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.statuses.byFilter<any>({
          "categoryType-eq": "PaymentsInOut",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.vendors.list<any>({ from: 0, count: 100 }),
        financeApi.payables.detail<any>(uid),
      ]);

      if (!active) return;

      const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
      const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
      const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;
      const detailResponse = detailResult.status === "fulfilled" ? detailResult.value : null;

      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];
      const statuses = Array.isArray(statusesResponse?.data)
        ? statusesResponse.data
        : Array.isArray(statusesResponse?.data?.content)
          ? statusesResponse.data.content
          : [];
      const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : [];

      const nextCategoryOptions = categories.map((item: any, index: number) => ({
        value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));
      const nextStatusOptions = statuses.map((item: any, index: number) => ({
        value: String(item.id ?? item.uid ?? item.encId ?? `status-${index}`),
        label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status"),
      }));
      const nextVendorOptions = vendors.map((item: any, index: number) => ({
        value: String(item.encId ?? item.uid ?? item.id ?? `vendor-${index}`),
        label: String(item.name ?? item.vendorName ?? "Vendor"),
      }));

      setCategoryOptions(nextCategoryOptions);
      setStatusOptions(nextStatusOptions);
      setVendorOptions(nextVendorOptions);

      const detail = detailResponse?.data ?? {};
      setCategoryId(String(detail.categoryId ?? ""));
      setStatusId(String(detail.statusId ?? ""));
      setVendorUid(String(detail.vendorUid ?? detail.consumerUid ?? ""));
      setPaymentDate(String(detail.paymentOn ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10));
      setLabel(String(detail.paymentLabel ?? ""));
      setReferenceNo(String(detail.referenceNo ?? ""));
      setAmount(String(detail.amount ?? ""));
      setPaymentMode(String(detail.mode ?? "Cash"));
      setDescription(String(detail.description ?? ""));
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, [uid]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!label.trim()) {
      setFormError("Payout label is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.payables.update(uid, {
        locationUid: mfeProps.location?.id,
        locationName: mfeProps.location?.name,
        amount: parsedAmount,
        currency: "INR",
        mode: paymentMode,
        acceptedBy: paymentMode.toUpperCase() === "CASH" ? "CASH" : paymentMode.toUpperCase(),
        paymentOn: toIsoDateTime(paymentDate),
        referenceNo: referenceNo || undefined,
        paymentLabel: label.trim(),
        description: description || undefined,
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        consumerUid: vendorUid || undefined,
        vendorUid: vendorUid || undefined,
        paymentFor: "VERIFY",
        purpose: "REVENUE",
        isPaymentsIn: false,
        financeDirect: true,
      });
      navigate("../..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to update payout", error);
      setFormError(error instanceof Error ? error.message : "Could not update payout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Edit Payout"
      subtitle="Update a finance payment-out record."
      actions={<Button variant="outline" onClick={() => navigate("../..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Select category" }, ...categoryOptions]} />
            <Select label="Status" value={statusId} onChange={(event) => setStatusId(event.target.value)} options={[{ value: "", label: "Select status" }, ...statusOptions]} />
            <Input label="Payment Date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            <Input label="Payout Label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Vendor payout" />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Select label="Vendor" value={vendorUid} onChange={(event) => setVendorUid(event.target.value)} options={[{ value: "", label: "Select vendor" }, ...vendorOptions]} />
            <Select label="Payment Mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} options={[{ value: "Cash", label: "Cash" }, { value: "Bank Transfer", label: "Bank Transfer" }, { value: "UPI", label: "UPI" }]} />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("../..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Payout"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ExpensesCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [bookedOn, setBookedOn] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      const result = await Promise.allSettled([
        financeApi.categories.search<any>({
          "categoryType-eq": "Expense",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
      ]);

      if (!active) return;

      const categoriesResponse = result[0].status === "fulfilled" ? result[0].value : null;
      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];

      const nextCategoryOptions = categories.map((item: any, index: number) => ({
        value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));

      setCategoryOptions(nextCategoryOptions);
      setCategoryId((current) => current || nextCategoryOptions[0]?.value || "");
    }

    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!title.trim()) {
      setFormError("Expense title is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.expenses.create({
        expenseFor: title.trim(),
        title: title.trim(),
        categoryId: categoryId || undefined,
        amount: parsedAmount,
        expenseDate: toIsoDateTime(bookedOn),
        createdDate: toIsoDateTime(bookedOn),
        description: description.trim() || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
      });
      navigate("/finance/expense");
    } catch (error) {
      console.error("[mfe-finance] Failed to create expense", error);
      setFormError(error instanceof Error ? error.message : "Could not create expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Expense"
      subtitle="Create a finance expense record."
      actions={<Button variant="outline" onClick={() => navigate("/expense")}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Expense Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Select category" }, ...categoryOptions]} />
            <Input label="Booked On" type="date" value={bookedOn} onChange={(event) => setBookedOn(event.target.value)} required />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/expense")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ExpensesEditPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const params = useParams();
  const uid = params.id ?? "";
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bookedOn, setBookedOn] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const [categoriesResult, detailResult] = await Promise.allSettled([
        financeApi.categories.search<any>({
          "categoryType-eq": "Expense",
          "status-eq": "Enabled",
          from: 0,
          count: 100,
        }),
        financeApi.expenses.detail<any>(uid),
      ]);

      if (!active) return;

      const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
      const detailResponse = detailResult.status === "fulfilled" ? detailResult.value : null;

      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];

      const nextCategoryOptions = categories.map((item: any, index: number) => ({
        value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));

      setCategoryOptions(nextCategoryOptions);

      const detail = detailResponse?.data ?? {};
      setTitle(String(detail.expenseFor ?? detail.title ?? ""));
      setCategoryId(String(detail.categoryId ?? ""));
      setBookedOn(String(detail.expenseDate ?? detail.createdDate ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10));
      setAmount(String(detail.amount ?? ""));
      setDescription(String(detail.description ?? ""));
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, [uid]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!title.trim()) {
      setFormError("Expense title is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.expenses.update(uid, {
        expenseFor: title.trim(),
        title: title.trim(),
        categoryId: categoryId || undefined,
        amount: parsedAmount,
        expenseDate: toIsoDateTime(bookedOn),
        description: description.trim() || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
      });
      navigate("/finance/expense");
    } catch (error) {
      console.error("[mfe-finance] Failed to update expense", error);
      setFormError(error instanceof Error ? error.message : "Could not update expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Edit Expense"
      subtitle="Modify details of an expense record."
      actions={<Button variant="outline" onClick={() => navigate("/finance/expense")}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Expense Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Select category" }, ...categoryOptions]} />
            <Input label="Booked On" type="date" value={bookedOn} onChange={(event) => setBookedOn(event.target.value)} required />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/finance/expense")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function DiscountsPage() {
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDiscounts() {
    setLoading(true);
    try {
      const res = await financeApi.discounts.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setDiscounts(payload);
    } catch (error) {
      console.error("Failed to fetch discounts", error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Discount Name" },
      { key: "calculationType", header: "Calculation Type" },
      { key: "discountType", header: "Discount Type" },
      { key: "discountValue", header: "Value", align: "right", render: (row) => String(row.discountValue ?? 0) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "ACTIVE" ? "success" : row.status === "RETIRED" ? "warning" : "neutral"}>{row.status || "INACTIVE"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Discount actions"
                />
              }
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus: DiscountStatus =
                      row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                    try {
                      await financeApi.discounts.updateStatus(row.uid, nextStatus);
                      loadDiscounts();
                    } catch (error) {
                      console.error("Failed to update discount status", error);
                      alert("Failed to update discount status");
                    }
                  }}
                >
                  {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal text-rose-600"
                  onClick={async () => {
                    try {
                      await financeApi.discounts.remove(row.uid);
                      loadDiscounts();
                    } catch (error) {
                      console.error("Failed to retire discount", error);
                      alert("Failed to retire discount");
                    }
                  }}
                >
                  Retire Discount
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Discounts"
      subtitle="Manage finance discounts used in invoices and item-level discount application."
      actions={<Button onClick={() => navigate("create")}>Create Discount</Button>}
      main={
        <DataTableCard
          title="Discount List"
          subtitle="Available finance discounts."
          data={discounts}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No discounts"
          emptyDescription={loading ? "Loading..." : "Discounts will appear here."}
        />
      }
    />
  );
}

function DiscountCreatePage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const navigateToDiscountList = () => navigate("..", { relative: "path", replace: true });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Discount name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.discounts.create({
        tenantUid: tenantUid || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        discountedAmount: Number(discountValue) || 0,
        status,
      });
      navigateToDiscountList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create discount", error);
      setFormError(error instanceof Error ? error.message : "Could not create discount.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Discount"
      subtitle="Add a finance discount for invoice and item-level application."
      actions={<Button variant="outline" onClick={navigateToDiscountList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Discount Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as DiscountStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToDiscountList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Discount"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function DiscountEditPage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const navigateToDiscountList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDiscount() {
      if (!id) return;
      try {
        const res = await financeApi.discounts.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setName(String(data.name || ""));
          setDescription(String(data.description || ""));
          setCalculationType((data.calculationType || "FIXED_AMOUNT") as DiscountCalculationType);
          setDiscountType((data.discountType || "PREDEFINED") as DiscountType);
          setDiscountValue(String(data.discountValue ?? data.discountedAmount ?? 0));
          setStatus((data.status || "ACTIVE") as DiscountStatus);
        }
      } catch (error) {
        console.error("Failed to load discount", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDiscount();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Discount name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.discounts.update(id!, {
        uid: id,
        tenantUid: tenantUid || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        discountedAmount: Number(discountValue) || 0,
        status,
      });
      navigateToDiscountList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update discount", error);
      setFormError(error instanceof Error ? error.message : "Could not update discount.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading discount...</div>;
  }

  return (
    <PageShell
      title="Edit Discount"
      subtitle="Update discount details for invoice use."
      actions={<Button variant="outline" onClick={navigateToDiscountList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Discount Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as DiscountStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToDiscountList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Discount"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function CouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    setLoading(true);
    try {
      const res = await financeApi.coupons.list<any>({ from: 0, count: 100 });
      const payload = res.data?.content || res.data?.data?.content || res.data?.data || res.data || [];
      const records = Array.isArray(payload) ? payload : [];
      setCoupons(records.map((item: any, index: number) => ({
        uid: String(item.uid ?? item.couponId ?? item.id ?? `coupon-${index}`),
        code: String(item.couponCode ?? item.code ?? item.name ?? `COUPON-${index + 1}`),
        name: String(item.name ?? item.displayName ?? item.couponCode ?? item.code ?? "Coupon"),
        feature: String(item.feature ?? item.featureModule ?? item.module ?? "FINANCE"),
        calculationType: String(item.calculationType ?? "FIXED_AMOUNT"),
        discountType: String(item.discountType ?? "PREDEFINED"),
        discountValue: Number(item.discountValue ?? item.discount ?? item.value ?? item.amount ?? 0),
        status: String(item.status ?? "INACTIVE"),
        published: Boolean(item.published ?? item.isPublished ?? false),
      })));
    } catch (error) {
      console.error("Failed to fetch coupons", error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "code", header: "Coupon Code" },
      { key: "name", header: "Coupon Name" },
      { key: "feature", header: "Feature" },
      { key: "calculationType", header: "Calculation Type" },
      { key: "discountType", header: "Coupon Type" },
      { key: "discountValue", header: "Value", align: "right", render: (row) => String(row.discountValue ?? 0) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "ACTIVE" ? "success" : row.status === "RETIRED" ? "warning" : "neutral"}>{row.status || "INACTIVE"}</Badge>,
      },
      {
        key: "published",
        header: "Published",
        render: (row) => <Badge variant={row.published ? "success" : "neutral"}>{row.published ? "Published" : "Draft"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={(
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Coupon actions"
                />
              )}
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus: CouponStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                    try {
                      await financeApi.coupons.updateStatus(row.uid, nextStatus);
                      await loadCoupons();
                    } catch (error) {
                      console.error("Failed to update coupon status", error);
                      alert("Failed to update coupon status");
                    }
                  }}
                >
                  {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </Button>
                {!row.published ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={async () => {
                      try {
                        await financeApi.coupons.publish(row.uid);
                        await loadCoupons();
                      } catch (error) {
                        console.error("Failed to publish coupon", error);
                        alert("Failed to publish coupon");
                      }
                    }}
                  >
                    Publish Coupon
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal text-rose-600"
                  onClick={async () => {
                    try {
                      await financeApi.coupons.remove(row.uid);
                      await loadCoupons();
                    } catch (error) {
                      console.error("Failed to remove coupon", error);
                      alert("Failed to remove coupon");
                    }
                  }}
                >
                  Delete Coupon
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Coupons"
      subtitle="Manage finance coupons used in invoice and billing flows."
      actions={<Button onClick={() => navigate("create")}>Create Coupon</Button>}
      main={(
        <DataTableCard
          title="Coupon List"
          subtitle="Available finance coupons."
          data={coupons}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No coupons"
          emptyDescription={loading ? "Loading..." : "Coupons will appear here."}
        />
      )}
    />
  );
}

function CouponCreatePage() {
  const navigate = useNavigate();
  const navigateToCouponList = () => navigate("..", { relative: "path", replace: true });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("FINANCE");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<CouponStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Coupon name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.coupons.create({
        couponCode: code.trim(),
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        feature,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        status,
      });
      navigateToCouponList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not create coupon.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Coupon"
      subtitle="Add a finance coupon using the tenant coupons API."
      actions={<Button variant="outline" onClick={navigateToCouponList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Coupon Code *" value={code} onChange={(event) => setCode(event.target.value)} required />
            <Input label="Coupon Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              options={[
                { value: "FINANCE", label: "Finance" },
                { value: "BASE_CRM", label: "Base CRM" },
              ]}
            />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Coupon Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as CouponStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToCouponList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Coupon"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function CouponEditPage() {
  const navigate = useNavigate();
  const navigateToCouponList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("FINANCE");
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>("FIXED_AMOUNT");
  const [discountType, setDiscountType] = useState<DiscountType>("PREDEFINED");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState<CouponStatus>("ACTIVE");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadCoupon() {
      if (!id) return;
      try {
        const res = await financeApi.coupons.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setCode(String(data.couponCode ?? data.code ?? ""));
          setName(String(data.name ?? ""));
          setDescription(String(data.description ?? ""));
          setFeature(String(data.feature ?? data.featureModule ?? "FINANCE"));
          setCalculationType((data.calculationType || "FIXED_AMOUNT") as DiscountCalculationType);
          setDiscountType((data.discountType || "PREDEFINED") as DiscountType);
          setDiscountValue(String(data.discountValue ?? data.discount ?? data.value ?? 0));
          setStatus((data.status || "ACTIVE") as CouponStatus);
        }
      } catch (error) {
        console.error("Failed to load coupon", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCoupon();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Coupon name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.coupons.update(id!, {
        uid: id,
        couponCode: code.trim(),
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        feature,
        calculationType,
        discountType,
        discountValue: Number(discountValue) || 0,
        status,
      });
      navigateToCouponList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not update coupon.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading coupon...</div>;
  }

  return (
    <PageShell
      title="Edit Coupon"
      subtitle="Update coupon details for invoice use."
      actions={<Button variant="outline" onClick={navigateToCouponList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Coupon Code *" value={code} onChange={(event) => setCode(event.target.value)} required />
            <Input label="Coupon Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              options={[
                { value: "FINANCE", label: "Finance" },
                { value: "BASE_CRM", label: "Base CRM" },
              ]}
            />
            <Select
              label="Calculation Type"
              value={calculationType}
              onChange={(event) => setCalculationType(event.target.value as DiscountCalculationType)}
              options={[
                { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                { value: "FIXED_PCT", label: "Fixed Percentage" },
              ]}
            />
            <Select
              label="Coupon Type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              options={[
                { value: "PREDEFINED", label: "Predefined" },
                { value: "ONDEMAND", label: "On Demand" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as CouponStatus)}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToCouponList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Coupon"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function CategoryPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeCategories, setFinanceCategories] = useState<Array<{ id: string; name: string; usageCount: number; linkedTo: string }>>([]);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      const filter = mfeProps.location?.id
        ? { "locationId-eq": mfeProps.location.id, from: 0, count: 100 }
        : { from: 0, count: 100 };

      try {
        const response = await financeApi.categories.search<any>(filter);
        if (!active) {
          return;
        }

        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.content)
            ? response.data.content
            : [];

        setFinanceCategories(
          records.map((item: any, index: number) => ({
            id: String(item.uid ?? item.id ?? item.categoryId ?? `category-${index}`),
            name: String(item.categoryName ?? item.name ?? item.displayName ?? "Category"),
            usageCount: Number(item.usageCount ?? item.count ?? item.linkedCount ?? 0) || 0,
            linkedTo: String(item.categoryType ?? item.linkedTo ?? item.type ?? "General"),
          })),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load categories", error);
        if (active) {
          setFinanceCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof financeCategories)[number]>[]>(
    () => [
      { key: "name", header: "Category" },
      { key: "usageCount", header: "Usage", align: "right" },
      { key: "linkedTo", header: "Linked To" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Categories"
      subtitle="Finance categories used across invoices, expenses, and ledger flows."
      actions={<Button onClick={() => navigate("create")}>Create Category</Button>}
      // stats={[
      //   { label: "Categories", value: String(financeCategories.length), accent: "indigo" },
      //   { label: "Invoice Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Invoices").length), accent: "emerald" },
      //   { label: "Expense Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Expenses").length), accent: "amber" },
      //   { label: "Ledger Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Ledger").length), accent: "rose" },
      // ]}
      main={
        <DataTableCard
          title="Category List"
          subtitle="Reusable finance categories."
          data={financeCategories}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No categories"
          emptyDescription="Categories will appear here."
        />
      }
      // aside={
      //   <FeedCard title="Usage Summary">
      //     <SummaryList
      //       rows={financeCategories.map((item) => ({
      //         label: item.name,
      //         value: String(item.usageCount),
      //         note: `Linked to ${item.linkedTo}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function CategoryCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState("PaymentsInOut");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.categories.create({
        categoryName: name.trim(),
        categoryType,
      });
      navigate("/finance/category");
    } catch (error) {
      console.error("[mfe-finance] Failed to create category", error);
      setFormError(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Category"
      subtitle="Create a finance category using the tenant category API."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
          <Input
            label="Category Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Travel"
            fullWidth
          />
          <Select
            label="Category Type"
            value={categoryType}
            onChange={(event) => setCategoryType(event.target.value)}
            options={[
              { value: "PaymentsInOut", label: "Payments In/Out" },
              { value: "Expense", label: "Expense" },
              { value: "Invoice", label: "Invoice" },
            ]}
            fullWidth
          />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/finance/category")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Category"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function StatusCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState("PaymentsInOut");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Status name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.statuses.create({
        name: name.trim(),
        categoryType,
        status: "Enabled",
      });
      navigate("/finance/status");
    } catch (error) {
      console.error("[mfe-finance] Failed to create status", error);
      setFormError(error instanceof Error ? error.message : "Could not create status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Status"
      subtitle="Create a finance workflow status using the tenant status API."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
          <Input
            label="Status Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="In Progress"
            fullWidth
          />
          <Select
            label="Applies To"
            value={categoryType}
            onChange={(event) => setCategoryType(event.target.value)}
            options={[
              { value: "PaymentsInOut", label: "Payments In/Out" },
              { value: "Expense", label: "Expense" },
              { value: "Invoice", label: "Invoice" },
            ]}
            fullWidth
          />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/finance/status")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Status"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function StatusPage() {
  const { financeStatuses } = useFinanceLiveData();
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<(typeof financeStatuses)[number]>[]>(
    () => [
      { key: "name", header: "Status" },
      { key: "appliesTo", header: "Applies To" },
      { key: "colorHint", header: "Color Hint" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Statuses"
      subtitle="Manage finance workflow statuses across module entities."
      actions={<Button onClick={() => navigate("create")}>Create Status</Button>}
      stats={[
        { label: "Statuses", value: String(financeStatuses.length), accent: "indigo" },
        { label: "Invoice Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Invoices").length), accent: "emerald" },
        { label: "Receivable Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Receivables").length), accent: "amber" },
        { label: "Vendor Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Vendors").length), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Status Registry"
          subtitle="Status values used across the finance product."
          data={financeStatuses}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No statuses"
          emptyDescription="Statuses will appear here."
        />
      }
      aside={
        <FeedCard title="Status Notes">
          <SummaryList
            rows={financeStatuses.map((item) => ({
              label: item.name,
              value: item.colorHint,
              note: `Applies to ${item.appliesTo}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function TotalListPage() {
  const {
    financeExpenses,
    financeInvoices,
    financeLedgerEntries,
    financePayments,
    financePayables,
    financeReceivables,
    financeSummaryCards,
    financeVendors,
  } = useFinanceLiveData();
  return (
    <FinanceFeatureLayout
      title="Total List"
      subtitle="Combined finance totals similar to the old total-list route."
      stats={[
        { label: "Revenue", value: formatCurrency(financePayments.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Expenses", value: formatCurrency(financeExpenses.reduce((sum, row) => sum + row.amount, 0)), accent: "rose" },
        { label: "Receivables", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "Payables", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "indigo" },
      ]}
      main={
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-[22px] font-semibold text-slate-900">Finance Totals</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {financeSummaryCards.map((card) => (
              <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
            ))}
          </div>
        </SectionCard>
      }
      aside={
        <FeedCard title="Breakdown">
          <SummaryList
            rows={[
              { label: "Invoices", value: String(financeInvoices.length), note: "Total invoice records" },
              { label: "Payments", value: String(financePayments.length), note: "Recorded collections" },
              { label: "Vendors", value: String(financeVendors.length), note: "Active vendor directory" },
              { label: "Ledger Entries", value: String(financeLedgerEntries.length), note: "Journal records" },
            ]}
          />
        </FeedCard>
      }
    />
  );
}

function CashInHandPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeCashInHand, setFinanceCashInHand] = useState<Array<{
    id: string;
    date: string;
    amount: number;
    type: string;
    referenceNo: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadCashInHand() {
    setLoading(true);
    try {
      const filter = mfeProps.location?.id
        ? { from: 0, count: 100, "locationId-eq": String(mfeProps.location.id) }
        : { from: 0, count: 100 };
      const response = await financeApi.cash.list<any>(filter);
      const payload = Array.isArray(response.data?.content)
        ? response.data.content
        : Array.isArray(response.data?.data?.content)
          ? response.data.data.content
          : Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
              ? response.data
              : [];

      setFinanceCashInHand(
        payload.map((item: any, index: number) => {
          const paymentDate = item?.paymentOn || item?.createdDate || item?.updatedDate || item?.updatedAt;
          return {
            id: String(item?.paymentsInUid || item?.payInOutUid || item?.uid || item?.id || `cash-in-${index}`),
            date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-GB") : "-",
            amount: Number(item?.amount || item?.paymentAmount || item?.netTotal || 0) || 0,
            type: item?.isPaymentsIn === false ? "Cash OUT" : "Cash IN",
            referenceNo: String(item?.referenceNo || "-"),
          };
        })
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash in hand list", error);
      setFinanceCashInHand([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCashInHand();
  }, [mfeProps.location?.id]);

  const handleRefreshCash = async () => {
    setRefreshing(true);
    try {
      if (mfeProps.location?.id) {
        await financeApi.cash.recalculateBalance(mfeProps.location.id);
      }
      await loadCashInHand();
    } catch (err) {
      console.error("Failed to refresh cash balance", err);
    } finally {
      setRefreshing(false);
    }
  };
  const columns = useMemo<ColumnDef<(typeof financeCashInHand)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "amount", header: "Amount (₹)", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "type", header: "Cash IN/OUT" },
      { key: "referenceNo", header: "Reference No." },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button variant="outline" onClick={() => navigate(`view/${row.id}`, { relative: "path" })}>
            View
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <PageShell
      title="Cash Reserve"
      subtitle="Cash reserve entries for the selected location."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefreshCash} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={() => navigate("reserve/new", { relative: "path" })}>+ Cash Reserve</Button>
        </div>
      }
    >
      <DataTableCard
        title={`Cash Reserve(${financeCashInHand.length})`}
        subtitle="Cash reserve list with quick access to reserve details."
        data={financeCashInHand}
        columns={columns}
        getRowId={(row) => row.id}
        emptyTitle="No cash reserve records"
        emptyDescription={loading ? "Loading cash reserve entries..." : "Cash reserve entries will appear here."}
      />
    </PageShell>
  );
}

function CashReserveViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [reserve, setReserve] = useState<{
    reserveType: "Cash IN" | "Cash OUT";
    locationName: string;
    referenceNo: string;
    amount: number;
    notes: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReserve() {
      if (!id) {
        setReserve(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [cashInResponse, cashOutResponse] = await Promise.allSettled([
          financeApi.cash.detailIn<any>(id),
          financeApi.cash.detailOut<any>(id),
        ]);

        const payload =
          cashInResponse.status === "fulfilled"
            ? cashInResponse.value.data
            : cashOutResponse.status === "fulfilled"
              ? cashOutResponse.value.data
              : null;

        if (!active) {
          return;
        }

        if (!payload) {
          setReserve(null);
          return;
        }

        setReserve({
          reserveType: payload?.isPaymentsIn === false ? "Cash OUT" : "Cash IN",
          locationName: String(payload?.locationName || "-"),
          referenceNo: String(payload?.referenceNo || "-"),
          amount: Number(payload?.amount || payload?.paymentAmount || 0) || 0,
          notes: String(payload?.description || payload?.notes || "-"),
        });
      } catch (error) {
        console.error("[mfe-finance] Failed to load cash reserve detail", error);
        if (active) {
          setReserve(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReserve();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <PageShell
      title="Cash Reserve"
      subtitle="View cash reserve details."
      actions={<Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading cash reserve details...</div>
        ) : !reserve ? (
          <EmptyState title="Cash reserve not found" description="The selected cash reserve record could not be loaded." />
        ) : (
          <div className="grid gap-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Reserve Type *</label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={reserve.reserveType === "Cash IN"} readOnly />
                  Cash IN
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={reserve.reserveType === "Cash OUT"} readOnly />
                  Cash OUT
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Location *" value={reserve.locationName} readOnly />
              <Input label="Reference No." value={reserve.referenceNo} readOnly />
              <Input label="Amount(₹) *" value={String(reserve.amount)} readOnly />
            </div>

            <Textarea label="Notes" value={reserve.notes} readOnly rows={4} />
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

function CashRegisterPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [cashRegisters, setCashRegisters] = useState<Array<{
    id: string;
    source: string;
    owner: string;
    updatedOn: string;
    amount: number;
    type: string;
    category: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashInHandAmount, setCashInHandAmount] = useState(0);
  const [cashUpdatedOn, setCashUpdatedOn] = useState("-");

  async function loadCashRegisters() {
    setLoading(true);
    try {
      const locationFilter = mfeProps.location?.id
        ? { from: 0, count: 100, "locationId-eq": String(mfeProps.location.id) }
        : { from: 0, count: 100 };
      const [cashInResponse, cashOutResponse] = await Promise.allSettled([
        financeApi.cash.list<any>(locationFilter),
        financeApi.cash.listOut<any>(locationFilter),
      ]);

      const readList = (payload: any) =>
        Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data?.content)
            ? payload.data.content
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : [];

      const cashInPayload = cashInResponse.status === "fulfilled" ? readList(cashInResponse.value.data) : [];
      const cashOutPayload = cashOutResponse.status === "fulfilled" ? readList(cashOutResponse.value.data) : [];

      setCashRegisters(
        [
          ...cashInPayload.map((item: any, index: number) => ({ item, type: "Cash IN", index, direction: "in" })),
          ...cashOutPayload.map((item: any, index: number) => ({ item, type: "Cash OUT", index, direction: "out" })),
        ].map(({ item, type, index, direction }) => {
          const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate || item?.updatedAt;
          return {
            id: String(item?.paymentsInUid || item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || `cash-register-${direction}-${index}`),
            source: String(item?.paymentLabel || item?.paymentsInLabel || item?.paymentsOutLabel || item?.categoryName || item?.purpose || type),
            owner: String(item?.createdByName || item?.userName || item?.owner || "Finance"),
            updatedOn: paymentDate
              ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0,
            type,
            category: String(item?.categoryName || item?.paymentCategory || item?.purpose || "-"),
          };
        })
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash register list", error);
      setCashRegisters([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCashBalance() {
    if (!mfeProps.location?.id) {
      setCashInHandAmount(0);
      setCashUpdatedOn("-");
      return;
    }

    try {
      const response = await financeApi.cash.balance<any>(String(mfeProps.location.id));
      const payload = response.data ?? {};
      const rawUpdatedAt = payload.updatedAt ?? payload.updatedDate ?? payload.lastUpdatedAt;
      const rawUpdatedOn = payload.updatedOn ?? payload.lastUpdated;
      setCashInHandAmount(Number(payload.cashInHand ?? payload.balance ?? payload.amount ?? 0) || 0);
      setCashUpdatedOn(
        rawUpdatedAt
          ? new Date(rawUpdatedAt).toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : rawUpdatedOn
            ? String(rawUpdatedOn)
          : "-"
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash balance", error);
      setCashInHandAmount(0);
      setCashUpdatedOn("-");
    }
  }

  async function loadCashRegisterData() {
    await Promise.allSettled([loadCashRegisters(), loadCashBalance()]);
  }

  useEffect(() => {
    void loadCashRegisterData();
  }, [mfeProps.location?.id]);

  async function handleRefreshCash() {
    if (!mfeProps.location?.id) {
      return;
    }

    setRefreshing(true);
    try {
      await financeApi.cash.recalculateBalance(String(mfeProps.location.id));
      await loadCashRegisterData();
    } catch (error) {
      console.error("[mfe-finance] Failed to refresh cash balance", error);
    } finally {
      setRefreshing(false);
    }
  }

  const columns = useMemo<ColumnDef<(typeof cashRegisters)[number]>[]>(
    () => [
      { key: "updatedOn", header: "Date" },
      { key: "type", header: "Type" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "category", header: "Category" },
    ],
    []
  );

  return (
    <>
      <FinanceFeatureLayout
        title="Cash Register"
        subtitle="Register balances and last update snapshots."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("reserve/new", { relative: "path" })}>+ Cash Reserve</Button>
          </div>
        }
        main={
          <>
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm max-w-sm">
                  <div className="text-sm font-medium text-slate-600">Cash Inhand</div>
                  <div className="mt-3 text-3xl font-semibold text-emerald-600">{formatCurrency(cashInHandAmount)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>Last Updated On {cashUpdatedOn}</span>
                  <button
                    type="button"
                    onClick={handleRefreshCash}
                    disabled={refreshing}
                    className="font-semibold text-indigo-700"
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </SectionCard>

            <DataTableCard
              title={`Cash Register(${cashRegisters.length})`}
              subtitle="Cash reserve entries showing both cash in and cash out."
              data={cashRegisters}
              columns={columns}
              getRowId={(row) => row.id}
              emptyTitle="No cash register data"
              emptyDescription={loading ? "Loading cash register entries..." : "Cash register entries will appear here."}
            />
          </>
        }
      />
    </>
  );
}

function CashReserveCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [reserveType, setReserveType] = useState<"paymentsIn" | "paymentsOut">("paymentsIn");
  const [locationUid, setLocationUid] = useState(String(mfeProps.location?.id ?? ""));
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLocations() {
      try {
        const response = await financeApi.locations.tenant<any>({
          page: 0,
          size: 100,
        });
        if (!active) {
          return;
        }
        const locations = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.content)
            ? (response.data as any).content
            : Array.isArray((response.data as any)?.data)
              ? (response.data as any).data
              : Array.isArray((response.data as any)?.data?.content)
                ? (response.data as any).data.content
                : [];
        const nextOptions = locations.map((item: any) => ({
          value: String(item.locationUid ?? item.uid ?? item.id ?? item.locationId ?? ""),
          label: String(item.place ?? item.name ?? item.locationName ?? "Location"),
        })).filter((item) => item.value);
        setLocationOptions(nextOptions);
        if (!locationUid) {
          setLocationUid(nextOptions[0]?.value || "");
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load locations for cash reserve", error);
      }
    }
    void loadLocations();
    return () => {
      active = false;
    };
  }, [locationUid]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!locationUid) {
      setFormError("Location is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const selectedLocation = locationOptions.find((item) => item.value === locationUid);
      const payload = {
        locationUid,
        locationId: locationUid,
        locationName: selectedLocation?.label || mfeProps.location?.name || undefined,
        amount: parsedAmount,
        currency: "INR",
        mode: "Cash",
        paymentMode: "Cash",
        acceptedBy: "CASH",
        referenceNo: referenceNo.trim() || undefined,
        description: notes.trim() || undefined,
        paymentLabel: reserveType === "paymentsIn" ? "Cash IN" : "Cash OUT",
        isPaymentsIn: reserveType === "paymentsIn",
        financeDirect: true,
        paymentInfo: [{ paymentMode: "Cash" }],
      };
      await financeApi.cash.createReserve(reserveType, payload);
      navigate("../..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to create cash reserve", error);
      setFormError(error instanceof Error ? error.message : "Could not create cash reserve.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Cash Reserve"
      subtitle="Create a cash in or cash out reserve entry."
      actions={<Button variant="outline" onClick={() => navigate("../..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Reserve Type *</label>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="reserveType"
                  checked={reserveType === "paymentsIn"}
                  onChange={() => setReserveType("paymentsIn")}
                />
                Cash IN
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="reserveType"
                  checked={reserveType === "paymentsOut"}
                  onChange={() => setReserveType("paymentsOut")}
                />
                Cash OUT
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Location *"
              value={locationUid}
              onChange={(event) => setLocationUid(event.target.value)}
              options={[{ value: "", label: "Select Location" }, ...locationOptions]}
            />
            <Input
              label="Reference No."
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder="Reference No"
            />
            <Input
              label="Amount(₹) *"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter Amount"
            />
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
          />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("../..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ActivityLogPage() {
  const mfeProps = useMFEProps();
  const [activityLogs, setActivityLogs] = useState<Array<{
    id: string;
    action: string;
    actor: string;
    target: string;
    timestamp: string;
  }>>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivityLogs() {
      setLoading(true);
      try {
        const filter = mfeProps.location?.id
          ? { "locationId-eq": mfeProps.location.id, from: 0, count: 100 }
          : { from: 0, count: 100 };

        const [listResponse, countResponse] = await Promise.allSettled([
          financeApi.activity.list<any>(filter),
          financeApi.activity.count<any>(mfeProps.location?.id ? { "locationId-eq": mfeProps.location.id } : {}),
        ]);

        if (!active) {
          return;
        }

        const payload =
          listResponse.status === "fulfilled"
            ? Array.isArray(listResponse.value.data)
              ? listResponse.value.data
              : Array.isArray(listResponse.value.data?.content)
                ? listResponse.value.data.content
                : Array.isArray(listResponse.value.data?.data)
                  ? listResponse.value.data.data
                  : Array.isArray(listResponse.value.data?.logs)
                    ? listResponse.value.data.logs
                    : []
            : [];

        setActivityLogs(
          payload.map((item: any, index: number) => ({
            id: String(item?.uid || item?.id || item?.logId || `activity-${index}`),
            action: String(item?.message || item?.action || item?.event || item?.activity || item?.description || "-"),
            actor: String(item?.actorUserName || item?.actor || item?.userName || item?.createdByName || "System"),
            target: String(item?.target || item?.referenceId || item?.entityName || item?.module || "-"),
            timestamp: String(item?.createdAt || item?.timestamp || item?.createdDate || item?.updatedDate || "-"),
          }))
        );

        setActivityCount(
          countResponse.status === "fulfilled"
            ? Number(
              countResponse.value.data?.count ??
              countResponse.value.data?.totalElements ??
              countResponse.value.data ??
              payload.length
            ) || payload.length
            : payload.length
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load activity logs", error);
        if (active) {
          setActivityLogs([]);
          setActivityCount(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadActivityLogs();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof activityLogs)[number]>[]>(
    () => [
      { key: "action", header: "Action" },
      { key: "actor", header: "Actor" },
      { key: "target", header: "Target" },
      { key: "timestamp", header: "Timestamp" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Activity Log"
      subtitle="Audit visibility for the finance workspace."
      stats={[
        { label: "Events", value: String(activityCount || activityLogs.length), accent: "indigo" },
        { label: "Human Actions", value: String(activityLogs.filter((item) => item.actor !== "Finance Bot" && item.actor !== "System").length), accent: "emerald" },
        { label: "Automation", value: String(activityLogs.filter((item) => item.actor === "Finance Bot" || item.actor === "System").length), accent: "amber" },
        { label: "Tracked Targets", value: String(new Set(activityLogs.map((item) => item.target)).size), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Audit Trail"
          subtitle="Recent finance activity across invoices, vendors, and ledger."
          data={activityLogs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No finance activity"
          emptyDescription={loading ? "Loading activity entries..." : "Activity entries will appear here."}
        />
      }
      // aside={
      //   <FeedCard title="Recent Events">
      //     <SummaryList
      //       rows={financeActivityLogs.map((item) => ({
      //         label: item.action,
      //         value: item.timestamp,
      //         note: `${item.actor} -> ${item.target}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function ReportsPage() {
  const {
    financePayments,
    financePayables,
    financeReceivables,
    financeReportMetrics,
  } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeReportMetrics)[number]>[]>(
    () => [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
      { key: "note", header: "Notes" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Reports"
      subtitle="Core finance indicators rebuilt from the broader legacy finance feature set."
      actions={<Button onClick={() => window.print()}>Export Report</Button>}
      stats={[
        { label: "Metrics", value: String(financeReportMetrics.length), accent: "indigo" },
        { label: "Revenue", value: formatCurrency(financePayments.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Receivables", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "Payables", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Report Metrics"
          subtitle="Finance KPIs and descriptive notes."
          data={financeReportMetrics}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No report metrics"
          emptyDescription="Report metrics will appear here."
        />
      }
      aside={
        <FeedCard title="Operational Highlights">
          <SummaryList
            rows={financeReportMetrics.map((metric) => ({
              label: metric.metric,
              value: metric.value,
              note: metric.note,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function MasterInvoicePage() {
  const { uid = "" } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [paymentAction, setPaymentAction] = useState<"" | "paylink" | "paycash" | "payothers">("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMobile, setShareMobile] = useState("");
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");
  const [paymentEntries, setPaymentEntries] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentMode, setEditPaymentMode] = useState("Cash");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentTransactionId, setEditPaymentTransactionId] = useState("");
  const [editPaymentError, setEditPaymentError] = useState("");
  const [editPaymentSubmitting, setEditPaymentSubmitting] = useState(false);

  function normalizePaymentEntries(payload: any) {
    const rawEntries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.payments)
            ? payload.payments
            : [];

    return rawEntries.map((item: any, index: number) => {
      const amount = Number(
        item?.amount
        ?? item?.paymentAmount
        ?? item?.receivedAmount
        ?? item?.paidAmount
        ?? 0
      );
      const paymentDateValue = item?.paymentDate ?? item?.paymentOn ?? item?.createdAt ?? item?.updatedAt ?? "";
      const parsedDate = paymentDateValue ? new Date(paymentDateValue) : null;
      const mode = String(item?.mode ?? item?.paymentMode ?? item?.acceptedBy ?? "-");
      const acceptedBy = String(item?.acceptedBy ?? "");
      const gateway = String(item?.gateway ?? item?.gatewayName ?? item?.paymentGateway ?? "Nil");
      const status = String(item?.gatewayStatus ?? item?.status ?? item?.paymentStatus ?? "SUCCESS");
      const note = String(item?.note ?? item?.paymentNote ?? item?.description ?? "");
      const transactionId = String(item?.transactionId ?? item?.paymentRefId ?? item?.referenceNo ?? "");

      return {
        uid: String(item?.uid ?? item?.id ?? item?.paymentUid ?? `payment-${index}`),
        amount: Number.isFinite(amount) ? amount : 0,
        mode,
        acceptedBy,
        gateway,
        status,
        note,
        transactionId,
        paymentDateRaw: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "",
        paymentDateLabel: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "-",
        paymentTimeLabel: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
          : "",
      };
    });
  }

  async function loadInvoiceDetail(invoiceUid: string) {
    const res = await financeApi.invoices.detailGeneral<any>(invoiceUid);
    if (!res.data) {
      return null;
    }

    const detailList = Array.isArray(res.data.detailList) ? res.data.detailList : [];
    return {
      uid: String(res.data.uid || invoiceUid),
      id: String(res.data.uid || res.data.invoiceNum || res.data.invoiceId || invoiceUid),
      invoiceNum: String(res.data.invoiceNum || res.data.invoiceId || invoiceUid),
      customer: String(res.data.consumerName || res.data.customerName || res.data.invoiceFor || res.data.userName || "Unknown"),
      category: String(res.data.categoryName || res.data.invoiceCategoryName || "General"),
      amount: Number(res.data.netTotal || res.data.totalAmount || res.data.amountDue || 0),
      dueDate: res.data.dueDate ? new Date(res.data.dueDate).toLocaleDateString() : "-",
      status: String(res.data.invoiceStatus || res.data.invoicePaymentStatus || res.data.billStatus || res.data.status || "Pending"),
      location: String(res.data.locationName || res.data.location || res.data.locationPlace || "-"),
      referenceNo: String(res.data.referenceNo || res.data.bookingReference || "-"),
      patientId: String(res.data.consumerId || res.data.patientId || "-"),
      invoiceDate: res.data.invoiceDate ? new Date(res.data.invoiceDate).toLocaleDateString() : "-",
      createdOn: res.data.createdDate || res.data.createdAt
        ? new Date(res.data.createdDate || res.data.createdAt).toLocaleString()
        : "-",
      createdBy: String(res.data.createdByName || res.data.createdBy || res.data.providerName || "-"),
      product: String(res.data.product || res.data.productName || "BOOKING"),
      consumerPhone: String(res.data.consumerPhone || ""),
      consumerEmail: String(res.data.consumerEmail || ""),
      paymentLink: String(res.data.paymentLink || ""),
      billedToAddress: String(res.data.billedToAddress || res.data.consumerGstAddress || "-"),
      notesForCustomer: String(res.data.notesForCustomer || res.data.description || ""),
      notesForProvider: String(res.data.notesForProvider || ""),
      reasonForCancel: String(res.data.reasonForCancel || res.data.billStatusNote || ""),
      netTotal: Number(res.data.netTotal || res.data.totalAmount || 0),
      totalAmount: Number(res.data.totalAmount || res.data.netTotal || 0),
      amountDue: Number(res.data.amountDue || res.data.netTotal || 0),
      totalTax: Number(res.data.totalTax || 0),
      totalDiscount: Number(res.data.totalDiscount || 0),
      detailList: detailList.map((item: any, index: number) => {
        const qty = Number(item.quantity || 1);
        const rate = Number(item.price || item.netRate || 0);
        const totalRate = Number(item.netTotal || rate * qty);
        const afterDiscount = Number(item.netTotalAfterDiscount || totalRate);
        const tax = Number(item.taxAmount || item.totalTax || 0);
        const total = Number(item.total || afterDiscount + tax);
        return {
          id: String(item.uid || item.itemUid || `invoice-line-${index}`),
          itemName: String(item.itemName || item.name || "Procedure/Item"),
          processedDate: item.processedDate ? new Date(item.processedDate).toLocaleDateString("en-GB") : "-",
          quantity: qty,
          rate,
          totalRate,
          discount: Number(item.discountAmount || 0),
          afterDiscount,
          tax,
          total,
        };
      }),
    };
  }

  useEffect(() => {
    let active = true;
    async function fetchDetail() {
      try {
        const detail = await loadInvoiceDetail(uid);
        if (active) {
          setInvoice(detail);
        }
      } catch (err) {
        console.error("Failed to load invoice detail", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (uid) fetchDetail();
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    if (!invoice) {
      return;
    }
    setPaymentAmount(String(invoice.amountDue || ""));
    setShareEmail(String(invoice.consumerEmail || ""));
    setShareMobile(String(invoice.consumerPhone || ""));
  }, [invoice]);

  async function handleInvoiceStatusUpdate(nextStatus: "Settled" | "Cancel") {
    if (!invoice?.uid || statusUpdating) {
      return;
    }

    let payload: Record<string, unknown> = {};

    if (nextStatus === "Cancel") {
      const reason = window.prompt("Enter the reason for cancelling this invoice:", invoice.reasonForCancel || "");
      if (reason === null) {
        return;
      }
      if (!reason.trim()) {
        setStatusError("Cancellation reason is required.");
        return;
      }
      payload = {
        reasonForCancel: reason.trim(),
      };
    }

    const confirmMessage =
      nextStatus === "Settled"
        ? `Settle invoice #${invoice.invoiceNum}?`
        : `Cancel invoice #${invoice.invoiceNum}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setStatusError("");
    setStatusUpdating(true);
    try {
      await financeApi.invoices.updateInvoiceStatus(invoice.uid, nextStatus, payload);
      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
    } catch (error) {
      console.error("Failed to update invoice status", error);
      setStatusError(error instanceof Error ? error.message : "Could not update invoice status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  function closePaymentDialog() {
    setPaymentDialogOpen(false);
    setPaymentAction("");
    setPaymentError("");
    setPaymentNote("");
    setPaymentDate("");
    setPaymentMode("UPI");
    setPaymentTransactionId("");
    setPaymentAmount(String(invoice?.amountDue || ""));
  }

  async function loadPaymentEntries(openDialog = false) {
    if (!invoice?.uid) {
      return;
    }

    if (openDialog) {
      setPaymentHistoryOpen(true);
    }
    setPaymentHistoryLoading(true);
    setPaymentHistoryError("");
    try {
      const response = await financeApi.invoices.paymentByInvoice<any>(invoice.uid);
      setPaymentEntries(normalizePaymentEntries(response.data));
    } catch (error) {
      console.error("Failed to load invoice payment history", error);
      setPaymentHistoryError(error instanceof Error ? error.message : "Could not load paid entries.");
    } finally {
      setPaymentHistoryLoading(false);
    }
  }

  function openEditPaymentDialog(entry: any) {
    setEditingPayment(entry);
    setEditPaymentError("");
    setEditPaymentAmount(String(entry.amount || ""));
    setEditPaymentDate(entry.paymentDateRaw ? entry.paymentDateRaw.slice(0, 10) : "");
    setEditPaymentMode(entry.mode || "Cash");
    setEditPaymentNote(entry.note || "");
    setEditPaymentTransactionId(entry.transactionId || "");
  }

  function closeEditPaymentDialog() {
    setEditingPayment(null);
    setEditPaymentError("");
    setEditPaymentSubmitting(false);
    setEditPaymentAmount("");
    setEditPaymentDate("");
    setEditPaymentMode("Cash");
    setEditPaymentNote("");
    setEditPaymentTransactionId("");
  }

  async function submitEditedPayment() {
    if (!invoice?.uid || !editingPayment?.uid) {
      return;
    }

    const parsedAmount = Number(editPaymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditPaymentError("Payment amount must be greater than zero.");
      return;
    }

    setEditPaymentError("");
    setEditPaymentSubmitting(true);

    try {
      const normalizedPaymentDate = editPaymentDate
        ? new Date(`${editPaymentDate}T00:00:00`).toISOString()
        : editingPayment.paymentDateRaw || new Date().toISOString();
      const isCashMode = String(editPaymentMode).toLowerCase() === "cash";
      const trimmedTransactionId = editPaymentTransactionId.trim();

      await financeApi.invoices.updateOfflinePayment(editingPayment.uid, {
        amount: parsedAmount,
        mode: editPaymentMode,
        paymentDate: normalizedPaymentDate,
        note: editPaymentNote.trim() || undefined,
        acceptedBy: isCashMode ? "CASH" : "Other",
        paymentForUid: invoice.uid,
        transactionId: isCashMode ? undefined : trimmedTransactionId || undefined,
        isUpdate: true,
      });

      await loadPaymentEntries(false);
      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
      closeEditPaymentDialog();
    } catch (error) {
      console.error("Failed to update invoice payment entry", error);
      setEditPaymentError(error instanceof Error ? error.message : "Could not update paid entry.");
    } finally {
      setEditPaymentSubmitting(false);
    }
  }

  function handlePrintInvoice() {
    const invoiceContent = document.getElementById("finance-invoice-print");
    if (!invoiceContent) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) {
      window.print();
      return;
    }

    const invoiceTitle = `Invoice-${invoice.invoiceNum}`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${invoiceTitle}</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }
            * {
              box-sizing: border-box;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
              vertical-align: top;
            }
            th.text-right, td.text-right {
              text-align: right;
            }
            .rounded-xl, .rounded-lg {
              border-radius: 0;
            }
            .shadow-sm, .shadow, .drop-shadow, .border-slate-200 {
              box-shadow: none !important;
            }
            .bg-slate-50, .bg-slate-100, .bg-slate-100\\/70 {
              background: #ffffff !important;
            }
            button {
              display: none !important;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  async function submitPaymentAction() {
    if (!invoice?.uid || !paymentAction) {
      return;
    }

    setPaymentError("");
    setPaymentSubmitting(true);
    try {
      if (paymentAction === "paylink") {
        const trimmedEmail = shareEmail.trim();
        const trimmedMobile = shareMobile.trim();
        const mobileNumber = trimmedMobile.replace(/^\+/, "");
        await financeApi.invoices.sharePaymentLink(invoice.uid, {
          sendEmail: Boolean(trimmedEmail),
          emails: trimmedEmail ? [trimmedEmail] : [],
          sendSms: Boolean(mobileNumber),
          phoneNumbers: mobileNumber
            ? [
              {
                countryCode: "91",
                number: mobileNumber,
              },
            ]
            : [],
          sendWhatsapp: Boolean(mobileNumber),
          whatsappNumbers: mobileNumber
            ? [
              {
                countryCode: "91",
                number: mobileNumber,
              },
            ]
            : [],
          html: "",
          driveId: 0,
        });
      } else {
        const parsedAmount = Number(paymentAmount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          setPaymentError("Payment amount must be greater than zero.");
          setPaymentSubmitting(false);
          return;
        }

        const trimmedTransactionId = paymentTransactionId.trim();
        const normalizedPaymentDate = paymentDate
          ? new Date(`${paymentDate}T00:00:00`).toISOString()
          : new Date().toISOString();

        await financeApi.invoices.createOfflinePayment({
          amount: parsedAmount,
          mode: paymentAction === "paycash" ? "Cash" : paymentMode,
          paymentDate: normalizedPaymentDate,
          note: paymentNote.trim() || undefined,
          acceptedBy: paymentAction === "paycash" ? "CASH" : "Other",
          paymentForUid: invoice.uid,
          transactionId: trimmedTransactionId || undefined,
          isUpdate: false,
        });
      }

      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
      await loadPaymentEntries(false);
      closePaymentDialog();
    } catch (error) {
      console.error("Failed to process invoice payment action", error);
      setPaymentError(error instanceof Error ? error.message : "Could not process payment action.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Master Invoice" subtitle="Loading invoice detail...">
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </PageShell>
    );
  }

  if (!invoice) {
    return (
      <PageShell
        title="Master Invoice"
        subtitle="Invoice detail shell aligned with the legacy finance route structure."
      >
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="No invoice found"
            description="This invoice is not available in the current finance dataset."
          />
        </SectionCard>
      </PageShell>
    );
  }

  const normalizedInvoiceStatus = String(invoice.status || "").toLowerCase();
  const isInvoiceSettled = normalizedInvoiceStatus.includes("settled") || normalizedInvoiceStatus.includes("paid");
  const isInvoiceCancelled = normalizedInvoiceStatus.includes("cancel");
  const amountPaid = Math.max(Number(invoice.netTotal || invoice.totalAmount || 0) - Number(invoice.amountDue || 0), 0);
  const canShowGetPayment =
    !isInvoiceSettled &&
    !isInvoiceCancelled &&
    Number(invoice.amountDue || 0) > 0;
  const invoiceBadgeVariant =
    isInvoiceSettled
      ? "success"
      : isInvoiceCancelled
        ? "danger"
        : getStatusVariant(invoice.status);

  return (
    <div className="min-h-screen bg-slate-100/70 py-4">
      <div className="mx-auto flex max-w-[1840px] flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate("/invoice")}
          className="w-fit px-2 text-lg font-medium text-slate-800"
        >
          ← Back
        </button>

        <SectionCard className="border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[20px] font-semibold text-slate-800">Invoice :#{invoice.invoiceNum}</div>
                <div className="mt-1 text-sm text-slate-500">
                  <Badge variant={invoiceBadgeVariant}>{invoice.status}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>Share PDF</Button>
                <Button variant="outline" onClick={handlePrintInvoice}>Print</Button>
                <Button variant="outline" onClick={() => navigate(`/invoice/edit/${uid}`)}>Edit</Button>
                <Button variant="outline" disabled>Log</Button>
              </div>
            </div>

            <div id="finance-invoice-print" className="rounded-xl border border-slate-200 bg-white p-4 lg:p-6">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="pb-2 text-[18px] font-semibold text-slate-800">Oasis Hospital's</div>
                  <div>{invoice.billedToAddress}</div>
                  <div><span className="font-semibold text-slate-700">{invoice.location}</span></div>
                  <div>Invoice To : <span className="font-semibold text-slate-700">{invoice.customer}</span></div>
                </div>

                <div className="space-y-1 text-sm text-slate-600 lg:justify-self-end">
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800">Invoice : #{invoice.invoiceNum}</div>
                  {/* <div className="flex justify-between gap-6"><span>Booking Reference :</span><span className="font-semibold text-slate-700">{invoice.referenceNo}</span></div> */}
                  {/* <div className="flex justify-between gap-6"><span>Patient Id :</span><span className="font-semibold text-slate-700">{invoice.patientId}</span></div> */}
                  {/* <div className="flex justify-between gap-6"><span>Created On :</span><span className="font-semibold text-slate-700">{invoice.createdOn}</span></div> */}
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800"><span>Invoice Date :</span><span className="font-semibold text-slate-700">{invoice.invoiceDate}</span></div>
                  {/* <div className="flex justify-between gap-6"><span>Created By :</span><span className="font-semibold text-slate-700">{invoice.createdBy}</span></div> */}
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800"><span>Category :</span><span className="font-semibold text-slate-700">{invoice.category}</span></div>
                  {/* <div className="flex justify-between gap-6"><span>Product :</span><span className="font-semibold text-slate-700">{invoice.product}</span></div> */}
                </div>
              </div>

              <div className="mt-8 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                      <th className="px-4 py-3 font-semibold">Procedure/Item</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Total Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Discount</th>
                      <th className="px-4 py-3 font-semibold text-right">After Discount</th>
                      <th className="px-4 py-3 font-semibold text-right">Tax</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.detailList.length ? (
                      invoice.detailList.map((item: any) => (
                        <tr key={item.id} className="text-slate-700">
                          <td className="px-4 py-4 font-semibold text-slate-800">{item.itemName}</td>
                          <td className="px-4 py-4">{item.processedDate}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-4 text-right">{item.quantity}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.totalRate)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.discount)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.afterDiscount)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.tax)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No invoice items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-md space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Total Amount :</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Net Total :</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.netTotal)}</span>
                  </div>
                  {amountPaid > 0 ? (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4"
                        onClick={() => void loadPaymentEntries(true)}
                      >
                        Amount Paid :
                      </button>
                      <button
                        type="button"
                        className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4"
                        onClick={() => void loadPaymentEntries(true)}
                      >
                        {formatCurrency(amountPaid)}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-100 px-4 py-4">
                <div className="flex items-center justify-end gap-6 text-[18px] font-semibold text-slate-800">
                  <span>Amount Due</span>
                  <span>{formatCurrency(invoice.amountDue)}</span>
                </div>
              </div>

              {String(invoice.status).toLowerCase().includes("cancel") && invoice.reasonForCancel ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span className="font-semibold">Cancellation Reason:</span> {invoice.reasonForCancel}
                </div>
              ) : null}

              {statusError ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {statusError}
                </div>
              ) : null}

              {!isInvoiceSettled && !isInvoiceCancelled ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {canShowGetPayment ? (
                    <Popover
                      portal
                      placement="top"
                      align="start"
                      trigger={<Button>Get Payment</Button>}
                    >
                      <div className="grid min-w-[220px] p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("paylink");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Share Payment Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("paycash");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Pay by Cash
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("payothers");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Pay by Others
                        </Button>
                      </div>
                    </Popover>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => void handleInvoiceStatusUpdate("Settled")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating..." : "Settle Invoice"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-rose-500"
                    onClick={() => void handleInvoiceStatusUpdate("Cancel")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating..." : "Cancel Invoice"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      <Dialog
        open={paymentDialogOpen}
        onClose={closePaymentDialog}
        title={
          paymentAction === "paylink"
            ? "Share Payment Link"
            : paymentAction === "paycash"
              ? "Pay by Cash"
              : "Pay by Others"
        }
        size="md"
      >
        <div className="space-y-4 pt-2">
          {paymentAction === "paylink" ? (
            <>
              <Input
                label="Email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                placeholder="Customer email"
              />
              <Input
                label="Mobile"
                value={shareMobile}
                onChange={(event) => setShareMobile(event.target.value)}
                placeholder="Customer mobile number"
              />
            </>
          ) : (
            <>
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="Payment amount"
              />
              {paymentAction === "payothers" ? (
                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  options={[
                    { value: "UPI", label: "UPI" },
                    { value: "Card", label: "Card" },
                    { value: "Bank Transfer", label: "Bank Transfer" },
                    { value: "Cheque", label: "Cheque" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              ) : null}
              <DatePicker
                label="Payment Date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
              {paymentAction === "payothers" ? (
                <Input
                  label="Transaction ID"
                  value={paymentTransactionId}
                  onChange={(event) => setPaymentTransactionId(event.target.value)}
                  placeholder="Transaction ID"
                />
              ) : null}
              <Textarea
                label="Payment Note"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                rows={4}
                placeholder="Add payment note"
              />
            </>
          )}

          {paymentError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {paymentError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePaymentDialog} disabled={paymentSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitPaymentAction()} disabled={paymentSubmitting}>
              {paymentSubmitting ? "Processing..." : paymentAction === "paylink" ? "Share Link" : "Submit Payment"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog
        open={paymentHistoryOpen}
        onClose={() => setPaymentHistoryOpen(false)}
        title="Amount Paid"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          {paymentHistoryError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {paymentHistoryError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Mode</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Gateway</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Date & Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paymentHistoryLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">Loading paid entries...</td>
                  </tr>
                ) : paymentEntries.length ? (
                  paymentEntries.map((entry) => (
                    <tr key={entry.uid} className="align-top text-slate-700">
                      <td className="px-3 py-4 font-medium text-slate-800">{entry.status}</td>
                      <td className="px-3 py-4">{entry.mode}</td>
                      <td className="px-3 py-4">{entry.gateway}</td>
                      <td className="px-3 py-4">
                        <div>{entry.paymentDateLabel}</div>
                        {entry.paymentTimeLabel ? <div>{entry.paymentTimeLabel}</div> : null}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatCurrency(entry.amount)}</span>
                          <button
                            type="button"
                            className="text-sm font-medium text-indigo-700 underline underline-offset-4"
                            onClick={() => openEditPaymentDialog(entry)}
                          >
                            Edit
                          </button>
                        </div>
                        {entry.note ? <div className="mt-1 text-xs text-slate-500">{entry.note}</div> : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400">No paid entries available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setPaymentHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(editingPayment)}
        onClose={closeEditPaymentDialog}
        title="Edit Paid Amount"
        size="md"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={editPaymentAmount}
            onChange={(event) => setEditPaymentAmount(event.target.value)}
            placeholder="Payment amount"
          />
          <Select
            label="Payment Mode"
            value={editPaymentMode}
            onChange={(event) => setEditPaymentMode(event.target.value)}
            options={[
              { value: "Cash", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "Card", label: "Card" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "Cheque", label: "Cheque" },
              { value: "Other", label: "Other" },
            ]}
          />
          <DatePicker
            label="Payment Date"
            value={editPaymentDate}
            onChange={(event) => setEditPaymentDate(event.target.value)}
          />
          {String(editPaymentMode).toLowerCase() !== "cash" ? (
            <Input
              label="Transaction ID"
              value={editPaymentTransactionId}
              onChange={(event) => setEditPaymentTransactionId(event.target.value)}
              placeholder="Transaction ID"
            />
          ) : null}
          <Textarea
            label="Payment Note"
            value={editPaymentNote}
            onChange={(event) => setEditPaymentNote(event.target.value)}
            rows={4}
            placeholder="Add payment note"
          />

          {editPaymentError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {editPaymentError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditPaymentDialog} disabled={editPaymentSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitEditedPayment()} disabled={editPaymentSubmitting}>
              {editPaymentSubmitting ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

function SettingsPage() {
  const { financeCategories, financeStatuses, financeVendors } = useFinanceLiveData();
  const [expenseEnabled, setExpenseEnabled] = useState(false);
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const response = await financeApi.settings.provider();
        if (active && response.data) {
          const data: any = response.data;
          const isExpenseEnabled = 
            data.expenseStatus === "Enabled" ||
            data.expense === "Enabled" ||
            data.enableExpense === true ||
            data.expenseEnabled === true;
          setExpenseEnabled(isExpenseEnabled);

          const isInvoiceEnabled = 
            data.invoiceStatus === "Enabled" ||
            data.invoice === "Enabled" ||
            data.enableInvoice === true ||
            data.invoiceEnabled === true;
          setInvoiceEnabled(isInvoiceEnabled);
        }
      } catch (error) {
        console.error("Failed to load finance settings", error);
      }
    }
    loadSettings();
    return () => { active = false; };
  }, []);

  async function handleToggleExpense(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.expenseFeature(nextStatus);
      setExpenseEnabled(checked);
    } catch (error) {
      console.error("Failed to update expense status", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleInvoice(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.invoiceFeature(nextStatus);
      setInvoiceEnabled(checked);
    } catch (error) {
      console.error("Failed to update invoice status", error);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <FinanceFeatureLayout
      title="Finance Settings"
      subtitle="Template, category, vendor, and dashboard administration."
      stats={[
        { label: "Categories", value: String(financeCategories.length), accent: "indigo" },
        { label: "Statuses", value: String(financeStatuses.length), accent: "emerald" },
        { label: "Vendors", value: String(financeVendors.length), accent: "amber" },
        { label: "Active Vendors", value: String(financeVendors.filter((v) => v.status === "Active").length), accent: "rose" },
      ]}
      main={
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm" title="Module Controls">
            <div className="space-y-4 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[17px] font-semibold text-slate-900">Expense Feature</div>
                  <div className="mt-1 text-sm text-slate-500">Enable or disable the operational expense tracking feature inside the finance module.</div>
                </div>
                <Switch
                  checked={expenseEnabled}
                  disabled={updating}
                  onChange={handleToggleExpense}
                />
              </div>
              <div className="flex items-center justify-between py-2 pt-4">
                <div>
                  <div className="text-[17px] font-semibold text-slate-900">Invoice Feature</div>
                  <div className="mt-1 text-sm text-slate-500">Enable or disable the invoicing feature inside the finance module.</div>
                </div>
                <Switch
                  checked={invoiceEnabled}
                  disabled={updating}
                  onChange={handleToggleInvoice}
                />
              </div>
            </div>
          </SectionCard>

          {/* <SectionCard className="border-slate-200 shadow-sm">
            <div className="text-[22px] font-semibold text-slate-900">Settings Areas</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Dashboard Actions",
                "Invoice Templates",
                "Vendor Permissions",
                "Status Definitions",
                "Category Mapping",
                "Cash Register Rules",
                "Report Preferences",
                "Role Access",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard> */}
        </div>
      }
      // aside={
      //   <FeedCard title="Migration Notes">
      //     <SummaryList
      //       rows={[
      //         { label: "Dashboard", value: "Migrated", note: "Legacy action grid and cards are now present." },
      //         { label: "Invoices", value: "Migrated", note: "List, detail shell, and dashboard block added." },
      //         { label: "Vendors", value: "Migrated", note: "Directory and dashboard feed added." },
      //         { label: "Deep Forms", value: "Pending", note: "Backend-connected create/edit flows still need service wiring." },
      //       ]}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

function ItemsPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await financeApi.items.list<any>();
      const nextItems = Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
      setItems(nextItems);
    } catch (error) {
      console.error("Failed to fetch items", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Item Name" },
      { key: "code", header: "Item Code" },
      { key: "displayName", header: "Display Name" },
      { key: "amount", header: "Price", align: "right", render: (row) => formatCurrency(row.amount || 0) },
      { key: "taxPreference", header: "Taxable", render: (row) => (row.taxPreference === "TAXABLE" ? "Taxable" : "Non-Taxable") },
      { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Item actions"
                />
              }
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus = row.status === "Enabled" ? "Disabled" : "Enabled";
                    try {
                      await financeApi.items.changeStatus(row.uid, nextStatus);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update status");
                    }
                  }}
                >
                  {row.status === "Enabled" ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    try {
                      await financeApi.items.updateCouponApplicable(row.uid, !row.couponApplicable);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update coupon setting");
                    }
                  }}
                >
                  Coupon Applicable: {row.couponApplicable ? "On" : "Off"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    try {
                      await financeApi.items.updateDiscountApplicable(row.uid, !row.discountApplicable);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update discount setting");
                    }
                  }}
                >
                  Discount Applicable: {row.discountApplicable ? "On" : "Off"}
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Finance Items"
      subtitle="Manage items and procedures for invoicing."
      actions={<Button onClick={() => navigate("create")}>New Item</Button>}
      main={
        <DataTableCard
          title={`Items (${items.length})`}
          subtitle="Recent and active items"
          data={items}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No Items"
          emptyDescription={loading ? "Loading..." : "Items will appear here."}
        />
      }
    />
  );
}

function ItemsCreatePage() {
  const navigate = useNavigate();
  const [itemName, setItemName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [amountVal, setAmountVal] = useState("");
  const [taxPreference, setTaxPreference] = useState("NON_TAXABLE");
  const [status, setStatus] = useState("Enabled");
  const [itemDesc, setItemDesc] = useState("");
  const [rateEditable, setRateEditable] = useState(true);
  const [taxInclude, setTaxInclude] = useState(true);
  const [discountApplicable, setDiscountApplicable] = useState(true);
  const [couponApplicable, setCouponApplicable] = useState(true);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!itemName.trim()) {
      setFormError("Item Name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.items.create({
        name: itemName.trim(),
        displayName: displayName.trim() || itemName.trim(),
        code: itemCode.trim() || undefined,
        description: itemDesc.trim() || undefined,
        status,
        taxPreference,
        amount: Number(amountVal) || 0,
        rateEditable,
        taxInclude,
        taxableAmount: Number(amountVal) || 0,
        taxAmount: 0,
        netRate: Number(amountVal) || 0,
        discountApplicable,
        couponApplicable,
        displayOrder: 0,
        taxList: [],
      });
      navigate("/finance/items");
    } catch (error) {
      console.error("[mfe-finance] Failed to create item", error);
      setFormError(error instanceof Error ? error.message : "Could not create item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Item"
      subtitle="Add a new finance item/procedure to the catalog."
      actions={<Button variant="outline" onClick={() => navigate("/finance/items")}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Item Name *" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Item Code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            <Input label="Amount (₹) *" type="number" min="0" step="0.01" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} required />
            
            <Select
              label="Tax Preference"
              value={taxPreference}
              onChange={(e) => setTaxPreference(e.target.value)}
              options={[
                { value: "TAXABLE", label: "Taxable" },
                { value: "NON_TAXABLE", label: "Non-Taxable" },
              ]}
            />
            
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />

            <div className="flex flex-col gap-3 justify-center pt-2">
              <div className="flex items-center gap-3">
                <Switch checked={rateEditable} onChange={setRateEditable} />
                <label className="text-sm font-semibold text-slate-700">Rate Editable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={taxInclude} onChange={setTaxInclude} />
                <label className="text-sm font-semibold text-slate-700">Tax Included</label>
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center pt-2">
              <div className="flex items-center gap-3">
                <Switch checked={discountApplicable} onChange={setDiscountApplicable} />
                <label className="text-sm font-semibold text-slate-700">Discount Applicable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={couponApplicable} onChange={setCouponApplicable} />
                <label className="text-sm font-semibold text-slate-700">Coupon Applicable</label>
              </div>
            </div>
          </div>

          <Textarea label="Description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/finance/items")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Item"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ItemsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [itemName, setItemName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [amountVal, setAmountVal] = useState("");
  const [taxPreference, setTaxPreference] = useState("NON_TAXABLE");
  const [status, setStatus] = useState("Enabled");
  const [itemDesc, setItemDesc] = useState("");
  const [rateEditable, setRateEditable] = useState(true);
  const [taxInclude, setTaxInclude] = useState(true);
  const [discountApplicable, setDiscountApplicable] = useState(true);
  const [couponApplicable, setCouponApplicable] = useState(true);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadItem() {
      if (!id) return;
      try {
        const res = await financeApi.items.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setItemName(data.name || "");
          setDisplayName(data.displayName || "");
          setItemCode(data.code || "");
          setAmountVal(String(data.amount || 0));
          setTaxPreference(data.taxPreference || "NON_TAXABLE");
          setStatus(data.status || "Enabled");
          setItemDesc(data.description || "");
          setRateEditable(Boolean(data.rateEditable));
          setTaxInclude(Boolean(data.taxInclude));
          setDiscountApplicable(Boolean(data.discountApplicable));
          setCouponApplicable(Boolean(data.couponApplicable));
        }
      } catch (error) {
        console.error("Failed to load item detail", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadItem();
    return () => { active = false; };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!itemName.trim()) {
      setFormError("Item Name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.items.update(id!, {
        uid: id,
        name: itemName.trim(),
        displayName: displayName.trim() || itemName.trim(),
        code: itemCode.trim() || undefined,
        description: itemDesc.trim() || undefined,
        status,
        taxPreference,
        amount: Number(amountVal) || 0,
        rateEditable,
        taxInclude,
        taxableAmount: Number(amountVal) || 0,
        taxAmount: 0,
        netRate: Number(amountVal) || 0,
        discountApplicable,
        couponApplicable,
        displayOrder: 0,
        taxList: [],
      });
      navigate("/finance/items");
    } catch (error) {
      console.error("[mfe-finance] Failed to update item", error);
      setFormError(error instanceof Error ? error.message : "Could not update item.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading item...</div>;
  }

  return (
    <PageShell
      title="Edit Item"
      subtitle="Modify catalog item properties."
      actions={<Button variant="outline" onClick={() => navigate("/finance/items")}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Item Name *" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Item Code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            <Input label="Amount (₹) *" type="number" min="0" step="0.01" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} required />
            
            <Select
              label="Tax Preference"
              value={taxPreference}
              onChange={(e) => setTaxPreference(e.target.value)}
              options={[
                { value: "TAXABLE", label: "Taxable" },
                { value: "NON_TAXABLE", label: "Non-Taxable" },
              ]}
            />
            
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />

            <div className="flex flex-col gap-3 justify-center pt-2">
              <div className="flex items-center gap-3">
                <Switch checked={rateEditable} onChange={setRateEditable} />
                <label className="text-sm font-semibold text-slate-700">Rate Editable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={taxInclude} onChange={setTaxInclude} />
                <label className="text-sm font-semibold text-slate-700">Tax Included</label>
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center pt-2">
              <div className="flex items-center gap-3">
                <Switch checked={discountApplicable} onChange={setDiscountApplicable} />
                <label className="text-sm font-semibold text-slate-700">Discount Applicable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={couponApplicable} onChange={setCouponApplicable} />
                <label className="text-sm font-semibold text-slate-700">Coupon Applicable</label>
              </div>
            </div>
          </div>

          <Textarea label="Description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/finance/items")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Item"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await financeApi.sequenceTemplates.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "feature",
          operator: "EQ",
          values: ["FINANCE"],
        }
        // view: "SUMMARY",
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setTemplates(payload);
    } catch (error) {
      console.error("Failed to fetch sequence templates", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Template Name" },
      { key: "feature", header: "Feature", render: (row) => String(row.feature || "FINANCE") },
      { key: "prefix", header: "Prefix" },
      { key: "suffix", header: "Suffix" },
      { key: "remarks", header: "Remarks" },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status || "Disabled"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const nextStatus = row.status === "Enabled" ? "Disabled" : "Enabled";
                try {
                  await financeApi.sequenceTemplates.updateStatus(row.uid, nextStatus);
                  loadTemplates();
                } catch (error) {
                  console.error("Failed to update sequence template status", error);
                  alert("Failed to update sequence template status");
                }
              }}
            >
              {row.status === "Enabled" ? "Disable" : "Enable"}
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Sequence Templates"
      subtitle="Manage finance numbering templates used by sequence settings and invoice numbering."
      actions={<Button onClick={() => navigate("create")}>Create Sequence Template</Button>}
      main={
        <DataTableCard
          title="Sequence Template List"
          subtitle="Finance sequence templates."
          data={templates}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No sequence templates"
          emptyDescription={loading ? "Loading..." : "Sequence templates will appear here."}
        />
      }
    />
  );
}

function SequenceTemplateCreatePage() {
  const navigate = useNavigate();
  const navigateToSequenceTemplateList = () => navigate("..", { relative: "path", replace: true });
  const [name, setName] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.sequenceTemplates.create({
        name: name.trim(),
        feature,
        prefix: prefix.trim() || undefined,
        suffix: suffix.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status,
      });
      navigateToSequenceTemplateList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create sequence template", error);
      setFormError(error instanceof Error ? error.message : "Could not create sequence template.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Sequence Template"
      subtitle="Add a finance sequence template for numbering flows."
      actions={<Button variant="outline" onClick={navigateToSequenceTemplateList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)}
              options={sequenceTemplateFeatureOptions}
            />
            <Input label="Prefix" value={prefix} maxLength={4} onChange={(event) => setPrefix(event.target.value)} />
            <Input label="Suffix" value={suffix} maxLength={6} onChange={(event) => setSuffix(event.target.value)} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceTemplateList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Template"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceTemplateEditPage() {
  const navigate = useNavigate();
  const navigateToSequenceTemplateList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      if (!id) return;
      try {
        const res = await financeApi.sequenceTemplates.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setName(String(data.name || ""));
          setFeature((data.feature || "FINANCE") as SequenceTemplateFeature);
          setPrefix(String(data.prefix || ""));
          setSuffix(String(data.suffix || ""));
          setRemarks(String(data.remarks || ""));
          setStatus(String(data.status || "Enabled"));
        }
      } catch (error) {
        console.error("Failed to load sequence template", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTemplate();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.sequenceTemplates.update(id!, {
        uid: id,
        name: name.trim(),
        feature,
        prefix: prefix.trim() || undefined,
        suffix: suffix.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status,
      });
      navigateToSequenceTemplateList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update sequence template", error);
      setFormError(error instanceof Error ? error.message : "Could not update sequence template.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading sequence template...</div>;
  }

  return (
    <PageShell
      title="Edit Sequence Template"
      subtitle="Update finance sequence template details."
      actions={<Button variant="outline" onClick={navigateToSequenceTemplateList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)}
              options={sequenceTemplateFeatureOptions}
            />
            <Input label="Prefix" value={prefix} maxLength={4} onChange={(event) => setPrefix(event.target.value)} />
            <Input label="Suffix" value={suffix} maxLength={6} onChange={(event) => setSuffix(event.target.value)} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceTemplateList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Template"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceSettingsPage() {
  const navigate = useNavigate();
  const [settingsRows, setSettingsRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await financeApi.sequenceSettings.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "feature",
          operator: "EQ",
          values: ["FINANCE"],
        },
        // view: "SUMMARY",
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setSettingsRows(payload);
    } catch (error) {
      console.error("Failed to fetch sequence settings", error);
      setSettingsRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "locationUid", header: "Location UID" },
      { key: "storeUid", header: "Store UID" },
      { key: "feature", header: "Feature" },
      { key: "featureModule", header: "Feature Module" },
      {
        key: "details",
        header: "Details",
        align: "right",
        render: (row) => String(Array.isArray(row.details) ? row.details.length : 0),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status || "Disabled"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const nextStatus = row.status === "Enabled" ? "Disabled" : "Enabled";
                try {
                  await financeApi.sequenceSettings.updateStatus(row.uid, nextStatus);
                  loadSettings();
                } catch (error) {
                  console.error("Failed to update sequence setting status", error);
                  alert("Failed to update sequence setting status");
                }
              }}
            >
              {row.status === "Enabled" ? "Disable" : "Enable"}
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Sequence Settings"
      subtitle="Manage finance sequence settings that drive numbering contexts."
      actions={<Button onClick={() => navigate("create")}>Create Sequence Setting</Button>}
      main={
        <DataTableCard
          title="Sequence Settings List"
          subtitle="Finance sequence settings."
          data={settingsRows}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No sequence settings"
          emptyDescription={loading ? "Loading..." : "Sequence settings will appear here."}
        />
      }
    />
  );
}

function SequenceSettingCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const navigateToSequenceSettingsList = () => navigate("..", { relative: "path", replace: true });
  const locationRecord = (mfeProps.location ?? {}) as Record<string, unknown>;
  const defaultLocationUid = String(locationRecord.uid ?? locationRecord.locationUid ?? locationRecord.id ?? "");
  const defaultStoreUid = String(locationRecord.storeUid ?? locationRecord.storeId ?? "");

  const [locationUid, setLocationUid] = useState(defaultLocationUid);
  const [storeUid, setStoreUid] = useState(defaultStoreUid);
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [subFeature, setSubFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [featureModule, setFeatureModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [financeModule, setFinanceModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [sequenceTemplateOptions, setSequenceTemplateOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [details, setDetails] = useState<any[]>([
    {
      sequenceTemplateUid: "",
      prefix: "",
      suffix: "",
      status: "Enabled",
      isDefault: true,
    },
  ]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSequenceTemplates() {
      try {
        const res = await financeApi.sequenceTemplates.list<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "feature",
            operator: "EQ",
            values: ["FINANCE"],
          },
          // view: "SUMMARY",
        });
        const payload = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data?.data?.content)
            ? res.data.data.content
            : Array.isArray(res.data)
              ? res.data
              : [];
        if (!active) return;
        setSequenceTemplateOptions(
          payload.map((item: any) => ({
            value: String(item.uid),
            label: String(item.name || item.templateName || item.uid),
          }))
        );
      } catch (error) {
        console.error("Failed to load sequence templates", error);
      }
    }
    loadSequenceTemplates();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!locationUid.trim()) {
      setFormError("Location UID is required.");
      return;
    }
    if (details.length === 0) {
      setFormError("At least one detail is required.");
      return;
    }
    if (details.some((item) => !String(item.sequenceTemplateUid || "").trim())) {
      setFormError("Sequence template is required for every detail.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.sequenceSettings.create({
        locationUid: locationUid.trim(),
        storeUid: storeUid.trim() || undefined,
        feature,
        subFeature,
        featureModule,
        financeModule,
        remarks: remarks.trim() || undefined,
        status,
        details: details.map((item) => ({
          locationUid: locationUid.trim(),
          storeUid: storeUid.trim() || undefined,
          feature,
          subFeature,
          featureModule,
          financeModule,
          sequenceTemplateUid: String(item.sequenceTemplateUid).trim(),
          prefix: String(item.prefix || "").trim() || undefined,
          suffix: String(item.suffix || "").trim() || undefined,
          status: item.status || "Enabled",
          isDefault: Boolean(item.isDefault),
        })),
      });
      navigateToSequenceSettingsList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create sequence setting", error);
      setFormError(error instanceof Error ? error.message : "Could not create sequence setting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Sequence Setting"
      subtitle="Create a finance sequence setting."
      actions={<Button variant="outline" onClick={navigateToSequenceSettingsList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Location UID *" value={locationUid} onChange={(event) => setLocationUid(event.target.value)} required />
            <Input label="Store UID" value={storeUid} onChange={(event) => setStoreUid(event.target.value)} />
            <Select label="Feature" value={feature} onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select label="Finance Module" value={financeModule} onChange={(event) => setFinanceModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <SectionCard title="Details" className="border-slate-200 shadow-none">
            <div className="grid gap-4">
              {details.map((detail, index) => (
                <div key={`sequence-detail-${index}`} className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
                  <Select
                    label="Sequence Template *"
                    value={detail.sequenceTemplateUid}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sequenceTemplateUid: event.target.value } : item
                        )
                      )
                    }
                    options={[{ value: "", label: "Select template" }, ...sequenceTemplateOptions]}
                  />
                  <Select
                    label="Detail Status"
                    value={detail.status}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, status: event.target.value } : item))
                      )
                    }
                    options={[
                      { value: "Enabled", label: "Enabled" },
                      { value: "Disabled", label: "Disabled" },
                    ]}
                  />
                  <Input
                    label="Prefix"
                    maxLength={4}
                    value={detail.prefix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, prefix: event.target.value } : item))
                      )
                    }
                  />
                  <Input
                    label="Suffix"
                    maxLength={6}
                    value={detail.suffix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, suffix: event.target.value } : item))
                      )
                    }
                  />
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={Boolean(detail.isDefault)}
                      onChange={(checked) =>
                        setDetails((current) =>
                          current.map((item, itemIndex) => ({
                            ...item,
                            isDefault: itemIndex === index ? checked : checked ? false : item.isDefault,
                          }))
                        )
                      }
                    />
                    <label className="text-sm font-semibold text-slate-700">Default Detail</label>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setDetails((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                      }
                      disabled={details.length === 1}
                    >
                      Remove Detail
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDetails((current) => [
                      ...current,
                      {
                        sequenceTemplateUid: "",
                        prefix: "",
                        suffix: "",
                        status: "Enabled",
                        isDefault: current.length === 0,
                      },
                    ])
                  }
                >
                  Add Detail
                </Button>
              </div>
            </div>
          </SectionCard>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceSettingsList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Setting"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceSettingEditPage() {
  const navigate = useNavigate();
  const navigateToSequenceSettingsList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [locationUid, setLocationUid] = useState("");
  const [storeUid, setStoreUid] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [subFeature, setSubFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [featureModule, setFeatureModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [financeModule, setFinanceModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [sequenceTemplateOptions, setSequenceTemplateOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSequenceTemplates() {
      try {
        const res = await financeApi.sequenceTemplates.list<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "feature",
            operator: "EQ",
            values: ["FINANCE"],
          },
          // view: "SUMMARY",
        });
        const payload = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data?.data?.content)
            ? res.data.data.content
            : Array.isArray(res.data)
              ? res.data
              : [];
        if (!active) return;
        setSequenceTemplateOptions(
          payload.map((item: any) => ({
            value: String(item.uid),
            label: String(item.name || item.templateName || item.uid),
          }))
        );
      } catch (error) {
        console.error("Failed to load sequence templates", error);
      }
    }
    loadSequenceTemplates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSetting() {
      if (!id) return;
      try {
        const res = await financeApi.sequenceSettings.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setLocationUid(String(data.locationUid || ""));
          setStoreUid(String(data.storeUid || ""));
          setFeature((data.feature || "FINANCE") as SequenceTemplateFeature);
          setSubFeature((data.subFeature || "FINANCE") as SequenceTemplateFeature);
          setFeatureModule((data.featureModule || "FINANCE_CORE") as FinanceFeatureModule);
          setFinanceModule((data.financeModule || data.featureModule || "FINANCE_CORE") as FinanceFeatureModule);
          setRemarks(String(data.remarks || ""));
          setStatus(String(data.status || "Enabled"));
          setDetails(
            Array.isArray(data.details) && data.details.length > 0
              ? data.details.map((item: any) => ({
                  uid: item.uid,
                  sequenceTemplateUid: String(item.sequenceTemplateUid || ""),
                  prefix: String(item.prefix || ""),
                  suffix: String(item.suffix || ""),
                  status: String(item.status || "Enabled"),
                  isDefault: Boolean(item.isDefault),
                }))
              : [
                  {
                    sequenceTemplateUid: "",
                    prefix: "",
                    suffix: "",
                    status: "Enabled",
                    isDefault: true,
                  },
                ]
          );
        }
      } catch (error) {
        console.error("Failed to load sequence setting", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSetting();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!locationUid.trim()) {
      setFormError("Location UID is required.");
      return;
    }
    if (details.length === 0) {
      setFormError("At least one detail is required.");
      return;
    }
    if (details.some((item) => !String(item.sequenceTemplateUid || "").trim())) {
      setFormError("Sequence template is required for every detail.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.sequenceSettings.update(id!, {
        uid: id,
        locationUid: locationUid.trim(),
        storeUid: storeUid.trim() || undefined,
        feature,
        subFeature,
        featureModule,
        financeModule,
        remarks: remarks.trim() || undefined,
        status,
        details: details.map((item) => ({
          uid: item.uid || undefined,
          locationUid: locationUid.trim(),
          storeUid: storeUid.trim() || undefined,
          feature,
          subFeature,
          featureModule,
          financeModule,
          sequenceTemplateUid: String(item.sequenceTemplateUid).trim(),
          prefix: String(item.prefix || "").trim() || undefined,
          suffix: String(item.suffix || "").trim() || undefined,
          status: item.status || "Enabled",
          isDefault: Boolean(item.isDefault),
        })),
      });
      navigateToSequenceSettingsList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update sequence setting", error);
      setFormError(error instanceof Error ? error.message : "Could not update sequence setting.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading sequence setting...</div>;
  }

  return (
    <PageShell
      title="Edit Sequence Setting"
      subtitle="Update finance sequence setting details."
      actions={<Button variant="outline" onClick={navigateToSequenceSettingsList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Location UID *" value={locationUid} onChange={(event) => setLocationUid(event.target.value)} required />
            <Input label="Store UID" value={storeUid} onChange={(event) => setStoreUid(event.target.value)} />
            <Select label="Feature" value={feature} onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select label="Finance Module" value={financeModule} onChange={(event) => setFinanceModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <SectionCard title="Details" className="border-slate-200 shadow-none">
            <div className="grid gap-4">
              {details.map((detail, index) => (
                <div key={detail.uid || `sequence-setting-detail-${index}`} className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
                  <Select
                    label="Sequence Template *"
                    value={detail.sequenceTemplateUid}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sequenceTemplateUid: event.target.value } : item
                        )
                      )
                    }
                    options={[{ value: "", label: "Select template" }, ...sequenceTemplateOptions]}
                  />
                  <Select
                    label="Detail Status"
                    value={detail.status}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, status: event.target.value } : item))
                      )
                    }
                    options={[
                      { value: "Enabled", label: "Enabled" },
                      { value: "Disabled", label: "Disabled" },
                    ]}
                  />
                  <Input
                    label="Prefix"
                    maxLength={4}
                    value={detail.prefix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, prefix: event.target.value } : item))
                      )
                    }
                  />
                  <Input
                    label="Suffix"
                    maxLength={6}
                    value={detail.suffix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, suffix: event.target.value } : item))
                      )
                    }
                  />
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={Boolean(detail.isDefault)}
                      onChange={(checked) =>
                        setDetails((current) =>
                          current.map((item, itemIndex) => ({
                            ...item,
                            isDefault: itemIndex === index ? checked : checked ? false : item.isDefault,
                          }))
                        )
                      }
                    />
                    <label className="text-sm font-semibold text-slate-700">Default Detail</label>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setDetails((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                      }
                      disabled={details.length === 1}
                    >
                      Remove Detail
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDetails((current) => [
                      ...current,
                      {
                        sequenceTemplateUid: "",
                        prefix: "",
                        suffix: "",
                        status: "Enabled",
                        isDefault: current.length === 0,
                      },
                    ])
                  }
                >
                  Add Detail
                </Button>
              </div>
            </div>
          </SectionCard>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceSettingsList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Setting"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function PlaceholderPage() {
  const location = useLocation();
  const title = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const section = parts[1] ?? "finance";
    return section
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [location.pathname]);

  return (
    <PageShell
      title={title}
      subtitle="This finance route is registered and ready for its feature implementation."
    >
      <SectionCard>
        <EmptyState
          title={`${title} is routed`}
          description="The route resolves through shell and the Finance microfrontend."
        />
      </SectionCard>
    </PageShell>
  );
}

function withBoundary(element: ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>;
}

export default function App() {
  const placeholderRoutes = [
    "summary",
    "cash-flow",
    "transactions/*",
    "credit-notes/*",
    "advance-payments/*",
    "cheques/*",
    "write-offs/*",
    "multi-currency/*",
    "donations/*",
    "accounting/*",
    "customers/*",
    "leads/*",
    "tasks/*",
    "users/*",
    "analytics/*",
    "drive/*",
    "membership/*",
    "audit-log/*",
    "settings/*",
  ];

  return (
    <FinanceLiveProvider>
      <Routes>
        <Route path="" element={withBoundary(<OverviewPage />)} />
        <Route path="dashboard" element={withBoundary(<DashboardRedirect />)} />
        <Route path="estimates" element={withBoundary(<EstimatesPage />)} />
        <Route path="estimates/new" element={withBoundary(<EstimatesPage />)} />
        <Route path="estimates/:id" element={withBoundary(<EstimatesPage />)} />
        <Route path="customers" element={withBoundary(<CustomersPage />)} />
        <Route path="customers/create" element={withBoundary(<CustomerCreatePage />)} />
        <Route path="vendors" element={withBoundary(<VendorsPage />)} />
        <Route path="ledger" element={withBoundary(<LedgerPage />)} />
        <Route path="receivables" element={withBoundary(<ReceivablesPage />)} />
        <Route path="receivables/create" element={withBoundary(<ReceivablesCreatePage />)} />
        <Route path="receivables/edit/:id" element={withBoundary(<ReceivablesEditPage />)} />
        <Route path="payable" element={withBoundary(<PayablesPage />)} />
        <Route path="payable/create" element={withBoundary(<PayablesCreatePage />)} />
        <Route path="payable/edit/:id" element={withBoundary(<PayablesEditPage />)} />
        <Route path="expense" element={withBoundary(<ExpensesPage />)} />
        <Route path="expense/new" element={withBoundary(<ExpensesCreatePage />)} />
        <Route path="expense/edit/:id" element={withBoundary(<ExpensesEditPage />)} />
        <Route path="discount" element={withBoundary(<DiscountsPage />)} />
        <Route path="discount/create" element={withBoundary(<DiscountCreatePage />)} />
        <Route path="discount/edit/:id" element={withBoundary(<DiscountEditPage />)} />
        <Route path="coupons" element={withBoundary(<CouponsPage />)} />
        <Route path="coupons/create" element={withBoundary(<CouponCreatePage />)} />
        <Route path="coupons/edit/:id" element={withBoundary(<CouponEditPage />)} />
        <Route path="invoice" element={withBoundary(<InvoicesPage />)} />
        <Route path="invoice/newInvoice" element={withBoundary(<FinanceInvoiceForm />)} />
        <Route path="invoice/edit/:id" element={withBoundary(<FinanceInvoiceForm />)} />
        <Route path="invoice/view/:uid" element={withBoundary(<MasterInvoicePage />)} />
        <Route path="sequence-template" element={withBoundary(<SequenceTemplatesPage />)} />
        <Route path="sequence-template/create" element={withBoundary(<SequenceTemplateCreatePage />)} />
        <Route path="sequence-template/edit/:id" element={withBoundary(<SequenceTemplateEditPage />)} />
        <Route path="sequence-settings" element={withBoundary(<SequenceSettingsPage />)} />
        <Route path="sequence-settings/create" element={withBoundary(<SequenceSettingCreatePage />)} />
        <Route path="sequence-settings/edit/:id" element={withBoundary(<SequenceSettingEditPage />)} />
        <Route path="items" element={withBoundary(<ItemsPage />)} />
        <Route path="items/create" element={withBoundary(<ItemsCreatePage />)} />
        <Route path="items/edit/:id" element={withBoundary(<ItemsEditPage />)} />
        <Route path="category" element={withBoundary(<CategoryPage />)} />
        <Route path="category/create" element={withBoundary(<CategoryCreatePage />)} />
        <Route path="status" element={withBoundary(<StatusPage />)} />
        <Route path="status/create" element={withBoundary(<StatusCreatePage />)} />
        <Route path="total" element={withBoundary(<TotalListPage />)} />
        <Route path="cashInhand" element={withBoundary(<CashInHandPage />)} />
        <Route path="cashInhand/reserve/new" element={withBoundary(<CashReserveCreatePage />)} />
        <Route path="cashInhand/view/:id" element={withBoundary(<CashReserveViewPage />)} />
        <Route path="cashRegister" element={withBoundary(<CashRegisterPage />)} />
        <Route path="cashRegister/reserve/new" element={withBoundary(<CashReserveCreatePage />)} />
        <Route path="activity-log" element={withBoundary(<ActivityLogPage />)} />
        <Route path="master-invoice/:uid" element={withBoundary(<MasterInvoicePage />)} />
        <Route path="reports" element={withBoundary(<ReportsPage />)} />
        <Route path="settings" element={withBoundary(<SettingsPage />)} />
        {placeholderRoutes.map((path) => (
          <Route key={path} path={path} element={withBoundary(<PlaceholderPage />)} />
        ))}
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </FinanceLiveProvider>
  );
}
