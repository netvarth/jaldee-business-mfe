import { useContext, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { MembershipsModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function MembershipPage() {
  const mfeProps = useContext(MFEPropsContext);
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
      }),
  );

  const routeState = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const membershipsIndex = pathSegments.indexOf("membership");
    const routeSegments = membershipsIndex >= 0 ? pathSegments.slice(membershipsIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
      tab: searchParams.get("tab"),
    };
  }, [location.pathname, params.recordId, params.subview, params.view, searchParams]);

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Membership requires shell context"
            description="Open this page through the shell host so the shared membership module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const sharedModuleProps = {
    moduleName: "membership" as const,
    product: "karty" as const,
    apiScope: "global" as const,
    basePath: `${mfeProps.basePath}/membership`,
    assetsBaseUrl: mfeProps.assetsBaseUrl,
    user: mfeProps.user,
    account: normalizeAccountContext(mfeProps.account),
    location: mfeProps.location,
    api: mfeProps.api,
    routeParams: {
      locationId: mfeProps.location?.id ?? null,
      recordId: routeState.recordId,
      view: routeState.view,
      subview: routeState.subview,
      tab: routeState.tab,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <MembershipsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
