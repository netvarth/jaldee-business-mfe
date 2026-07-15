import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Input, PageHeader } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import type { Calendar, Schedule } from "../../types";
import DualListServicesModal, { Service } from "./components/DualListServicesModal";
import DualListUsersModal from "./components/DualListUsersModal";

const channels = [
  {
    value: "ONLINE",
    title: "Online",
    description: "Allow customers to book appointments online",
  },
  {
    value: "WALK_IN",
    title: "Walk-in",
    description: "Accept walk-in appointments without prior booking",
  },
  {
    value: "PHONE_IN",
    title: "Phone-in",
    description: "Accept appointments booked over the phone",
  },
  {
    value: "IVR",
    title: "IVR",
    description: "Accept appointments initiated through the IVR channel",
  },
];

function normalizeList(values: unknown[] | undefined, fallbackKeys: string[] = ["name", "displayName", "label", "title", "uid", "id"]) {
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

function token(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatUsers(items: string[]) {
  if (items.length <= 2) return items;
  return [items[0], items[1], `+${items.length - 2} more`];
}

export default function CustomizeCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ uid: string }>();
  const routeState = (location.state as { calendar?: Calendar; schedule?: Schedule } | null) ?? null;
  const initialCalendar = routeState?.calendar;
  const selectedSchedule = routeState?.schedule ?? null;
  const calendarUid = params.uid ?? initialCalendar?.uid ?? "";
  const { updateCalendar, searchSchedules, getCalendar } = useCalendars();
  const { services } = useServices();
  const { users } = useUsers();
  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar ?? null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialCalendar?.bookingChannels ?? ["ONLINE"]);
  const [tags, setTags] = useState<string[]>(initialCalendar?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(Boolean(calendarUid));
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);
  const [serviceUsers, setServiceUsers] = useState<Record<string, string[]>>({});

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.uid ?? service.id, service.name])),
    [services],
  );
  const userMap = useMemo(
    () => new Map(users.map((user) => [user.userUid, user.displayName])),
    [users],
  );

  const serviceRows = useMemo(() => {
    const serviceIds = normalizeList(calendar?.services as unknown[]);
    const defaultUserNames = normalizeList(
      calendar?.users as unknown[],
      ["displayName", "name", "label", "title", "userUid", "uid", "id"],
    ).map((item) => userMap.get(item) ?? item);
    return serviceIds.map((serviceId, index) => ({
      serviceId,
      id: `${serviceId}-${index}`,
      serviceName: serviceMap.get(serviceId) ?? serviceId,
      users: serviceUsers[serviceId] ? serviceUsers[serviceId].map(id => userMap.get(id) ?? id) : defaultUserNames,
    }));
  }, [calendar?.services, calendar?.users, serviceUsers, serviceMap, userMap]);
  const visibleSchedules = useMemo(
    () => (selectedSchedule ? schedules.filter((schedule) => schedule.uid === selectedSchedule.uid) : schedules),
    [schedules, selectedSchedule],
  );

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
        if (cancelled) return;
        setCalendar(data);
        setSelectedChannels(data.bookingChannels ?? ["ONLINE"]);
        setTags(normalizeList(data.tags as unknown[]));
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
        if (cancelled) return;
        setSchedules(data);
      } catch {
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    }

    void loadSchedules();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, searchSchedules]);

  const addTag = () => {
    const value = window.prompt("Enter label");
    const next = value?.trim();
    if (next && !tags.includes(next)) {
      setTags((current) => [...current, next]);
    }
  };

  const save = async () => {
    if (!calendarUid || !calendar) return;
    setSaving(true);
    try {
      const updated = await updateCalendar(calendarUid, {
        uid: calendar.uid,
        name: calendar.name ?? "",
        description: calendar.description ?? "",
        locationId: calendar.locationId ?? 0,
        locationName: calendar.locationName ?? "",
        services: normalizeList(calendar.services as unknown[], ["uid", "id", "name"]),
        users: normalizeList(calendar.users as unknown[], ["userUid", "uid", "id", "displayName", "name"]),
        channel: calendar.channel ?? "ONLINE",
        label: normalizeList(calendar.label as unknown[]),
        qrLinkRequired: calendar.qrLinkRequired ?? false,
        feature: calendar.feature ?? "BASE_CRM",
        status: calendar.status ?? "INACTIVE",
        color: calendar.color ?? "",
        bookingChannels: selectedChannels,
        capacityOverride: calendar.capacityOverride ?? 0,
        tags,
      });
      navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar: updated } });
    } catch {
      // The calendar hook maps the API failure to a user-facing toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      id="bookings-customize-calendar-page"
      data-testid="bookings-customize-calendar-page"
      data-state={calendarUid ? "ready" : "empty"}
      className="h-full overflow-y-auto bg-[#f6f7fb]"
    >
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <PageHeader
          title="Customize Calendar"
          subtitle="Configure booking channels and labels."
          back={{ label: "Back to calendar details", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          actions={calendar?.name ? <Badge variant="success">{calendar.name}</Badge> : undefined}
        />

        {!calendarUid && (
          <Alert variant="danger">Open this screen from a calendar’s details to save settings.</Alert>
        )}

        <section className="mt-8 rounded-xl border border-[#E8EAF3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:p-8">
          {loadingCalendar ? (
            <div className="text-sm text-slate-500">Loading calendar...</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-[30px]">
                    Customize Your Calendar
                  </h1>
                  <p className="mt-2 text-[15px] text-slate-500">
                    {selectedSchedule
                      ? `Applicable to the ${selectedSchedule.name} schedule and its time windows`
                      : "Applicable to all the schedules and time windows in this calendar"}
                  </p>
                </div>
                {calendar?.status ? <Badge variant="success">{calendar.status}</Badge> : null}
              </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {loadingSchedules ? (
                    <span className="text-sm text-slate-500">Loading schedules...</span>
                ) : visibleSchedules.length ? (
                  visibleSchedules.map((schedule) => (
                      <div
                        key={schedule.uid}
                        className="inline-flex h-9 items-center rounded-full border border-[#7c3aed] px-4 text-sm font-semibold"
                        style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
                      >
                        {schedule.name}
                      </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    {selectedSchedule ? "The selected schedule could not be loaded." : "No schedules found for this calendar."}
                  </span>
                )}
              </div>

              <section className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-semibold text-slate-900">Services &amp; Users</h2>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsServicesModalOpen(true)}
                    className="h-10 rounded-lg !bg-[#7c3aed] px-5 !text-white hover:!bg-[#6d28d9] hover:!text-white"
                  >
                    + Add Services
                  </Button>
                </div>

                <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7EBF4]">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-[#f7f8fc]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Service</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Users</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {serviceRows.length ? (
                        serviceRows.map((row) => (
                          <tr key={row.id} className="border-t border-[#E7EBF4]">
                            <td className="px-6 py-5 text-base font-medium text-slate-900">{row.serviceName}</td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap items-center gap-2">
                                {formatUsers(row.users).length ? (
                                  formatUsers(row.users).map((user) => (
                                    <span
                                      key={`${row.id}-${user}`}
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
                                        user.startsWith("+")
                                          ? "bg-[#f5f3ff] text-[#7c3aed]"
                                          : "bg-[#f5f6fa] text-slate-700 ring-1 ring-[#E3E5EE]"
                                      }`}
                                    >
                                      {user}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">No users assigned</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setUsersModalServiceId(row.serviceId)}
                                  className="flex h-9 items-center justify-center rounded-lg border border-[#E7EBF4] px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                  Edit Users
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${row.serviceName}`}
                                  onClick={() => {
                                    if (calendar) {
                                      const newServices = calendar.services?.filter((id: any) => {
                                        const sId = typeof id === 'string' ? id : id?.uid ?? id?.id;
                                        return sId !== row.serviceId;
                                      }) as string[];
                                      setCalendar({ ...calendar, services: newServices });
                                    }
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7EBF4] text-slate-500 transition hover:bg-[#fee2e2] hover:text-[#dc2626]"
                                >
                                  <span aria-hidden="true">🗑</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                            No services assigned to this calendar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-[22px] font-semibold text-slate-900">Booking Channel Setup</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Configure which channels customers can use to book appointments.
                </p>

                <div className="mt-5 space-y-5">
                  {channels.map((channel) => {
                    const checked = selectedChannels.includes(channel.value);
                    return (
                      <label
                        key={channel.value}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8EAF3] bg-white p-4 transition hover:border-[#d8ccff] hover:bg-[#faf7ff]"
                      >
                        <Checkbox
                          id={`bookings-customize-channel-${token(channel.value)}`}
                          data-testid={`bookings-customize-channel-${token(channel.value)}`}
                          checked={checked}
                          onChange={() =>
                            setSelectedChannels((current) =>
                              checked
                                ? current.filter((value) => value !== channel.value)
                                : [...current, channel.value],
                            )
                          }
                          label={
                            <div className="flex flex-col">
                              <span className="text-base font-semibold text-slate-900">{channel.title}</span>
                              <span className="mt-1 text-sm text-slate-500">{channel.description}</span>
                            </div>
                          }
                          controlClassName="items-start"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-[22px] font-semibold text-slate-900">Label</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Labels help tag bookings into specific groups.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      data-testid={`bookings-customize-tag-${token(tag)}`}
                      className="inline-flex h-[34px] items-center gap-2 rounded-2xl border border-[#E3E5EE] bg-[#F5F6FA] px-4 text-sm font-medium text-slate-700"
                    >
                      {tag}
                      <button
                        id={`bookings-customize-tag-${token(tag)}-remove`}
                        data-testid={`bookings-customize-tag-${token(tag)}-remove`}
                        type="button"
                        aria-label={`Remove ${tag}`}
                        onClick={() => setTags((current) => current.filter((value) => value !== tag))}
                        className="text-slate-400 transition hover:text-slate-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    id="bookings-customize-tag-add"
                    data-testid="bookings-customize-tag-add"
                    type="button"
                    onClick={addTag}
                    className="inline-flex h-[34px] items-center rounded-2xl px-3 text-sm font-semibold text-[#7c3aed] transition hover:bg-[#f5f3ff]"
                  >
                    + Add Label
                  </button>
                </div>
              </section>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  id="bookings-customize-calendar-cancel"
                  data-testid="bookings-customize-calendar-cancel"
                  type="button"
                  onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
                  variant="secondary"
                  className="h-11 rounded-lg px-6 sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  id="bookings-customize-calendar-submit"
                  data-testid="bookings-customize-calendar-submit"
                  data-state={saving ? "saving" : "idle"}
                  type="button"
                  disabled={!calendarUid || loadingCalendar}
                  loading={saving}
                  onClick={() => void save()}
                  className="h-11 rounded-lg !bg-[#7c3aed] px-6 !text-white hover:!bg-[#6d28d9] hover:!text-white sm:min-w-[120px]"
                >
                  Update
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <DualListServicesModal 
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        allServices={services}
        initialSelectedServices={services.filter(s => calendar?.services?.includes(s.uid ?? s.id))}
        onSave={async (added) => {
          setIsServicesModalOpen(false);
          if (calendar) {
            const newCalendar = { ...calendar, services: added.map(s => s.uid ?? s.id) };
            setCalendar(newCalendar);
          }
        }}
      />

      <DualListUsersModal
        isOpen={usersModalServiceId !== null}
        onClose={() => setUsersModalServiceId(null)}
        serviceName={serviceRows.find(r => r.serviceId === usersModalServiceId)?.serviceName || "this service"}
        allUsers={users.map(u => ({ id: u.userUid, name: u.displayName || u.firstName || "Unknown", role: u.designation || "Practitioner" }))}
        initialSelectedUsers={(serviceUsers[usersModalServiceId!] ?? normalizeList(calendar?.users as unknown[], ["userUid", "uid", "id"])).map(uId => {
          const u = users.find(user => user.userUid === uId);
          return { id: String(uId), name: u?.displayName || u?.firstName || "Unknown", role: u?.designation || "Practitioner" };
        })}
        onSave={(selected) => {
          if (usersModalServiceId) {
            setServiceUsers(prev => ({ ...prev, [usersModalServiceId]: selected.map(s => s.id) }));
          }
          setUsersModalServiceId(null);
        }}
      />
    </main>
  );
}
