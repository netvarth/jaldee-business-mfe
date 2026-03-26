import { getMockBookingRecords } from './mockBookingData';

const timeSlots = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM',
  '11:00 PM',
];

const timeRanges = [
  '09:00 AM - 09:30 AM',
  '10:00 AM - 10:30 AM',
  '11:00 AM - 11:30 AM',
  '12:00 PM - 12:30 PM',
  '01:00 PM - 01:30 PM',
  '02:00 PM - 02:30 PM',
  '03:00 PM - 03:30 PM',
  '04:00 PM - 04:30 PM',
  '05:00 PM - 05:30 PM',
  '06:00 PM - 06:30 PM',
  '07:00 PM - 07:30 PM',
  '08:00 PM - 08:30 PM',
  '09:00 PM - 09:30 PM',
  '10:00 PM - 10:30 PM',
  '11:00 PM - 11:30 PM',
];

const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const serviceFilters = [
  { label: 'Quick Consultation', color: '#8bc34a' },
  { label: 'Standard Consultation', color: '#4caf50' },
  { label: 'Follow-Up', color: '#00bcd4' },
  { label: 'General Check Up', color: '#ff9800' },
  { label: 'Procedure', color: '#3f51b5' },
  { label: 'Therapy Session', color: '#9c27b0' },
  { label: 'Emergency', color: '#f44336' },
];

const statuses = [
  { label: 'Confirmed', color: '#13ab55' },
  { label: 'Waiting', color: '#7a5fff' },
  { label: 'In Progress', color: '#ffb933' },
  { label: 'Checked In', color: '#ff6b6b' },
];

const bookingRecords = getMockBookingRecords();
const ROOM_NAMES = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
const STATUS_COLOR_MAP = statuses.reduce((acc, status) => {
  acc[status.label] = status.color;
  return acc;
}, {});

const buildInitials = (value) =>
  value
    ?.split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const doctors = [
  { id: 'doc-1', label: 'Dr. Sarah Johnson', color: '#c19bff' },
  { id: 'doc-2', label: 'Dr. Michael Chen', color: '#ffb74d' },
  { id: 'doc-3', label: 'Dr. Emily Williams', color: '#6fb5ff' },
  { id: 'doc-4', label: 'Dr. James Smith', color: '#ff7d7d' },
  { id: 'doc-5', label: 'Nurse Mary Brown', color: '#00bcd4' },
];

const calendars = [
  { id: 'cal-1', label: 'Calendar 1', color: '#c29bff' },
  { id: 'cal-2', label: 'Calendar 2', color: '#6fb5ff' },
  { id: 'cal-3', label: 'Calendar 3', color: '#ff9ad3' },
  { id: 'cal-4', label: 'Calendar 4', color: '#ffc107' },
  { id: 'cal-5', label: 'Calendar 5', color: '#ff7d7d' },
];

const departments = [
  { id: 'dep-1', label: 'General', color: '#4caf50' },
  { id: 'dep-2', label: 'Cardio', color: '#9c27b0' },
  { id: 'dep-3', label: 'Wellness', color: '#00bcd4' },
  { id: 'dep-4', label: 'Diagnostics', color: '#43a047' },
  { id: 'dep-5', label: 'Procedures', color: '#ff9800' },
];

const doctorMap = Object.fromEntries(doctors.map((entry) => [entry.label, entry]));
const calendarMap = Object.fromEntries(calendars.map((entry) => [entry.label, entry]));
const departmentMap = Object.fromEntries(departments.map((entry) => [entry.label, entry]));

const buildEmptySlots = () =>
  timeSlots.map((timeLabel, index) => ({
    timeLabel,
    timeRange: timeRanges[index],
    bookings: [],
  }));

