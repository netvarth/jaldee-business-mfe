import type { ProductKey } from "@jaldee/auth-context";
import type {
  FinanceDataset,
  FinanceExpenseRow,
  FinanceInvoiceRow,
  FinanceInvoiceStatus,
  FinancePaymentRow,
  FinanceQuickAction,
  FinanceReportRow,
  FinanceSummary,
  FinanceTransactionRow,
  FinanceVendorRow,
} from "../types";

export function formatFinanceCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getFinanceStatusVariant(status: FinanceInvoiceStatus): "success" | "warning" | "danger" {
  if (status === "Paid") return "success";
  if (status === "Pending") return "warning";
  return "danger";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function financeText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function financeAmt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function financeFormatDate(value: unknown): string {
  if (!value || value === "-") return "-";
  try {
    const d = new Date(value as string | number);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(value);
  }
}

export function financeMapInvoiceStatus(value: unknown): FinanceInvoiceStatus {
  const s = String(value ?? "").toLowerCase();
  if (s.includes("paid") || s.includes("settled")) return "Paid";
  if (s.includes("overdue")) return "Overdue";
  return "Pending";
}

export function financeExtractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const candidates = [
    p["content"], p["records"], p["data"], p["items"], p["results"],
    p["list"], p["invoices"], p["payments"], p["vendors"],
    p["categories"], p["statuses"], p["logs"],
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

export function normalizeFinanceInvoices(payload: unknown): FinanceInvoiceRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["invoiceUid"] ?? i["uid"] ?? i["id"] ?? i["invoiceId"] ?? `invoice-${index}`),
      customer: financeText(i["customerName"] ?? i["consumerName"] ?? (i["customer"] as Record<string, unknown>)?.["name"] ?? i["invoiceFor"]),
      category: financeText(i["categoryName"] ?? i["invoiceCategoryName"] ?? (i["category"] as Record<string, unknown>)?.["name"] ?? i["notes"]),
      amount: financeAmt(i["netTotal"] ?? i["totalAmount"] ?? i["amount"] ?? i["total"]),
      dueDate: financeFormatDate(i["dueDate"] ?? i["invoiceDate"] ?? i["createdDate"]),
      status: financeMapInvoiceStatus(i["billStatus"] ?? i["status"] ?? i["paymentStatus"]),
    };
  });
}

export function normalizeFinancePayments(payload: unknown): FinancePaymentRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    const pcd = i["providerConsumerDto"] as Record<string, unknown> | undefined;
    const firstName = pcd?.["firstName"];
    const lastName = pcd?.["lastName"];
    const fullName = firstName ? `${firstName} ${lastName ?? ""}`.trim() : undefined;

    return {
      id: financeText(i["paymentsInUid"] ?? i["payInOutUid"] ?? i["uid"] ?? i["id"] ?? i["paymentID"] ?? i["paymentRefId"] ?? i["receiptNo"] ?? `payment-${index}`),
      source: financeText(i["categoryName"] ?? i["source"] ?? i["notes"] ?? i["description"] ?? "Payment"),
      payer: financeText(fullName ?? i["customerName"] ?? i["consumerName"] ?? i["payerName"] ?? i["accountName"]),
      method: financeText(i["paymentMode"] ?? i["method"] ?? i["paymentMethod"], "Unknown"),
      amount: financeAmt(i["amount"] ?? i["paymentAmount"] ?? i["receivedAmount"] ?? i["netTotal"]),
      receivedOn: financeFormatDate(i["receivedDate"] ?? i["paymentDate"] ?? i["receivedOn"] ?? i["createdDate"] ?? i["date"]),
    };
  });
}

