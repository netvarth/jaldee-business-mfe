import React, { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "../../utils";
import "./Calendar.css";

// ── Types ─────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;       // start date + optional time
  endDate?: Date | string;   // end time (defaults to 1 hr after start)
  allDay?: boolean;          // force into all-day strip
  color?: string;
  subtitle?: string;
  [key: string]: any;
}

export interface CalendarProps<T extends CalendarEvent = CalendarEvent> {
  events: T[];
  view?: "month" | "week" | "day" | "list";
  onViewChange?: (view: "month" | "week" | "day" | "list") => void;
  currentDate?: Date;
  onCurrentDateChange?: (date: Date) => void;
  renderEvent?: (event: T) => React.ReactNode;
  onEventClick?: (event: T) => void;
  onDateClick?: (date: Date) => void;
  filterActions?: React.ReactNode;
  className?: string;
  hideToolbar?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const HOUR_HEIGHT = 56;   // px per hour in time grid
const START_HOUR = 0;     // 12 AM
const END_HOUR   = 13;    // include the 12 PM row
const TIME_GUTTER_WIDTH = "72px";
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const MAX_CHIP = 3;       // max event chips in a month cell before "+N more"

// ── Helpers ────────────────────────────────────────────────────────────────
const parseDate = (d: Date | string): Date => (d instanceof Date ? d : new Date(d));
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtHour = (h: number) => {
  if (h === 0)  return "12 AM";
  if (h < 12)  return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

const isAllDay = (e: CalendarEvent) => {
  if (e.allDay) return true;
  const d = parseDate(e.date);
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
};

const evTop = (e: CalendarEvent) => {
  const d = parseDate(e.date);
  return Math.max(d.getHours() + d.getMinutes() / 60 - START_HOUR, 0) * HOUR_HEIGHT;
};

const evHeight = (e: CalendarEvent) => {
  const s = parseDate(e.date);
  const end = e.endDate ? parseDate(e.endDate) : new Date(s.getTime() + 60 * 60 * 1000);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = Math.min(end.getHours() + end.getMinutes() / 60, END_HOUR);
  return Math.max((eh - Math.max(sh, START_HOUR)) * HOUR_HEIGHT, 28);
};

// ══════════════════════════════════════════════════════════════════════════
export function Calendar<T extends CalendarEvent = CalendarEvent>({
  events = [],
  view: controlledView,
  onViewChange,
  currentDate: controlledDate,
  onCurrentDateChange,
  renderEvent,
  onEventClick,
  onDateClick,
  filterActions,
  className,
  hideToolbar = false,
}: CalendarProps<T>) {
  const [localView, setLocalView] = useState<"month" | "week" | "day" | "list">("month");
  const [localDate, setLocalDate] = useState(() => new Date());
  const [now, setNow]   = useState(() => new Date());
  const scrollRef       = useRef<HTMLDivElement>(null);
  const today           = useMemo(() => new Date(), []);

  const view = controlledView ?? localView;
  const date = controlledDate ?? localDate;

  // Tick every minute to move the current-time line
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll time grid to show ≈ current / business hours
  useEffect(() => {
    if ((view === "week" || view === "day") && scrollRef.current) {
      const target = Math.max((now.getHours() - START_HOUR - 1.5) * HOUR_HEIGHT, 0);
      scrollRef.current.scrollTop = target;
    }
  }, [view]); // only on view switch

  const setView = (v: "month" | "week" | "day" | "list") => {
    onViewChange ? onViewChange(v) : setLocalView(v);
  };
  const setDate = (d: Date) => {
    onCurrentDateChange ? onCurrentDateChange(d) : setLocalDate(d);
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const nav = (dir: -1 | 1) => {
    const d = new Date(date);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };

  // ── Header title ─────────────────────────────────────────────────────────
  const title = useMemo(() => {
    if (view === "month") return `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
    if (view === "week") {
      const s = new Date(date); s.setDate(date.getDate() - date.getDay());
      const e = new Date(s);   e.setDate(s.getDate() + 6);
      if (s.getMonth() === e.getMonth())
        return `${MONTHS_FULL[s.getMonth()]} ${s.getFullYear()}`;
      if (s.getFullYear() === e.getFullYear())
        return `${MONTHS_SHORT[s.getMonth()]} – ${MONTHS_SHORT[e.getMonth()]} ${s.getFullYear()}`;
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${WD_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }, [date, view]);

  // ── Month cells ──────────────────────────────────────────────────────────
  const monthCells = useMemo(() => {
    const y = date.getFullYear(), m = date.getMonth();
    const firstWD   = new Date(y, m, 1).getDay();
    const dayCount  = new Date(y, m + 1, 0).getDate();
    const prevCount = new Date(y, m, 0).getDate();
    const cells: Array<{ date: Date; cur: boolean; today: boolean; events: T[] }> = [];
    const ev = (d: Date) => events.filter(e => sameDay(parseDate(e.date), d));
    for (let i = firstWD - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, prevCount - i);
      cells.push({ date: d, cur: false, today: sameDay(d, today), events: ev(d) });
    }
    for (let i = 1; i <= dayCount; i++) {
      const d = new Date(y, m, i);
      cells.push({ date: d, cur: true, today: sameDay(d, today), events: ev(d) });
    }
    for (let i = 1; cells.length < 42; i++) {
      const d = new Date(y, m + 1, i);
      cells.push({ date: d, cur: false, today: sameDay(d, today), events: ev(d) });
    }
    return cells;
  }, [date, events]);

  // ── Week columns ─────────────────────────────────────────────────────────
  const weekCols = useMemo(() => {
    const s = new Date(date); s.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s); d.setDate(s.getDate() + i);
      const all = events.filter(e => sameDay(parseDate(e.date), d));
      return {
        date: d,
        today: sameDay(d, today),
        allDay: all.filter(isAllDay),
        timed:  all.filter(e => !isAllDay(e)),
      };
    });
  }, [date, events]);

  // ── Day events ───────────────────────────────────────────────────────────
  const dayEvs = useMemo(() => {
    const all = events.filter(e => sameDay(parseDate(e.date), date));
    return { allDay: all.filter(isAllDay), timed: all.filter(e => !isAllDay(e)) };
  }, [date, events]);

  // ── Schedule groups ──────────────────────────────────────────────────────
  const scheduleGroups = useMemo(() => {
    const from = new Date(date); from.setHours(0, 0, 0, 0);
    const sorted = events
      .filter(e => parseDate(e.date) >= from)
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    const groups: Array<{ date: Date; events: T[] }> = [];
    const keys = new Map<string, number>();
    for (const e of sorted) {
      const d = parseDate(e.date);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!keys.has(k)) { keys.set(k, groups.length); groups.push({ date: d, events: [] }); }
      groups[keys.get(k)!].events.push(e);
    }
    return groups;
  }, [date, events]);

  // ── Current time ─────────────────────────────────────────────────────────
  const nowFrac = now.getHours() + now.getMinutes() / 60;
  const nowTop  = (nowFrac - START_HOUR) * HOUR_HEIGHT;
  const nowVisible = nowFrac >= START_HOUR && nowFrac < END_HOUR;

  // ── Sub-components ────────────────────────────────────────────────────────

  // Month event chip
  const MonthChip = ({ ev: e }: { ev: T }) => (
    <div
      className="gcal-chip"
      style={{ backgroundColor: e.color || "var(--color-primary)" }}
      title={e.title}
      onClick={ev => { ev.stopPropagation(); onEventClick?.(e); }}
    >
      {e.title}
    </div>
  );

  // Timed event block (absolute positioned inside day col)
  const TimedBlock = ({ ev: e }: { ev: T }) => (
    <div
      className="gcal-timed-block"
      style={{
        top: evTop(e),
        height: evHeight(e),
        backgroundColor: e.color || "var(--color-primary)",
      }}
      title={e.title}
      onClick={ev => { ev.stopPropagation(); onEventClick?.(e); }}
    >
      <span className="gcal-timed-title">{e.title}</span>
      {e.subtitle && <span className="gcal-timed-sub">{e.subtitle}</span>}
    </div>
  );

  // All-day strip chip
  const AllDayChip = ({ ev: e }: { ev: T }) => (
    <div
      className="gcal-allday-chip"
      style={{ backgroundColor: e.color || "var(--color-primary)" }}
      onClick={() => onEventClick?.(e)}
    >
      {e.title}
    </div>
  );

  // Schedule row
  const SchedRow = ({ ev: e }: { ev: T }) => {
    const d = parseDate(e.date);
    const timeStr = isAllDay(e)
      ? "All day"
      : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return (
      <div className="gcal-sched-row" onClick={() => onEventClick?.(e)}>
        <span className="gcal-sched-time">{timeStr}</span>
        <span className="gcal-sched-dot" style={{ backgroundColor: e.color || "var(--color-primary)" }} />
        <div className="gcal-sched-info">
          <span className="gcal-sched-title">{e.title}</span>
          {e.subtitle && <span className="gcal-sched-sub">{e.subtitle}</span>}
        </div>
      </div>
    );
  };

  // Shared time-grid day column
  const DayCol = ({ col }: { col: { date: Date; today: boolean; timed: T[] } }) => (
    <div
      className={cn("gcal-day-col", col.today && "gcal-day-col--today")}
      style={{ height: HOURS.length * HOUR_HEIGHT }}
      onClick={ev => {
        if (!scrollRef.current) return;
        const rect = ev.currentTarget.getBoundingClientRect();
        const relY = ev.clientY - rect.top;
        const h = Math.floor(relY / HOUR_HEIGHT) + START_HOUR;
        const d = new Date(col.date); d.setHours(h, 0, 0, 0);
        onDateClick?.(d);
      }}
    >
      {/* Horizontal hour lines via background-image — no extra DOM */}
      {col.timed.map(e =>
        renderEvent ? (
          <div
            key={e.id}
            style={{ position: "absolute", top: evTop(e), left: 2, right: 2, height: evHeight(e), zIndex: 1 }}
            onClick={ev => { ev.stopPropagation(); onEventClick?.(e); }}
          >
            {renderEvent(e)}
          </div>
        ) : <TimedBlock key={e.id} ev={e} />
      )}
      {col.today && nowVisible && (
        <div className="gcal-now-line" style={{ top: nowTop }}>
          <div className="gcal-now-dot" />
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn("gcal-root", className)}>

      {/* ══ TOOLBAR ═══════════════════════════════════════════════════════ */}
      {!hideToolbar && <div className="gcal-toolbar">
        {/* Left — custom filter actions */}
        <div className="gcal-toolbar-l">{filterActions}</div>

        {/* Center — Today + nav + title */}
        <div className="gcal-toolbar-c">
          <button className="gcal-btn-today" onClick={() => setDate(new Date())}>Today</button>
          <button className="gcal-btn-nav" onClick={() => nav(-1)} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className="gcal-btn-nav" onClick={() => nav(1)} aria-label="Next">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <h2 className="gcal-title">{title}</h2>
        </div>

        {/* Right — view selector */}
        <div className="gcal-toolbar-r">
          <div className="gcal-view-tabs">
            {(["month", "week", "day", "list"] as const).map(m => (
              <button
                key={m}
                className={cn("gcal-view-tab", view === m && "gcal-view-tab--active")}
                onClick={() => setView(m)}
              >
                {m === "list" ? "List" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ══ MONTH VIEW ════════════════════════════════════════════════════ */}
      {view === "month" && (
        <div className="gcal-month">
          {/* Weekday labels */}
          <div className="gcal-month-wd-row">
            {WD_SHORT.map(d => <div key={d} className="gcal-month-wd">{d}</div>)}
          </div>
          {/* Day cells */}
          <div className="gcal-month-grid">
            {monthCells.map((cell, i) => (
              <div
                key={i}
                className={cn(
                  "gcal-month-cell",
                  !cell.cur   && "gcal-month-cell--other",
                  cell.today  && "gcal-month-cell--today",
                )}
                onClick={() => onDateClick?.(cell.date)}
              >
                <div className="gcal-month-cell-hd">
                  <span className={cn("gcal-day-num", cell.today && "gcal-day-num--today")}>
                    {cell.date.getDate()}
                  </span>
                </div>
                <div className="gcal-month-cell-ev">
                  {cell.events.slice(0, MAX_CHIP).map(e =>
                    renderEvent
                      ? <div key={e.id} onClick={ev => { ev.stopPropagation(); onEventClick?.(e); }}>{renderEvent(e)}</div>
                      : <MonthChip key={e.id} ev={e} />
                  )}
                  {cell.events.length > MAX_CHIP && (
                    <div className="gcal-more-label">+{cell.events.length - MAX_CHIP} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ WEEK / DAY VIEW ═══════════════════════════════════════════════ */}
      {(view === "week" || view === "day") && (() => {
        const cols = view === "week" ? weekCols : [{
          date, today: sameDay(date, today),
          allDay: dayEvs.allDay, timed: dayEvs.timed,
        }];
        const colCount = cols.length;
        const hasAllDay = cols.some(c => c.allDay.length > 0);

        return (
          <div className="gcal-time-view">
            {/* ── Column headers ── */}
            <div className="gcal-tv-header" style={{ gridTemplateColumns: `${TIME_GUTTER_WIDTH} repeat(${colCount}, 1fr)` }}>
              <div className="gcal-tv-gutter" />
              {cols.map((col, i) => (
                <div
                  key={i}
                  className={cn("gcal-tv-col-hd", col.today && "gcal-tv-col-hd--today")}
                  onClick={() => onDateClick?.(col.date)}
                >
                  <span className="gcal-tv-wd">{WD_SHORT[col.date.getDay()]}</span>
                  <span className={cn("gcal-tv-date", col.today && "gcal-tv-date--today")}>
                    {col.date.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {/* ── All-day strip ── */}
            {hasAllDay && (
              <div className="gcal-allday-row" style={{ gridTemplateColumns: `${TIME_GUTTER_WIDTH} repeat(${colCount}, 1fr)` }}>
                <div className="gcal-tv-gutter gcal-allday-label">All day</div>
                {cols.map((col, i) => (
                  <div key={i} className={cn("gcal-allday-col", col.today && "gcal-allday-col--today")}>
                    {col.allDay.map(e =>
                      renderEvent
                        ? <div key={e.id} onClick={() => onEventClick?.(e)}>{renderEvent(e)}</div>
                        : <AllDayChip key={e.id} ev={e} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Scrollable time grid ── */}
            <div className="gcal-tv-scroll" ref={scrollRef}>
              <div className="gcal-tv-grid" style={{ gridTemplateColumns: `${TIME_GUTTER_WIDTH} repeat(${colCount}, 1fr)` }}>
                {/* Time labels */}
                <div className="gcal-time-labels">
                  {HOURS.map(h => (
                    <div key={h} className="gcal-time-label" style={{ height: HOUR_HEIGHT }}>
                      <span className="gcal-time-label-text">{fmtHour(h)}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {cols.map((col, i) => <DayCol key={i} col={col} />)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ SCHEDULE (LIST) VIEW ══════════════════════════════════════════ */}
      {view === "list" && (
        <div className="gcal-sched">
          {scheduleGroups.length === 0 ? (
            <div className="gcal-sched-empty">
              <span className="gcal-sched-empty-icon">📅</span>
              <span className="gcal-sched-empty-text">No upcoming events</span>
            </div>
          ) : (
            scheduleGroups.map((g, gi) => {
              const isToday = sameDay(g.date, today);
              const isTomorrow = (() => { const t = new Date(today); t.setDate(t.getDate() + 1); return sameDay(g.date, t); })();
              const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow"
                : g.date.toLocaleDateString("en-US", { weekday: "long" });

              return (
                <div key={gi} className="gcal-sched-group">
                  <div className="gcal-sched-date-col">
                    <span className="gcal-sched-mo">{MONTHS_SHORT[g.date.getMonth()]}</span>
                    <span className={cn("gcal-sched-dn", isToday && "gcal-sched-dn--today")}>
                      {g.date.getDate()}
                    </span>
                    <span className="gcal-sched-wdl">{dayLabel}</span>
                  </div>
                  <div className="gcal-sched-events">
                    {g.events.map(e =>
                      renderEvent
                        ? <div key={e.id} className="gcal-sched-custom-row" onClick={() => onEventClick?.(e)}>{renderEvent(e)}</div>
                        : <SchedRow key={e.id} ev={e} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
