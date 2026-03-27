import "./CalendarGrid.css";
import { MonthCalendarView } from "./calendar-grid/MonthCalendarView";
import { TimeCalendarView } from "./calendar-grid/TimeCalendarView";
import {
  buildMonthCells,
  buildResourceMeta,
  buildWeekColumns,
  fallbackHours,
  getWeekDates,
} from "./calendar-grid/model";
import type {
  CalendarBooking,
  CalendarGridPayload,
  CalendarGridProps,
  CalendarResource,
  CalendarSlot,
  MonthCell,
} from "./calendar-grid/model";

export type {
  CalendarBooking,
  CalendarGridPayload,
  CalendarGridProps,
  CalendarResource,
  CalendarSlot,
  MonthCell,
} from "./calendar-grid/model";

export default function CalendarGrid({
  payload,
  onEventClick,
  onDateSelect,
  onResourceDrilldown,
}: CalendarGridProps): JSX.Element | null {
  if (!payload) return null;

  const hours = payload.hours || fallbackHours;
  const days = payload.days || [];
  const viewMode = payload.view;
  const viewBy = payload.viewBy || "View by doctors";
  const isWeekView = viewMode === "week";
  const isDayView = viewMode === "day";
  const isMonthView = viewMode === "month";
  const isChipLayout = isMonthView || isWeekView || isDayView;
  const weekDates = isWeekView ? getWeekDates(payload.focusDate) : [];
  const weekColumns = isWeekView ? buildWeekColumns(days, hours, weekDates, viewBy) : [];
  const focusDateValue = payload.focusDate ? new Date(payload.focusDate) : null;
  const monthCells = isMonthView ? buildMonthCells(days, focusDateValue, viewBy) : [];
  const staticMonthCells = payload.staticMonthGrid ?? [];
  const monthViewCells = isMonthView
    ? staticMonthCells.length > 0
      ? staticMonthCells
      : monthCells
    : [];

  if (isMonthView && monthViewCells.length > 0) {
    return (
      <MonthCalendarView
        cells={monthViewCells}
        focusDateValue={focusDateValue}
        onDateSelect={onDateSelect}
        onEventClick={onEventClick}
      />
    );
  }

  return (
    <TimeCalendarView
      hours={hours}
      days={days}
      viewBy={viewBy}
      isWeekView={isWeekView}
      isDayView={isDayView}
      isChipLayout={isChipLayout}
      weekColumns={weekColumns}
      resourceMeta={buildResourceMeta(days)}
      onEventClick={onEventClick}
      onResourceDrilldown={onResourceDrilldown}
    />
  );
}
