import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersReviewsPage, useUpdateOrdersReviewStatus } from "../queries/orders";
import { resolveInternalReturnToHref, resolveReturnToLabel } from "../services/orders";
import type { OrdersReviewRow } from "../types";

const REVIEW_STATUS_OPTIONS = [
  { value: "all", label: "All Reviews" },
  { value: "PENDING", label: "Pending" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

export function OrdersReviewsList({ showHeader = true }: { showHeader?: boolean }) {
  const navigate = useSharedNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "ordersReviews",
    resetDeps: [statusFilter],
  });
  
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const backLabel = useMemo(() => resolveReturnToLabel(returnTo), [returnTo]);
  
  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (statusFilter !== "all") {
      f.status = statusFilter;
    }
    return f;
  }, [statusFilter]);

  const reviewsQuery = useOrdersReviewsPage(page, pageSize, filters);
  const updateStatusMutation = useUpdateOrdersReviewStatus();

  const rows = reviewsQuery.data?.rows ?? [];
  const total = reviewsQuery.data?.total ?? 0;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, total]);

  const handleStatusUpdate = useCallback(
    (reviewId: string, nextStatus: "PUBLISHED" | "REJECTED") => {
      updateStatusMutation.mutate({ reviewId, status: nextStatus });
    },
    [updateStatusMutation]
  );

  const columns = useMemo(
    () => [
      {
        key: "customerName",
        header: "Customer",
        width: "20%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
              {getInitials(row.customerName) || "U"}
            </div>
            <div className="font-semibold text-slate-900">{row.customerName}</div>
          </div>
        ),
      },
      {
        key: "orderId",
        header: "Order ID",
        width: "15%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <div className="font-medium text-slate-600">{row.orderNumber || row.orderId}</div>
        ),
      },
      {
        key: "rating",
        header: "Rating",
        width: "10%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-900">{row.rating}</span>
            <span className="text-amber-400">★</span>
          </div>
        ),
      },
      {
        key: "comment",
        header: "Comment",
        width: "30%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <div className="text-sm text-slate-600 line-clamp-2" title={row.comment}>
            {row.comment || "No comment provided"}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "10%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <Badge variant={getStatusVariant(row.status)}>{row.statusLabel}</Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "15%",
        align: "center" as const,
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersReviewRow) => (
          <div className="flex items-center gap-2">
            {row.status.toUpperCase() === "PENDING" && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusUpdate(row.id, "PUBLISHED")}
                  loading={updateStatusMutation.isPending && updateStatusMutation.variables?.reviewId === row.id}
                >
                  Publish
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleStatusUpdate(row.id, "REJECTED")}
                  loading={updateStatusMutation.isPending && updateStatusMutation.variables?.reviewId === row.id}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [handleStatusUpdate, updateStatusMutation.isPending, updateStatusMutation.variables?.reviewId]
  );

  return (
    <div className="space-y-6">
      {showHeader && (
        <PageHeader
          title="Reviews"
          subtitle="Manage customer feedback for orders."
          back={backHref ? { label: backLabel, href: backHref } : undefined}
          onNavigate={navigate}
        />
      )}
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-slate-900">Feedback ({total})</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[220px_auto]">
              <Select options={REVIEW_STATUS_OPTIONS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
            </div>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          loading={reviewsQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No reviews found" description="Reviews matching the current filter will appear here." />}
        />
      </SectionCard>
    </div>
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

function getStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = status.toUpperCase();
  if (normalized === "PUBLISHED") return "success";
  if (normalized === "REJECTED") return "danger";
  if (normalized === "PENDING") return "warning";
  return "neutral";
}
