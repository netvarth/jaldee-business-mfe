import { useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { MembershipsModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthMembershipsPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [queryClient] = useState(() =>
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
    const membershipsIndex = pathSegments.indexOf("memberships");
    const routeSegments = membershipsIndex >= 0 ? pathSegments.slice(membershipsIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
      tab: searchParams.get("tab"),
    };
  }, [location.pathname, params.recordId, params.subview, params.view, searchParams]);

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "membership" as const,
      product: "health" as const,
      apiScope: "global" as const,
      basePath: `${mfeProps.basePath}/memberships`,
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
        <MembershipsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
