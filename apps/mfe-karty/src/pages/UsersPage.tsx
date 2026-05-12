import { useContext, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MFEPropsContext, normalizeAccountContext } from "@jaldee/auth-context";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { SharedModulesProvider, UsersModule } from "@jaldee/shared-modules";

const USERS_COLLECTION_VIEWS = new Set(["overview", "list", "teams"]);
const USERS_DETAIL_SECTIONS = new Set([
  "personal-details",
  "my-account",
  "services",
  "queues",
  "schedules",
  "non-working-days",
]);

export default function UsersPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const location = useLocation();
  const routerNavigate = useNavigate();
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

  const navigateWithinUsersModule = useMemo(
    () => (to: string) => {
      const normalized = to.startsWith("/") ? to : `/${to}`;
      if (normalized === "/" || normalized === "") {
        routerNavigate("/users");
        return;
      }
      if (normalized.startsWith("/users")) {
        routerNavigate(normalized);
        return;
      }
      routerNavigate(`/users${normalized}`);
    },
    [routerNavigate]
  );

  const routeState = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const usersIndex = pathSegments.indexOf("users");
    const routeSegments = usersIndex >= 0 ? pathSegments.slice(usersIndex + 1) : [];

    const firstSegment = params.view ?? routeSegments[0] ?? null;

    if (!firstSegment) {
      return {
        view: "overview",
        subview: null,
        recordId: null,
      };
    }

    if (USERS_COLLECTION_VIEWS.has(firstSegment)) {
      return {
        view: firstSegment,
        subview: params.subview ?? routeSegments[1] ?? null,
        recordId: params.recordId ?? routeSegments[2] ?? null,
      };
    }

    if (USERS_DETAIL_SECTIONS.has(firstSegment)) {
      return {
        view: "detail",
        subview: firstSegment,
        recordId: params.recordId ?? params.subview ?? routeSegments[1] ?? null,
      };
    }

    return {
      view: "detail",
      subview: "personal-details",
      recordId: firstSegment,
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Users requires shell context"
            description="Open this page through the shell host so the shared users module receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const sharedModuleProps = {
    moduleName: "users" as const,
    product: "karty" as const,
    apiScope: "location" as const,
    basePath: `${mfeProps.basePath}/users`,
    navigate: navigateWithinUsersModule,
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
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <UsersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
