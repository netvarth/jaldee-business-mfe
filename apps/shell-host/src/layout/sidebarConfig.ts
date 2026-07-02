import { createElement, type ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Grid2X2,
  HelpCircle,
  Megaphone,
  Settings,
  UserSearch,
  Users,
  Wrench,
} from "lucide-react";
import type { ProductKey } from "../store/shellStore";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  children?: SidebarItem[];
}

export interface SettingsMenuGroup {
  id: string;
  label: string;
  items: { id: string; label: string; path: string; badge?: string }[];
}

const sidebarIcon = (Icon: typeof Grid2X2) =>
  createElement(Icon, { size: 18, strokeWidth: 1.9 });

export const BASE_CRM_SIDEBAR_SECTIONS: SidebarSection[] = [
  { id: "basecrm-customers", label: "Customers", icon: "\u{1F464}", path: "/customers" },
  { id: "basecrm-users", label: "Users", icon: "\u{1F465}", path: "/users" },
  { id: "basecrm-drive", label: "Drive", icon: "\u{1F5C2}", path: "/drive" },
  {
    id: "basecrm-tasks",
    label: "Tasks",
    icon: "\u{1F4CB}",
    path: "/tasks",
    children: [
      { id: "basecrm-tasks-overview",   label: "Overview",   icon: "", path: "/tasks/overview" },
      { id: "basecrm-tasks-templates",  label: "Templates",  icon: "", path: "/tasks/templates" },
      { id: "basecrm-tasks-settings",   label: "Settings",   icon: "", path: "/tasks/settings" },
    ],
  },

  {
    id: "basecrm-membership",
    label: "Membership",
    icon: "\u{1F5C3}",
    path: "/membership",
    children: [
      { id: "basecrm-membership-overview", label: "Overview", icon: "", path: "/membership" },
      { id: "basecrm-membership-members", label: "Members", icon: "", path: "/membership/members" },
      { id: "basecrm-membership-services", label: "Services", icon: "", path: "/membership/services" },
      { id: "basecrm-membership-fee-management", label: "Fee Management", icon: "", path: "/membership/fee-management" },
    ],
  },
  {
    id: "basecrm-leads",
    label: "Leads",
    icon: "\u{1F3AF}",
    path: "/leads",
    children: [
      { id: "basecrm-leads-dashboard", label: "Dashboard", icon: "", path: "/leads/dashboard" },
      { id: "basecrm-leads-list", label: "Leads List", icon: "", path: "/leads/list" },
      { id: "basecrm-leads-pipelines", label: "Pipelines", icon: "", path: "/leads/pipelines" },
      { id: "basecrm-leads-products", label: "Products", icon: "", path: "/leads/products" },
      { id: "basecrm-leads-templates", label: "Templates", icon: "", path: "/leads/templates" },
      { id: "basecrm-leads-channels", label: "Channels", icon: "", path: "/leads/channels" },
      { id: "basecrm-leads-audit-log", label: "Audit Log", icon: "", path: "/leads/audit-log" },
    ],
  },
  { id: "basecrm-reports", label: "Reports", icon: "\u{1F4CA}", path: "/reports" },
  { id: "basecrm-audit-log", label: "Audit Log", icon: "\u{1F4DD}", path: "/audit-log" },
  {
    id: "basecrm-ivr",
    label: "IVR",
    icon: "\u{1F4DE}",
    path: "/ivr",
    children: [
      { id: "basecrm-ivr-overview", label: "Overview", icon: "", path: "/ivr" },
      { id: "basecrm-ivr-calllogs", label: "Call Logs", icon: "", path: "/ivr/calllogs" },
      { id: "basecrm-ivr-schedules", label: "Schedules", icon: "", path: "/ivr/schedules" },
    ],
  },
];

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
        { id: "health-ip-patients", label: "Patients", icon: "", path: "/health/ip/inpatient" },
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
    {
      id: "health-pharmacy",
      label: "Pharmacy",
      icon: "\u{1F48A}",
      path: "/health/pharmacy/dashboard",
      children: [
        { id: "health-pharmacy-dashboard", label: "Dashboard", icon: "", path: "/health/pharmacy/dashboard" },
        { id: "health-pharmacy-create", label: "Create Order", icon: "", path: "/health/pharmacy/create" },
        { id: "health-pharmacy-orders", label: "Orders", icon: "", path: "/health/pharmacy/orders-grid" },
        { id: "health-pharmacy-items", label: "Items", icon: "", path: "/health/pharmacy/items" },
        { id: "health-pharmacy-catalogs", label: "Catalogs", icon: "", path: "/health/pharmacy/catalogs" },
        { id: "health-pharmacy-inventory", label: "Inventory", icon: "", path: "/health/pharmacy/inventory" },
        { id: "health-pharmacy-invoices", label: "Invoices", icon: "", path: "/health/pharmacy/invoices" },
        { id: "health-pharmacy-settings", label: "Settings", icon: "", path: "/health/pharmacy/settings" },
      ],
    },
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
    { id: "bookings-overview", label: "Overview", icon: sidebarIcon(Grid2X2), path: "/bookings/dashboard" },
    { id: "bookings-list", label: "Bookings", icon: sidebarIcon(Calendar), path: "/bookings" },
    { id: "bookings-calendars", label: "Calendars", icon: sidebarIcon(Calendar), path: "/bookings/calendars" },
    { id: "bookings-services", label: "Services", icon: sidebarIcon(Wrench), path: "/bookings/services" },
    { id: "bookings-customers", label: "Customers", icon: sidebarIcon(Users), path: "/bookings/customers" },
    { id: "bookings-users", label: "Users", icon: sidebarIcon(Users), path: "/bookings/users" },
    { id: "bookings-settings", label: "Settings", icon: sidebarIcon(Settings), path: "/bookings/settings" },
  ],
  golderp: [
    { id: "golderp-overview", label: "Overview", icon: "\u25A6", path: "/golderp" },
    { id: "golderp-masters", label: "Master Data", icon: "\u{1F5C3}", path: "/golderp/masters" },
    { id: "golderp-rates", label: "Metal Rate", icon: "\u{1F4C8}", path: "/golderp/rates" },
    { id: "golderp-catalogue", label: "Items", icon: "\u{1F3F7}", path: "/golderp/catalogue" },
    { id: "golderp-tags", label: "Tags", icon: "\u{1F516}", path: "/golderp/tags" },
    { id: "golderp-sales", label: "Sales", icon: "\u{1F4C8}", path: "/golderp/sales" },
    { id: "golderp-purchases", label: "Purchases", icon: "\u{1F6D2}", path: "/golderp/purchases" },
    { id: "golderp-grn", label: "GRN Entry", icon: "\u{1F4E5}", path: "/golderp/grn" },
    { id: "golderp-inventory", label: "Inventory", icon: "\u{1F4E6}", path: "/golderp/inventory" },
    { id: "golderp-old-gold", label: "Exchange", icon: "\u267B", path: "/golderp/old-gold" },
    { id: "golderp-online-orders", label: "Online Orders", icon: "\u{1F310}", path: "/golderp/online-orders" },
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
    { id: "golderp-reports", label: "Reports", icon: "\u{1F4CA}", path: "/golderp/reports" },
    { id: "golderp-audit", label: "Audit Log", icon: "\u{1F4DD}", path: "/golderp/audit" },
  ],
  karty: [
    { id: "karty-overview", label: "Overview", icon: "\u25A6", path: "/karty/orders/dashboard" },
    {
      id: "karty-orders",
      label: "Orders",
      icon: "\u{1F9FE}",
      path: "/karty/orders/orders-grid",
      children: [
        { id: "karty-orders-list", label: "Orders List", icon: "", path: "/karty/orders/orders-grid" },
        { id: "karty-sales-returns", label: "Sales Returns", icon: "", path: "/karty/orders/sales-returns" },
      ],
    },
    { id: "karty-inventory", label: "Inventory", icon: "\u{1F3EA}", path: "/karty/inventory" },
    {
      id: "karty-inventorynew",
      label: "InventoryNew",
      icon: "\u{1F4E6}",
      path: "/karty/inventorynew",
      children: [
        { id: "karty-inventorynew-inventory-catalogs", label: "Inventory Catalogs", icon: "", path: "/karty/inventorynew/inventory-catalogs" },
        { id: "karty-inventorynew-order-catalogs", label: "Order Catalogs", icon: "", path: "/karty/inventorynew/order-catalogs" },
        { id: "karty-inventorynew-purchases", label: "Purchases", icon: "", path: "/karty/inventorynew/purchases" },
      ],
    },
    { id: "karty-catalog", label: "Items/Products", icon: "\u{1F4E6}", path: "/karty/orders/items" },
    { id: "karty-stores", label: "Stores", icon: "\u{1F3EC}", path: "/karty/stores" },
    { id: "karty-customers", label: "Customers", icon: "\u{1F464}", path: "/karty/customers" },
    { id: "karty-users", label: "Users", icon: "\u{1F465}", path: "/karty/users" },
    {
      id: "karty-finance",
      label: "Finance",
      icon: "\u{1F4B3}",
      path: "/karty/finance",
      children: [
        { id: "karty-finance-overview", label: "Overview", icon: "", path: "/karty/finance" },
        { id: "karty-finance-invoices", label: "Invoices", icon: "", path: "/karty/finance/invoices" },
        { id: "karty-finance-receivables", label: "Receivables", icon: "", path: "/karty/finance/receivables" },
        { id: "karty-finance-expenses", label: "Expenses", icon: "", path: "/karty/finance/expense" },
        { id: "karty-finance-vendors", label: "Vendors", icon: "", path: "/karty/finance/vendors" },
        { id: "karty-finance-payouts", label: "Payouts", icon: "", path: "/karty/finance/payout" },
        { id: "karty-finance-reports", label: "Reports", icon: "", path: "/karty/finance/reports" },
        { id: "karty-finance-activity-log", label: "Activity Log", icon: "", path: "/karty/finance/activity-log" },
        { id: "karty-finance-settings", label: "Settings", icon: "", path: "/karty/finance/settings" },
      ],
    },
    { id: "karty-reports", label: "Reports", icon: "\u{1F4CA}", path: "/karty/reports" },
    {
      id: "karty-drive",
      label: "Drive",
      icon: "\u{1F5C2}",
      path: "/karty/drive",
      children: [
        { id: "karty-drive-overview", label: "Overview", icon: "", path: "/karty/drive" },
        { id: "karty-drive-files", label: "Files", icon: "", path: "/karty/drive/files" },
        { id: "karty-drive-shared", label: "Shared", icon: "", path: "/karty/drive/shared" },
        { id: "karty-drive-activity", label: "Activity", icon: "", path: "/karty/drive/activity" },
        { id: "karty-drive-settings", label: "Settings", icon: "", path: "/karty/drive/settings" },
      ],
    },
    { id: "karty-tasks", label: "Tasks", icon: "\u{1F4CB}", path: "/karty/tasks" },
    { id: "karty-membership", label: "Membership", icon: "\u{1F5C3}", path: "/karty/membership" },
    { id: "karty-leads", label: "Leads", icon: "\u{1F4E8}", path: "/karty/leads" },
    { id: "karty-audit-log", label: "Audit Log", icon: "\u{1F4DD}", path: "/karty/audit-log" },
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
    { id: "finance-payouts", label: "Payouts", icon: "\u{1F4B3}", path: "/finance/payout" },
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
    { id: "hr-dashboard", label: "Dashboard", icon: sidebarIcon(Grid2X2), path: "/hr" },
    { id: "hr-employees", label: "Employee Master", icon: sidebarIcon(Users), path: "/hr/employees" },
    { id: "hr-attendance", label: "Attendance", icon: sidebarIcon(Calendar), path: "/hr/attendance" },
    { id: "hr-leave", label: "Leave", icon: sidebarIcon(Calendar), path: "/hr/leave" },
    { id: "hr-payroll", label: "Payroll", icon: sidebarIcon(CreditCard), path: "/hr/payroll" },
    { id: "hr-expenses", label: "Expenses", icon: sidebarIcon(DollarSign), path: "/hr/expenses" },
    { id: "hr-recruitment", label: "Recruitment", icon: sidebarIcon(UserSearch), path: "/hr/recruitment" },
    { id: "hr-reports", label: "Reports", icon: sidebarIcon(BarChart3), path: "/hr/reports" },
    { id: "hr-self-service", label: "My HR", icon: sidebarIcon(Users), path: "/hr/me" },
    { id: "hr-staffspace", label: "StaffSpace", icon: sidebarIcon(Megaphone), path: "/hr/announcements" },
    { id: "hr-helpdesk", label: "Helpdesk", icon: sidebarIcon(HelpCircle), path: "/hr/tickets" },
    { id: "hr-settings", label: "Settings", icon: sidebarIcon(Settings), path: "/hr/settings" },
  ],
  ai: [
    { id: "ai-overview", label: "Overview", icon: "\u25A6", path: "/ai" },
    { id: "ai-assistants", label: "Assistants", icon: "\u2728", path: "/ai/assistants" },
    { id: "ai-automation", label: "Automation", icon: "\u2699", path: "/ai/automation" },
    { id: "ai-insights", label: "Insights", icon: "\u{1F4A1}", path: "/ai/insights" },
  ],
};