const buildBookingSlots = (records, key, metaMap) => {
  const buckets = new Map();

  records.forEach((record) => {
    const label = record[key];
    if (!label) return;
    const parsedDate = new Date(record.date);
    if (Number.isNaN(parsedDate.getTime())) return;
    const identifier = `${label}-${record.date}`;
    if (!buckets.has(identifier)) {
      const meta = metaMap[label] ?? {};
      buckets.set(identifier, {
        id: `${meta.id ?? label}-${record.date}`,
        label,
        color: meta.color,
        resourceDate: parsedDate,
        date: String(parsedDate.getDate()).padStart(2, '0'),
        day: WEEKDAY_ORDER[parsedDate.getDay()],
        slots: buildEmptySlots(),
      });
    }

    const resource = buckets.get(identifier);
    const slotIndex = Number.isInteger(record.timeIndex) ? record.timeIndex : 0;
    const slot = resource.slots[slotIndex];
    if (!slot) return;
      slot.bookings.push({
        doctor: record.doctor,
        doctorColor: doctorMap[record.doctor]?.color,
        id: record.id,
        patient: record.patient,
        time: timeSlots[slotIndex],
        timeRange: timeRanges[slotIndex],
        date: record.date,
        service: record.service,
        status: record.status,
        statusColor: STATUS_COLOR_MAP[record.status] ?? statuses[0].color,
        color: resource.color,
        calendar: record.calendar,
        calendarColor: calendarMap[record.calendar]?.color,
        department: record.department,
        departmentColor: departmentMap[record.department]?.color,
        initials: buildInitials(record.patient),
        timeIndex: slotIndex,
      });
  });

  return Array.from(buckets.values()).sort(
    (a, b) => a.resourceDate.getTime() - b.resourceDate.getTime()
  );
};

const doctorDays = buildBookingSlots(bookingRecords, 'doctor', doctorMap);
const calendarDays = buildBookingSlots(bookingRecords, 'calendar', calendarMap);
const departmentDays = buildBookingSlots(bookingRecords, 'department', departmentMap);

const viewSets = {
  'View by doctors': doctorDays,
  'View by calendars': calendarDays,
  'View by departments': departmentDays,
};

const RESOURCE_DEFINITIONS = {
  'View by doctors': doctors,
  'View by calendars': calendars,
  'View by departments': departments,
};

const buildListViewGroups = (records) => {
  const groups = new Map();

  records.forEach((record) => {
    const key = record.date;
    if (!key) return;
    if (!groups.has(key)) {
      const parsedDate = new Date(key);
      groups.set(key, {
        date: parsedDate.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        items: [],
      });
    }
    const group = groups.get(key);
    const timeIndex = Number.isInteger(record.timeIndex) ? record.timeIndex : 0;
    group.items.push({
      timeOrder: timeIndex,
      time: timeRanges[timeIndex] ?? timeSlots[timeIndex],
      slot: ROOM_NAMES[timeIndex % ROOM_NAMES.length],
      patient: record.patient,
      service: record.service,
      user: record.doctor,
      userInitials: buildInitials(record.doctor),
      status: record.status,
      statusColor: STATUS_COLOR_MAP[record.status] ?? statuses[0].color,
    });
  });

  return Array.from(groups.entries())
    .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
    .map(([, group]) => ({
      ...group,
      items: group.items
        .sort((a, b) => a.timeOrder - b.timeOrder)
        .map(({ timeOrder, ...item }) => item),
    }));
};

export const listViewGroups = buildListViewGroups(bookingRecords);

const countRecordsBy = (records, key) => {
  const counts = {};
  records.forEach((record) => {
    const label = record[key];
    if (!label) return;
    counts[label] = (counts[label] ?? 0) + 1;
  });
  return counts;
};

const buildFilterSection = (title, key, entries, includeDesc = false) => {
  const counts = countRecordsBy(bookingRecords, key);
  return {
    title: `${title} (${String(entries.length).padStart(2, '0')})`,
    items: entries.map((entry) => ({
      label: entry.label,
      checked: true,
      color: entry.color,
      desc: includeDesc ? `${counts[entry.label] ?? 0} bookings` : undefined,
    })),
  };
};

