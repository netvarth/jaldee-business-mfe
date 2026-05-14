import { useContext, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { FinanceModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function FinancePage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Finance requires shell context"
            description="Open this page through the shell host so the shared finance module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const financeIndex = pathSegments.indexOf("finance");
  const routeSegments = financeIndex >= 0 ? pathSegments.slice(financeIndex + 1) : [];

  const view = params.view ?? routeSegments[0] ?? null;
  const subview = params.subview ?? routeSegments[1] ?? null;
  const recordId = params.recordId ?? routeSegments[2] ?? null;

  const sharedModuleProps = {
    moduleName: "finance" as const,
    product: "karty" as const,
    apiScope: "location" as const,
    basePath: `${mfeProps.basePath}/finance`,
    navigate: (to: string) => routerNavigate(to),
    user: mfeProps.user,
    account: normalizeAccountContext(mfeProps.account),
    location: mfeProps.location,
    api: mfeProps.api!,
    routeParams: {
      locationId: mfeProps.location?.id ?? null,
      view,
      subview,
      recordId,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <FinanceModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
