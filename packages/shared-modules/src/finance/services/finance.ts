import type { ProductKey } from "@jaldee/auth-context";
import type {
  FinanceActivityLogRow,
  FinanceDataset,
  FinanceExpenseBreakdownRow,
  FinanceExpenseRow,
  FinanceInvoiceCategoryOption,
  FinanceInvoiceRow,
  FinanceInvoiceStatus,
  FinancePaymentRow,
  FinanceQuickAction,
  FinanceReportRow,
  FinanceRevenueRow,
  FinanceSummary,
  FinanceTransactionRow,
  FinanceVendorRow,
  FinanceVendorStatusOption,
} from "../types";

export function formatFinanceCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getFinanceStatusVariant(status: FinanceInvoiceStatus): "success" | "warning" | "danger" | "info" {
  if (status === "Paid") return "success";
  if (status === "Partially Paid") return "info";
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

export function financeFormatDateTime(value: unknown): string {
  if (!value || value === "-") return "-";
  try {
    const rawText = String(value).trim();
    const numeric = Number(rawText);
    const dateValue = typeof value === "number" || (Number.isFinite(numeric) && rawText.length >= 10)
      ? (Number.isFinite(numeric) ? (numeric > 10_000_000_000 ? numeric : numeric * 1000) : value)
      : value;
    const d = new Date(dateValue as string | number);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function financeMapInvoiceStatus(value: unknown): FinanceInvoiceStatus {
  const s = String(value ?? "").toLowerCase();
  if (s.includes("partiallypaid") || s.includes("partially")) return "Partially Paid";
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
    const pcd = i["providerConsumerData"] as Record<string, unknown> | undefined;
    const salesOrder = i["salesOrder"] as Record<string, unknown> | undefined;
    const order = i["order"] as Record<string, unknown> | undefined;
    const fullName = pcd?.["firstName"] ? `${pcd["firstName"]} ${pcd["lastName"] ?? ""}`.trim() : undefined;
    const orderSource =
      i["orderSource"] ??
      salesOrder?.["orderSource"] ??
      order?.["orderSource"];

    return {
      id: financeText(i["invoiceNum"] ?? i["uid"] ?? i["invoiceUid"] ?? i["invoiceId"] ?? i["uuid"] ?? i["id"] ?? `invoice-${index}`),
      uid: financeText(i["uid"] ?? i["invoiceUid"] ?? i["id"] ?? i["uuid"] ?? `invoice-${index}`),
      customer: financeText(fullName ?? i["customerName"] ?? i["consumerName"] ?? (i["customer"] as Record<string, unknown>)?.["name"] ?? i["invoiceFor"]),
      category: financeText(i["categoryName"] ?? i["invoiceCategoryName"] ?? (i["category"] as Record<string, unknown>)?.["name"] ?? i["notes"]),
      amount: financeAmt(i["netRate"] ?? i["netTotal"] ?? i["totalAmount"] ?? i["amount"] ?? i["total"]),
      amountDue: financeAmt(i["amountDue"] ?? 0),
      dueDate: financeFormatDate(i["dueDate"] ?? i["invoiceDate"] ?? i["createdDate"]),
      orderSource: orderSource ? String(orderSource) : "PROVIDER_CONSUMER",
      storeName: i["storeName"] ? String(i["storeName"]) : (i["store"] as Record<string, unknown>)?.["name"] ? String((i["store"] as Record<string, unknown>)["name"]) : undefined,
      status: financeMapInvoiceStatus(i["billPaymentStatus"] ?? i["billStatus"] ?? i["status"] ?? i["paymentStatus"]),
      assignedUserName: i["assignedUserName"] ? String(i["assignedUserName"]) : undefined,
      product: i["product"] ? String(i["product"]) : undefined,
      internalInvoiceType: i["internalInvoiceType"] ? String(i["internalInvoiceType"]) : undefined,
      billPaymentStatus: i["billPaymentStatus"] ? String(i["billPaymentStatus"]) : undefined,
      billStatus: i["billStatus"] ? String(i["billStatus"]) : undefined,
      providerConsumerId: i["providerConsumerId"] ? String(i["providerConsumerId"]) : pcd?.["id"] ? String(pcd["id"]) : undefined,
    };
  });
}

export function normalizeFinanceInvoiceCategories(payload: unknown): FinanceInvoiceCategoryOption[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["id"] ?? i["uid"] ?? i["encId"] ?? `invoice-category-${index}`),
      name: financeText(i["name"] ?? i["categoryName"] ?? i["displayName"], "Invoice"),
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

export function normalizeFinanceRevenue(payload: unknown): FinanceRevenueRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    const pcd = i["providerConsumerDto"] as Record<string, unknown> | undefined;
    const vendor = i["vendorData"] as Record<string, unknown> | undefined;
    const firstName = pcd?.["firstName"];
    const lastName = pcd?.["lastName"];
    const fullName = firstName ? `${firstName} ${lastName ?? ""}`.trim() : undefined;

    return {
      id: financeText(i["paymentsInUid"] ?? i["payInOutUid"] ?? i["uid"] ?? i["id"] ?? `revenue-${index}`),
      uid: financeText(i["paymentsInUid"] ?? i["payInOutUid"] ?? i["uid"] ?? i["id"] ?? `revenue-${index}`),
      receivedDate: financeFormatDate(i["receivedDate"] ?? i["paymentDate"] ?? i["createdDate"] ?? i["date"]),
      amount: financeAmt(i["amount"] ?? i["paymentAmount"] ?? i["receivedAmount"] ?? i["netTotal"]),
      categoryName: financeText(i["categoryName"] ?? i["paymentsInCategoryName"] ?? i["source"], "-"),
      invoiceCategoryName: financeText(i["invoiceCategoryName"] ?? i["invoiceCategory"] ?? "-", "-"),
      invoiceId: i["invoiceId"] ? String(i["invoiceId"]) : i["invoiceNo"] ? String(i["invoiceNo"]) : undefined,
      referenceNo: i["referenceNo"] ? String(i["referenceNo"]) : undefined,
      customerName: financeText(fullName ?? i["customerName"] ?? i["consumerName"], ""),
      vendorName: financeText(vendor?.["vendorName"] ?? vendor?.["name"] ?? i["vendorName"], ""),
      locationName: i["locationName"] ? String(i["locationName"]) : undefined,
      status: i["paymentsInStatusName"] ? String(i["paymentsInStatusName"]) : i["status"] ? String(i["status"]) : undefined,
      isEdit: Boolean(i["isEdit"]),
    };
  });
}

