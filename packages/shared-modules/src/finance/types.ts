export type FinanceSummary = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export type FinanceInvoiceStatus = "Paid" | "Pending" | "Overdue" | "Partially Paid";
export type FinanceActionIcon = "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";

export type FinanceInvoiceRow = {
  id: string;
  uid: string;
  customer: string;
  category: string;
  status: FinanceInvoiceStatus;
  amount: number;
  amountDue: number;
  dueDate: string;
  orderSource?: string;
  storeName?: string;
  assignedUserName?: string;
  product?: string;
  internalInvoiceType?: string;
  billPaymentStatus?: string;
  billStatus?: string;
  providerConsumerId?: string;
};

export type FinanceInvoiceCategoryOption = {
  id: string;
  name: string;
};

export type FinanceInvoiceCreatePayload = {
  departmentId?: string;
  locationId?: string;
  categoryId?: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceLabel?: string;
  notesForCustomer?: string;
  termsConditions?: string;
  referenceNo?: string;
  invoiceId?: string;
  billedToAddress?: string;
  notesForProvider?: string;
  providerConsumerId: string;
  detailList: Array<{
    itemType: "ADHOC_ITEM";
    itemName: string;
    quantity: number;
    price: number;
  }>;
};

export type FinancePaymentRow = {
  id: string;
  source: string;
  payer?: string;
  method: string;
  amount: number;
  receivedOn: string;
};

export type FinanceRevenueRow = {
  id: string;
  uid: string;
  receivedDate: string;
  amount: number;
  categoryName: string;
  invoiceCategoryName: string;
  invoiceId?: string;
  referenceNo?: string;
  customerName?: string;
  vendorName?: string;
  locationName?: string;
  status?: string;
  isEdit?: boolean;
};

export type FinanceActivityLogRow = {
  id: string;
  dateTime: string;
  action: string;
  description: string;
  userName: string;
};

export type FinanceExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  bookedOn: string;
  owner: string;
  expenseUid?: string;
  locationName?: string;
  status?: string;
  payoutCreated?: boolean;
  isEdit?: boolean;
  difference?: number;
  increased?: boolean;
};

export type FinanceExpenseBreakdownRow = {
  id: string;
  category: string;
  currentAmount: number;
  amountDifference: number;
  percentage: number;
  increased: boolean;
};

export type FinanceVendorRow = {
  id: string;
  encId: string;
  name: string;
  category: string;
  status: string;
  vendorStatusName?: string;
  vendorStatusId?: string;
  createdDate: string;
  payable: number;
};

export type FinanceVendorStatusOption = {
  id: string;
  name: string;
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

export type FinanceViewKey = "overview" | "invoices" | "expense" | "receivables" | "revenue" | "payments" | "vendors" | "reports" | "activity-log" | "settings";