export const SETTINGS_MENU_GROUPS: SettingsMenuGroup[] = [
  {
    id: "settings-group-general",
    label: "GENERAL",
    items: [
      { id: "settings-company", label: "Company", path: "/settings/company" },
      { id: "settings-branding", label: "Branding", path: "/settings/branding" },
      { id: "settings-branches", label: "Branches & Locations", path: "/settings/locations" },
      { id: "settings-subscription", label: "Subscription & Products", path: "/settings/subscriptions" },
    ],
  },
  {
    id: "settings-group-business",
    label: "BUSINESS",
    items: [
      { id: "settings-billing", label: "Billing & Tax", path: "/settings/billing-tax" },
      { id: "settings-communications", label: "Communications", path: "/settings/communications" },
      { id: "settings-team", label: "Team & Access", path: "/settings/team-access" },
      { id: "settings-integrations", label: "Integrations", path: "/settings/integrations" },
    ],
  },
  {
    id: "settings-group-advanced",
    label: "ADVANCED",
    items: [
      { id: "settings-data", label: "Data & Privacy", path: "/settings/data-privacy" },
      { id: "settings-developer", label: "Developer", path: "/settings/developer", badge: "PRO" },
    ],
  },
];

export const PRODUCT_ACCENTS: Partial<Record<ProductKey, string>> = {
  health: "#0D9488",
  bookings: "#2563EB",
  golderp: "#B45309",
  karty: "#EA580C",
  finance: "#059669",
  lending: "#7C3AED",
  hr: "#115E59",
  ai: "#6366F1",
};
