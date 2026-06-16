import type { MFEProps } from "@jaldee/auth-context";

/** Minimal MFEProps for running this MFE standalone (npm run dev on :3008). */
export const mockMFEProps: MFEProps = {
  mfeName: "mfe-hr",
  basePath: "/",
  authToken: "",
  user: {
    id: "dev-user",
    name: "Dev User",
    email: "dev@jaldee.com",
    roles: [{ id: "r-owner", name: "Owner", tier: "owner" }],
    permissions: [],
  },
  account: {
    id: "dev-account",
    name: "Dev Company",
    licensedProducts: [],
    enabledModules: [],
    theme: { primaryColor: "#0369A1", logoUrl: "" },
    plan: "starter",
    domain: "services",
    labels: {
      customer: "Customer",
      staff: "Employee",
      service: "Service",
      appointment: "Appointment",
      order: "Order",
      lead: "Lead",
    },
  },
  theme: { primaryColor: "#0369A1" },
  locale: "en-IN",
  location: { id: "loc-1", name: "Head Office", code: "HO" },
  navigate: (route) => console.log("[dev navigate]", route),
  eventBus: { emit: () => {}, on: () => () => {} },
  onError: (e) => console.error("[dev MFE error]", e),
  api: {
    get: async () => ({ data: [] as never }),
    post: async () => ({ data: {} as never }),
    put: async () => ({ data: {} as never }),
    patch: async () => ({ data: {} as never }),
    delete: async () => ({ data: {} as never }),
  },
  telemetry: {
    captureError: (e) => console.error("[dev telemetry]", e),
    trackEvent: () => {},
    trackPageView: () => {},
  },
};
