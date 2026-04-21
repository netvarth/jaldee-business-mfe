import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";

type FinanceSummary = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

type FinanceInvoiceRow = {
  id: string;
  customer: string;
  category: string;
  status: "Paid" | "Pending" | "Overdue";
  amount: number;
  dueDate: string;
};

type FinancePaymentRow = {
  id: string;
  source: string;
  method: string;
  amount: number;
  receivedOn: string;
};

type FinanceReportRow = {
  id: string;
  metric: string;
  value: string;
  note: string;
};

type FinanceDataset = {
  title: string;
  subtitle: string;
  summaries: FinanceSummary[];
  invoices: FinanceInvoiceRow[];
  payments: FinancePaymentRow[];
  reports: FinanceReportRow[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusVariant(status: FinanceInvoiceRow["status"]): "success" | "warning" | "danger" {
  if (status === "Paid") return "success";
  if (status === "Pending") return "warning";
  return "danger";
}

function getFinanceDataset(product: string, locationName?: string | null): FinanceDataset {
  const place = locationName || "the current location";

  const baseByProduct: Record<string, Omit<FinanceDataset, "subtitle">> = {
    health: {
      title: "Health Finance",
      summaries: [
        { label: "Gross Revenue", value: formatCurrency(482000), accent: "emerald" },
        { label: "Pending Receivables", value: formatCurrency(128000), accent: "amber" },
        { label: "Settled Invoices", value: "146", accent: "indigo" },
        { label: "Refunds", value: formatCurrency(16000), accent: "rose" },
      ],
      invoices: [
        { id: "INV-24061", customer: "Ananya Nair", category: "Diagnostics", status: "Paid", amount: 6800, dueDate: "21 Apr 2026" },
        { id: "INV-24058", customer: "Harish Menon", category: "Orthopedics", status: "Pending", amount: 14250, dueDate: "24 Apr 2026" },
        { id: "INV-24045", customer: "Priya Das", category: "Surgery Advance", status: "Overdue", amount: 45000, dueDate: "17 Apr 2026" },
      ],
      payments: [
        { id: "PAY-8932", source: "Consultation Collections", method: "UPI", amount: 18500, receivedOn: "21 Apr 2026" },
        { id: "PAY-8927", source: "Lab Package", method: "Card", amount: 7400, receivedOn: "20 Apr 2026" },
        { id: "PAY-8919", source: "Procedure Advance", method: "Bank Transfer", amount: 25000, receivedOn: "19 Apr 2026" },
      ],
      reports: [
        { id: "r-1", metric: "Average invoice value", value: formatCurrency(11100), note: "Based on the latest 30 invoices." },
        { id: "r-2", metric: "Collection efficiency", value: "73%", note: "Collected within seven days of invoice issue." },
        { id: "r-3", metric: "Outstanding balance", value: formatCurrency(128000), note: "Open receivables across active health services." },
      ],
    },
    bookings: {
      title: "Bookings Finance",
      summaries: [
        { label: "Gross Revenue", value: formatCurrency(238000), accent: "emerald" },
        { label: "Pending Receivables", value: formatCurrency(54000), accent: "amber" },
        { label: "Settled Invoices", value: "92", accent: "indigo" },
        { label: "Refunds", value: formatCurrency(9000), accent: "rose" },
      ],
      invoices: [
        { id: "INV-11061", customer: "Boardroom Slot", category: "Bookings", status: "Paid", amount: 12000, dueDate: "21 Apr 2026" },
        { id: "INV-11058", customer: "Studio Session", category: "Bookings", status: "Pending", amount: 8500, dueDate: "23 Apr 2026" },
        { id: "INV-11045", customer: "Weekend Event", category: "Bookings", status: "Overdue", amount: 31000, dueDate: "18 Apr 2026" },
      ],
      payments: [
        { id: "PAY-4832", source: "Slot Confirmation", method: "Card", amount: 12500, receivedOn: "21 Apr 2026" },
        { id: "PAY-4827", source: "Package Booking", method: "UPI", amount: 9700, receivedOn: "20 Apr 2026" },
        { id: "PAY-4819", source: "Venue Deposit", method: "Bank Transfer", amount: 28000, receivedOn: "19 Apr 2026" },
      ],
      reports: [
        { id: "r-1", metric: "Average booking value", value: formatCurrency(8100), note: "Average across active booking invoices." },
        { id: "r-2", metric: "Deposit conversion", value: "68%", note: "Deposits converted into completed bookings." },
        { id: "r-3", metric: "Outstanding balance", value: formatCurrency(54000), note: "Open receivables across current reservations." },
      ],
    },
    golderp: {
      title: "Gold ERP Finance",
      summaries: [
        { label: "Gross Revenue", value: formatCurrency(920000), accent: "emerald" },
        { label: "Pending Receivables", value: formatCurrency(222000), accent: "amber" },
        { label: "Settled Invoices", value: "214", accent: "indigo" },
        { label: "Refunds", value: formatCurrency(28000), accent: "rose" },
      ],
      invoices: [
        { id: "INV-88061", customer: "Raman Jewels", category: "Gold Order", status: "Paid", amount: 126000, dueDate: "21 Apr 2026" },
        { id: "INV-88058", customer: "Sree Lakshmi", category: "Diamond Ring", status: "Pending", amount: 84200, dueDate: "25 Apr 2026" },
        { id: "INV-88045", customer: "Asha Gold House", category: "Bulk Purchase", status: "Overdue", amount: 154000, dueDate: "17 Apr 2026" },
      ],
      payments: [
        { id: "PAY-9832", source: "Retail Invoice", method: "Card", amount: 74500, receivedOn: "21 Apr 2026" },
        { id: "PAY-9827", source: "Advance Booking", method: "UPI", amount: 30000, receivedOn: "20 Apr 2026" },
        { id: "PAY-9819", source: "Bulk Settlement", method: "Bank Transfer", amount: 120000, receivedOn: "19 Apr 2026" },
      ],
      reports: [
        { id: "r-1", metric: "Average invoice value", value: formatCurrency(48600), note: "Average across invoiced sales orders." },
        { id: "r-2", metric: "Payment turnaround", value: "4.2 days", note: "Average time from invoice to settlement." },
        { id: "r-3", metric: "Outstanding balance", value: formatCurrency(222000), note: "Open balances from orders and vendor credits." },
      ],
    },
  };

  const fallback = {
    title: "Finance",
    summaries: [
      { label: "Gross Revenue", value: formatCurrency(315000), accent: "emerald" as const },
      { label: "Pending Receivables", value: formatCurrency(76000), accent: "amber" as const },
      { label: "Settled Invoices", value: "104", accent: "indigo" as const },
      { label: "Refunds", value: formatCurrency(12000), accent: "rose" as const },
    ],
    invoices: [
      { id: "INV-50061", customer: "Primary Account", category: "General", status: "Paid" as const, amount: 16800, dueDate: "21 Apr 2026" },
      { id: "INV-50058", customer: "Growth Account", category: "General", status: "Pending" as const, amount: 9450, dueDate: "23 Apr 2026" },
      { id: "INV-50045", customer: "Legacy Account", category: "General", status: "Overdue" as const, amount: 21400, dueDate: "17 Apr 2026" },
    ],
    payments: [
      { id: "PAY-5832", source: "Recurring Billing", method: "Card", amount: 11200, receivedOn: "21 Apr 2026" },
      { id: "PAY-5827", source: "Manual Collection", method: "UPI", amount: 6800, receivedOn: "20 Apr 2026" },
      { id: "PAY-5819", source: "Account Settlement", method: "Bank Transfer", amount: 24500, receivedOn: "19 Apr 2026" },
    ],
    reports: [
      { id: "r-1", metric: "Average invoice value", value: formatCurrency(12600), note: "Average across current invoices." },
      { id: "r-2", metric: "Collection efficiency", value: "71%", note: "Collected within seven days of invoice issue." },
      { id: "r-3", metric: "Outstanding balance", value: formatCurrency(76000), note: "Open receivables for the active product." },
    ],
  };

  const selected = baseByProduct[product] ?? fallback;

  return {
    ...selected,
    subtitle: `A lightweight finance view for ${place}, scoped to the active ${product} product context.`,
  };
}

function SharedFinanceLayout({
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
  const { basePath } = useSharedModulesContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ label: "Back", href: basePath }}
        onNavigate={(href) => window.location.assign(href)}
        actions={actions}
      />
      {children}
    </div>
  );
}

