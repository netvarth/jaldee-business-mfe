import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Button,
  ChartTooltip,
  DataTable,
  DataTableToolbar,
  EmptyState,
  PageHeader,
  PieChart,
  SectionCard,
  Select,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useAnalytics,
  useChangeMemberStatus,
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
  uid: string;
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function distributeAcrossTail(total: number, slots: number) {
  const safeTotal = Math.max(0, Math.round(total));
  const result = Array.from({ length: slots }, () => 0);

  for (let index = 0; index < safeTotal; index += 1) {
    result[slots - 1 - (index % slots)] += 1;
  }

  return result;
}

function mapFrequency(range: string) {
  if (range === "week") return "WEEKLY";
  if (range === "day") return "TODAY";
  return "MONTHLY";
}

function mapGraphCategory(range: string) {
  return range === "week" ? "WEEKLY" : "MONTHLY";
}

function unwrapAnalyticsPayload<T>(value: T): T {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function readNumericResponse(value: unknown) {
  const unwrapped = unwrapAnalyticsPayload(value);
  return Number(unwrapped) || 0;
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

function normalizeMetricKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function extractGraphSeries(
  graph: any,
  matchers: string[]
): Array<number> {
  const normalizedMatchers = matchers.map((matcher) => normalizeMetricKey(matcher));
  const datasets = Array.isArray(graph?.datasets) ? graph.datasets : [];

  for (const dataset of datasets) {
    const datasetKeys = [
      dataset?.label,
      dataset?.name,
      dataset?.seriesName,
      dataset?.metricName,
      dataset?.key,
    ].map((value) => normalizeMetricKey(value));

    if (datasetKeys.some((key) => normalizedMatchers.includes(key))) {
      const values = Array.isArray(dataset?.data?.[0]?.count)
        ? dataset.data[0].count
        : Array.isArray(dataset?.data)
          ? dataset.data.map((item: any) =>
              Number(
                item?.count ??
                item?.value ??
                item?.y ??
                item
              ) || 0
            )
          : [];

      if (values.length > 0) {
        return values;
      }
    }

    const nestedMetrics = Array.isArray(dataset?.data) ? dataset.data : [];
    for (const item of nestedMetrics) {
      const nestedKeys = [
        item?.label,
        item?.name,
        item?.seriesName,
        item?.metricName,
        item?.key,
      ].map((value) => normalizeMetricKey(value));

      if (nestedKeys.some((key) => normalizedMatchers.includes(key))) {
        const values = Array.isArray(item?.count)
          ? item.count
          : Array.isArray(item?.data)
            ? item.data.map((entry: any) => Number(entry?.value ?? entry?.count ?? entry) || 0)
            : [];

        if (values.length > 0) {
          return values;
        }
      }
    }
  }

  return [];
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
      uid: String(member.uid ?? member.id ?? member.memberId ?? index),
      id: member.internalMemberCustomId ? String(member.internalMemberCustomId) : "",
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

function toStatusOptionValue(status: string) {
  const value = String(status ?? "").trim().toUpperCase();

  if (value === "ACTIVE") return "Active";
  if (value === "INACTIVE") return "Inactive";
  if (value === "PENDING") return "Pending";
  if (value === "ENABLED") return "Active";
  if (value === "DISABLED") return "Inactive";

  return "Pending";
}

function getAllowedStatusOptions(status: string) {
  const currentStatus = toStatusOptionValue(status);

  if (currentStatus === "Active") {
    return [{ value: "Inactive", label: "Inactive" }];
  }

  if (currentStatus === "Pending") {
    return [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ];
  }

  return [{ value: "Active", label: "Active" }];
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
  const { basePath, account, assetsBaseUrl } = useSharedModulesContext();
  const membershipEmptyStateAsset = assetsBaseUrl
    ? `${assetsBaseUrl.replace(/\/+$/, "")}/assets/images/membership/subscription.gif`
    : undefined;
  const leadGeneratedAsset = assetsBaseUrl
    ? `${assetsBaseUrl.replace(/\/+$/, "")}/assets/images/membership/dashboard-actions/leadGenerated.png`
    : undefined;
  const leadConvertedAsset = assetsBaseUrl
    ? `${assetsBaseUrl.replace(/\/+$/, "")}/assets/images/membership/dashboard-actions/leadConverted.png`
    : undefined;
  const [serviceTypeRange, setServiceTypeRange] = useState("month");
  const [subscriptionRange, setSubscriptionRange] = useState("month");
  const [membersRange, setMembersRange] = useState("month");
  const [leadsRange, setLeadsRange] = useState("month");
  const [servicesOverviewRange, setServicesOverviewRange] = useState("month");
  const [membersPage, setMembersPage] = useState(1);
  const [servicesPage, setServicesPage] = useState(1);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [appliedMemberSearchQuery, setAppliedMemberSearchQuery] = useState("");
  const [appliedServiceSearchQuery, setAppliedServiceSearchQuery] = useState("");
  const pageSize = 10;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedMemberSearchQuery(memberSearchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [memberSearchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedServiceSearchQuery(serviceSearchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [serviceSearchQuery]);

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
  const leadsGraphQuery = useGraphAnalyticsData([
    {
      category: mapGraphCategory(leadsRange),
      type: "BARCHART",
      filter: {
        config_metric_type: "MEMBERSHIP_DASHBOARD_GRAPH",
      },
    },
  ]);

  const memberFilters = {
    ...(appliedMemberSearchQuery ? { "firstName-like": appliedMemberSearchQuery } : {}),
    ...(memberStatusFilter !== "all" ? { status: memberStatusFilter } : {}),
  };
  const serviceFilters = {
    ...(appliedServiceSearchQuery ? { "servicename-like": appliedServiceSearchQuery } : {}),
  };

  const memberCountQuery = useMemberCount(memberFilters);
  const membersQuery = useMembers({
    ...memberFilters,
    from: (membersPage - 1) * pageSize,
    count: pageSize,
  });
  const serviceCountQuery = useServiceCount(serviceFilters);
  const servicesQuery = useServices({
    ...serviceFilters,
    from: (servicesPage - 1) * pageSize,
    count: pageSize,
  });

  const summary = unwrapAnalyticsPayload(summaryQuery.data ?? {});
  const serviceTypeAnalytics = unwrapAnalyticsPayload(serviceTypeQuery.data ?? {});
  const subscriptionAnalytics = unwrapAnalyticsPayload(subscriptionQuery.data ?? {});
  const totalMembers = readCountMetric(summary, "MEMBERS_COUNT");
  const activeMembers = readCountMetric(summary, "MEMBERS_ACTIVE_COUNT");
  const leadsGenerated = readCountMetric(summary, "CRM_LEAD_TOTAL_COUNT");
  const convertedLeads = readCountMetric(summary, "MEMBERS_CONVERTED_FROM_LEADS");
  const totalSubscriptions = readCountMetric(
    summary,
    "MEMBERS_SUBSCRIPTION_TYPE_COUNT",
    "MEMBERS_SUBSRIPTION_COUNT"
  );
  const activeSubscriptions = readCountMetric(summary, "MEMBERS_SUBSCRIPTION_TYPE_ACTIVE_COUNT");
  const totalServices = readCountMetric(summary, "MEMBERS_SERVICE_COUNT");
  const activeServices = readCountMetric(summary, "MEMBERS_SERVICE_ACTIVE_COUNT");
  const totalFee = readCountMetric(summary, "MEMBERS_FEES_TOTAL_AMT");
  const totalFeePending = readCountMetric(summary, "MEMBERS_FEES_TOTAL_PENDING_AMT");

  const serviceTypeChartData = useMemo(() => {
    const values = Array.isArray(serviceTypeAnalytics?.serviceCategoryWiseValues)
      ? serviceTypeAnalytics.serviceCategoryWiseValues
      : [];

    return values.slice(0, 6).map((item: any) => ({
      label: item.byName ?? "Unknown",
      value: Number(item.value) || 0,
    }));
  }, [serviceTypeAnalytics]);

  const subscriptionChartData = useMemo(() => {
    const values = Array.isArray(subscriptionAnalytics?.subscriptionWiseValues)
      ? subscriptionAnalytics.subscriptionWiseValues
      : [];
    const subscriptionPalette = ["#2EF04F", "#FF5A36", "#2EF04F", "#FF5A36", "#2EF04F", "#FF5A36"];

    if (values.length > 0) {
      return values
        .slice(0, 6)
        .map((item: any, index: number) => ({
          label: item.byName ?? `Type ${index + 1}`,
          value: Number(item.value) || 0,
          color: subscriptionPalette[index % subscriptionPalette.length],
        }))
        .filter((item: { label: string; value: number }) => item.value > 0);
    }

    if (subscriptionRange !== "month") {
      return [];
    }

    const inactiveSubscriptions = Math.max(totalSubscriptions - activeSubscriptions, 0);

    return [
      {
        label: "Active",
        value: activeSubscriptions,
        color: "#2EF04F",
      },
      {
        label: "Inactive",
        value: inactiveSubscriptions,
        color: "#FF5A36",
      },
    ].filter((item) => item.value > 0);
  }, [activeSubscriptions, subscriptionAnalytics, subscriptionRange, totalSubscriptions]);

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

  const leadsChartData = useMemo(() => {
    const graph = leadsGraphQuery.data?.[0];
    const defaultLabels =
      leadsRange === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

    const graphLabels = Array.isArray(graph?.labels) ? graph.labels : [];
    const leadSeries = extractGraphSeries(graph, [
      "leads",
      "lead",
      "crmleadtotalcount",
      "crmleads",
    ]);
    const convertedSeries = extractGraphSeries(graph, [
      "converted",
      "convertedleads",
      "membersconvertedfromleads",
      "leadconverted",
    ]);
    const hasRealLeadGraphData = graphLabels.length > 0 && (leadSeries.length > 0 || convertedSeries.length > 0);

    const labels = hasRealLeadGraphData
      ? graphLabels
      : leadsRange === "month" && memberTrendData.length > 0
        ? memberTrendData.map((item: { label: string; value: number }) => item.label)
        : defaultLabels;

    if (hasRealLeadGraphData) {
      return labels.map((label: string, index: number) => ({
        label,
        leads: Number(leadSeries[index]) || 0,
        converted: Number(convertedSeries[index]) || 0,
      }));
    }

    const leadsTail = distributeAcrossTail(leadsGenerated, Math.min(3, labels.length));
    const convertedTail = distributeAcrossTail(convertedLeads, Math.min(2, labels.length));
    const leadsStart = Math.max(0, labels.length - leadsTail.length);
    const convertedStart = Math.max(0, labels.length - convertedTail.length);

    return labels.map((label: string, index: number) => {
      const leadsValue = index >= leadsStart ? leadsTail[index - leadsStart] : 0;
      const convertedValue = index >= convertedStart ? convertedTail[index - convertedStart] : 0;

      return {
        label,
        leads: leadsValue,
        converted: convertedValue,
      };
    });
  }, [convertedLeads, leadsGenerated, leadsGraphQuery.data, leadsRange, memberTrendData]);

  const memberRows = useMemo(() => toMemberRows(membersQuery.data), [membersQuery.data]);
  const serviceRows = useMemo(() => toServiceRows(servicesQuery.data), [servicesQuery.data]);
  const filteredMemberRows = useMemo(() => {
    const searchValue = appliedMemberSearchQuery.trim().toLowerCase();

    return memberRows.filter((member) => {
      const matchesSearch = !searchValue || [
        member.name,
        member.id,
        member.contact,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesStatus =
        memberStatusFilter === "all" ||
        toStatusOptionValue(member.status).toLowerCase() === memberStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [appliedMemberSearchQuery, memberRows, memberStatusFilter]);
  const totalMemberCount = readNumericResponse(memberCountQuery.data);
  const totalServiceCount = readNumericResponse(serviceCountQuery.data);
  const changeMemberStatusMutation = useChangeMemberStatus();
  const isMemberSearchPending = memberSearchQuery.trim() !== appliedMemberSearchQuery;
  const isServiceSearchPending = serviceSearchQuery.trim() !== appliedServiceSearchQuery;
  const shouldClearMemberRows = isMemberSearchPending;
  const shouldClearServiceRows = isServiceSearchPending;
  const visibleMemberRows =
    shouldClearMemberRows || totalMemberCount === 0 ? [] : filteredMemberRows;
  const visibleServiceRows = shouldClearServiceRows ? [] : serviceRows;

  const quickActions = [
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
  ] satisfies DashboardAction[];

  const visibleQuickActions = quickActions.filter((action) => action.visible);

  const memberColumns: ColumnDef<DashboardMember>[] = [
    {
      key: "name",
      header: "Name & ID",
      width: "28%",
      render: (member) => (
        <div className="min-w-0">
          <p className="m-0 truncate text-[length:var(--text-sm)] font-semibold text-slate-900">{member.name}</p>
          {member.id ? (
            <p className="m-0 mt-1 text-[length:var(--text-xs)] text-slate-500">{member.id}</p>
          ) : null}
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
        const currentStatus = toStatusOptionValue(member.status);
        const allowedOptions = getAllowedStatusOptions(member.status);
        return (
          <select
            value=""
            disabled={changeMemberStatusMutation.isPending}
            className={`rounded-full border px-2.5 py-1 pr-8 text-[length:var(--text-xs)] font-semibold outline-none ${status.className}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextStatus = event.target.value;

              if (nextStatus === currentStatus) return;

              changeMemberStatusMutation.mutate({
                uid: member.uid,
                statusId: nextStatus,
              });
            }}
          >
            <option value="" disabled>
              {status.label}
            </option>
            {allowedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
              window.location.assign(`${basePath}/members/update/${member.uid}`);
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
              window.location.assign(`${basePath}/members/memberdetails/${member.uid}`);
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
    <div className="space-y-6" data-testid="membership-dashboard">
      <PageHeader
        title="Membership Dashboard"
        subtitle="Quick access to member activity, subscriptions, services, and collections."
      />

      <SectionCard title="Quick Actions" className="border-slate-200 shadow-sm">
        <div
          className="flex flex-wrap gap-3 pb-3 px-0 sm:px-2 md:px-4 lg:px-6"
          style={{ minHeight: 120 }}
        >
          {visibleQuickActions.map((action) => (
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
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiStrip
            label="Total Members"
            value={formatNumber(totalMembers)}
            trendValue={activeMembers}
            trendLabel={`${formatNumber(activeMembers)} Active`}
            trendTone="success"
          />
          <KpiStrip
            label="Subscriptions"
            value={formatNumber(totalSubscriptions)}
            trendValue={activeSubscriptions}
            trendLabel={`${formatNumber(activeSubscriptions)} Active Subscriptions`}
            trendTone="success"
          />
          <KpiStrip
            label="Member Services"
            value={formatNumber(totalServices)}
            trendValue={activeServices}
            trendLabel={`${formatNumber(activeServices)} Active Services`}
            trendTone="success"
          />
          <KpiStrip
            label="Total Fee"
            value={formatCurrency(totalFee)}
            trendValue={-totalFeePending}
            trendLabel={`${formatCurrency(totalFeePending)} Pending`}
            trendTone="danger"
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-full">
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
            className="h-full min-h-[420px] border-slate-200 shadow-sm"
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
                imageSrc={membershipEmptyStateAsset}
              />
            )}
          </SectionCard>
        </div>

        <div className="h-full">
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
            className="h-full min-h-[420px] border-slate-200 shadow-sm"
          >
            {subscriptionChartData.length > 0 ? (
              <PieChart
                data={subscriptionChartData}
                variant="donut"
                showLabels={false}
                showTooltip
                holeInset={60}
                chartSize={248}
                className="h-[360px] border-0 bg-transparent p-0"
                data-testid="membership-dashboard-subscription-chart"
              />
            ) : (
              <DashboardEmptyGraphic
                title="No subscription data"
                description="Subscription type distribution will appear here after members start subscribing."
                imageSrc={membershipEmptyStateAsset}
              />
            )}
          </SectionCard>
        </div>

        <div className="h-full md:col-span-2 lg:col-span-1">
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
            className="h-full min-h-[420px] border-slate-200 shadow-sm"
          >
            {memberTrendData.length > 0 ? (
              <MemberLineChart
                data={memberTrendData}
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard
          title="Leads"
          className="h-full border-slate-200 shadow-sm"
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <LeadMetricTile
                icon={<LeadMetricIcon tone="orange" imageSrc={leadGeneratedAsset} />}
                label="Leads Generated"
                value={formatNumber(leadsGenerated)}
              />
              <LeadMetricTile
                icon={<LeadMetricIcon tone="green" imageSrc={leadConvertedAsset} />}
                label="Converted Leads"
                value={formatNumber(convertedLeads)}
              />
            </div>

            <div className="flex justify-end">
              <Select
                options={graphRangeOptions}
                value={leadsRange}
                onChange={(event) => setLeadsRange(event.target.value)}
                fullWidth={false}
                className="min-w-[170px]"
                testId="membership-dashboard-leads-range"
              />
            </div>

            <LeadsComparisonChart
              data={leadsChartData}
              data-testid="membership-dashboard-leads-chart"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Services"
          className="h-full border-slate-200 shadow-sm"
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Select
                options={timeRangeOptions}
                value={servicesOverviewRange}
                onChange={(event) => setServicesOverviewRange(event.target.value)}
                fullWidth={false}
                className="min-w-[170px]"
                testId="membership-dashboard-services-overview-range"
              />
            </div>

            <DashboardEmptyGraphic
              title="No services activity"
              description="Service analytics will appear here once services start getting assigned."
              imageSrc={membershipEmptyStateAsset}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 items-stretch"
          style={{
            gridTemplateColumns: "1fr",
          }}
          ref={(el) => {
            if (el && window.innerWidth >= 1280) {
              el.style.gridTemplateColumns = "65% 1fr";
            }
          }}
        >
        <div className="min-w-0 overflow-x-auto">
          <SectionCard
            title={`Members (${formatNumber(totalMemberCount)})`}
            className="border-slate-200 shadow-sm"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={memberSearchQuery}
                onQueryChange={(value) => {
                  setMemberSearchQuery(value);
                  setMembersPage(1);
                }}
                searchPlaceholder="Search members by name, ID, phone or email..."
                recordCount={
                  appliedMemberSearchQuery || memberStatusFilter !== "all"
                    ? filteredMemberRows.length
                    : totalMemberCount
                }
              />
              </div>
              <Select
                options={[
                  { value: "all", label: "All Status" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING", label: "Pending" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
                value={memberStatusFilter}
                onChange={(event) => {
                  setMemberStatusFilter(event.target.value);
                  setMembersPage(1);
                }}
                fullWidth={false}
                className="min-w-[170px]"
                testId="membership-dashboard-members-status-filter"
              />
            </div>
            <DataTable
              key={`members-${appliedMemberSearchQuery}-${memberStatusFilter}-${membersPage}`}
              data={visibleMemberRows}
              columns={memberColumns}
              getRowId={(row) => row.id}
              loading={membersQuery.isLoading || memberCountQuery.isLoading || shouldClearMemberRows}
              pagination={{
                page: membersPage,
                pageSize,
                total:
                  appliedMemberSearchQuery || memberStatusFilter !== "all"
                    ? filteredMemberRows.length
                    : totalMemberCount || memberRows.length,
                onChange: setMembersPage,
                mode:
                  appliedMemberSearchQuery || memberStatusFilter !== "all"
                    ? "client"
                    : "server",
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
        </div>

        <div className="min-w-0 overflow-x-auto">
          <SectionCard
            title={`Membership Services (${formatNumber(totalServiceCount)})`}
            className="border-slate-200 shadow-sm"
          >
            <div className="mb-4">
              <DataTableToolbar
                query={serviceSearchQuery}
                onQueryChange={(value) => {
                  setServiceSearchQuery(value);
                  setServicesPage(1);
                }}
                searchPlaceholder="Search membership services..."
                recordCount={totalServiceCount}
              />
            </div>
            <DataTable
              data={visibleServiceRows}
              columns={serviceColumns}
              getRowId={(row) => row.id}
              loading={servicesQuery.isLoading || serviceCountQuery.isLoading || shouldClearServiceRows}
              pagination={{
                page: servicesPage,
                pageSize,
                total: totalServiceCount || serviceRows.length,
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
  trendValue,
  trendLabel,
  trendTone,
}: {
  label: string;
  value: string;
  trendValue: number;
  trendLabel: string;
  trendTone: "success" | "danger";
}) {
  const isPositiveTrend = trendValue >= 0;
  const trendTextClass = trendTone === "danger"
    ? "text-red-700"
    : isPositiveTrend
      ? "text-emerald-600"
      : "text-red-700";

  return (
    <div className="min-h-[172px] rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-[length:var(--text-lg)] font-semibold text-slate-900">{label}</div>
      <div className="mt-5 flex flex-wrap items-baseline gap-3">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-slate-950">{value}</span>
        <span
          className={`inline-flex items-center gap-1.5 text-[length:var(--text-md)] font-semibold ${trendTextClass}`}
        >
          <TrendArrow direction={isPositiveTrend ? "up" : "down"} />
          {trendLabel}
        </span>
      </div>
    </div>
  );
}

function TrendArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {direction === "up" ? (
          <path
            d="M4 12L12 4M12 4H7.5M12 4V8.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M4 4L12 12M12 12H7.5M12 12V7.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function DashboardEmptyGraphic({
  title,
  description,
  imageSrc,
}: {
  title: string;
  description: string;
  imageSrc?: string;
}) {
  if (imageSrc) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-white p-6 text-center">
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="h-auto w-full max-w-[340px] object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-white p-6 text-center">
      <div className="relative h-[220px] w-full max-w-[360px]">
        <div className="absolute left-4 top-[80px] h-[44px] w-[84px] rounded-[6px] border border-indigo-300 bg-indigo-50">
          <svg viewBox="0 0 84 44" className="h-full w-full p-3 text-indigo-400">
            <path
              d="M10 28L26 14L41 22L58 10L72 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="28" r="2.8" fill="currentColor" />
            <circle cx="26" cy="14" r="2.8" fill="currentColor" />
            <circle cx="41" cy="22" r="2.8" fill="currentColor" />
            <circle cx="58" cy="10" r="2.8" fill="currentColor" />
            <circle cx="72" cy="18" r="2.8" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute left-[110px] top-[34px] flex h-[58px] w-[86px] items-center justify-center rounded-[6px] border border-indigo-300 bg-indigo-50">
          <div className="flex items-center gap-2 text-indigo-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-indigo-400 text-[11px] font-semibold">82</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-indigo-200 text-[11px] font-semibold">40</span>
          </div>
        </div>
        <div className="absolute right-[22px] top-[42px] flex h-[58px] w-[86px] items-center justify-center rounded-[6px] border border-indigo-300 bg-indigo-50">
          <div className="h-9 w-9 rounded-full bg-[conic-gradient(#5a67d8_0_72%,#c7d2fe_72%_100%)]" />
        </div>
        <div className="absolute bottom-[26px] left-[14px] h-[54px] w-[28px] rounded-[8px] border border-indigo-300 bg-indigo-100">
          <div className="mx-auto mt-3 h-8 w-3 rounded-full bg-indigo-400" />
          <div className="mx-auto mt-1 h-1.5 w-3 rounded-full bg-indigo-300" />
        </div>
        <div className="absolute bottom-0 left-[92px] h-[108px] w-[168px] rounded-[10px] border border-indigo-300 bg-white shadow-sm">
          <div className="h-3 rounded-t-[10px] border-b border-indigo-100 bg-indigo-50" />
          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="col-span-3 h-9 rounded-md border border-indigo-100 bg-indigo-50" />
            <div className="h-8 rounded-md border border-indigo-100 bg-white" />
            <div className="h-8 rounded-md border border-indigo-100 bg-white" />
            <div className="h-8 rounded-md border border-indigo-100 bg-white" />
            <div className="col-span-2 h-12 rounded-md border border-indigo-100 bg-white" />
            <div className="h-12 rounded-md border border-indigo-100 bg-indigo-50" />
          </div>
        </div>
        <div className="absolute bottom-[24px] left-[84px] h-[4px] w-[220px] rounded-full bg-indigo-300" />
        <div className="absolute bottom-[30px] right-[42px] h-[42px] w-[42px] rounded-full border-[3px] border-indigo-400">
          <div className="absolute left-[28px] top-[26px] h-[22px] w-[4px] rotate-[-42deg] rounded-full bg-indigo-400" />
        </div>
        <div className="absolute bottom-[26px] right-[8px]">
          <div className="relative h-[90px] w-[72px]">
            <span className="absolute bottom-0 left-1/2 h-[44px] w-[18px] -translate-x-1/2 rounded-t-full bg-emerald-300" />
            <span className="absolute bottom-[24px] left-0 h-[24px] w-[28px] rotate-[-28deg] rounded-full bg-emerald-200" />
            <span className="absolute bottom-[42px] right-0 h-[24px] w-[28px] rotate-[28deg] rounded-full bg-emerald-200" />
            <span className="absolute bottom-[54px] left-[6px] h-[22px] w-[24px] rotate-[-20deg] rounded-full bg-emerald-200" />
            <span className="absolute bottom-[68px] right-[10px] h-[20px] w-[22px] rotate-[22deg] rounded-full bg-emerald-200" />
          </div>
        </div>
      </div>
      <p className="m-0 mt-4 text-[length:var(--text-md)] font-semibold text-slate-800">{title}</p>
      <p className="m-0 mt-2 max-w-[320px] text-[length:var(--text-sm)] text-slate-500">{description}</p>
    </div>
  );
}

function LeadMetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[112px] items-start gap-7 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <span className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-2xl">
        {icon}
      </span>
      <div className="min-w-0 p-3">
        <p className="m-0 text-[28px] pb-2 leading-none text-slate-900 sm:text-[length:var(--text-lg)]">{label}</p>
        <p className="m-0 text-[40px] font-semibold leading-none text-slate-950 sm:text-[34px]">{value}</p>
      </div>
    </div>
  );
}

function LeadMetricIcon({
  tone,
  imageSrc,
}: {
  tone: "orange" | "green";
  imageSrc?: string;
}) {
  const isOrange = tone === "orange";
  const boxClass = isOrange ? "bg-orange-500" : "bg-emerald-500";

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        width={60}
        height={60}
        className="h-[60px] w-[60px] object-contain"
      />
    );
  }

  return (
    <span className={`flex h-[74px] w-[74px] items-center justify-center rounded-2xl ${boxClass} text-white`}>
      {isOrange ? <LeadGeneratedIcon /> : <LeadConvertedIcon />}
    </span>
  );
}

function LeadsComparisonChart({
  data,
  "data-testid": testId,
}: {
  data: Array<{ label: string; leads: number; converted: number }>;
  "data-testid"?: string;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: "Leads" | "Converted";
    value: number;
    color: string;
  } | null>(null);
  const width = 760;
  const height = 300;
  const margin = { top: 42, right: 12, bottom: 64, left: 42 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.leads, item.converted]),
    1
  );
  const roundedMax = Math.max(1, Math.ceil(maxValue));
  const ticks = Array.from({ length: roundedMax + 1 }, (_, index) => index);
  const groupWidth = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(22, Math.max(10, groupWidth * 0.32));

  return (
    <div data-testid={testId} className="relative w-full">
      {tooltip ? (
        <ChartTooltip {...tooltip} />
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full" role="img" aria-label="Leads comparison chart">
        <g>
          <rect x={width / 2 - 86} y={10} width={18} height={10} rx={2} fill="#f43f86" />
          <text x={width / 2 - 60} y={19} fontSize="13" fill="#475569">Converted</text>
          <rect x={width / 2 + 12} y={10} width={18} height={10} rx={2} fill="#0ea5e9" />
          <text x={width / 2 + 36} y={19} fontSize="13" fill="#475569">Leads</text>
        </g>

        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / roundedMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e5e7eb" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((item, index) => {
          const groupX = margin.left + groupWidth * index;
          const centerX = groupX + groupWidth / 2;
          const convertedHeight = (item.converted / roundedMax) * plotHeight;
          const leadsHeight = (item.leads / roundedMax) * plotHeight;

          return (
            <g key={item.label}>
              <line
                x1={centerX}
                x2={centerX}
                y1={margin.top}
                y2={margin.top + plotHeight}
                stroke="#eef2ff"
              />
              <rect
                x={centerX - barWidth - 4}
                y={margin.top + plotHeight - convertedHeight}
                width={barWidth}
                height={convertedHeight}
                rx={2}
                fill="#f43f86"
                onMouseEnter={() =>
                  setTooltip({
                    x: ((centerX - barWidth / 2 - 4) / width) * 100,
                    y: ((margin.top + plotHeight - convertedHeight) / height) * 100,
                    label: item.label,
                    series: "Converted",
                    value: item.converted,
                    color: "#f43f86",
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
              </rect>
              <rect
                x={centerX + 4}
                y={margin.top + plotHeight - leadsHeight}
                width={barWidth}
                height={leadsHeight}
                rx={2}
                fill="#0ea5e9"
                onMouseEnter={() =>
                  setTooltip({
                    x: ((centerX + barWidth / 2 + 4) / width) * 100,
                    y: ((margin.top + plotHeight - leadsHeight) / height) * 100,
                    label: item.label,
                    series: "Leads",
                    value: item.leads,
                    color: "#0ea5e9",
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
              </rect>
              <text
                x={centerX}
                y={height - 10}
                textAnchor="end"
                transform={`rotate(-24 ${centerX} ${height - 10})`}
                fontSize="12"
                fill="#475569"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MemberLineChart({
  data,
  "data-testid": testId,
}: {
  data: Array<{ label: string; value: number }>;
  "data-testid"?: string;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: "Members";
    value: number;
    color: string;
  } | null>(null);
  const width = 640;
  const height = 340;
  const margin = { top: 34, right: 24, bottom: 94, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const roundedMax = Math.max(1, Math.ceil(maxValue));
  const ticks = Array.from({ length: roundedMax + 1 }, (_, index) => index);

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = margin.left + stepX * index;
    const y = margin.top + plotHeight - (item.value / roundedMax) * plotHeight;
    return { ...item, x, y };
  });

  const path = buildSmoothLinePath(points);

  return (
    <div data-testid={testId} className="relative w-full">
      {tooltip ? (
        <ChartTooltip {...tooltip} />
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[404px] w-full" role="img" aria-label="Members line chart">
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / roundedMax) * plotHeight;

          return (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e5e7eb" />
              <text x={margin.left - 14} y={y + 5} textAnchor="end" fontSize="14" fontWeight="500" fill="#334155">
                {tick}
              </text>
            </g>
          );
        })}

        {points.map((point) => (
          <line
            key={`grid-${point.label}`}
            x1={point.x}
            x2={point.x}
            y1={margin.top}
            y2={margin.top + plotHeight}
            stroke="#e2e8f0"
          />
        ))}

        <g>
          <circle cx={width / 2 - 34} cy={14} r={8} fill="#ffffff" stroke="#5b21b6" strokeWidth="2" />
          <text x={width / 2 - 22} y={18} fontSize="14" fontWeight="500" fill="#334155">
            Members
          </text>
        </g>

        <path d={path} fill="none" stroke="#4418b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              onMouseEnter={() =>
                setTooltip({
                  x: (point.x / width) * 100,
                  y: (point.y / height) * 100,
                  label: point.label,
                  series: "Members",
                  value: point.value,
                  color: "#6d28d9",
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#ffffff"
              stroke="#6d28d9"
              strokeWidth="2"
            />
          </g>
        ))}

        {points.map((point) => (
          <text
            key={`label-${point.label}`}
            x={point.x}
            y={height - 26}
            textAnchor="middle"
            transform={`rotate(-32 ${point.x} ${height - 26})`}
            fontSize="14"
            fontWeight="500"
            fill="#334155"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function LeadGeneratedIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <path d="M6 10H18M6 17H15M6 24H14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="23.5" cy="19.5" r="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M17 29C18.5 25.6 20.8 24 23.5 24C26.2 24 28.5 25.6 30 29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function LeadConvertedIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="3" />
      <circle cx="22.5" cy="10.5" r="3.5" stroke="currentColor" strokeWidth="3" />
      <circle cx="24.5" cy="19.5" r="4.5" stroke="currentColor" strokeWidth="3" />
      <path d="M5 28C6.6 23.8 9.4 22 12.5 22C15.5 22 18.2 23.8 19.8 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 28C19 25.1 21 24 23.3 24C25.5 24 27.4 25.1 28.5 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function buildSmoothLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const nextNext = points[index + 2] ?? next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current.y + (next.y - previous.y) / 6;
    const controlPoint2X = next.x - (nextNext.x - current.x) / 6;
    const controlPoint2Y = next.y - (nextNext.y - current.y) / 6;

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`;
  }

  return path;
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
