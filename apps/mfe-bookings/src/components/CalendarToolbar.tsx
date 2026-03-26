import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import "./CalendarToolbar.css";

type CalendarView = "day" | "week" | "month";
type LayoutMode = "calendar" | "list";
type ViewByOption = "View by doctors" | "View by calendars" | "View by departments";

export interface CalendarToolbarProps {
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  calendarView: CalendarView;
  onCalendarViewChange: (view: CalendarView) => void;
  viewBy: ViewByOption | string;
  onViewByChange: (value: string) => void;
  filterSummary?: string;
  onFilterOpen?: () => void;
  onDatePickerToggle?: (anchorRect?: DOMRect) => void;
  onSidebarToggle?: () => void;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  dateLabel?: string;
}

const views: CalendarView[] = ["day", "week", "month"];
const viewByOptions: ViewByOption[] = [
  "View by doctors",
  "View by calendars",
  "View by departments",
];

const layoutOptions: Array<{ key: LayoutMode; label: string; icon: ReactNode }> = [
  {
    key: "calendar",
    label: "Calendar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="3" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.25" />
        <path d="M3 1.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M13 1.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "list",
    label: "List",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="10" height="1.7" rx="1" fill="currentColor" />
        <rect x="3" y="7" width="10" height="1.7" rx="1" fill="currentColor" />
        <rect x="3" y="10" width="10" height="1.7" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function CalendarToolbar({
  layout,
  onLayoutChange,
  calendarView,
  onCalendarViewChange,
  viewBy,
  onViewByChange,
  filterSummary,
  onFilterOpen,
  onDatePickerToggle,
  onSidebarToggle,
  onPrevDate,
  onNextDate,
  dateLabel = "",
}: CalendarToolbarProps): JSX.Element {
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleDateToggle = () => {
    const rect = dateButtonRef.current?.getBoundingClientRect();
    onDatePickerToggle?.(rect);
  };

  const displayLabel =
    dateLabel ||
    (calendarView === "month"
      ? "Month view"
      : calendarView === "week"
      ? "Week overview"
      : "Daily window");

  const activeLayout = layoutOptions.find((option) => option.key === layout) || layoutOptions[0];

  return (
    <div className="calendar-toolbar">
      <div className="toolbar-left">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
        >
          <span aria-hidden="true">|||</span>
        </button>

        <div className="layout-card">
          <div className="layout-icons">
            {layoutOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`layout-icon-btn ${layout === option.key ? "active" : ""}`}
                onClick={() => onLayoutChange(option.key)}
                aria-label={option.label}
                aria-pressed={layout === option.key}
              >
                <span className="layout-icon">{option.icon}</span>
              </button>
            ))}
          </div>
          <span className="layout-card-label">{activeLayout.label}</span>
        </div>
      </div>

      <div className="toolbar-middle">
        <div className="view-controls">
          <div className="view-buttons">
            {views.map((view) => (
              <button
                key={view}
                id={`view-${view}`}
                type="button"
                className={calendarView === view ? "active" : ""}
                onClick={() => onCalendarViewChange(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="date-range">
          <button type="button" className="flat" aria-label="Previous" onClick={onPrevDate}>
            &lt;
          </button>
          <button type="button" className="caret" ref={dateButtonRef} onClick={handleDateToggle}>
            <span className="date-label-text">{displayLabel}</span>
            <span className="date-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="1.25"
                  y="3.25"
                  width="13.5"
                  height="11.5"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
                <path d="M1.25 5.25h13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <path d="M4.25 0.75v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <path d="M11.75 0.75v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          <button type="button" className="flat" aria-label="Next" onClick={onNextDate}>
            &gt;
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <select value={viewBy} onChange={(event) => onViewByChange(event.target.value)}>
          {viewByOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button type="button" className="filter-button" onClick={onFilterOpen}>
          Filter {filterSummary ? <span className="filter-pill">{filterSummary}</span> : null}
        </button>

        <button type="button" className="action-button">
          + Create
        </button>
      </div>
    </div>
  );
}