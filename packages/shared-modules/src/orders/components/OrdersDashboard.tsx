import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Badge,
  Button,
  ComparisonBarChart,
  DataTable,
  Dialog,
  DialogFooter,
  EmptyState,
  Icon,
  PieChart,
  SectionCard,
  Select,
  Tabs,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useOrdersDataset, useOrdersOrdersPage } from "../queries/orders";
import { buildOrdersDetailHref, formatOrdersCurrency, getOrdersStatusVariant } from "../services/orders";
import { SharedOrdersLayout } from "./shared";
import type { OrdersOrderRow, OrdersRequestRow } from "../types";

type DashboardView = "orders" | "rxRequests";

const actionAccentClassMap = {
  indigo: "border-indigo-200 bg-white",
  emerald: "border-emerald-200 bg-white",
  amber: "border-amber-200 bg-white",
  rose: "border-rose-200 bg-white",
  slate: "border-slate-200 bg-white",
} as const;

const analyticsRangeOptions = [
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "180", label: "Last 180 Days" },
] as const;

const statsRangeOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "range", label: "Date Range" },
] as const;

const ACTION_STORAGE_PREFIX = "jaldee:orders:dashboard-actions";
const DEFAULT_TABLE_PAGE_SIZE = 10;

export function OrdersDashboard() {
  const { data, error, isError, isLoading } = useOrdersDataset();
  const { product, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [currentView, setCurrentView] = useState<DashboardView | null>(null);
  const [statsRange, setStatsRange] = useState("today");
  const [analyticsRange, setAnalyticsRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedActionKeys, setSelectedActionKeys] = useState<string[]>([]);
  const [draftSelectedActionKeys, setDraftSelectedActionKeys] = useState<string[]>([]);

  const resolvedView = currentView ?? data?.defaultDashboardView ?? "orders";
  const ordersPageQuery = useOrdersOrdersPage(tablePage, tablePageSize, {
    enabled: Boolean(data) && resolvedView === "orders",
  });
  const availableActions = useMemo(() => data?.actions.filter((action) => action.enabled !== false) ?? [], [data]);
  const actionStorageKey = useMemo(() => `${ACTION_STORAGE_PREFIX}:${product}`, [product]);

  useEffect(() => {
    if (!availableActions.length) return;

    const availableActionKeys = availableActions.map(getActionKey);
    const fallbackKeys = availableActionKeys;

    if (typeof window === "undefined") {
      setSelectedActionKeys(fallbackKeys);
      return;
    }

    try {
      const raw = window.localStorage.getItem(actionStorageKey);
      if (!raw) {
        setSelectedActionKeys(fallbackKeys);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setSelectedActionKeys(fallbackKeys);
        return;
      }

      const filtered = parsed
        .map((item) => String(item))
        .filter((item) => availableActionKeys.includes(item));

      setSelectedActionKeys(filtered.length ? filtered : fallbackKeys);
    } catch {
      setSelectedActionKeys(fallbackKeys);
    }
  }, [actionStorageKey, availableActions]);

  const visibleActions = useMemo(() => {
    if (!selectedActionKeys.length) return availableActions;
    const selectedSet = new Set(selectedActionKeys);
    return availableActions.filter((action) => selectedSet.has(getActionKey(action)));
  }, [availableActions, selectedActionKeys]);

  const pagedOrders = ordersPageQuery.data?.rows ?? data?.orders ?? [];
  const ordersTotal = ordersPageQuery.data?.total ?? data?.orders.length ?? 0;

  const ordersRows = useMemo(() => {
    return pagedOrders.map((row, index) => mapOrderRow(row, index));
  }, [pagedOrders]);

  const requestRows = useMemo(() => {
    if (!data) return [];
    return data.requests.map((row, index) => mapRequestRow(row, index));
  }, [data]);

  const visibleRows = resolvedView === "rxRequests" ? requestRows : ordersRows;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const totalSales = data?.adminAnalytics.todaySalesAmount ?? 0;

  const filteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.primaryName,
          row.secondaryName,
          row.orderDate,
          row.orderId,
          row.orderSource,
          row.store,
          row.status,
          row.paymentStatus,
          row.type,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [normalizedQuery, statusFilter, visibleRows]);

  const ordersFiltersActive = resolvedView === "orders" && Boolean(normalizedQuery || statusFilter !== "all");
  const tableTotal = resolvedView === "orders" && !ordersFiltersActive ? ordersTotal : filteredRows.length;
  const tablePaginationMode = resolvedView === "orders" && !ordersFiltersActive ? "server" : "client";
  const tableTotalPages = Math.max(1, Math.ceil(tableTotal / tablePageSize));
  const tableStartRecord = tableTotal === 0 ? 0 : (tablePage - 1) * tablePageSize + 1;
  const tableEndRecord = tableTotal === 0 ? 0 : Math.min(tablePage * tablePageSize, tableTotal);

  useEffect(() => {
    setTablePage(1);
  }, [resolvedView, normalizedQuery, statusFilter, tablePageSize]);

  useEffect(() => {
    const totalRows = tablePaginationMode === "server" ? tableTotal : filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / tablePageSize));
    if (tablePage > totalPages) {
      setTablePage(totalPages);
    }
  }, [filteredRows.length, tablePage, tablePageSize, tablePaginationMode, tableTotal]);

  const orderColumns = useMemo(
    () => [
      {
        key: "patient",
        header: product === "health" ? "Patient" : "Customer",
        render: (row: DashboardTableRow) => <PersonCell row={row} />,
      },
      {
        key: "dateOrder",
        header: "Date & Order Id",
        render: (row: DashboardTableRow) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{row.orderDate}</div>
            <div className="text-sm text-slate-500">{row.orderId}</div>
          </div>
        ),
      },
      { key: "orderSource", header: "Order Source" },
      { key: "store", header: "Store" },
      {
        key: "status",
        header: "Status",
        render: (row: DashboardTableRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row: DashboardTableRow) => (
          <span className={paymentStatusClassName(row.paymentStatus)}>{row.paymentStatus}</span>
        ),
      },
      { key: "type", header: "Type" },
      { key: "itemCount", header: "No Of Items", align: "right" as const },
      {
        key: "actions",
        header: "Actions",
        align: "center" as const,
        render: (row: DashboardTableRow) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(buildOrdersDetailHref(basePath, row.id, product))}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath, navigate, product]
  );

  const requestColumns = useMemo(
    () => [
      {
        key: "patient",
        header: product === "health" ? "Patient" : "Customer",
        render: (row: DashboardTableRow) => <PersonCell row={row} />,
      },
      {
        key: "dateOrder",
        header: "Date & Request Id",
        render: (row: DashboardTableRow) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{row.orderDate}</div>
            <div className="text-sm text-slate-500">{row.orderId}</div>
          </div>
        ),
      },
      { key: "orderSource", header: "Request Source" },
      { key: "store", header: "Store" },
      {
        key: "status",
        header: "Status",
        render: (row: DashboardTableRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
      { key: "doctor", header: "Doctor" },
      { key: "type", header: "Type" },
      { key: "itemCount", header: "Items", align: "right" as const },
      {
        key: "actions",
        header: "Actions",
        align: "center" as const,
        render: () => (
          <Button type="button" variant="outline" size="sm">
            View
          </Button>
        ),
      },
    ],
    [product]
  );

  const totalOrders = ordersTotal;
  const totalItems = ordersRows.reduce((sum, row) => sum + row.itemCount, 0);
  const paidOrders = ordersRows.filter((row) => row.paymentStatus === "Fully Paid").length;
  const partiallyPaidOrders = ordersRows.filter((row) => row.paymentStatus === "Partially Paid").length;
  const salesSeries = useMemo(
    () => data?.adminAnalytics.weeklySalesPoints?.length ? data.adminAnalytics.weeklySalesPoints : buildSalesSeries(data?.orders ?? []),
    [data?.adminAnalytics.weeklySalesPoints, data?.orders]
  );
  const soldItemsSeries = useMemo(
    () => data?.adminAnalytics.weeklyItemPoints?.length ? data.adminAnalytics.weeklyItemPoints : buildItemsSeries(data?.orders ?? []),
    [data?.adminAnalytics.weeklyItemPoints, data?.orders]
  );
  const orderTypeBreakdown = useMemo(() => buildOrderTypeBreakdown(ordersRows), [ordersRows]);
  const requestBreakdown = useMemo(() => buildRequestBreakdown(requestRows), [requestRows]);

  const visibleStatusOptions = useMemo(() => {
    const statuses = Array.from(new Set(visibleRows.map((row) => row.status)));
    return [{ value: "all", label: resolvedView === "rxRequests" ? "All Requests" : "All Orders" }, ...statuses.map((status) => ({ value: status, label: status }))];
  }, [resolvedView, visibleRows]);

  function openEditActionsDialog() {
    setDraftSelectedActionKeys(visibleActions.map(getActionKey));
    setEditDialogOpen(true);
  }

  function toggleDraftAction(actionKey: string) {
    setDraftSelectedActionKeys((current) =>
      current.includes(actionKey) ? current.filter((item) => item !== actionKey) : [...current, actionKey]
    );
  }

  function closeEditActionsDialog() {
    setEditDialogOpen(false);
  }

  function resetDraftActionSelection() {
    setDraftSelectedActionKeys(availableActions.map(getActionKey));
  }

  function saveEditActionsDialog() {
    const nextSelection = draftSelectedActionKeys.length
      ? availableActions.map(getActionKey).filter((actionKey) => draftSelectedActionKeys.includes(actionKey))
      : [];

    setSelectedActionKeys(nextSelection);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(actionStorageKey, JSON.stringify(nextSelection));
      } catch {
        // Ignore storage failures and keep the in-memory selection.
      }
    }

    setEditDialogOpen(false);
  }

  if (isLoading) {
    return (
      <SharedOrdersLayout title="Sales Order" subtitle="Streamlined sales tracking.">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">Loading dashboard actions...</div>
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (isError) {
    const errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "The sales-order dashboard data could not be loaded for the current location.";

    return (
      <SharedOrdersLayout title="Sales Order" subtitle="Streamlined sales tracking.">
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title="Dashboard unavailable" description={errorMessage} />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (!data) {
    return (
      <SharedOrdersLayout title="Sales Order" subtitle="Streamlined sales tracking.">
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="No dashboard data"
            description="The sales-order dashboard returned no data for the current location."
          />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  const analytics = data.adminAnalytics;

  return (
    <SharedOrdersLayout
      title={data.title}
      subtitle={data.subtitle}
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => navigate(visibleActions[0]?.route ?? "#")}>
          Create Order
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-4">
          {visibleActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.route)}
              className={`h-[102px] w-[144px] shrink-0 rounded-2xl border px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${actionAccentClassMap[action.accent]}`}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
                  {resolveActionIcon(action.imageKey)}
                </div>
                <div className="text-[15px] font-semibold leading-5 text-slate-900">{action.label}</div>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={openEditActionsDialog}
            className="h-[102px] w-[144px] shrink-0 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
                <Icon name="layers" />
              </div>
              <div className="text-[15px] font-semibold leading-5 text-slate-900">Edit Actions</div>
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Stats"
        actions={
          <div className="w-44">
            <Select
              options={statsRangeOptions.map((item) => ({ value: item.value, label: item.label }))}
              value={statsRange}
              onChange={(event) => setStatsRange(event.target.value)}
            />
          </div>
        }
        className="overflow-visible border-slate-200 shadow-sm"
      >
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.78fr_0.98fr]">
          <SectionCard className="overflow-visible border-slate-100 shadow-none" title="Today Sales">
            <div className="space-y-2.5">
              <div>
                <div className="text-2xl font-semibold text-slate-900">{formatOrdersCurrency(totalSales)}</div>
                <div className="mt-0.5 text-sm text-slate-500">{statsRangeLabel(statsRange)} sales</div>
              </div>
              <AreaChart
                data={salesSeries}
                formatYTick={(value) => (value === 0 ? "0" : `Rs ${value}`)}
                footerLabel="Weekly"
                showToolbar
                downloadFilePrefix="sales-chart"
                chartHeight={432}
              />
            </div>
          </SectionCard>

          <div className="space-y-3">
            <SectionCard className="border-slate-100 shadow-none" title="Total Orders">
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-slate-900">{totalOrders}</div>
                <div className="text-sm text-slate-500">Current orders distribution</div>
                <PieChart data={orderTypeBreakdown} variant="donut" chartSize={132} showLabels={false} showTooltip className="h-[188px] p-3" />
              </div>
            </SectionCard>
            <SectionCard className="border-slate-100 shadow-none" title="Online Orders">
              <div className="space-y-2">
                <div className="text-2xl font-semibold text-slate-900">{requestRows.length}</div>
                <div className="text-sm text-slate-500">Requests and online flow</div>
                <PieChart data={requestBreakdown} variant="donut" chartSize={132} showLabels={false} showTooltip className="h-[188px] p-3" />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-3">
            <SectionCard className="border-slate-100 shadow-none" title="Sales Amount">
              <div className="space-y-2.5">
                <MetricLine label="Total Sales Amount" value={formatOrdersCurrency(totalSales)} tone="default" />
                <MetricLine label="Total Sales Amount Due" value={formatOrdersCurrency(partiallyPaidOrders * 420)} tone="danger" />
              </div>
            </SectionCard>
            <SectionCard className="border-slate-100 shadow-none" title="Total Items Quantity Sold">
              <div className="space-y-3">
                <div className="text-2xl font-semibold text-slate-900">{totalItems}</div>
                <ComparisonBarChart data={soldItemsSeries} chartHeight={204} />
              </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Analytics"
        actions={
          <div className="w-44">
            <Select options={analyticsRangeOptions.map((item) => ({ value: item.value, label: item.label }))} value={analyticsRange} onChange={(event) => setAnalyticsRange(event.target.value)} />
          </div>
        }
        className="border-slate-200 shadow-sm"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <AnalyticsCard
            metrics={[
              { label: "Item Searches", value: String(analytics.itemSearches) },
              { label: "Item Details Page Views", value: String(analytics.itemDetailsPageViews) },
              { label: "Items Added To Cart", value: String(analytics.itemsAddedToCart) },
            ]}
          />
          <AnalyticsCard
            metrics={[
              { label: "Cart Checkouts Initiated", value: String(analytics.cartCheckoutsInitiated) },
              { label: "Checkout Abandonment Rate", value: formatAnalyticsPercent(analytics.checkoutAbandonmentRate) },
              { label: "Provider Coupon Applied", value: String(analytics.providerCouponApplied) },
            ]}
          />
          <AnalyticsCard
            metrics={[
              { label: "Payments Initiated", value: String(analytics.paymentsInitiated) },
              { label: "Payments Completed", value: String(analytics.paymentsCompleted), tone: "success" },
              { label: "Payments Failed", value: String(analytics.paymentsFailed), tone: "danger" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <Tabs
            value={resolvedView}
            onValueChange={(value) => setCurrentView(value as DashboardView)}
            items={[
              ...(data.capabilities.canViewOrders ? [{ value: "orders", label: "Orders", count: ordersTotal }] : []),
              ...(data.canShowRequests ? [{ value: "rxRequests", label: "Requests", count: requestRows.length }] : []),
            ]}
          />
        </div>

        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-900">
                {resolvedView === "rxRequests" ? `Requests (${requestRows.length})` : `Orders (${ordersTotal})`}
              </div>
              {resolvedView === "orders" ? (
                <div className="text-sm text-slate-500">
                  Showing {tableStartRecord} to {tableEndRecord} of {tableTotal} records
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(280px,1fr)_220px_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={resolvedView === "rxRequests" ? "Search with patient or prescription" : "Search with patient"}
                  className="h-[38px] w-full rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] pl-10 pr-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                />
              </div>
              <Select options={visibleStatusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
              <Button type="button" variant="outline" size="sm">
                Filter
              </Button>
            </div>
          </div>
          {resolvedView === "orders" && tableTotalPages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTablePage(1)} disabled={tablePage === 1}>
                First
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTablePage(Math.max(1, tablePage - 1))}
                disabled={tablePage === 1}
              >
                Prev
              </Button>
              <div className="min-w-[108px] text-center text-sm text-slate-500">
                Page {tablePage} of {tableTotalPages}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTablePage(Math.min(tableTotalPages, tablePage + 1))}
                disabled={tablePage === tableTotalPages}
              >
                Next
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTablePage(tableTotalPages)}
                disabled={tablePage === tableTotalPages}
              >
                Last
              </Button>
            </div>
          ) : null}
        </div>

        <DataTable
          data={filteredRows}
          columns={resolvedView === "rxRequests" ? requestColumns : orderColumns}
          loading={resolvedView === "orders" ? ordersPageQuery.isLoading : false}
          pagination={{
            page: tablePage,
            pageSize: tablePageSize,
            total: tableTotal,
            mode: tablePaginationMode,
            onChange: setTablePage,
            onPageSizeChange: setTablePageSize,
          }}
          emptyState={
            <EmptyState
              title={resolvedView === "rxRequests" ? "No requests available" : "No orders available"}
              description={
                resolvedView === "rxRequests"
                  ? "Prescription and order requests will appear here."
                  : "Orders will appear here when sales-order data is available."
              }
            />
          }
        />
      </SectionCard>

      <Dialog
        open={editDialogOpen}
        onClose={closeEditActionsDialog}
        title="Choose Dashboard Actions"
        description="Select the shortcuts that should appear at the top of the dashboard."
        size="md"
        contentClassName="w-[70vw] max-w-[70vw] h-auto max-h-[82vh] overflow-hidden"
        bodyClassName="overflow-y-auto"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{draftSelectedActionKeys.length}</span> actions selected
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetDraftActionSelection}>
            Reset
          </Button>
        </div>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
        >
          {availableActions.map((action) => {
            const actionKey = getActionKey(action);
            const isSelected = draftSelectedActionKeys.includes(actionKey);

            return (
              <button
                key={actionKey}
                type="button"
                onClick={() => toggleDraftAction(actionKey)}
                className={`rounded-xl border bg-white px-3 py-4 text-left shadow-sm transition hover:shadow-md ${
                  isSelected ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
                    isSelected ? "bg-white text-blue-600" : "bg-slate-50 text-slate-700"
                  }`}>
                    {resolveActionIcon(action.imageKey)}
                  </div>
                  <div className="text-sm font-semibold leading-5 text-slate-900">{action.label}</div>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeEditActionsDialog}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={saveEditActionsDialog}>
            Done
          </Button>
        </DialogFooter>
      </Dialog>
    </SharedOrdersLayout>
  );
}

type DashboardTableRow = {
  id: string;
  primaryName: string;
  secondaryName: string;
  orderDate: string;
  orderId: string;
  orderSource: string;
  store: string;
  status: string;
  paymentStatus: string;
  type: string;
  itemCount: number;
  initials: string;
  doctor?: string;
};

function mapOrderRow(row: OrdersOrderRow, index: number): DashboardTableRow {
  const paymentStatuses = ["Not Paid", "Fully Paid", "Partially Paid"] as const;

  return {
    id: row.id,
    primaryName: row.customer,
    secondaryName: `Id:${130 - index * 12}`,
    orderDate: row.placedOn.split(",")[0],
    orderId: `#${87 - index}`,
    orderSource: row.source,
    store: "Back door Pharmacy(OP&IP)",
    status: normalizeDashboardStatus(row.status),
    paymentStatus: paymentStatuses[index % paymentStatuses.length],
    type: row.channel === "Online" ? "Online" : "WalkIn",
    itemCount: row.itemCount,
    initials: getInitials(row.customer),
  };
}

function mapRequestRow(row: OrdersRequestRow, index: number): DashboardTableRow {
  return {
    id: row.id,
    primaryName: row.patient,
    secondaryName: row.prescriptionId,
    orderDate: row.requestedOn.split(",")[0],
    orderId: row.id,
    orderSource: row.source,
    store: "Back door Pharmacy(OP&IP)",
    status: row.status,
    paymentStatus: "Pending",
    type: "Prescription",
    itemCount: row.itemsRequested,
    initials: getInitials(row.patient),
    doctor: row.doctor,
  };
}

function normalizeDashboardStatus(status: OrdersOrderRow["status"]) {
  if (status === "Awaiting Fulfilment" || status === "Packed") return "Confirmed";
  if (status === "Dispatched") return "Processing";
  if (status === "Delivered") return "Completed";
  return status;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function resolveActionIcon(imageKey?: string) {
  switch (imageKey) {
    case "orders":
      return <Icon name="cart" />;
    case "rx-order":
      return <Icon name="list" />;
    case "rx-requests":
      return <Icon name="history" />;
    case "invoice-types":
      return <Icon name="layers" />;
    case "socatalog":
      return <Icon name="database" />;
    case "store":
      return <Icon name="warehouse" />;
    case "items":
      return <Icon name="box" />;
    case "invoices":
      return <Icon name="chart" />;
    case "partner":
      return <Icon name="globe" />;
    case "item-variant":
      return <Icon name="tag" />;
    case "logistics":
      return <Icon name="refresh" />;
    case "delivery":
      return <Icon name="packagePlus" />;
    case "active-cart":
      return <Icon name="cart" />;
    default:
      return <Icon name="layers" />;
  }
}

function getActionKey(action: { label: string; route: string; imageKey?: string }) {
  return `${action.label}:${action.route}:${action.imageKey ?? ""}`;
}

function buildSalesSeries(rows: OrdersOrderRow[]) {
  const labels = ["Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
  return labels.map((label, index) => ({
    label,
    value: index === 4 ? rows.reduce((sum, row) => sum + row.totalAmount, 0) : 0,
  }));
}

function buildItemsSeries(rows: OrdersOrderRow[]) {
  const labels = ["Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
  return labels.map((label, index) => ({
    label,
    value: index === 4 ? rows.reduce((sum, row) => sum + row.itemCount, 0) : 0,
  }));
}

function buildOrderTypeBreakdown(rows: DashboardTableRow[]) {
  const walkIn = rows.filter((row) => row.type === "WalkIn").length;
  const online = rows.filter((row) => row.type === "Online").length;
  return [
    { label: "WalkIn", value: walkIn || 1, color: "var(--color-chart-1)" },
    { label: "Online", value: online || 0, color: "var(--color-chart-2)" },
  ];
}

function buildRequestBreakdown(rows: DashboardTableRow[]) {
  const pending = rows.filter((row) => row.status.includes("Pending") || row.status.includes("Awaiting")).length;
  const ready = rows.filter((row) => row.status.includes("Ready")).length;
  return [
    { label: "Pending", value: pending || 1, color: "var(--color-chart-2)" },
    { label: "Ready", value: ready || 0, color: "var(--color-chart-1)" },
  ];
}

function paymentStatusClassName(status: string) {
  if (status === "Fully Paid") return "text-emerald-700";
  if (status === "Partially Paid") return "text-amber-700";
  if (status === "Not Paid") return "text-rose-700";
  return "text-slate-600";
}

function statsRangeLabel(range: string) {
  switch (range) {
    case "week":
      return "Last 7 days";
    case "month":
      return "Last 30 days";
    case "range":
      return "Date range";
    default:
      return "Today";
  }
}

function formatAnalyticsPercent(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
}

function PersonCell({ row }: { row: DashboardTableRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
        {row.initials || "U"}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{row.primaryName}</div>
        <div className="text-sm text-slate-500">{row.secondaryName}</div>
      </div>
    </div>
  );
}

function MetricLine({ label, value, tone }: { label: string; value: string; tone: "default" | "danger" }) {
  return (
    <div>
      <div className={tone === "danger" ? "text-2xl font-semibold text-rose-600" : "text-2xl font-semibold text-slate-900"}>{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </div>
  );
}


function AnalyticsCard({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; tone?: "default" | "success" | "danger" }>;
}) {
  return (
    <SectionCard className="border-slate-100 shadow-none">
      <div className="space-y-7">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div
              className={
                metric.tone === "success"
                  ? "text-3xl font-semibold text-emerald-500"
                  : metric.tone === "danger"
                    ? "text-3xl font-semibold text-rose-600"
                    : "text-3xl font-semibold text-slate-900"
              }
            >
              {metric.value}
            </div>
            <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
