export type FinanceStatus = "Paid" | "Pending" | "Overdue";

export type FinanceSummaryCard = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export type FinanceInvoice = {
  id: string;
  customer: string;
  category: string;
  amount: number;
  dueDate: string;
  status: FinanceStatus;
};

export type FinancePayment = {
  id: string;
  payer: string;
  method: string;
  amount: number;
  receivedOn: string;
};

export type FinanceEstimate = {
  id: string;
  account: string;
  title: string;
  amount: number;
  validUntil: string;
  stage: "Draft" | "Sent" | "Approved";
};

export type FinanceReportMetric = {
  id: string;
  metric: string;
  value: string;
  note: string;
};

export type FinanceVendor = {
  id: string;
  name: string;
  category: string;
  payable: number;
  lastPayment: string;
  status: "Active" | "On Hold";
};

export type FinanceLedgerEntry = {
  id: string;
  account: string;
  type: "Credit" | "Debit";
  amount: number;
  balance: number;
  updatedOn: string;
};

export type FinanceReceivable = {
  id: string;
  customer: string;
  invoiceId: string;
  amountDue: number;
  ageing: string;
  owner: string;
};

export type FinancePayable = {
  id: string;
  vendor: string;
  billRef: string;
  amountDue: number;
  dueOn: string;
  priority: "High" | "Medium" | "Low";
};

export type FinanceExpense = {
  id: string;
  title: string;
  category: string;
  owner: string;
  amount: number;
  bookedOn: string;
};

export type FinanceCategory = {
  id: string;
  name: string;
  usageCount: number;
  linkedTo: string;
};

export type FinanceStatusItem = {
  id: string;
  name: string;
  appliesTo: string;
  colorHint: string;
};

export type FinanceCashEntry = {
  id: string;
  source: string;
  amount: number;
  updatedOn: string;
  owner: string;
};

