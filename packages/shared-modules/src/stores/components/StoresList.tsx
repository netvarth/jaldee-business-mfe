import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, PageHeader, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useStoreLocations, useStoresList, useStoresCount, useStoreTypes } from "../queries/stores";
import type { Store } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function StoresList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [storeTypeFilter, setStoreTypeFilter] = useState("all");
  const [storeNameFilter, setStoreNameFilter] = useState("all");

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "stores",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [statusFilter, locationFilter, storeTypeFilter, storeNameFilter],
  });

  // Resolve returnTo for back button
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const backLabel = useMemo(() => resolveReturnToLabel(returnTo), [returnTo]);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(locationFilter !== "all" ? { locationName: locationFilter } : {}),
      ...(storeTypeFilter !== "all" ? { storeNature: storeTypeFilter } : {}),
      ...(storeNameFilter !== "all" ? { name: storeNameFilter } : {}),
    }),
    [page, pageSize, statusFilter, locationFilter, storeTypeFilter, storeNameFilter]
  );

  const listQuery = useStoresList(filters);
  const countQuery = useStoresCount(filters);
  const typesQuery = useStoreTypes();
  const locationsQuery = useStoreLocations();

  const rows = listQuery.data ?? [];
  const total = countQuery.data ?? 0;
  const storeTypes = typesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  // All stores for name filter
  const allStoresQuery = useStoresList({ page: 1, pageSize: 200 });
  const allStores = allStoresQuery.data ?? [];

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
    []
  );

  const locationOptions = useMemo(
    () => [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.place, label: loc.place })),
    ],
    [locations]
  );

  const storeTypeOptions = useMemo(
    () => [
      { value: "all", label: "All Types" },
      ...storeTypes.map((t) => ({ value: t.storeNature, label: t.storeNature })),
    ],
    [storeTypes]
  );

  const storeNameOptions = useMemo(
    () => [
      { value: "all", label: "All Stores" },
      ...allStores.map((s) => ({ value: s.name, label: s.name })),
    ],
    [allStores]
  );

  const columns = useMemo<ColumnDef<Store>[]>(
    () => [
      {
        key: "name",
        header: "Store",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <div
            className="flex cursor-pointer items-center gap-3"
            onClick={() => navigate(`${basePath}/${row.id}`)}
          >
            <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
              {row.storeLogo?.s3path ? (
                <img src={row.storeLogo.s3path} alt={row.name} className="h-full w-full object-contain" />
              ) : (
                <Icon name="warehouse" />
              )}
            </div>
            <div>
              <div
                id={`stores-list-row-name-${toAutomationId(row.id)}`}
                data-testid={`stores-list-row-name-${toAutomationId(row.id)}`}
                className="font-semibold text-slate-900"
              >
                {row.name}
              </div>
              <div className="text-xs text-slate-500">Id: {row.id}</div>
            </div>
          </div>
        ),
      },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <span>{row.locationName ?? "—"}</span>,
      },
      {
        key: "storeNature",
        header: "Store Type",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <span>{row.storeNature ?? "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "10%",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <Badge variant={row.status === "Active" ? "success" : row.status === "Inactive" ? "danger" : "neutral"}>
            {row.status}
          </Badge>
        ),
      },
      {
        key: "id",
        header: "Actions",
        width: "12%",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              id={`stores-list-view-${toAutomationId(row.id)}`}
              data-testid={`stores-list-view-${toAutomationId(row.id)}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/${row.id}`)}
            >
              View
            </Button>
            <Button
              id={`stores-list-edit-${toAutomationId(row.id)}`}
              data-testid={`stores-list-edit-${toAutomationId(row.id)}`}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/${row.id}/edit`)}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [basePath, navigate]
  );

  const pageState = listQuery.isLoading ? "loading" : listQuery.isError ? "error" : "ready";

  return (
    <div data-testid="stores-page" data-state={pageState} className="space-y-6">
      <PageHeader
        title={`Stores${total ? ` (${total})` : ""}`}
        subtitle="Manage your store locations and settings."
        back={backHref ? { label: backLabel, href: backHref } : undefined}
        onNavigate={navigate}
        actions={
          <Button
            id="stores-list-create"
            data-testid="stores-list-create"
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate(`${basePath}/create`)}
          >
            <Icon name="plus" />
            Create Store
          </Button>
        }
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-[180px] flex-1">
            <Select
              id="stores-filter-location"
              data-testid="stores-filter-location"
              value={locationFilter}
              options={locationOptions}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <Select
              id="stores-filter-type"
              data-testid="stores-filter-type"
              value={storeTypeFilter}
              options={storeTypeOptions}
              onChange={(e) => setStoreTypeFilter(e.target.value)}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              id="stores-filter-name"
              data-testid="stores-filter-name"
              value={storeNameFilter}
              options={storeNameOptions}
              onChange={(e) => setStoreNameFilter(e.target.value)}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <Select
              id="stores-filter-status"
              data-testid="stores-filter-status"
              value={statusFilter}
              options={statusOptions}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          {(statusFilter !== "all" || locationFilter !== "all" || storeTypeFilter !== "all" || storeNameFilter !== "all") && (
            <Button
              id="stores-filter-clear"
              data-testid="stores-filter-clear"
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setLocationFilter("all");
                setStoreTypeFilter("all");
                setStoreNameFilter("all");
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <DataTable
          data={rows}
          columns={columns}
          loading={listQuery.isLoading}
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={
            <EmptyState
              title="No stores found"
              description="No stores match the current filters. Try adjusting your selection."
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
      customers: "Customers",
      inventory: "Inventory",
    };
    for (let i = segments.length - 1; i >= 0; i--) {
      if (labelMap[segments[i]]) return labelMap[segments[i]];
    }
  } catch {
    // ignore
  }
  return "Back";
}
