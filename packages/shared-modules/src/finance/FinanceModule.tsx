import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { FinanceInvoicesList } from "./components/FinanceInvoicesList";
import { FinanceOverview } from "./components/FinanceOverview";
import { FinancePaymentsList } from "./components/FinancePaymentsList";
import { FinanceReportsList } from "./components/FinanceReportsList";
import { FinanceSettings } from "./components/FinanceSettings";

export function FinanceModule() {
  const access = useModuleAccess("finance");
  const { routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Finance unavailable"
          description={
            access.reason === "module-disabled"
              ? "This account does not currently have access to the Finance module."
              : access.reason === "location-required"
                ? "Select a location to work with location-scoped finance data."
                : "The finance module cannot be opened in the current scope."
          }
        />
      </SectionCard>
    );
  }

  if (view === "invoices") {
    return <FinanceInvoicesList />;
  }

  if (view === "payments") {
    return <FinancePaymentsList />;
  }

  if (view === "reports") {
    return <FinanceReportsList />;
  }

  if (view === "settings") {
    return <FinanceSettings />;
  }

  return <FinanceOverview />;
}
