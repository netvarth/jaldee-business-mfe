import type { ProductKey } from "@jaldee/auth-context";
import type {
  FinanceDataset,
  FinanceExpenseRow,
  FinanceInvoiceStatus,
  FinancePaymentRow,
  FinanceQuickAction,
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

function buildTransactions(payments: FinancePaymentRow[], expenses: FinanceExpenseRow[]): FinanceTransactionRow[] {
  const revenueRows: FinanceTransactionRow[] = payments.map((payment) => ({
    id: payment.id,
    title: payment.source,
    subtitle: payment.payer ?? payment.method,
    kind: "Revenue",
    date: payment.receivedOn,
    amount: payment.amount,
  }));

  const payoutRows: FinanceTransactionRow[] = expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    subtitle: expense.owner,
    kind: "Payout",
    date: expense.bookedOn,
    amount: expense.amount,
  }));

  return [...revenueRows, ...payoutRows];
}

function buildActions(productBasePath: string): FinanceQuickAction[] {
  return [
    { label: "Create Invoice", route: `${productBasePath}/invoices`, icon: "packagePlus", note: "Issue new billing", tone: "bg-indigo-50 text-indigo-600" },
    { label: "Create Expense", route: `${productBasePath}/payments`, icon: "alert", note: "Book operations cost", tone: "bg-rose-50 text-rose-600" },
    { label: "Add Revenue", route: `${productBasePath}/payments`, icon: "trend", note: "Record collections", tone: "bg-emerald-50 text-emerald-600" },
    { label: "Create Payout", route: `${productBasePath}/payments`, icon: "history", note: "Queue payout", tone: "bg-amber-50 text-amber-600" },
    { label: "Create Vendor", route: `${productBasePath}/settings`, icon: "globe", note: "Add vendor profile", tone: "bg-sky-50 text-sky-600" },
    { label: "Invoices", route: `${productBasePath}/invoices`, icon: "list", note: "See all invoices", tone: "bg-indigo-50 text-indigo-600" },
    { label: "Expenses", route: `${productBasePath}/payments`, icon: "alert", note: "Monitor spends", tone: "bg-rose-50 text-rose-600" },
    { label: "Revenue", route: `${productBasePath}/payments`, icon: "trend", note: "Review inflows", tone: "bg-emerald-50 text-emerald-600" },
    { label: "Vendors", route: `${productBasePath}/settings`, icon: "globe", note: "Vendor directory", tone: "bg-slate-100 text-slate-700" },
    { label: "Cash Register", route: `${productBasePath}/settings`, icon: "database", note: "Register balances", tone: "bg-lime-50 text-lime-700" },
    { label: "Reports", route: `${productBasePath}/reports`, icon: "chart", note: "Track trends", tone: "bg-violet-50 text-violet-600" },
    { label: "Activity Log", route: `${productBasePath}/settings`, icon: "history", note: "Audit trail", tone: "bg-slate-100 text-slate-700" },
  ];
}

