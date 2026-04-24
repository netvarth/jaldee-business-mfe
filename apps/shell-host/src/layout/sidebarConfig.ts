import type { ProductKey } from "../store/shellStore";

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: SidebarItem[];
}

export const SIDEBAR_CONFIG: Partial<Record<ProductKey, SidebarSection[]>> = {
  health: [
    { id: "health-overview", label: "Overview", icon: "\u25A6", path: "/health" },
    { id: "health-op", label: "Outpatient", icon: "\u{1FA7A}", path: "/health/op" },
    {
      id: "health-ip",
      label: "Inpatient",
      icon: "\u{1F3E5}",
      path: "/health/ip",
      children: [
        { id: "health-ip-overview", label: "Overview", icon: "", path: "/health/ip" },
        { id: "health-ip-patients", label: "Patients", icon: "", path: "/health/ip/patients" },
        { id: "health-ip-admissions", label: "Admissions", icon: "", path: "/health/ip/admissions" },
        { id: "health-ip-beds", label: "Beds", icon: "", path: "/health/ip/beds" },
        { id: "health-ip-billing", label: "Billing", icon: "", path: "/health/ip/billing" },
        { id: "health-ip-settings", label: "Settings", icon: "", path: "/health/ip/settings" },
      ],
    },
    { id: "health-records", label: "Medical Records", icon: "\u{1F4CB}", path: "/health/medical-records" },
    {
      id: "health-drive",
      label: "Drive",
      icon: "\u{1F5C2}",
      path: "/health/drive",
      children: [
        { id: "health-drive-overview", label: "Overview", icon: "", path: "/health/drive" },
        { id: "health-drive-files", label: "Files", icon: "", path: "/health/drive/files" },
        { id: "health-drive-shared", label: "Shared", icon: "", path: "/health/drive/shared" },
        { id: "health-drive-activity", label: "Activity", icon: "", path: "/health/drive/activity" },
        { id: "health-drive-settings", label: "Settings", icon: "", path: "/health/drive/settings" },
      ],
    },
    { id: "health-pharmacy", label: "Pharmacy", icon: "\u{1F48A}", path: "/health/pharmacy" },
    { id: "health-patients", label: "Patients", icon: "\u{1F464}", path: "/health/patients" },
    { id: "health-customers", label: "Customers", icon: "\u{1F465}", path: "/health/customers" },
    { id: "health-leads", label: "Leads", icon: "\u{1F4E5}", path: "/health/leads" },
    {
      id: "health-finance",
      label: "Finance",
      icon: "\u{1F4B3}",
      path: "/health/finance",
      children: [
        { id: "health-finance-overview", label: "Overview", icon: "", path: "/health/finance" },
        { id: "health-finance-invoices", label: "Invoices", icon: "", path: "/health/finance/invoices" },
        { id: "health-finance-payments", label: "Payments", icon: "", path: "/health/finance/payments" },
        { id: "health-finance-reports", label: "Reports", icon: "", path: "/health/finance/reports" },
        { id: "health-finance-settings", label: "Settings", icon: "", path: "/health/finance/settings" },
      ],
    },
    { id: "health-memberships", label: "Memberships", icon: "\u{1F465}", path: "/health/memberships" },
    { id: "health-users", label: "Users", icon: "\u{1F465}", path: "/health/users" },
    { id: "health-reports", label: "Reports", icon: "\u{1F4CA}", path: "/health/reports" },
    { id: "health-settings", label: "Settings", icon: "\u2699", path: "/health/settings" },
  ],
  bookings: [
    { id: "bookings-overview", label: "Overview", icon: "\u25A6", path: "/bookings" },
    { id: "bookings-appointments", label: "Appointments", icon: "\u{1F4C5}", path: "/bookings/appointments" },
    { id: "bookings-requests", label: "Requests", icon: "\u{1F4E8}", path: "/bookings/requests" },
    { id: "bookings-queue", label: "Queue", icon: "\u23F3", path: "/bookings/queue" },
    { id: "bookings-calendar", label: "Calendar", icon: "\u{1F5D3}", path: "/bookings/calendar" },
    { id: "bookings-services", label: "Services", icon: "\u{1F527}", path: "/bookings/services" },
    {
      id: "bookings-drive",
      label: "Drive",
      icon: "\u{1F5C2}",
      path: "/bookings/drive",
      children: [
        { id: "bookings-drive-overview", label: "Overview", icon: "", path: "/bookings/drive" },
        { id: "bookings-drive-files", label: "Files", icon: "", path: "/bookings/drive/files" },
        { id: "bookings-drive-shared", label: "Shared", icon: "", path: "/bookings/drive/shared" },
        { id: "bookings-drive-activity", label: "Activity", icon: "", path: "/bookings/drive/activity" },
        { id: "bookings-drive-settings", label: "Settings", icon: "", path: "/bookings/drive/settings" },
      ],
    },
    { id: "bookings-customers", label: "Customers", icon: "\u{1F464}", path: "/bookings/customers" },
    { id: "bookings-reports", label: "Reports", icon: "\u{1F4CA}", path: "/bookings/reports" },
    { id: "bookings-settings", label: "Settings", icon: "\u2699", path: "/bookings/settings" },
  ],
  golderp: [
    { id: "golderp-overview", label: "Overview", icon: "\u25A6", path: "/golderp" },
    { id: "golderp-sales", label: "Sales", icon: "\u{1F4C8}", path: "/golderp/sales" },
    { id: "golderp-purchases", label: "Purchases", icon: "\u{1F6D2}", path: "/golderp/purchases" },
    { id: "golderp-inventory", label: "Inventory", icon: "\u{1F4E6}", path: "/golderp/inventory" },
    { id: "golderp-customers", label: "Customers", icon: "\u{1F465}", path: "/golderp/customers" },
    { id: "golderp-vendors", label: "Vendors", icon: "\u{1F3EA}", path: "/golderp/vendors" },
    {
      id: "golderp-drive",
      label: "Drive",
      icon: "\u{1F5C2}",
      path: "/golderp/drive",
      children: [
        { id: "golderp-drive-overview", label: "Overview", icon: "", path: "/golderp/drive" },
        { id: "golderp-drive-files", label: "Files", icon: "", path: "/golderp/drive/files" },
        { id: "golderp-drive-shared", label: "Shared", icon: "", path: "/golderp/drive/shared" },
        { id: "golderp-drive-activity", label: "Activity", icon: "", path: "/golderp/drive/activity" },
        { id: "golderp-drive-settings", label: "Settings", icon: "", path: "/golderp/drive/settings" },
      ],
    },
    { id: "golderp-finance", label: "Finance", icon: "\u{1F4B3}", path: "/golderp/finance" },
    { id: "golderp-reports", label: "Reports", icon: "\u{1F4CA}", path: "/golderp/reports" },
    { id: "golderp-settings", label: "Settings", icon: "\u2699", path: "/golderp/settings" },
  ],
  karty: [
    { id: "karty-overview", label: "Overview", icon: "\u25A6", path: "/karty" },
    { id: "karty-orders", label: "Orders", icon: "\u{1F4E6}", path: "/karty/orders" },
    { id: "karty-inventory", label: "Inventory", icon: "\u{1F3EA}", path: "/karty/inventory" },
    { id: "karty-catalog", label: "Catalog", icon: "\u{1F3F7}", path: "/karty/catalog" },
    { id: "karty-customers", label: "Customers", icon: "\u{1F464}", path: "/karty/customers" },
    { id: "karty-reports", label: "Reports", icon: "\u{1F4CA}", path: "/karty/reports" },
    { id: "karty-settings", label: "Settings", icon: "\u2699", path: "/karty/settings" },
  ],
  finance: [
    { id: "finance-overview", label: "Overview", icon: "\u25A6", path: "/finance" },
    { id: "finance-estimates", label: "Estimates", icon: "\u{1F4C4}", path: "/finance/estimates" },
    { id: "finance-vendors", label: "Vendors", icon: "\u{1F3EA}", path: "/finance/vendors" },
    { id: "finance-ledger", label: "Ledger", icon: "\u{1F4D2}", path: "/finance/ledger" },
    { id: "finance-receivables", label: "Receivables", icon: "\u{1F4B5}", path: "/finance/receivables" },
    { id: "finance-payables", label: "Payables", icon: "\u{1F4B8}", path: "/finance/payable" },
    { id: "finance-expense", label: "Expenses", icon: "\u{1F4B3}", path: "/finance/expense" },
    { id: "finance-invoices", label: "Invoices", icon: "\u{1F9FE}", path: "/finance/invoice" },
    { id: "finance-payments", label: "Payments", icon: "\u{1F4B3}", path: "/finance/payments" },
    { id: "finance-category", label: "Category", icon: "\u{1F4C1}", path: "/finance/category" },
    { id: "finance-status", label: "Status", icon: "\u2705", path: "/finance/status" },
    { id: "finance-cash-in-hand", label: "Cash In Hand", icon: "\u{1F4B0}", path: "/finance/cashInhand" },
    { id: "finance-cash-register", label: "Cash Register", icon: "\u{1F4B0}", path: "/finance/cashRegister" },
    { id: "finance-activity-log", label: "Activity Log", icon: "\u{1F4DD}", path: "/finance/activity-log" },
    { id: "finance-reports", label: "Reports", icon: "\u{1F4CA}", path: "/finance/reports" },
    { id: "finance-settings", label: "Settings", icon: "\u2699", path: "/finance/settings" },
  ],
  lending: [
    { id: "lending-overview", label: "Overview", icon: "\u25A6", path: "/lending" },
    { id: "lending-applications", label: "Applications", icon: "\u{1F4CB}", path: "/lending/applications" },
    { id: "lending-repayments", label: "Repayments", icon: "\u{1F4B8}", path: "/lending/repayments" },
    { id: "lending-customers", label: "Customers", icon: "\u{1F464}", path: "/lending/customers" },
    { id: "lending-reports", label: "Reports", icon: "\u{1F4CA}", path: "/lending/reports" },
    { id: "lending-settings", label: "Settings", icon: "\u2699", path: "/lending/settings" },
  ],
  hr: [
    { id: "hr-overview", label: "Overview", icon: "\u25A6", path: "/hr" },
    { id: "hr-employees", label: "Employees", icon: "\u{1F464}", path: "/hr/employees" },
    { id: "hr-payroll", label: "Payroll", icon: "\u{1F4B0}", path: "/hr/payroll" },
    { id: "hr-attendance", label: "Attendance", icon: "\u{1F4C5}", path: "/hr/attendance" },
    { id: "hr-reports", label: "Reports", icon: "\u{1F4CA}", path: "/hr/reports" },
    { id: "hr-settings", label: "Settings", icon: "\u2699", path: "/hr/settings" },
  ],
  ai: [
    { id: "ai-overview", label: "Overview", icon: "\u25A6", path: "/ai" },
    { id: "ai-assistants", label: "Assistants", icon: "\u2728", path: "/ai/assistants" },
    { id: "ai-automation", label: "Automation", icon: "\u2699", path: "/ai/automation" },
    { id: "ai-insights", label: "Insights", icon: "\u{1F4A1}", path: "/ai/insights" },
  ],
};

export const PRODUCT_ACCENTS: Partial<Record<ProductKey, string>> = {
  health: "#0D9488",
  bookings: "#2563EB",
  golderp: "#B45309",
  karty: "#EA580C",
  finance: "#059669",
  lending: "#7C3AED",
  hr: "#0369A1",
  ai: "#6366F1",
};
