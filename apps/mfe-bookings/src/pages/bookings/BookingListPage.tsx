import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  DatePickerPopover,
  Popover,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useBookings } from "../../services/useBookings";
import { useUsers } from "../../services/useUsers";
import { useCalendars } from "../../services/useCalendars";
import { useBookingSearchSchema } from "../../services/useBookingSearchSchema";
import { formatAppliedFilterSummary } from "../../services/bookingSearch";
import { useDashboardFilters } from "../../services/useDashboardFilters";
import BookingSearchFiltersDrawer from "../calendar/BookingSearchFiltersDrawer";
import SaveDashboardFilterModal from "../calendar/SaveDashboardFilterModal";
import CreateAppointmentDrawer from "../booking/CreateAppointmentDrawer";
import { useModal } from "../../contexts/ModalContext";

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[2.2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

export default function BookingListPage() {
  const navigate = useNavigate();
  const { openModal, openDrawer } = useModal();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const dateTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);

  const { schema: bookingSearchSchema, loading: bookingSearchSchemaLoading } = useBookingSearchSchema();
  const { filters: savedFilters, saveFilter: createSavedFilter } = useDashboardFilters();
  const [activeFilterUid, setActiveFilterUid] = useState<string | undefined>();
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const appliedAdvancedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, bookingSearchSchema).length,
    [advancedFilters, bookingSearchSchema]
  );

  const appliedAdvancedFilterSummary = useMemo(
    () => formatAppliedFilterSummary(advancedFilters, bookingSearchSchema),
    [advancedFilters, bookingSearchSchema]
  );

  const openSchemaFilters = (initialFilters?: SearchFilterClause[]) => {
    const defaultClauses = buildDefaultSearchClauses(bookingSearchSchema);
    const savedClauses = initialFilters || (advancedFilters.length > 0 ? advancedFilters : []);
    const mergedFilters = defaultClauses.map((defaultClause) => {
      const savedClause = savedClauses.find((sc) => sc.field === defaultClause.field);
      return savedClause ? { ...defaultClause, ...savedClause } : defaultClause;
    });
    setDraftFilters(mergedFilters);

    openDrawer(
      <BookingSearchFiltersDrawer
        schema={bookingSearchSchema}
        draftFilters={mergedFilters}
        appliedCount={appliedAdvancedFilterCount}
        appliedSummary={appliedAdvancedFilterSummary}
        onChange={setDraftFilters}
        onReset={() => {
          const resetFilters = buildDefaultSearchClauses(bookingSearchSchema);
          setDraftFilters(resetFilters);
          setAdvancedFilters(resetFilters);
          setActiveFilterUid(undefined);
        }}
        onApply={(filters) => {
          setDraftFilters(filters);
          setAdvancedFilters(filters.length > 0 ? filters : mergedFilters);
          setActiveFilterUid(undefined);
        }}
        onSaveFilter={(filters) => {
          openModal(
            <SaveDashboardFilterModal
              onSave={async (name) => {
                await createSavedFilter(name, filters.length > 0 ? filters : mergedFilters);
              }}
              onSaveAndApply={async (name) => {
                const created = await createSavedFilter(name, filters.length > 0 ? filters : mergedFilters);
                setAdvancedFilters(created.filter.filters);
                setActiveFilterUid(created.uid);
              }}
            />
          );
        }}
      />,
      { panelClassName: "bg-[#f8fafc] w-96 max-w-full" }
    );
  };

  const { bookings, loading } = useBookings(
    format(currentDate, "yyyy-MM-dd"),
    "MONTH",
    advancedFilters,
    bookingSearchSchema,
    { enabled: !bookingSearchSchemaLoading }
  );

  const { users } = useUsers();
  const { calendars } = useCalendars(undefined, null, { loadSchema: false });

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bookings.filter(
      (booking: any) =>
        !normalized ||
        (booking.customerName || "").toLowerCase().includes(normalized) ||
        (booking.serviceName || "").toLowerCase().includes(normalized)
    );
  }, [query, bookings]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        key: "dateTime",
        header: "DATE & TIME",
        sortable: true,
        width: "20%",
        render: (booking: any) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {booking.bookingDate ? format(new Date(booking.bookingDate), "dd MMM yyyy") : "-"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {booking.startTime || "-"}
            </p>
          </div>
        ),
      },
      {
        key: "customer",
        header: "CUSTOMER NAME",
        sortable: true,
        width: "25%",
        render: (booking: any) => (
          <div className="font-semibold text-slate-900">
            {booking.customerName || "-"}
          </div>
        ),
      },
      {
        key: "staff",
        header: "USER (STAFF)",
        render: (booking: any) => {
          const staff = users.find((u: any) => u.userUid === booking.providerId || u.userUid === booking.userUid || u.uid === booking.providerId || u.uid === booking.userUid || u.id === booking.providerId || u.id === booking.userUid);
          return (
            <div className="text-sm text-slate-700">
              {staff?.userDisplayName || staff?.displayName || staff?.name || booking.userName || booking.providerName || "-"}
            </div>
          );
        },
      },
      {
        key: "service",
        header: "SERVICE",
        render: (booking: any) => (
          <div className="text-sm text-slate-700">
            {booking.serviceName || "-"}
          </div>
        ),
      },
      {
        key: "calendar",
        header: "CALENDAR",
        render: (booking: any) => {
          const cal = calendars.find((c: any) => (c.uid || c.id) === (booking.calendarUid || booking.calendarId));
          return (
            <div className="text-sm text-slate-700">
              {cal?.name || "-"}
            </div>
          );
        },
      },
      {
        key: "status",
        header: "STATUS",
        render: (booking: any) => {
          const status = booking.status || "Requested";
          return (
            <Badge variant={status === "Cancelled" ? "error" : status === "Confirmed" || status === "Completed" ? "success" : "neutral"}>
              {status}
            </Badge>
          );
        },
      },
    ],
    [users, calendars]
  );

  return (
    <section className="flex h-full flex-col bg-slate-50">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <PageHeader
          onBack={() => navigate("/")}
          title="Bookings List"
          subtitle="View and manage all your bookings in a detailed list."
          className="p-0 border-0 m-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          {savedFilters.length > 0 ? (
            <Popover
              open={isFilterPopoverOpen}
              onOpenChange={setIsFilterPopoverOpen}
              placement="bottom"
              align="end"
              contentClassName="!w-[300px] !p-0 overflow-hidden shadow-lg border border-slate-200"
              trigger={
                <Button
                  type="button"
                  variant={appliedAdvancedFilterCount > 0 ? "primary" : "outline"}
                  size="sm"
                  className={`filter-applied-btn flex items-center gap-2 rounded-md px-4 py-2 font-semibold ${
                    appliedAdvancedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                  }`}
                  onClick={() => openSchemaFilters()}
                >
                  <FilterIcon />
                  <span id="filter-btn-text">Filter</span>
                  {appliedAdvancedFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                      {appliedAdvancedFilterCount}
                    </span>
                  )}
                </Button>
              }
            >
              <div className="flex flex-col bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <h3 className="font-bold text-slate-800 text-base">Filters</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFilterPopoverOpen(false);
                      openSchemaFilters(buildDefaultSearchClauses(bookingSearchSchema));
                    }}
                    className="rounded-md px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#311090" }}
                  >
                    +Create
                  </button>
                </div>
                <div className="flex flex-col py-2">
                  {savedFilters.map((filter) => {
                    const isActive = filter.uid === activeFilterUid;
                    return (
                      <div key={filter.uid} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="radio"
                            name="savedFilter"
                            className="h-4 w-4 border-slate-300 text-[#311090] focus:ring-[#311090]"
                            style={{ accentColor: "#311090" }}
                            checked={isActive}
                            onChange={() => {
                              setAdvancedFilters(filter.filter.filters);
                              setActiveFilterUid(filter.uid);
                              setIsFilterPopoverOpen(false);
                            }}
                          />
                          <span className="text-sm font-semibold text-slate-700">{filter.name}</span>
                        </label>
                        <button
                          type="button"
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 ml-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFilterPopoverOpen(false);
                            openSchemaFilters(filter.filter.filters);
                          }}
                        >
                          Manage
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Popover>
          ) : (
            <Button
              type="button"
              variant={appliedAdvancedFilterCount > 0 ? "primary" : "outline"}
              className={`filter-applied-btn flex items-center gap-2 rounded-md px-4 py-2 font-semibold ${
                appliedAdvancedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
              }`}
              onClick={() => openSchemaFilters()}
            >
              <FilterIcon />
              <span id="filter-btn-text">Filter</span>
              {appliedAdvancedFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                  {appliedAdvancedFilterCount}
                </span>
              )}
            </Button>
          )}

          <div className="relative">
            <Button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="border-0 px-4 font-bold"
              style={{
                backgroundColor: "#311090",
                color: "white",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>+ Create</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: createMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Button>
            {createMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCreateMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      openDrawer(<CreateAppointmentDrawer initialDate={currentDate} />);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <path d="m9 16 2 2 4-4" />
                    </svg>
                    Booking
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      navigate("/calendars/create", { state: { returnTo: "/" } });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="hidden md:inline">Calendar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="toolbar flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4"
        style={{ height: "64px" }}
        data-testid="bookings-list-toolbar"
      >
        <div className="toolbar-left flex items-center gap-4">
          <div className="view-pill-group flex rounded-lg bg-slate-100 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="view-pill active flex items-center bg-white shadow-sm text-[#4c37b6]"
              aria-label="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span className="hidden md:inline ml-2 font-bold text-sm tracking-wide">List</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="view-pill flex items-center px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              onClick={() => navigate("/")}
              aria-label="Calendar View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </Button>
          </div>
          <div className="mx-2 h-6 w-px bg-slate-200 hidden md:block" />
          <div className="date-navigator flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="nav-arrow-btn flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 p-0 text-slate-600 shadow-sm"
              aria-label="Previous Month"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
            </Button>
                        <Button
              variant="ghost"
              size="sm"
              className="date-picker-trigger flex h-8 items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-800 shadow-sm hover:bg-slate-50"
              ref={dateTriggerRef}
              onClick={() => setIsDatePickerOpen(true)}
            >
              <span className="whitespace-nowrap">{format(currentDate, "MMM yyyy")}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon ml-2 text-purple-600">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </Button>
            {isDatePickerOpen && (
              <DatePickerPopover
                selectedDate={currentDate}
                anchorRef={dateTriggerRef}
                align="start"
                title="Select month"
                onSelectDate={(selectedDate) => {
                  setCurrentDate(selectedDate);
                  setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="nav-arrow-btn flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 p-0 text-slate-600 shadow-sm"
              aria-label="Next Month"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search bookings by customer or service"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            containerClassName="max-w-md"
          />
        </div>
        <DataTable
        data={filtered}
        columns={columns}
        getRowId={(booking: any) => booking.id || booking.uid}
        loading={loading}
        pagination={{
          page,
          pageSize: 15,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No bookings found" description="Try changing the search or month." />}
        tableClassName="min-w-[900px]"
      />
      </div>
    </section>
  );
}