function createHealthDataset(place: string): FinanceDataset {
  const payments: FinancePaymentRow[] = [
    { id: "PAY-8932", source: "Booking Invoice/c3758***", payer: "Aswin S", method: "UPI", amount: 10, receivedOn: "30 Mar 2026" },
    { id: "PAY-8927", source: "Booking Invoice/a9eff***", payer: "Sravan M V", method: "Card", amount: 10, receivedOn: "30 Mar 2026" },
    { id: "PAY-8919", source: "Invoice/16965***", payer: "aswin", method: "Cash", amount: 30, receivedOn: "12 Mar 2026" },
    { id: "PAY-8915", source: "Order/70f02***", payer: "Vinitha w", method: "Bank Transfer", amount: 196, receivedOn: "17 Mar 2026" },
  ];

  const expenses: FinanceExpenseRow[] = [
    { id: "EXP-600", title: "Expense/c37a2***", category: "Operations", owner: "Finance Desk", amount: 50, bookedOn: "30 Mar 2026", difference: 12, increased: true },
    { id: "EXP-596", title: "Expense/2b220***", category: "Supplies", owner: "Branch Ops", amount: 444, bookedOn: "30 Mar 2026", difference: 18, increased: true },
    { id: "EXP-590", title: "Medical Consumables", category: "Clinical", owner: "HQ Finance", amount: 1240, bookedOn: "28 Mar 2026", difference: 6, increased: false },
    { id: "EXP-587", title: "Travel Reimbursement", category: "Travel", owner: "Collections Desk", amount: 680, bookedOn: "26 Mar 2026", difference: 4, increased: false },
  ];

  const vendors: FinanceVendorRow[] = [
    { id: "VEN-032", name: "Aadhithya", category: "Supplies", status: "Active", payable: 8000 },
    { id: "VEN-028", name: "Nandhilath", category: "Electronics", status: "Active", payable: 26400 },
    { id: "VEN-017", name: "Aparna", category: "Logistics", status: "Active", payable: 9500 },
    { id: "VEN-012", name: "Joseph", category: "Maintenance", status: "Active", payable: 6100 },
    { id: "VEN-009", name: "Basics", category: "Retail", status: "On Hold", payable: 18200 },
  ];

  const invoices = [
    { id: "350", customer: "kunju f", category: "General", status: "Pending" as const, amount: 116, dueDate: "30 Mar 2026" },
    { id: "107516", customer: "Athira R", category: "General", status: "Pending" as const, amount: 100, dueDate: "28 Mar 2026" },
    { id: "107506", customer: "Sravan mv", category: "General", status: "Paid" as const, amount: 1300, dueDate: "26 Mar 2026" },
    { id: "107496", customer: "Sravan M V", category: "General", status: "Pending" as const, amount: 140, dueDate: "24 Mar 2026" },
    { id: "349", customer: "aswin", category: "General", status: "Overdue" as const, amount: 200, dueDate: "20 Mar 2026" },
  ];

  return {
    title: "Finance Manager Dashboard",
    subtitle: `Keep a tab on your finance and manage your finance operations smoothly for ${place}.`,
    summaries: [
      { label: "Revenue", value: formatFinanceCurrency(0), accent: "emerald" },
      { label: "Expenses", value: formatFinanceCurrency(0), accent: "rose" },
      { label: "Payout", value: formatFinanceCurrency(0), accent: "amber" },
      { label: "Settled Invoices", value: "2044", accent: "indigo" },
    ],
    accountBalance: 0,
    cashInHand: 15950784.2,
    cashUpdatedOn: "21-04-2026 04:26:36 PM",
    actions: buildActions("/health/finance"),
    expenses,
    vendors,
    transactions: buildTransactions(payments, expenses),
    invoices,
    payments,
    reports: [
      { id: "r-1", metric: "Average invoice value", value: formatFinanceCurrency(11100), note: "Based on the latest invoice mix." },
      { id: "r-2", metric: "Collection efficiency", value: "73%", note: "Collected within seven days of invoice issue." },
      { id: "r-3", metric: "Outstanding balance", value: formatFinanceCurrency(128000), note: "Open receivables across active health services." },
    ],
  };
}

