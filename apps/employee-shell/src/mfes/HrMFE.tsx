import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@jaldee/api-client";
import { normalizeAccountContext, type AccountContext, type MFEProps, type UserContext } from "@jaldee/auth-context";
import { useAppStore } from "../store/appStore";
import { telemetryService } from "../services/telemetry";
import MFELoader from "./MFELoader";

const eventBus = {
  emit(event: string, payload?: unknown) {
    window.dispatchEvent(new CustomEvent(event, { detail: payload }));
  },
  on(event: string, handler: (payload: unknown) => void) {
    const listener = (customEvent: Event) => handler((customEvent as CustomEvent).detail);
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  },
};

function loadHrRemote() {
  const hrUrl = import.meta.env.VITE_HR_URL?.trim() || "http://localhost:4008";
  return import(/* @vite-ignore */ `${hrUrl}/src/mount.tsx`);
}

export default function HrMFE() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);
  const accessToken = useAppStore((state) => state.accessToken);

  const props = useMemo<MFEProps | null>(() => {
    if (!user || !workspace) return null;

    const mfeUser: UserContext = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.length
        ? user.roles.map((role, index) => ({ id: `role-${index}`, name: role, tier: "custom" as const }))
        : [{ id: "role-employee", name: "Employee", tier: "custom" as const }],
      permissions: user.permissions,
    };

    const account = normalizeAccountContext({
      id: workspace.id,
      name: workspace.name,
      licensedProducts: ["hr"],
      enabledModules: ["users", "reports"],
      theme: {
        primaryColor: workspace.themeColor || "#2e6f67",
        logoUrl: "",
      },
      plan: "growth",
      domain: "corporate",
      labels: {
        customer: "Employee",
        staff: "Staff",
        service: "Service",
        appointment: "Appointment",
        order: "Order",
        lead: "Lead",
      },
    } satisfies AccountContext);

    return {
      mfeName: "mfe-hr",
      basePath: "/hr",
      authToken: accessToken,
      user: mfeUser,
      account,
      theme: { primaryColor: account.theme.primaryColor },
      locale: "en-IN",
      location: {
        id: workspace.id,
        name: workspace.name,
        code: workspace.id,
      },
      navigate: (route: string) => {
        const nextRoute = route.startsWith("/hr")
          ? route
          : `/hr${route.startsWith("/") ? route : `/${route}`}`;
        navigate(nextRoute);
      },
      eventBus,
      api: {
        get: (url, config) => apiClient.get(url, config),
        post: (url, data, config) => apiClient.post(url, data, config),
        put: (url, data, config) => apiClient.put(url, data, config),
        patch: (url, data, config) => apiClient.patch(url, data, config),
        delete: (url, config) => apiClient.delete(url, config),
      },
      onError: (error) => {
        telemetryService.captureError(new Error(error.message), {
          mfe: error.mfe,
          code: error.code,
          severity: error.severity,
          ...error.context,
        });
      },
      telemetry: telemetryService,
    };
  }, [accessToken, navigate, user, workspace]);

  if (!props) {
    return <div className="p-6 text-sm text-slate-500">Initialising HR...</div>;
  }

  return <MFELoader remote={loadHrRemote} props={props} />;
}
