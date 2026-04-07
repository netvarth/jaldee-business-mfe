import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { CustomersModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthCustomersPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const [queryClient] = useState(() => new QueryClient());

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "customers" as const,
      product: "health" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/customers`,
      user: mfeProps.user,
      account: mfeProps.account,
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
