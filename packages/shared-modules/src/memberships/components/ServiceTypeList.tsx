import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useChangeServiceTypeStatus,
  useServiceTypeCount,
  useServiceTypes,
} from "../queries/memberships";

type ServiceTypeRow = {
  uid: string;
  name: string;
  status: string;
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

function toRows(data: unknown): ServiceTypeRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    name: String(item.categoryName ?? item.name ?? `Service Type ${index + 1}`),
    status: String(item.status ?? "Disabled"),
  }));
}

function getStatusLabel(status: string) {
  return String(status).toUpperCase() === "ENABLED" ? "Active" : "Inactive";
}

export function ServiceTypeList() {
  const { basePath } = useSharedModulesContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedSearchQuery(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearchQuery, statusFilter, pageSize]);

  const filters = useMemo(
    () => ({
      ...(appliedSearchQuery ? { "categoryname-like": appliedSearchQuery } : {}),
      ...(statusFilter !== "all" ? { "status-eq": statusFilter } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedSearchQuery, page, pageSize, statusFilter]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedSearchQuery ? { "categoryname-like": appliedSearchQuery } : {}),
      ...(statusFilter !== "all" ? { "status-eq": statusFilter } : {}),
    }),
    [appliedSearchQuery, statusFilter]
  );

  const serviceTypesQuery = useServiceTypes(filters);
  const serviceTypeCountQuery = useServiceTypeCount(countFilters);
  const changeStatusMutation = useChangeServiceTypeStatus();

  const rows = useMemo(() => toRows(serviceTypesQuery.data), [serviceTypesQuery.data]);
  const total = unwrapCount(serviceTypeCountQuery.data) || rows.length;

  async function handleStatusChange(uid: string, statusId: string) {
    try {
      await changeStatusMutation.mutateAsync({ uid, statusId });
      await Promise.all([serviceTypesQuery.refetch(), serviceTypeCountQuery.refetch()]);
    } catch {
      // keep the table stable; existing module pattern does not surface toast here
    }
  }

  const columns = useMemo<ColumnDef<ServiceTypeRow>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <select
            aria-label={`Change status for ${row.name}`}
            value=""
            disabled={changeStatusMutation.isPending}
            className={
              `rounded-md border px-3 py-2 text-sm font-medium outline-none ${
                getStatusLabel(row.status) === "Active"
                  ? "border-emerald-500 text-emerald-700"
                  : "border-rose-500 text-rose-600"
              }`
            }
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextStatus = event.target.value;
              if (!nextStatus) return;
              void handleStatusChange(row.uid, nextStatus);
            }}
          >
            <option value="" disabled>{getStatusLabel(row.status)}</option>
            {String(row.status).toUpperCase() !== "DISABLED" ? (
              <option value="Disabled">Inactive</option>
            ) : null}
            {String(row.status).toUpperCase() !== "ENABLED" ? (
              <option value="Enabled">Active</option>
            ) : null}
          </select>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          String(row.status).toUpperCase() === "ENABLED" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/serviceType/update/${row.uid}`);
              }}
            >
              Edit
            </Button>
          ) : null
        ),
      },
    ],
    [basePath, changeStatusMutation.isPending]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Types"
        subtitle="Create, update, and manage the active status of membership service types."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={(
          <Button onClick={() => window.location.assign(`${basePath}/serviceType/create`)}>
            Create
          </Button>
        )}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                searchPlaceholder="Search by service type name..."
                recordCount={total}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="service-type-status-filter" className="text-sm text-slate-500">
                Status
              </label>
              <select
                id="service-type-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="all">All</option>
                <option value="Enabled">Active</option>
                <option value="Disabled">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={serviceTypesQuery.isLoading || serviceTypeCountQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/serviceType/update/${row.uid}`)}
            pagination={{
              page,
              pageSize,
              total,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={(
              <EmptyState
                title="No service types found"
                description="Create a service type or adjust the current search and status filters."
              />
            )}
          />
        </div>
      </SectionCard>
    </div>
  );
}
