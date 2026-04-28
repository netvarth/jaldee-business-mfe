import { useContext, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { StoresModule, SharedModulesProvider } from "@jaldee/shared-modules";
import { useParams } from "react-router-dom";

export default function StoresPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const [queryClient] = useState(() => new QueryClient());

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Stores requires shell context"
            description="Open this page through the shell host so the shared stores module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const sharedModuleProps = {
    moduleName: "stores" as const,
    product: "karty" as const,
    apiScope: "location" as const,
    basePath: `${mfeProps.basePath}/stores`,
    user: mfeProps.user,
    account: normalizeAccountContext(mfeProps.account),
    location: mfeProps.location,
    api: mfeProps.api!,
    routeParams: {
      locationId: mfeProps.location?.id ?? null,
      recordId: params.recordId ?? null,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <StoresModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
