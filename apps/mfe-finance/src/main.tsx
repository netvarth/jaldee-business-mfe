import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";

const mockProps: MFEProps = {
  mfeName: "mfe-finance",
  basePath: "",
  assetsBaseUrl: "",
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={mockProps}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>
);
