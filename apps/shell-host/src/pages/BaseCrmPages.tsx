import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAccountContext, type ProductKey } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import {
  CustomersModule,
  DriveModule,
  LeadsModule,
  MembershipsModule,
  ReportsModule,
  SharedModulesProvider,
  TasksModule,
  UsersModule,
} from "@jaldee/shared-modules";
import { useShellStore } from "../store/shellStore";

function useSharedQueryClient() {
  return useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 30_000,
          },
        },
      }),
  )[0];
}

function usePreferredProduct(): ProductKey | null {
  const account = useShellStore((s) => s.account);

  return useMemo(() => {
    const normalizedAccount = normalizeAccountContext(account);
    if (!normalizedAccount) return "karty";
    if (normalizedAccount.licensedProducts.includes("health")) {
      return "health";
    }
    if (normalizedAccount.licensedProducts.includes("karty")) {
      return "karty";
    }
    return normalizedAccount.licensedProducts[0] ?? "karty";
  }, [account]);
}

function ShellContextEmptyState({ title }: { title: string }) {
  return (
    <div className="mfe-wrapper">
      <SectionCard>
        <EmptyState
          title={`${title} requires shell context`}
          description={`Sign in through the shell so the shared ${title.toLowerCase()} module receives user, account, location, and API context.`}
        />
      </SectionCard>
    </div>
  );
}

function useModuleNavigate(basePath: string) {
  const navigate = useNavigate();

  return useMemo(
    () => (to: string) => {
      const normalized = to.startsWith("/") ? to : `/${to}`;
      if (normalized === "/" || normalized === "") {
        navigate(basePath);
        return;
      }
      if (normalized.startsWith(basePath)) {
        navigate(normalized);
        return;
      }
      navigate(`${basePath}${normalized}`);
    },
    [basePath, navigate],
  );
}

function useRouteSegments(anchor: string) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const anchorIndex = pathSegments.indexOf(anchor);
    const routeSegments = anchorIndex >= 0 ? pathSegments.slice(anchorIndex + 1) : [];

    return {
      routeSegments,
      tab: searchParams.get("tab"),
    };
  }, [anchor, location.pathname, searchParams]);
}

