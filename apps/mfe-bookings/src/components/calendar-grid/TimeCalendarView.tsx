import { Button } from "@jaldee/design-system";
import type { CalendarBooking, CalendarResource, CalendarSlot, ResourceMeta, ViewByMode, WeekColumn } from "./model";
import { getBookingColor, getInitials, summarizeBookingsByCalendar, summarizeBookingsByDoctor, toRgba } from "./model";

interface TimeCalendarViewProps {
  hours: string[];
  days: CalendarResource[];
  viewBy: ViewByMode;
  isWeekView: boolean;
  isDayView: boolean;
  isChipLayout: boolean;
  weekColumns: WeekColumn[];
  resourceMeta: ResourceMeta[];
  onEventClick?: (payload: unknown) => void;
  onResourceDrilldown?: (payload: { date: Date; resourceId: string; resourceLabel: string }) => void;
}

const renderDayEmptySlot = (day: CalendarResource, onEventClick?: (payload: unknown) => void) => (
  <Button
    className="day-empty-button"
    variant="ghost"
    size="sm"
    style={{ borderColor: day.color, background: "#fff" }}
    onClick={() => onEventClick?.({ dayId: day.id, label: day.label, time: "New slot", status: "Available" })}
    type="button"
  >
    <span className="day-empty-icon" aria-hidden="true">+</span>
  </Button>
);

const renderMonthCell = (
  day: CalendarResource & { resourceDate?: Date; dateLabel?: string },
  bookings: CalendarBooking[],
  onEventClick?: (payload: unknown) => void,
  useDayLayout = false,
  viewBy: ViewByMode = "View by doctors",
  slot: CalendarSlot | null = null
) => {
  if (day.onLeave) return <div className="leave-cell" aria-label={`${day.label} on leave`}><span>On Leave</span></div>;

  if (useDayLayout && viewBy === "View by calendars") {
    if (bookings.length === 0) return renderDayEmptySlot(day, onEventClick);
    const doctorGroups = summarizeBookingsByDoctor(bookings, viewBy);
    if (doctorGroups.length === 0) return renderDayEmptySlot(day, onEventClick);
    const slotKey = slot?.timeLabel ?? "";

    return <div className="day-calendar-stack">{doctorGroups.map((group) => {
      const accentColor = group.color || "#6c32ff";
      return (
        <Button
          key={`${day.id}-${slotKey}-${group.label}`}
          type="button"
          variant="ghost"
          size="sm"
          className="day-calendar-chip"
          style={{ borderColor: accentColor, background: toRgba(accentColor, 0.12) }}
          onClick={() => onEventClick?.({
            type: "slot-summary",
            entries: [{ id: `${day.id}-${slotKey}-${group.label}`, label: group.label, count: group.count, color: accentColor, bookings: group.bookings }],
            label: group.label,
            timeLabel: slot?.timeLabel,
            totalBookings: group.count,
            date: day.resourceDate instanceof Date ? day.resourceDate : day.resourceDate ? new Date(day.resourceDate) : slot?.date ? new Date(slot.date) : null,
            dayLabel: day.day || day.label || "",
            dateLabel: day.dateLabel || slot?.date || (day.resourceDate ? day.resourceDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : ""),
          })}
        >
          <div className="day-calendar-chip-header" style={{ background: toRgba(accentColor, 0.16), color: accentColor }}>
            <span className="day-calendar-chip-initials" style={{ background: accentColor }}>{getInitials(group.label)}</span>
            <span className="day-calendar-chip-plus" style={{ borderColor: accentColor, color: accentColor }}>+</span>
          </div>
          <div className="day-calendar-chip-body">
            <strong className="day-calendar-chip-count">{group.count}</strong>
            <span className="day-calendar-chip-label">{group.count === 1 ? "Booking" : "Bookings"}</span>
          </div>
        </Button>
      );
    })}</div>;
  }

  if (bookings.length === 0) return useDayLayout ? renderDayEmptySlot(day, onEventClick) : <div className="empty-slot" />;

  if (bookings.length > 2) {
    const groups = summarizeBookingsByCalendar(bookings, viewBy);
    if (groups.length > 4) {
      const palette = groups.slice(0, 5).map((group) => group.color || "#6c32ff");
      const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
      return <div className="day-summary-grid"><Button type="button" variant="ghost" size="sm" className="day-summary-card day-summary-overflow" style={{ borderColor: palette[0] ?? "#dfe2f2", background: "transparent" }} aria-label={`${groups.length} calendars`} onClick={() => onEventClick?.({ dayId: day.id, calendar: "multiple", count: totalCount })}><div className="day-summary-burst">{palette.map((color, index) => <span key={index} style={{ background: color }} />)}</div></Button></div>;
    }

    return <div className="day-summary-grid">{groups.map((group) => {
      const summaryColor = group.color || "#6c32ff";
      return (
        <Button
          key={`${day.id}-${group.calendar}`}
          type="button"
          variant="ghost"
          size="sm"
          className="day-summary-card"
          style={{ borderColor: summaryColor, background: toRgba(summaryColor, 0.12) }}
          onClick={() => onEventClick?.({ dayId: day.id, calendar: group.calendar, count: group.count })}
        >
          <div className="day-summary-content">
            <strong className="day-summary-count">{group.count}</strong>
            <span className="day-summary-label">{group.count === 1 ? "Booking" : "Bookings"}</span>
            <span className="day-summary-action" aria-hidden="true">+</span>
          </div>
        </Button>
      );
    })}</div>;
  }

  return <div className={`chip-stack ${useDayLayout ? "day-view-chip-stack" : ""}`}>{bookings.map((booking) => {
    const color = getBookingColor(booking, viewBy);
    return <Button key={`${booking.patient}-${booking.time}`} className="booking-chip" variant="ghost" size="sm" style={{ borderColor: color, background: toRgba(color, 0.12) }} onClick={() => onEventClick?.(booking)} type="button"><span className="booking-chip-text"><strong>{booking.patient}</strong><span className="booking-chip-time">{booking.time}</span></span><span className="kebab" aria-hidden="true">...</span></Button>;
  })}</div>;
};

