import { useContext, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { CustomersModule, SharedModulesProvider } from "@jaldee/shared-modules";
import { useParams } from "react-router-dom";

export default function CustomersPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const [queryClient] = useState(() => new QueryClient());

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Customers requires shell context"
            description="Open this page through the shell host so the shared customers module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "customers" as const,
      product: "karty" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/customers`,
      user: mfeProps.user,
      account: normalizeAccountContext(mfeProps.account),
      location: mfeProps.location,
      api: mfeProps.api!,
      routeParams: {
        locationId: mfeProps.location?.id ?? null,
        recordId: params.recordId ?? null,
      },
    }),
    [mfeProps, params.recordId]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <CustomersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
