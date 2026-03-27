import { Button } from "@jaldee/design-system";
import "./CalendarGrid.css";

type CalendarViewMode = "day" | "week" | "month" | string;
type ViewByMode = "View by doctors" | "View by calendars" | "View by departments" | string;

export interface CalendarBooking {
  id?: string | number;
  patient?: string;
  time?: string;
  timeRange?: string;
  service?: string;
  status?: string;
  statusColor?: string;
  color?: string;
  calendar?: string;
  calendarColor?: string;
  doctor?: string;
  doctorColor?: string;
  departmentColor?: string;
  label?: string;
  date?: string;
  timeIndex?: number;
}

export interface CalendarSlot {
  timeLabel: string;
  timeRange?: string;
  date?: string;
  bookings?: CalendarBooking[];
}

export interface CalendarResource {
  id: string;
  label: string;
  color?: string;
  date?: string | number | Date;
  day?: string;
  onLeave?: boolean;
  slots?: CalendarSlot[];
}

export interface MonthCell {
  id: string;
  placeholder?: boolean;
  date?: Date;
  bookings?: Array<{
    label: string;
    color: string;
    count: number;
  }>;
  summary?: unknown;
  isCurrentMonth?: boolean;
}

export interface CalendarGridPayload {
  hours?: string[];
  days?: CalendarResource[];
  view?: CalendarViewMode;
  viewBy?: ViewByMode;
  focusDate?: Date | string;
  staticMonthGrid?: MonthCell[];
}

export interface CalendarGridProps {
  payload?: CalendarGridPayload | null;
  onEventClick?: (payload: unknown) => void;
  onDateSelect?: (payload: { view: "day"; date?: Date }) => void;
  onResourceDrilldown?: (payload: {
    date: Date;
    resourceId: string;
    resourceLabel: string;
  }) => void;
}

const fallbackHours = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
];

const WEEKDAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_FOCUS_DATE = new Date(2025, 10, 1);

const getInitials = (label?: string): string =>
  label
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "";

