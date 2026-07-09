import { type ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, PageHeader, Popover, PopoverSection, Switch } from "@jaldee/design-system";
import { Calendar as CalendarIcon, Clock, FileText, MoreVertical, Plus, Settings, UserCircle, Users } from "../../components/icons";
import { useCalendars } from "../../services/useCalendars";
import { useUsers } from "../../services/useUsers";
import type { Calendar, Schedule } from "../../types";

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

function asTextList(
  values: unknown[] | undefined,
  fallbackKeys: string[] = ["name", "displayName", "label", "title", "uid", "id"],
) {
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
  const { users } = useUsers();
  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar ?? null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(Boolean(calendarUid));
  const [scheduleEnabledState, setScheduleEnabledState] = useState<Record<string, boolean>>({});
  const userNameMap = new Map(users.map((user) => [user.userUid, user.displayName]));

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

  const serviceItems = asTextList(calendar.services as unknown[]);
  const userItems = asTextList(
    calendar.users as unknown[],
    ["displayName", "name", "label", "title", "userUid", "uid", "id"],
  ).map((item) => userNameMap.get(item) ?? item);
  const channelItems = asTextList(calendar.bookingChannels as unknown[]);
  const tagItems = asTextList(calendar.tags as unknown[]);

  return (
    <main
      id="bookings-calendar-details-page"
      data-testid="bookings-calendar-details-page"
      data-state="ready"
      className="calendar-details-page"
    >
      <DetailsHeader
        title={loadingCalendar ? "Loading calendar..." : calendar.name}
        subtitle={calendar.description || "Calendar configuration and assignments."}
        onBack={() => navigate("/calendars")}
      />

      <div className="calendar-details-layout">
        <section
          id="bookings-calendar-details-summary"
          data-testid="bookings-calendar-details-summary"
          className="calendar-profile-header"
        >
          <div
            className="calendar-color-badge-large"
            style={{ backgroundColor: calendar.color || "var(--primary-color)" }}
          >
            <CalendarIcon size={28} />
          </div>
          <div className="calendar-profile-meta">
            <div className="profile-name-row">
              <div>
                <h2 className="profile-title">{calendar.name}</h2>
              </div>
              <Badge variant="success">{resolveStatusLabel(calendar.status)}</Badge>
            </div>
            <p className="profile-description">{calendar.description || "No description"}</p>
            {calendar.locationName ? (
              <span className="profile-location">
                <CalendarIcon size={14} />
                {calendar.locationName}
              </span>
            ) : null}
          </div>
          <div className="profile-header-actions">
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
                onClick={() => navigate(`/calendars/${calendar.uid}/customize`, { state: { calendar } })}
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
                              onClick={() => navigate(`/calendars/${calendar.uid}/customize`, { state: { calendar } })}
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
                              <div className="detail-tw-chip-row">
                                {timeWindow.weekDays.map((day) => (
                                  <span key={`${timeWindow.uid}-${day}`} className="detail-tw-weekday-chip">
                                    {weekdayName[day] ?? String(day)}
                                  </span>
                                ))}
                              </div>
                              <span className="detail-tw-channel-chip">
                                {channelIcon[timeWindow.channel] ?? timeWindow.channel}
                              </span>
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
              <SidebarCard title="Services" icon={<CalendarIcon size={16} />}>
                <SimpleList items={serviceItems} empty="No services assigned" />
              </SidebarCard>

              <SidebarCard title="Users" icon={<Users size={16} />}>
                <UserList items={userItems} empty="No users assigned" />
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

function SimpleList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  return items.length ? (
    <div className="sidebar-simple-list">
      {items.map((item) => (
        <div key={item} className="sidebar-simple-list-item">
          {item}
        </div>
      ))}
    </div>
  ) : (
    <span className="sidebar-empty-copy">{empty}</span>
  );
}

function UserList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  return items.length ? (
    <div className="sidebar-user-list">
      {items.map((item, index) => (
        <div key={item} className="sidebar-user-row">
          <div className={`avatar-mini sidebar-user-avatar avatar-color-${(index % 4) + 1}`}>{initials(item)}</div>
          <div className="sidebar-user-name">{item}</div>
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