function FinanceOverviewView({ dataset }: { dataset: FinanceDataset }) {
  const invoiceColumns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(
    () => [
      { key: "id", header: "Invoice" },
      { key: "customer", header: "Customer" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>,
      },
    ],
    []
  );

  const paymentColumns = useMemo<ColumnDef<FinancePaymentRow>[]>(
    () => [
      { key: "source", header: "Source" },
      { key: "method", header: "Method" },
      { key: "receivedOn", header: "Received On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={dataset.title}
      subtitle={dataset.subtitle}
      actions={<Button onClick={() => window.location.assign("/finance")}>Open Full Finance</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dataset.summaries.map((summary) => (
          <StatCard key={summary.label} label={summary.label} value={summary.value} accent={summary.accent} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent Invoices" className="border-slate-200 shadow-sm">
          <DataTable
            data={dataset.invoices}
            columns={invoiceColumns}
            getRowId={(row) => row.id}
            emptyState={<EmptyState title="No invoices" description="Invoices relevant to this product will appear here." />}
          />
        </SectionCard>

        <SectionCard title="Recent Payments" className="border-slate-200 shadow-sm">
          <DataTable
            data={dataset.payments}
            columns={paymentColumns}
            getRowId={(row) => row.id}
            emptyState={<EmptyState title="No payments" description="Payments relevant to this product will appear here." />}
          />
        </SectionCard>
      </div>
    </SharedFinanceLayout>
  );
}

function FinanceInvoicesView({ dataset }: { dataset: FinanceDataset }) {
  const columns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(
    () => [
      { key: "id", header: "Invoice" },
      { key: "customer", header: "Customer" },
      { key: "category", header: "Category" },
      { key: "dueDate", header: "Due Date" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>,
      },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset.title} Invoices`}
      subtitle="Recent invoices relevant to the current product context."
      actions={<Button variant="outline" onClick={() => window.location.assign("/finance/invoices")}>Open Standalone Invoices</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset.invoices}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No invoices found" description="Invoice records will show here when available." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}

function FinancePaymentsView({ dataset }: { dataset: FinanceDataset }) {
  const columns = useMemo<ColumnDef<FinancePaymentRow>[]>(
    () => [
      { key: "id", header: "Payment" },
      { key: "source", header: "Source" },
      { key: "method", header: "Method" },
      { key: "receivedOn", header: "Received On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset.title} Payments`}
      subtitle="Recent collections and settlements for the active product."
      actions={<Button variant="outline" onClick={() => window.location.assign("/finance/payments")}>Open Standalone Payments</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset.payments}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No payments found" description="Payment records will show here when available." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}

function FinanceReportsView({ dataset }: { dataset: FinanceDataset }) {
  const columns = useMemo<ColumnDef<FinanceReportRow>[]>(
    () => [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
      { key: "note", header: "Notes" },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset.title} Reports`}
      subtitle="Operational finance indicators for the active product."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset.reports}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No report data" description="Report metrics will appear here." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}

function FinanceSettingsView() {
  return (
    <SharedFinanceLayout
      title="Shared Finance Settings"
      subtitle="Configuration is intentionally limited in the shared finance module."
      actions={<Button onClick={() => window.location.assign("/finance/settings")}>Open Full Finance Settings</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Use the standalone Finance app"
          description="The shared module is only for quick operational visibility inside the active product. Use the full Finance product for templates, workflows, and administrative setup."
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}

export function FinanceModule() {
  const access = useModuleAccess("finance");
  const { product, location, routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";
  const dataset = useMemo(() => getFinanceDataset(product, location?.name), [location?.name, product]);

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Finance unavailable"
          description={access.reason === "module-disabled"
            ? "This account does not currently have access to the Finance module."
            : access.reason === "location-required"
              ? "Select a location to work with location-scoped finance data."
              : "The finance module cannot be opened in the current scope."}
        />
      </SectionCard>
    );
  }

  if (view === "invoices") {
    return <FinanceInvoicesView dataset={dataset} />;
  }

  if (view === "payments") {
    return <FinancePaymentsView dataset={dataset} />;
  }

  if (view === "reports") {
    return <FinanceReportsView dataset={dataset} />;
  }

  if (view === "settings") {
    return <FinanceSettingsView />;
  }

  return <FinanceOverviewView dataset={dataset} />;
}
