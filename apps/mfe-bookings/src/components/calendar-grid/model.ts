export type CalendarViewMode = "day" | "week" | "month" | string;
export type ViewByMode = "View by doctors" | "View by calendars" | "View by departments" | string;

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
  bookings?: Array<{ label: string; color: string; count: number }>;
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

export interface MonthSummaryEntry {
  id: string;
  label: string;
  color: string;
  count: number;
  bookings: CalendarBooking[];
}

export interface WeekSlotEntry {
  id: string;
  label: string;
  color?: string;
  count: number;
  bookings: CalendarBooking[];
}

export interface WeekColumn {
  id: string;
  dayLabel: string;
  dateLabel: string;
  date: Date | null;
  dayIndex: number;
  color: string;
  totalBookings: number;
  slots: Array<{ timeLabel: string; entries: WeekSlotEntry[] }>;
}

export interface ResourceMeta extends CalendarResource {
  initials: string;
  totalBookings: number;
}

export const fallbackHours = [
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

export const WEEKDAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_FOCUS_DATE = new Date(2025, 10, 1);

export const getInitials = (label?: string): string =>
  label?.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() ?? "";

export const toRgba = (color = "#6c32ff", alpha = 0.14): string => {
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

export const getBookingColor = (
  booking?: CalendarBooking,
  viewBy: ViewByMode = "View by doctors"
): string => {
  if (!booking) return "#6c32ff";
  if (viewBy === "View by doctors" && booking.calendarColor) return booking.calendarColor;
  if (viewBy === "View by calendars" && booking.doctorColor) return booking.doctorColor;
  if (viewBy === "View by departments" && booking.departmentColor) return booking.departmentColor;
  return booking.color || booking.calendarColor || booking.departmentColor || booking.doctorColor || "#6c32ff";
};

export const summarizeBookingsByCalendar = (
  bookings: CalendarBooking[],
  viewBy: ViewByMode = "View by doctors"
) => {
  const map = new Map<string, { calendar: string; color: string; count: number }>();

  bookings.forEach((booking) => {
    const calendar = booking.calendar || "Unknown";
    const color = getBookingColor(booking, viewBy);
    const existing = map.get(calendar);
    if (existing) existing.count += 1;
    else map.set(calendar, { calendar, color, count: 1 });
  });

  return Array.from(map.values());
};

export const summarizeBookingsByDoctor = (
  bookings: CalendarBooking[] = [],
  viewBy: ViewByMode = "View by calendars"
) => {
  const map = new Map<
    string,
    { label: string; color: string; count: number; bookings: CalendarBooking[]; minTimeIndex: number }
  >();

  bookings.forEach((booking) => {
    const doctorLabel = booking.doctor || booking.label || "Doctor";
    const color = getBookingColor(booking, viewBy);
    const existing = map.get(doctorLabel);
    const timeIndex = typeof booking.timeIndex === "number" ? booking.timeIndex : Number.POSITIVE_INFINITY;
    if (existing) {
      existing.count += 1;
      existing.bookings.push(booking);
      existing.minTimeIndex = Math.min(existing.minTimeIndex, timeIndex);
    } else {
      map.set(doctorLabel, { label: doctorLabel, color, count: 1, bookings: [booking], minTimeIndex: timeIndex });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const delta = (a.minTimeIndex ?? 0) - (b.minTimeIndex ?? 0);
    return delta !== 0 ? delta : a.label.localeCompare(b.label);
  });
};

const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
  return formatDateKey(new Date(targetBase.getFullYear(), targetBase.getMonth(), dayValue));
};

const getDaysInMonth = (date: Date): number => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const buildMonthCells = (
  days: CalendarResource[],
  focusDate: Date | null,
  viewBy: ViewByMode = "View by doctors"
): MonthCell[] => {
  const focus = focusDate || DEFAULT_FOCUS_DATE;
  const year = focus.getFullYear();
  const month = focus.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = getDaysInMonth(focus);
  const aggregated = new Map<string, { entries: Map<string, MonthSummaryEntry>; totalBookings: number }>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    aggregated.set(formatDateKey(new Date(year, month, day)), { entries: new Map(), totalBookings: 0 });
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
        const entry = existing ?? {
          id: entryId,
          label: resource.label || booking.calendar || booking.doctor || "Booking",
          color: getBookingColor(booking, viewBy),
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
  for (let i = 0; i < firstOfMonth.getDay(); i += 1) cells.push({ id: `leading-${i}`, placeholder: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dayMeta = aggregated.get(dateKey);
    const summaryEntries = dayMeta ? Array.from(dayMeta.entries.values()) : [];
    cells.push({
      id: dateKey,
      date,
      bookings: summaryEntries.slice(0, 3).map((entry) => ({ label: entry.label, color: entry.color, count: entry.count })),
      summary:
        summaryEntries.length > 0
          ? {
              type: "slot-summary",
              entries: summaryEntries,
              date,
              dateLabel: date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
              dayLabel: date.toLocaleDateString("en-US", { weekday: "long" }),
              timeLabel: "All day",
              totalBookings: dayMeta?.totalBookings ?? 0,
            }
          : undefined,
      isCurrentMonth: true,
      placeholder: false,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ id: `trailing-${cells.length}`, placeholder: true });
  return cells;
};

export const isSameDate = (a?: Date | null, b?: Date | null): boolean =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());

export const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

export const getWeekDates = (focusDate?: Date | string): Date[] => {
  const base = new Date(focusDate || Date.now());
  const startOfWeek = new Date(base);
  startOfWeek.setDate(base.getDate() - base.getDay());
  return WEEKDAY_ORDER.map((_, index) => {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + index);
    return current;
  });
};

export const buildWeekColumns = (
  days: CalendarResource[],
  hours: string[],
  weekDates: Date[] = [],
  viewBy: ViewByMode = "View by doctors"
): WeekColumn[] => {
  const columns = WEEKDAY_ORDER.map((dayLabel, index) => ({
    id: `weekday-${dayLabel.toLowerCase()}`,
    dayLabel,
    dateLabel: weekDates[index] ? formatDateLabel(weekDates[index]) : "",
    date: weekDates[index] ?? null,
    dayIndex: index,
    color: "",
    totalBookings: 0,
    slotEntries: new Map<string, Map<string, WeekSlotEntry>>(),
    slots: [] as WeekColumn["slots"],
  }));
  const columnsByLabel = new Map(columns.map((column) => [column.dayLabel, column]));

  days.forEach((resource) => {
    const column = columnsByLabel.get(resource.day || "Sunday");
    if (!column) return;
    if (!column.dateLabel && resource.date) column.dateLabel = String(resource.date);
    if (!column.color && resource.color) column.color = resource.color;
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
        color: bookings[0] ? getBookingColor(bookings[0], viewBy) : resource.color,
        count: 0,
        bookings: [],
      };
      entry.count += bookings.length;
      entry.bookings.push(...bookings.map((booking) => ({ id: booking.id, patient: booking.patient, time: booking.time, timeRange: booking.timeRange, service: booking.service, status: booking.status })));
      hourMap.set(resource.id, entry);
    });
  });

  columns.forEach((column) => {
    column.slots = hours.map((hour) => ({ timeLabel: hour, entries: column.slotEntries.get(hour) ? Array.from(column.slotEntries.get(hour)!.values()) : [] }));
    column.slotEntries.clear();
  });

  return columns.map(({ slotEntries: _slotEntries, ...column }) => column);
};

export const buildResourceMeta = (days: CalendarResource[]): ResourceMeta[] =>
  days.map((day) => ({
    ...day,
    initials: getInitials(day.label),
    totalBookings: day.slots?.reduce((sum, slot) => sum + (slot.bookings?.length ?? 0), 0) ?? 0,
  }));
