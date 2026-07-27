import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button, DatePickerPopover, PageHeader, Select, Popover } from "@jaldee/design-system";
import {
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useCalendars } from "../../services/useCalendars";
import { useBookings } from "../../services/useBookings";
import { useProviders } from "../../services/useProviders";
import { useServices } from "../../services/useServices";
import { useBookingSearchSchema } from "../../services/useBookingSearchSchema";
import { formatAppliedFilterSummary } from "../../services/bookingSearch";
import { useModal } from "../../contexts/ModalContext";
import BookingSearchFiltersDrawer from "./BookingSearchFiltersDrawer";
import WeekGrid from "./WeekGrid";
import MonthGrid from "./MonthGrid";
import ListGrid from "./ListGrid";
import CreateAppointmentDrawer from "../booking/CreateAppointmentDrawer";
import BlockSlotModal from "../booking/BlockSlotModal";
import DayGrid from "./DayGrid";
import { useDashboardFilters } from "../../services/useDashboardFilters";
import SaveDashboardFilterModal from "./SaveDashboardFilterModal";
import "./calendar-grid.css";
import "./list-view.css";

interface CalendarDashboardProps {
  onBookingSelect: (bookingId: string) => void;
}

function getUserInitials(name?: string, code?: string) {
  const normalizedCode = code?.trim();
  if (normalizedCode) {
    return normalizedCode.slice(0, 2).toUpperCase();
  }

  const normalizedName = name?.trim();
  if (!normalizedName) {
    return "NA";
  }

  const parts = normalizedName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function resolveSidebarAvatarColors(rawColor?: string) {
  void rawColor;
  return { backgroundColor: "#ffffff", color: "#be185d" };
}

export default function CalendarDashboard({ onBookingSelect }: CalendarDashboardProps) {
  const { openModal, openDrawer } = useModal();
  const navigate = useNavigate();
  const calendarFilters = React.useMemo<SearchFilterClause[]>(() => [], []);
  const { calendars } = useCalendars(calendarFilters, null, { loadSchema: false });
  const { providers: liveProviders } = useProviders();
  const { services } = useServices();
  const {
    schema: bookingSearchSchema,
    loading: bookingSearchSchemaLoading,
  } = useBookingSearchSchema();

  const [viewMode, setViewMode] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const [layoutMode] = useState<"grid" | "list">("grid");
  const [viewBy, setViewBy] = useState<"doctors" | "calendars">("doctors");
  const [date, setDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [providersOpen, setProvidersOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [calendarsOpen, setCalendarsOpen] = useState(true);
  
  const { filters: savedFilters, saveFilter: createSavedFilter, deleteFilter: removeSavedFilter } = useDashboardFilters();
  const [activeFilterUid, setActiveFilterUid] = useState<string | undefined>();
  const [pendingSavedFilterSearch, setPendingSavedFilterSearch] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const dateTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const { bookings: liveBookings, refresh: refreshBookings } = useBookings(
    format(date, "yyyy-MM-dd"),
    viewMode,
    advancedFilters,
    bookingSearchSchema,
    { enabled: !bookingSearchSchemaLoading }
  );

  const appliedAdvancedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, bookingSearchSchema).length,
    [advancedFilters, bookingSearchSchema]
  );

  const appliedAdvancedFilterSummary = useMemo(
    () => formatAppliedFilterSummary(advancedFilters, bookingSearchSchema),
    [advancedFilters, bookingSearchSchema]
  );

  const getCalendarKey = React.useCallback(
    (calendar: { uid?: string; id?: string }) => calendar.uid ?? calendar.id ?? "",
    []
  );

  React.useEffect(() => {
    if (calendars.length > 0 && selectedCalendarIds.size === 0) {
      setSelectedCalendarIds(new Set(calendars.map(getCalendarKey).filter(Boolean)));
    }
  }, [calendars, getCalendarKey, selectedCalendarIds.size]);

  React.useEffect(() => {
    if (liveProviders.length > 0 && selectedUserIds.size === 0) {
      setSelectedUserIds(new Set(liveProviders.map((provider) => provider.uid || provider.id || "")));
    }
  }, [liveProviders, selectedUserIds.size]);

  React.useEffect(() => {
    if (services.length > 0 && selectedServiceIds.size === 0) {
      setSelectedServiceIds(new Set(services.map((service) => service.id || "")));
    }
  }, [services, selectedServiceIds.size]);

  React.useEffect(() => {
    if (!pendingSavedFilterSearch) {
      return;
    }

    refreshBookings();
    setPendingSavedFilterSearch(false);
  }, [pendingSavedFilterSearch, refreshBookings]);

  const filteredCalendars =
    selectedCalendarIds.size === 0
      ? calendars
      : calendars.filter((calendar) => selectedCalendarIds.has(getCalendarKey(calendar)));

  const filteredProviders =
    selectedUserIds.size === 0
      ? liveProviders
      : liveProviders.filter((provider) => selectedUserIds.has(provider.uid || provider.id || ""));

  const getProviderKey = React.useCallback(
    (provider: { uid?: string; id?: string }) => provider.uid ?? provider.id ?? "",
    []
  );

  const getServiceKey = React.useCallback(
    (service: { id?: string }) => service.id ?? "",
    []
  );

  const filteredBookings = liveBookings.filter((booking: any) => {
    const calendarId = booking.calendarId || booking.calendarUid;
    const providerId = booking.providerId || booking.userUid;
    const serviceId = booking.serviceId || booking.serviceUid;

    if (calendarId && selectedCalendarIds.size > 0 && !selectedCalendarIds.has(calendarId)) {
      return false;
    }

    if (providerId && selectedUserIds.size > 0 && !selectedUserIds.has(providerId)) {
      return false;
    }

    if (serviceId && selectedServiceIds.size > 0 && !selectedServiceIds.has(serviceId)) {
      return false;
    }

    return true;
  });

  const formattedDate = `${format(date, "dd MMM yyyy")}`;

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

  return (
    <section
      id="page-dashboard"
      data-testid="bookings-calendar-dashboard"
      className="page-section active relative flex h-full flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
        <PageHeader
          title="Calendar"
          className="mb-4"
          actions={
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
                        appliedAdvancedFilterCount > 0
                          ? ""
                          : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                      }`}
                      id="filter-panel-toggle"
                      data-testid="bookings-filter-panel-toggle"
                    >
                      <FilterIcon />
                      <span id="filter-btn-text">Filter</span>
                      {appliedAdvancedFilterCount > 0 ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                          {appliedAdvancedFilterCount}
                        </span>
                      ) : null}
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
                          <div
                            key={filter.uid}
                            className={`flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50`}
                          >
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
                                  setPendingSavedFilterSearch(true);
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
                  size="sm"
                  className={`filter-applied-btn flex items-center gap-2 rounded-md px-4 py-2 font-semibold ${
                    appliedAdvancedFilterCount > 0
                      ? ""
                      : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                  }`}
                  id="filter-panel-toggle"
                  data-testid="bookings-filter-panel-toggle"
                  onClick={() => openSchemaFilters()}
                >
                  <FilterIcon />
                  <span id="filter-btn-text">Filter</span>
                  {appliedAdvancedFilterCount > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                      {appliedAdvancedFilterCount}
                    </span>
                  ) : null}
                </Button>
              )}
              <div className="relative">
                <Button
                  id="bookings-create-appointment"
                  data-testid="bookings-create-appointment"
                  onClick={() => setCreateMenuOpen(!createMenuOpen)}
                  size="sm"
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
                          openDrawer(<CreateAppointmentDrawer initialDate={date} />);
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
          }
        />
      </div>

      <div
        className="toolbar flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4"
        style={{ height: "64px" }}
        data-testid="bookings-calendar-toolbar"
      >
        <div className="toolbar-left flex items-center gap-4">
          <div className="view-pill-group">
            <Button
              variant="ghost"
              size="sm"
              className="view-pill"
              onClick={() => navigate("/bookings")}
              aria-label="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="view-pill active"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:mr-1">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="hidden md:inline">Calendar</span>
            </Button>
          </div>
          <div className="mx-2 h-6 w-px bg-slate-200 hidden md:block" />
          <div className="hidden md:block">
            <div className="view-pill-group">
              <Button
                variant="ghost"
                size="sm"
                id="bookings-view-day"
                data-testid="bookings-view-day"
                data-active={viewMode === "DAY"}
                className={`view-pill ${viewMode === "DAY" ? "active" : ""}`}
                onClick={() => setViewMode("DAY")}
              >
                Day
              </Button>
              <Button
                variant="ghost"
                size="sm"
                id="bookings-view-week"
                data-testid="bookings-view-week"
                data-active={viewMode === "WEEK"}
                className={`view-pill ${viewMode === "WEEK" ? "active" : ""}`}
                onClick={() => setViewMode("WEEK")}
              >
                Week
              </Button>
              <Button
                variant="ghost"
                size="sm"
                id="bookings-view-month"
                data-testid="bookings-view-month"
                data-active={viewMode === "MONTH"}
                className={`view-pill ${viewMode === "MONTH" ? "active" : ""}`}
                onClick={() => setViewMode("MONTH")}
              >
                Month
              </Button>
            </div>
          </div>
          <div className="date-navigator">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              }
              aria-label="Previous period"
              id="bookings-prev-period"
              data-testid="bookings-prev-period"
              className="nav-arrow-btn"
              onClick={() => {
                const nextDate = new Date(date);
                nextDate.setDate(date.getDate() - (viewMode === "DAY" ? 1 : 7));
                setDate(nextDate);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              id="bookings-current-date"
              data-testid="bookings-current-date"
              ref={dateTriggerRef}
              className="date-picker-trigger border border-slate-200 bg-white font-bold text-slate-800"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <span>{formattedDate}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon ml-1 text-purple-600">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              }
              aria-label="Next period"
              id="bookings-next-period"
              data-testid="bookings-next-period"
              className="nav-arrow-btn"
              onClick={() => {
                const nextDate = new Date(date);
                nextDate.setDate(date.getDate() + (viewMode === "DAY" ? 1 : 7));
                setDate(nextDate);
              }}
            />
            {isDatePickerOpen ? (
              <DatePickerPopover
                selectedDate={date}
                anchorRef={dateTriggerRef}
                align="start"
                title="Select date"
                onSelectDate={(selectedDate) => {
                  setDate(selectedDate);
                  setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
              />
            ) : null}
          </div>
        </div>

        <div className="hidden md:flex ml-auto items-center justify-end">
          <div className="toolbar-right flex items-center justify-end">
            <div className="group-select-wrapper">
              <Select
                className="custom-select border-slate-200 bg-slate-50 text-sm font-medium"
                containerClassName="min-w-[160px]"
                id="group-view-by"
                testId="bookings-group-view-by"
                value={viewBy}
                options={[
                  { value: "doctors", label: "View by Users" },
                  { value: "calendars", label: "View by Calendar" },
                ]}
                onChange={(event) => setViewBy(event.target.value as typeof viewBy)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-body flex-1 overflow-hidden">
        <aside
          className={`dashboard-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}
          id="dashboard-sidebar-panel"
          data-testid="bookings-dashboard-sidebar"
          data-state={isSidebarCollapsed ? "collapsed" : "open"}
        >
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`sidebar-toggle-chevron ${isSidebarCollapsed ? "collapsed" : "open"}`}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            }
            id="bookings-sidebar-collapse"
            data-testid="bookings-sidebar-collapse"
            className="sidebar-collapse-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Toggle Sidebar Panel"
            aria-label="Toggle sidebar panel"
            data-state={isSidebarCollapsed ? "collapsed" : "open"}
          />

          <div className="sidebar-scrollable-content">
            <div className="md:hidden flex flex-col gap-2 p-2 border-b border-slate-200">
              <div className="view-pill-group w-full flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`view-pill flex-1 ${viewMode === "DAY" ? "active" : ""}`}
                  onClick={() => setViewMode("DAY")}
                >
                  Day
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`view-pill flex-1 ${viewMode === "WEEK" ? "active" : ""}`}
                  onClick={() => setViewMode("WEEK")}
                >
                  Week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`view-pill flex-1 ${viewMode === "MONTH" ? "active" : ""}`}
                  onClick={() => setViewMode("MONTH")}
                >
                  Month
                </Button>
              </div>
              
              <div>
                <Select
                  className="w-full border-slate-200 bg-white text-sm font-medium"
                  id="mobile-group-view-by"
                  testId="bookings-mobile-group-view-by"
                  value={viewBy}
                  options={[
                    { value: "doctors", label: "View by Users" },
                    { value: "calendars", label: "View by Calendar" },
                  ]}
                  onChange={(event) => setViewBy(event.target.value as typeof viewBy)}
                />
              </div>
            </div>
            <div
              className={`sidebar-group ${!calendarsOpen ? "collapsed" : ""}`}
              data-testid="bookings-calendars-group"
              data-state={calendarsOpen ? "open" : "collapsed"}
            >
              <div className="sidebar-group-header" onClick={() => setCalendarsOpen(!calendarsOpen)}>
                <span className="group-title">Calendars ({selectedCalendarIds.size === 0 ? calendars.length : selectedCalendarIds.size}/{calendars.length})</span>
                <div className="group-actions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`group-chevron ${calendarsOpen ? "open" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className="sidebar-group-body">
                <div className={`sidebar-option-list ${calendars.length > 5 ? "scrollable" : ""}`}>
                  {calendars.map((calendar) => {
                    const id = getCalendarKey(calendar);
                    return (
                      <div key={id} className="sidebar-option-row">
                        <input
                          type="checkbox"
                          id={`cal-${id}`}
                          className="sidebar-checkbox sidebar-checkbox-calendar h-4 w-4 rounded border-slate-300 text-purple-600 accent-purple-600 focus:ring-purple-500"
                          style={{ accentColor: calendar.color || "#7c3aed" }}
                          checked={selectedCalendarIds.size === 0 || selectedCalendarIds.has(id)}
                          onChange={(event) => {
                            let nextSet = new Set(selectedCalendarIds);
                            if (selectedCalendarIds.size === 0) {
                              nextSet = new Set(calendars.map(getCalendarKey).filter(Boolean));
                            }
                            if (event.target.checked) nextSet.add(id);
                            else nextSet.delete(id);
                            if (nextSet.size === calendars.length) nextSet.clear();
                            setSelectedCalendarIds(nextSet);
                          }}
                        />
                        <label htmlFor={`cal-${id}`} className="sidebar-option-label">
                          {calendar.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className={`sidebar-group mt-2 ${!providersOpen ? "collapsed" : ""}`}
              data-testid="bookings-providers-group"
              data-state={providersOpen ? "open" : "collapsed"}
            >
              <div className="sidebar-group-header" onClick={() => setProvidersOpen(!providersOpen)}>
                <span className="group-title">Users ({selectedUserIds.size === 0 ? liveProviders.length : selectedUserIds.size}/{liveProviders.length})</span>
                <div className="group-actions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`group-chevron ${providersOpen ? "open" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className="sidebar-group-body">
                <div className="sidebar-search-wrap">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" x2="16.65" y1="21" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Search User" className="sidebar-search-input" />
                </div>
                <div className={`sidebar-option-list sidebar-user-list ${liveProviders.length > 5 ? "scrollable" : ""}`}>
                  {liveProviders.map((user) => {
                    const id = getProviderKey(user);
                    const avatarColors = resolveSidebarAvatarColors(user.color);

                    return (
                      <div key={id} className="sidebar-option-row sidebar-option-row-user">
                        <input
                          type="checkbox"
                          id={`user-${id}`}
                          className="sidebar-checkbox h-4 w-4 shrink-0 rounded border-slate-300 text-purple-600 accent-purple-600 focus:ring-purple-500"
                          checked={selectedUserIds.size === 0 || selectedUserIds.has(id)}
                          onChange={(event) => {
                            let nextSet = new Set(selectedUserIds);
                            if (selectedUserIds.size === 0) {
                              nextSet = new Set(liveProviders.map(getProviderKey).filter(Boolean));
                            }
                            if (event.target.checked) nextSet.add(id);
                            else nextSet.delete(id);
                            if (nextSet.size === liveProviders.length) nextSet.clear();
                            setSelectedUserIds(nextSet);
                          }}
                        />
                        <label htmlFor={`user-${id}`} className="sidebar-option-label sidebar-user-label">
                          <div className="sidebar-user-avatar" style={avatarColors}>
                            {getUserInitials(user.name, user.code)}
                          </div>
                          <span className="truncate">{user.name}</span>
                          {user.status === "leave" ? <span className="sidebar-leave-pill">LEAVE</span> : null}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className={`sidebar-group mt-2 ${!servicesOpen ? "collapsed" : ""}`}
              data-testid="bookings-services-group"
              data-state={servicesOpen ? "open" : "collapsed"}
            >
              <div className="sidebar-group-header" onClick={() => setServicesOpen(!servicesOpen)}>
                <span className="group-title">Services ({selectedServiceIds.size === 0 ? services.length : selectedServiceIds.size})</span>
                <div className="group-actions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`group-chevron ${servicesOpen ? "open" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className="sidebar-group-body">
                <div className={`sidebar-option-list ${services.length > 5 ? "scrollable" : ""}`}>
                  {services.map((service) => {
                    const id = getServiceKey(service);
                    return (
                      <div key={id} className="sidebar-option-row">
                        <input
                          type="checkbox"
                          id={`svc-${id}`}
                          className="sidebar-checkbox h-4 w-4 shrink-0 rounded border-slate-300 text-purple-600 accent-purple-600 focus:ring-purple-500"
                          checked={selectedServiceIds.size === 0 || selectedServiceIds.has(id)}
                          onChange={(event) => {
                            let nextSet = new Set(selectedServiceIds);
                            if (selectedServiceIds.size === 0) {
                              nextSet = new Set(services.map(getServiceKey).filter(Boolean));
                            }
                            if (event.target.checked) nextSet.add(id);
                            else nextSet.delete(id);
                            if (nextSet.size === services.length) nextSet.clear();
                            setSelectedServiceIds(nextSet);
                          }}
                        />
                        <label htmlFor={`svc-${id}`} className="sidebar-option-label">
                          {service.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="calendar-grid-container" id="calendar-grid-scroll-area" data-testid="bookings-calendar-grid-area" data-view-mode={viewMode}>
          {layoutMode === "list" ? (
            <ListGrid
              bookings={filteredBookings as any}
              calendars={filteredCalendars as any}
              services={services}
              users={filteredProviders as any}
              onBookingSelect={onBookingSelect}
            />
          ) : viewMode === "DAY" ? (
            <DayGrid
              date={date}
              viewBy={viewBy}
              users={filteredProviders as any}
              calendars={filteredCalendars as any}
              bookings={filteredBookings as any}
              services={services}
              onBookingSelect={onBookingSelect}
            />
          ) : viewMode === "WEEK" ? (
            <WeekGrid
              date={date}
              viewBy={viewBy}
              users={filteredProviders as any}
              calendars={filteredCalendars as any}
              bookings={filteredBookings as any}
              services={services}
              onBookingSelect={onBookingSelect}
            />
          ) : (
            <MonthGrid
              date={date}
              viewBy={viewBy}
              users={filteredProviders as any}
              calendars={filteredCalendars as any}
              bookings={filteredBookings as any}
              services={services}
              onBookingSelect={onBookingSelect}
              onDaySelect={(selectedDate, uid) => {
                setDate(selectedDate);
                setViewMode("DAY");
                if (uid) {
                  if (viewBy === "doctors") {
                    setSelectedUserIds(new Set([uid]));
                  } else {
                    setSelectedCalendarIds(new Set([uid]));
                  }
                }
              }}
            />
          )}
        </div>
      </div>
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
