import { useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, useMFEProps } from "@jaldee/auth-context";
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
const USERS_DETAIL_MODES = new Set(["profile", "settings"]);

export default function HealthUsersPage() {
  const mfeProps = useMFEProps();
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
      }),
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
    [routerNavigate],
  );

  const routeState = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const usersIndex = pathSegments.indexOf("users");
    const routeSegments = usersIndex >= 0 ? pathSegments.slice(usersIndex + 1) : [];

    const firstSegment = params.view ?? routeSegments[0] ?? null;

    if (!firstSegment) {
      return { view: "overview", subview: null, recordId: null, tab: null };
    }

    if (USERS_COLLECTION_VIEWS.has(firstSegment)) {
      return {
        view: firstSegment,
        subview: params.subview ?? routeSegments[1] ?? null,
        recordId: params.recordId ?? routeSegments[2] ?? null,
        tab: null,
      };
    }

    if (USERS_DETAIL_MODES.has(firstSegment)) {
      return {
        view: "detail",
        subview: "personal-details",
        recordId: routeSegments[1] ?? params.recordId ?? null,
        tab: firstSegment === "profile" ? "standalone" : "settings",
      };
    }

    if (USERS_DETAIL_SECTIONS.has(firstSegment)) {
      return {
        view: "detail",
        subview: firstSegment,
        recordId: params.recordId ?? params.subview ?? routeSegments[1] ?? null,
        tab: "settings",
      };
    }

    return {
      view: "detail",
      subview: "personal-details",
      recordId: firstSegment,
      tab: "settings",
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  const sharedModuleProps = {
    moduleName: "users" as const,
    product: "health" as const,
    apiScope: "location" as const,
    basePath: `${mfeProps.basePath}/users`,
    navigate: navigateWithinUsersModule,
    assetsBaseUrl: mfeProps.assetsBaseUrl,
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
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <UsersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}