const toRgba = (color = "#6c32ff", alpha = 0.14): string => {
  if (!color.startsWith("#")) return `rgba(108, 50, 255, ${alpha})`;
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
  const intValue = Number.parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return `rgba(108, 50, 255, ${alpha})`;

  const red = (intValue >> 16) & 255;
  const green = (intValue >> 8) & 255;
  const blue = intValue & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getBookingColor = (booking?: CalendarBooking, viewBy: ViewByMode = "View by doctors"): string => {
  if (!booking) return "#6c32ff";
  if (viewBy === "View by doctors" && booking.calendarColor) return booking.calendarColor;
  if (viewBy === "View by calendars" && booking.doctorColor) return booking.doctorColor;
  if (viewBy === "View by departments" && booking.departmentColor) return booking.departmentColor;
  return (
    booking.color ||
    booking.calendarColor ||
    booking.departmentColor ||
    booking.doctorColor ||
    "#6c32ff"
  );
};

const summarizeBookingsByCalendar = (bookings: CalendarBooking[]) => {
  const map = new Map<string, { calendar: string; color: string; count: number }>();

  bookings.forEach((booking) => {
    const calendar = booking.calendar || "Unknown";
    const color = booking.calendarColor || booking.color || "#6c32ff";
    const existing = map.get(calendar);

    if (existing) {
      existing.count += 1;
    } else {
      map.set(calendar, { calendar, color, count: 1 });
    }
  });

  return Array.from(map.values());
};

const summarizeBookingsByDoctor = (bookings: CalendarBooking[] = []) => {
  const map = new Map<
    string,
    {
      label: string;
      color: string;
      count: number;
      bookings: CalendarBooking[];
      minTimeIndex: number;
    }
  >();

  bookings.forEach((booking) => {
    const doctorLabel = booking.doctor || booking.label || "Doctor";
    const color = booking.doctorColor || booking.color || "#6c32ff";
    const existing = map.get(doctorLabel);
    const timeIndex =
      typeof booking.timeIndex === "number" ? booking.timeIndex : Number.POSITIVE_INFINITY;

    if (existing) {
      existing.count += 1;
      existing.bookings.push(booking);
      existing.minTimeIndex = Math.min(existing.minTimeIndex, timeIndex);
    } else {
      map.set(doctorLabel, {
        label: doctorLabel,
        color,
        count: 1,
        bookings: [booking],
        minTimeIndex: timeIndex,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const delta = (a.minTimeIndex ?? 0) - (b.minTimeIndex ?? 0);
    if (delta !== 0) return delta;
    return a.label.localeCompare(b.label);
  });
};

const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const deriveResourceDateKey = (resource?: CalendarResource, focusDate?: Date | null): string | null => {
  if (!resource) return null;

  const booking =
    resource.slots?.reduce<CalendarBooking | null>((found, slot) => {
      if (found) return found;
      return slot.bookings?.find((entry) => entry.date) ?? null;
    }, null) ?? null;

  if (booking?.date) return booking.date;

  const fallbackDay = Number(resource.date);
  const targetBase = focusDate || DEFAULT_FOCUS_DATE;
  const dayValue = Number.isNaN(fallbackDay) ? targetBase.getDate() : fallbackDay;
  const fallbackDate = new Date(targetBase.getFullYear(), targetBase.getMonth(), dayValue);

  return formatDateKey(fallbackDate);
};

const getDaysInMonth = (date: Date): number => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const buildMonthCells = (days: CalendarResource[], focusDate: Date | null) => {
  const focus = focusDate || DEFAULT_FOCUS_DATE;
  const year = focus.getFullYear();
  const month = focus.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = getDaysInMonth(focus);
  const aggregated = new Map<
    string,
    {
      entries: Map<
        string,
        {
          id: string;
          label: string;
          color: string;
          count: number;
          bookings: CalendarBooking[];
        }
      >;
      totalBookings: number;
    }
  >();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    aggregated.set(formatDateKey(date), {
      entries: new Map(),
      totalBookings: 0,
    });
  }

  days.forEach((resource) => {
    const dateKey = deriveResourceDateKey(resource, focus);
    const dayMeta = dateKey ? aggregated.get(dateKey) : undefined;
    if (!dateKey || !dayMeta) return;

    resource.slots?.forEach((slot) => {
      slot.bookings?.forEach((booking) => {
        if (!booking) return;

        const entryId = resource.id || resource.label || String(booking.id) || `${dateKey}-${slot.timeLabel}`;
        const existing = dayMeta.entries.get(entryId);
        const entryLabel = resource.label || booking.calendar || booking.doctor || "Booking";
        const entryColor =
          resource.color || booking.color || booking.calendarColor || booking.doctorColor || "#6c32ff";

        const entry = existing ?? {
          id: entryId,
          label: entryLabel,
          color: entryColor,
          count: 0,
          bookings: [],
        };

        entry.count += 1;
        entry.bookings.push({
          ...booking,
          time: booking.time || slot.timeLabel,
          timeRange: booking.timeRange || slot.timeRange,
          status: booking.status,
          service: booking.service,
        });

        dayMeta.entries.set(entryId, entry);
        dayMeta.totalBookings += 1;
      });
    });
  });

  const cells: MonthCell[] = [];

  for (let i = 0; i < firstOfMonth.getDay(); i += 1) {
    cells.push({ id: `leading-${i}`, placeholder: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dayMeta = aggregated.get(dateKey);
    const summaryEntries = dayMeta ? Array.from(dayMeta.entries.values()) : [];
    const summary =
      summaryEntries.length === 0
        ? null
        : {
            type: "slot-summary",
            entries: summaryEntries.map((entry) => ({
              id: entry.id,
              label: entry.label,
              color: entry.color,
              count: entry.count,
              bookings: entry.bookings,
            })),
            date,
            dateLabel: date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            dayLabel: date.toLocaleDateString("en-US", { weekday: "long" }),
            timeLabel: "All day",
            totalBookings: dayMeta?.totalBookings ?? 0,
          };

    const displayBookings =
      summaryEntries.slice(0, 3).map((entry) => ({
        label: entry.label,
        color: entry.color,
        count: entry.count,
      })) ?? [];

    cells.push({
      id: dateKey,
      date,
      bookings: displayBookings,
      summary: summary ?? undefined,
      isCurrentMonth: true,
      placeholder: false,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ id: `trailing-${cells.length}`, placeholder: true });
  }

  return cells;
};

const isSameDate = (a?: Date | null, b?: Date | null): boolean =>
  Boolean(
    a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
  );

const renderDayEmptySlot = (
  day: CalendarResource,
  onEventClick?: (payload: unknown) => void
) => (
  <Button
    className="day-empty-button"
    variant="ghost"
    size="sm"
    style={{
      borderColor: day.color,
      background: toRgba(day.color, 0.08),
    }}
    onClick={() =>
      onEventClick?.({
        dayId: day.id,
        label: day.label,
        time: "New slot",
        status: "Available",
      })
    }
    type="button"
  >
    <span className="day-empty-icon" aria-hidden="true">
      +
    </span>
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
  if (day.onLeave) {
    return (
      <div className="leave-cell" aria-label={`${day.label} on leave`}>
        <span>On Leave</span>
      </div>
    );
  }

  if (useDayLayout && viewBy === "View by calendars") {
    if (bookings.length === 0) return renderDayEmptySlot(day, onEventClick);

    const doctorGroups = summarizeBookingsByDoctor(bookings);
    if (doctorGroups.length === 0) return renderDayEmptySlot(day, onEventClick);

    const slotKey = slot?.timeLabel ?? "";

    return (
      <div className="day-calendar-stack">
        {doctorGroups.map((group) => {
          const accentColor = group.color || "#6c32ff";

          return (
            <Button
              key={`${day.id}-${slotKey}-${group.label}`}
              type="button"
              variant="ghost"
              size="sm"
              className="day-calendar-chip"
              style={{ borderColor: accentColor, background: "#fff" }}
              onClick={() => {
                const entry = {
                  id: `${day.id}-${slotKey}-${group.label}`,
                  label: group.label,
                  count: group.count,
                  color: accentColor,
                  bookings: group.bookings,
                };

                onEventClick?.({
                  type: "slot-summary",
                  entries: [entry],
                  label: group.label,
                  timeLabel: slot?.timeLabel,
                  totalBookings: group.count,
                  date:
                    day.resourceDate instanceof Date
                      ? day.resourceDate
                      : day.resourceDate
                      ? new Date(day.resourceDate)
                      : slot?.date
                      ? new Date(slot.date)
                      : null,
                  dayLabel: day.day || day.label || "",
                  dateLabel:
                    day.dateLabel ||
                    slot?.date ||
                    (day.resourceDate
                      ? day.resourceDate.toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""),
                });
              }}
            >
              <div
                className="day-calendar-chip-header"
                style={{ background: toRgba(accentColor, 0.16), color: accentColor }}
              >
                <span className="day-calendar-chip-initials" style={{ background: accentColor }}>
                  {getInitials(group.label)}
                </span>
                <span
                  className="day-calendar-chip-plus"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  +
                </span>
              </div>
              <div className="day-calendar-chip-body">
                <strong className="day-calendar-chip-count">{group.count}</strong>
                <span className="day-calendar-chip-label">
                  {group.count === 1 ? "Booking" : "Bookings"}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    );
  }

  if (bookings.length === 0) {
    if (useDayLayout) return renderDayEmptySlot(day, onEventClick);
    return <div className="empty-slot" />;
  }

  if (bookings.length > 2) {
    const groups = summarizeBookingsByCalendar(bookings);
    const allowCards = groups.length <= 4;

    if (!allowCards) {
      const palette = groups.slice(0, 5).map((group) => group.color || "#6c32ff");
      const totalCount = groups.reduce((sum, group) => sum + group.count, 0);

      return (
        <div className="day-summary-grid">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="day-summary-card day-summary-overflow"
            style={{
              borderColor: palette[0] ?? "#dfe2f2",
              background: "transparent",
            }}
            aria-label={`${groups.length} calendars`}
            onClick={() =>
              onEventClick?.({
                dayId: day.id,
                calendar: "multiple",
                count: totalCount,
              })
            }
          >
            <div className="day-summary-burst">
              {palette.map((color, index) => (
                <span key={index} style={{ background: color }} />
              ))}
            </div>
          </Button>
        </div>
      );
    }

    return (
      <div className="day-summary-grid">
        {groups.map((group) => {
          const summaryColor = group.color || "#6c32ff";

          return (
            <Button
              key={`${day.id}-${group.calendar}`}
              type="button"
              variant="ghost"
              size="sm"
              className="day-summary-card"
              style={{
                borderColor: summaryColor,
                background: toRgba(summaryColor, 0.18),
              }}
              onClick={() =>
                onEventClick?.({
                  dayId: day.id,
                  calendar: group.calendar,
                  count: group.count,
                })
              }
            >
              <strong>{group.count}</strong>
              <span>{group.count === 1 ? "Booking" : "Bookings"}</span>
              <span className="day-summary-action" aria-hidden="true">
                +
              </span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`chip-stack ${useDayLayout ? "day-view-chip-stack" : ""}`}>
      {bookings.map((booking) => {
        const color = getBookingColor(booking, viewBy);

        return (
          <Button
            key={`${booking.patient}-${booking.time}`}
            className="booking-chip"
            variant="ghost"
            size="sm"
            style={{
              borderColor: color,
              background: toRgba(color, 0.12),
            }}
            onClick={() => onEventClick?.(booking)}
            type="button"
          >
            <span className="booking-chip-text">
              <strong>{booking.patient}</strong>
              <span className="booking-chip-time">{booking.time}</span>
            </span>
            <span className="kebab" aria-hidden="true">
              ...
            </span>
          </Button>
        );
      })}
    </div>
  );
};

const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

const getWeekDates = (focusDate?: Date | string): Date[] => {
  const base = new Date(focusDate || Date.now());
  const startOfWeek = new Date(base);
  startOfWeek.setDate(base.getDate() - base.getDay());

  return WEEKDAY_ORDER.map((_, index) => {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + index);
    return current;
  });
};

const buildWeekColumns = (days: CalendarResource[], hours: string[], weekDates: Date[] = []) => {
  const columns = WEEKDAY_ORDER.map((dayLabel, index) => ({
    id: `weekday-${dayLabel.toLowerCase()}`,
    dayLabel,
    dateLabel: weekDates[index] ? formatDateLabel(weekDates[index]) : "",
    date: weekDates[index] ?? null,
    dayIndex: index,
    color: "",
    totalBookings: 0,
    slotEntries: new Map<
      string,
      Map<
        string,
        {
          id: string;
          label: string;
          color?: string;
          count: number;
          bookings: CalendarBooking[];
        }
      >
    >(),
    slots: [] as Array<{
      timeLabel: string;
      entries: Array<{
        id: string;
        label: string;
        color?: string;
        count: number;
        bookings: CalendarBooking[];
      }>;
    }>,
  }));

  const columnsByLabel = new Map(columns.map((column) => [column.dayLabel, column]));

  days.forEach((resource) => {
    const dayLabel = resource.day || "Sunday";
    const column = columnsByLabel.get(dayLabel);
    if (!column) return;

    if (!column.dateLabel && resource.date) {
      column.dateLabel = String(resource.date);
    }
    if (!column.color && resource.color) {
      column.color = resource.color;
    }

    resource.slots?.forEach((slot) => {
      const bookings = slot.bookings ?? [];
      if (bookings.length === 0) return;

      column.totalBookings += bookings.length;

      let hourMap = column.slotEntries.get(slot.timeLabel);
      if (!hourMap) {
        hourMap = new Map();
        column.slotEntries.set(slot.timeLabel, hourMap);
      }

      const entry = hourMap.get(resource.id) ?? {
        id: resource.id,
        label: resource.label,
        color: resource.color,
        count: 0,
        bookings: [],
      };

      entry.count += bookings.length;
      entry.bookings.push(
        ...bookings.map((booking) => ({
          id: booking.id,
          patient: booking.patient,
          time: booking.time,
          timeRange: booking.timeRange,
          service: booking.service,
          status: booking.status,
        }))
      );

      hourMap.set(resource.id, entry);
    });
  });

  columns.forEach((column) => {
    column.slots = hours.map((hour) => {
      const entriesMap = column.slotEntries.get(hour);
      return {
        timeLabel: hour,
        entries: entriesMap ? Array.from(entriesMap.values()) : [],
      };
    });
    column.slotEntries.clear();
  });

  return columns;
};

const renderWeekSlot = (
  slot:
    | {
        timeLabel: string;
        entries: Array<{
          id: string;
          label: string;
          color?: string;
          count: number;
          bookings: CalendarBooking[];
        }>;
      }
    | undefined,
  column: {
    dayLabel: string;
    dateLabel: string;
    date: Date | null;
  },
  onEventClick?: (payload: unknown) => void
) => {
  if (!slot || slot.entries.length === 0) return <div className="empty-slot" />;

  const sortedEntries = [...slot.entries].sort((a, b) => b.count - a.count);
  const totalBookings = sortedEntries.reduce((sum, entry) => sum + entry.count, 0);

  const summaryPayload = {
    type: "slot-summary",
    entries: sortedEntries,
    timeLabel: slot.timeLabel,
    dayLabel: column.dayLabel,
    dateLabel: column.dateLabel,
    date: column.date,
    totalBookings,
  };

  const handleClick = (entry: (typeof sortedEntries)[number]) => {
    const needsSummary = sortedEntries.length > 1 || entry.count > 1;
    if (needsSummary) {
      onEventClick?.(summaryPayload);
      return;
    }

    onEventClick?.({
      resourceId: entry.id,
      timeLabel: slot.timeLabel,
      bookingCount: entry.count,
    });
  };

  return (
    <div className="week-slot-stack">
      {sortedEntries.map((entry) => (
        <Button
          key={`${slot.timeLabel}-${entry.id}`}
          type="button"
          variant="ghost"
          size="sm"
          className="week-slot-entry"
          style={{
            borderColor: entry.color,
            background: toRgba(entry.color, 0.08),
          }}
          onClick={() => handleClick(entry)}
        >
          <span className="week-slot-avatar" style={{ background: entry.color }}>
            {getInitials(entry.label)}
          </span>
          <span className="week-slot-count">{entry.count} bookings</span>
          <span className="week-slot-action" aria-hidden="true">
            +
          </span>
        </Button>
      ))}
    </div>
  );
};

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
  const weekColumns = isWeekView ? buildWeekColumns(days, hours, weekDates) : [];
  const focusDateValue = payload.focusDate ? new Date(payload.focusDate) : null;
  const monthCells = isMonthView ? buildMonthCells(days, focusDateValue) : [];
  const staticMonthCells = payload.staticMonthGrid ?? [];
  const monthViewCells = isMonthView
    ? staticMonthCells.length > 0
      ? staticMonthCells
      : monthCells
    : [];

  if (isMonthView && monthViewCells.length > 0) {
    return (
      <div className="calendar-grid month-view-grid">
        <div className="month-view-header">
          {WEEKDAY_ORDER.map((day) => (
            <div key={day} className="month-view-header-item">
              {day}
            </div>
          ))}
        </div>

        <div className="month-view-body">
          {monthViewCells.map((day) => {
            if (day.placeholder) {
              return <div key={day.id} className="month-day-card month-day-placeholder" />;
            }

            const isFocused = focusDateValue && day.date ? isSameDate(day.date, focusDateValue) : false;

            return (
              <div
                key={day.id}
                className={`month-day-card ${day.isCurrentMonth === false ? "muted" : ""} ${
                  isFocused ? "today" : ""
                }`}
              >
                <div className="month-day-number">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="month-day-select"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDateSelect?.({ view: "day", date: day.date });
                    }}
                    aria-pressed={isFocused}
                  >
                    <span>{day.date?.getDate()}</span>
                    {day.isCurrentMonth === false && day.date && (
                      <span className="month-day-month-label">
                        {day.date.toLocaleString("en-US", { month: "short" })}
                      </span>
                    )}
                  </Button>
                </div>

                <div className="month-day-bookings">
                  {day.bookings?.map((booking, index) => (
                    <Button
                      key={`${booking.label}-${index}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="month-day-booking"
                      style={{
                        borderColor: booking.color,
                        background: "#fff",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (day.summary) onEventClick?.(day.summary);
                      }}
                    >
                      <span className="month-day-booking-count">
                        {booking.count} {booking.count === 1 ? "Booking" : "Bookings"}
                      </span>
                      <span className="month-day-booking-action" aria-hidden="true">
                        +
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const resourceMeta = days.map((day) => {
    const seen = day.slots?.reduce((sum, slot) => sum + (slot.bookings?.length ?? 0), 0) ?? 0;
    const initials = day.label
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return {
      ...day,
      initials,
      totalBookings: seen,
    };
  });

  const headerColumns = isWeekView ? weekColumns : resourceMeta;
  const columnCount = Math.max(headerColumns.length, 1);
  const dayColumnWidth = 300;
  const slotColumnWidth = 120;
  const weekColumnWidth = `calc((100% - ${slotColumnWidth}px)/${columnCount})`;
  const columnTemplate = isWeekView
    ? `${slotColumnWidth}px repeat(${columnCount}, minmax(0, ${weekColumnWidth}))`
    : `120px repeat(${columnCount}, ${dayColumnWidth}px)`;
  const bodyColumns = isWeekView ? weekColumns : days;

  return (
    <div
      className={`calendar-grid ${isChipLayout ? "month-view" : ""} ${
        isDayView ? "day-view" : ""
      } ${isWeekView ? "week-view" : ""}`}
    >
      <div className="calendar-grid-content">
        <div className="calendar-scroll">
          <div className="calendar-grid-inner">
            <div className="calendar-header" style={{ gridTemplateColumns: columnTemplate }}>
              <div className="calendar-timezone">
                <div className="calendar-header-left">
                  <Button className="header-icon" type="button" variant="ghost" size="sm" aria-label="Menu">
                    ƒ~ø
                  </Button>
                </div>
                <div className="timezone-label">{isWeekView ? "Slots" : "UTC +05:30"}</div>
              </div>

              {isWeekView
                ? headerColumns.map((column) => (
                    <div key={column.id} className="weekday-header">
                      <div className="weekday-header-top">
                        <span className="weekday-label">{column.dayLabel}</span>
                        <strong className="weekday-date">{column.dateLabel}</strong>
                      </div>
                      <span className="weekday-count">{column.totalBookings} bookings</span>
                    </div>
                  ))
                : headerColumns.map((day) => (
                    <div
                      key={day.id}
                      className={`doctor-card ${day.onLeave ? "on-leave" : ""}`}
                      style={{ borderColor: day.color }}
                      onClick={() =>
                        onResourceDrilldown?.({
                          date: day.date ? new Date(day.date as never) : new Date(),
                          resourceId: day.id,
                          resourceLabel: day.label,
                        })
                      }
                    >
                      <div className="doctor-card-top">
                        <div className="doctor-avatar" style={{ backgroundColor: day.color }}>
                          {day.initials}
                        </div>
                        <div className="doctor-info">
                          <strong>{day.label}</strong>
                          <span>{day.totalBookings} bookings</span>
                        </div>
                      </div>
                      <div className="doctor-card-meta">
                        {day.onLeave ? (
                          <span className="doctor-badge">On Leave</span>
                        ) : (
                          <span className="doctor-dot" style={{ background: day.color }} />
                        )}
                      </div>
                    </div>
                  ))}
            </div>

            <div className="calendar-body" style={{ gridTemplateColumns: columnTemplate }}>
              {hours.map((hour) => (
                <div key={hour} className="calendar-row" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="hour-column">{hour}</div>

                  {bodyColumns.map((column) => {
                    const slot = column.slots?.find((slotItem: CalendarSlot) => slotItem.timeLabel === hour);

                    return (
                      <div
                        key={`${column.id}-${hour}`}
                        className={`calendar-cell ${column.onLeave ? "on-leave" : ""}`}
                      >
                        {isWeekView ? (
                          renderWeekSlot(slot, column, onEventClick)
                        ) : isChipLayout ? (
                          renderMonthCell(
                            column,
                            slot?.bookings ?? [],
                            onEventClick,
                            isDayView,
                            viewBy,
                            slot ?? null
                          )
                        ) : (() => {
                            const bookings = slot?.bookings ?? [];
                            if (bookings.length === 0) return <div className="empty-slot" />;

                            if (bookings.length <= 2) {
                              return (
                                <div className="detail-stack">
                                  {bookings.map((booking) => {
                                    const detailColor = getBookingColor(booking, viewBy);
                                    return (
                                      <Button
                                        key={`${booking.patient}-${booking.time}`}
                                        className="detail-card"
                                        variant="ghost"
                                        size="sm"
                                        style={{ borderColor: detailColor }}
                                        onClick={() => onEventClick?.(booking)}
                                        type="button"
                                      >
                                        <div className="detail-header">
                                          <div className="detail-header-labels">
                                            <strong>{booking.patient}</strong>
                                            <span
                                              className="status-pill"
                                              style={{
                                                borderColor: booking.statusColor,
                                                color: booking.statusColor,
                                              }}
                                            >
                                              {booking.status}
                                            </span>
                                          </div>
                                        </div>
                                        <span className="detail-time">
                                          {booking.timeRange || booking.time}
                                        </span>
                                        <span className="detail-service">{booking.service}</span>
                                      </Button>
                                    );
                                  })}
                                </div>
                              );
                            }

                            return (
                              <div className="line-stack">
                                {bookings.map((booking, index) => {
                                  const lineColor = getBookingColor(booking, viewBy) || column.color;
                                  return (
                                    <span
                                      key={`${booking.patient}-${booking.time}-${index}`}
                                      className="booking-line"
                                      style={{ background: lineColor }}
                                      onClick={() => onEventClick?.(booking)}
                                      title={`${booking.patient} ${booking.time}`}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })()}
                      </div>
                    );
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
