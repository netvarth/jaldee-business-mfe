import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Input, PageHeader } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import type { Calendar, CalendarCustomizationRequest, Schedule, ScheduleCustomizationRequest } from "../../types";
import DualListServicesModal, { Service } from "./components/DualListServicesModal";
import DualListUsersModal from "./components/DualListUsersModal";

const channels = [
  { value: "ONLINE", title: "Online", description: "Allow customers to book appointments online" },
  { value: "WALK_IN", title: "Walk-in", description: "Accept walk-in appointments without prior booking" },
  { value: "PHONE_IN", title: "Phone-in", description: "Accept appointments booked over the phone" },
  { value: "IVR", title: "IVR", description: "Accept appointments initiated through the IVR channel" },
];

function normalizeList(
  values: unknown[] | undefined,
  fallbackKeys: string[] = ["name", "displayName", "label", "title", "channel", "value", "uid", "id"],
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim()))); 
}

function resolveEffectiveBookingChannels(
  schedule: Schedule | null | undefined,
  calendar: Calendar | null | undefined,
) {
  const normalizedScheduleChannels = unique(normalizeList(schedule?.bookingChannels as unknown[]));
  const normalizedCalendarChannels = unique(normalizeList(calendar?.bookingChannels as unknown[]));
  const fallbackChannel = typeof calendar?.channel === "string" && calendar.channel.trim() ? [calendar.channel] : [];

  return normalizedScheduleChannels.length
    ? normalizedScheduleChannels
    : normalizedCalendarChannels.length
      ? normalizedCalendarChannels
      : fallbackChannel;
}