export function normalizeFinanceActivityLogs(payload: unknown): FinanceActivityLogRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["uid"] ?? i["id"] ?? i["logId"] ?? `${i["dateTime"] ?? "log"}-${index}`),
      dateTime: financeFormatDateTime(i["dateTime"] ?? i["createdDate"] ?? i["createdOn"] ?? i["time"]),
      action: financeText(i["subject"] ?? i["action"] ?? i["event"] ?? i["activity"]),
      description: financeText(i["description"] ?? i["message"] ?? i["details"]),
      userName: financeText(i["userName"] ?? i["user"] ?? i["createdBy"] ?? i["updatedBy"]),
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
      amountPaid: financeAmt(i["amountPaid"] ?? i["paidAmount"] ?? i["amountPaidTotal"] ?? 0),
      amountDue: financeAmt(i["amountDue"] ?? i["dueAmount"] ?? i["balanceAmount"] ?? 0),
      bookedOn: financeFormatDate(i["paidDate"] ?? i["bookedOn"] ?? i["expenseDate"] ?? i["createdDate"]),
      expenseUid: i["expenseUid"] ? String(i["expenseUid"]) : i["uid"] ? String(i["uid"]) : undefined,
      locationName: i["locationName"] ? String(i["locationName"]) : (i["location"] as Record<string, unknown>)?.["name"] ? String((i["location"] as Record<string, unknown>)["name"]) : undefined,
      status: i["expenseStatusName"] ? String(i["expenseStatusName"]) : i["status"] ? String(i["status"]) : undefined,
      payoutCreated: Boolean(i["payoutCreated"]),
      isEdit: Boolean(i["isEdit"]),
    };
  });
}

