import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { MFEProps } from "@jaldee/auth-context";
import { eventBus } from "../eventBus/eventBus";
import { useShellStore } from "../store/shellStore";
import { telemetryService } from "../services/telemetry";
import { MFELoader } from "../routing/MFELoader";

export function loadHrPublicRemote() {
  if (import.meta.env.DEV) {
    const hrUrl = import.meta.env.VITE_HR_URL ?? "http://localhost:3007";
    return import(/* @vite-ignore */ `${hrUrl}/src/publicMount.tsx`);
  }

  return import("mfe_hr/publicMount");
}

export function PublicCareersMFE() {
  const navigate = useNavigate();
  const accountName = useShellStore((state) => state.account?.name);

  const props = useMemo<MFEProps>(
    () => ({
      mfeName: "mfe-hr-public",
      basePath: "/careers",
      assetsBaseUrl: import.meta.env.VITE_ASSETS_URL?.trim(),
      authToken: "",
      user: {
        id: "public-user",
        name: "Public User",
        email: "public@jaldee.local",
        roles: [],
        permissions: [],
      },
      account: {
        id: "public-account",
        name: accountName || "Careers",
        licensedProducts: ["hr"],
        enabledModules: [],
        theme: { primaryColor: "#5B21D1", logoUrl: "" },
        plan: "starter",
        domain: "corporate",
        labels: {
          customer: "Candidate",
          staff: "Staff",
          service: "Service",
          appointment: "Appointment",
          order: "Order",
          lead: "Lead",
        },
      },
      theme: { primaryColor: "#5B21D1" },
      locale: "en-IN",
      location: { id: "public", name: "Public", code: "PUBLIC" },
      navigate,
      eventBus,
      onError: (error) => {
        telemetryService.captureError(new Error(error.message), {
          mfe: error.mfe,
          code: error.code,
          severity: error.severity,
          ...error.context,
        });
      },
      telemetry: telemetryService,
    }),
    [accountName, navigate]
  );

  return <MFELoader remote={loadHrPublicRemote} props={props} />;
}
