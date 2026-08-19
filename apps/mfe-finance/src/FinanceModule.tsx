import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { FormEvent, lazy, useEffect, useMemo, useRef, useState } from "react";
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
import { financeApi, sanitizeFinancePayload } from "./lib/financeApi";
import { FinanceLiveProvider, useFinanceLiveData } from "./lib/financeLive";
const CustomersPage = lazy(() =>
  import("./pages/customers/CustomerPages").then((module) => ({ default: module.CustomersPage }))
);
const CustomerCreatePage = lazy(() =>
  import("./pages/customers/CustomerPages").then((module) => ({ default: module.CustomerCreatePage }))
);
const CustomerEditPage = lazy(() =>
  import("./pages/customers/CustomerPages").then((module) => ({ default: module.CustomerEditPage }))
);
const CustomerDetailPage = lazy(() =>
  import("./pages/customers/CustomerPages").then((module) => ({ default: module.CustomerDetailPage }))
);
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"));
const MasterInvoicePage = lazy(() => import("./pages/invoices/MasterInvoicePage"));
const MasterInvoiceViewPage = lazy(() => import("./pages/invoices/MasterInvoiceViewPage"));
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));
const VendorDetailPage = lazy(() => import("./pages/vendors/VendorDetailPage"));
const VendorCreatePage = lazy(() => import("./pages/vendors/VendorFormPage"));
const ReceivablesPage = lazy(() => import("./pages/receivables/ReceivablesPage"));
const ReceivablesCreatePage = lazy(() => import("./pages/receivables/ReceivableCreatePage"));
const ReceivablesEditPage = lazy(() => import("./pages/receivables/ReceivableEditPage"));
const ReceivableDetailPage = lazy(() => import("./pages/receivables/ReceivableDetailPage"));
const PayablesPage = lazy(() => import("./pages/payables/PayablesPage"));
const PayablesCreatePage = lazy(() => import("./pages/payables/PayableCreatePage"));
const PayablesEditPage = lazy(() => import("./pages/payables/PayableEditPage"));
const PayableDetailPage = lazy(() => import("./pages/payables/PayableDetailPage"));
const ExpensesPage = lazy(() => import("./pages/expenses/ExpensesPage"));
const ExpensesCreatePage = lazy(() => import("./pages/expenses/ExpenseCreatePage"));
const ExpensesEditPage = lazy(() => import("./pages/expenses/ExpenseEditPage"));
const ExpenseDetailPage = lazy(() => import("./pages/expenses/ExpenseDetailPage"));
const DiscountsPage = lazy(() => import("./pages/discounts/DiscountPages").then(m => ({ default: m.DiscountsPage })));
const DiscountCreatePage = lazy(() => import("./pages/discounts/DiscountPages").then(m => ({ default: m.DiscountCreatePage })));
const DiscountEditPage = lazy(() => import("./pages/discounts/DiscountPages").then(m => ({ default: m.DiscountEditPage })));
const CouponsPage = lazy(() => import("./pages/coupons/CouponPages").then(m=>({default:m.CouponsPage})));
const CouponCreatePage = lazy(() => import("./pages/coupons/CouponPages").then(m=>({default:m.CouponCreatePage})));
const CouponEditPage = lazy(() => import("./pages/coupons/CouponPages").then(m=>({default:m.CouponEditPage})));
const CategoryPage = lazy(() => import("./pages/configuration/CategoryStatusPages").then(m=>({default:m.CategoryPage})));
const CategoryCreatePage = lazy(() => import("./pages/configuration/CategoryStatusPages").then(m=>({default:m.CategoryCreatePage})));
const StatusCreatePage = lazy(() => import("./pages/configuration/CategoryStatusPages").then(m=>({default:m.StatusCreatePage})));
const StatusPage = lazy(() => import("./pages/configuration/CategoryStatusPages").then(m=>({default:m.StatusPage})));
const TotalListPage = lazy(() => import("./pages/cash/CashPages").then(m=>({default:m.TotalListPage})));
const CashInHandPage = lazy(() => import("./pages/cash/CashPages").then(m=>({default:m.CashInHandPage})));
const CashReserveViewPage = lazy(() => import("./pages/cash/CashPages").then(m=>({default:m.CashReserveViewPage})));
const CashRegisterPage = lazy(() => import("./pages/cash/CashPages").then(m=>({default:m.CashRegisterPage})));
const CashReserveCreatePage = lazy(() => import("./pages/cash/CashPages").then(m=>({default:m.CashReserveCreatePage})));
const ActivityLogPage = lazy(() => import("./pages/reporting/ReportingPages").then(m=>({default:m.ActivityLogPage})));
const ReportsPage = lazy(() => import("./pages/reporting/ReportingPages").then(m=>({default:m.ReportsPage})));
const TaxesPage = lazy(() => import("./pages/taxes/TaxPages").then(m => ({ default: m.TaxesPage })));
const TaxCreatePage = lazy(() => import("./pages/taxes/TaxPages").then(m => ({ default: m.TaxCreatePage })));
const TaxEditPage = lazy(() => import("./pages/taxes/TaxPages").then(m => ({ default: m.TaxEditPage })));
const ItemsPage = lazy(() => import("./pages/items/ItemPages").then(m => ({ default: m.ItemsPage })));
const ItemsCreatePage = lazy(() => import("./pages/items/ItemPages").then(m => ({ default: m.ItemsCreatePage })));
const ItemsEditPage = lazy(() => import("./pages/items/ItemPages").then(m => ({ default: m.ItemsEditPage })));
const HsnCodesPage = lazy(() => import("./pages/hsn/HsnPages").then(m => ({ default: m.HsnCodesPage })));
const SequenceTemplatesPage = lazy(() => import("./pages/sequences/SequenceTemplatePages").then(m => ({ default: m.SequenceTemplatesPage })));
const SequenceTemplateCreatePage = lazy(() => import("./pages/sequences/SequenceTemplatePages").then(m => ({ default: m.SequenceTemplateCreatePage })));
const SequenceTemplateEditPage = lazy(() => import("./pages/sequences/SequenceTemplatePages").then(m => ({ default: m.SequenceTemplateEditPage })));
const SequenceSettingsPage = lazy(() => import("./pages/sequences/SequenceSettingPages").then(m => ({ default: m.SequenceSettingsPage })));
const SequenceSettingCreatePage = lazy(() => import("./pages/sequences/SequenceSettingPages").then(m => ({ default: m.SequenceSettingCreatePage })));
const SequenceSettingEditPage = lazy(() => import("./pages/sequences/SequenceSettingPages").then(m => ({ default: m.SequenceSettingEditPage })));
const FinanceInvoiceForm = lazy(() => import("./FinanceInvoiceForm"));
const LedgerPage = lazy(() => import("./pages/ledger/LedgerPage"));
const DashboardRedirect = lazy(() => import("./pages/DashboardRedirect"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const OverviewPage = lazy(() => import("./pages/overview/OverviewPage"));
const EstimatesPage = lazy(() => import("./pages/overview/FinanceEmptyPages").then(m => ({ default: m.EstimatesPage })));
const PaymentsPage = lazy(() => import("./pages/overview/FinanceEmptyPages").then(m => ({ default: m.PaymentsPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

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
type TaxStatus = "Enabled" | "Disabled";

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

import { normalizeReceivableRows } from "./lib/receivableMappers";

import { normalizePayableRows } from "./lib/payableMappers";

function extractRecords(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function readTaxName(item: any) {
  return String(item?.name ?? item?.displayName ?? item?.taxName ?? item?.label ?? item?.taxLabel ?? "").trim();
}

function readTaxPercentage(item: any) {
  return Number(item?.percentage ?? item?.taxPercentage ?? item?.taxPercent ?? item?.gstPercentage ?? item?.gstPercent ?? item?.value ?? 0) || 0;
}

function buildTaxPayload(input: {
  uid?: string;
  tenantUid?: string;
  countryCode: string;
  taxCode: string;
  taxName: string;
  taxRegime: string;
  status: TaxStatus;
  taxPercentage: number;
  cgst: number;
  sgst: number;
  igst: number;
}) {
  const payload = sanitizeFinancePayload({
    uid: input.uid,
    tenantUid: input.tenantUid,
    countryCode: input.countryCode.trim(),
    taxCode: input.taxCode.trim(),
    taxName: input.taxName.trim(),
    taxRegime: input.taxRegime,
    status: input.status,
    taxPercentage: input.taxPercentage,
    cgst: input.cgst,
    sgst: input.sgst,
    igst: input.igst,
  });
  return payload;
}

import { DataTableCard, FeedCard, FinanceFeatureLayout, PageShell, QuickActions, SummaryList } from "./components/FinancePageLayout";

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
        <Route path="customers/edit/:id" element={withBoundary(<CustomerEditPage />)} />
        <Route path="customers/:id" element={withBoundary(<CustomerDetailPage />)} />
          <Route path="vendors" element={withBoundary(<VendorsPage />)} />
          <Route path="vendors/create" element={withBoundary(<VendorCreatePage />)} />
          <Route path="vendors/edit/:id" element={withBoundary(<VendorCreatePage />)} />
          <Route path="vendors/:id" element={withBoundary(<VendorDetailPage />)} />
          <Route path="ledger" element={withBoundary(<LedgerPage />)} />
        <Route path="receivables" element={withBoundary(<ReceivablesPage />)} />
        <Route path="receivables/create" element={withBoundary(<ReceivablesCreatePage />)} />
        <Route path="receivables/edit/:id" element={withBoundary(<ReceivablesEditPage />)} />
        <Route path="receivables/view/:id" element={withBoundary(<ReceivableDetailPage />)} />
        <Route path="payable" element={withBoundary(<PayablesPage />)} />
        <Route path="payable/create" element={withBoundary(<PayablesCreatePage />)} />
        <Route path="payable/edit/:id" element={withBoundary(<PayablesEditPage />)} />
        <Route path="payable/view/:id" element={withBoundary(<PayableDetailPage />)} />
        <Route path="expense" element={withBoundary(<ExpensesPage />)} />
        <Route path="expense/new" element={withBoundary(<ExpensesCreatePage />)} />
        <Route path="expense/edit/:id" element={withBoundary(<ExpensesEditPage />)} />
        <Route path="expense/view/:id" element={withBoundary(<ExpenseDetailPage />)} />
        <Route path="discount" element={withBoundary(<DiscountsPage />)} />
        <Route path="discount/create" element={withBoundary(<DiscountCreatePage />)} />
        <Route path="discount/edit/:id" element={withBoundary(<DiscountEditPage />)} />
        <Route path="coupons" element={withBoundary(<CouponsPage />)} />
        <Route path="coupons/create" element={withBoundary(<CouponCreatePage />)} />
        <Route path="coupons/edit/:id" element={withBoundary(<CouponEditPage />)} />
        <Route path="taxes" element={withBoundary(<TaxesPage />)} />
        <Route path="taxes/create" element={withBoundary(<TaxCreatePage />)} />
        <Route path="taxes/edit/:id" element={withBoundary(<TaxEditPage />)} />
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
        <Route path="hsn-codes" element={withBoundary(<HsnCodesPage />)} />
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
        <Route path="master-invoice/:uid" element={withBoundary(<MasterInvoiceViewPage />)} />
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