export type FinanceActivity = {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getStatusVariant(status: FinanceStatus): "success" | "warning" | "danger" {
  if (status === "Paid") return "success";
  if (status === "Pending") return "warning";
  return "danger";
}

export const financeSummaryCards: FinanceSummaryCard[] = [
  { label: "Gross Revenue", value: formatCurrency(1264000), accent: "emerald" },
  { label: "Open Receivables", value: formatCurrency(286000), accent: "amber" },
  { label: "Open Payables", value: formatCurrency(143000), accent: "rose" },
  { label: "Settled Invoices", value: "312", accent: "indigo" },
];

export const financeInvoices: FinanceInvoice[] = [
  { id: "INV-9012", customer: "Sree Medical Centre", category: "Subscription Billing", amount: 42000, dueDate: "23 Apr 2026", status: "Pending" },
  { id: "INV-9008", customer: "Raman Jewels", category: "Retail ERP Plan", amount: 78500, dueDate: "21 Apr 2026", status: "Paid" },
  { id: "INV-8991", customer: "Aster Diagnostics", category: "Usage Overages", amount: 18400, dueDate: "18 Apr 2026", status: "Overdue" },
  { id: "INV-8974", customer: "Northside Clinic", category: "Annual Renewal", amount: 96000, dueDate: "17 Apr 2026", status: "Paid" },
  { id: "INV-8966", customer: "City Clinic Group", category: "Collections Automation", amount: 92000, dueDate: "16 Apr 2026", status: "Pending" },
  { id: "INV-8951", customer: "Southline Labs", category: "Platform Billing", amount: 45600, dueDate: "14 Apr 2026", status: "Overdue" },
  { id: "INV-8944", customer: "Vinitha W", category: "Order Invoice", amount: 19600, dueDate: "12 Apr 2026", status: "Paid" },
  { id: "INV-8937", customer: "Aswin S", category: "Booking Invoice", amount: 1000, dueDate: "10 Apr 2026", status: "Paid" },
];

export const financePayments: FinancePayment[] = [
  { id: "PAY-1209", payer: "Raman Jewels", method: "Bank Transfer", amount: 78500, receivedOn: "21 Apr 2026" },
  { id: "PAY-1204", payer: "Northside Clinic", method: "UPI", amount: 24000, receivedOn: "20 Apr 2026" },
  { id: "PAY-1196", payer: "Sree Medical Centre", method: "Card", amount: 16000, receivedOn: "19 Apr 2026" },
  { id: "PAY-1187", payer: "Aster Diagnostics", method: "Net Banking", amount: 12500, receivedOn: "18 Apr 2026" },
  { id: "PAY-1181", payer: "City Clinic Group", method: "UPI", amount: 30000, receivedOn: "17 Apr 2026" },
  { id: "PAY-1175", payer: "Vinitha W", method: "Cash", amount: 19600, receivedOn: "17 Apr 2026" },
  { id: "PAY-1162", payer: "Aswin S", method: "Card", amount: 1000, receivedOn: "16 Apr 2026" },
];

export const financeEstimates: FinanceEstimate[] = [
  { id: "EST-310", account: "City Clinic Group", title: "Multi-location finance rollout", amount: 245000, validUntil: "30 Apr 2026", stage: "Approved" },
  { id: "EST-307", account: "Blue Lotus Labs", title: "Invoicing automation setup", amount: 84000, validUntil: "28 Apr 2026", stage: "Sent" },
  { id: "EST-301", account: "Urban Wellness", title: "Finance migration package", amount: 132000, validUntil: "26 Apr 2026", stage: "Draft" },
];

export const financeReportMetrics: FinanceReportMetric[] = [
  { id: "rep-1", metric: "Collection efficiency", value: "78%", note: "Collected within seven days of invoice date." },
  { id: "rep-2", metric: "Average invoice value", value: formatCurrency(40500), note: "Based on the latest rolling 90 days." },
  { id: "rep-3", metric: "Average payment lag", value: "4.6 days", note: "From invoice issue to last settlement event." },
  { id: "rep-4", metric: "Overdue exposure", value: formatCurrency(286000), note: "Invoices currently beyond due date." },
];

export const financeVendors: FinanceVendor[] = [
  { id: "VEN-101", name: "Axis Business Services", category: "Compliance", payable: 34000, lastPayment: "16 Apr 2026", status: "Active" },
  { id: "VEN-086", name: "Unified Prints", category: "Operations", payable: 12000, lastPayment: "14 Apr 2026", status: "Active" },
  { id: "VEN-041", name: "North Capital Advisors", category: "Consulting", payable: 54000, lastPayment: "02 Apr 2026", status: "On Hold" },
  { id: "VEN-032", name: "Aadhithya", category: "Supplies", payable: 8000, lastPayment: "11 Apr 2026", status: "Active" },
  { id: "VEN-028", name: "Nandhilath", category: "Electronics", payable: 26400, lastPayment: "08 Apr 2026", status: "Active" },
  { id: "VEN-017", name: "Aparna", category: "Logistics", payable: 9500, lastPayment: "06 Apr 2026", status: "Active" },
  { id: "VEN-012", name: "Joseph", category: "Maintenance", payable: 6100, lastPayment: "04 Apr 2026", status: "Active" },
  { id: "VEN-009", name: "Basics", category: "Retail", payable: 18200, lastPayment: "03 Apr 2026", status: "On Hold" },
];

export const financeLedgerEntries: FinanceLedgerEntry[] = [
  { id: "LED-001", account: "Revenue Clearing", type: "Credit", amount: 78500, balance: 412000, updatedOn: "21 Apr 2026" },
  { id: "LED-002", account: "Receivable Adjustments", type: "Debit", amount: 18400, balance: 122000, updatedOn: "20 Apr 2026" },
  { id: "LED-003", account: "Vendor Payables", type: "Credit", amount: 54000, balance: 143000, updatedOn: "19 Apr 2026" },
  { id: "LED-004", account: "Cash Register", type: "Credit", amount: 19600, balance: 223600, updatedOn: "18 Apr 2026" },
  { id: "LED-005", account: "Expense Booking", type: "Debit", amount: 12000, balance: 211600, updatedOn: "17 Apr 2026" },
];

export const financeReceivables: FinanceReceivable[] = [
  { id: "REC-410", customer: "Aster Diagnostics", invoiceId: "INV-8991", amountDue: 18400, ageing: "12 days", owner: "Collections Desk" },
  { id: "REC-404", customer: "City Clinic Group", invoiceId: "INV-8966", amountDue: 92000, ageing: "8 days", owner: "Enterprise Billing" },
  { id: "REC-399", customer: "Southline Labs", invoiceId: "INV-8951", amountDue: 45600, ageing: "16 days", owner: "Regional Finance" },
  { id: "REC-392", customer: "Blue Lotus Labs", invoiceId: "INV-8928", amountDue: 28600, ageing: "5 days", owner: "Collections Desk" },
];

export const financePayables: FinancePayable[] = [
  { id: "PAYB-220", vendor: "Axis Business Services", billRef: "BILL-840", amountDue: 34000, dueOn: "25 Apr 2026", priority: "High" },
  { id: "PAYB-214", vendor: "Unified Prints", billRef: "BILL-812", amountDue: 12000, dueOn: "29 Apr 2026", priority: "Medium" },
  { id: "PAYB-206", vendor: "North Capital Advisors", billRef: "BILL-790", amountDue: 54000, dueOn: "03 May 2026", priority: "Low" },
  { id: "PAYB-198", vendor: "Aparna", billRef: "BILL-755", amountDue: 9500, dueOn: "24 Apr 2026", priority: "High" },
];

export const financeExpenses: FinanceExpense[] = [
  { id: "EXP-600", title: "Monthly Compliance Retainer", category: "Legal", owner: "HQ Finance", amount: 34000, bookedOn: "18 Apr 2026" },
  { id: "EXP-596", title: "Print Collateral Batch", category: "Operations", owner: "Brand Team", amount: 12000, bookedOn: "17 Apr 2026" },
  { id: "EXP-590", title: "Collection Travel Reimbursement", category: "Travel", owner: "Collections Desk", amount: 6800, bookedOn: "15 Apr 2026" },
  { id: "EXP-587", title: "Cash Register Refill", category: "Treasury", owner: "Finance Desk", amount: 25000, bookedOn: "14 Apr 2026" },
  { id: "EXP-581", title: "Medical Consumables", category: "Supplies", owner: "Branch Ops", amount: 44400, bookedOn: "12 Apr 2026" },
];

export const financeCategories: FinanceCategory[] = [
  { id: "CAT-01", name: "Subscription Billing", usageCount: 128, linkedTo: "Invoices" },
  { id: "CAT-02", name: "Compliance", usageCount: 32, linkedTo: "Expenses" },
  { id: "CAT-03", name: "Collections", usageCount: 21, linkedTo: "Ledger" },
];

export const financeStatuses: FinanceStatusItem[] = [
  { id: "STS-01", name: "Pending Review", appliesTo: "Invoices", colorHint: "Amber" },
  { id: "STS-02", name: "Partially Settled", appliesTo: "Receivables", colorHint: "Indigo" },
  { id: "STS-03", name: "On Hold", appliesTo: "Vendors", colorHint: "Rose" },
];

export const financeCashInHand: FinanceCashEntry[] = [
  { id: "CASH-01", source: "Collections Counter", amount: 46500, updatedOn: "21 Apr 2026", owner: "Finance Desk" },
  { id: "CASH-02", source: "Field Settlements", amount: 18200, updatedOn: "20 Apr 2026", owner: "Collections Team" },
  { id: "CASH-03", source: "Front Office Float", amount: 15950784.2, updatedOn: "21 Apr 2026, 04:26:36 PM", owner: "Cash Register" },
];

export const financeCashRegisters: FinanceCashEntry[] = [
  { id: "REG-01", source: "Main Register", amount: 128000, updatedOn: "21 Apr 2026", owner: "HQ Cashier" },
  { id: "REG-02", source: "Branch Register", amount: 76000, updatedOn: "20 Apr 2026", owner: "Regional Cashier" },
  { id: "REG-03", source: "Field Register", amount: 90500, updatedOn: "19 Apr 2026", owner: "Field Cashier" },
];

export const financeActivityLogs: FinanceActivity[] = [
  { id: "ACT-01", action: "Invoice status changed", actor: "Arun S", target: "INV-9012", timestamp: "21 Apr 2026, 10:20 AM" },
  { id: "ACT-02", action: "Vendor added", actor: "Divya P", target: "VEN-101", timestamp: "20 Apr 2026, 04:45 PM" },
  { id: "ACT-03", action: "Ledger credit posted", actor: "Finance Bot", target: "LED-001", timestamp: "19 Apr 2026, 09:15 AM" },
];