export function normalizeFinanceExpenses(payload: unknown): FinanceExpenseRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    const pcd = i["providerConsumerDto"] as Record<string, unknown> | undefined;
    const firstName = pcd?.["firstName"];
    const lastName = pcd?.["lastName"];
    const fullName = firstName ? `${firstName} ${lastName ?? ""}`.trim() : undefined;

    return {
      id: financeText(i["paymentsOutUid"] ?? i["payInOutUid"] ?? i["uid"] ?? i["id"] ?? i["paymentID"] ?? i["expenseUid"] ?? `expense-${index}`),
      title: financeText(i["categoryName"] ?? i["title"] ?? i["name"] ?? i["description"] ?? i["notes"]),
      category: financeText(i["categoryName"] ?? i["expenseCategoryName"] ?? i["category"], "General"),
      owner: financeText(fullName ?? i["owner"] ?? i["createdByName"] ?? i["assignedTo"], "Finance"),
      amount: financeAmt(i["amount"] ?? i["totalAmount"] ?? i["expenseAmount"]),
      bookedOn: financeFormatDate(i["paidDate"] ?? i["bookedOn"] ?? i["expenseDate"] ?? i["createdDate"]),
    };
  });
}

export function normalizeFinanceVendors(payload: unknown): FinanceVendorRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["uid"] ?? i["id"] ?? i["vendorId"] ?? `vendor-${index}`),
      name: financeText(i["name"] ?? i["vendorName"] ?? `${i["firstName"] ?? ""} ${i["lastName"] ?? ""}`.trim()),
      category: financeText(i["categoryName"] ?? i["category"] ?? i["vendorCategory"], "General"),
      payable: financeAmt(i["payable"] ?? i["amountDue"] ?? i["balanceAmount"] ?? i["pendingAmount"]),
      status: String(i["status"] ?? i["vendorStatus"] ?? "").toLowerCase().includes("hold") ? "On Hold" : "Active",
    };
  });
}

// ─── Dataset builders ─────────────────────────────────────────────────────────

