import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useModuleAccess } from "../useModuleAccess";
import { IpAdmissionsList } from "./components/IpAdmissionsList";
import { IpBedsList } from "./components/IpBedsList";
import { IpBillingList } from "./components/IpBillingList";
import { IpOverview } from "./components/IpOverview";
import { IpPatientsList } from "./components/IpPatientsList";
import { IpSettings } from "./components/IpSettings";

export function IpModule() {
  const access = useModuleAccess("ip");
  const { routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Inpatient unavailable"
          description={
            access.reason === "module-disabled"
              ? "This account does not currently have access to the Inpatient module."
              : access.reason === "location-required"
                ? "Select a location to work with location-scoped inpatient data."
                : "The inpatient module cannot be opened in the current scope."
          }
        />
      </SectionCard>
    );
  }

  if (view === "patients") {
    return <IpPatientsList />;
  }

  if (view === "admissions") {
    return <IpAdmissionsList />;
  }

  if (view === "beds") {
    return <IpBedsList />;
  }

  if (view === "billing") {
    return <IpBillingList />;
  }

  if (view === "settings") {
    return <IpSettings />;
  }

  return <IpOverview />;
}
