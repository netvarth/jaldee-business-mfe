import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, PageHeader, Popover, PopoverSection, Switch } from "@jaldee/design-system";
import { Calendar as CalendarIcon, Clock, FileText, MapPin, MoreVertical, Plus, Settings, UserCircle, Users } from "../../components/icons";
import type { Calendar, Schedule } from "../../types";
import { useCalendars } from "../../services/useCalendars";

const channelIcon: Record<string, string> = {
  Online: "Online",
  "Walk-in": "Walk-in",
  "Phone-in": "Phone-in",
  IVR: "IVR",
  ONLINE: "Online",
  WALK_IN: "Walk-in",
  PHONE_IN: "Phone-in",
};

const weekdayName: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function asTextList(values: unknown[] | undefined, fallbackKeys: string[] = ["name", "displayName", "label", "title", "uid", "id"]) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        for (const key of fallbackKeys) {
          const candidate = (value as Record<string, unknown>)[key];
          if (typeof candidate === "string" && candidate.trim()) return candidate;
        }
      }
      return "";
    })
    .filter(Boolean);
}

export default function CalendarDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ uid: string }>();
  const initialCalendar = (location.state as { calendar?: Calendar } | null)?.calendar;
  const calendarUid = params.uid ?? initialCalendar?.uid ?? "";
  const { searchSchedules, getCalendar } = useCalendars();
  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar ?? null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(Boolean(calendarUid));
  const [scheduleEnabledState, setScheduleEnabledState] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!calendarUid) {
      setLoadingCalendar(false);
      return;
    }
    let cancelled = false;

    async function loadCalendar() {
      setLoadingCalendar(true);
      try {
        const data = await getCalendar(calendarUid);
        if (!cancelled) setCalendar(data);
      } catch {
        if (!cancelled) setCalendar(initialCalendar ?? null);
      } finally {
        if (!cancelled) setLoadingCalendar(false);
      }
    }

    void loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar, initialCalendar]);

  useEffect(() => {
    if (!calendarUid) return;
    let cancelled = false;

    async function loadSchedules() {
      setLoadingSchedules(true);
      try {
        const data = await searchSchedules(calendarUid);
        if (!cancelled) {
          setSchedules(data);
          setScheduleEnabledState((current) => {
            const next = { ...current };
            for (const schedule of data) {
              if (!(schedule.uid in next)) {
                next[schedule.uid] = true;
              }
            }
            return next;
          });
        }
      } catch {
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    }

    loadSchedules();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, searchSchedules]);

  const serviceAssignments = useMemo(() => normalizeServiceAssignments(calendar?.services), [calendar?.services]);
  const channelItems = asTextList(calendar?.bookingChannels as unknown[]);
  const tagItems = asTextList(calendar?.tags as unknown[]);

  if (!calendar) {
    return (
      <main
        id="bookings-calendar-details-page"
        data-testid="bookings-calendar-details-page"
        data-state="empty"
        className="flex h-full flex-col bg-slate-50"
      >
        <DetailsHeader title="Calendar Details" onBack={() => navigate("/calendars")} />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm font-medium text-slate-500">
          Select a calendar from the calendar list to view its details.
        </div>
      </main>
    );
  }

  return (
    <main
      id="bookings-calendar-details-page"
      data-testid="bookings-calendar-details-page"
      data-state="ready"
      className="calendar-details-page"
    >
      <DetailsHeader
        title="Calendar Details"
        onBack={() => navigate("/calendars")}
      />

      <div className="calendar-details-layout">
        <section
          id="bookings-calendar-details-summary"
          data-testid="bookings-calendar-details-summary"
          className="relative flex flex-col sm:flex-row items-start sm:items-center p-4 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6"
        >
          {/* Mobile 3-dot Menu */}
          <div className="absolute top-4 right-4 sm:hidden">
            <Popover
              trigger={
                <button type="button" className="p-1 text-slate-500 hover:bg-slate-100 rounded-md">
                  <MoreVertical size={18} />
                </button>
              }
              align="end"
            >
              <div className="flex flex-col min-w-[160px] p-1 bg-white rounded-md shadow-lg border border-slate-200">
                <button 
                  onClick={() => navigate(`/calendars/${calendar.uid}/customize`, { state: { calendar } })} 
                  className="text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
                >
                  Customize
                </button>
                <button 
                  onClick={() => navigate(`/calendars/${calendar.uid}/settings`, { state: { calendar } })} 
                  className="text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
                >
                  Calendar Settings
                </button>
              </div>
            </Popover>
          </div>

          <div className="flex items-start gap-4 w-full">
            <div
              className="shrink-0 flex items-center justify-center rounded-full text-white"
              style={{ backgroundColor: calendar.color || "var(--primary-color)", width: "56px", height: "56px" }}
            >
              <CalendarIcon size={26} />
            </div>
            <div className="flex-1 min-w-0 pr-6 sm:pr-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="m-0 text-base sm:text-xl font-bold text-slate-900 truncate max-w-full">{calendar.name}</h2>
                <Badge variant="success" className="text-[10px] sm:text-xs px-1.5 py-0.5">{resolveStatusLabel(calendar.status)}</Badge>
              </div>
              {calendar.locationName ? (
                <div className="flex w-fit items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-slate-600 border border-slate-100 mt-2">
                  <MapPin size={12} className="text-indigo-500" />
                  {calendar.locationName}
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="hidden sm:flex shrink-0 ml-auto gap-3 items-center">
            <ActionButton
              id="customize"
              label="Customize"
              onClick={() => navigate(`/calendars/${calendar.uid}/customize`, { state: { calendar } })}
            />
            <Button
              id="bookings-calendar-details-settings"
              data-testid="bookings-calendar-details-settings"
              variant="primary"
              onClick={() => navigate(`/calendars/${calendar.uid}/settings`, { state: { calendar } })}
            >
              <Settings size={16} />
              Calendar Settings
            </Button>
          </div>
        </section>

        <div className="calendar-details-grid">
          <div className="calendar-details-main">
            <section
            id="bookings-calendar-details-schedules"
            data-testid="bookings-calendar-details-schedules"
            className="calendar-details-section-card"
          >
            <div className="calendar-section-header">
              <div>
                <p className="calendar-section-eyebrow">Availability</p>
                <h2 className="calendar-section-title">Schedules</h2>
                <p className="calendar-section-copy">
                  Manage your shift timings
                </p>
              </div>
              <Button
                id="bookings-calendar-details-add-schedule"
                data-testid="bookings-calendar-details-add-schedule"
                variant="secondary"
                onClick={() => navigate(`/calendars/${calendar.uid}/schedules/create`, { state: { calendar } })}
              >
                Add Schedule
              </Button>
            </div>

            <div className="details-schedules-cards-container">
              {loadingSchedules ? (
                <p className="calendar-empty-copy">Loading schedules...</p>
              ) : schedules.length ? (
                schedules.map((schedule) => (
                  <article key={schedule.uid} className="detail-schedule-card">
                    <div className="detail-sch-card-hdr">
                      <div className="detail-sch-title-wrap">
                        <div className="detail-sch-icon">
                          <Clock size={16} />
                        </div>
                        <div>
                          <h3 className="detail-sch-title">{schedule.name}</h3>
                          <p className="detail-sch-dates">
                            {formatDateRange(schedule.startDate, schedule.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="detail-sch-actions">
                        <Button
                          id={`bookings-calendar-schedule-edit-${schedule.uid}`}
                          data-testid={`bookings-calendar-schedule-edit-${schedule.uid}`}
                          variant="secondary"
                          className="detail-sch-edit-btn"
                          onClick={() => navigate(`/calendars/${calendar.uid}/schedules/${schedule.uid}/edit`, { state: { calendar, schedule } })}
                        >
                          <FileText size={15} />
                          Edit
                        </Button>
                        <Popover
                          align="end"
                          portal
                          data-testid={`bookings-calendar-schedule-menu-${schedule.uid}`}
                          contentClassName="detail-sch-menu"
                          trigger={
                            <button
                              type="button"
                              className="detail-sch-more-btn"
                              aria-label={`More details for ${schedule.name}`}
                              title={`More details for ${schedule.name}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          }
                        >
                          <PopoverSection className="detail-sch-menu-section">
                            <button type="button" className="detail-sch-menu-item">
                              <span className="detail-sch-menu-icon"><CalendarIcon size={18} /></span>
                              <span>Generate QR Code</span>
                            </button>
                            <button type="button" className="detail-sch-menu-item">
                              <span className="detail-sch-menu-icon"><Plus size={18} /></span>
                              <span>New Time Window</span>
                            </button>
                            <button
                              type="button"
                              className="detail-sch-menu-item"
                              onClick={() => navigate(`/calendars/${calendar.uid}/customize`, { state: { calendar, schedule } })}
                            >
                              <span className="detail-sch-menu-icon"><Settings size={18} /></span>
                              <span>Customize</span>
                            </button>
                            <button type="button" className="detail-sch-menu-item">
                              <span className="detail-sch-menu-icon"><FileText size={18} /></span>
                              <span>View QR Links</span>
                            </button>
                          </PopoverSection>
                          <div className="detail-sch-menu-divider" />
                          <div className="detail-sch-menu-toggle-row">
                            <span>{scheduleStatusLabel(Boolean(scheduleEnabledState[schedule.uid]))}</span>
                            <Switch
                              checked={Boolean(scheduleEnabledState[schedule.uid])}
                              onChange={(checked) =>
                                setScheduleEnabledState((current) => ({
                                  ...current,
                                  [schedule.uid]: checked,
                                }))
                              }
                            />
                          </div>
                        </Popover>
                      </div>
                    </div>

                    {schedule.description ? (
                      <p className="detail-sch-description">{schedule.description}</p>
                    ) : null}

                    <div className="detail-sch-timewindows">
                      <h4 className="detail-sch-timewindows-title">Time Windows</h4>
                      {schedule.timeWindows?.length ? (
                        schedule.timeWindows.map((timeWindow) => (
                          <div key={timeWindow.uid} className="detail-sch-timewindow-card">
                            <div className="detail-tw-toprow">
                              <div className="flex items-center justify-between w-full">
                                <div className="detail-tw-chip-row">
                                  {timeWindow.weekDays.map((day) => (
                                    <span key={`${timeWindow.uid}-${day}`} className="detail-tw-weekday-chip">
                                      {weekdayName[day] ?? String(day)}
                                    </span>
                                  ))}
                                  <span className="detail-tw-channel-chip ml-2">
                                    {channelIcon[timeWindow.channel] ?? timeWindow.channel}
                                  </span>
                                </div>
                                <Popover
                                  align="end"
                                  portal
                                  data-testid={`bookings-calendar-tw-menu-${timeWindow.uid}`}
                                  contentClassName="detail-sch-menu"
                                  trigger={
                                    <button
                                      type="button"
                                      className="detail-sch-more-btn"
                                      aria-label={`More details for time window`}
                                      title={`More details for time window`}
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                  }
                                >
                                  <PopoverSection className="detail-sch-menu-section">
                                    <button
                                      type="button"
                                      className="detail-sch-menu-item"
                                      onClick={() => navigate(`/calendars/${calendar.uid}/schedules/${schedule.uid}/timewindows/${timeWindow.uid}/customize`, { state: { calendar, schedule, timeWindow } })}
                                    >
                                      <span className="detail-sch-menu-icon"><Settings size={18} /></span>
                                      <span>Customize</span>
                                    </button>
                                  </PopoverSection>
                                </Popover>
                              </div>
                            </div>

                            <div className="detail-tw-timerange">
                              {timeWindow.startTime} - {timeWindow.endTime}
                            </div>

                            <div className="detail-tw-metrics">
                              <DetailMetric label="Time Range" value={`${timeWindow.startTime} - ${timeWindow.endTime}`} compact />
                              <DetailMetric label="Slot Duration" value={`${timeWindow.slotDuration}m`} compact />
                              <DetailMetric label="Slot Capacity" value={String(timeWindow.slotCapacity)} compact />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="calendar-empty-copy">No time windows found.</p>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="calendar-empty-copy">No schedules found for this calendar.</p>
              )}
            </div>
            </section>
          </div>

          <aside
            id="bookings-calendar-details-sidebar"
            data-testid="bookings-calendar-details-sidebar"
            className="calendar-details-sidebar"
          >
            <div className="calendar-sidebar-shell">
              <SidebarCard title="Services" icon={<Users size={16} />}>
                <ServiceAssignmentList items={serviceAssignments} empty="No services assigned" />
              </SidebarCard>

              <SidebarCard title="Channels" icon={<Clock size={16} />}>
                <ChipGroup
                  items={channelItems.map((channel) => channelIcon[channel] ?? channel)}
                  empty="No channels configured"
                />
              </SidebarCard>

              <SidebarCard title="Labels" icon={<UserCircle size={16} />}>
                <ChipGroup items={tagItems} empty="No labels" />
              </SidebarCard>

              {typeof calendar.capacityOverride === "number" ? (
                <SidebarCard title="Capacity Override" icon={<Settings size={16} />}>
                  <div className="sidebar-stat-value">{calendar.capacityOverride}</div>
                </SidebarCard>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function resolveStatusLabel(status?: string) {
  if (!status || status === "ACTIVE") return "Active";
  if (status === "DRAFT") return "Draft";
  if (status === "INACTIVE") return "Inactive";
  return status;
}

function scheduleStatusLabel(enabled: boolean) {
  return enabled ? "Disable" : "Enable";
}

function formatDateRange(startDate: string, endDate?: string | null) {
  return `${startDate} to ${endDate || startDate}`;
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DetailsHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ label: "Back to calendars", href: "/calendars" }}
        onNavigate={onBack}
        className="mb-4"
      />
    </header>
  );
}

function ActionButton({
  id,
  label,
  onClick,
}: {
  id: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      id={`bookings-calendar-details-${id}`}
      data-testid={`bookings-calendar-details-${id}`}
      onClick={onClick}
      variant="secondary"
    >
      {label}
    </Button>
  );
}

function DetailMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "detail-metric compact" : "detail-metric"}>
      <span className="detail-metric-label">{label}</span>
      <span className="detail-metric-value">{value}</span>
    </div>
  );
}

function SidebarCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="calendar-sidebar-card">
      <div className="calendar-sidebar-card-header">
        <span className="calendar-sidebar-card-icon">{icon}</span>
        <h2 className="sidebar-block-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

type ServiceAssignment = {
  serviceName: string;
  users: string[];
};

function resolveTextValue(value: unknown, fallbackKeys: string[]) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    for (const key of fallbackKeys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return "";
}

function normalizeServiceAssignments(services: Calendar["services"] | undefined): ServiceAssignment[] {
  if (!Array.isArray(services)) return [];
  return services
    .map((service) => {
      const serviceName = resolveTextValue(service, ["serviceName", "name", "uid", "id", "serviceUid"]);
      if (!serviceName) return null;
      const rawUsers = typeof service === "object" && service && "users" in service ? service.users : [];
      const users = asTextList(rawUsers as unknown[], ["userName", "displayName", "name", "uid", "id", "userUid"]);
      return { serviceName, users };
    })
    .filter((item): item is ServiceAssignment => Boolean(item));
}

function ServiceAssignmentList({
  items,
  empty,
}: {
  items: ServiceAssignment[];
  empty: string;
}) {
  return items.length ? (
    <div className="sidebar-service-list">
      {items.map((item, index) => (
        <div key={item.serviceName} className="sidebar-service-card">
          <div className="sidebar-service-header">
            <div className="sidebar-service-title">{item.serviceName}</div>
            <span className="sidebar-service-count">
              {item.users.length} {item.users.length === 1 ? "user" : "users"}
            </span>
          </div>
          {item.users.length ? (
            <div className="sidebar-service-users">
              <div className="sidebar-user-list">
              {item.users.map((userName, userIndex) => (
                <div key={`${item.serviceName}-${userName}`} className="sidebar-user-row sidebar-user-row-compact">
                  <div className={`avatar-mini sidebar-user-avatar avatar-color-${((index + userIndex) % 4) + 1}`}>{initials(userName)}</div>
                  <div className="sidebar-user-name">{userName}</div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="sidebar-service-users">
              <span className="sidebar-empty-copy">{empty}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <span className="sidebar-empty-copy">{empty}</span>
  );
}

function ChipGroup({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  return (
    <div className="sidebar-chips">
      {items.length ? (
        items.map((item) => (
          <span key={item} className="sidebar-chip-item">
            {item}
          </span>
        ))
      ) : (
        <span className="sidebar-empty-copy">{empty}</span>
      )}
    </div>
  );
}
