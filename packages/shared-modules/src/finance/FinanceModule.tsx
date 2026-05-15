import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { FinanceActivityLogList } from "./components/FinanceActivityLogList";
import { FinanceInvoiceCreate } from "./components/FinanceInvoiceCreate";
import { FinanceInvoicesList } from "./components/FinanceInvoicesList";
import { FinanceExpensesList } from "./components/FinanceExpensesList";
import { FinanceOverview } from "./components/FinanceOverview";
import { FinancePaymentsList } from "./components/FinancePaymentsList";
import { FinanceReceivablesList } from "./components/FinanceReceivablesList";
import { FinanceReportsList } from "./components/FinanceReportsList";
import { FinanceSettings } from "./components/FinanceSettings";
import { FinanceMoneyCreate } from "./components/FinanceMoneyCreate";
import { FinanceVendorCreate } from "./components/FinanceVendorCreate";
import { FinanceVendorsList } from "./components/FinanceVendorsList";

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

  if (view === "invoice" && routeParams?.subview === "newInvoice") {
    return <FinanceInvoiceCreate />;
  }

  if ((view === "expense" || view === "expenses") && routeParams?.subview === "new") {
    return <FinanceMoneyCreate kind="expense" />;
  }

  if (view === "expense" || view === "expenses") {
    return <FinanceExpensesList />;
  }

  if ((view === "receivables" || view === "revenue") && routeParams?.subview === "create") {
    return <FinanceMoneyCreate kind="revenue" />;
  }

  if (view === "receivables" || view === "revenue") {
    return <FinanceReceivablesList />;
  }

  if ((view === "payout" || view === "payable") && routeParams?.subview === "create") {
    return <FinanceMoneyCreate kind="payout" />;
  }

  if (view === "payments") {
    return <FinancePaymentsList />;
  }

  if (view === "vendors" && routeParams?.subview === "create") {
    return <FinanceVendorCreate />;
  }

  if (view === "vendors") {
    return <FinanceVendorsList />;
  }

  if (view === "reports") {
    return <FinanceReportsList />;
  }

  if (view === "activity-log" || view === "activityLog") {
    return <FinanceActivityLogList />;
  }

  if (view === "settings") {
    return <FinanceSettings />;
  }

  return <FinanceOverview />;
}
