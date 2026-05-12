import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import './App.css';
import CalendarGrid from './components/CalendarGrid';
import CalendarToolbar from './components/CalendarToolbar';
import FiltersOverlay from './components/FiltersOverlay';
import SidebarFilters from './components/SidebarFilters';
import {
  fetchCalendarData,
  getSavedFilters,
  getSidebarFilters,
  listViewGroups,
} from './services/calendarService';
import { DatePickerPopover, PageErrorBoundary as DesignSystemPageErrorBoundary } from '@jaldee/design-system';
import TopBar from './components/TopBar';
import DrivePage from './pages/DrivePage';
import ReportsPage from './pages/ReportsPage';
import PlaceholderPage from './pages/PlaceholderPage';

const ListView = lazy(() => import('./components/ListView'));
const BookingModal = lazy(() => import('./components/BookingModal'));
const SummaryModal = lazy(() => import('./components/SummaryModal'));

const pad = (value: number | string) => String(value).padStart(2, '0');

const buildRoutePath = (
  view: 'day' | 'week' | 'month',
  date: Date,
  basePath = '/bookings'
) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  if (view === 'month') {
    return `${basePath}/month/${year}/${month}`;
  }

  return `${basePath}/${view}/${year}/${month}/${day}`;
};

type DashboardViewProps = {
  startLayout?: 'calendar' | 'list';
  defaultView?: 'day' | 'week' | 'month';
};