const renderWeekSlot = (slot: WeekColumn["slots"][number] | undefined, column: Pick<WeekColumn, "dayLabel" | "dateLabel" | "date">, onEventClick?: (payload: unknown) => void) => {
  if (!slot || slot.entries.length === 0) return <div className="empty-slot" />;
  const sortedEntries = [...slot.entries].sort((a, b) => b.count - a.count);
  const totalBookings = sortedEntries.reduce((sum, entry) => sum + entry.count, 0);
  const summaryPayload = { type: "slot-summary", entries: sortedEntries, timeLabel: slot.timeLabel, dayLabel: column.dayLabel, dateLabel: column.dateLabel, date: column.date, totalBookings };

  return <div className="week-slot-stack">{sortedEntries.map((entry) => <Button key={`${slot.timeLabel}-${entry.id}`} type="button" variant="ghost" size="sm" className="week-slot-entry" style={{ borderColor: entry.color, background: toRgba(entry.color, 0.08) }} onClick={() => onEventClick?.(sortedEntries.length > 1 || entry.count > 1 ? summaryPayload : { resourceId: entry.id, timeLabel: slot.timeLabel, bookingCount: entry.count })}><span className="week-slot-avatar" style={{ background: entry.color }}>{getInitials(entry.label)}</span><span className="week-slot-count">{entry.count} bookings</span><span className="week-slot-action" aria-hidden="true">+</span></Button>)}</div>;
};

