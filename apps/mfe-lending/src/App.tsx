import { useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Badge, Button, EmptyState, Icon, PageErrorBoundary, PageHeader, SectionCard, StatCard } from "@jaldee/design-system";
import { MFEPropsContext, normalizeAccountContext, useMFEProps } from "@jaldee/auth-context";
import { CustomersModule, ReportsModule, SharedModulesProvider } from "@jaldee/shared-modules";

type Accent = "indigo" | "emerald" | "amber" | "rose";

type QuickAction = {
  label: string;
  path: string;
  icon: "packagePlus" | "history" | "trend" | "chart" | "database" | "list";
  tone: string;
  note: string;
};

function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </div>
    </div>
  );
}

function FeatureLayout({
  title,
  subtitle,
  stats,
  actions,
  main,
  aside,
}: {
  title: string;
  subtitle: string;
  stats?: Array<{ label: string; value: string; accent: Accent }>;
  actions?: ReactNode;
  main: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <PageShell title={title} subtitle={subtitle} actions={actions}>
      {stats && stats.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </div>
      ) : null}

      <div className={`grid gap-6 ${aside ? "xl:grid-cols-[1.45fr_0.85fr]" : ""}`}>
        <div className="space-y-6">{main}</div>
        {aside ? <div className="space-y-6">{aside}</div> : null}
      </div>
    </PageShell>
  );
}

function FeedCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4 text-[22px] font-semibold text-slate-900">{title}</div>
      {children}
    </SectionCard>
  );
}