const extractResourceDate = (resource, focusDate) => {
  if (!resource) return null;
  if (resource.resourceDate instanceof Date && !Number.isNaN(resource.resourceDate.getTime())) {
    return resource.resourceDate;
  }
  const booking =
    resource.slots?.reduce((found, slot) => {
      if (found) return found;
      return slot.bookings?.find((entry) => entry.date) ?? null;
    }, null) ?? null;
  if (booking?.date) {
    const parsed = new Date(booking.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const fallbackDay = Number(resource.date);
  if (Number.isNaN(fallbackDay)) return null;
  const baseDate = focusDate || new Date();
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), fallbackDay);
};

const buildWeekDaysForView = (days, focusDate) => {
  const referenceDate = focusDate ? new Date(focusDate) : new Date();
  const weekStart = new Date(referenceDate);
  weekStart.setDate(referenceDate.getDate() - referenceDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return days
    .map((day) => {
      const resourceDate = extractResourceDate(day, referenceDate);
      return {
        ...day,
        resourceDate,
      };
    })
    .filter((day) => day.resourceDate && day.resourceDate >= weekStart && day.resourceDate <= weekEnd)
    .map((day) => ({
      ...day,
      day: WEEKDAY_ORDER[day.resourceDate.getDay()],
      date: String(day.resourceDate.getDate()).padStart(2, '0'),
    }));
};

const ensureDayResources = (resources, focusDate, definitions = []) => {
  if (!focusDate) return resources;
  const normalizedDate = focusDate;
  const existing = new Map();
  resources.forEach((resource) => {
    const resourceDate = extractResourceDate(resource, focusDate);
    if (resourceDate && resourceDate.toDateString() === focusDate.toDateString()) {
      existing.set(resource.label, resource);
    }
  });

  const placeholders = definitions
    .filter((entry) => !existing.has(entry.label))
    .map((entry) => ({
      id: `${entry.id}-${focusDate.toISOString().split('T')[0]}`,
      label: entry.label,
      color: entry.color,
      resourceDate: normalizedDate,
      date: String(focusDate.getDate()).padStart(2, '0'),
      day: WEEKDAY_ORDER[focusDate.getDay()],
      slots: buildEmptySlots(),
    }));

  return [...resources, ...placeholders];
};

const mapDaysForView = (days) => days;

const buildMonthDays = (focusDate) => {
  const base = focusDate ? new Date(focusDate) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'));
};

export function fetchCalendarData(view = 'week', viewBy = 'View by doctors', focusDate = new Date()) {
  const baseDays = viewSets[viewBy] ?? doctorDays;
  const resourceDefs = RESOURCE_DEFINITIONS[viewBy] ?? doctors;
  const weekDays = view === 'week' ? buildWeekDaysForView(baseDays, focusDate) : baseDays;
  const dayResources =
    view === 'day' && focusDate
      ? ensureDayResources(
          baseDays.filter((day) => {
            const resourceDate = extractResourceDate(day, focusDate);
            return (
              resourceDate &&
              resourceDate.getFullYear() === focusDate.getFullYear() &&
              resourceDate.getMonth() === focusDate.getMonth() &&
              resourceDate.getDate() === focusDate.getDate()
            );
          }),
          focusDate,
          resourceDefs
        )
      : weekDays;
  return {
    view,
    viewBy,
    days: mapDaysForView(dayResources),
    hours: timeSlots,
    monthDays: buildMonthDays(focusDate),
    focusDate,
  };
}

export function getSidebarFilters() {
  return [
    buildFilterSection('Calendars', 'calendar', calendars, true),
    buildFilterSection('Users', 'doctor', doctors),
    buildFilterSection('Services', 'service', serviceFilters, true),
  ];
}

export function getSavedFilters() {
  return [
    { name: 'Filter 1', meta: 'Doctors + Services' },
    { name: 'Filter 2', meta: 'Morning shift' },
    { name: 'Filter 3', meta: 'High priority' },
  ];
}