function token(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatUsers(items: string[]) {
  if (items.length <= 2) return items;
  return [items[0], items[1], `+${items.length - 2} more`];
}

function diffList(current: string[], initial: string[]) {
  const currentSet = new Set(current);
  const initialSet = new Set(initial);
  return {
    add: current.filter((item) => !initialSet.has(item)),
    remove: initial.filter((item) => !currentSet.has(item)),
  };
}

interface ServiceAssignment {
  userUid: string;
  userName: string;
}

interface ServiceCustomizationSource {
  serviceUid: string;
  serviceName?: string;
  users?: Array<{
    userUid: string;
    userName?: string;
    price?: number;
  }>;
}

function normalizeServiceSources(values: unknown[] | undefined): ServiceCustomizationSource[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const record = value as Record<string, unknown>;
      const serviceUid = [record.serviceUid, record.uid, record.id]
        .find((item): item is string => typeof item === "string" && item.trim().length > 0)
        ?.trim();
      if (!serviceUid) return null;

      const rawUsers = Array.isArray(record.users) ? record.users : [];
      return {
        serviceUid,
        serviceName:
          [record.serviceName, record.name, record.displayName]
            .find((item): item is string => typeof item === "string" && item.trim().length > 0)
            ?.trim(),
        users: rawUsers
          .map((user) => {
            if (!user || typeof user !== "object") return null;
            const userRecord = user as Record<string, unknown>;
            const userUid = [userRecord.userUid, userRecord.uid, userRecord.id]
              .find((item): item is string => typeof item === "string" && item.trim().length > 0)
              ?.trim();
            if (!userUid) return null;
            return {
              userUid,
              userName:
                [userRecord.userName, userRecord.displayName, userRecord.name]
                  .find((item): item is string => typeof item === "string" && item.trim().length > 0)
                  ?.trim(),
              price: typeof userRecord.price === "number" ? userRecord.price : undefined,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      };
    })
    .filter((item): item is ServiceCustomizationSource => Boolean(item));
}

function resolveUserName(
  userUid: string,
  fallbackName: string | undefined,
  userMap: Map<string, string | undefined>,
) {
  const mappedName = userMap.get(userUid)?.trim();
  if (mappedName) return mappedName;
  const fallback = fallbackName?.trim();
  if (fallback && fallback !== userUid) return fallback;
  return userUid;
}

function buildAssignmentsFromSources(
  serviceIds: string[],
  calendarUserIds: string[],
  userMap: Map<string, string | undefined>,
  serviceSources?: ServiceCustomizationSource[],
) {
  return Object.fromEntries(
    serviceIds.map((serviceId) => {
      const source = serviceSources?.find((item) => item.serviceUid === serviceId);
      const sourceUsers = source?.users ?? [];
      const users =
        sourceUsers.length > 0
          ? sourceUsers.map((user) => ({
              userUid: user.userUid,
              userName: resolveUserName(user.userUid, user.userName, userMap),
            }))
          : calendarUserIds.map((userUid) => ({
              userUid,
              userName: resolveUserName(userUid, undefined, userMap),
            }));

      return [serviceId, users];
    }),
  );
}

export default function CustomizeCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ uid: string }>();
  const routeState = (location.state as { calendar?: Calendar; schedule?: Schedule } | null) ?? null;
  const initialCalendar = routeState?.calendar;
  const selectedSchedule = routeState?.schedule ?? null;
  const isScheduleMode = Boolean(selectedSchedule);
  const calendarUid = params.uid ?? initialCalendar?.uid ?? "";
  const { customizeCalendar, customizeSchedule, searchSchedules, getCalendar, getSchedule } = useCalendars();
  const { services } = useServices();
  const { users } = useUsers();

  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar ?? null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<Record<string, ServiceAssignment[]>>({});
  const [initialChannels, setInitialChannels] = useState<string[]>([]);
  const [initialServiceIds, setInitialServiceIds] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [initialServiceAssignments, setInitialServiceAssignments] = useState<Record<string, ServiceAssignment[]>>({});
  const [applyToAll, setApplyToAll] = useState(!isScheduleMode);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(Boolean(calendarUid));
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);

  const serviceMap = useMemo(() => new Map(services.map((service) => [service.uid ?? service.id, service.name])), [services]);
  const userMap = useMemo(
    () => new Map(users.map((user) => [user.userUid, user.userDisplayName ?? user.displayName])),
    [users],
  );
  const defaultUserIds = useMemo(
    () => unique(normalizeList(calendar?.users as unknown[], ["userUid", "uid", "id", "displayName", "name"])),
    [calendar?.users],
  );
  const calendarServiceSources = useMemo(
    () => normalizeServiceSources(calendar?.services as unknown[]),
    [calendar?.services],
  );

  const defaultAssignments = useMemo<Record<string, ServiceAssignment[]>>(
    () =>
      Object.fromEntries(
        selectedServiceIds.map((serviceId) => [
          serviceId,
          defaultUserIds.map((id) => ({
            userUid: id,
            userName: userMap.get(id) ?? id,
          })),
        ]),
      ),
    [defaultUserIds, selectedServiceIds, userMap],
  );

  const serviceRows = useMemo(() => {
    return selectedServiceIds.map((serviceId, index) => {
      const assignedUsers =
        serviceAssignments[serviceId] ??
        initialServiceAssignments[serviceId] ??
        defaultAssignments[serviceId] ??
        [];
      return {
        serviceId,
        id: `${serviceId}-${index}`,
        serviceName: serviceMap.get(serviceId) ?? serviceId,
        users: assignedUsers,
      };
    });
  }, [defaultAssignments, initialServiceAssignments, selectedServiceIds, serviceAssignments, serviceMap]);

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
        const serviceSources = normalizeServiceSources(data.services as unknown[]);
        const serviceIds = unique(
          serviceSources.length
            ? serviceSources.map((item) => item.serviceUid)
            : normalizeList(data.services as unknown[], ["serviceUid", "uid", "id", "serviceName", "name"])
        );
        const bookingChannels = unique(normalizeList(data.bookingChannels as unknown[]));
        const labels = unique(normalizeList((data.tags ?? data.label) as unknown[]));
        const baseUsers = unique(
          normalizeList(data.users as unknown[], ["userUid", "uid", "id", "displayName", "name"]),
        );
        const initialUserMap = buildAssignmentsFromSources(serviceIds, baseUsers, userMap, serviceSources);

        setCalendar(data);
        setSelectedServiceIds(serviceIds);
        setSelectedChannels(bookingChannels.length ? bookingChannels : ["ONLINE"]);
        setTags(labels);
        setServiceAssignments(initialUserMap);
        setInitialServiceIds(serviceIds);
        setInitialChannels(bookingChannels.length ? bookingChannels : ["ONLINE"]);
        setInitialTags(labels);
        setInitialServiceAssignments(initialUserMap);
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
  }, [calendarUid, getCalendar, initialCalendar, userMap]);

  useEffect(() => {
    if (!calendarUid) return;
    let cancelled = false;

    async function loadSchedules() {
      setLoadingSchedules(true);
      try {
        const data = await searchSchedules(calendarUid);
        if (cancelled) return;
        setSchedules(data);
        if (selectedSchedule) {
          const matched = await getSchedule(calendarUid, selectedSchedule.uid).catch(() => null);
          if (cancelled) return;
          const resolvedSchedule = matched ?? data.find((schedule) => schedule.uid === selectedSchedule.uid) ?? selectedSchedule;
          const calendarServiceIds = unique(
            calendarServiceSources.length
              ? calendarServiceSources.map((item) => item.serviceUid)
              : normalizeList(calendar?.services as unknown[], ["serviceUid", "uid", "id", "serviceName", "name"])
          );
          const calendarUsers = unique(
            normalizeList(calendar?.users as unknown[], ["userUid", "uid", "id", "displayName", "name"]),
          );
          const scheduleServices = resolvedSchedule.services ?? [];
          const nextServiceIds = unique(
            (scheduleServices.length ? scheduleServices.map((item) => item.serviceUid) : calendarServiceIds),
          );
          const nextAssignments = buildAssignmentsFromSources(nextServiceIds, calendarUsers, userMap, scheduleServices);
          const bookingChannels = resolveEffectiveBookingChannels(resolvedSchedule, calendar);
          const labels = unique(
            normalizeList(
              ((resolvedSchedule.label?.length ? resolvedSchedule.label : (calendar?.tags ?? calendar?.label)) ?? []) as unknown[],
            ),
          );

          setSelectedServiceIds(nextServiceIds);
          setInitialServiceIds(nextServiceIds);
          setServiceAssignments(nextAssignments);
          setInitialServiceAssignments(nextAssignments);
          setSelectedChannels(bookingChannels);
          setInitialChannels(bookingChannels);
          setTags(labels);
          setInitialTags(labels);
          setApplyToAll(false);
        }
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
  }, [calendar, calendarServiceSources, calendarUid, getSchedule, searchSchedules, selectedSchedule, userMap]);

  const addTag = () => {
    const value = newLabel.trim();
    if (!value || tags.includes(value)) return;
    setTags((current) => [...current, value]);
    setNewLabel("");
  };

  const buildCalendarPayload = (): CalendarCustomizationRequest => {
    const channelDiff = diffList(selectedChannels, initialChannels);
    const labelDiff = diffList(tags, initialTags);
    const serviceDiff = diffList(selectedServiceIds, initialServiceIds);

    const addServices = serviceDiff.add.map((serviceUid) => {
      const currentUsers = unique((serviceAssignments[serviceUid] ?? defaultAssignments[serviceUid] ?? []).map((item) => item.userUid));
      return { serviceUid, addUsers: currentUsers, removeUsers: [] };
    });

    const removeServices = serviceDiff.remove.map((serviceUid) => {
      const removedUsers = unique((initialServiceAssignments[serviceUid] ?? defaultAssignments[serviceUid] ?? []).map((item) => item.userUid));
      return { serviceUid, addUsers: [], removeUsers: removedUsers };
    });

    for (const serviceUid of selectedServiceIds.filter((id) => initialServiceIds.includes(id))) {
      const currentUsers = unique((serviceAssignments[serviceUid] ?? defaultAssignments[serviceUid] ?? []).map((item) => item.userUid));
      const initialUsers = unique((initialServiceAssignments[serviceUid] ?? defaultAssignments[serviceUid] ?? []).map((item) => item.userUid));
      const userDiff = diffList(currentUsers, initialUsers);
      if (userDiff.add.length || userDiff.remove.length) {
        addServices.push({
          serviceUid,
          addUsers: userDiff.add,
          removeUsers: userDiff.remove,
        });
      }
    }

    return {
      applyToAll,
      addServices,
      removeServices,
      addBookingChannels: channelDiff.add,
      removeBookingChannels: channelDiff.remove,
      addLabels: labelDiff.add,
      removeLabels: labelDiff.remove,
    };
  };

  const buildSchedulePayload = (): ScheduleCustomizationRequest => {
    const channelDiff = diffList(selectedChannels, initialChannels);
    const labelDiff = diffList(tags, initialTags);
    const serviceDiff = diffList(selectedServiceIds, initialServiceIds);

    const addServices = serviceDiff.add.map((serviceUid) => ({
      serviceUid,
      serviceName: serviceMap.get(serviceUid) ?? serviceUid,
      addUsers: (serviceAssignments[serviceUid] ?? []).map((item) => ({
        userUid: item.userUid,
        userName: item.userName,
      })),
      removeUsers: [],
    }));

    const removeServices = serviceDiff.remove.map((serviceUid) => ({ serviceUid }));

    for (const serviceUid of selectedServiceIds.filter((id) => initialServiceIds.includes(id))) {
      const currentUsers = serviceAssignments[serviceUid] ?? [];
      const initialUsers = initialServiceAssignments[serviceUid] ?? [];
      const initialMap = new Map(initialUsers.map((item) => [item.userUid, item]));
      const currentMap = new Map(currentUsers.map((item) => [item.userUid, item]));

      const addedUsers = currentUsers
        .filter((item) => !initialMap.has(item.userUid))
        .map((item) => ({
          userUid: item.userUid,
          userName: item.userName,
          price: item.price ?? 0,
        }));

      const removedUsers = initialUsers
        .filter((item) => !currentMap.has(item.userUid))
        .map((item) => ({ userUid: item.userUid }));

      if (addedUsers.length || removedUsers.length) {
        addServices.push({
          serviceUid,
          serviceName: serviceMap.get(serviceUid) ?? serviceUid,
          addUsers: addedUsers,
          removeUsers: removedUsers,
        });
      }
    }

    return {
      applyToAll,
      addServices,
      removeServices,
      addBookingChannels: channelDiff.add,
      removeBookingChannels: channelDiff.remove,
      addLabels: labelDiff.add,
      removeLabels: labelDiff.remove,
    };
  };

  const save = async () => {
    if (!calendarUid || !calendar) return;
    setSaving(true);
    try {
      if (selectedSchedule) {
        await customizeSchedule(selectedSchedule.uid, buildSchedulePayload());
        navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar } });
      } else {
        const payload = buildCalendarPayload();
        const updated = await customizeCalendar(calendarUid, payload);
        navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar: updated } });
      }
    } catch {
      // The calendar hook maps the API failure to a user-facing toast.
    } finally {
      setSaving(false);
    }
  };

  const selectedServiceObjects = services.filter((service) =>
    selectedServiceIds.includes(service.uid ?? service.id),
  );

  return (
    <main
      id="bookings-customize-calendar-page"
      data-testid="bookings-customize-calendar-page"
      data-state={calendarUid ? "ready" : "empty"}
      className="calendar-details-page"
    >
      <header className="border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
        <PageHeader
          title="Customize Calendar"
          subtitle="Configure services, users, booking channels, and labels."
          back={{ label: "Back to calendar details", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          className="mb-4"
        />
      </header>

      <div className="calendar-details-layout pb-10">
        {!calendarUid && <Alert variant="danger" className="mt-4">Open this screen from a calendar’s details to save settings.</Alert>}

        <section className="mt-2 rounded-xl border border-[#E8EAF3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:p-8">
          {loadingCalendar ? (
            <div className="text-sm text-slate-500">Loading calendar...</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-[30px]">
                    {selectedSchedule ? selectedSchedule.name : calendar?.name || "Customize Your Calendar"}
                  </h1>
                  <p className="mt-2 text-[15px] text-slate-500">
                    {selectedSchedule
                      ? `Applicable to the ${selectedSchedule.name} schedule and its time windows`
                      : "Applicable to all the schedules and time windows in this calendar"}
                  </p>
                </div>
                {calendar?.status ? <Badge variant="success">{calendar.status}</Badge> : null}
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Schedules</h3>
                <div className="flex flex-wrap gap-3">
                  {loadingSchedules ? (
                    <span className="text-sm text-slate-500">Loading schedules...</span>
                  ) : visibleSchedules.length ? (
                    visibleSchedules.map((schedule) => (
                      <div
                        key={schedule.uid}
                        className="inline-flex h-8 items-center rounded-md border border-[#5a32a3] bg-[#f8f5ff] px-3 text-xs font-semibold text-[#5a32a3]"
                      >
                        {schedule.name}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      {selectedSchedule
                        ? "The selected schedule could not be loaded."
                        : "No schedules found for this calendar."}
                    </span>
                  )}
                </div>
              </div>

              <section className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-700">Services & Users</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsServicesModalOpen(true)}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add Services
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7EBF4]">
                  <table className="min-w-full border-collapse">
                    <thead className="border-b border-[#E7EBF4]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">Services</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">Users</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-slate-800"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {serviceRows.length ? (
                        serviceRows.map((row) => (
                          <tr key={row.id} className="border-t border-[#E7EBF4]">
                            <td className="px-6 py-5 text-base font-medium text-slate-900">{row.serviceName}</td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-2">
                                {row.users.length ? (
                                  row.users.map((user) => (
                                    <div key={`${row.serviceId}-${user.userUid}`} className="flex items-center gap-3">
                                      <span className="text-sm text-slate-700">
                                        {resolveUserName(user.userUid, user.userName, userMap)}
                                      </span>
                                    </div>
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
                                  className="text-sm font-semibold text-[#5a32a3] underline hover:text-[#462780]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${row.serviceName}`}
                                  onClick={() => setSelectedServiceIds((current) => current.filter((id) => id !== row.serviceId))}
                                  className="text-slate-400 hover:text-slate-600 ml-4"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
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

              <section className="mt-8">
                <h2 className="text-base font-semibold text-slate-700">Booking Channel Setup</h2>
                <p className="mt-1 text-sm text-slate-500">Configure which channels customers can use to book appointments for this time window</p>

                <div className="mt-5 space-y-4">
                  {channels.map((channel) => {
                    const checked = selectedChannels.includes(channel.value);
                    return (
                      <label
                        key={channel.value}
                        className="flex cursor-pointer items-start gap-3"
                      >
                        <Checkbox
                          id={`bookings-customize-channel-${token(channel.value)}`}
                          data-testid={`bookings-customize-channel-${token(channel.value)}`}
                          checked={checked}
                          onChange={() =>
                            setSelectedChannels((current) =>
                              checked ? current.filter((value) => value !== channel.value) : [...current, channel.value],
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

              <section className="mt-8">
                <h2 className="text-base font-semibold text-slate-700">Label</h2>
                <p className="mt-1 text-sm text-slate-500">Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      data-testid={`bookings-customize-tag-${token(tag)}`}
                      className="inline-flex h-[34px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
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
                  <div className="flex items-center gap-3 ml-2">
                    <Input
                      id="bookings-customize-tag-input"
                      value={newLabel}
                      onChange={(event) => setNewLabel(event.target.value)}
                      placeholder="New label..."
                      className="w-32 h-[34px] !min-h-[34px] text-sm"
                    />
                    <button
                      id="bookings-customize-tag-add"
                      data-testid="bookings-customize-tag-add"
                      type="button"
                      onClick={addTag}
                      disabled={!newLabel.trim()}
                      className="flex items-center gap-1.5 text-sm font-semibold text-[#5a32a3] hover:text-[#462780] disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                      Add Label
                    </button>
                  </div>
                </div>
              </section>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  id="bookings-customize-calendar-cancel"
                  data-testid="bookings-customize-calendar-cancel"
                  type="button"
                  onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
                  variant="secondary"
                  className="h-9 rounded-md px-6 sm:w-auto text-sm font-semibold"
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
                  className="h-9 rounded-md !bg-[#5a32a3] px-8 !text-white hover:!bg-[#462780] hover:!text-white sm:min-w-[120px] text-sm font-semibold"
                >
                  {selectedSchedule ? "Update Schedule" : "Update"}
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
        initialSelectedServices={selectedServiceObjects as Service[]}
        onSave={(selected) => {
          setSelectedServiceIds(unique(selected.map((service) => service.uid ?? service.id)));
          setIsServicesModalOpen(false);
        }}
      />

      <DualListUsersModal
        isOpen={usersModalServiceId !== null}
        onClose={() => setUsersModalServiceId(null)}
        serviceName={serviceRows.find((row) => row.serviceId === usersModalServiceId)?.serviceName || "this service"}
        allUsers={users.map((u) => ({
          id: u.userUid,
          name: u.userDisplayName || u.displayName || u.firstName || "Unknown",
          role: u.title || "Practitioner",
        }))}
        initialSelectedUsers={(serviceAssignments[usersModalServiceId ?? ""] ?? initialServiceAssignments[usersModalServiceId ?? ""] ?? defaultAssignments[usersModalServiceId ?? ""] ?? []).map((assignment) => {
          const u = users.find((user) => user.userUid === assignment.userUid);
          return {
            id: String(assignment.userUid),
            name: resolveUserName(
              assignment.userUid,
              assignment.userName || u?.userDisplayName || u?.displayName || u?.firstName,
              userMap,
            ),
            role: u?.title || "Practitioner",
          };
        })}
        onSave={(selected) => {
          if (usersModalServiceId) {
            setServiceAssignments((prev) => {
              const existing = new Map((prev[usersModalServiceId] ?? []).map((item) => [item.userUid, item]));
              return {
                ...prev,
                [usersModalServiceId]: selected.map((item) => ({
                  userUid: item.id,
                  userName: resolveUserName(item.id, item.name, userMap),
                })),
              };
            });
          }
          setUsersModalServiceId(null);
        }}
      />
    </main>
  );
}
