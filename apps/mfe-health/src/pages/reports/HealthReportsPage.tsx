import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, useMFEProps } from "@jaldee/auth-context";
import { ReportsModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthReportsPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const location = useLocation();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  const routeState = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const reportsIndex = pathSegments.indexOf("reports");
    const routeSegments = reportsIndex >= 0 ? pathSegments.slice(reportsIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "reports" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/reports`,
      assetsBaseUrl: mfeProps.assetsBaseUrl,
      user: mfeProps.user,
      account: normalizeAccountContext(mfeProps.account),
      location: mfeProps.location,
      api: mfeProps.api!,
      routeParams: {
        locationId: mfeProps.location?.id ?? null,
        recordId: routeState.recordId,
        view: routeState.view,
        subview: routeState.subview,
      },
    }),
    [mfeProps, routeState]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <ReportsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
