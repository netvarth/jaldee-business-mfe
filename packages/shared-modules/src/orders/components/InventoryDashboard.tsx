import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogFooter, EmptyState, Icon, PieChart, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useInventoryDashboardDataset } from "../queries/orders";
import { formatOrdersCurrency } from "../services/orders";
import type { InventoryDashboardAction, InventoryDashboardMetric } from "../types";
import { OrdersItemsList } from "./OrdersItemsList";
import { SharedOrdersLayout } from "./shared";

const ACTION_STORAGE_KEY = "jaldee:inventory:dashboard-actions";
const INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID = "inventory-dashboard-actions";

const rangeOptions = [
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 12 Months" },
];

const itemVariantOptions = [
  { key: "categories", label: "Categories", icon: "layers" },
  { key: "groups", label: "Groups", icon: "box" },
  { key: "tags", label: "Tags", icon: "tag" },
  { key: "types", label: "Types", icon: "list" },
  { key: "manufacturers", label: "Manufacturers", icon: "database" },
  { key: "units", label: "Units", icon: "chart" },
  { key: "compositions", label: "Compositions", icon: "layers" },
  { key: "hsn-codes", label: "HSN Codes", icon: "box" },
  { key: "remarks", label: "Remarks", icon: "history" },
] as const;