export function normalizeFinanceExpenseBreakdown(payload: unknown): FinanceExpenseBreakdownRow[] {
  const root = (payload ?? {}) as Record<string, unknown>;
  const metricValues = Array.isArray(root["metricValues"]) ? root["metricValues"] as Record<string, unknown>[] : [];
  const expenseMetric = metricValues.find((item) =>
    Number(item["metricId"]) === 168 ||
    String(item["metricName"] ?? "").toUpperCase() === "FINANCE_EXPENSE_TOTAL"
  );
  const compareData = Array.isArray(expenseMetric?.["compareData"]) ? expenseMetric["compareData"] as Record<string, unknown>[] : [];

  return compareData
    .map((item, index) => ({
      id: financeText(item["categoryName"] ?? `expense-breakdown-${index}`),
      category: financeText(item["categoryName"], "General"),
      currentAmount: financeAmt(item["currentAmount"]),
      amountDifference: financeAmt(item["amountDifference"]),
      percentage: financeAmt(item["percentage"]),
      increased: Boolean(item["increased"]),
    }))
    .filter((item) => item.currentAmount !== 0 || item.amountDifference !== 0);
}

export function normalizeFinanceVendors(payload: unknown): FinanceVendorRow[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["id"] ?? i["vendorId"] ?? i["uid"] ?? i["encId"] ?? `vendor-${index}`),
      encId: financeText(i["encId"] ?? i["uid"] ?? i["vendorUid"] ?? i["id"] ?? `vendor-${index}`),
      name: financeText(i["name"] ?? i["vendorName"] ?? `${i["firstName"] ?? ""} ${i["lastName"] ?? ""}`.trim()),
      category: financeText(i["vendorCategoryName"] ?? i["categoryName"] ?? i["category"] ?? i["vendorCategory"], "General"),
      payable: financeAmt(i["payable"] ?? i["amountDue"] ?? i["balanceAmount"] ?? i["pendingAmount"]),
      status: financeText(i["status"] ?? i["vendorStatus"] ?? i["vendorStatusName"], "Enable"),
      vendorStatusName: i["vendorStatusName"] ? String(i["vendorStatusName"]) : undefined,
      vendorStatusId: i["vendorStatusId"] ? String(i["vendorStatusId"]) : undefined,
      createdDate: financeFormatDate(i["createdDate"] ?? i["createdOn"] ?? i["date"]),
    };
  });
}

export function normalizeFinanceVendorStatuses(payload: unknown): FinanceVendorStatusOption[] {
  return financeExtractList(payload).map((item, index) => {
    const i = item as Record<string, unknown>;
    return {
      id: financeText(i["id"] ?? i["uid"] ?? i["encId"] ?? `vendor-status-${index}`),
      name: financeText(i["name"] ?? i["statusName"] ?? i["vendorStatusName"]),
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
    { label: "Create Invoice", route: `${productBasePath}/invoice/newInvoice`, icon: "packagePlus", note: "Issue new billing", tone: "" },
    { label: "Create Expense", route: `${productBasePath}/expense/new`, icon: "alert", note: "Book operations cost", tone: "" },
    { label: "Add Revenue", route: `${productBasePath}/receivables/create`, icon: "trend", note: "Record collections", tone: "" },
    { label: "Create Payout", route: `${productBasePath}/payout/create`, icon: "history", note: "Queue payout", tone: "" },
    { label: "Create Vendor", route: `${productBasePath}/vendors/create`, icon: "globe", note: "Add vendor profile", tone: "" },
    { label: "Invoices", route: `${productBasePath}/invoices`, icon: "list", note: "See all invoices", tone: "" },
    { label: "Expenses", route: `${productBasePath}/expense`, icon: "alert", note: "Monitor spends", tone: "" },
    { label: "Revenue", route: `${productBasePath}/receivables`, icon: "trend", note: "Review inflows", tone: "" },
    { label: "Vendors", route: `${productBasePath}/vendors`, icon: "globe", note: "Vendor directory", tone: "" },
    { label: "Reports", route: `${productBasePath}/reports`, icon: "chart", note: "Track trends", tone: "" },
    { label: "Activity Log", route: `${productBasePath}/activity-log`, icon: "history", note: "Audit trail", tone: "" },
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
