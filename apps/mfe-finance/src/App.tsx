import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  BarChart,
  Button,
  DataTable,
  EmptyState,
  Icon,
  PageErrorBoundary,
  PageHeader,
  SectionCard,
  StatCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import {
  financeActivityLogs,
  financeCashInHand,
  financeCashRegisters,
  financeCategories,
  financeEstimates,
  financeExpenses,
  financeInvoices,
  financeLedgerEntries,
  financePayments,
  financePayables,
  financeReceivables,
  financeReportMetrics,
  financeStatuses,
  financeSummaryCards,
  financeVendors,
  formatCurrency,
  getStatusVariant,
} from "./lib/financeData";

type Accent = "indigo" | "emerald" | "amber" | "rose";

type QuickAction = {
  label: string;
  path: string;
  icon: "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";
  tone: string;
  note: string;
};

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
  const mfeProps = useMFEProps();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="space-y-5">
        <div>
          <div className="text-[28px] font-semibold tracking-tight text-[#312E81]">Finance Manager Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">Keep a tab on your finance and manage your finance operations smoothly.</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-8">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => mfeProps.navigate(action.path)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.tone}`}>
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-900">{action.label}</div>
              <div className="mt-1 text-xs text-slate-500">{action.note}</div>
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
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
          <div className="text-[24px] font-semibold text-slate-900">{title}</div>
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
  const userName = mfeProps.user.name || "User";
  const locationName = mfeProps.location?.name ?? "current location";
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Revenue" | "Payout">("All");

  const dashboardActions: QuickAction[] = [
    { label: "Create Invoice", path: "/finance/invoice", icon: "packagePlus", tone: "bg-indigo-50 text-indigo-600", note: "Issue new billing" },
    { label: "Create Expense", path: "/finance/expense", icon: "alert", tone: "bg-rose-50 text-rose-600", note: "Book operations cost" },
    { label: "Add Revenue", path: "/finance/payments", icon: "trend", tone: "bg-emerald-50 text-emerald-600", note: "Record collections" },
    { label: "Create Payout", path: "/finance/payable", icon: "history", tone: "bg-amber-50 text-amber-600", note: "Queue vendor payout" },
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
    { label: "Activity Log", path: "/finance/activity-log", icon: "history", tone: "bg-slate-100 text-slate-700", note: "Audit trail" },
    { label: "Edit Actions", path: "/finance/settings", icon: "list", tone: "bg-slate-100 text-slate-700", note: "Configure dashboard" },
  ];

  const transactionRows = useMemo(() => {
    const revenueRows = financePayments.map((payment) => ({
      id: payment.id,
      title: `Revenue/${payment.id}`,
      subtitle: payment.payer,
      kind: "Revenue" as const,
      date: payment.receivedOn,
      amount: payment.amount,
    }));

    const payoutRows = financeExpenses.map((expense) => ({
      id: expense.id,
      title: `Expense/${expense.id}`,
      subtitle: expense.owner,
      kind: "Payout" as const,
      date: expense.bookedOn,
      amount: expense.amount,
    }));

    const combined = [...revenueRows, ...payoutRows].sort((a, b) => b.date.localeCompare(a.date));

    if (transactionFilter === "Revenue") {
      return combined.filter((row) => row.kind === "Revenue");
    }

    if (transactionFilter === "Payout") {
      return combined.filter((row) => row.kind === "Payout");
    }

    return combined;
  }, [transactionFilter]);

  const statisticsData = [
    { label: "Wednesday", value: 48000 },
    { label: "Thursday", value: 32000 },
    { label: "Friday", value: 61000 },
    { label: "Saturday", value: 54000 },
    { label: "Sunday", value: 29000 },
    { label: "Monday", value: 46000 },
    { label: "Tuesday", value: 38000 },
  ];

  const accountBalance = 0;
  const cashInHandTotal = financeCashInHand.reduce((sum, entry) => sum + entry.amount, 0);
  const revenueTotal = financePayments.reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = financeExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const payoutTotal = financePayables.reduce((sum, entry) => sum + entry.amountDue, 0);
  const latestCashUpdate = financeCashInHand.at(-1)?.updatedOn ?? "-";
  const recentInvoices = financeInvoices.slice(0, 5);
  const recentVendors = financeVendors.slice(0, 6);

  return (
    <PageShell
      title={`Welcome back, ${userName}`}
      subtitle={`Finance overview for ${locationName}. This mirrors the legacy finance dashboard inside the new microfrontend.`}
      actions={<Button onClick={() => mfeProps.navigate("/finance/invoice")}>Open Invoices</Button>}
    >
      <QuickActions actions={dashboardActions} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[32px] font-semibold text-slate-900">Account Balance</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Today</div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#3B07B8] px-6 py-7 text-white shadow-lg">
              <div className="text-lg font-medium text-indigo-100">Your Account Balance</div>
              <div className="mt-3 text-3xl font-semibold">{formatCurrency(accountBalance)}</div>
            </div>

            <div className="mt-6">
              <div className="text-[24px] font-semibold text-slate-900">Recent Transaction</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <StatCard label="Revenue" value={formatCurrency(revenueTotal)} accent="emerald" />
                <StatCard label="Expenses" value={formatCurrency(expenseTotal)} accent="rose" />
                <StatCard label="Payout" value={formatCurrency(payoutTotal)} accent="amber" />
              </div>

              <div className="mt-5 flex gap-3 text-sm font-semibold">
                {(["All", "Revenue", "Payout"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTransactionFilter(tab)}
                    className={`rounded-full px-4 py-2 transition ${
                      transactionFilter === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {transactionRows.slice(0, 8).map((row) => (
                  <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:grid-cols-[1.5fr_1fr_auto] md:items-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{row.title}</div>
                      <div className="text-sm text-slate-600">{row.subtitle}</div>
                      <div className={`mt-1 text-sm font-medium ${row.kind === "Revenue" ? "text-emerald-600" : "text-rose-500"}`}>
                        {row.kind === "Revenue" ? "Revenue ->" : "Payout ->"}
                      </div>
                    </div>
                    <div className="text-base text-slate-600">{row.date}</div>
                    <div className="text-right text-xl font-semibold text-slate-900">{formatCurrency(row.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Cash Inhand</div>
              <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-500">
                <Icon name="refresh" />
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-500 px-5 py-5 text-white">
              <div className="text-base text-slate-100">Amount</div>
              <div className="mt-2 text-4xl font-semibold">{formatCurrency(cashInHandTotal)}</div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => mfeProps.navigate("/finance/cashRegister")}>
                  Cash Register
                </Button>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-500">Last Updated On {latestCashUpdate}</div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Expenses Breakdown</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Today</div>
            </div>
            <div className="mt-4 space-y-3">
              {financeExpenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <div className="font-semibold text-slate-900">{expense.category}</div>
                    <div className="text-sm text-slate-500">{expense.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{formatCurrency(expense.amount)}</div>
                    <button type="button" onClick={() => mfeProps.navigate("/finance/expense")} className="text-sm font-medium text-indigo-700">
                      See all
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Statistics</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Last 7 Days</div>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <FeedCard title="Invoices" actionLabel="+ Add New" onAction={() => mfeProps.navigate("/finance/invoice")}>
              <div className="space-y-4">
                {recentInvoices.map((invoice, index) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => mfeProps.navigate(`/finance/master-invoice/${invoice.id}`)}
                    className="block w-full border-b border-slate-100 pb-3 text-left last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {index === 0 ? <div className="text-sm font-semibold text-indigo-700">Most Recent</div> : null}
                        <div className="font-semibold text-slate-900">Invoice : #{invoice.id.replace("INV-", "")}</div>
                        <div className="text-sm text-slate-600">{invoice.customer}</div>
                        <div className="mt-1"><Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge></div>
                      </div>
                      <div className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</div>
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
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-slate-50"
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
                    <div className="text-slate-400">-&gt;</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => mfeProps.navigate("/finance/vendors")} className="mt-4 text-lg font-semibold text-indigo-700">
                See All({financeVendors.length})
              </button>
            </FeedCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue" value={formatCurrency(revenueTotal)} accent="emerald" />
            <StatCard label="Expenses" value={formatCurrency(expenseTotal)} accent="rose" />
            <StatCard label="Payout" value={formatCurrency(payoutTotal)} accent="amber" />
            {financeSummaryCards.slice(3, 4).map((card) => (
              <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function DashboardRedirect() {
  return <Navigate to="/finance" replace />;
}

function EstimatesPage() {
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

  return (
    <FinanceFeatureLayout
      title="Estimates"
      subtitle="Proposal and estimate tracking aligned with the finance module route structure."
      actions={<Button>Create Estimate</Button>}
      stats={[
        { label: "Total Estimates", value: String(financeEstimates.length), accent: "indigo" },
        { label: "Approved Value", value: formatCurrency(approvedValue), accent: "emerald" },
        { label: "Pending Review", value: String(financeEstimates.filter((item) => item.stage !== "Approved").length), accent: "amber" },
        { label: "Expiring Soon", value: "2", accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Estimate Register"
          subtitle="Track proposals before they become invoices or formal billing."
          data={financeEstimates}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No estimates"
          emptyDescription="Estimates will appear here."
        />
      }
      aside={
        <FeedCard title="Pipeline Summary">
          <SummaryList
            rows={financeEstimates.map((estimate) => ({
              label: estimate.account,
              value: formatCurrency(estimate.amount),
              note: `${estimate.title} | ${estimate.stage}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function InvoicesPage() {
  const mfeProps = useMFEProps();
  const columns = useMemo<ColumnDef<(typeof financeInvoices)[number]>[]>(
    () => [
      { key: "id", header: "Invoice" },
      { key: "customer", header: "Customer" },
      { key: "category", header: "Category" },
      { key: "dueDate", header: "Due Date" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "status", header: "Status", render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge> },
    ],
    []
  );

  const paidTotal = financeInvoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingTotal = financeInvoices.filter((invoice) => invoice.status !== "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <FinanceFeatureLayout
      title="Invoices"
      subtitle="Invoice operations rebuilt from the legacy finance module."
      actions={<Button>New Invoice</Button>}
      stats={[
        { label: "Invoice Count", value: String(financeInvoices.length), accent: "indigo" },
        { label: "Collected", value: formatCurrency(paidTotal), accent: "emerald" },
        { label: "Open Amount", value: formatCurrency(pendingTotal), accent: "amber" },
        { label: "Overdue", value: String(financeInvoices.filter((invoice) => invoice.status === "Overdue").length), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Invoice List"
          subtitle="Recent and active finance invoices."
          data={financeInvoices}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No invoices"
          emptyDescription="Invoices will appear here."
        />
      }
      aside={
        <>
          <FeedCard title="Most Recent">
            <div className="space-y-3">
              {financeInvoices.slice(0, 5).map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => mfeProps.navigate(`/finance/master-invoice/${invoice.id}`)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">Invoice : #{invoice.id.replace("INV-", "")}</div>
                      <div className="text-sm text-slate-500">{invoice.customer}</div>
                    </div>
                    <div className="text-base font-semibold text-slate-900">{formatCurrency(invoice.amount)}</div>
                  </div>
                </button>
              ))}
            </div>
          </FeedCard>
          <FeedCard title="Status Split">
            <SummaryList
              rows={[
                { label: "Paid", value: String(financeInvoices.filter((item) => item.status === "Paid").length), note: "Settled invoices" },
                { label: "Pending", value: String(financeInvoices.filter((item) => item.status === "Pending").length), note: "Awaiting payment" },
                { label: "Overdue", value: String(financeInvoices.filter((item) => item.status === "Overdue").length), note: "Requires follow-up" },
              ]}
            />
          </FeedCard>
        </>
      }
    />
  );
}

function PaymentsPage() {
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
      actions={<Button>Record Payment</Button>}
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
      stats={[
        { label: "Vendors", value: String(financeVendors.length), accent: "indigo" },
        { label: "Active", value: String(financeVendors.filter((vendor) => vendor.status === "Active").length), accent: "emerald" },
        { label: "On Hold", value: String(financeVendors.filter((vendor) => vendor.status === "On Hold").length), accent: "amber" },
        { label: "Payables", value: formatCurrency(financeVendors.reduce((sum, vendor) => sum + vendor.payable, 0)), accent: "rose" },
      ]}
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
      aside={
        <FeedCard title="Priority Vendors">
          <SummaryList
            rows={financeVendors.slice(0, 6).map((vendor) => ({
              label: vendor.name,
              value: formatCurrency(vendor.payable),
              note: `${vendor.category} | ${vendor.status}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function LedgerPage() {
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
  const columns = useMemo<ColumnDef<(typeof financeReceivables)[number]>[]>(
    () => [
      { key: "customer", header: "Customer" },
      { key: "invoiceId", header: "Invoice" },
      { key: "amountDue", header: "Amount Due", align: "right", render: (row) => formatCurrency(row.amountDue) },
      { key: "ageing", header: "Ageing" },
      { key: "owner", header: "Owner" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Receivables"
      subtitle="Outstanding incoming balances and collections ownership."
      actions={<Button>Add Revenue</Button>}
      stats={[
        { label: "Receivable Accounts", value: String(financeReceivables.length), accent: "indigo" },
        { label: "Outstanding", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "Largest Dues", value: formatCurrency(Math.max(...financeReceivables.map((row) => row.amountDue))), accent: "rose" },
        { label: "Collections Owners", value: String(new Set(financeReceivables.map((row) => row.owner)).size), accent: "emerald" },
      ]}
      main={
        <DataTableCard
          title="Receivables Queue"
          subtitle="Follow-up list for unpaid and partially settled invoices."
          data={financeReceivables}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No receivables"
          emptyDescription="Receivables will appear here."
        />
      }
      aside={
        <FeedCard title="Ageing View">
          <SummaryList
            rows={financeReceivables.map((row) => ({
              label: row.customer,
              value: row.ageing,
              note: `${row.invoiceId} | ${formatCurrency(row.amountDue)}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function PayablesPage() {
  const columns = useMemo<ColumnDef<(typeof financePayables)[number]>[]>(
    () => [
      { key: "vendor", header: "Vendor" },
      { key: "billRef", header: "Bill Ref" },
      { key: "amountDue", header: "Amount Due", align: "right", render: (row) => formatCurrency(row.amountDue) },
      { key: "dueOn", header: "Due On" },
      { key: "priority", header: "Priority" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Payables"
      subtitle="Payables queue and outgoing vendor commitments."
      actions={<Button>Create Payout</Button>}
      stats={[
        { label: "Open Bills", value: String(financePayables.length), accent: "indigo" },
        { label: "Amount Due", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "High Priority", value: String(financePayables.filter((row) => row.priority === "High").length), accent: "rose" },
        { label: "Vendors", value: String(new Set(financePayables.map((row) => row.vendor)).size), accent: "emerald" },
      ]}
      main={
        <DataTableCard
          title="Payables Queue"
          subtitle="Vendor payments due soon."
          data={financePayables}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No payables"
          emptyDescription="Payable entries will appear here."
        />
      }
      aside={
        <FeedCard title="Due Soon">
          <SummaryList
            rows={financePayables.map((row) => ({
              label: row.vendor,
              value: row.dueOn,
              note: `${row.billRef} | ${formatCurrency(row.amountDue)} | ${row.priority}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function ExpensesPage() {
  const columns = useMemo<ColumnDef<(typeof financeExpenses)[number]>[]>(
    () => [
      { key: "title", header: "Expense" },
      { key: "category", header: "Category" },
      { key: "owner", header: "Owner" },
      { key: "bookedOn", header: "Booked On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  const byCategory = Array.from(new Set(financeExpenses.map((expense) => expense.category))).map((category) => ({
    category,
    total: financeExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
  }));

  return (
    <FinanceFeatureLayout
      title="Expenses"
      subtitle="Operational and compliance expense tracking."
      actions={<Button>Add Expense</Button>}
      stats={[
        { label: "Expense Count", value: String(financeExpenses.length), accent: "indigo" },
        { label: "Expense Total", value: formatCurrency(financeExpenses.reduce((sum, row) => sum + row.amount, 0)), accent: "rose" },
        { label: "Categories", value: String(byCategory.length), accent: "amber" },
        { label: "Latest Booking", value: financeExpenses[0]?.bookedOn ?? "-", accent: "emerald" },
      ]}
      main={
        <DataTableCard
          title="Expense Register"
          subtitle="Booked finance expenses and category ownership."
          data={financeExpenses}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No expenses"
          emptyDescription="Expense entries will appear here."
        />
      }
      aside={
        <FeedCard title="Category Breakdown">
          <SummaryList
            rows={byCategory.map((row) => ({
              label: row.category,
              value: formatCurrency(row.total),
              note: `${financeExpenses.filter((expense) => expense.category === row.category).length} entries`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function CategoryPage() {
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
      actions={<Button>Create Category</Button>}
      stats={[
        { label: "Categories", value: String(financeCategories.length), accent: "indigo" },
        { label: "Invoice Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Invoices").length), accent: "emerald" },
        { label: "Expense Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Expenses").length), accent: "amber" },
        { label: "Ledger Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Ledger").length), accent: "rose" },
      ]}
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
      aside={
        <FeedCard title="Usage Summary">
          <SummaryList
            rows={financeCategories.map((item) => ({
              label: item.name,
              value: String(item.usageCount),
              note: `Linked to ${item.linkedTo}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function StatusPage() {
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
      actions={<Button>Create Status</Button>}
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
          <div className="text-[24px] font-semibold text-slate-900">Finance Totals</div>
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
  const columns = useMemo<ColumnDef<(typeof financeCashInHand)[number]>[]>(
    () => [
      { key: "source", header: "Source" },
      { key: "owner", header: "Owner" },
      { key: "updatedOn", header: "Updated On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Cash In Hand"
      subtitle="Current cash availability and custody visibility."
      actions={<Button>Refresh Cash</Button>}
      stats={[
        { label: "Cash Sources", value: String(financeCashInHand.length), accent: "indigo" },
        { label: "Total Cash", value: formatCurrency(financeCashInHand.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Largest Source", value: formatCurrency(Math.max(...financeCashInHand.map((row) => row.amount))), accent: "amber" },
        { label: "Custodians", value: String(new Set(financeCashInHand.map((row) => row.owner)).size), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Cash Sources"
          subtitle="Cash reserve locations and accountable owners."
          data={financeCashInHand}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No cash in hand records"
          emptyDescription="Cash in hand entries will appear here."
        />
      }
      aside={
        <FeedCard title="Latest Snapshots">
          <SummaryList
            rows={financeCashInHand.map((row) => ({
              label: row.source,
              value: formatCurrency(row.amount),
              note: `${row.owner} | ${row.updatedOn}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function CashRegisterPage() {
  const columns = useMemo<ColumnDef<(typeof financeCashRegisters)[number]>[]>(
    () => [
      { key: "source", header: "Register" },
      { key: "owner", header: "Owner" },
      { key: "updatedOn", header: "Updated On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Cash Register"
      subtitle="Register balances and last update snapshots."
      actions={<Button>View Reconciliation</Button>}
      stats={[
        { label: "Registers", value: String(financeCashRegisters.length), accent: "indigo" },
        { label: "Balance", value: formatCurrency(financeCashRegisters.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Main Register", value: formatCurrency(financeCashRegisters[0]?.amount ?? 0), accent: "amber" },
        { label: "Updated Today", value: "2", accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Register Snapshot"
          subtitle="Cash register visibility for the finance workspace."
          data={financeCashRegisters}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No cash register data"
          emptyDescription="Cash register entries will appear here."
        />
      }
      aside={
        <FeedCard title="Register Owners">
          <SummaryList
            rows={financeCashRegisters.map((row) => ({
              label: row.owner,
              value: formatCurrency(row.amount),
              note: `${row.source} | ${row.updatedOn}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function ActivityLogPage() {
  const columns = useMemo<ColumnDef<(typeof financeActivityLogs)[number]>[]>(
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
        { label: "Events", value: String(financeActivityLogs.length), accent: "indigo" },
        { label: "Human Actions", value: String(financeActivityLogs.filter((item) => item.actor !== "Finance Bot").length), accent: "emerald" },
        { label: "Automation", value: String(financeActivityLogs.filter((item) => item.actor === "Finance Bot").length), accent: "amber" },
        { label: "Tracked Targets", value: String(new Set(financeActivityLogs.map((item) => item.target)).size), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Audit Trail"
          subtitle="Recent finance activity across invoices, vendors, and ledger."
          data={financeActivityLogs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No finance activity"
          emptyDescription="Activity entries will appear here."
        />
      }
      aside={
        <FeedCard title="Recent Events">
          <SummaryList
            rows={financeActivityLogs.map((item) => ({
              label: item.action,
              value: item.timestamp,
              note: `${item.actor} -> ${item.target}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

function ReportsPage() {
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
      actions={<Button>Export Report</Button>}
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
  const invoice = financeInvoices.find((entry) => entry.id === uid) ?? financeInvoices[0];

  return (
    <PageShell
      title={`Master Invoice ${invoice.id}`}
      subtitle="Invoice detail shell aligned with the legacy finance route structure."
      actions={<Button>Print Invoice</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Invoice Summary" className="border-slate-200 shadow-sm lg:col-span-2">
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Customer</span>
              <span className="font-semibold text-slate-900">{invoice.customer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Category</span>
              <span className="font-semibold text-slate-900">{invoice.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Due Date</span>
              <span className="font-semibold text-slate-900">{invoice.dueDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Status</span>
              <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Next Actions" className="border-slate-200 shadow-sm">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">Share invoice link</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">Capture payment</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">Download statement</div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

function SettingsPage() {
  return (
    <FinanceFeatureLayout
      title="Finance Settings"
      subtitle="Template, category, vendor, and dashboard administration."
      stats={[
        { label: "Dashboard Actions", value: "16", accent: "indigo" },
        { label: "Categories", value: String(financeCategories.length), accent: "emerald" },
        { label: "Statuses", value: String(financeStatuses.length), accent: "amber" },
        { label: "Vendors", value: String(financeVendors.length), accent: "rose" },
      ]}
      main={
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-[24px] font-semibold text-slate-900">Settings Areas</div>
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
        </SectionCard>
      }
      aside={
        <FeedCard title="Migration Notes">
          <SummaryList
            rows={[
              { label: "Dashboard", value: "Migrated", note: "Legacy action grid and cards are now present." },
              { label: "Invoices", value: "Migrated", note: "List, detail shell, and dashboard block added." },
              { label: "Vendors", value: "Migrated", note: "Directory and dashboard feed added." },
              { label: "Deep Forms", value: "Pending", note: "Backend-connected create/edit flows still need service wiring." },
            ]}
          />
        </FeedCard>
      }
    />
  );
}

function withBoundary(element: ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route path="" element={withBoundary(<OverviewPage />)} />
      <Route path="dashboard" element={withBoundary(<DashboardRedirect />)} />
      <Route path="estimates" element={withBoundary(<EstimatesPage />)} />
      <Route path="vendors" element={withBoundary(<VendorsPage />)} />
      <Route path="ledger" element={withBoundary(<LedgerPage />)} />
      <Route path="receivables" element={withBoundary(<ReceivablesPage />)} />
      <Route path="payable" element={withBoundary(<PayablesPage />)} />
      <Route path="expense" element={withBoundary(<ExpensesPage />)} />
      <Route path="invoice" element={withBoundary(<InvoicesPage />)} />
      <Route path="invoices" element={<Navigate to="/finance/invoice" replace />} />
      <Route path="payments" element={withBoundary(<PaymentsPage />)} />
      <Route path="category" element={withBoundary(<CategoryPage />)} />
      <Route path="status" element={withBoundary(<StatusPage />)} />
      <Route path="total" element={withBoundary(<TotalListPage />)} />
      <Route path="cashInhand" element={withBoundary(<CashInHandPage />)} />
      <Route path="cashRegister" element={withBoundary(<CashRegisterPage />)} />
      <Route path="activity-log" element={withBoundary(<ActivityLogPage />)} />
      <Route path="master-invoice/:uid" element={withBoundary(<MasterInvoicePage />)} />
      <Route path="reports" element={withBoundary(<ReportsPage />)} />
      <Route path="settings" element={withBoundary(<SettingsPage />)} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