function createBookingsDataset(place: string): FinanceDataset {
  const payments: FinancePaymentRow[] = [
    { id: "PAY-4832", source: "Slot Confirmation", payer: "Boardroom Slot", method: "Card", amount: 12500, receivedOn: "21 Apr 2026" },
    { id: "PAY-4827", source: "Package Booking", payer: "Studio Session", method: "UPI", amount: 9700, receivedOn: "20 Apr 2026" },
    { id: "PAY-4819", source: "Venue Deposit", payer: "Weekend Event", method: "Bank Transfer", amount: 28000, receivedOn: "19 Apr 2026" },
  ];

  const expenses: FinanceExpenseRow[] = [
    { id: "EXP-401", title: "Venue Maintenance", category: "Operations", owner: "Bookings Ops", amount: 5400, bookedOn: "20 Apr 2026", difference: 8, increased: true },
    { id: "EXP-398", title: "Studio Utilities", category: "Utilities", owner: "HQ Finance", amount: 3200, bookedOn: "19 Apr 2026", difference: 3, increased: false },
  ];

  const vendors: FinanceVendorRow[] = [
    { id: "VEN-B01", name: "Event Lights Co", category: "Lighting", status: "Active", payable: 12000 },
    { id: "VEN-B02", name: "Hall Support", category: "Maintenance", status: "Active", payable: 7400 },
  ];

  const invoices = [
    { id: "INV-11061", customer: "Boardroom Slot", category: "Bookings", status: "Paid" as const, amount: 12000, dueDate: "21 Apr 2026" },
    { id: "INV-11058", customer: "Studio Session", category: "Bookings", status: "Pending" as const, amount: 8500, dueDate: "23 Apr 2026" },
    { id: "INV-11045", customer: "Weekend Event", category: "Bookings", status: "Overdue" as const, amount: 31000, dueDate: "18 Apr 2026" },
  ];

  return {
    title: "Bookings Finance Dashboard",
    subtitle: `Finance visibility for bookings at ${place}.`,
    summaries: [
      { label: "Revenue", value: formatFinanceCurrency(238000), accent: "emerald" },
      { label: "Expenses", value: formatFinanceCurrency(54000), accent: "rose" },
      { label: "Payout", value: formatFinanceCurrency(28000), accent: "amber" },
      { label: "Settled Invoices", value: "92", accent: "indigo" },
    ],
    accountBalance: 0,
    cashInHand: 48250,
    cashUpdatedOn: "21 Apr 2026 11:42 AM",
    actions: buildActions("/bookings/finance"),
    expenses,
    vendors,
    transactions: buildTransactions(payments, expenses),
    invoices,
    payments,
    reports: [
      { id: "r-1", metric: "Average booking value", value: formatFinanceCurrency(8100), note: "Average across active booking invoices." },
      { id: "r-2", metric: "Deposit conversion", value: "68%", note: "Deposits converted into completed bookings." },
      { id: "r-3", metric: "Outstanding balance", value: formatFinanceCurrency(54000), note: "Open receivables across current reservations." },
    ],
  };
}

function createGolderpDataset(place: string): FinanceDataset {
  const payments: FinancePaymentRow[] = [
    { id: "PAY-9832", source: "Retail Invoice", payer: "Raman Jewels", method: "Card", amount: 74500, receivedOn: "21 Apr 2026" },
    { id: "PAY-9827", source: "Advance Booking", payer: "Sree Lakshmi", method: "UPI", amount: 30000, receivedOn: "20 Apr 2026" },
    { id: "PAY-9819", source: "Bulk Settlement", payer: "Asha Gold House", method: "Bank Transfer", amount: 120000, receivedOn: "19 Apr 2026" },
  ];

  const expenses: FinanceExpenseRow[] = [
    { id: "EXP-G01", title: "Polish Vendor", category: "Processing", owner: "Gold Ops", amount: 18000, bookedOn: "20 Apr 2026", difference: 9, increased: true },
    { id: "EXP-G02", title: "Stone Supply", category: "Inventory", owner: "Procurement", amount: 42000, bookedOn: "19 Apr 2026", difference: 7, increased: true },
  ];

  const vendors: FinanceVendorRow[] = [
    { id: "VEN-G01", name: "North Capital Advisors", category: "Consulting", status: "On Hold", payable: 54000 },
    { id: "VEN-G02", name: "Unified Prints", category: "Operations", status: "Active", payable: 12000 },
  ];

  const invoices = [
    { id: "INV-88061", customer: "Raman Jewels", category: "Gold Order", status: "Paid" as const, amount: 126000, dueDate: "21 Apr 2026" },
    { id: "INV-88058", customer: "Sree Lakshmi", category: "Diamond Ring", status: "Pending" as const, amount: 84200, dueDate: "25 Apr 2026" },
    { id: "INV-88045", customer: "Asha Gold House", category: "Bulk Purchase", status: "Overdue" as const, amount: 154000, dueDate: "17 Apr 2026" },
  ];

  return {
    title: "Gold ERP Finance Dashboard",
    subtitle: `Finance visibility for Gold ERP at ${place}.`,
    summaries: [
      { label: "Revenue", value: formatFinanceCurrency(920000), accent: "emerald" },
      { label: "Expenses", value: formatFinanceCurrency(222000), accent: "rose" },
      { label: "Payout", value: formatFinanceCurrency(143000), accent: "amber" },
      { label: "Settled Invoices", value: "214", accent: "indigo" },
    ],
    accountBalance: 0,
    cashInHand: 204000,
    cashUpdatedOn: "21 Apr 2026 03:15 PM",
    actions: buildActions("/golderp/finance"),
    expenses,
    vendors,
    transactions: buildTransactions(payments, expenses),
    invoices,
    payments,
    reports: [
      { id: "r-1", metric: "Average invoice value", value: formatFinanceCurrency(48600), note: "Average across invoiced sales orders." },
      { id: "r-2", metric: "Payment turnaround", value: "4.2 days", note: "Average time from invoice to settlement." },
      { id: "r-3", metric: "Outstanding balance", value: formatFinanceCurrency(222000), note: "Open balances from orders and vendor credits." },
    ],
  };
}

