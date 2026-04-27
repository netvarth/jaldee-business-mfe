import {
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  PageHeader,
  PieChart,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useChannels, useLeadChart, useLeadPieChart, useLeads, useLeadsCount, useLeadStats } from "../queries/leads";
import { formatDate, fullName, mapLeadStatusLabel, unwrapCount, unwrapList, unwrapPayload } from "../utils";
import { StatusBadge } from "./shared";

type DashboardLeadRow = {
  uid: string;
  referenceNo: string;
  prospectName: string;
  channel: string;
  location: string;
  currentStage: string;
  owner: string;
  productOrService: string;
  status: string;
  leadDateRaw: string;
};

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "dateRange", label: "Date Range" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Leads" },
  { value: "ACTIVE", label: "Active Leads" },
  { value: "COMPLETED", label: "Converted Leads" },
  { value: "REJECTED", label: "Rejected Leads" },
  { value: "NO_RESPONSE", label: "No Response" },
];

const PIE_COLORS = ["#6610F2", "#FFA15B", "#6665DD", "#F4305F", "#3A8DF3"];
const DEFAULT_DATE_RANGE_DAYS = 7;

const ACTION_TILES = [
  { key: "create", label: "Create Lead", route: "leads/create", icon: LeadCreateIcon },
  { key: "leads", label: "Leads", route: "leads", icon: LeadsIcon },
  { key: "product", label: "Product/Service", route: "product-type", icon: ProductIcon },
  { key: "channels", label: "Channels", route: "channels", icon: ChannelIcon },
  { key: "audit", label: "Audit Log", route: "auditlog", icon: AuditIcon },
];

function toLeadRows(data: unknown): DashboardLeadRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    referenceNo: String(item.referenceNo ?? `LEAD-${index + 1}`),
    prospectName: fullName(item),
    channel: String(item.channelName ?? item.channel?.name ?? "-"),
    location: String(item.locationName ?? item.location?.place ?? "-"),
    currentStage: String(item.stageName ?? item.leadStage?.stageName ?? item.currentStage ?? "-"),
    owner: String(item.ownerName ?? item.assigneeName ?? "-"),
    productOrService: String(item.productName ?? item.crmLeadProductTypeName ?? item.productTypeName ?? "-"),
    status: String(item.internalStatus ?? item.status ?? ""),
    leadDateRaw: String(item.leadDate ?? item.createdDate ?? ""),
  }));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function filterRowsByRange(rows: DashboardLeadRow[], range: string) {
  const today = startOfDay(new Date());
  const rangeDays = range === "today" ? 1 : range === "month" ? 30 : 7;
  const threshold = new Date(today);
  threshold.setDate(today.getDate() - (rangeDays - 1));

  return rows.filter((row) => {
    if (!row.leadDateRaw) return false;
    const date = new Date(row.leadDateRaw);
    if (Number.isNaN(date.getTime())) return false;
    return startOfDay(date) >= threshold;
  });
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatChartTickLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildAnalyticsFilter(range: string, dateFrom: string, dateTo: string) {
  const filter: Record<string, string> = {};

  if (range === "week") {
    filter.category = "WEEKLY";
  } else if (range === "dateRange") {
    filter.category = "DATE_RANGE";
    filter.startDate = dateFrom;
    filter.endDate = dateTo;
  } else {
    filter.category = "TODAY";
  }

  return filter;
}

function readStatCount(payload: any, key: string) {
  const raw = payload?.[key];

  if (typeof raw === "number") {
    return raw;
  }

  if (raw && typeof raw === "object" && raw.count !== undefined) {
    return Number(raw.count) || 0;
  }

  return 0;
}

function buildDefaultTrendSeries() {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      label: formatDate(date.toISOString()).replace(/\s\d{4}$/, ""),
      series: [{ label: "QR Code", value: 0, color: "#5BA9FF" }],
    };
  });
}

