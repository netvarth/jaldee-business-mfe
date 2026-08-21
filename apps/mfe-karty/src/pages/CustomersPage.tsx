import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { CustomersList, SharedModulesProvider } from "@jaldee/shared-modules";

/**
 * Karty customers list — the shared CRM list, the same one mfe-health and mfe-lending
 * mount. A Karty customer *is* a base-crm consumer: the copy commerce keeps locally
 * (consumer_snapshot_tbl) is denormalized from it, and it is that consumer a sales order
 * is filed against.
 *
 * Mounts `CustomersList` rather than the whole `CustomersModule` on purpose. The module
 * swaps to its own generic detail view in local state, without changing the URL — which
 * would both bypass Karty's commerce-aware customer record and leave the record
 * unlinkable. Selecting a row navigates instead, so `/karty/customers/:uid` is a real,
 * shareable route handled by CustomerDetailPage.
 */
export default function CustomersPage() {
  const mfeProps = useContext(MFEPropsContext);
  const navigate = useNavigate();

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "customers" as const,
      product: "karty" as const,
      apiScope: "global" as const,
      basePath: `${mfeProps?.basePath ?? ""}/customers`,
      assetsBaseUrl: mfeProps?.assetsBaseUrl,
      user: mfeProps?.user,
      account: normalizeAccountContext(mfeProps?.account),
      location: mfeProps?.location ?? null,
      api: mfeProps?.api,
      routeParams: { locationId: mfeProps?.location?.id ?? null, recordId: null },
    }),
    [mfeProps]
  );

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Customers requires shell context"
            description="Open this page through the shell host so the shared customers module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <SharedModulesProvider value={sharedModuleProps as never}>
      <CustomersList onSelectCustomer={(customer) => navigate(`/customers/${customer.id}`)} />
    </SharedModulesProvider>
  );
}
