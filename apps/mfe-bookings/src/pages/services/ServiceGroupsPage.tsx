import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  cn,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  Tabs,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import { useServiceGroupSearchSchema } from "../../services/useServiceGroupSearchSchema";
import { formatAppliedServiceGroupFilterSummary } from "../../services/serviceGroupSearch";
import type { ServiceGroupItem } from "../../types";

export default function ServiceGroupsPage() {
  const navigate = useNavigate();
  const { services } = useServices();
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const {
    schema: serviceGroupSearchSchema,
    loading: serviceGroupSearchSchemaLoading,
  } = useServiceGroupSearchSchema();
  const { groups, loading, deleteGroup } = useServiceGroups(
    advancedFilters,
    serviceGroupSearchSchema,
    { enabled: !serviceGroupSearchSchemaLoading }
  );

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.uid ?? service.id, service])),
    [services],
  );

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, serviceGroupSearchSchema).length,
    [advancedFilters, serviceGroupSearchSchema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedServiceGroupFilterSummary(advancedFilters, serviceGroupSearchSchema),
    [advancedFilters, serviceGroupSearchSchema]
  );

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(normalized) ||
      (group.description ?? "").toLowerCase().includes(normalized),
    );
  }, [groups, query]);

  const formatGroupStatus = (status?: string) => (status === "Active" ? "Active" : "Inactive");
  const groupStatusVariant = (status?: string): "success" | "neutral" =>
    status === "Active" ? "success" : "neutral";

  const columns = useMemo<ColumnDef<ServiceGroupItem>[]>(() => [
    {
      key: "name",
      header: "PACKAGE NAME & ID",
      render: (group) => {
        return (
          <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{group.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{group.id || "-"}</p>
            </div>
        );
      },
    },
    {
      key: "services",
      header: "INCLUDED SERVICES",
      render: (group) => (
        <div className="flex flex-wrap gap-1.5">
          {group.serviceIds.length ? group.serviceIds.map((serviceId) => (
            <span key={serviceId} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
              {serviceMap.get(serviceId)?.name ?? serviceId}
            </span>
          )) : <span className="text-sm text-slate-400">No services linked</span>}
        </div>
      ),
    },
    {
      key: "labels",
      header: "LABELS",
      render: (group) => (
        <div className="flex flex-wrap gap-1.5">
          {["Popular", "Specialty"].map((label, idx) => (
            <span key={idx} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
              {label}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (group) => <Badge variant={groupStatusVariant(group.status)}>{formatGroupStatus(group.status)}</Badge>,
    },
    {
      key: "pricing",
      header: "FEE",
      render: (group) => (
        <span className="font-bold text-slate-900">
          {group.priceMode === "fixed" ? `₹${group.price ?? 0}` : "Dynamic"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      width: 120,
      render: (group) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/services/groups/${group.id}/details`);
            }}
          >
            {/* Eye Icon */}
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          
          <Popover
            trigger={
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>
            }
            placement="bottom"
            align="end"
            portal
          >
            <div className="flex min-w-[120px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => navigate("/services/groups/create", { state: { group } })}
              >
                Edit
              </button>
              <button
                className="px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                onClick={() => deleteGroup(group.id)}
              >
                Delete
              </button>
            </div>
          </Popover>
        </div>
      ),
    },
  ], [deleteGroup, navigate, serviceMap]);

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 md:p-6">
      <PageHeader
        title="Service Packages"
        subtitle="Group booking services into reusable packages."
        actions={
          <Button onClick={() => navigate("/services/groups/create")}>
            Create Package
          </Button>
        }
      />

      <div className="mt-4 mb-6">
        <Tabs
          value="groups"
          onValueChange={(val) => navigate(val === "groups" ? "/services/groups" : "/services")}
          items={[
            { value: "services", label: "Services List" },
            { value: "groups", label: "Service Packages" },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          id="bookings-service-groups-search"
          type="search"
          placeholder="Search packages"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-sm"
        />
        <Button
          type="button"
          variant={appliedFilterCount > 0 ? "primary" : "outline"}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
            appliedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
          )}
          onClick={() => {
            setDraftFilters(
              advancedFilters.length > 0
                ? advancedFilters
                : buildDefaultSearchClauses(serviceGroupSearchSchema)
            );
            setDrawerOpen(true);
          }}
        >
          <FilterIcon />
          <span>Filters</span>
          {appliedFilterCount > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
              {appliedFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <DataTable
        data={filteredGroups}
        columns={columns}
        getRowId={(group) => group.id}
        loading={loading}
        rowClassName={(group) => group.status === "Active" ? "" : "opacity-60"}
        pagination={{
          page,
          pageSize: 10,
          total: filteredGroups.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No Service Packages" description="Create a package to bundle services for scheduling and booking." />}
        tableClassName="min-w-[800px]"
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={serviceGroupSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(serviceGroupSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
              emptyStateMessage="No service package filters are available."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(serviceGroupSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
            >
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAdvancedFilters(draftFilters);
                setPage(1);
                setDrawerOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}
