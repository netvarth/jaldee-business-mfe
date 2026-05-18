import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, useMFEProps } from "@jaldee/auth-context";
import { SharedModulesProvider } from "@jaldee/shared-modules";
import { IpModule } from "../../modules/ip";

export default function HealthIpPage() {
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
    const ipIndex = pathSegments.indexOf("ip");
    const routeSegments = ipIndex >= 0 ? pathSegments.slice(ipIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
      tab: routeSegments[3] ?? null,
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "ip" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/ip`,
      assetsBaseUrl: mfeProps.assetsBaseUrl,
      navigate: mfeProps.navigate,
      user: mfeProps.user,
      account: normalizeAccountContext(mfeProps.account),
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
        <IpModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
