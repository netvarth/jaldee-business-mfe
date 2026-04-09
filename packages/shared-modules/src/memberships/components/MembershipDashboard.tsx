import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  PieChart,
  SectionCard,
  Select,
  StatCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useAnalytics,
  useGraphAnalyticsData,
  useMemberCount,
  useMembers,
  useServiceCount,
  useServices,
} from "../queries/memberships";

type DashboardAction = {
  key: string;
  label: string;
  href: string;
  visible: boolean;
  palette: string;
  iconKey: MembershipActionIconKey;
};

type MembershipActionIconKey =
  | "create-member"
  | "members"
  | "services"
  | "fee-management"
  | "leads"
  | "subscription-types"
  | "service-types";

type DashboardMember = {
  id: string;
  name: string;
  memberSince: string;
  contact: string;
  status: string;
};

type DashboardService = {
  id: string;
  name: string;
};

const timeRangeOptions = [
  { value: "month", label: "Last 30 Days" },
  { value: "week", label: "Last 7 Days" },
  { value: "day", label: "Today" },
];

const graphRangeOptions = [
  { value: "month", label: "Last 30 Days" },
  { value: "week", label: "Last 7 Days" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function mapFrequency(range: string) {
  if (range === "week") return "WEEKLY";
  if (range === "day") return "TODAY";
  return "MONTHLY";
}

function mapGraphCategory(range: string) {
  return range === "week" ? "WEEKLY" : "MONTHLY";
}

function readCountMetric(analytics: any, ...keys: string[]) {
  if (analytics?.metricWiseValues?.length) {
    const match = analytics.metricWiseValues.find((item: any) => keys.includes(item.metricName));
    if (match) {
      return Number(match.isAmt ? match.amount : match.value) || 0;
    }
  }

  for (const key of keys) {
    const value = analytics?.[key];
    if (value !== undefined && value !== null) {
      return Number(value) || 0;
    }
  }

  return 0;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toMemberRows(data: any): DashboardMember[] {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return rows.map((member: any, index: number) => {
    const name = [
      member.memberName,
      [member.firstName, member.lastName].filter(Boolean).join(" "),
      [member.consumerFirstName, member.consumerLastName].filter(Boolean).join(" "),
    ]
      .find(Boolean) || `Member ${index + 1}`;

    const phone = [member.countryCode, member.phoneNo].filter(Boolean).join("");
    const contact = [phone, member.phoneNumber, member.email].filter(Boolean).join(" | ") || "-";

    return {
      id: String(member.uid ?? member.id ?? member.memberId ?? index),
      name: String(name),
      memberSince: formatDate(member.dateOfJoining ?? member.createdDate ?? member.createdAt ?? member.memberSince),
      contact,
      status: String(member.memberStatus ?? member.status ?? "Pending"),
    };
  });
}

function toServiceRows(data: any): DashboardService[] {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return rows.map((service: any, index: number) => ({
    id: String(service.uid ?? service.id ?? service.serviceId ?? index),
    name: service.serviceName ?? service.name ?? `Service ${index + 1}`,
  }));
}

function normalizeStatus(status: string) {
  const value = status.toLowerCase();

  if (value === "active" || value === "enabled") {
    return {
      label: "Active",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (value === "inactive" || value === "disabled") {
    return {
      label: "Inactive",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: status,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function MembershipIcon({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-16 w-16 items-center justify-center rounded-2xl ${className}`}
    >
      {children}
    </span>
  );
}

function renderMembershipActionIcon(iconKey: MembershipActionIconKey) {
  const iconMap: Record<MembershipActionIconKey, ReactNode> = {
    "create-member": <MemberPlusIcon />,
    members: <MembersIcon />,
    services: <ServicesIcon />,
    "fee-management": <FeeIcon />,
    leads: <LeadIcon />,
    "subscription-types": <SubscriptionIcon />,
    "service-types": <ServiceTypeIcon />,
  };

  return iconMap[iconKey];
}

export function MembershipDashboard() {
  const { basePath, account } = useSharedModulesContext();
  const [serviceTypeRange, setServiceTypeRange] = useState("month");
  const [subscriptionRange, setSubscriptionRange] = useState("month");
  const [membersRange, setMembersRange] = useState("month");
  const [membersPage, setMembersPage] = useState(1);
  const [servicesPage, setServicesPage] = useState(1);
  const pageSize = 10;

  const summaryQuery = useAnalytics({
    frequency: "TILL_NOW",
    config_metric_type: "MEMBERSHIP_DASHBOARD_COUNT",
  });
  const serviceTypeQuery = useAnalytics({
    frequency: mapFrequency(serviceTypeRange),
    config_metric_type: "MEMBERSHIP_DASHBOARD_COUNT",
  });
  const subscriptionQuery = useAnalytics({
    frequency: mapFrequency(subscriptionRange),
    config_metric_type: "MEMBERSHIP_DASHBOARD_COUNT",
  });
  const memberGraphQuery = useGraphAnalyticsData([
    {
      category: mapGraphCategory(membersRange),
      type: "BARCHART",
      filter: {
        config_metric_type: "MEMBERSHIP_DASHBOARD_GRAPH",
      },
    },
  ]);

  const memberCountQuery = useMemberCount({});
  const membersQuery = useMembers({
    from: (membersPage - 1) * pageSize,
    count: pageSize,
  });
  const serviceCountQuery = useServiceCount({});
  const servicesQuery = useServices({
    from: (servicesPage - 1) * pageSize,
    count: pageSize,
  });

  const summary = summaryQuery.data ?? {};
  const totalMembers = readCountMetric(summary, "MEMBERS_COUNT");
  const activeMembers = readCountMetric(summary, "MEMBERS_ACTIVE_COUNT");
  const totalSubscriptions = readCountMetric(summary, "MEMBERS_SUBSCRIPTION_TYPE_COUNT");
  const activeSubscriptions = readCountMetric(summary, "MEMBERS_SUBSCRIPTION_TYPE_ACTIVE_COUNT");
  const totalServices = readCountMetric(summary, "MEMBERS_SERVICE_COUNT");
  const activeServices = readCountMetric(summary, "MEMBERS_SERVICE_ACTIVE_COUNT");
  const totalFee = readCountMetric(summary, "MEMBERS_FEES_TOTAL_AMT");
  const totalFeePending = readCountMetric(summary, "MEMBERS_FEES_TOTAL_PENDING_AMT");

  const serviceTypeChartData = useMemo(() => {
    const values = Array.isArray(serviceTypeQuery.data?.serviceCategoryWiseValues)
      ? serviceTypeQuery.data.serviceCategoryWiseValues
      : [];

    return values.slice(0, 6).map((item: any) => ({
      label: item.byName ?? "Unknown",
      value: Number(item.value) || 0,
    }));
  }, [serviceTypeQuery.data]);

  const subscriptionChartData = useMemo(() => {
    const values = Array.isArray(subscriptionQuery.data?.subscriptionWiseValues)
      ? subscriptionQuery.data.subscriptionWiseValues
      : [];

    return values.slice(0, 6).map((item: any, index: number) => ({
      label: item.byName ?? `Type ${index + 1}`,
      value: Number(item.value) || 0,
    }));
  }, [subscriptionQuery.data]);

  const memberTrendData = useMemo(() => {
    const graph = memberGraphQuery.data?.[0];
    const labels = Array.isArray(graph?.labels) ? graph.labels : [];
    const memberSeries = Array.isArray(graph?.datasets?.[0]?.data?.[0]?.count)
      ? graph.datasets[0].data[0].count
      : [];

    return labels.map((label: string, index: number) => ({
      label,
      value: Number(memberSeries[index]) || 0,
    }));
  }, [memberGraphQuery.data]);

  const memberRows = useMemo(() => toMemberRows(membersQuery.data), [membersQuery.data]);
  const serviceRows = useMemo(() => toServiceRows(servicesQuery.data), [servicesQuery.data]);

  const quickActions: DashboardAction[] = [
      {
        key: "create-member",
        label: "Create Member",
        href: `${basePath}/members/create`,
        palette: "bg-cyan-50 text-cyan-700",
        iconKey: "create-member",
        visible: true,
      },
    {
        key: "members",
        label: "Members",
        href: `${basePath}/members`,
        palette: "bg-indigo-50 text-indigo-700",
        iconKey: "members",
        visible: true,
      },
    {
        key: "services",
        label: "Services",
        href: `${basePath}/service`,
        palette: "bg-sky-50 text-sky-700",
        iconKey: "services",
        visible: true,
      },
    {
        key: "fee-management",
        label: "Fee Management",
        href: `${basePath}/paymentInfo`,
        palette: "bg-amber-50 text-amber-700",
        iconKey: "fee-management",
        visible: true,
      },
    {
        key: "leads",
        label: "Leads",
        href: "/leadmgr/leads",
        palette: "bg-orange-50 text-orange-700",
        iconKey: "leads",
        visible: Boolean((account as any)?.enableCrmLead),
      },
    {
        key: "subscription-types",
        label: "Subscription Types",
        href: `${basePath}/memberType`,
        palette: "bg-violet-50 text-violet-700",
        iconKey: "subscription-types",
        visible: true,
      },
    {
        key: "service-types",
        label: "Service Types",
        href: `${basePath}/serviceType`,
        palette: "bg-emerald-50 text-emerald-700",
        iconKey: "service-types",
        visible: true,
      },
  ].filter((action) => action.visible);

  const memberColumns: ColumnDef<DashboardMember>[] = [
    {
      key: "name",
      header: "Name & ID",
      width: "28%",
      render: (member) => (
        <div className="min-w-0">
          <p className="m-0 truncate text-[length:var(--text-sm)] font-semibold text-slate-900">{member.name}</p>
          <p className="m-0 mt-1 text-[length:var(--text-xs)] text-slate-500">{member.id}</p>
        </div>
      ),
    },
    {
      key: "memberSince",
      header: "Member Since",
      width: "18%",
      render: (member) => member.memberSince,
    },
    {
      key: "contact",
      header: "Contact Details",
      width: "28%",
      render: (member) => <span className="text-[length:var(--text-xs)] text-slate-600">{member.contact}</span>,
    },
    {
      key: "status",
      header: "Membership Status",
      width: "14%",
      render: (member) => {
        const status = normalizeStatus(member.status);
        return (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[length:var(--text-xs)] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "12%",
      align: "right",
      render: (member) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            data-testid={`membership-dashboard-member-edit-${member.id}`}
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/members/update/${member.id}`);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid={`membership-dashboard-member-view-${member.id}`}
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/members/memberdetails/${member.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const serviceColumns: ColumnDef<DashboardService>[] = [
    {
      key: "name",
      header: "Service Name",
      render: (service) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <SmallServiceIcon />
          </span>
          <span className="font-medium text-slate-900">{service.name}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "24%",
      align: "right",
      render: (service) => (
        <Button
          size="sm"
          variant="outline"
          data-testid={`membership-dashboard-service-view-${service.id}`}
          onClick={(event) => {
            event.stopPropagation();
            window.location.assign(`${basePath}/service`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6" data-testid="membership-dashboard">
      <PageHeader
        title="Membership Dashboard"
        subtitle="Quick access to member activity, subscriptions, services, and collections."
      />

      <SectionCard title="Quick Actions" className="border-slate-200 shadow-sm">
        <div
          className="flex flex-row items-start overflow-x-auto pb-4 px-10"
          style={{ minHeight: 120, gap: '1.5rem' }}
        >
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              data-testid={`membership-dashboard-action-${action.key}`}
              onClick={() => window.location.assign(action.href)}
              className="group flex flex-col items-center justify-center w-[170px] h-[110px] min-w-[170px] max-w-[170px] min-h-[110px] max-h-[110px] rounded-2xl border border-slate-200 bg-white text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              style={{ width: 170, height: 110, margin: 0 }}
            >
              <MembershipIcon className={action.palette}>
                {renderMembershipActionIcon(action.iconKey)}
              </MembershipIcon>
              <div className="mt-2 text-[length:var(--text-md)] font-semibold leading-tight text-slate-900">{action.label}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
          <div className="grid gap-4 p-4 grid-cols-1 md:grid-cols-4">
          <KpiStrip
            label="Total Members"
            value={formatNumber(totalMembers)}
            trendLabel={`${formatNumber(activeMembers)} Active`}
            trendTone="success"
          />
          <KpiStrip
            label="Subscriptions"
            value={formatNumber(totalSubscriptions)}
            trendLabel={`${formatNumber(activeSubscriptions)} Active Subscriptions`}
            trendTone="success"
          />
          <KpiStrip
            label="Member Services"
            value={formatNumber(totalServices)}
            trendLabel={`${formatNumber(activeServices)} Active Services`}
            trendTone="success"
          />
          <KpiStrip
            label="Total Fee"
            value={formatCurrency(totalFee)}
            trendLabel={`${formatCurrency(totalFeePending)} Pending`}
            trendTone="danger"
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Service Types"
          actions={
            <Select
              options={timeRangeOptions}
              value={serviceTypeRange}
              onChange={(event) => setServiceTypeRange(event.target.value)}
              fullWidth={false}
              className="min-w-[170px]"
              testId="membership-dashboard-service-types-range"
            />
          }
          className="min-h-[420px] border-slate-200 shadow-sm"
        >
          {serviceTypeChartData.length > 0 ? (
            <BarChart
              data={serviceTypeChartData}
              formatYTick={(value) => String(value)}
              data-testid="membership-dashboard-service-types-chart"
            />
          ) : (
            <DashboardEmptyGraphic
              title="No service type activity"
              description="Service type analytics will appear here once services start getting assigned."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Subscription Types"
          actions={
            <Select
              options={timeRangeOptions}
              value={subscriptionRange}
              onChange={(event) => setSubscriptionRange(event.target.value)}
              fullWidth={false}
              className="min-w-[170px]"
              testId="membership-dashboard-subscription-range"
            />
          }
          className="min-h-[420px] border-slate-200 shadow-sm"
        >
          {subscriptionChartData.length > 0 ? (
            <PieChart
              data={subscriptionChartData}
              className="h-[320px] border-0 bg-transparent p-0"
              data-testid="membership-dashboard-subscription-chart"
            />
          ) : (
            <DashboardEmptyGraphic
              title="No subscription data"
              description="Subscription type distribution will appear here after members start subscribing."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Members"
          actions={
            <Select
              options={graphRangeOptions}
              value={membersRange}
              onChange={(event) => setMembersRange(event.target.value)}
              fullWidth={false}
              className="min-w-[170px]"
              testId="membership-dashboard-members-range"
            />
          }
          className="min-h-[420px] border-slate-200 shadow-sm"
        >
          {memberTrendData.length > 0 ? (
            <BarChart
              data={memberTrendData}
              formatYTick={(value) => String(value)}
              data-testid="membership-dashboard-members-chart"
            />
          ) : (
            <DashboardEmptyGraphic
              title="No member growth data"
              description="The member trend chart will populate after the graph analytics endpoint returns activity."
            />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <SectionCard
          title={`Members (${formatNumber(Number(memberCountQuery.data ?? 0))})`}
          className="border-slate-200 shadow-sm"
        >
          <DataTable
            data={memberRows}
            columns={memberColumns}
            getRowId={(row) => row.id}
            loading={membersQuery.isLoading}
            pagination={{
              page: membersPage,
              pageSize,
              total: Number(memberCountQuery.data ?? memberRows.length),
              onChange: setMembersPage,
              mode: "server",
            }}
            emptyState={
              <EmptyState
                title="No members found"
                description="Create members from the quick actions section to populate this list."
              />
            }
            data-testid="membership-dashboard-members-table"
          />
        </SectionCard>

        <SectionCard
          title={`Membership Services (${formatNumber(Number(serviceCountQuery.data ?? 0))})`}
          className="border-slate-200 shadow-sm"
        >
          <DataTable
            data={serviceRows}
            columns={serviceColumns}
            getRowId={(row) => row.id}
            loading={servicesQuery.isLoading}
            pagination={{
              page: servicesPage,
              pageSize,
              total: Number(serviceCountQuery.data ?? serviceRows.length),
              onChange: setServicesPage,
              mode: "server",
            }}
            emptyState={
              <EmptyState
                title="No membership services found"
                description="Create services from the quick actions section to populate this panel."
              />
            }
            data-testid="membership-dashboard-services-table"
          />
        </SectionCard>
      </div>

      {(summaryQuery.error || memberGraphQuery.error) && (
        <SectionCard title="Dashboard data" className="border-rose-200 bg-rose-50">
          <p className="m-0 text-[length:var(--text-sm)] text-rose-700">
            Some membership dashboard analytics could not be loaded.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function KpiStrip({
  label,
  value,
  trendLabel,
  trendTone,
}: {
  label: string;
  value: string;
  trendLabel: string;
  trendTone: "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-[length:var(--text-sm)] font-semibold text-slate-700">{label}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-[length:var(--text-xl)] font-bold text-slate-900">{value}</span>
        <span
          className={`text-[length:var(--text-md)] font-semibold ${
            trendTone === "success" ? "text-emerald-600" : "text-rose-700"
          }`}
        >
          {trendLabel}
        </span>
      </div>
    </div>
  );
}

function DashboardEmptyGraphic({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
      <div className="relative h-36 w-44">
        <div className="absolute bottom-0 left-6 h-20 w-28 rounded-2xl border border-indigo-200 bg-white shadow-sm" />
        <div className="absolute bottom-4 left-0 h-12 w-16 rounded-xl border border-indigo-200 bg-indigo-50" />
        <div className="absolute bottom-6 right-0 h-24 w-12 rounded-full bg-emerald-100" />
        <div className="absolute bottom-12 left-10 h-0.5 w-16 bg-indigo-300" />
        <div className="absolute bottom-[70px] left-11 h-10 w-0.5 origin-bottom rotate-[42deg] bg-indigo-300" />
        <div className="absolute bottom-[76px] left-[76px] h-0.5 w-10 -rotate-[28deg] bg-indigo-300" />
        <span className="absolute bottom-[60px] left-[20px] h-2.5 w-2.5 rounded-full bg-indigo-400" />
        <span className="absolute bottom-[84px] left-[72px] h-2.5 w-2.5 rounded-full bg-indigo-400" />
        <span className="absolute bottom-[74px] left-[106px] h-2.5 w-2.5 rounded-full bg-indigo-400" />
      </div>
      <p className="m-0 mt-4 text-[length:var(--text-md)] font-semibold text-slate-800">{title}</p>
      <p className="m-0 mt-2 max-w-[320px] text-[length:var(--text-sm)] text-slate-500">{description}</p>
    </div>
  );
}

function MemberPlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M4 23C5.8 19.6 8.5 18 12 18C14.1 18 15.8 18.5 17.2 19.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 11V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 15H25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M2.5 22C3.9 18.8 6.2 17 9 17C11.8 17 14.1 18.8 15.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.5 22C13.9 18.8 16.2 17 19 17C21.8 17 24.1 18.8 25.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="17" y="4" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="17" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M11 8H17" stroke="currentColor" strokeWidth="2" />
      <path d="M14 10V17" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function FeeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M6 7.5H22C23.1 7.5 24 8.4 24 9.5V18.5C24 19.6 23.1 20.5 22 20.5H6C4.9 20.5 4 19.6 4 18.5V9.5C4 8.4 4.9 7.5 6 7.5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12H20" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4.5V10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 4.5V10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LeadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="9" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M6 24C7.9 19.8 10.6 17.5 14 17.5C17.4 17.5 20.1 19.8 22 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 4L24.5 6.5L20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M7 5H18L23 10V21C23 22.1 22.1 23 21 23H7C5.9 23 5 22.1 5 21V7C5 5.9 5.9 5 7 5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M18 5V10H23" stroke="currentColor" strokeWidth="2" />
      <path d="M9 15H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 19H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ServiceTypeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 4L22 8.5V19.5L14 24L6 19.5V8.5L14 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 10.5L18 12.8V17.2L14 19.5L10 17.2V12.8L14 10.5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SmallServiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V8L10 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
