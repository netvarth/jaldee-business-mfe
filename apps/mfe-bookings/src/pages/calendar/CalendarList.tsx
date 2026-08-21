import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  cn,
  Dialog,
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
  const [calendarToDisable, setCalendarToDisable] = useState<Calendar | null>(null);
  const [openPopoverUid, setOpenPopoverUid] = useState<string | null>(null);

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
                let channelLabel = channel;
                const normalized = channel.toLowerCase();
                if (normalized === "online") {
                  Icon = Monitor;
                  channelLabel = "Online";
                } else if (normalized === "walk-in" || normalized === "walk_in") {
                  Icon = MapPin;
                  channelLabel = "Walk-in";
                } else if (normalized === "phone-in" || normalized === "phone_in") {
                  Icon = Phone;
                  channelLabel = "Phone-in";
                } else if (normalized === "ivr") {
                  Icon = Phone;
                  channelLabel = "IVR";
                }

                return (
                  <span
                    key={channel}
                    className="flex items-center gap-1 text-[12px] font-medium text-slate-700"
                  >
                    {Icon && <Icon size={12} className="text-slate-500" />}
                    {channelLabel}
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
              open={openPopoverUid === calendar.uid}
              onOpenChange={(open) => setOpenPopoverUid(open ? calendar.uid || null : null)}
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
              <div className="flex min-w-[150px] flex-col whitespace-nowrap py-1">
                <button
                  id={`bookings-calendar-edit-${calendar.uid}`}
                  data-testid={`bookings-calendar-edit-${calendar.uid}`}
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenPopoverUid(null);
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
                    setOpenPopoverUid(null);
                    if (calendar.status === "ACTIVE") {
                      setCalendarToDisable(calendar);
                    } else {
                      toggleStatus(calendar, false);
                    }
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
    [navigate, openPopoverUid],
  );

  return (
    <section
      id="page-calendars"
      data-testid="bookings-calendar-list-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-white p-4 md:p-6"
    >
      <PageHeader
        title="Calendars"
        description="Manage your booking calendars."
        actions={
          <Button id="btn-create-calendar" onClick={() => navigate("/calendars/create")}>
            Create Calendar
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Input
            id="bookings-calendar-search-input"
            data-testid="bookings-calendar-search-input"
            type="search"
            placeholder="Search calendars"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            containerClassName="max-w-md w-full"
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              id="bookings-calendar-filter-btn"
              data-testid="bookings-calendar-filter-btn"
              variant="outline"
              icon={<FilterIcon />}
              onClick={() => setDrawerOpen(true)}
            >
              Filters
              {appliedFilterCount > 0 && (
                <Badge variant="primary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                  {appliedFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {appliedFilterSummary && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Applied Filters:</span>
            <span>{appliedFilterSummary}</span>
            <button
              className="ml-2 text-indigo-600 hover:underline"
              onClick={() => {
                setAdvancedFilters([]);
                setDraftFilters([]);
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Loading calendars...
          </div>
        ) : calendars.length === 0 ? (
          <EmptyState
            title="No calendars found"
            description="You don't have any calendars yet. Create one to start managing your bookings."
            action={
              <Button onClick={() => navigate("/calendars/create")}>
                Create Calendar
              </Button>
            }
          />
        ) : (
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
                title="No matching calendars"
                description="Try adjusting your search query or filters to find what you're looking for."
              />
            }
            tableClassName="min-w-[800px]"
            data-testid="bookings-calendar"
          />
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Advanced Filters"
        position="right"
        size="md"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <SchemaFilterBuilder
              schema={calendarSearchSchema}
              clauses={draftFilters}
              onChange={setDraftFilters}
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6 bg-slate-50">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
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

      <Dialog
        open={calendarToDisable !== null}
        onClose={() => setCalendarToDisable(null)}
        title="Disable Calendar"
        description="Do you want to cancel all upcoming active bookings automatically? If no, they will be flagged for rescheduling."
        size="md"
      >
        <div className="flex gap-3 mt-6">
          <Button
            variant="danger"
            className="flex-1 justify-center"
            onClick={async () => {
              if (calendarToDisable) {
                await toggleStatus(calendarToDisable, true);
                setCalendarToDisable(null);
              }
            }}
          >
            Cancel Bookings
          </Button>
          <Button
            variant="primary"
            className="flex-1 justify-center"
            onClick={async () => {
              if (calendarToDisable) {
                await toggleStatus(calendarToDisable, false);
                setCalendarToDisable(null);
              }
            }}
          >
            Reschedule bookings
          </Button>
        </div>
      </Dialog>
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
