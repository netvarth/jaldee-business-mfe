import type { MFEProps } from "@jaldee/auth-context";

/** Minimal MFEProps for running this MFE standalone in local development mode. */
export const mockMFEProps: MFEProps = {
  mfeName: "mfe-finance",
  basePath: "/",
  authToken: "",
  user: {
    id: "local-user",
    name: "Local User",
    email: "local@jaldee.com",
    roles: [{ id: "owner", name: "Admin", tier: "owner" }],
    permissions: [],
  },
  account: {
    id: "local-account",
    name: "Jaldee Business",
    licensedProducts: ["finance"],
    enabledModules: ["finance", "reports", "settings"],
    theme: {
      primaryColor: "#059669",
      logoUrl: "",
    },
    plan: "growth",
    domain: "finance",
    labels: {
      customer: "Customer",
      staff: "Staff",
      service: "Service",
      appointment: "Appointment",
      order: "Order",
      lead: "Lead",
    },
  },
  theme: { primaryColor: "#059669" },
  locale: "en-IN",
  location: {
    id: "local-location",
    name: "Head Office",
    code: "HO",
  },
  navigate: (route: string) => {
    window.history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
  eventBus: {
    emit: () => undefined,
    on: () => () => undefined,
  },
  onError: (error) => {
    console.error("[mfe-finance]", error);
  },
  telemetry: {
    captureError: (error) => console.error("[telemetry]", error),
    trackEvent: (name, props) => console.debug("[telemetry]", name, props),
    trackPageView: (path) => console.debug("[telemetry:pageview]", path),
  },
};
