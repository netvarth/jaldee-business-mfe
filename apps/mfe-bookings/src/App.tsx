import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import CalendarGrid from './components/CalendarGrid';
import CalendarToolbar from './components/CalendarToolbar';
import FiltersOverlay from './components/FiltersOverlay';
import GlobalNav from './components/GlobalNav';
import ListView from './components/ListView';
import SidebarFilters from './components/SidebarFilters';
import TopBar from './components/TopBar';
import BookingModal from './components/BookingModal';
import SummaryModal from './components/SummaryModal';
import DatePickerPopover from './components/DatePickerPopover';
import {
  fetchCalendarData,
  getSavedFilters,
  getSidebarFilters,
  listViewGroups,
} from './services/calendarService';

const pad = (value) => String(value).padStart(2, '0');
const buildRoutePath = (view, date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  if (view === 'month') {
    return `/month/${year}/${month}`;
  }
  return `/${view}/${year}/${month}/${day}`;
};

function DashboardView({ startLayout = 'calendar', defaultView = 'week' }) {
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
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerAnchor, setDatePickerAnchor] = useState(null);
  const toggleDatePicker = (anchorRect) => {
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
    const options =
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

    const section = filters.find((candidate) => candidate.title.startsWith(sectionPrefix));
    if (!section) return calendarData;

    const selectedLabels = section.items.filter((item) => item.checked).map((item) => item.label);
    const selectedSet = new Set(selectedLabels);

    return {
      ...calendarData,
      days: calendarData.days.filter((day) => selectedSet.has(day.label)),
    };
  }, [calendarData, filters, viewBy]);

  const handleFilterToggle = (sectionTitle, itemLabel, checked) => {
    setFilters((prev) =>
      prev.map((section) => {
        if (section.title !== sectionTitle) return section;
        return {
          ...section,
          items: section.items.map((item) =>
            item.label === itemLabel ? { ...item, checked } : item
          ),
        };
      })
    );
  };

  const handleLayoutChange = (mode) => {
    setLayout(mode);
    if (mode === 'list') {
      setSidebarVisible(false);
    } else {
      setSidebarVisible(true);
    }
  };

  const handleCalendarViewChange = (mode) => {
    setCalendarView(mode);
    navigate(buildRoutePath(mode, currentDate));
  };

  const computeShiftedDate = (direction, view = calendarView, baseDate = currentDate) => {
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

  const navigateToDate = (nextDate, view = calendarView) => {
    setCurrentDate(nextDate);
    navigate(buildRoutePath(view, nextDate));
  };

  const handlePrevDate = () => {
    const nextDate = computeShiftedDate(-1);
    navigateToDate(nextDate);
  };

  const handleNextDate = () => {
    const nextDate = computeShiftedDate(1);
    navigateToDate(nextDate);
  };

  const handleDateSelection = (selection) => {
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

  const handleEventClick = (event) => {
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
      <GlobalNav collapsed={navCollapsed} onToggle={() => setNavCollapsed((prev) => !prev)} />
      <div className="app-main">
        <TopBar location="Thrissur" />
        {showDatePicker && (
          <DatePickerPopover
            selectedDate={currentDate}
            anchorRect={datePickerAnchor}
            onSelectDate={(date) => handleDateSelection({ view: calendarView, date })}
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
              <ListView groups={listViewGroups} />
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
        <BookingModal booking={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      {selectedSummary && (
        <SummaryModal summary={selectedSummary} onClose={() => setSelectedSummary(null)} />
      )}
    </div>
  );
}

function App() {
  const today = new Date();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate replace to={buildRoutePath('week', today)} />} />
        <Route path="day/:year/:month/:day" element={<DashboardView defaultView="day" />} />
        <Route path="week/:year/:month/:day" element={<DashboardView defaultView="week" />} />
        <Route path="month/:year/:month" element={<DashboardView defaultView="month" />} />
        <Route path="list" element={<DashboardView startLayout="list" defaultView="week" />} />
        <Route path="patients" element={<DashboardView defaultView="week" />} />
        <Route path="notes" element={<DashboardView defaultView="week" />} />
        <Route path="insights" element={<DashboardView defaultView="week" />} />
        <Route path="*" element={<Navigate replace to={buildRoutePath('week', today)} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
