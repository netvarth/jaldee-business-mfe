import type { MFEProps } from "@jaldee/auth-context";

/** Minimal MFEProps for running this MFE standalone (npm run dev on :3007). */
export const mockMFEProps: MFEProps = {
  mfeName: "mfe-bookings",
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
    name: "Dev Clinic",
    licensedProducts: [],
    enabledModules: [],
    theme: { primaryColor: "#048C84", logoUrl: "" },
    plan: "starter",
    domain: "healthcare",
    labels: {
      customer: "Patient",
      staff: "Doctor",
      service: "Service",
      appointment: "Appointment",
      order: "Order",
      lead: "Lead",
    },
  },
  theme: { primaryColor: "#048C84" },
  locale: "en-IN",
  location: { id: "loc-1", name: "Main Branch", code: "MB" },
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
