import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, PageHeader, SectionCard, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersActiveCart, useOrdersActiveCartCount } from "../queries/orders";
import type { ActiveCartRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function OrdersActiveCart() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  // returnTo / back label
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const backLabel = useMemo(() => resolveReturnToLabel(returnTo), [returnTo]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Fetch all at once for client-side pagination
  const listQuery = useOrdersActiveCart();
  const allRows = listQuery.data ?? [];
  const total = allRows.length;

  const columns = useMemo<ColumnDef<ActiveCartRow>[]>(
    () => [
      {
        key: "item",
        header: "Item",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
              {row.itemImageUrl ? (
                <img
                  src={row.itemImageUrl}
                  alt={row.itemName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon name="box" />
              )}
            </div>
            <span
              id={`active-cart-item-name-${toAutomationId(row.id)}`}
              data-testid={`active-cart-item-name-${toAutomationId(row.id)}`}
              className="font-medium text-slate-900"
            >
              {row.itemName}
            </span>
          </div>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <span className="text-indigo-600">{row.customerName}</span>
        ),
      },
      {
        key: "phone",
        header: "Phone Number",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <span>
            {row.countryCode ? `+${row.countryCode.replace(/^\+/, "")} ` : ""}
            {row.phoneNumber ?? "—"}
          </span>
        ),
      },
      {
        key: "store",
        header: "Store",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <span>{row.storeName ?? "—"}</span>,
      },
      {
        key: "catalog",
        header: "Catalog",
        headerClassName: "font-semibold text-slate-900",
        render: (row) =>
          row.catalogName ? (
            <span className="text-indigo-600">{row.catalogName}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: "lastModified",
        header: "Last Modified",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <span>{row.lastModified ?? "—"}</span>,
      },
      {
        key: "quantity",
        header: "Quantity",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <Badge variant="neutral">{row.quantity}</Badge>
        ),
      },
    ],
    []
  );

  const pageState = listQuery.isLoading ? "loading" : listQuery.isError ? "error" : "ready";

  return (
    <div
      data-testid="orders-active-cart-page"
      data-state={pageState}
      className="space-y-6"
    >
      <PageHeader
        title={`Active Cart Items${total ? ` (${total})` : ""}`}
        subtitle="Items currently sitting in customer carts."
        back={backHref ? { label: backLabel, href: backHref } : undefined}
        onNavigate={navigate}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <DataTable
          data={allRows}
          columns={columns}
          loading={listQuery.isLoading}
          pagination={{
            page,
            pageSize,
            total,
            mode: "client",
            onChange: setPage,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          }}
          emptyState={
            <EmptyState
              title="No active cart items"
              description="No customers currently have items in their cart."
            />
          }
        />
      </SectionCard>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toAutomationId(value: string): string {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function resolveInternalReturnToHref(returnTo: string): string {
  const raw = String(returnTo ?? "").trim();
  if (!raw || raw === "#") return "";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function resolveReturnToLabel(returnTo: string): string {
  if (!returnTo) return "Back";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(returnTo, origin);
    const segments = url.pathname.split("/").filter(Boolean).map((s) => s.toLowerCase());
    const labelMap: Record<string, string> = {
      dashboard: "Dashboard",
      overview: "Dashboard",
      orders: "Orders",
    };
    for (let i = segments.length - 1; i >= 0; i--) {
      if (labelMap[segments[i]]) return labelMap[segments[i]];
    }
  } catch {
    // ignore
  }
  return "Back";
}
