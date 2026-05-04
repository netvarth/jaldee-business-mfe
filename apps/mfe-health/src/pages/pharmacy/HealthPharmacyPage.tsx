import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { OrdersModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthPharmacyPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const location = useLocation();
  const [queryClient] = useState(() => new QueryClient());

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const moduleSegment = pathSegments[1] ?? "pharmacy";
  const sectionView = pathSegments[2] ?? null;

  const view =
    sectionView === "inventory"
      ? "inventory"
      : sectionView === "catalogs"
        ? "catalogs"
        : params.view ?? "overview";
  // Derive subview and recordId from path segments for reliability across route patterns.
  let resolvedSubview: string | null = null;
  let resolvedRecordId: string | null = null;

  if (view === "details") {
    resolvedRecordId = params.recordId ?? pathSegments[3] ?? null;
  } else {
    // For /pharmacy/:view/:subview/:recordId
    // pathSegments are [0:health, 1:pharmacy, 2:view, 3:subview, 4:recordId]
    resolvedSubview = params.subview ?? pathSegments[3] ?? null;
    resolvedRecordId = params.recordId ?? pathSegments[4] ?? null;
  }

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "orders" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: mfeProps.basePath,
      moduleBasePath: `${mfeProps.basePath}/${moduleSegment}`,
      navigate: (to: string) => navigate(to),
      account: mfeProps.account,
      location: mfeProps.location,
      api: mfeProps.api!,
      routeParams: {
        locationId: mfeProps.location?.id ?? null,
        view,
        subview: resolvedSubview,
        recordId: resolvedRecordId,
      },
    }),
    [mfeProps, resolvedRecordId, resolvedSubview, view, moduleSegment]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <OrdersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
