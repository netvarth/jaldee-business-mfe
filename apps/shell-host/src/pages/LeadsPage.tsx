import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, type ProductKey } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { LeadsModule, SharedModulesProvider } from "@jaldee/shared-modules";
import { useShellStore } from "../store/shellStore";

export default function LeadsPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const locationContext = useShellStore((s) => s.activeLocation);
  const navigate = useNavigate();
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
    const leadsIndex = pathSegments.indexOf("leads");
    const routeSegments = leadsIndex >= 0 ? pathSegments.slice(leadsIndex + 1) : [];

    return {
      view: routeSegments[0] ?? null,
      subview: routeSegments[1] ?? null,
      recordId: routeSegments[2] ?? null,
      tab: searchParams.get("tab"),
    };
  }, [location.pathname, searchParams]);

  const navigateWithinModule = useMemo(
    () => (to: string) => {
      const normalized = to.startsWith("/") ? to : `/${to}`;
      if (normalized === "/" || normalized === "") {
        navigate("/leads");
        return;
      }
      if (normalized.startsWith("/leads")) {
        navigate(normalized);
        return;
      }
      navigate(`/leads${normalized}`);
    },
    [navigate],
  );

  if (!user || !account) {
    return (
      <div className="mfe-wrapper">
        <SectionCard>
          <EmptyState
            title="Leads requires shell context"
            description="Sign in through the shell so the shared Leads module receives user, account, and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const preferredProduct: ProductKey = account.licensedProducts.includes("health")
    ? "health"
    : (account.licensedProducts[0] ?? "karty");

  const sharedModuleProps = {
    moduleName: "leads" as const,
    product: preferredProduct,
    apiScope: "global" as const,
    basePath: "/leads",
    navigate: navigateWithinModule,
    user,
    account: normalizeAccountContext(account),
    location: locationContext,
    api: apiClient,
    routeParams: {
      locationId: locationContext?.id ?? null,
      view: routeState.view,
      subview: routeState.subview,
      recordId: routeState.recordId,
      tab: routeState.tab,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider value={sharedModuleProps}>
          <LeadsModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}
