import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { FinanceModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthFinancePage() {
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
    const financeIndex = pathSegments.indexOf("finance");
    const routeSegments = financeIndex >= 0 ? pathSegments.slice(financeIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "finance" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/finance`,
      assetsBaseUrl: mfeProps.assetsBaseUrl,
      user: mfeProps.user,
      account: mfeProps.account,
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
        <FinanceModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