export function TimeCalendarView({ hours, days, viewBy, isWeekView, isDayView, isChipLayout, weekColumns, resourceMeta, onEventClick, onResourceDrilldown }: TimeCalendarViewProps) {
  const headerColumns = isWeekView ? weekColumns : resourceMeta;
  const columnCount = Math.max(headerColumns.length, 1);
  const weekColumnWidth = `calc((100% - 120px)/${columnCount})`;
  const columnTemplate = isWeekView ? `120px repeat(${columnCount}, minmax(0, ${weekColumnWidth}))` : `120px repeat(${columnCount}, 300px)`;
  const bodyColumns = isWeekView ? weekColumns : days;

  return (
    <div className={`calendar-grid ${isChipLayout ? "month-view" : ""} ${isDayView ? "day-view" : ""} ${isWeekView ? "week-view" : ""}`}>
      <div className="calendar-grid-content">
        <div className="calendar-scroll">
          <div className="calendar-grid-inner">
            <div className="calendar-header" style={{ gridTemplateColumns: columnTemplate }}>
              <div className="calendar-timezone">
                <div className="calendar-header-left">
                  <Button className="header-icon" type="button" variant="ghost" size="sm" aria-label="Menu">ƒ~ø</Button>
                </div>
                <div className="timezone-label">{isWeekView ? "Slots" : "UTC +05:30"}</div>
              </div>
              {isWeekView ? headerColumns.map((column) => <div key={column.id} className="weekday-header"><div className="weekday-header-top"><span className="weekday-label">{column.dayLabel}</span><strong className="weekday-date">{column.dateLabel}</strong></div><span className="weekday-count">{column.totalBookings} bookings</span></div>) : headerColumns.map((day) => <div key={day.id} className={`doctor-card ${day.onLeave ? "on-leave" : ""}`} style={{ borderColor: day.color }} onClick={() => onResourceDrilldown?.({ date: day.date ? new Date(day.date as never) : new Date(), resourceId: day.id, resourceLabel: day.label })}><div className="doctor-card-top"><div className="doctor-avatar" style={{ backgroundColor: day.color }}>{day.initials}</div><div className="doctor-info"><strong>{day.label}</strong><span>{day.totalBookings} bookings</span></div></div><div className="doctor-card-meta">{day.onLeave ? <span className="doctor-badge">On Leave</span> : <span className="doctor-dot" style={{ background: day.color }} />}</div></div>)}
            </div>

            <div className="calendar-body" style={{ gridTemplateColumns: columnTemplate }}>
              {hours.map((hour) => (
                <div key={hour} className="calendar-row" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="hour-column">{hour}</div>
                  {bodyColumns.map((column) => {
                    const slot = column.slots?.find((slotItem: CalendarSlot) => slotItem.timeLabel === hour);
                    return <div key={`${column.id}-${hour}`} className={`calendar-cell ${column.onLeave ? "on-leave" : ""}`}>
                      {isWeekView ? renderWeekSlot(slot, column, onEventClick) : isChipLayout ? renderMonthCell(column, slot?.bookings ?? [], onEventClick, isDayView, viewBy, slot ?? null) : (() => {
                        const bookings = slot?.bookings ?? [];
                        if (bookings.length === 0) return <div className="empty-slot" />;
                        if (bookings.length <= 2) {
                          return <div className="detail-stack">{bookings.map((booking) => {
                            const detailColor = getBookingColor(booking, viewBy);
                            return <Button key={`${booking.patient}-${booking.time}`} className="detail-card" variant="ghost" size="sm" style={{ borderColor: detailColor }} onClick={() => onEventClick?.(booking)} type="button"><div className="detail-header"><div className="detail-header-labels"><strong>{booking.patient}</strong><span className="status-pill" style={{ borderColor: booking.statusColor, color: booking.statusColor }}>{booking.status}</span></div></div><span className="detail-time">{booking.timeRange || booking.time}</span><span className="detail-service">{booking.service}</span></Button>;
                          })}</div>;
                        }
                        return <div className="line-stack">{bookings.map((booking, index) => <span key={`${booking.patient}-${booking.time}-${index}`} className="booking-line" style={{ background: getBookingColor(booking, viewBy) || column.color }} onClick={() => onEventClick?.(booking)} title={`${booking.patient} ${booking.time}`} />)}</div>;
                      })()}
                    </div>;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
