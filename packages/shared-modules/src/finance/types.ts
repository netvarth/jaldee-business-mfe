export type FinanceSummary = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export type FinanceInvoiceStatus = "Paid" | "Pending" | "Overdue" | "Partially Paid";
export type FinanceActionIcon = "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";

export type FinanceInvoiceRow = {
  id: string;
  customer: string;
  category: string;
  status: FinanceInvoiceStatus;
  amount: number;
  dueDate: string;
};

export type FinancePaymentRow = {
  id: string;
  source: string;
  payer?: string;
  method: string;
  amount: number;
  receivedOn: string;
};

export type FinanceExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  bookedOn: string;
  owner: string;
  difference?: number;
  increased?: boolean;
};

export type FinanceVendorRow = {
  id: string;
  name: string;
  category: string;
  status: "Active" | "On Hold";
  payable: number;
};

export type FinanceQuickAction = {
  label: string;
  route: string;
  icon: FinanceActionIcon;
  note: string;
  tone: string;
};

export type FinanceTransactionRow = {
  id: string;
  title: string;
  subtitle: string;
  kind: "Revenue" | "Payout";
  date: string;
  amount: number;
};

export type FinanceReportRow = {
  id: string;
  metric: string;
  value: string;
  note: string;
};

export type FinanceDataset = {
  title: string;
  subtitle: string;
  summaries: FinanceSummary[];
  accountBalance: number;
  cashInHand: number;
  cashUpdatedOn: string;
  actions: FinanceQuickAction[];
  expenses: FinanceExpenseRow[];
  vendors: FinanceVendorRow[];
  transactions: FinanceTransactionRow[];
  invoices: FinanceInvoiceRow[];
  payments: FinancePaymentRow[];
  reports: FinanceReportRow[];
  statistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[];
  monthlyStatistics: { label: string; value: number; revenue?: number; payout?: number; expense?: number }[];
  totalCount: number;
};

export type FinanceViewKey = "overview" | "invoices" | "payments" | "reports" | "settings";
