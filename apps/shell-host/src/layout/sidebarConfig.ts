import type { ProductKey } from "../store/shellStore";

export interface SidebarItem {
  id:        string;
  label:     string;
  icon:      string;
  path:      string;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id:        string;
  label:     string;
  icon:      string;
  path:      string;
  children?: SidebarItem[];
}

export const SIDEBAR_CONFIG: Partial<Record<ProductKey, SidebarSection[]>> = {

  health: [
    { id: "health-overview",  label: "Overview",  icon: "▦", path: "/health" },
    {
      id: "health-op", label: "Outpatient", icon: "🩺", path: "/health/op",
      children: [
        { id: "health-op-consultations",  label: "Consultations",  icon: "•", path: "/health/op/consultations"  },
        { id: "health-op-queue",          label: "Queue",          icon: "•", path: "/health/op/queue"          },
        { id: "health-op-prescriptions",  label: "Prescriptions",  icon: "•", path: "/health/op/prescriptions"  },
        { id: "health-op-clinical-notes", label: "Clinical Notes", icon: "•", path: "/health/op/clinical-notes" },
      ],
    },
    {
      id: "health-ip", label: "Inpatient", icon: "🏥", path: "/health/ip",
      children: [
        { id: "health-ip-admissions",     label: "Admissions",     icon: "•", path: "/health/ip/admissions"     },
        { id: "health-ip-bed-management", label: "Bed Management", icon: "•", path: "/health/ip/bed-management" },
        { id: "health-ip-ward-view",      label: "Ward View",      icon: "•", path: "/health/ip/ward-view"      },
        { id: "health-ip-discharges",     label: "Discharges",     icon: "•", path: "/health/ip/discharges"     },
      ],
    },
    {
      id: "health-medical-records", label: "Medical Records", icon: "📋", path: "/health/medical-records",
      children: [
        { id: "health-mr-emr",         label: "EMR Records",  icon: "•", path: "/health/medical-records"               },
        { id: "health-mr-lab-orders",  label: "Lab Orders",   icon: "•", path: "/health/medical-records/lab-orders"    },
        { id: "health-mr-lab-results", label: "Lab Results",  icon: "•", path: "/health/medical-records/lab-results"   },
        { id: "health-mr-vitals",      label: "Vitals",       icon: "•", path: "/health/medical-records/vitals"        },
      ],
    },
    { id: "health-pharmacy",   label: "Pharmacy",      icon: "💊", path: "/health/pharmacy"      },
    { id: "health-triage",     label: "Triage",        icon: "🚨", path: "/health/triage"        },
    { id: "health-consent",    label: "Consent Forms", icon: "📝", path: "/health/consent-forms" },
    { id: "health-referrals",  label: "Referrals",     icon: "↗",  path: "/health/referrals"     },
    { id: "health-ot",         label: "Surgery / OT",  icon: "🔬", path: "/health/ot"            },
    { id: "health-customers",  label: "Patients",      icon: "👤", path: "/health/customers"     },
    { id: "health-users",      label: "Users",         icon: "👥", path: "/health/users"         },
    { id: "health-finance",    label: "Finance",       icon: "💰", path: "/health/finance"       },
    { id: "health-reports",    label: "Reports",       icon: "📊", path: "/health/reports"       },
    { id: "health-drive",      label: "Drive",         icon: "📁", path: "/health/drive"         },
    { id: "health-tasks",      label: "Tasks",         icon: "✓",  path: "/health/tasks"         },
    { id: "health-audit-log",  label: "Audit Log",     icon: "🔒", path: "/health/audit-log"     },
    { id: "health-settings",   label: "Settings",      icon: "⚙️", path: "/health/settings"      },
  ],

  bookings: [
    { id: "bookings-overview",     label: "Overview",     icon: "▦",  path: "/bookings"                },
    { id: "bookings-appointments", label: "Appointments", icon: "📅", path: "/bookings/appointments"   },
    { id: "bookings-requests",     label: "Requests",     icon: "📨", path: "/bookings/requests"        },
    { id: "bookings-tokens",       label: "Tokens",       icon: "🎫", path: "/bookings/tokens"          },
    { id: "bookings-queue",        label: "Queue",        icon: "⏳", path: "/bookings/queue"           },
    { id: "bookings-calendar",     label: "Calendar",     icon: "🗓", path: "/bookings/calendar"        },
    { id: "bookings-services",     label: "Services",     icon: "🔧", path: "/bookings/services"        },
    { id: "bookings-resources",    label: "Resources",    icon: "👤", path: "/bookings/resources"       },
    { id: "bookings-online-page",  label: "Online Page",  icon: "🌐", path: "/bookings/online-page"     },
    { id: "bookings-customers",    label: "Customers",    icon: "👤", path: "/bookings/customers"       },
    { id: "bookings-users",        label: "Users",        icon: "👥", path: "/bookings/users"           },
    { id: "bookings-reports",      label: "Reports",      icon: "📊", path: "/bookings/reports"         },
    { id: "bookings-audit-log",    label: "Audit Log",    icon: "🔒", path: "/bookings/audit-log"       },
    { id: "bookings-settings",     label: "Settings",     icon: "⚙️", path: "/bookings/settings"        },
  ],

  karty: [
    { id: "karty-overview", label: "Overview", icon: "▦", path: "/karty" },
    {
      id: "karty-orders", label: "Orders", icon: "📦", path: "/karty/orders",
      children: [
        { id: "karty-orders-all",       label: "All Orders", icon: "•", path: "/karty/orders"           },
        { id: "karty-orders-pending",   label: "Pending",    icon: "•", path: "/karty/orders/pending"   },
        { id: "karty-orders-completed", label: "Completed",  icon: "•", path: "/karty/orders/completed" },
        { id: "karty-orders-returns",   label: "Returns",    icon: "•", path: "/karty/orders/returns"   },
      ],
    },
    {
      id: "karty-inventory", label: "Inventory", icon: "🏪", path: "/karty/inventory",
      children: [
        { id: "karty-inv-stock",   label: "Stock Overview",   icon: "•", path: "/karty/inventory/stock"           },
        { id: "karty-inv-po",      label: "Purchase Orders",  icon: "•", path: "/karty/suppliers/purchase-orders" },
        { id: "karty-inv-adjust",  label: "Stock Adjustment", icon: "•", path: "/karty/inventory/stock/adjust"    },
        { id: "karty-inv-vendors", label: "Vendors",          icon: "•", path: "/karty/suppliers"                 },
      ],
    },
    { id: "karty-catalog",    label: "Items/Products", icon: "🏷", path: "/karty/catalog"    },
    { id: "karty-stores",     label: "Stores",         icon: "🏬", path: "/karty/stores"     },
    { id: "karty-customers",  label: "Customers",      icon: "👤", path: "/karty/customers"  },
    { id: "karty-users",      label: "Users",          icon: "👥", path: "/karty/users"      },
    { id: "karty-finance",    label: "Finance",        icon: "💰", path: "/karty/finance"    },
    { id: "karty-reports",    label: "Reports",        icon: "📊", path: "/karty/reports"    },
    { id: "karty-drive",      label: "Drive",          icon: "📁", path: "/karty/drive"      },
    { id: "karty-tasks",      label: "Tasks",          icon: "✓",  path: "/karty/tasks"      },
    { id: "karty-membership", label: "Membership",     icon: "⭐", path: "/karty/membership" },
    { id: "karty-leads",      label: "Leads",          icon: "📣", path: "/karty/leads"      },
    { id: "karty-audit-log",  label: "Audit Log",      icon: "🔒", path: "/karty/audit-log"  },
    { id: "karty-settings",   label: "Settings",       icon: "⚙️", path: "/karty/settings"   },
  ],

  finance: [
    { id: "finance-overview",     label: "Overview",     icon: "▦",  path: "/finance"               },
    { id: "finance-estimates",    label: "Estimates",    icon: "📄", path: "/finance/estimates"      },
    { id: "finance-transactions", label: "Transactions", icon: "↔",  path: "/finance/transactions"   },
    { id: "finance-invoices",     label: "Invoices",     icon: "🧾", path: "/finance/invoices"       },
    { id: "finance-payments",     label: "Payments",     icon: "💳", path: "/finance/payments"       },
    { id: "finance-accounting",   label: "Accounting",   icon: "📒", path: "/finance/accounting"     },
    { id: "finance-donations",    label: "Donations",    icon: "❤",  path: "/finance/donations"      },
    { id: "finance-customers",    label: "Customers",    icon: "👤", path: "/finance/customers"      },
    { id: "finance-users",        label: "Users",        icon: "👥", path: "/finance/users"          },
    { id: "finance-reports",      label: "Reports",      icon: "📊", path: "/finance/reports"        },
    { id: "finance-audit-log",    label: "Audit Log",    icon: "🔒", path: "/finance/audit-log"      },
    { id: "finance-settings",     label: "Settings",     icon: "⚙️", path: "/finance/settings"       },
  ],

  lending: [
    { id: "lending-overview",     label: "Overview",     icon: "▦",  path: "/lending"                },
    { id: "lending-applications", label: "Applications", icon: "📋", path: "/lending/applications"   },
    { id: "lending-repayments",   label: "Repayments",   icon: "💸", path: "/lending/repayments"     },
    { id: "lending-penalties",    label: "Penalties",    icon: "⚠",  path: "/lending/penalties"      },
    { id: "lending-customers",    label: "Customers",    icon: "👤", path: "/lending/customers"      },
    { id: "lending-users",        label: "Users",        icon: "👥", path: "/lending/users"          },
    { id: "lending-reports",      label: "Reports",      icon: "📊", path: "/lending/reports"        },
    { id: "lending-audit-log",    label: "Audit Log",    icon: "🔒", path: "/lending/audit-log"      },
    { id: "lending-settings",     label: "Settings",     icon: "⚙️", path: "/lending/settings"       },
  ],

  hr: [
    { id: "hr-overview",     label: "Overview",    icon: "▦",  path: "/hr"              },
    { id: "hr-employees",    label: "Employees",   icon: "👤", path: "/hr/employees"    },
    { id: "hr-payroll",      label: "Payroll",     icon: "💰", path: "/hr/payroll"      },
    { id: "hr-attendance",   label: "Attendance",  icon: "📅", path: "/hr/attendance"   },
    { id: "hr-leaves",       label: "Leaves",      icon: "🌴", path: "/hr/leaves"       },
    { id: "hr-performance",  label: "Performance", icon: "⭐", path: "/hr/performance"  },
    { id: "hr-recruitment",  label: "Recruitment", icon: "🎯", path: "/hr/recruitment"  },
    { id: "hr-departments",  label: "Departments", icon: "🏢", path: "/hr/departments"  },
    { id: "hr-expenses",     label: "Expenses",    icon: "🧾", path: "/hr/expenses"     },
    { id: "hr-training",     label: "Training",    icon: "📚", path: "/hr/training"     },
    { id: "hr-assets",       label: "Assets",      icon: "💻", path: "/hr/assets"       },
    { id: "hr-policies",     label: "Policies",    icon: "📜", path: "/hr/policies"     },
    { id: "hr-self-service", label: "Self Service",icon: "👤", path: "/hr/self-service" },
    { id: "hr-users",        label: "Users",       icon: "👥", path: "/hr/users"        },
    { id: "hr-reports",      label: "Reports",     icon: "📊", path: "/hr/reports"      },
    { id: "hr-audit-log",    label: "Audit Log",   icon: "🔒", path: "/hr/audit-log"    },
    { id: "hr-settings",     label: "Settings",    icon: "⚙️", path: "/hr/settings"     },
  ],
};

export const PRODUCT_ACCENTS: Partial<Record<ProductKey, string>> = {
  health:   "#0D9488",
  bookings: "#2563EB",
  karty:    "#EA580C",
  finance:  "#059669",
  lending:  "#7C3AED",
  hr:       "#0369A1",
  ai:       "#6366F1",
};