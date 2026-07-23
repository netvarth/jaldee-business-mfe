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
  type ColumnDef,
} from "@jaldee/design-system";
import { MoreVertical, MapPin, Phone, Monitor, Calendar as CalendarIcon } from "../../components/icons";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useCalendars } from "../../services/useCalendars";
import { useCalendarSearchSchema } from "../../services/useCalendarSearchSchema";
import { formatAppliedCalendarFilterSummary } from "../../services/calendarSearch";
import type { Calendar } from "../../types";

function ChipRow({ label, items }: { label: string; items?: string[] }) {
  const list = items ?? [];
  if (list.length === 0) {
    return <span className="text-xs text-slate-400">{`No ${label.toLowerCase()}`}</span>;
  }
  const shown = list.slice(0, 2);
  const extra = list.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((item) => (
        <span
          key={item}
          className="max-w-[120px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          title={item}
        >
          {item}
        </span>
      ))}
      {extra > 0 && <span className="text-xs font-medium text-slate-500">{`+${extra}`}</span>}
    </div>
  );
}

function AssignedCell({ services, users }: { services?: string[]; users?: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Services</span>
        <ChipRow label="services" items={services} />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Users</span>
        <ChipRow label="users" items={users} />
      </div>
    </div>
  );
}

function statusLabel(status?: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "INACTIVE") return "Inactive";
  return "Active";
}

function statusVariant(status?: string): "success" | "warning" | "neutral" {
  if (status === "DRAFT") return "neutral";
  if (status === "INACTIVE") return "warning";
  return "success";
}

function resolveAssignedServiceNames(
  services: Calendar["services"],
) {
  return (services ?? [])
    .map((service) => {
      if (!service) return null;

      if (typeof service === "string") {
        return service;
      }

      return service.name || service.uid || service.id || null;
    })
    .filter((value): value is string => Boolean(value));
}

function resolveAssignedUserNames(
  users: Calendar["users"],
) {
  return (users ?? [])
    .map((user) => {
      if (!user) return null;

      if (typeof user === "string") {
        return user;
      }

      return (
        user.displayName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.userUid ||
        user.uid ||
        user.id ||
        null
      );
    })
    .filter((value): value is string => Boolean(value));
}

export default function CalendarList() {
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { schema: calendarSearchSchema, loading: calendarSearchSchemaLoading } =
    useCalendarSearchSchema();
  const { calendars, loading, toggleStatus } = useCalendars(advancedFilters, calendarSearchSchema, {
    enabled: !calendarSearchSchemaLoading,
  });
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, calendarSearchSchema).length,
    [advancedFilters, calendarSearchSchema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedCalendarFilterSummary(advancedFilters, calendarSearchSchema),
    [advancedFilters, calendarSearchSchema]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return calendars;
    return calendars.filter(
      (calendar) =>
        calendar.name.toLowerCase().includes(normalized) ||
        (calendar.description ?? "").toLowerCase().includes(normalized),
    );
  }, [calendars, query]);

  const columns = useMemo<ColumnDef<Calendar>[]>(
    () => [
      {
        key: "name",
        header: "CALENDAR NAME",
        sortable: true,
        width: "32%",
        render: (calendar) => (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: calendar.color || "#3F20FD" }}
            >
              <CalendarIcon size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{calendar.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {calendar.description || "No description"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "locationName",
        header: "LOCATION",
        sortable: true,
        render: (calendar) => calendar.locationName || "-",
      },
      {
        key: "bookingChannels",
        header: "BOOKING CHANNELS",
        render: (calendar) => (
          <div className="flex flex-wrap gap-2">
            {(calendar.bookingChannels ?? []).length ? (
              calendar.bookingChannels?.map((channel) => {
                let Icon = null;
                const normalized = channel.toLowerCase();
                if (normalized === "online") Icon = Monitor;
                else if (normalized === "walk-in" || normalized === "walk_in") Icon = MapPin;
                else if (normalized === "phone-in" || normalized === "phone_in") Icon = Phone;

                return (
                  <span
                    key={channel}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {Icon && <Icon size={12} className="text-slate-500" />}
                    {channel}
                  </span>
                );
              })
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        ),
      },

      {
        key: "status",
        header: "STATUS",
        sortable: true,
        render: (calendar) => (
          <Badge variant={statusVariant(calendar.status)} className="rounded-lg">
            {statusLabel(calendar.status)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        width: 60,
        render: (calendar) => (
          <div className="flex justify-end">
            <Popover
              trigger={
                <button
                  id={`bookings-calendar-actions-${calendar.uid}`}
                  data-testid={`bookings-calendar-actions-${calendar.uid}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={16} />
                </button>
              }
              placement="bottom"
              align="end"
              portal
            >
              <div className="flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg whitespace-nowrap">
                <button
                  id={`bookings-calendar-edit-${calendar.uid}`}
                  data-testid={`bookings-calendar-edit-${calendar.uid}`}
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (calendar.status === "DRAFT") {
                      navigate("/calendars/create", { state: { calendar } });
                    } else {
                      navigate("/calendars/edit", { state: { calendar } });
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  id={`bookings-calendar-status-${calendar.uid}`}
                  data-testid={`bookings-calendar-status-${calendar.uid}`}
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStatus(calendar);
                  }}
                >
                  {calendar.status === "ACTIVE" ? "Make Inactive" : "Make Active"}
                </button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <section
      id="page-calendars"
      data-testid="bookings-calendar-list-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Calendars"
        subtitle="Manage your booking calendars."
        className="mb-2"
        actions={
          <Button
            id="bookings-calendar-list-create"
            data-testid="bookings-calendar-list-create"
            onClick={() => navigate("/calendars/create")}
          >
            Create Calendar
          </Button>
        }
      />
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
        <Input
          id="bookings-calendar-list-search"
          data-testid="bookings-calendar-list-search"
          type="search"
          placeholder="Search calendars"
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
            data-testid="bookings-calendar-list-filter-trigger"
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
                  : buildDefaultSearchClauses(calendarSearchSchema)
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
        getRowId={(calendar) => calendar.uid}
        loading={loading}
        rowClassName={(calendar) => (calendar.status === "INACTIVE" ? "opacity-70" : "")}
        onRowClick={(calendar) =>
          navigate(`/calendars/${calendar.uid}/details`, { state: { calendar } })
        }
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={
          <EmptyState
            title="No calendars found"
            description="No calendars match the current search."
          />
        }
        tableClassName="min-w-[800px]"
        data-testid="bookings-calendar"
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
              schema={calendarSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(calendarSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
              emptyStateMessage="No calendar filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(calendarSearchSchema);
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
