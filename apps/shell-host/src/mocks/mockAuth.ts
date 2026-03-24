import type { UserContext, AccountContext, BranchLocation } from "@jaldee/auth-context";

export const mockToken = "mock-jwt-token-for-development";

export const mockUser: UserContext = {
  id:    "user-001",
  name:  "Manikandan E V",
  email: "manikandan.velayudhan@jaldee.com",
  roles: [{ id: "r-001", name: "Admin", tier: "owner" }],
  permissions: [
    "health.patients.read",
    "health.patients.write",
    "health.op.consultations.read",
    "health.op.consultations.write",
    "health.op.prescriptions.write",
    "health.ip.admissions.read",
    "health.ip.admissions.write",
    "health.medical-records.read",
    "bookings.appointments.read",
    "bookings.appointments.write",
    "bookings.queue.manage",
    "karty.orders.read",
    "karty.orders.write",
    "karty.inventory.read",
    "finance.invoices.read",
    "finance.invoices.write",
    "finance.payments.read",
    "lending.applications.read",
    "lending.applications.write",
    "hr.employees.read",
    "hr.employees.write",
    "hr.payroll.read",
    "global.customers.read",
    "global.settings.manage",
    "audit-log.read",
  ],
};

export const mockAccount: AccountContext = {
  id:   "acc-001",
  name: "Jaldee Business Solutions",
  licensedProducts: ["health", "bookings", "karty", "finance", "lending", "hr"],
  enabledModules:   [
    "customers", "leads", "tasks", "users",
    "finance", "analytics", "reports", "drive",
    "membership", "audit-log", "settings",
  ],
  theme: {
    primaryColor: "#5B21D1",
    logoUrl:      "",
  },
  plan:   "growth",
  domain: "healthcare",
  labels: {
    customer:    "Patient",
    staff:       "Doctor",
    service:     "Treatment",
    appointment: "Appointment",
    order:       "Supply",
    lead:        "Referral",
  },
};

export const mockLocations: BranchLocation[] = [
  { id: "loc-001", name: "Thrissur", code: "THR" },
  { id: "loc-002", name: "Kochi",    code: "KCH" },
  { id: "loc-003", name: "Calicut",  code: "CLT" },
];

// Simulate an API login call
export async function mockLogin(
  email: string,
  password: string
): Promise<{ user: UserContext; account: AccountContext; token: string; locations: BranchLocation[] }> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  return {
    user:      mockUser,
    account:   mockAccount,
    token:     mockToken,
    locations: mockLocations,
  };
}

