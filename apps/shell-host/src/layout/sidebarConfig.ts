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
  UserCheck,
  Wrench,
  FileText,
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

export interface ProductSidebarBehavior {
  showLocationSwitcher?: boolean;
}

const sidebarIcon = (Icon: typeof Grid2X2) =>
  createElement(Icon, { size: 18, strokeWidth: 1.9 });

export const BASE_CRM_SIDEBAR_SECTIONS: SidebarSection[] = [
  { id: "basecrm-customers", label: "Customers", icon: "\u{1F464}", path: "/baseCRM/customers" },
  { id: "basecrm-users", label: "Users", icon: "\u{1F465}", path: "/baseCRM/users" },
  { id: "basecrm-drive", label: "Drive", icon: "\u{1F5C2}", path: "/baseCRM/drive" },
  {
    id: "basecrm-tasks",
    label: "Tasks",
    icon: "\u{1F4CB}",
    path: "/baseCRM/tasks",
    children: [
      { id: "basecrm-tasks-overview",   label: "Overview",   icon: "", path: "/baseCRM/tasks/overview" },
      { id: "basecrm-tasks-templates",  label: "Templates",  icon: "", path: "/baseCRM/tasks/templates" },
      { id: "basecrm-tasks-settings",   label: "Settings",   icon: "", path: "/baseCRM/tasks/settings" },
    ],
  },

  {
    id: "basecrm-membership",
    label: "Membership",
    icon: "\u{1F5C3}",
    path: "/baseCRM/membership",
    children: [
      { id: "basecrm-membership-overview", label: "Overview", icon: "", path: "/baseCRM/membership" },
      { id: "basecrm-membership-members", label: "Members", icon: "", path: "/baseCRM/membership/members" },
      { id: "basecrm-membership-services", label: "Services", icon: "", path: "/baseCRM/membership/services" },
      { id: "basecrm-membership-fee-management", label: "Fee Management", icon: "", path: "/baseCRM/membership/fee-management" },
      { id: "basecrm-membership-templates", label: "Templates", icon: "", path: "/baseCRM/membership/templates" },
    ],
  },
  {
    id: "basecrm-leads",
    label: "Leads",
    icon: "\u{1F3AF}",
    path: "/baseCRM/leads",
    children: [
      { id: "basecrm-leads-dashboard", label: "Dashboard", icon: "", path: "/baseCRM/leads/dashboard" },
      { id: "basecrm-leads-list", label: "Leads List", icon: "", path: "/baseCRM/leads/list" },
      { id: "basecrm-leads-pipelines", label: "Pipelines", icon: "", path: "/baseCRM/leads/pipelines" },
      { id: "basecrm-leads-products", label: "Products", icon: "", path: "/baseCRM/leads/products" },
      { id: "basecrm-leads-templates", label: "Templates", icon: "", path: "/baseCRM/leads/templates" },
      { id: "basecrm-leads-channels", label: "Channels", icon: "", path: "/baseCRM/leads/channels" },
      { id: "basecrm-leads-audit-log", label: "Audit Log", icon: "", path: "/baseCRM/leads/audit-log" },
    ],
  },
  { id: "basecrm-reports", label: "Reports", icon: "\u{1F4CA}", path: "/baseCRM/reports" },
  { id: "basecrm-audit-log", label: "Audit Log", icon: "\u{1F4DD}", path: "/baseCRM/audit-log" },
  {
    id: "basecrm-ivr",
    label: "IVR",
    icon: "\u{1F4DE}",
    path: "/baseCRM/ivr",
    children: [
      { id: "basecrm-ivr-overview", label: "Overview", icon: "", path: "/baseCRM/ivr" },
      { id: "basecrm-ivr-calllogs", label: "Call Logs", icon: "", path: "/baseCRM/ivr/calllogs" },
      { id: "basecrm-ivr-schedules", label: "Schedules", icon: "", path: "/baseCRM/ivr/schedules" },
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
        { id: "health-finance-vendors", label: "Vendors", icon: "", path: "/health/finance/vendors" },
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
    { id: "bookings-dashboard", label: "Dashboard", icon: sidebarIcon(Grid2X2), path: "/bookings/dashboard" },
    { id: "bookings-calendar", label: "Bookings", icon: sidebarIcon(Calendar), path: "/bookings" },
    { id: "bookings-calendars", label: "Calendars", icon: sidebarIcon(Calendar), path: "/bookings/calendars" },
    { id: "bookings-services", label: "Services", icon: sidebarIcon(Wrench), path: "/bookings/services" },
    { id: "bookings-customers", label: "Customers", icon: sidebarIcon(Users), path: "/bookings/customers" },
    { id: "bookings-staff", label: "Staff", icon: sidebarIcon(Users), path: "/bookings/staff" },
    { id: "bookings-holidays", label: "Holidays & Leave", icon: sidebarIcon(Calendar), path: "/bookings/holidays" },
    { id: "bookings-qr-links", label: "QR Links", icon: sidebarIcon(CreditCard), path: "/bookings/qr-links" },
    { id: "bookings-customer-labels", label: "Customer Labels", icon: sidebarIcon(UserSearch), path: "/bookings/customer-labels" },
    { id: "bookings-audit-log", label: "Audit Log", icon: sidebarIcon(FileText), path: "/bookings/audit-log" },
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
    { id: "karty-dashboard", label: "Dashboard", icon: "\u25A6", path: "/karty/orders/dashboard" },
    {
      id: "karty-orders",
      label: "Orders",
      icon: "\u{1F9FE}",
      path: "/karty/orders",
      children: [
        { id: "karty-orders-list", label: "All Orders", icon: "", path: "/karty/orders" },
        { id: "karty-order-requests", label: "Requests", icon: "", path: "/karty/orders/requests" },
        { id: "karty-sales-returns", label: "Sales Returns", icon: "", path: "/karty/orders/sales-returns" },
        { id: "karty-active-carts", label: "Active Carts", icon: "", path: "/karty/orders/active-carts" },
        { id: "karty-logistics", label: "Logistics", icon: "", path: "/karty/orders/logistics" },
        { id: "karty-delivery-profiles", label: "Delivery Profiles", icon: "", path: "/karty/orders/delivery-profiles" },
        { id: "karty-reviews", label: "Reviews", icon: "", path: "/karty/orders/reviews" },
      ],
    },
    {
      id: "karty-inventory",
      label: "Inventory",
      icon: "\u{1F4E6}",
      path: "/karty/inventory/dashboard",
      children: [
        { id: "karty-inventory-dashboard", label: "Dashboard", icon: "", path: "/karty/inventory/dashboard" },
        { id: "karty-inventory-catalogs", label: "Catalogs", icon: "", path: "/karty/inventory/inventory-catalogs" },
        { id: "karty-inventory-purchases", label: "Purchases", icon: "", path: "/karty/inventory/purchases" },
        { id: "karty-inventory-stocks", label: "Stock", icon: "", path: "/karty/inventory/stocks" },
        { id: "karty-inventory-transfers", label: "Transfers", icon: "", path: "/karty/inventory/transfers" },
        { id: "karty-inventory-adjustments", label: "Adjustments", icon: "", path: "/karty/inventory/adjustments" },
        { id: "karty-inventory-returns", label: "Purchase Returns", icon: "", path: "/karty/inventory/purchase-returns" },
        { id: "karty-inventory-racks", label: "Rack Management", icon: "", path: "/karty/inventory/racks" },
        { id: "karty-inventory-audit", label: "Audit Log", icon: "", path: "/karty/inventory/audit-log" },
      ],
    },
    {
      id: "karty-catalog",
      label: "Catalog",
      icon: "\u{1F3F7}",
      path: "/karty/items",
      children: [
        { id: "karty-items", label: "Items", icon: "", path: "/karty/items" },
        { id: "karty-price-lists", label: "Price Lists", icon: "", path: "/karty/price-lists" },
        { id: "karty-schemes", label: "Schemes", icon: "", path: "/karty/schemes" },
      ],
    },
    { id: "karty-stores", label: "Stores", icon: "\u{1F3EC}", path: "/karty/stores" },
    { id: "karty-vendors", label: "Vendors", icon: "\u{1F91D}", path: "/karty/inventory/vendors" },
    { id: "karty-customers", label: "Customers", icon: "\u{1F464}", path: "/karty/customers" },
    { id: "karty-users", label: "Users", icon: "\u{1F465}", path: "/karty/users" },
    {
      id: "karty-pharmacy",
      label: "Pharmacy",
      icon: "\u{1F48A}",
      path: "/karty/pharmacy/dispense",
      children: [
        { id: "karty-dispense", label: "Dispense", icon: "", path: "/karty/pharmacy/dispense" },
        { id: "karty-drug-register", label: "Drug Register", icon: "", path: "/karty/pharmacy/drug-register" },
        { id: "karty-compositions", label: "Compositions", icon: "", path: "/karty/pharmacy/compositions" },
        { id: "karty-pharmacy-production", label: "Production", icon: "", path: "/karty/pharmacy/production" },
        { id: "karty-pharmacy-expiry", label: "Expiry Claims", icon: "", path: "/karty/pharmacy/expiry-claims" },
        { id: "karty-reorder-alerts", label: "Reorder Alerts", icon: "", path: "/karty/pharmacy/reorder-alerts" },
      ],
    },
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
    { id: "karty-partners", label: "Partners", icon: "\u{1F91D}", path: "/karty/partners" },
    { id: "karty-connections", label: "Connections", icon: "\u{1F50C}", path: "/karty/connections" },
    { id: "karty-settings", label: "Settings", icon: "\u2699", path: "/karty/settings" },
  ],
  finance: [
    { id: "finance-overview", label: "Overview", icon: "\u25A6", path: "/finance" },
    { id: "finance-receivables", label: "Revenue", icon: "\u{1F4B5}", path: "/finance/receivables" },
    { id: "finance-payouts", label: "Payouts", icon: "\u{1F4B8}", path: "/finance/payable" },
    { id: "finance-expense", label: "Expenses", icon: "\u{1F4B3}", path: "/finance/expense" },
    { id: "finance-customers", label: "Finance Consumers", icon: "\u{1F465}", path: "/finance/customers" },
    { id: "finance-vendors", label: "Vendors", icon: "\u{1F91D}", path: "/finance/vendors" },
    { id: "finance-invoices", label: "Invoices", icon: "\u{1F9FE}", path: "/finance/invoice" },
    { id: "finance-discount", label: "Discounts", icon: "\u{1F4B8}", path: "/finance/discount" },
    { id: "finance-coupons", label: "Coupons", icon: "\u{1F3F7}", path: "/finance/coupons" },
    { id: "finance-items", label: "Items", icon: "\u{1F4E6}", path: "/finance/items" },
    { id: "finance-cash-in-hand", label: "Cash In Hand", icon: "\u{1F4B0}", path: "/finance/cashInhand" },
    { id: "finance-cash-register", label: "Cash Register", icon: "\u{1F4B0}", path: "/finance/cashRegister" },
    { id: "finance-activity-log", label: "Activity Log", icon: "\u{1F4DD}", path: "/finance/activity-log" },
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
    { id: "hr-organization", label: "Organization", icon: "\u{1F3E2}", path: "/hr/org" },
    { id: "hr-recruitment", label: "Recruitment", icon: sidebarIcon(UserSearch), path: "/hr/recruitment" },
    { id: "hr-attendance", label: "Attendance", icon: sidebarIcon(Calendar), path: "/hr/attendance" },
    { id: "hr-leave", label: "Leave", icon: sidebarIcon(Calendar), path: "/hr/leave" },
    { id: "hr-separation", label: "Separation", icon: "\u{1F6AA}", path: "/hr/separation" },
    { id: "hr-assets", label: "Assets", icon: "\u{1F4BB}", path: "/hr/assets" },
    { id: "hr-payroll", label: "Payroll", icon: sidebarIcon(CreditCard), path: "/hr/payroll" },
    { id: "hr-expenses", label: "Expenses", icon: sidebarIcon(DollarSign), path: "/hr/expenses" },
    { id: "hr-staffspace", label: "StaffSpace", icon: sidebarIcon(Megaphone), path: "/hr/announcements" },
    { id: "hr-enforcement", label: "Warning Memos", icon: sidebarIcon(FileText), path: "/hr/enforcement" },
    { id: "hr-helpdesk", label: "Helpdesk", icon: sidebarIcon(HelpCircle), path: "/hr/tickets" },
    { id: "hr-audit-logs", label: "Audit Log", icon: "\u{1F4DD}", path: "/hr/audit-logs" },
    // Keep routes/pages in place; hide these admin links for now.
    // { id: "hr-grievances", label: "Grievances", icon: "\u{1F512}", path: "/hr/grievances" },
    // { id: "hr-posh", label: "POSH", icon: "\u{1F6E1}", path: "/hr/posh" },
    { id: "hr-reports", label: "Reports", icon: sidebarIcon(BarChart3), path: "/hr/reports" },
    { id: "hr-users", label: "Users", icon: sidebarIcon(UserCheck), path: "/hr/users" },
    { id: "hr-settings", label: "Settings", icon: sidebarIcon(Settings), path: "/hr/settings" },
  ],
  ai: [
    { id: "ai-overview", label: "Overview", icon: "\u25A6", path: "/ai" },
    { id: "ai-assistants", label: "Assistants", icon: "\u2728", path: "/ai/assistants" },
    { id: "ai-automation", label: "Automation", icon: "\u2699", path: "/ai/automation" },
    { id: "ai-insights", label: "Insights", icon: "\u{1F4A1}", path: "/ai/insights" },
  ],
};

export const PRODUCT_SIDEBAR_BEHAVIOR: Partial<Record<ProductKey, ProductSidebarBehavior>> = {
  hr: {
    showLocationSwitcher: false,
  },
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
