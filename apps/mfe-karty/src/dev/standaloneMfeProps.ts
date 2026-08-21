import { createBrowserHistory } from "@remix-run/router";
import { normalizeAccountContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";

/**
 * Mock MFEProps for the STANDALONE preview (`main.tsx`, served by `vite preview` on :3005).
 *
 * The production shell mounts Karty via `mount.tsx`, which supplies a real
 * `MFEPropsContext.Provider`. When Karty runs standalone there is no shell, so every
 * component that calls `useMFEProps()` (all the API hooks) would throw
 * "useMFEProps must be used inside an MFE mounted by the shell".
 *
 * This provides a self-contained props object so the standalone preview — and the
 * hermetic Playwright suite in `automation/e2e/specs/karty`, which runs against that
 * preview with the backend fully mocked — can mount every screen. It is dev/preview
 * only and never ships in a shell-hosted build.
 */
export function createStandaloneMfeProps(): MFEProps {
  return {
    mfeName: "mfe_karty",
    basePath: "/",
    // Any non-empty token; the mocked backend does not validate it, and the API hooks
    // only need a truthy value to attach the Authorization header.
    authToken: "standalone-preview-token",
    user: {
      id: "standalone-user",
      name: "Preview User",
      email: "preview@jaldee.local",
      roles: [{ id: "owner", name: "Owner", tier: "owner" }],
      permissions: ["*"],
    },
    account: normalizeAccountContext({
      id: "standalone-account",
      tenantUid: "standalone-tenant",
      name: "Preview Tenant",
      licensedProducts: ["karty", "finance"],
      enabledModules: ["customers", "leads", "users", "finance", "reports", "settings"],
      theme: {
        primaryColor: "#0F766E",
        logoUrl: "",
      },
      plan: "growth",
      domain: "retail",
      labels: {
        customer: "Customer",
        staff: "Staff",
        service: "Product",
        appointment: "Appointment",
        order: "Order",
        lead: "Lead",
      },
    }),
    theme: { primaryColor: "#0F766E" },
    locale: "en-IN",
    location: { id: "standalone-location", name: "Preview Store", code: "PRV" },
    navigate: (route: string) => {
      window.history.pushState({}, "", route);
    },
    history: createBrowserHistory(),
    eventBus: {
      emit: () => {},
      on: () => () => {},
    },
    onError: (error) => console.error("[mfe_karty:standalone] MFE Error:", error),
    api: undefined,
    telemetry: {
      captureError: (error) => console.error("[telemetry]", error),
      trackEvent: (name, props) => console.debug("[telemetry]", name, props),
      trackPageView: (path) => console.debug("[telemetry:pageview]", path),
    },
  };
}
