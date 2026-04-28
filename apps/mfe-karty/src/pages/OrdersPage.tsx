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

  // The segment immediately after the section keyword (e.g. "items", "details", "dashboard")
  const subsection =
    section === "orders" && ordersIndex >= 0
      ? pathSegments[ordersIndex + 1] ?? null
      : section === "inventory" && inventoryIndex >= 0
        ? pathSegments[inventoryIndex + 1] ?? null
        : section === "catalog" && catalogIndex >= 0
          ? pathSegments[catalogIndex + 1] ?? null
          : null;

  if (section === "inventory") {
    return "inventory";
  }

  if (section === "catalog") {
    return "catalogs";
  }

  if (section === "orders" && (subsection === "details" || paramView === "details")) {
    return "details";
  }

  if (section === "orders" && (subsection === "dashboard" || paramView === "dashboard")) {
    return "dashboard";
  }

  // paramView is populated by React Router for generic routes (orders/:view).
  // For specific routes (orders/items/create), paramView is undefined — fall back to subsection.
  return paramView ?? subsection ?? "overview";
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

  // Derive subview and recordId from path segments for reliability across route patterns.
  // For /karty/orders/items/create     → itemsIndex=2, subview="create",   recordId=null
  // For /karty/orders/items/details/id → itemsIndex=2, subview="details",  recordId="id"
  // For /karty/orders/items/update/id  → itemsIndex=2, subview="update",   recordId="id"
  // For /karty/orders/details/id       → view="details", subview=null,     recordId="id"
  let resolvedSubview: string | null = null;
  let resolvedRecordId: string | null = null;

  if (isOrdersSection) {
    const afterOrders = pathSegments.slice(ordersIndex + 1); // e.g. ["items","create"] or ["details","abc"]
    const viewSegment = afterOrders[0] ?? null;              // "items" | "details" | "dashboard" …

    if (view === "details") {
      // /orders/details/:recordId
      resolvedRecordId = params.recordId ?? afterOrders[1] ?? null;
    } else if (viewSegment && afterOrders.length >= 2) {
      // /orders/:view/:subview  or  /orders/:view/:subview/:recordId
      resolvedSubview = params.subview ?? afterOrders[1] ?? null;
      resolvedRecordId = params.recordId ?? afterOrders[2] ?? null;
    }
  }

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