export function LeadsDashboard() {
  const { basePath } = useSharedModulesContext();
  const today = useMemo(() => new Date(), []);
  const initialDateFrom = useMemo(() => {
    const value = new Date(today);
    value.setDate(today.getDate() - DEFAULT_DATE_RANGE_DAYS);
    return formatIsoDate(value);
  }, [today]);
  const initialDateTo = useMemo(() => formatIsoDate(today), [today]);
  const [range, setRange] = useState("today");
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadsDashboard",
    resetDeps: [appliedQuery, channelFilter, statusFilter],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (range !== "dateRange") return;

    const end = new Date(dateTo);
    const start = new Date(dateFrom);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const nextEnd = new Date();
      const nextStart = new Date();
      nextStart.setDate(nextEnd.getDate() - DEFAULT_DATE_RANGE_DAYS);
      setDateFrom(formatIsoDate(nextStart));
      setDateTo(formatIsoDate(nextEnd));
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
    if (diffDays > 10 || diffDays < 0) {
      const nextEnd = new Date();
      const nextStart = new Date();
      nextStart.setDate(nextEnd.getDate() - DEFAULT_DATE_RANGE_DAYS);
      setDateFrom(formatIsoDate(nextStart));
      setDateTo(formatIsoDate(nextEnd));
    }
  }, [dateFrom, dateTo, range]);

  const allLeadsQuery = useLeads({ from: 0, count: 200 });
  const channelsQuery = useChannels({});
  const analyticsFilter = useMemo(() => buildAnalyticsFilter(range, dateFrom, dateTo), [dateFrom, dateTo, range]);
  const leadStatsQuery = useLeadStats(analyticsFilter);
  const leadPieChartQuery = useLeadPieChart(analyticsFilter);
  const leadChartQuery = useLeadChart(
    useMemo(() => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      return {
        category: "DATE_RANGE",
        startDate: formatIsoDate(startDate),
        endDate: formatIsoDate(endDate),
      };
    }, [])
  );

  const tableFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(channelFilter !== "all" ? { "channelUid-eq": channelFilter } : {}),
      ...(statusFilter !== "all" ? { "internalStatus-eq": statusFilter } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, channelFilter, page, pageSize, statusFilter]
  );

  const tableCountFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(channelFilter !== "all" ? { "channelUid-eq": channelFilter } : {}),
      ...(statusFilter !== "all" ? { "internalStatus-eq": statusFilter } : {}),
    }),
    [appliedQuery, channelFilter, statusFilter]
  );

  const tableLeadsQuery = useLeads(tableFilters);
  const tableLeadCountQuery = useLeadsCount(tableCountFilters);

  const tableRows = useMemo(() => toLeadRows(tableLeadsQuery.data), [tableLeadsQuery.data]);
  const totalTableRows = unwrapCount(tableLeadCountQuery.data) || tableRows.length;
  const statsPayload = useMemo(() => unwrapPayload(leadStatsQuery.data) ?? {}, [leadStatsQuery.data]);
  const piePayload = useMemo(() => unwrapPayload(leadPieChartQuery.data) ?? {}, [leadPieChartQuery.data]);
  const chartPayload = useMemo(() => unwrapPayload(leadChartQuery.data) ?? {}, [leadChartQuery.data]);

  const convertedCount = readStatCount(statsPayload, "convertedCount");
  const pendingCount = readStatCount(statsPayload, "pendingCount");
  const rejectedCount = readStatCount(statsPayload, "rejectedCount");
  const totalCount = readStatCount(statsPayload, "totalCount");

  const channelAnalysis = useMemo(
    () => {
      if (Array.isArray(piePayload?.labels) && Array.isArray(piePayload?.data) && piePayload.labels.length > 0) {
        return piePayload.labels
          .map((label: string, index: number) => ({
            label,
            value: Number(piePayload?.data?.[index] ?? 0),
            color: PIE_COLORS[index % PIE_COLORS.length],
          }))
          .filter((item: { value: number }) => item.value > 0);
      }

      const datasets = Array.isArray(chartPayload?.datasets) ? chartPayload.datasets : [];
      return datasets
        .map((dataset: any, index: number) => ({
          label: String(dataset?.label ?? `Series ${index + 1}`),
          value: Array.isArray(dataset?.data)
            ? dataset.data.reduce((sum: number, value: unknown) => sum + (Number(value) || 0), 0)
            : 0,
          color: String(dataset?.borderColor ?? PIE_COLORS[index % PIE_COLORS.length]),
        }))
        .filter((item: { value: number }) => item.value > 0);
    },
    [chartPayload, piePayload]
  );

  const trendData = useMemo(() => {
    const labels = Array.isArray(chartPayload?.labels) ? chartPayload.labels : [];
    const datasets = Array.isArray(chartPayload?.datasets) ? chartPayload.datasets : [];

    if (labels.length === 0) {
      return buildDefaultTrendSeries();
    }

    return labels.map((label: string, index: number) => ({
      label,
      series: datasets
        .map((dataset: any, datasetIndex: number) => ({
          label: String(dataset?.label ?? `Series ${datasetIndex + 1}`),
          value: Number(dataset?.data?.[index] ?? 0),
          color: String(dataset?.borderColor ?? PIE_COLORS[datasetIndex % PIE_COLORS.length]),
        }))
        .filter((series: { label: string }) => {
          const source = datasets.find((dataset: any) => String(dataset?.label ?? "") === series.label);
          const total = Array.isArray(source?.data)
            ? source.data.reduce((sum: number, value: unknown) => sum + (Number(value) || 0), 0)
            : 0;
          return total > 0;
        }),
    }));
  }, [chartPayload]);

  const channelOptions = useMemo(
    () => [
      { value: "all", label: "All Channels" },
      ...unwrapList(channelsQuery.data).map((item: any) => ({
        value: String(item.uid ?? ""),
        label: String(item.name ?? "-"),
      })),
    ],
    [channelsQuery.data]
  );

  const columns = useMemo<ColumnDef<DashboardLeadRow>[]>(
    () => [
      { key: "referenceNo", header: "Lead Id", render: (row) => <span className="font-semibold text-slate-900">{row.referenceNo}</span> },
      { key: "prospectName", header: "Prospect Name" },
      { key: "channel", header: "Channel" },
      { key: "location", header: "Location" },
      { key: "currentStage", header: "Current Stage" },
      { key: "owner", header: "Owner" },
      { key: "productOrService", header: "Product/Service" },
      { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/leads/details/${row.uid}`);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Lead Suite" />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-4">
          {ACTION_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => window.location.assign(`${basePath}/${tile.route}`)}
                className="w-[132px] rounded-2xl border border-slate-200 bg-white px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#5B49D6]">
                    <Icon />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{tile.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-950">Lead Stats</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {range === "dateRange" ? (
                <>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatTile title="Converted Count" value={convertedCount} tone="green" icon={<ConvertedIcon />} />
            <StatTile title="Pending Count" value={pendingCount} tone="blue" icon={<PendingIcon />} />
            <StatTile title="Rejected Count" value={rejectedCount} tone="orange" icon={<RejectedIcon />} />
            <StatTile title="Total Count" value={totalCount} tone="violet" icon={<TotalIcon />} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
            <SectionCard title="Channel Analysis" className="border-slate-200 shadow-sm">
              {channelAnalysis.length > 0 ? (
                <PieChart
                  data={channelAnalysis}
                  variant="donut"
                  showLabels={false}
                  chartSize={196}
                  holeInset={54}
                  className="h-[260px] border-0 bg-transparent p-0"
                />
              ) : (
                <EmptyState title="No channel data" description="Lead channel analysis will appear when analytics data is available." />
              )}
            </SectionCard>

            <SectionCard title="Channel Type Analysis" className="border-slate-200 shadow-sm">
              <LeadTrendChart data={trendData} />
            </SectionCard>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Leads ({totalTableRows})</h2>
            <div className="grid gap-3 xl:grid-cols-[1.15fr_1.15fr_0.95fr_auto]">
              <DataTableToolbar
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder="Search with lead id"
              />
              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="h-[38px] rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-white px-3 text-sm text-slate-700"
              >
                {channelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-[38px] rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-white px-3 text-sm text-slate-700"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="flex h-[38px] w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-[#4C1D95] shadow-sm"
                aria-label="Filters"
              >
                <FilterIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={tableRows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={tableLeadsQuery.isLoading || tableLeadCountQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/leads/details/${row.uid}`)}
            pagination={{
              page,
              pageSize,
              total: totalTableRows,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No leads found" description="Adjust the filters or create a new lead to populate the dashboard table." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function StatTile({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: number;
  tone: "green" | "blue" | "orange" | "violet";
  icon: React.ReactNode;
}) {
  const toneStyles = {
    green: "bg-emerald-50 text-emerald-500",
    blue: "bg-sky-50 text-sky-500",
    orange: "bg-orange-50 text-orange-500",
    violet: "bg-violet-50 text-violet-500",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneStyles[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function LeadTrendChart({ data }: { data: Array<{ label: string; series: Array<{ label: string; value: number; color: string }> }> }) {
  const width = 760;
  const height = 272;
  const margin = { top: 18, right: 52, bottom: 56, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const seriesList = Array.from(
    new Map(
      data.flatMap((item) => item.series.map((series) => [series.label, { label: series.label, color: series.color }]))
    ).values()
  );
  const maxValue = Math.max(
    ...data.flatMap((item) => item.series.map((series) => series.value)),
    1
  );
  const seriesPoints = seriesList.map((series) => {
    const points = data.map((item, index) => {
      const match = item.series.find((entry) => entry.label === series.label);
      const value = Number(match?.value ?? 0);
      const x = margin.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
      const y = margin.top + plotHeight - (value / maxValue) * plotHeight;
      return { x, y, value, label: item.label };
    });
    return {
      ...series,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    };
  });
  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
        {seriesList.map((series) => (
          <span key={series.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-8 rounded-sm border-2" style={{ borderColor: series.color, backgroundColor: `${series.color}22` }} />
            <span>{series.label}</span>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[272px] w-full" role="img" aria-label="Lead trend chart">
        {[0, 1].map((tick) => {
          const y = margin.top + plotHeight - tick * plotHeight;
          return (
            <line
              key={tick}
              x1={margin.left}
              x2={width - margin.right}
              y1={y}
              y2={y}
              stroke="#CBD5E1"
              strokeWidth="1"
            />
          );
        })}

        {data.map((item, index) => {
          const x = margin.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
          return (
            <line
              key={`grid-${item.label}`}
              x1={x}
              x2={x}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {seriesPoints.map((series) => (
          <g key={series.label}>
            <polyline fill="none" stroke={series.color} strokeWidth="3" points={series.polyline} />
            {series.points.map((point) => (
              <circle key={`${series.label}-${point.label}`} cx={point.x} cy={point.y} r="4" fill={series.color} />
            ))}
          </g>
        ))}

        {data.map((item, index) => {
          const x = margin.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
          const textAnchor =
            index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";
          return (
            <text key={item.label} x={x} y={height - 18} textAnchor={textAnchor} fontSize="10" fill="#475569">
              {formatChartTickLabel(item.label)}
            </text>
          );
        })}

        <text x={12} y={margin.top + 6} fontSize="12" fill="#334155">
          {maxValue}
        </text>
        <text x={12} y={margin.top + plotHeight + 6} fontSize="12" fill="#334155">
          0
        </text>
      </svg>
    </div>
  );
}

function LeadCreateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4a4 4 0 110 8 4 4 0 010-8z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 5.5v5m2.5-2.5h-5" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="11" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="17" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 7h9M11 13h9M11 18.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h10l2 3-7 7-7-7 2-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7v10" stroke="#F59E0B" strokeWidth="1.8" />
      <circle cx="18.5" cy="6.5" r="2.5" stroke="#5B49D6" strokeWidth="1.8" />
    </svg>
  );
}

function ChannelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17l10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 6.5l8 8" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h7l4 4v12H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="10.5" cy="14.5" r="2.5" stroke="#84CC16" strokeWidth="1.8" />
    </svg>
  );
}

function ConvertedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 15l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 19h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5v14M16 5v14M5 8h14M5 16h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RejectedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 14a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM16.5 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 18a4.5 4.5 0 018 0M13 18a3.8 3.8 0 017 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18l-7 8v5.5a1 1 0 01-1.5.86l-2-1.15a1 1 0 01-.5-.86V13L3 5z" />
    </svg>
  );
}