export function ShellCustomersPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const accessToken = useShellStore((s) => s.accessToken);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const { routeSegments } = useRouteSegments("customers");

  if (!user || !account) {
    return <ShellContextEmptyState title="Customers" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "customers",
            product,
            apiScope: "global",
            basePath: "/customers",
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: {
              get: (url: string, config?: unknown) =>
                apiClient.get(url, {
                  ...(config as any),
                  headers: {
                    ...((config as any)?.headers ?? {}),
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                }),
              post: (url: string, data?: unknown, config?: unknown) =>
                apiClient.post(url, data, {
                  ...(config as any),
                  headers: {
                    ...((config as any)?.headers ?? {}),
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                }),
              put: (url: string, data?: unknown, config?: unknown) =>
                apiClient.put(url, data, {
                  ...(config as any),
                  headers: {
                    ...((config as any)?.headers ?? {}),
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                }),
              patch: (url: string, data?: unknown, config?: unknown) =>
                apiClient.patch(url, data, {
                  ...(config as any),
                  headers: {
                    ...((config as any)?.headers ?? {}),
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                }),
              delete: (url: string, config?: unknown) =>
                apiClient.delete(url, {
                  ...(config as any),
                  headers: {
                    ...((config as any)?.headers ?? {}),
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                }),
            },
            routeParams: {
              locationId: null,
              recordId: routeSegments[0] ?? null,
            },
          }}
        >
          <CustomersModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellUsersPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const navigateWithinModule = useModuleNavigate("/users");
  const { routeSegments } = useRouteSegments("users");

  const routeState = useMemo(() => {
    const firstSegment = routeSegments[0] ?? null;
    const collectionViews = new Set(["overview", "list", "teams"]);
    const detailSections = new Set(["personal-details", "my-account", "services", "queues", "schedules", "non-working-days"]);
    const detailModes = new Set(["profile", "settings"]);

    if (!firstSegment) {
      return { view: "overview", subview: null, recordId: null, tab: null };
    }

    if (collectionViews.has(firstSegment)) {
      return {
        view: firstSegment,
        subview: routeSegments[1] ?? null,
        recordId: routeSegments[2] ?? null,
        tab: null,
      };
    }

    if (detailModes.has(firstSegment)) {
      return {
        view: "detail",
        subview: "personal-details",
        recordId: routeSegments[1] ?? null,
        tab: firstSegment === "profile" ? "standalone" : "settings",
      };
    }

    if (detailSections.has(firstSegment)) {
      return {
        view: "detail",
        subview: firstSegment,
        recordId: routeSegments[1] ?? null,
        tab: "settings",
      };
    }

    return {
      view: "detail",
      subview: "personal-details",
      recordId: firstSegment,
      tab: "settings",
    };
  }, [routeSegments]);

  if (!user || !account) {
    return <ShellContextEmptyState title="Users" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "users",
            product,
            apiScope: "global",
            basePath: "/users",
            navigate: navigateWithinModule,
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              recordId: routeState.recordId,
              view: routeState.view,
              subview: routeState.subview,
              tab: routeState.tab,
            },
          }}
        >
          <UsersModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellDrivePage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const { routeSegments } = useRouteSegments("drive");

  if (!user || !account) {
    return <ShellContextEmptyState title="Drive" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "drive",
            product,
            apiScope: "global",
            basePath: "/drive",
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              view: routeSegments[0] ?? null,
              subview: routeSegments[1] ?? null,
              recordId: routeSegments[2] ?? null,
            },
          }}
        >
          <DriveModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellTasksPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const navigateWithinModule = useModuleNavigate("/tasks");
  const { routeSegments, tab } = useRouteSegments("tasks");

  const routeState = useMemo(() => {
    const view = routeSegments[0] ?? "list";

    if (view === "crm-stage") {
      return {
        view,
        subview: routeSegments[1] ?? null,
        recordId: routeSegments[2] ?? null,
        tab,
      };
    }

    return {
      view,
      subview: routeSegments[1] ?? null,
      recordId: routeSegments[2] ?? null,
      tab,
    };
  }, [routeSegments, tab]);

  if (!user || !account) {
    return <ShellContextEmptyState title="Tasks" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "tasks",
            product,
            apiScope: "global",
            basePath: "/tasks",
            navigate: navigateWithinModule,
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              view: routeState.view,
              subview: routeState.subview,
              recordId: routeState.recordId,
              tab: routeState.tab,
            },
          }}
        >
          <TasksModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellMembershipPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const navigateWithinModule = useModuleNavigate("/membership");
  const { routeSegments, tab } = useRouteSegments("membership");

  if (!user || !account) {
    return <ShellContextEmptyState title="Membership" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "membership",
            product,
            apiScope: "global",
            basePath: "/membership",
            navigate: navigateWithinModule,
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              view: routeSegments[0] ?? null,
              subview: routeSegments[1] ?? null,
              recordId: routeSegments[2] ?? null,
              tab,
            },
          }}
        >
          <MembershipsModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellReportsPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const { routeSegments } = useRouteSegments("reports");

  if (!user || !account) {
    return <ShellContextEmptyState title="Reports" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "reports",
            product,
            apiScope: "global",
            basePath: "/reports",
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              view: routeSegments[0] ?? null,
              subview: routeSegments[1] ?? null,
              recordId: routeSegments[2] ?? null,
            },
          }}
        >
          <ReportsModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}

export function ShellAuditLogPage() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const product = usePreferredProduct();
  const queryClient = useSharedQueryClient();
  const navigateWithinModule = useModuleNavigate("/audit-log");

  if (!user || !account) {
    return <ShellContextEmptyState title="Audit Log" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mfe-wrapper">
        <SharedModulesProvider
          value={{
            moduleName: "leads",
            product,
            apiScope: "global",
            basePath: "/audit-log",
            navigate: navigateWithinModule,
            user,
            account: normalizeAccountContext(account),
            location: null,
            api: apiClient,
            routeParams: {
              locationId: null,
              view: "auditlog",
              subview: null,
              recordId: null,
              tab: null,
            },
          }}
        >
          <LeadsModule />
        </SharedModulesProvider>
      </div>
    </QueryClientProvider>
  );
}
