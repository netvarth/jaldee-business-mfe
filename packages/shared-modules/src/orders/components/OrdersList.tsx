import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersOrdersPage } from "../queries/orders";
import {
  buildOrdersDetailHref,
  getOrdersStatusVariant,
  resolveInternalReturnToHref,
  resolveReturnToLabel,
} from "../services/orders";
import type { OrdersOrderRow } from "../types";

const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All Orders" },
  { value: "ORDER_CONFIRMED", label: "Confirmed Orders" },
  { value: "ORDER_DISCARDED", label: "Discarded Orders" },
  { value: "ORDER_CANCELED", label: "Cancelled Orders" },
  { value: "ORDER_COMPLETED", label: "Completed Orders" },
  { value: "ORDER_DRAFT", label: "Draft Orders" },
];

export function OrdersList() {
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "ordersGrid",
    resetDeps: [query, statusFilter],
  });

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const backLabel = useMemo(() => resolveReturnToLabel(returnTo), [returnTo]);
  const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>([]);
  const searchText = query.trim();
  const serverStatus = statusFilter === "all" ? "" : statusFilter;
  const ordersQuery = useOrdersOrdersPage(page, pageSize, { searchText, status: serverStatus });
  const rows = ordersQuery.data?.rows ?? [];
  const total = ordersQuery.data?.total ?? 0;

  useEffect(() => {
    setSelectedOrderKeys([]);
  }, [query, statusFilter, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, total]);

  const openOrder = useCallback(
    (row: OrdersOrderRow) => {
      const href = buildOrdersDetailHref(basePath, row.id, product);
      const returnTo = getCurrentReturnTo();
      navigate(returnTo ? appendReturnTo(href, returnTo) : href);
    },
    [basePath, navigate, product]
  );

  const columns = useMemo(
    () => [
      {
        key: "customer",
        header: "Customer",
        width: "22%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => <PersonCell row={row} onView={openOrder} />,
      },
      {
        key: "dateOrder",
        header: "Date & Order Id",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{formatOrderDate(row.placedOn)}</div>
            <div className="text-sm text-slate-500">{formatOrderNumber(row)}</div>
          </div>
        ),
      },
      { key: "source", header: "Order Source", width: "10%", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "store", header: "Store", width: "14%", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5", render: (row: OrdersOrderRow) => row.store || "-" },
      {
        key: "status",
        header: "Status",
        width: "9%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => <Badge variant={getOrdersStatusVariant(normalizeDashboardStatus(row.status))}>{normalizeDashboardStatus(row.status)}</Badge>,
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        width: "11%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => (
          <span className={paymentStatusClassName(row.paymentStatus || "Not Paid")}>{row.paymentStatus || "Not Paid"}</span>
        ),
      },
      {
        key: "channel",
        header: "Type",
        width: "7%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => normalizeOrderType(row.channel),
      },
      { key: "itemCount", header: "No Of Items", width: "7%", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5", align: "left" as const },
      {
        key: "actions",
        header: "Actions",
        width: "8%",
        align: "center" as const,
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersOrderRow) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openOrder(row)}
          >
            View
          </Button>
        ),
      },
    ],
    [openOrder]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="Generated from the legacy sales-order grid and adapted for the shared React module."
        back={backHref ? { label: backLabel, href: backHref } : undefined}
        onNavigate={navigate}
      />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-900">Orders ({total})</div>
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
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search with Customer"
                  className="h-[38px] w-full rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] pl-10 pr-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                />
              </div>
              <Select options={ORDER_STATUS_OPTIONS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
              <Button type="button" variant="ghost" size="sm" className="h-[38px] w-[38px] min-w-[38px] px-0 text-indigo-700">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M2.25 3.75A.75.75 0 0 1 3 3h12a.75.75 0 0 1 .58 1.226L11.25 9.52v4.23a.75.75 0 0 1-.44.682l-3 1.385A.75.75 0 0 1 6.75 15V9.52L2.42 4.226A.75.75 0 0 1 2.25 3.75Z" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          loading={ordersQuery.isLoading}
          selection={{
            selectedRowKeys: selectedOrderKeys,
            onChange: setSelectedOrderKeys,
          }}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="min-w-[1400px] text-base"
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No orders found" description="Orders matching the current filter will appear here." />}
        />
      </SectionCard>
    </div>
  );
}

function PersonCell({ row, onView }: { row: OrdersOrderRow; onView: (row: OrdersOrderRow) => void }) {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-md bg-transparent p-0 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      onClick={() => onView(row)}
      aria-label={`View order ${formatOrderNumber(row)}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
        {getInitials(row.customer) || "U"}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 transition group-hover:text-indigo-700">{row.customer}</div>
        <div className="text-sm text-slate-500 transition group-hover:text-indigo-600">
          {row.customerRef ? `Id:${row.customerRef}` : `Id:${row.id}`}
        </div>
      </div>
    </button>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatOrderDate(value: string) {
  return String(value ?? "").split(",")[0];
}

function formatOrderNumber(row: OrdersOrderRow) {
  return row.orderNumber ? `#${row.orderNumber}` : `#${row.id}`;
}

function normalizeDashboardStatus(status: OrdersOrderRow["status"]) {
  if (status === "Awaiting Fulfilment" || status === "Packed") return "Confirmed";
  if (status === "Dispatched") return "Processing";
  if (status === "Delivered") return "Completed";
  return status;
}

function paymentStatusClassName(status: string) {
  if (status === "Fully Paid") return "text-emerald-700";
  if (status === "Partially Paid") return "text-amber-700";
  if (status === "Not Paid") return "text-rose-700";
  return "text-slate-600";
}

function normalizeOrderType(channel: string) {
  return String(channel ?? "").trim().toLowerCase() === "online" ? "Online" : "WalkIn";
}


