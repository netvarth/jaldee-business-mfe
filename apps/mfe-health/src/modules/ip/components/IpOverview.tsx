import { useMemo } from "react";
import { BarChart, EmptyState, MultiLineChart, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpDataset } from "../queries/ip";
import type { BarChartDatum, BarChartLegendItem, MultiLineChartDatum, MultiLineChartSeries } from "@jaldee/design-system";
import type { IpBedRow, IpDataset, IpPatientStatus } from "../types";

const DASHBOARD_ACTIONS = [
  { label: "New Admission", href: "admissions/new", icon: "NA" },
  { label: "Inpatients", href: "inpatient", icon: "IP" },
  { label: "Reservations", href: "registarionGrid", icon: "RS" },
  { label: "Buildings", href: "buildings", icon: "BL" },
  { label: "Floors", href: "floors", icon: "FL" },
  { label: "Rooms", href: "rooms", icon: "RM" },
  { label: "Beds", href: "beds", icon: "BD" },
  { label: "Occupancy", href: "occupancy", icon: "OC" },
  { label: "Services", href: "services", icon: "SV" },
  { label: "Admission Type", href: "registration", icon: "AT" },
  { label: "Activity Log", href: "activity-log", icon: "LG" },
  { label: "Discharge Temp.", href: "dischargeTemplate", icon: "DT" },
  { label: "Care Scheduler", href: "care-scheduler", icon: "CS" },
  { label: "Admissions Board", href: "calender", icon: "AB" },
];

const SUMMARY_CARD_STYLES = [
  "bg-teal-50 text-teal-700 ring-teal-100",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  "bg-orange-50 text-orange-700 ring-orange-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
] as const;

const BED_ANALYTICS_COLORS: Record<IpBedRow["occupancy"], string> = {
  Available: "#a8db82",
  Occupied: "#b39ddb",
  Cleaning: "#f2c94c",
};

const PATIENT_STATUS_LABELS: IpPatientStatus[] = ["Admitted", "Under Observation", "Ready for Discharge"];
const DAY_MS = 86_400_000;
const PATIENT_TREND_SERIES: MultiLineChartSeries[] = [
  { key: "admitted", label: "Total admitted patients", color: "#1e88e5" },
  { key: "reserved", label: "Total reserved patients", color: "#1bcf7a" },
  { key: "discharged", label: "Total discharged patients", color: "#f5a623" },
  { key: "checkedOut", label: "Total checked out patients", color: "#ff4560" },
  { key: "cancelled", label: "Cancelled Reservation", color: "#7e57c2" },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function CircularGauge({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="mx-auto flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#ede9fe" strokeWidth="14" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="pointer-events-none absolute text-center">
        <div className="text-4xl font-semibold text-slate-900">{value}%</div>
        <div className="text-sm font-medium text-slate-500">Occupied</div>
      </div>
    </div>
  );
}

function buildPatientTrendData(dataset: IpDataset): MultiLineChartDatum[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * DAY_MS);
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      shortLabel: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      fullLabel: new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(date),
      values: {
        admitted: 0,
        reserved: 0,
        discharged: 0,
        checkedOut: 0,
        cancelled: 0,
      },
    };
  });

  const pointIndex = new Map(points.map((point, index) => [point.key, index]));

  dataset.patients.forEach((patient) => {
    if (!patient.admittedOnRaw) return;
    const date = new Date(patient.admittedOnRaw);
    if (Number.isNaN(date.getTime())) return;

    const key = date.toISOString().slice(0, 10);
    const index = pointIndex.get(key);
    if (index === undefined) return;

    if (patient.status === "Admitted") {
      points[index].values.admitted += 1;
    } else if (patient.status === "Under Observation") {
      points[index].values.reserved += 1;
    } else if (patient.status === "Ready for Discharge") {
      points[index].values.discharged += 1;
    }
  });

  dataset.billing.forEach((row) => {
    const date = new Date(row.dueOn);
    if (Number.isNaN(date.getTime())) return;

    const key = date.toISOString().slice(0, 10);
    const index = pointIndex.get(key);
    if (index === undefined) return;

    if (row.status === "Paid") {
      points[index].values.checkedOut += 1;
    } else if (row.status === "Pending") {
      points[index].values.cancelled += 1;
    }
  });

  return points;
}

