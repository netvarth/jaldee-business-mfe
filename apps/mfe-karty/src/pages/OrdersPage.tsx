import { useContext, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { OrdersModule, SharedModulesProvider } from "@jaldee/shared-modules";

function resolveKartyOrdersView(pathname: string, paramView?: string | null) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const ordersIndex = pathSegments.indexOf("orders");
  const inventoryIndex = pathSegments.indexOf("inventory");
  const catalogIndex = pathSegments.indexOf("catalog");

  const section =
    ordersIndex >= 0 ? "orders" : inventoryIndex >= 0 ? "inventory" : catalogIndex >= 0 ? "catalog" : "orders";

  const subsection = section === "orders" && ordersIndex >= 0 ? pathSegments[ordersIndex + 1] ?? null : null;

  if (section === "inventory") {
    return "inventory";
  }

  if (section === "catalog") {
    return "catalogs";
  }

  if (section === "orders" && subsection === "details") {
    return "details";
  }

  if (section === "orders" && subsection === "dashboard") {
    return "dashboard";
  }

  if (paramView === "dashboard") {
    return "dashboard";
  }

  return paramView ?? "overview";
}

export default function OrdersPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [queryClient] = useState(() => new QueryClient());

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Orders requires shell context"
            description="Open this page through the shell host so the shared orders module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const view = resolveKartyOrdersView(location.pathname, params.view ?? null);
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const ordersIndex = pathSegments.indexOf("orders");
  const isOrdersSection = ordersIndex >= 0;
  const resolvedSubview = isOrdersSection && view !== "details" ? params.subview ?? null : null;
  const resolvedRecordId =
    isOrdersSection
      ? params.recordId ?? (view === "details" ? pathSegments[ordersIndex + 2] ?? null : null)
      : null;

  const sharedModuleProps = {
    moduleName: "orders" as const,
    product: "karty" as const,
    apiScope: "location" as const,
    basePath: mfeProps.basePath,
    navigate: (to: string) => routerNavigate(to),
    user: mfeProps.user,
    account: normalizeAccountContext(mfeProps.account),
    location: mfeProps.location,
    api: mfeProps.api!,
    routeParams: {
      locationId: mfeProps.location?.id ?? null,
      view,
      subview: resolvedSubview,
      recordId: resolvedRecordId,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <OrdersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