function DashboardView({
  startLayout = 'calendar',
  defaultView = 'week',
}: DashboardViewProps) {
  const [layout, setLayout] = useState(startLayout);
  const navigate = useNavigate();
  const params = useParams();
  const { year, month, day } = params;

  const dateFromParams = useMemo(() => {
    const today = new Date();
    const parsedYear = year ? Number(year) : today.getFullYear();
    const parsedMonth = month ? Number(month) - 1 : today.getMonth();
    const parsedDay = day ? Number(day) : today.getDate();
    return new Date(parsedYear, parsedMonth, parsedDay);
  }, [year, month, day]);

  const [currentDate, setCurrentDate] = useState(dateFromParams);
  const [calendarView, setCalendarView] = useState(defaultView);
  const [viewBy, setViewBy] = useState('View by doctors');
  const [calendarData, setCalendarData] = useState(() =>
    fetchCalendarData(defaultView, 'View by doctors', dateFromParams)
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterSummary, setFilterSummary] = useState('Filter 1');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerAnchor, setDatePickerAnchor] = useState<DOMRect | null>(null);

  const toggleDatePicker = (anchorRect?: DOMRect) => {
    setShowDatePicker((prev) => {
      const next = !prev;
      if (next && anchorRect) {
        setDatePickerAnchor(anchorRect);
      }
      return next;
    });
  };

  const dateLabel = useMemo(() => {
    if (!currentDate) return '';

    const options: Intl.DateTimeFormatOptions =
      calendarView === 'month'
        ? { month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };

    let label = currentDate.toLocaleDateString('en-US', options);

    if (calendarView !== 'month') {
      const today = new Date();
      if (
        today.getFullYear() === currentDate.getFullYear() &&
        today.getMonth() === currentDate.getMonth() &&
        today.getDate() === currentDate.getDate()
      ) {
        label += ', Today';
      }
    }

    return label;
  }, [calendarView, currentDate]);

  useEffect(() => {
    setCalendarData(fetchCalendarData(calendarView, viewBy, currentDate));
  }, [calendarView, viewBy, currentDate]);

  useEffect(() => {
    setCalendarView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    setCurrentDate(dateFromParams);
  }, [dateFromParams]);

  useEffect(() => {
    setLayout(startLayout);
  }, [startLayout]);

  useEffect(() => {
    if (startLayout === 'list') {
      setSidebarVisible(false);
    }
  }, [startLayout]);

  const [filters, setFilters] = useState(() => getSidebarFilters());
  const savedFilters = useMemo(() => getSavedFilters(), []);

  const filteredCalendarData = useMemo(() => {
    if (!calendarData) return calendarData;

    const viewKey = String(calendarData.viewBy || viewBy || '').toLowerCase();
    const sectionPrefix = viewKey.includes('doctor')
      ? 'Users'
      : viewKey.includes('calendar')
        ? 'Calendars'
        : null;

    if (!sectionPrefix) return calendarData;

    const section = filters.find((candidate: any) =>
      candidate.title.startsWith(sectionPrefix)
    );
    if (!section) return calendarData;

    const selectedLabels = section.items
      .filter((item: any) => item.checked)
      .map((item: any) => item.label);

    const selectedSet = new Set(selectedLabels);

    return {
      ...calendarData,
      days: calendarData.days.filter((day: any) => selectedSet.has(day.label)),
    };
  }, [calendarData, filters, viewBy]);

  const handleFilterToggle = (
    sectionTitle: string,
    itemLabel: string,
    checked: boolean
  ) => {
    setFilters((prev: any[]) =>
      prev.map((section: any) => {
        if (section.title !== sectionTitle) return section;
        return {
          ...section,
          items: section.items.map((item: any) =>
            item.label === itemLabel ? { ...item, checked } : item
          ),
        };
      })
    );
  };

  const handleLayoutChange = (mode: 'calendar' | 'list') => {
    setLayout(mode);
    setSidebarVisible(mode !== 'list');
  };

  const handleCalendarViewChange = (mode: 'day' | 'week' | 'month') => {
    setCalendarView(mode);
    navigate(buildRoutePath(mode, currentDate));
  };

  const computeShiftedDate = (
    direction: number,
    view = calendarView,
    baseDate = currentDate
  ) => {
    const next = new Date(baseDate);

    if (view === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else if (view === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setDate(next.getDate() + direction);
    }

    return next;
  };

  const navigateToDate = (
    nextDate: Date,
    view: 'day' | 'week' | 'month' = calendarView
  ) => {
    setCurrentDate(nextDate);
    navigate(buildRoutePath(view, nextDate));
  };

  const handlePrevDate = () => {
    navigateToDate(computeShiftedDate(-1));
  };

  const handleNextDate = () => {
    navigateToDate(computeShiftedDate(1));
  };

  const handleDateSelection = (selection: any) => {
    setShowDatePicker(false);
    if (!selection) return;

    const normalized =
      typeof selection === 'string'
        ? { view: selection, date: currentDate || new Date() }
        : selection;

    const targetView = normalized.view || calendarView;
    const targetDate = normalized.date
      ? new Date(normalized.date)
      : currentDate || new Date();

    setCalendarView(targetView);
    navigateToDate(targetDate, targetView);
  };

  const handleEventClick = (event: any) => {
    if (!event) return;

    if (event.type === 'slot-summary') {
      setSelectedEvent(null);
      setSelectedSummary(event);
      return;
    }

    setSelectedSummary(null);
    setSelectedEvent(event);
  };

  return (
    <div className="app-shell">
      <div className="app-main">
        <TopBar/>

        {showDatePicker && (
          <DatePickerPopover
            selectedDate={currentDate}
            anchorRect={datePickerAnchor}
            onSelectDate={(date: Date) =>
              handleDateSelection({ view: calendarView, date })
            }
            onClose={() => setShowDatePicker(false)}
          />
        )}

        <div className="toolbar-row">
          <CalendarToolbar
            layout={layout}
            onLayoutChange={handleLayoutChange}
            calendarView={calendarView}
            onCalendarViewChange={handleCalendarViewChange}
            viewBy={viewBy}
            onViewByChange={setViewBy}
            filterSummary={filterSummary}
            onFilterOpen={() => setFilterPanelOpen(true)}
            onDatePickerToggle={toggleDatePicker}
            onPrevDate={handlePrevDate}
            onNextDate={handleNextDate}
            onSidebarToggle={() => setSidebarVisible((prev) => !prev)}
            dateLabel={dateLabel}
          />
        </div>

        <div className="workspace">
          {layout === 'calendar' && sidebarVisible && (
            <SidebarFilters filters={filters} onToggle={handleFilterToggle} />
          )}

          <div className="workspace-content">
            {layout === 'calendar' ? (
              <CalendarGrid
                payload={filteredCalendarData}
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelection}
              />
            ) : (
              <Suspense fallback={<div className="shell-loading">Loading list view...</div>}>
                <ListView groups={listViewGroups} />
              </Suspense>
            )}
          </div>

          {filterPanelOpen && (
            <FiltersOverlay
              savedFilters={savedFilters}
              onClose={() => setFilterPanelOpen(false)}
              activeFilter={filterSummary}
              onFilterSelect={setFilterSummary}
            />
          )}
        </div>
      </div>

      {selectedEvent && (
        <Suspense fallback={null}>
          <BookingModal booking={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </Suspense>
      )}

      {selectedSummary && (
        <Suspense fallback={null}>
          <SummaryModal
            summary={selectedSummary}
            onClose={() => setSelectedSummary(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function App() {
  const today = new Date();
  const placeholderRoutes = [
    'appointments/*',
    'requests/*',
    'tokens/*',
    'checkin/*',
    'queue/*',
    'schedule-settings/*',
    'calendar/*',
    'resources/*',
    'services/*',
    'staff-availability/*',
    'online-page/*',
    'deposits/*',
    'customers/*',
    'leads/*',
    'tasks/*',
    'users/*',
    'finance/*',
    'analytics/*',
    'membership/*',
    'audit-log/*',
    'settings/*',
  ];

  return (
    <Routes>
      <Route
        path="day/:year/:month/:day"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="day" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="week/:year/:month/:day"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="week" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="month/:year/:month"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="month" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="list"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView startLayout="list" defaultView="week" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="bookings/day/:year/:month/:day"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="day" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="bookings/week/:year/:month/:day"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="week" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="bookings/month/:year/:month"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView defaultView="month" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="bookings/list"
        element={
          <DesignSystemPageErrorBoundary>
            <DashboardView startLayout="list" defaultView="week" />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="drive"
        element={
          <DesignSystemPageErrorBoundary>
            <DrivePage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="drive/:view"
        element={
          <DesignSystemPageErrorBoundary>
            <DrivePage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="drive/:view/:subview"
        element={
          <DesignSystemPageErrorBoundary>
            <DrivePage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="drive/:view/:subview/:recordId"
        element={
          <DesignSystemPageErrorBoundary>
            <DrivePage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="reports"
        element={
          <DesignSystemPageErrorBoundary>
            <ReportsPage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="reports/:view"
        element={
          <DesignSystemPageErrorBoundary>
            <ReportsPage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="reports/:view/:subview"
        element={
          <DesignSystemPageErrorBoundary>
            <ReportsPage />
          </DesignSystemPageErrorBoundary>
        }
      />
      <Route
        path="reports/:view/:subview/:recordId"
        element={
          <DesignSystemPageErrorBoundary>
            <ReportsPage />
          </DesignSystemPageErrorBoundary>
        }
      />
      {placeholderRoutes.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <DesignSystemPageErrorBoundary>
              <PlaceholderPage />
            </DesignSystemPageErrorBoundary>
          }
        />
      ))}
      <Route
        path=""
        element={<Navigate replace to={buildRoutePath('week', today)} />}
      />
      <Route
        path="bookings"
        element={<Navigate replace to={buildRoutePath('week', today)} />}
      />
      <Route
        path="*"
        element={<Navigate to={buildRoutePath('week', today)} replace />}
      />
    </Routes>
  );
}

export default App;