export function InventoryDashboard() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const dashboardQuery = useInventoryDashboardDataset();
  const data = dashboardQuery.data;
  const [selectedActionKeys, setSelectedActionKeys] = useState<string[]>([]);
  const [draftSelectedActionKeys, setDraftSelectedActionKeys] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [range, setRange] = useState("week");

  const availableActions = useMemo(() => data?.actions.filter((action) => action.enabled !== false) ?? [], [data]);

  useEffect(() => {
    if (!availableActions.length) return;
    const availableKeys = availableActions.map(getActionKey);

    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(ACTION_STORAGE_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      const stored = Array.isArray(parsed) ? parsed.map(String).filter((key) => availableKeys.includes(key)) : [];
      setSelectedActionKeys(stored.length ? stored : availableKeys);
    } catch {
      setSelectedActionKeys(availableKeys);
    }
  }, [availableActions]);

  const visibleActions = useMemo(() => {
    if (!selectedActionKeys.length) return availableActions;
    const selected = new Set(selectedActionKeys);
    return availableActions.filter((action) => selected.has(getActionKey(action)));
  }, [availableActions, selectedActionKeys]);

  const variantHrefs = useMemo(
    () => itemVariantOptions.map((item) => ({ ...item, href: `${basePath}/inventory/${item.key}` })),
    [basePath]
  );

  function openEditActionsDialog() {
    setDraftSelectedActionKeys(visibleActions.map(getActionKey));
    setEditDialogOpen(true);
  }

  function saveEditActionsDialog() {
    const nextSelection = draftSelectedActionKeys.length
      ? availableActions.map(getActionKey).filter((key) => draftSelectedActionKeys.includes(key))
      : [];
    setSelectedActionKeys(nextSelection);
    try {
      window.localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(nextSelection));
    } catch {
      // Keep the in-memory dashboard selection if local storage is unavailable.
    }
    setEditDialogOpen(false);
  }

  function handleAction(action: InventoryDashboardAction) {
    if (action.actionType === "itemVariants") {
      setVariantDialogOpen(true);
      return;
    }
    navigate(appendCurrentReturnTo(action.href, INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID));
  }

  if (dashboardQuery.isLoading) {
    return (
      <SharedOrdersLayout title="Inventory Management" subtitle="Efficient tracking and control of items." showBack={false}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">Loading inventory dashboard...</div>
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (dashboardQuery.isError || !data) {
    return (
      <SharedOrdersLayout title="Inventory Management" subtitle="Efficient tracking and control of items." showBack={false}>
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title="Inventory dashboard unavailable" description="Inventory dashboard data could not be loaded for the current location." />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  return (
    <SharedOrdersLayout title={data.title} subtitle={data.subtitle} showBack={false}>
      <SectionCard className="border-slate-200 shadow-sm">
        <div id={INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID} data-testid={INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID} tabIndex={-1} className="flex scroll-mt-6 flex-wrap gap-4 focus:outline-none">
          {visibleActions.map((action) => (
            <DashboardAction key={getActionKey(action)} action={action} onClick={() => handleAction(action)} />
          ))}
          <DashboardAction
            action={{ label: "Edit Actions", href: "#", icon: "layers", actionType: "editActions" }}
            dashed
            onClick={openEditActionsDialog}
          />
        </div>
      </SectionCard>

      <SectionCard title="Stats" className="overflow-visible border-slate-200 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_minmax(300px,0.98fr)]">
          <MetricPanel title="Purchase Overview" metrics={data.purchaseMetrics} />
          <MetricPanel title="Sales Overview" metrics={data.salesMetrics} />
          <SectionCard title="Stocks" className="border-slate-100 shadow-none">
            <div className="space-y-3">
              {data.stockActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(appendCurrentReturnTo(action.href, INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID))}
                  className="flex min-h-[86px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white shadow-sm ${action.tone === "rose" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
                      <Icon name={action.icon} />
                    </span>
                    <span className="text-[15px] font-semibold leading-5 text-slate-900">{action.label}</span>
                  </span>
                  <span className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">View</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </SectionCard>

      <SectionCard
        title="Analytics"
        actions={<div className="w-44"><Select options={rangeOptions} value={range} onChange={(event) => setRange(event.target.value)} /></div>}
        className="border-slate-200 shadow-sm"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.65fr)_minmax(220px,0.42fr)]">
          <SectionCard
            title="Sales & Purchase Statistics"
            subtitle="Comparison between sales and purchase order"
            className="overflow-visible border-slate-100 shadow-none"
          >
            <InventoryTrendChart labels={data.graph.labels} purchase={data.graph.purchase} sales={data.graph.sales} />
          </SectionCard>
          <SectionCard title="Top Selling Stores" className="border-slate-100 shadow-none">
            {data.topSellingStores.length ? (
              <PieChart data={data.topSellingStores} variant="donut" showLabels={false} chartSize={220} holeInset={56} showTooltip className="h-[300px] p-3" />
            ) : (
              <EmptyState title="No store sales yet" description="Top selling stores will appear after sales are recorded." />
            )}
          </SectionCard>
          <SectionCard title="Customers" className="border-slate-100 shadow-none">
            <div className="space-y-3">
              <PeopleMetric value={data.customersTotal} label="Total Customers" tone="emerald" />
              <PeopleMetric value={data.vendorsTotal} label="Total Vendors" tone="blue" />
            </div>
          </SectionCard>
        </div>
      </SectionCard>

      <OrdersItemsList />

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Choose Dashboard Actions" size="md">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
          {availableActions.map((action) => {
            const key = getActionKey(action);
            const selected = draftSelectedActionKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setDraftSelectedActionKeys((current) =>
                    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                  )
                }
                className={`rounded-xl border px-3 py-4 text-center shadow-sm ${selected ? "border-blue-500 bg-blue-50/40" : "border-slate-200 bg-white"}`}
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                  <Icon name={action.icon} />
                </div>
                <div className="text-[15px] font-semibold leading-5 text-slate-900">{action.label}</div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button type="button" variant="primary" onClick={saveEditActionsDialog}>Done</Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={variantDialogOpen}
        onClose={() => setVariantDialogOpen(false)}
        title="Choose Item Variant"
        description=""
        size="fullscreen"
        contentClassName="h-auto max-h-[88vh] w-[min(96vw,1480px)] max-w-[96vw] overflow-y-auto rounded-2xl p-7 sm:p-8"
        headerClassName="mb-6"
        closeButtonClassName="text-slate-500 hover:bg-slate-100"
        closeIcon="x"
      >
        <div className="flex flex-wrap gap-4">
          {variantHrefs.map((item) => (
            <DashboardAction
              key={item.key}
              action={{ label: item.label, href: item.href, icon: item.icon }}
              onClick={() => {
                setVariantDialogOpen(false);
                navigate(appendCurrentReturnTo(item.href, INVENTORY_DASHBOARD_ACTIONS_FOCUS_ID));
              }}
            />
          ))}
        </div>
      </Dialog>
    </SharedOrdersLayout>
  );
}

function DashboardAction({ action, dashed = false, onClick }: { action: InventoryDashboardAction; dashed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[102px] w-[144px] shrink-0 rounded-2xl border bg-white px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${dashed ? "border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
          <Icon name={action.icon} />
        </div>
        <div className="text-[15px] font-semibold leading-5 text-slate-900">{action.label}</div>
      </div>
    </button>
  );
}

function MetricPanel({ title, metrics }: { title: string; metrics: InventoryDashboardMetric[] }) {
  return (
    <SectionCard title={title} className="border-slate-100 shadow-none">
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex min-h-[86px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white shadow-sm ${metricToneClass(metric.tone)}`}>
              <Icon name={metric.icon} />
            </span>
            <span className="min-w-0">
              <span className="block [overflow-wrap:anywhere] text-2xl font-semibold leading-7 text-slate-900">{metric.currency ? formatOrdersCurrency(metric.value) : metric.value}</span>
              <span className="mt-0.5 block text-sm font-medium text-slate-500">{metric.label}</span>
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PeopleMetric({ value, label, tone }: { value: number; label: string; tone: "emerald" | "blue" }) {
  return (
    <div className="min-h-[146px] rounded-xl border border-slate-100 bg-slate-50 px-4 py-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white shadow-sm ${tone === "emerald" ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"}`}>
        <Icon name="warehouse" />
      </div>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function InventoryTrendChart({ labels, purchase, sales }: { labels: string[]; purchase: number[]; sales: number[] }) {
  const chartLabels = labels.length ? labels : ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday"];
  const max = Math.max(2, ...purchase, ...sales);
  const width = 720;
  const height = 260;
  const margin = { top: 16, right: 18, bottom: 42, left: 54 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const points = (series: number[]) =>
    chartLabels.map((label, index) => {
      const value = series[index] ?? 0;
      return {
        label,
        value,
        x: margin.left + (index / Math.max(chartLabels.length - 1, 1)) * plotWidth,
        y: margin.top + plotHeight - (value / max) * plotHeight,
      };
    });
  const purchasePoints = points(purchase);
  const salesPoints = points(sales);
  const path = (items: ReturnType<typeof points>) => items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const ticks = Array.from({ length: 6 }, (_, index) => (max / 5) * index);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full" role="img" aria-label="Sales and purchase statistics">
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / max) * plotHeight;
          return (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#E2E8F0" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">{formatSmallCurrency(tick)}</text>
            </g>
          );
        })}
        <path d={path(salesPoints)} fill="none" stroke="#1D9BF0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(purchasePoints)} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {chartLabels.map((label, index) => (
          <text key={label} x={margin.left + (index / Math.max(chartLabels.length - 1, 1)) * plotWidth} y={height - 14} textAnchor="middle" fontSize="11" fill="#334155">{label}</text>
        ))}
      </svg>
      <div className="flex justify-center gap-4 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sky-500" />Sales</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" />Purchase</span>
      </div>
    </div>
  );
}

function metricToneClass(tone: InventoryDashboardMetric["tone"]) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-100 text-emerald-600";
    case "blue":
      return "bg-blue-100 text-blue-600";
    case "amber":
      return "bg-amber-100 text-amber-600";
    case "rose":
      return "bg-rose-100 text-rose-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatSmallCurrency(value: number) {
  if (value === 0) return "Rs 0";
  if (value >= 100000) return `Rs ${Math.round(value / 100000)}L`;
  if (value >= 1000) return `Rs ${Math.round(value / 1000)}k`;
  return `Rs ${Math.round(value)}`;
}

function getActionKey(action: InventoryDashboardAction) {
  return `${action.label}:${action.href}:${action.actionType ?? "route"}`;
}

function appendCurrentReturnTo(href: string, focusId?: string) {
  const returnTo = getCurrentReturnTo(focusId);
  if (!returnTo) return href;

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(href, origin);
    url.searchParams.set("returnTo", returnTo);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
  }
}

function getCurrentReturnTo(focusId?: string) {
  if (typeof window === "undefined") return "";
  const hash = focusId ? `#${encodeURIComponent(focusId)}` : window.location.hash;
  return `${window.location.pathname}${window.location.search}${hash}`;
}
