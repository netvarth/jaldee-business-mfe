import { useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { LeadsModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthLeadsPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
    const leadsIndex = pathSegments.indexOf("leads");
    const routeSegments = leadsIndex >= 0 ? pathSegments.slice(leadsIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
      tab: searchParams.get("tab"),
    };
  }, [location.pathname, params.recordId, params.subview, params.view, searchParams]);

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "leads" as const,
      product: "health" as const,
      apiScope: "global" as const,
      basePath: `${mfeProps.basePath}/leads`,
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
        tab: routeState.tab,
      },
    }),
    [mfeProps, routeState]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <LeadsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
