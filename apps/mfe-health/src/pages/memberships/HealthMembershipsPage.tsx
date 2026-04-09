import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import { MembershipsModule, SharedModulesProvider } from "@jaldee/shared-modules";

export default function HealthMembershipsPage() {
  const mfeProps = useMFEProps();
  const params = useParams();
  const [queryClient] = useState(() => new QueryClient());

  const sharedModuleProps = useMemo(
    () => ({
      moduleName: "membership" as const,
      product: "health" as const,
      apiScope: "global" as const,
      basePath: `${mfeProps.basePath}/memberships`,
      user: mfeProps.user,
      account: mfeProps.account,
      location: mfeProps.location,
      api: mfeProps.api!,
      routeParams: {
        locationId: mfeProps.location?.id ?? null,
        recordId: params.recordId ?? null,
        view: params.view ?? null,
        subview: params.subview ?? null,
      },
    }),
    [mfeProps, params.recordId, params.view, params.subview]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <MembershipsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}