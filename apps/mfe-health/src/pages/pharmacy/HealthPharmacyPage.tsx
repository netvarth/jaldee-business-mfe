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
  const sectionView = pathSegments[2] ?? null;

  const view =
    sectionView === "inventory"
      ? "inventory"
      : sectionView === "catalogs"
        ? "catalogs"
        : params.view ?? "overview";
  const resolvedRecordId = params.recordId ?? (view === "details" ? pathSegments[3] ?? null : null);
  const resolvedSubview = view === "details" ? null : params.subview ?? null;

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "orders" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: mfeProps.basePath,
      user: mfeProps.user,
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
    [mfeProps, resolvedRecordId, resolvedSubview, view]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <OrdersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