function buildTransactions(payments: FinancePaymentRow[], expenses: FinanceExpenseRow[]): FinanceTransactionRow[] {
  const revenueRows: FinanceTransactionRow[] = payments.map((p) => {
    const maskedId = p.id.length > 5 ? `${p.id.slice(0, 5)}***` : p.id;
    const displayCategory = p.source && p.source !== "-" && p.source !== "Payment" ? p.source : "Order";
    return {
      id: p.id,
      title: `${displayCategory}/${maskedId}`,
      subtitle: p.payer && p.payer !== "-" ? p.payer : "Unknown",
      kind: "Revenue",
      date: p.receivedOn,
      amount: p.amount,
    };
  });

  const payoutRows: FinanceTransactionRow[] = expenses.map((e) => {
    const maskedId = e.id.length > 5 ? `${e.id.slice(0, 5)}***` : e.id;
    const displayCategory = e.title && e.title !== "-" && e.title !== "Expense" ? e.title : "Order";
    return {
      id: e.id,
      title: `${displayCategory}/${maskedId}`,
      subtitle: e.owner && e.owner !== "-" ? e.owner : "Unknown",
      kind: "Payout",
      date: e.bookedOn,
      amount: e.amount,
    };
  });

  return [...revenueRows, ...payoutRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildSummaries(invoices: FinanceInvoiceRow[], expenses: FinanceExpenseRow[], payments: FinancePaymentRow[]): FinanceSummary[] {
  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const settled = invoices.filter((inv) => inv.status === "Paid").length;

  return [
    { label: "Revenue", value: formatFinanceCurrency(revenue), accent: "emerald" },
    { label: "Expenses", value: formatFinanceCurrency(expenseTotal), accent: "rose" },
    { label: "Payout", value: formatFinanceCurrency(0), accent: "amber" },
    { label: "Settled Invoices", value: String(settled), accent: "indigo" },
  ];
}

function buildReports(invoices: FinanceInvoiceRow[], payments: FinancePaymentRow[]): FinanceReportRow[] {
  const avgInvoice = invoices.length
    ? invoices.reduce((sum, inv) => sum + inv.amount, 0) / invoices.length
    : 0;
  const collectionEfficiency = invoices.length
    ? Math.round((invoices.filter((inv) => inv.status === "Paid").length / invoices.length) * 100)
    : 0;
  const outstanding = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return [
    { id: "r-1", metric: "Average invoice value", value: formatFinanceCurrency(avgInvoice), note: "Average across loaded invoices." },
    { id: "r-2", metric: "Collection efficiency", value: `${collectionEfficiency}%`, note: "Share of invoices marked paid." },
    { id: "r-3", metric: "Outstanding balance", value: formatFinanceCurrency(outstanding), note: "Open receivables from unpaid invoices." },
  ];
}

export function buildFinanceActions(productBasePath: string): FinanceQuickAction[] {
  return [
    { label: "Create Invoice", route: `${productBasePath}/invoices`, icon: "packagePlus", note: "Issue new billing", tone: "" },
    { label: "Create Expense", route: `${productBasePath}/payments`, icon: "alert", note: "Book operations cost", tone: "" },
    { label: "Add Revenue", route: `${productBasePath}/payments`, icon: "trend", note: "Record collections", tone: "" },
    { label: "Create Payout", route: `${productBasePath}/payments`, icon: "history", note: "Queue payout", tone: "" },
    { label: "Create Vendor", route: `${productBasePath}/settings`, icon: "globe", note: "Add vendor profile", tone: "" },
    { label: "Invoices", route: `${productBasePath}/invoices`, icon: "list", note: "See all invoices", tone: "" },
    { label: "Expenses", route: `${productBasePath}/payments`, icon: "alert", note: "Monitor spends", tone: "" },
    { label: "Revenue", route: `${productBasePath}/payments`, icon: "trend", note: "Review inflows", tone: "" },
    { label: "Vendors", route: `${productBasePath}/settings`, icon: "globe", note: "Vendor directory", tone: "" },
    { label: "Reports", route: `${productBasePath}/reports`, icon: "chart", note: "Track trends", tone: "" },
    { label: "Activity Log", route: `${productBasePath}/settings`, icon: "history", note: "Audit trail", tone: "" },
  ];
}

export function getFinanceProductBasePath(product: ProductKey): string {
  if (product === "health") return "/health/finance";
  if (product === "bookings") return "/bookings/finance";
  if (product === "golderp") return "/golderp/finance";
  if (product === "karty") return "/karty/finance";
  return "/finance";
}

export function getFinanceDatasetTitle(product: ProductKey): string {
  if (product === "health") return "Finance Manager Dashboard";
  if (product === "bookings") return "Bookings Finance Dashboard";
  if (product === "golderp") return "Gold ERP Finance Dashboard";
  if (product === "karty") return "Karty Finance Dashboard";
  return "Finance Dashboard";
}

export function assembleFinanceDataset(
  product: ProductKey,
  locationName: string | null | undefined,
  invoices: FinanceInvoiceRow[],
  payments: FinancePaymentRow[],
  expenses: FinanceExpenseRow[],
  vendors: FinanceVendorRow[],
  cashInHand: number,
  cashUpdatedOn: string,
  totalCount: number,
  accountBalance: number = 0,
  statistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[] = [],
  monthlyStatistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[] = [],
): FinanceDataset {
  const place = locationName ?? "the current location";
  const basePath = getFinanceProductBasePath(product);

  return {
    title: getFinanceDatasetTitle(product),
    subtitle: `Keep a tab on your finance and manage your finance operations smoothly for ${place}.`,
    summaries: buildSummaries(invoices, expenses, payments),
    accountBalance,
    cashInHand,
    cashUpdatedOn,
    actions: buildFinanceActions(basePath),
    expenses,
    vendors,
    transactions: buildTransactions(payments, expenses),
    invoices,
    payments,
    reports: buildReports(invoices, payments),
    statistics,
    monthlyStatistics,
    totalCount,
  };
}
