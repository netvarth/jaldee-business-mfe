export type FinanceRouteKey =
  | "dashboard"
  | "customers"
  | "vendors"
  | "ledger"
  | "receivables"
  | "payable"
  | "expense"
  | "invoice"
  | "discount"
  | "coupons"
  | "category"
  | "status"
  | "total"
  | "cashInhand"
  | "cashRegister"
  | "activity-log"
  | "sequence-template"
  | "sequence-settings"
  | "master-invoice";

export interface FinanceRouteDefinition {
  key: FinanceRouteKey;
  path: string;
  label: string;
  angularModule?: string;
}

export const financeRoutes: FinanceRouteDefinition[] = [
  { key: "dashboard", path: "dashboard", label: "Dashboard", angularModule: "./dashboard/dashboard.module" },
  { key: "customers", path: "customers", label: "Customers", angularModule: "./customers/customers.module" },
  { key: "vendors", path: "vendors", label: "Vendors", angularModule: "./vendors/vendors.module" },
  { key: "ledger", path: "ledger", label: "Ledger", angularModule: "./ledger/ledger.module" },
  { key: "receivables", path: "receivables", label: "Receivables", angularModule: "./receivable/receivable.module" },
  { key: "payable", path: "payable", label: "Payable", angularModule: "./payable/payable.module" },
  { key: "expense", path: "expense", label: "Expense", angularModule: "./expense/expense.module" },
  { key: "invoice", path: "invoice", label: "Invoice", angularModule: "./invoice/invoice.module" },
  { key: "discount", path: "discount", label: "Discount", angularModule: "./discount/discount.module" },
  { key: "coupons", path: "coupons", label: "Coupons" },
  { key: "category", path: "category", label: "Category", angularModule: "./category/category.module" },
  { key: "status", path: "status", label: "Status", angularModule: "./status/status.module" },
  { key: "total", path: "total", label: "Total", angularModule: "./total-list/total-list.module" },
  { key: "cashInhand", path: "cashInhand", label: "Cash In Hand", angularModule: "./cash-inhand/cash-inhand.module" },
  { key: "cashRegister", path: "cashRegister", label: "Cash Register", angularModule: "./cash-register/cash-register.module" },
  { key: "activity-log", path: "activity-log", label: "Activity Log", angularModule: "./activity-log/activity-log.module" },
  { key: "sequence-template", path: "sequence-template", label: "Sequence Template", angularModule: "./sequence-template/sequence-template.module" },
  { key: "sequence-settings", path: "sequence-settings", label: "Sequence Settings", angularModule: "./sequence-settings/sequence-settings.module" },
  { key: "master-invoice", path: "master-invoice/:uid", label: "Master Invoice", angularModule: "./master-invoice/master-invoice.module" },
];