function buildBedAnalyticsChart(dataset: IpDataset): {
  data: BarChartDatum[];
  legend: BarChartLegendItem[];
} {
  const available = dataset.dashboard.bedStatusCounts.Available;
  const occupied = dataset.dashboard.bedStatusCounts.Occupied;
  const retained = dataset.dashboard.bedStatusCounts.Cleaning;
  const data: BarChartDatum[] = [
    { label: "Available", value: available, color: BED_ANALYTICS_COLORS.Available },
    { label: "Occupied", value: occupied, color: BED_ANALYTICS_COLORS.Occupied },
    { label: "Retained", value: retained, color: BED_ANALYTICS_COLORS.Cleaning },
    { label: "Blocked", value: 0, color: "#3b82f6" },
    { label: "Not Available", value: 0, color: "#3f437c" },
  ];

  return {
    data,
    legend: data.map((item) => ({
      label: item.label,
      color: item.color ?? "#000000",
    })),
  };
}

export function IpOverview() {
  const datasetQuery = useIpDataset();
  const dataset = datasetQuery.data;
  const { basePath, user } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const patientTrendData = useMemo(
    () => (dataset ? buildPatientTrendData(dataset) : []),
    [dataset]
  );
  const bedAnalyticsChart = useMemo(
    () => (dataset ? buildBedAnalyticsChart(dataset) : { data: [], legend: [] }),
    [dataset]
  );

  if (datasetQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-3">
            <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />
          </div>
        </SectionCard>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SectionCard key={index} className="border-slate-200 shadow-sm">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            </SectionCard>
          ))}
        </div>
      </div>
    );
  }

  if (datasetQuery.isError || !dataset) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Inpatient data unavailable"
          description="The IP dashboard could not be loaded from the live service."
        />
      </SectionCard>
    );
  }

  const welcomeName =
    String((user as { userName?: string; firstName?: string; name?: string } | null)?.userName ??
      (user as { firstName?: string } | null)?.firstName ??
      (user as { name?: string } | null)?.name ??
      "Provider").trim();

  const activeCount = dataset.dashboard.patientStatusCounts.Admitted + dataset.dashboard.patientStatusCounts["Under Observation"];
  const reservedCount = dataset.dashboard.patientStatusCounts["Under Observation"];
  const admittedCount = dataset.dashboard.patientStatusCounts.Admitted;
  const dischargedCount = dataset.dashboard.patientStatusCounts["Ready for Discharge"];
  const checkedOutCount = dataset.billing.filter((row) => row.status === "Paid").length;
  const cancelledCount = dataset.billing.filter((row) => row.status === "Pending").length;
  const analyticsCards = [
    { label: "Active", value: activeCount, icon: "AC" },
    { label: "Reserved", value: reservedCount, icon: "RS" },
    { label: "Admitted", value: admittedCount, icon: "AD" },
    { label: "Discharged", value: dischargedCount, icon: "DC" },
    { label: "Checked Out", value: checkedOutCount, icon: "CO" },
    { label: "Cancelled", value: cancelledCount, icon: "CN" },
  ];

  const infrastructureCards = [
    { label: "Buildings", value: dataset.dashboard.buildingsCount, href: `${basePath}/buildings`, accent: "bg-red-50 text-red-600" },
    { label: "Floors", value: dataset.dashboard.floorsCount, href: `${basePath}/floors`, accent: "bg-green-50 text-green-600" },
    { label: "Rooms", value: dataset.dashboard.roomsCount, href: `${basePath}/rooms`, accent: "bg-indigo-50 text-indigo-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-lg font-semibold text-slate-900">Welcome Back, {welcomeName}</div>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-5">
          <div>
            <div className="text-[28px] font-semibold tracking-tight text-indigo-700">IP Dashboard</div>
            <div className="mt-1 text-sm text-slate-500">Live management of In-patient care and occupancy.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {DASHBOARD_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(`${basePath}/${action.href}`)}
                className="flex min-h-[108px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm transition hover:border-indigo-200 hover:bg-slate-50"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">{action.icon}</div>
                <div className="text-sm font-semibold text-slate-900">{action.label}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate(`${basePath}/settings`)}
              className="flex min-h-[108px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm transition hover:border-indigo-200 hover:bg-slate-50"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">ED</div>
              <div className="text-sm font-semibold text-slate-900">Edit Actions</div>
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-5">
          <div className="text-2xl font-semibold text-slate-900">Patients Analytics</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {analyticsCards.map((item, index) => (
              <div
                key={item.label}
                className="min-h-[104px] rounded-2xl border border-slate-100 bg-white px-5 py-6 shadow-sm"
              >
                <div className="flex h-full items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1 ${SUMMARY_CARD_STYLES[index % SUMMARY_CARD_STYLES.length]}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="text-[15px] font-medium leading-5 text-slate-600">{item.label}</div>
                    <div className="mt-1 text-[18px] font-semibold leading-6 text-slate-900">{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-5">
            <div className="text-2xl font-semibold text-slate-900">Patient Last 7 Days Analytics</div>
            <MultiLineChart data={patientTrendData} series={PATIENT_TREND_SERIES} />
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-5">
            <div className="text-2xl font-semibold text-slate-900">Overview</div>
            <CircularGauge value={dataset.dashboard.occupancyRate} />

            <div className="space-y-3">
              {infrastructureCards.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 text-left shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${item.accent}`}>
                      {item.label === "Buildings" ? "BL" : item.label === "Floors" ? "FL" : "RM"}
                    </div>
                    <div>
                      <div className="text-3xl font-semibold leading-none text-slate-900">{item.value}</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">{item.label}</div>
                    </div>
                  </div>
                  <div className="text-3xl text-slate-400">&gt;</div>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-5">
            <div className="text-2xl font-semibold text-slate-900">
              Bed Analytics ({dataset.beds.length})
            </div>
            <BarChart
              data={bedAnalyticsChart.data}
              legend={bedAnalyticsChart.legend}
              yAxisLabel="Bed Count"
              tooltipSeriesLabel="Bed Count"
              showMenuIcon
              showValueInsideBars
              barRadius={8}
              roundTopOnly
              variant="report"
              showXAxisLabels={false}
              className="rounded-2xl border border-slate-100 bg-white p-4"
            />
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-5">
            <div className="text-2xl font-semibold text-slate-900">Active Inpatients</div>
            <div className="space-y-3">
              {PATIENT_STATUS_LABELS.map((label) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-500">{label}</div>
                    <div className="text-3xl font-semibold text-slate-900">{dataset.dashboard.patientStatusCounts[label]}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-indigo-50 p-5">
              <div className="text-sm font-medium text-indigo-700">Outstanding Billing</div>
              <div className="mt-2 text-3xl font-semibold text-indigo-900">
                {formatCurrency(dataset.billing.reduce((sum, row) => sum + row.amount, 0))}
              </div>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/billing`)}
                className="mt-4 text-sm font-semibold text-indigo-700"
              >
                Open Billing
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-2xl font-semibold text-slate-900">
            Inpatients ({dataset.patients.length})
          </div>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/inpatient`)}
            className="text-sm font-semibold text-indigo-700"
          >
            Open Inpatients
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dataset.patients.slice(0, 6).map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => navigate(`${basePath}/details/${row.id}`)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{row.patient}</div>
                  <div className="mt-1 text-sm text-slate-500">{row.ward}</div>
                  <div className="mt-2 text-sm text-slate-500">Doctor: {row.attendingDoctor}</div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {row.status}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
                <span>Admitted: {row.admittedOn}</span>
                <span>Stay: {row.stayDays} days</span>
              </div>
            </button>
          ))}
        </div>
        {dataset.patients.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No inpatient data"
              description="Admissions, bed occupancy, and inpatient billing will appear here once IP activity starts."
            />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