function SummaryList({
  rows,
}: {
  rows: Array<{ label: string; value: string; note?: string }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{row.label}</div>
              {row.note ? <div className="mt-1 text-sm text-slate-500">{row.note}</div> : null}
            </div>
            <div className="text-base font-semibold text-slate-900">{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  const mfeProps = useMFEProps();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="space-y-5">
        <div>
          <div className="text-[22px] font-semibold tracking-tight text-[#5B21B6]">Lending Operations Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">Track applications, repayments, collections, and portfolio health from one place.</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => mfeProps.navigate(action.path)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.tone}`}>
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-900">{action.label}</div>
              <div className="mt-1 text-xs text-slate-500">{action.note}</div>
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function OverviewPage() {
  const quickActions: QuickAction[] = [
    { label: "New Application", path: "/lending/applications", icon: "packagePlus", tone: "bg-violet-50 text-violet-600", note: "Start a new loan file" },
    { label: "Repayment Queue", path: "/lending/repayments", icon: "history", tone: "bg-emerald-50 text-emerald-600", note: "Review due collections" },
    { label: "Portfolio Trends", path: "/lending/reports", icon: "chart", tone: "bg-amber-50 text-amber-600", note: "Track delinquency shifts" },
    { label: "Risk Snapshot", path: "/lending/reports", icon: "trend", tone: "bg-rose-50 text-rose-600", note: "Monitor portfolio risk" },
    { label: "Customer Records", path: "/lending/customers", icon: "database", tone: "bg-sky-50 text-sky-600", note: "Review borrower profiles" },
    { label: "Lending Settings", path: "/lending/settings", icon: "list", tone: "bg-slate-100 text-slate-700", note: "Configure products and rules" },
  ];

  return (
    <FeatureLayout
      title="Lending Overview"
      subtitle="Portfolio highlights and core lending workflows."
      stats={[
        { label: "Applications", value: "128", accent: "indigo" },
        { label: "Active Loans", value: "94", accent: "emerald" },
        { label: "Overdue", value: "11", accent: "amber" },
        { label: "Collection Today", value: "₹1.9L", accent: "rose" },
      ]}
      main={
        <>
          <QuickActions actions={quickActions} />
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[22px] font-semibold text-slate-900">Pipeline Summary</div>
              <Badge variant="info">Live view</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Submitted", value: "37", note: "Awaiting review" },
                { label: "Under Review", value: "18", note: "Credit and KYC checks" },
                { label: "Approved", value: "21", note: "Ready for disbursal" },
                { label: "Disbursed", value: "52", note: "Live in portfolio" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.note}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      }
      aside={
        <FeedCard title="Focus Items">
          <SummaryList
            rows={[
              { label: "High-value applications", value: "6", note: "Above ₹5L ticket size" },
              { label: "Repayments due today", value: "14", note: "Collections desk follow-up" },
              { label: "Foreclosure requests", value: "3", note: "Pending approval" },
              { label: "Guarantor documents", value: "9", note: "Missing verification" },
            ]}
          />
        </FeedCard>
      }
    />
  );
}

function SectionPlaceholder({
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </SectionCard>
    </PageShell>
  );
}

function ApplicationsPage() {
  return (
    <SectionPlaceholder
      title="Applications"
      subtitle="Manage the loan application lifecycle."
      emptyTitle="Applications workspace is ready"
      emptyDescription="This route is wired through the Lending microfrontend and ready for the next implementation slice."
    />
  );
}

function RepaymentsPage() {
  return (
    <SectionPlaceholder
      title="Repayments"
      subtitle="Track repayment schedules, dues, and collections."
      emptyTitle="Repayment operations are routed"
      emptyDescription="Add repayment tables, collection workflows, and overdue handling here."
    />
  );
}

function CustomersPage() {
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
      product: "lending" as const,
      apiScope: "location" as const,
      basePath: `${mfeProps.basePath}/customers`,
      user: mfeProps.user,
      account: normalizeAccountContext(mfeProps.account),
      location: mfeProps.location,
      api: mfeProps.api,
      routeParams: {
        locationId: mfeProps.location?.id ?? null,
        recordId: params.recordId ?? null,
      },
    }),
    [mfeProps, params.recordId],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SharedModulesProvider value={sharedModuleProps}>
        <CustomersModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}

function ReportsPage() {
  const mfeProps = useContext(MFEPropsContext);
  const params = useParams();
  const location = useLocation();
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
    const reportsIndex = pathSegments.indexOf("reports");
    const routeSegments = reportsIndex >= 0 ? pathSegments.slice(reportsIndex + 1) : [];

    return {
      view: params.view ?? routeSegments[0] ?? null,
      subview: params.subview ?? routeSegments[1] ?? null,
      recordId: params.recordId ?? routeSegments[2] ?? null,
    };
  }, [location.pathname, params.recordId, params.subview, params.view]);

  if (!mfeProps || !mfeProps.api) {
    return (
      <div className="p-6">
        <SectionCard>
          <EmptyState
            title="Reports requires shell context"
            description="Open this page through the shell host so Reports receives MFE props and API context."
          />
        </SectionCard>
      </div>
    );
  }

  const sharedModuleProps = {
    moduleName: "reports" as const,
    product: "lending" as const,
    apiScope: "location" as const,
    basePath: `${mfeProps.basePath}/reports`,
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
        <ReportsModule />
      </SharedModulesProvider>
    </QueryClientProvider>
  );
}

function SettingsPage() {
  return (
    <SectionPlaceholder
      title="Settings"
      subtitle="Configure lending products, risk controls, and repayment rules."
      emptyTitle="Lending settings are routed"
      emptyDescription="This section is ready for product configuration screens."
    />
  );
}

function withBoundary(element: ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route path="" element={withBoundary(<OverviewPage />)} />
      <Route path="overview" element={<Navigate to="/lending" replace />} />
      <Route path="applications" element={withBoundary(<ApplicationsPage />)} />
      <Route path="repayments" element={withBoundary(<RepaymentsPage />)} />
      <Route path="customers" element={withBoundary(<CustomersPage />)} />
      <Route path="reports" element={withBoundary(<ReportsPage />)} />
      <Route path="settings" element={withBoundary(<SettingsPage />)} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
