import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, type ProductKey } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { LeadsModule, SharedModulesProvider } from "@jaldee/shared-modules";
import { useShellStore } from "../store/shellStore";

export default function LeadsPage() {
  const user = useShellStore((state) => state.user);
  const account = useShellStore((state) => state.account);
  const location = useShellStore((state) => state.activeLocation);
  const availableLocations = useShellStore((state) => state.availableLocations);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  if (!user || !account) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Leads unavailable" description="Sign in and select an account to open Leads." />
      </SectionCard>
    );
  }

  const preferredProduct: ProductKey = account.licensedProducts.includes("health")
    ? "health"
    : (account.licensedProducts[0] ?? "karty");

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider
        value={{
          moduleName: "leads",
          product: preferredProduct,
          apiScope: "global",
          basePath: "/leads",
          user,
          account: normalizeAccountContext(account),
          location,
          availableLocations,
          api: apiClient,
        }}
      >
        <LeadsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
