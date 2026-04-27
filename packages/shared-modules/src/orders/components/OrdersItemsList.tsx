import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersItemsPage } from "../queries/orders";
import { buildOrdersItemDetailHref } from "../services/orders";
import type { OrdersItemRow, OrdersItemSettingsOption } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function OrdersItemsList() {
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "ordersItems",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    legacyPageParam: "page",
    legacyPageSizeParam: "pageSize",
    resetDeps: [categoryFilter, groupFilter, query, statusFilter, typeFilter],
  });
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const itemsQuery = useOrdersItemsPage(page, pageSize);
  const rows = itemsQuery.data?.rows ?? [];
  const total = itemsQuery.data?.total ?? 0;
  const settings = itemsQuery.data?.settings ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filtersActive = Boolean(
    normalizedQuery ||
      categoryFilter !== "all" ||
      groupFilter !== "all" ||
      typeFilter !== "all" ||
      statusFilter !== "all"
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, total]);

  const categoryOptions = useMemo(
    () => buildFilterOptions("All Categories", settings?.categories, rows.map((row) => row.category)),
    [rows, settings?.categories]
  );
  const groupOptions = useMemo(
    () => buildFilterOptions("All Groups", settings?.groups, rows.map((row) => row.group)),
    [rows, settings?.groups]
  );
  const typeOptions = useMemo(
    () => buildFilterOptions("All Types", settings?.types, rows.map((row) => row.type)),
    [rows, settings?.types]
  );
  const statusOptions = useMemo(
    () => buildFilterOptions("All Statuses", null, rows.map((row) => row.status)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.id,
          row.name,
          row.property,
          row.source,
          row.category,
          row.group,
          row.type,
          row.trackInventory,
          row.tax,
          row.createdDate,
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
      const matchesGroup = groupFilter === "all" || row.group === groupFilter;
      const matchesType = typeFilter === "all" || row.type === typeFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return matchesQuery && matchesCategory && matchesGroup && matchesType && matchesStatus;
    });
  }, [categoryFilter, groupFilter, normalizedQuery, rows, statusFilter, typeFilter]);

  const openItem = useCallback(
    (row: OrdersItemRow) => {
      const href = buildOrdersItemDetailHref(basePath, row.id, product);
      const returnTo = getCurrentReturnTo();
      navigate(returnTo ? appendReturnTo(href, returnTo) : href);
    },
    [basePath, navigate, product]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Item Name & Property",
        width: "20%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersItemRow) => <ItemNameCell row={row} onView={openItem} />,
      },
      {
        key: "source",
        header: "Source",
        width: "9%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersItemRow) => <span data-testid={`orders-items-source-${toAutomationId(row.id)}`}>{row.source}</span>,
      },
      {
        key: "category",
        header: "Category",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "group",
        header: "Group",
        width: "11%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "type",
        header: "Type",
        width: "8%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "trackInventory",
        header: "Track Inventory",
        width: "11%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "tax",
        header: "Tax",
        width: "9%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "createdDate",
        header: "Created Date",
        width: "10%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
      },
      {
        key: "status",
        header: "Status",
        width: "8%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersItemRow) => (
          <Badge
            variant={getItemStatusVariant(row.status)}
            data-testid={`orders-items-status-${toAutomationId(row.id)}`}
            data-state={toAutomationId(row.status)}
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "9%",
        align: "center" as const,
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersItemRow) => {
          const automationId = toAutomationId(row.id);

          return (
            <Button
              id={`orders-items-view-${automationId}`}
              data-testid={`orders-items-view-${automationId}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openItem(row)}
            >
              View
            </Button>
          );
        },
      },
    ],
    [openItem]
  );

  const pageState = itemsQuery.isLoading ? "loading" : itemsQuery.isError ? "error" : filteredRows.length === 0 ? "empty" : "ready";

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setGroupFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  return (
    <div data-testid="orders-items-page" data-state={pageState} className="space-y-6">
      <PageHeader
        title="Items"
        subtitle=""
        back={backHref ? { label: "Back", href: backHref } : undefined}
        onNavigate={navigate}
      />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 data-testid="orders-items-heading" className="m-0 text-xl font-semibold text-slate-900">
              All Items ({filtersActive ? filteredRows.length : total})
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative w-full min-w-[280px] max-w-xl">
                <input
                  id="orders-items-search-input"
                  data-testid="orders-items-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search items with name"
                  className="h-[40px] w-full rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] px-3 text-[length:var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                />
              </div>
              <Button
                id="orders-items-filter-toggle"
                data-testid="orders-items-filter-toggle"
                data-state={filtersOpen ? "open" : "closed"}
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 min-w-10 px-0 text-indigo-700"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-label="Toggle item filters"
              >
                <FilterIcon />
              </Button>
              <Button
                id="orders-items-refresh"
                data-testid="orders-items-refresh"
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 min-w-10 px-0"
                onClick={() => itemsQuery.refetch()}
                aria-label="Refresh items"
              >
                <Icon name="refresh" />
              </Button>
            </div>
          </div>

          {filtersOpen ? (
            <div
              data-testid="orders-items-filter-panel"
              data-state="open"
              className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-5"
            >
              <Select
                id="orders-items-category-filter"
                testId="orders-items-category-filter"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              />
              <Select
                id="orders-items-group-filter"
                testId="orders-items-group-filter"
                options={groupOptions}
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              />
              <Select
                id="orders-items-type-filter"
                testId="orders-items-type-filter"
                options={typeOptions}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              />
              <Select
                id="orders-items-status-filter"
                testId="orders-items-status-filter"
                options={statusOptions}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
              <Button
                id="orders-items-reset-filters"
                data-testid="orders-items-reset-filters"
                type="button"
                variant="outline"
                size="sm"
                className="h-[38px]"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          ) : null}
        </div>

        {itemsQuery.isError ? (
          <div data-testid="orders-items-error-state" data-state="error">
            <EmptyState title="Items unavailable" description="Sales-order items could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={filteredRows}
            columns={columns}
            getRowId={(row) => toAutomationId(row.id)}
            loading={itemsQuery.isLoading}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="min-w-[1480px] text-base"
            data-testid="orders-items-table"
            pagination={{
              page,
              pageSize,
              total: filtersActive ? filteredRows.length : total,
              mode: filtersActive ? "client" : "server",
              onChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyState={
              <div data-testid="orders-items-empty-state" data-state="empty">
                <EmptyState title="No items found" description="Sales-order items matching the current filters will appear here." />
              </div>
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

function ItemNameCell({ row, onView }: { row: OrdersItemRow; onView: (row: OrdersItemRow) => void }) {
  const automationId = toAutomationId(row.id);
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(row.imageUrl && !imageError);

  useEffect(() => {
    setImageError(false);
  }, [row.imageUrl]);

  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-md bg-transparent p-0 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      data-testid={`orders-items-item-${automationId}`}
      onClick={() => onView(row)}
      aria-label={`View item ${row.name}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-slate-400">
        {hasImage ? (
          <img
            src={row.imageUrl}
            alt={row.name}
            className="h-full w-full object-cover"
            loading="lazy"
            data-testid={`orders-items-image-${automationId}`}
            onError={() => setImageError(true)}
          />
        ) : (
          <span data-testid={`orders-items-image-placeholder-${automationId}`}>
            <Icon name="box" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 transition group-hover:text-indigo-700">{row.name}</div>
        <div className="text-sm font-semibold text-indigo-950 transition group-hover:text-indigo-700">{row.property}</div>
      </div>
    </button>
  );
}

function buildFilterOptions(label: string, settings: OrdersItemSettingsOption[] | null | undefined, rowValues: string[]) {
  const values = new Set<string>();

  settings?.forEach((option) => {
    if (option.label && option.label !== "-") values.add(option.label);
  });
  rowValues.forEach((value) => {
    if (value && value !== "-") values.add(value);
  });

  return [
    { value: "all", label },
    ...Array.from(values)
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value })),
  ];
}

function getItemStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("enable") || normalized.includes("active")) return "success";
  if (normalized.includes("disable") || normalized.includes("inactive")) return "danger";
  if (normalized.includes("draft")) return "warning";
  return "neutral";
}

function resolveInternalReturnToHref(returnTo: string) {
  const raw = String(returnTo ?? "").trim();
  if (!raw || raw === "#") return "";

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "";

    const href = `${url.pathname}${url.search}${url.hash}`;
    if (typeof window !== "undefined") {
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (href === currentHref) return "";
    }

    return href;
  } catch {
    return "";
  }
}

function getCurrentReturnTo() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function appendReturnTo(href: string, returnTo: string) {
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

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M2.25 3.75A.75.75 0 0 1 3 3h12a.75.75 0 0 1 .58 1.226L11.25 9.52v4.23a.75.75 0 0 1-.44.682l-3 1.385A.75.75 0 0 1 6.75 15V9.52L2.42 4.226A.75.75 0 0 1 2.25 3.75Z" />
    </svg>
  );
}

function toAutomationId(value: string) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}
