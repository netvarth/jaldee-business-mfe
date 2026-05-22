import { useContext, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { OrdersModule, SharedModulesProvider } from "@jaldee/shared-modules";

function resolveHealthPharmacyView(pathname: string, paramView?: string | null) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const pharmacyIndex = pathSegments.indexOf("pharmacy");
  const orderIndex = pathSegments.indexOf("order");
  const inventoryIndex = pathSegments.indexOf("inventory");
  const catalogIndex = pathSegments.indexOf("catalog");
  const moduleIndex = pharmacyIndex >= 0 ? pharmacyIndex : orderIndex;
  const section =
    moduleIndex >= 0 ? pathSegments[moduleIndex] : inventoryIndex >= 0 ? "inventory" : catalogIndex >= 0 ? "catalog" : "pharmacy";
  const subsection =
    moduleIndex >= 0
      ? pathSegments[moduleIndex + 1] ?? null
      : section === "inventory" && inventoryIndex >= 0
        ? pathSegments[inventoryIndex + 1] ?? null
        : section === "catalog" && catalogIndex >= 0
          ? pathSegments[catalogIndex + 1] ?? null
          : null;

  if (section === "inventory" || subsection === "inventory") {
    return "inventory";
  }

  if (section === "catalog" || subsection === "catalog") {
    return "catalogs";
  }

  if (moduleIndex >= 0 && (subsection === "details" || paramView === "details")) {
    return "details";
  }

  if (moduleIndex >= 0 && (subsection === "dashboard" || paramView === "dashboard")) {
    return "dashboard";
  }

  return paramView ?? subsection ?? "overview";
}

export default function HealthPharmacyPage() {
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
            title="Pharmacy requires shell context"
            description="Open this page through the shell host so the shared pharmacy module receives user, account, location, and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const pharmacyIndex = pathSegments.indexOf("pharmacy");
  const orderIndex = pathSegments.indexOf("order");
  const moduleIndex = pharmacyIndex >= 0 ? pharmacyIndex : orderIndex;
  const moduleSegment = moduleIndex >= 0 ? pathSegments[moduleIndex] : "pharmacy";
  const moduleRoot = `${mfeProps.basePath}/${moduleSegment}`;
  const inventoryIndex = pathSegments.indexOf("inventory");
  const catalogIndex = pathSegments.indexOf("catalog");
  const view = resolveHealthPharmacyView(location.pathname, params.view ?? null);
  let resolvedSubview: string | null = null;
  let resolvedRecordId: string | null = null;
  let resolvedTab: string | null = null;

  if (moduleIndex >= 0) {
    const afterModule = pathSegments.slice(moduleIndex + 1);
    const viewSegment = afterModule[0] ?? null;

    if (view === "details") {
      resolvedRecordId = params.recordId ?? afterModule[1] ?? null;
    } else if (view === "inventory") {
      resolvedSubview = params.subview ?? afterModule[1] ?? null;
      resolvedTab = afterModule[2] ?? null;
      resolvedRecordId = params.recordId ?? afterModule[3] ?? null;
    } else if (viewSegment && afterModule.length >= 2) {
      resolvedSubview = params.subview ?? afterModule[1] ?? null;
      resolvedRecordId = params.recordId ?? afterModule[2] ?? null;
    }
  } else if (inventoryIndex >= 0) {
    const afterInventory = pathSegments.slice(inventoryIndex + 1);
    resolvedSubview = params.view ?? afterInventory[0] ?? null;
    resolvedTab = afterInventory[1] ?? null;
    resolvedRecordId = params.recordId ?? afterInventory[2] ?? null;
  } else if (catalogIndex >= 0) {
    resolvedSubview = params.view ?? pathSegments[catalogIndex + 1] ?? null;
  }

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "orders" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: moduleRoot,
      moduleBasePath: moduleRoot,
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
        tab: resolvedTab,
      },
    }),
    [mfeProps, moduleRoot, resolvedRecordId, resolvedSubview, resolvedTab, routerNavigate, view]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <OrdersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
