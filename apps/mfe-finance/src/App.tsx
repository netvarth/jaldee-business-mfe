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

function GenericTablePage<T extends object>({
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
    <PageShell title={title} subtitle={subtitle} actions={actions}>
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={data}
          columns={columns}
          getRowId={getRowId}
          emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
        />
      </SectionCard>
    </PageShell>
  );
}

function OverviewPage() {
  const mfeProps = useMFEProps();
  const locationName = mfeProps.location?.name ?? "current location";
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Revenue" | "Payout">("All");

  const dashboardActions = [
    { label: "Create Invoice", path: "/finance/invoice", icon: "packagePlus" as const, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Create Expense", path: "/finance/expense", icon: "alert" as const, tone: "bg-rose-50 text-rose-600" },
    { label: "Add Revenue", path: "/finance/payments", icon: "trend" as const, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Create Payout", path: "/finance/payable", icon: "history" as const, tone: "bg-amber-50 text-amber-600" },
    { label: "Create Vendor", path: "/finance/vendors", icon: "globe" as const, tone: "bg-sky-50 text-sky-600" },
    { label: "Invoices", path: "/finance/invoice", icon: "list" as const, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Order Invoices", path: "/finance/receivables", icon: "layers" as const, tone: "bg-violet-50 text-violet-600" },
    { label: "Expenses", path: "/finance/expense", icon: "alert" as const, tone: "bg-rose-50 text-rose-600" },
    { label: "Revenue", path: "/finance/reports", icon: "chart" as const, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Payouts", path: "/finance/payable", icon: "history" as const, tone: "bg-amber-50 text-amber-600" },
    { label: "Vendors", path: "/finance/vendors", icon: "globe" as const, tone: "bg-slate-100 text-slate-700" },
    { label: "Cash Reserve", path: "/finance/cashInhand", icon: "database" as const, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Cash Register", path: "/finance/cashRegister", icon: "database" as const, tone: "bg-lime-50 text-lime-700" },
    { label: "Ledger", path: "/finance/ledger", icon: "warehouse" as const, tone: "bg-sky-50 text-sky-700" },
    { label: "Activity Log", path: "/finance/activity-log", icon: "history" as const, tone: "bg-slate-100 text-slate-700" },
  ];

  const transactionRows = useMemo(() => {
    const revenueRows = financePayments.map((payment) => ({
      id: payment.id,
      title: payment.id,
      subtitle: payment.payer,
      kind: "Revenue" as const,
      date: payment.receivedOn,
      amount: payment.amount,
    }));

    const payoutRows = financeExpenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      subtitle: expense.owner,
      kind: "Payout" as const,
      date: expense.bookedOn,
      amount: expense.amount,
    }));

    const combined = [...revenueRows, ...payoutRows].sort((a, b) => a.id.localeCompare(b.id)).reverse();

    if (transactionFilter === "Revenue") {
      return combined.filter((row) => row.kind === "Revenue");
    }

    if (transactionFilter === "Payout") {
      return combined.filter((row) => row.kind === "Payout");
    }

    return combined;
  }, [transactionFilter]);

  const statisticsData = [
    { label: "Wed", value: 48_000 },
    { label: "Thu", value: 32_000 },
    { label: "Fri", value: 61_000 },
    { label: "Sat", value: 54_000 },
    { label: "Sun", value: 29_000 },
    { label: "Mon", value: 46_000 },
    { label: "Tue", value: 38_000 },
  ];

  const accountBalance = 0;
  const cashInHandTotal = financeCashInHand.reduce((sum, entry) => sum + entry.amount, 0);
  const revenueTotal = financePayments.reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = financeExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const payoutTotal = financePayables.reduce((sum, entry) => sum + entry.amountDue, 0);
  const latestCashUpdate = financeCashInHand[0]?.updatedOn ?? "-";
  const recentInvoices = financeInvoices.slice(0, 5);
  const recentVendors = financeVendors.slice(0, 6);

  return (
    <PageShell
      title={`Welcome back, ${mfeProps.user.name}`}
      subtitle={`Finance overview for ${locationName}. Keep track of collections, payouts, vendors, and account health.`}
      actions={<Button onClick={() => mfeProps.navigate("/finance/invoice")}>Open Invoices</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-5">
          <div>
            <div className="text-[28px] font-semibold tracking-tight text-[#312E81]">Finance Manager Dashboard</div>
            <div className="mt-1 text-sm text-slate-500">Keep a tab on your finance and manage your finance operations smoothly.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-8">
            {dashboardActions.map((action) => (
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
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

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
              <div className="mt-4 flex gap-3 text-sm font-semibold">
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
                        {row.kind === "Revenue" ? "Revenue ↗" : "Payout ↗"}
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
            {financeExpenses.length ? (
              <div className="mt-4 space-y-3">
                {financeExpenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div>
                      <div className="font-semibold text-slate-900">{expense.title}</div>
                      <div className="text-sm text-slate-500">{expense.category}</div>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">{formatCurrency(expense.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <div className="text-2xl font-semibold text-slate-900">No Expenses Found for Today</div>
                <button type="button" className="mt-4 text-lg font-semibold text-indigo-700">
                  See All Expenses
                </button>
              </div>
            )}
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
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[22px] font-semibold text-slate-900">Invoices</div>
                <button type="button" onClick={() => mfeProps.navigate("/finance/invoice")} className="text-lg font-semibold text-indigo-700">+ Add New</button>
              </div>
              <div className="mt-4 space-y-4">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-indigo-700">Most Recent</div>
                        <div className="font-semibold text-slate-900">Invoice : {invoice.id}</div>
                        <div className="text-sm text-slate-600">{invoice.customer}</div>
                        <div className="mt-1"><Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge></div>
                      </div>
                      <div className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => mfeProps.navigate("/finance/invoice")} className="mt-4 text-lg font-semibold text-indigo-700">
                See All ({financeInvoices.length})
              </button>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[22px] font-semibold text-slate-900">Vendors</div>
                <button type="button" onClick={() => mfeProps.navigate("/finance/vendors")} className="text-lg font-semibold text-indigo-700">+ Add New</button>
              </div>
              <div className="mt-4 space-y-3">
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
                    <div className="text-slate-400">→</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => mfeProps.navigate("/finance/vendors")} className="mt-4 text-lg font-semibold text-indigo-700">
                See All ({financeVendors.length})
              </button>
            </SectionCard>
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

  return (
    <GenericTablePage
      title="Estimates"
      subtitle="Proposal and estimate tracking for the finance product."
      actions={<Button>Create Estimate</Button>}
      data={financeEstimates}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No estimates"
      emptyDescription="Estimates will appear here."
    />
  );
}

function InvoicesPage() {
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

  return (
    <GenericTablePage
      title="Invoices"
      subtitle="Invoice operations inspired by the legacy finance module."
      actions={<Button>New Invoice</Button>}
      data={financeInvoices}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No invoices"
      emptyDescription="Invoices will appear here."
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

  return (
    <GenericTablePage
      title="Payments"
      subtitle="Collections, settlement entries, and incoming payment tracking."
      actions={<Button>Record Payment</Button>}
      data={financePayments}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No payments"
      emptyDescription="Payment activity will appear here."
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
    <GenericTablePage
      title="Vendors"
      subtitle="Vendor-facing finance operations from the legacy module, rebuilt in the new app."
      actions={<Button>Add Vendor</Button>}
      data={financeVendors}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No vendors"
      emptyDescription="Vendor records will appear here."
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
    <GenericTablePage
      title="Ledger"
      subtitle="Ledger movements, credits, debits, and running balances."
      actions={<Button>Add Credit</Button>}
      data={financeLedgerEntries}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No ledger entries"
      emptyDescription="Ledger entries will appear here."
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
    <GenericTablePage
      title="Receivables"
      subtitle="Outstanding incoming balances and collection ownership."
      data={financeReceivables}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No receivables"
      emptyDescription="Receivables will appear here."
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
    <GenericTablePage
      title="Payables"
      subtitle="Payables queue and due bill prioritisation."
      data={financePayables}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No payables"
      emptyDescription="Payable entries will appear here."
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

  return (
    <GenericTablePage
      title="Expenses"
      subtitle="Operational and compliance expense tracking."
      actions={<Button>Add Expense</Button>}
      data={financeExpenses}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No expenses"
      emptyDescription="Expense entries will appear here."
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
    <GenericTablePage
      title="Categories"
      subtitle="Finance categories used across invoices, expenses, and ledger flows."
      actions={<Button>Create Category</Button>}
      data={financeCategories}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No categories"
      emptyDescription="Categories will appear here."
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
    <GenericTablePage
      title="Statuses"
      subtitle="Manage finance workflow statuses across module entities."
      actions={<Button>Create Status</Button>}
      data={financeStatuses}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No statuses"
      emptyDescription="Statuses will appear here."
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
    <GenericTablePage
      title="Cash In Hand"
      subtitle="Current cash availability and custody visibility."
      data={financeCashInHand}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No cash in hand records"
      emptyDescription="Cash in hand entries will appear here."
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
    <GenericTablePage
      title="Cash Register"
      subtitle="Register balances and last update snapshots."
      data={financeCashRegisters}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No cash register data"
      emptyDescription="Cash register entries will appear here."
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
    <GenericTablePage
      title="Activity Log"
      subtitle="Audit visibility for the finance workspace."
      data={financeActivityLogs}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No finance activity"
      emptyDescription="Activity entries will appear here."
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
    <GenericTablePage
      title="Reports"
      subtitle="Core finance indicators rebuilt from the broader legacy finance feature set."
      data={financeReportMetrics}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No report metrics"
      emptyDescription="Report metrics will appear here."
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
    <PageShell
      title="Finance Settings"
      subtitle="Template, category, vendor, and status administration can expand here module by module."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Settings migration in progress"
          description="The route structure from the legacy finance module is now present. Deep forms and workflows can be migrated feature by feature into these sections."
        />
      </SectionCard>
    </PageShell>
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
