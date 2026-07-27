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
import { useServiceSearchSchema } from "../../services/useServiceSearchSchema";
import { formatAppliedServiceFilterSummary } from "../../services/serviceSearch";
import { useServices } from "../../services/useServices";
import type { ServiceItem } from "../../types";

export default function ServicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { schema: serviceSearchSchema, loading: serviceSearchSchemaLoading } = useServiceSearchSchema();
  const combinedFilters = useMemo(() => {
    return [...advancedFilters.filter(f => f.field !== "isGroup"), { id: "sys-isgroup", field: "isGroup", operator: "EQ", values: ["false"] }];
  }, [advancedFilters]);

  const { services, loading, toggleStatus } = useServices(combinedFilters, serviceSearchSchema, {
    enabled: !serviceSearchSchemaLoading,
  });

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, serviceSearchSchema).length,
    [advancedFilters, serviceSearchSchema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedServiceFilterSummary(advancedFilters, serviceSearchSchema),
    [advancedFilters, serviceSearchSchema]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter(
      (service) =>
        !normalized ||
        service.name.toLowerCase().includes(normalized) ||
        (service.description ?? "").toLowerCase().includes(normalized)
    );
  }, [query, services]);

  const formatServiceStatus = (status?: ServiceItem["status"]) =>
    status === "Active" ? "Active" : "Inactive";
  const serviceStatusVariant = (status?: ServiceItem["status"]): "success" | "neutral" =>
    status === "Active" ? "success" : "neutral";

  const columns = useMemo<ColumnDef<ServiceItem>[]>(
    () => [
      {
        key: "name",
        header: "SERVICE NAME & ID",
        sortable: true,
        width: "28%",
        render: (service) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{service.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{service.id || "-"}</p>
          </div>
        ),
      },
      {
        key: "labels",
        header: "TAGS",
        render: (service) => (
          <div className="flex flex-wrap gap-1.5">
            {(service.labels?.length ? service.labels : ["OPD"]).map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "status",
        header: "STATUS",
        render: (service) => (
          <Badge variant={serviceStatusVariant(service.status)}>
            {formatServiceStatus(service.status)}
          </Badge>
        ),
      },
      {
        key: "price",
        header: "SERVICE TYPE & FEE",
        sortable: true,
        render: (service) => (
          <div>
            <p className="text-xs font-medium text-slate-700">
              {service.serviceType ?? "Consultation"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Rs {service.price}</p>
          </div>
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        width: 140,
        render: (service) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/services/${service.id}/details`);
              }}
              className="font-semibold"
            >
              Details
            </Button>
            <Popover
              trigger={
                <button
                  id={`bookings-service-actions-${service.id}`}
                  data-testid={`bookings-service-actions-${service.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              }
              placement="bottom"
              align="end"
              portal
            >
              <div className="flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg whitespace-nowrap">
                <button
                  id={`bookings-service-edit-${service.id}`}
                  data-testid={`bookings-service-edit-${service.id}`}
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/services/edit/${service.id}`);
                  }}
                >
                  Edit
                </button>
                <button
                  id={`bookings-service-status-${service.id}`}
                  data-testid={`bookings-service-status-${service.id}`}
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStatus(service);
                  }}
                >
                  {service.status === "Active" ? "Inactive" : "Active"}
                </button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <section
      id="bookings-services-page"
      data-testid="bookings-services-page"
      className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Services"
        subtitle="Configure and manage booking services."
        actions={
          <Button
            id="bookings-services-create"
            data-testid="bookings-services-create"
            onClick={() => navigate("/services/create")}
          >
            Create Service
          </Button>
        }
      />

      <div className="mb-6 mt-4">
        <Tabs
          value="services"
          onValueChange={(value) => navigate(value === "groups" ? "/services/groups" : "/services")}
          items={[
            { value: "services", label: "Services List" },
            { value: "groups", label: "Service Packages" },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-row items-center justify-between gap-2 sm:gap-4">
        <Input
          id="bookings-services-search"
          data-testid="bookings-services-search"
          type="search"
          placeholder="Search services"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="flex-1 min-w-0 sm:max-w-sm"
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <Button
            type="button"
            variant={appliedFilterCount > 0 ? "primary" : "outline"}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
              appliedFilterCount > 0
                ? ""
                : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
            )}
            onClick={() => {
              setDraftFilters(
                advancedFilters.length > 0
                  ? advancedFilters
                  : buildDefaultSearchClauses(serviceSearchSchema)
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
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(service) => service.id}
        loading={loading}
        rowClassName={(service) => (service.status === "Active" ? "" : "opacity-60")}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No services found" description="Try changing the search." />}
        tableClassName="min-w-[800px]"
        data-testid="bookings-services"
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
              schema={serviceSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(serviceSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
              emptyStateMessage="No service filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(serviceSearchSchema);
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
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
