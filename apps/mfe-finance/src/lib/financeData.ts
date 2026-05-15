export type FinanceStatus = "Paid" | "Pending" | "Overdue" | "Partially Paid";

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

export type FinanceExpenseBreakdown = {
  id: string;
  category: string;
  amountDifference: number;
  percentage: number;
  increased: boolean;
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
