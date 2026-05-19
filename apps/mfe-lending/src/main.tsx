import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";
import { ensureApiClientInitialized } from "./lib/apiClient";
import { setShellHttpBridge } from "./lib/httpClient";

const mockProps: MFEProps = {
  mfeName: "mfe-lending",
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
    licensedProducts: ["lending"],
    enabledModules: ["users", "reports", "settings"],
    theme: {
      primaryColor: "#7C3AED",
      logoUrl: "",
    },
    plan: "growth",
    domain: "finance",
    labels: {
      customer: "Client",
      staff: "Officer",
      service: "Product",
      appointment: "Meeting",
      order: "Order",
      lead: "Lead",
    },
  },
  theme: { primaryColor: "#7C3AED" },
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
    console.error("[mfe-lending]", error);
  },
  telemetry: {
    captureError: (error) => console.error("[telemetry]", error),
    trackEvent: (name, props) => console.debug("[telemetry]", name, props),
    trackPageView: (path) => console.debug("[telemetry:pageview]", path),
  },
};

ensureApiClientInitialized(mockProps.mfeName, mockProps.authToken);
setShellHttpBridge(mockProps.api ?? null);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={mockProps}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>,
);