function createFallbackDataset(place: string): FinanceDataset {
  const payments: FinancePaymentRow[] = [
    { id: "PAY-5832", source: "Recurring Billing", payer: "Primary Account", method: "Card", amount: 11200, receivedOn: "21 Apr 2026" },
    { id: "PAY-5827", source: "Manual Collection", payer: "Growth Account", method: "UPI", amount: 6800, receivedOn: "20 Apr 2026" },
  ];

  const expenses: FinanceExpenseRow[] = [
    { id: "EXP-F01", title: "General Operations", category: "Operations", owner: "Finance Desk", amount: 2400, bookedOn: "20 Apr 2026", difference: 5, increased: true },
  ];

  const vendors: FinanceVendorRow[] = [
    { id: "VEN-F01", name: "Primary Vendor", category: "General", status: "Active", payable: 5000 },
  ];

  const invoices = [
    { id: "INV-50061", customer: "Primary Account", category: "General", status: "Paid" as const, amount: 16800, dueDate: "21 Apr 2026" },
    { id: "INV-50058", customer: "Growth Account", category: "General", status: "Pending" as const, amount: 9450, dueDate: "23 Apr 2026" },
  ];

  return {
    title: "Finance Dashboard",
    subtitle: `A lightweight finance view for ${place}, scoped to the active product context.`,
    summaries: [
      { label: "Revenue", value: formatFinanceCurrency(315000), accent: "emerald" },
      { label: "Expenses", value: formatFinanceCurrency(76000), accent: "rose" },
      { label: "Payout", value: formatFinanceCurrency(12000), accent: "amber" },
      { label: "Settled Invoices", value: "104", accent: "indigo" },
    ],
    accountBalance: 0,
    cashInHand: 24500,
    cashUpdatedOn: "21 Apr 2026 09:30 AM",
    actions: buildActions("/finance"),
    expenses,
    vendors,
    transactions: buildTransactions(payments, expenses),
    invoices,
    payments,
    reports: [
      { id: "r-1", metric: "Average invoice value", value: formatFinanceCurrency(12600), note: "Average across current invoices." },
      { id: "r-2", metric: "Collection efficiency", value: "71%", note: "Collected within seven days of invoice issue." },
      { id: "r-3", metric: "Outstanding balance", value: formatFinanceCurrency(76000), note: "Open receivables for the active product." },
    ],
  };
}

export function getFinanceDataset(product: ProductKey, locationName?: string | null): FinanceDataset {
  const place = locationName || "the current location";

  if (product === "health") return createHealthDataset(place);
  if (product === "bookings") return createBookingsDataset(place);
  if (product === "golderp") return createGolderpDataset(place);
  return createFallbackDataset(place);
}
