import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Dialog, DialogFooter, Input, PageHeader } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import type { Calendar, Schedule, TimeWindow, TimeWindowCustomizationRequest } from "../../types";
import DualListServicesModal from "./components/DualListServicesModal";
import DualListUsersModal from "./components/DualListUsersModal";

const channels = [
  { value: "ONLINE", title: "Online", description: "Allow customers to book appointments online" },
  { value: "WALK_IN", title: "Walk-in", description: "Accept walk-in appointments without prior booking" },
  { value: "PHONE_IN", title: "Phone-in", description: "Accept appointments booked over the phone" },
  { value: "IVR", title: "IVR", description: "Accept appointments initiated through the IVR channel" },
];

interface TimeWindowUserAssignment {
  userUid: string;
  userName: string;
  price?: number;
  capacity?: number;
}

interface ServiceCustomizationSource {
  serviceUid: string;
  serviceName?: string;
  users?: Array<{
    userUid: string;
    userName?: string;
    price?: number;
    capacity?: number;
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
              capacity:
                typeof userRecord.capacity === "number"
                  ? userRecord.capacity
                  : typeof userRecord.slotCapacity === "number"
                    ? userRecord.slotCapacity
                    : undefined,
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
  userMap: Map<string, { userDisplayName?: string; displayName?: string; firstName?: string }>,
) {
  const mappedUser = userMap.get(userUid);
  const mappedName =
    mappedUser?.userDisplayName?.trim() || mappedUser?.displayName?.trim() || mappedUser?.firstName?.trim();
  if (mappedName) return mappedName;
  const fallback = fallbackName?.trim();
  if (fallback && fallback !== userUid) return fallback;
  return userUid;
}

function buildAssignmentsFromSources(
  serviceIds: string[],
  inheritedUserIds: string[],
  userMap: Map<string, { userDisplayName?: string; displayName?: string; firstName?: string }>,
  timeWindowDefaults: { price?: number; slotCapacity?: number } | null,
  serviceSources?: ServiceCustomizationSource[],
) {
  return Object.fromEntries(
    serviceIds.map((serviceId) => {
      const source = serviceSources?.find((item) => item.serviceUid === serviceId);
      const sourceUsers = source?.users ?? [];
      const users = sourceUsers.map((user) => ({
        userUid: user.userUid,
        userName: resolveUserName(user.userUid, user.userName, userMap),
        price: user.price ?? timeWindowDefaults?.price ?? 0,
        capacity: user.capacity ?? timeWindowDefaults?.slotCapacity ?? 1,
      }));
      return [serviceId, users];
    }),
  );
}

function normalizeList(
  values: unknown[] | undefined,
  fallbackKeys: string[] = ["name", "displayName", "label", "title", "channel", "value", "uid", "id", "userUid"],
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

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function diffList(current: string[], initial: string[]) {
  const currentSet = new Set(current);
  const initialSet = new Set(initial);
  return {
    add: current.filter((item) => !initialSet.has(item)),
    remove: initial.filter((item) => !currentSet.has(item)),
  };
}

const avatarColors = [
  "bg-cyan-100 text-cyan-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
];

export default function CustomizeTimeWindow() {
  const { calendarUid, scheduleUid, timeWindowUid } = useParams<{
    calendarUid: string;
    scheduleUid: string;
    timeWindowUid: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState =
    (location.state as { calendar?: Calendar; schedule?: Schedule; timeWindow?: TimeWindow } | null) ?? null;
  const initialCalendar = routeState?.calendar ?? null;
  const initialSchedule = routeState?.schedule ?? null;
  const initialTimeWindow = routeState?.timeWindow ?? null;
  const { getCalendar, searchSchedules, customizeTimeWindow, getTimeWindowDetails } = useCalendars();
  const { services: allServices } = useServices();
  const { users: allUsers } = useUsers();

  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar);
  const [schedule, setSchedule] = useState<Schedule | null>(initialSchedule);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(initialTimeWindow);
  const [loading, setLoading] = useState(Boolean(calendarUid && scheduleUid && timeWindowUid));
  const [saving, setSaving] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<{
    serviceId: string;
    userUid: string;
    userName: string;
    price: string;
    capacity: string;
  } | null>(null);

  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [initialChannels, setInitialChannels] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [initialServiceIds, setInitialServiceIds] = useState<string[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<Record<string, TimeWindowUserAssignment[]>>({});
  const [initialServiceAssignments, setInitialServiceAssignments] = useState<Record<string, TimeWindowUserAssignment[]>>({});
  const [newLabel, setNewLabel] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);

  const serviceMap = useMemo(
    () => new Map(allServices.map((service) => [service.uid ?? service.id, service])),
    [allServices],
  );
  const userMap = useMemo(
    () => new Map(allUsers.map((user) => [user.userUid, user])),
    [allUsers],
  );

  useEffect(() => {
    if (!calendarUid || !scheduleUid || !timeWindowUid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [calendarData, scheduleData, timeWindowData] = await Promise.all([
          getCalendar(calendarUid),
          searchSchedules(calendarUid),
          getTimeWindowDetails(timeWindowUid).catch(() => null),
        ]);
        if (cancelled) return;

        const matchedSchedule = scheduleData.find((item) => item.uid === scheduleUid) ?? initialSchedule;
        const matchedTimeWindow =
          timeWindowData ??
          matchedSchedule?.timeWindows?.find((item) => item.uid === timeWindowUid) ??
          initialTimeWindow ??
          null;
        const calendarServiceSources = normalizeServiceSources(calendarData?.services as unknown[]);
        const calendarServiceIds = unique(
          calendarServiceSources.length
            ? calendarServiceSources.map((item) => item.serviceUid)
            : normalizeList(calendarData?.services as unknown[], ["serviceUid", "uid", "id", "serviceName", "name"])
        );
        const calendarUsers = unique(
          normalizeList(calendarData?.users as unknown[], ["userUid", "uid", "id", "displayName", "name"]),
        );
        const scheduleServiceIds = unique((matchedSchedule?.services ?? []).map((item) => item.serviceUid));
        const inheritedServiceIds = scheduleServiceIds.length ? scheduleServiceIds : calendarServiceIds;
        const inheritedAssignments = buildAssignmentsFromSources(
          inheritedServiceIds,
          calendarUsers,
          userMap,
          matchedTimeWindow,
          matchedSchedule?.services,
        );

        setCalendar(calendarData);
        setSchedule(matchedSchedule ?? null);
        setTimeWindow(matchedTimeWindow);

        const services = matchedTimeWindow?.services ?? [];
        const nextServiceIds = unique(
          (services.length ? services.map((item) => item.serviceUid) : inheritedServiceIds),
        );
        const nextAssignments = services.length
          ? buildAssignmentsFromSources(nextServiceIds, calendarUsers, userMap, matchedTimeWindow, services)
          : inheritedAssignments;
        const bookingChannels = unique(
          normalizeList(
            ((matchedTimeWindow?.bookingChannels?.length
              ? matchedTimeWindow.bookingChannels
              : matchedSchedule?.bookingChannels?.length
                ? matchedSchedule.bookingChannels
                : calendarData?.bookingChannels) ??
              [matchedTimeWindow?.channel ?? calendarData?.channel].filter(Boolean)) as unknown[],
          ),
        );
        const labels = unique(
          normalizeList(
            ((matchedTimeWindow?.label?.length
              ? matchedTimeWindow.label
              : matchedSchedule?.label?.length
                ? matchedSchedule.label
                : (calendarData?.tags ?? calendarData?.label)) ?? []) as unknown[],
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar, getTimeWindowDetails, initialSchedule, initialTimeWindow, scheduleUid, searchSchedules, timeWindowUid, userMap]);

  const selectedServiceObjects = allServices.filter((service) =>
    selectedServiceIds.includes(service.uid ?? service.id ?? ""),
  );

  const displayServices = useMemo(
    () =>
      selectedServiceIds.map((serviceId) => ({
        id: serviceId,
        name: serviceMap.get(serviceId)?.name ?? serviceId,
        users: serviceAssignments[serviceId] ?? [],
      })),
    [selectedServiceIds, serviceAssignments, serviceMap],
  );

  const addTag = () => {
    const value = newLabel.trim();
    if (!value || tags.includes(value)) return;
    setTags((current) => [...current, value]);
    setNewLabel("");
  };

  const buildPayload = (): TimeWindowCustomizationRequest => {
    const channelDiff = diffList(selectedChannels, initialChannels);
    const labelDiff = diffList(tags, initialTags);
    const serviceDiff = diffList(selectedServiceIds, initialServiceIds);

    const addServices = serviceDiff.add.map((serviceUid) => ({
      serviceUid,
      serviceName: serviceMap.get(serviceUid)?.name ?? serviceUid,
      addUsers: (serviceAssignments[serviceUid] ?? []).map((item) => ({
        userUid: item.userUid,
        userName: item.userName,
        price: item.price ?? 0,
        capacity: item.capacity ?? 1,
        slotCapacity: item.capacity ?? 1,
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
          capacity: item.capacity ?? 1,
          slotCapacity: item.capacity ?? 1,
        }));

      const removedUsers = initialUsers
        .filter((item) => !currentMap.has(item.userUid))
        .map((item) => ({ userUid: item.userUid }));

      const changedUsers = currentUsers
        .filter((item) => {
          const existing = initialMap.get(item.userUid);
          return existing && (
            (existing.price ?? 0) !== (item.price ?? 0) ||
            (existing.capacity ?? 1) !== (item.capacity ?? 1)
          );
        })
        .map((item) => ({
          userUid: item.userUid,
          userName: item.userName,
          price: item.price ?? 0,
          capacity: item.capacity ?? 1,
          slotCapacity: item.capacity ?? 1,
        }));

      if (addedUsers.length || removedUsers.length || changedUsers.length) {
        addServices.push({
          serviceUid,
          serviceName: serviceMap.get(serviceUid)?.name ?? serviceUid,
          addUsers: [...addedUsers, ...changedUsers],
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

  const handleSave = async () => {
    if (!timeWindowUid) return;
    setSaving(true);
    try {
      await customizeTimeWindow(timeWindowUid, buildPayload());
      navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars", {
        replace: true,
        state: { calendar },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <PageHeader
          title="Customize Time Window"
          subtitle="Configure booking channels, labels, services, and provider pricing/capacity for this time window."
          back={{ label: "Back to calendar", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          actions={calendar?.name ? <Badge variant="primary">{calendar.name}</Badge> : undefined}
        />

        <section className="mt-8 rounded-xl border border-[#E8EAF3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:p-8">
          {!calendarUid || !scheduleUid || !timeWindowUid ? (
            <Alert variant="danger">Open this screen from a time window to save settings.</Alert>
          ) : loading ? (
            <div className="text-sm text-slate-500">Loading time window...</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-[30px]">
                    {timeWindow ? `${timeWindow.startTime} - ${timeWindow.endTime}` : "Customize Time Window"}
                  </h1>
                  <p className="mt-2 text-[15px] text-slate-500">
                    Applicable only to this selected time window, unless you choose to apply globally.
                  </p>
                </div>
                {timeWindow?.status ? <Badge variant="success">{timeWindow.status}</Badge> : null}
              </div>

              <div className="mt-7 flex flex-wrap gap-4">
                <div>
                  <div className="mb-1.5 text-sm font-medium text-slate-500">Schedule</div>
                  <div className="inline-flex h-9 items-center rounded-full border border-[#7c3aed] bg-[#f5f3ff] px-4 text-sm font-semibold text-[#7c3aed]">
                    {schedule?.name || "Schedule"}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-sm font-medium text-slate-500">Time Window</div>
                  <div className="inline-flex h-9 items-center rounded-full border border-[#7c3aed] bg-[#f5f3ff] px-4 text-sm font-semibold text-[#7c3aed]">
                    {timeWindow
                      ? `${timeWindow.startTime} - ${timeWindow.endTime}`
                      : "Time Window"}
                  </div>
                </div>
              </div>

              <section className="mt-10">
                <h2 className="text-[22px] font-semibold text-slate-900">Booking Channel Setup</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Configure which channels customers can use to book appointments for this time window.
                </p>

                <div className="mt-5 space-y-5">
                  {channels.filter((channel) => {
                    const scheduleChannels = unique(normalizeList(schedule?.bookingChannels as unknown[]));
                    const calendarChannels = unique(normalizeList(calendar?.bookingChannels as unknown[]));
                    const fallbackChannel = typeof calendar?.channel === "string" && calendar.channel.trim() ? [calendar.channel] : [];
                    const parentChannels = scheduleChannels.length ? scheduleChannels : (calendarChannels.length ? calendarChannels : fallbackChannel);
                    return parentChannels.includes(channel.value);
                  }).map((channel) => {
                    const checked = selectedChannels.includes(channel.value);
                    return (
                      <label
                        key={channel.value}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8EAF3] bg-white p-4 transition hover:border-[#d8ccff] hover:bg-[#faf7ff]"
                      >
                        <Checkbox
                          id={`tw-channel-${channel.value.toLowerCase()}`}
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
                  Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex h-[34px] items-center gap-2 rounded-2xl border border-[#E3E5EE] bg-[#F5F6FA] px-4 text-sm font-medium text-slate-700"
                    >
                      {tag}
                      <button
                        type="button"
                        className="text-slate-400 transition hover:text-slate-700"
                        onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-3">
                    <Input
                      value={newLabel}
                      onChange={(event) => setNewLabel(event.target.value)}
                      placeholder="New label..."
                      className="w-32 h-[34px] !min-h-[34px] text-sm"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!newLabel.trim()}
                      className="inline-flex h-[34px] items-center rounded-2xl px-3 text-sm font-semibold text-[#7c3aed] transition hover:bg-[#f5f3ff] disabled:opacity-50"
                    >
                      + Add Label
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-10">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-semibold text-slate-900">Service User Assignment</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Customize providers, slot price, and capacity for each service in this time window.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-10 rounded-lg bg-slate-800 px-5 text-white hover:bg-slate-900"
                    onClick={() => setIsServicesModalOpen(true)}
                  >
                    + Add Services
                  </Button>
                </div>

                <div className="flex flex-col gap-6">
                  {displayServices.length ? (
                    displayServices.map((service) => (
                      <div key={service.id} className="border-b border-[#E8EAF3] pb-6 last:border-0 last:pb-0">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-slate-900">{service.name}</h4>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              className="text-sm font-semibold text-[#7c3aed] hover:underline"
                              onClick={() => setUsersModalServiceId(service.id)}
                            >
                              Edit Users
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-rose-500 hover:underline"
                              onClick={() => setSelectedServiceIds((current) => current.filter((id) => id !== service.id))}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mb-3 text-sm text-slate-500">Assigned Users</div>
                        <div className="flex flex-wrap gap-4">
                          {service.users.length ? (
                            service.users.map((user, index) => (
                              <div
                                key={`${service.id}-${user.userUid}`}
                                className="flex min-w-[280px] items-center gap-3 rounded-xl border border-[#E3E5EE] bg-[#f7f8fc] p-3 pr-4"
                              >
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
                                >
                                  {getInitials(user.userName)}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold leading-tight text-slate-900">
                                    {resolveUserName(user.userUid, user.userName, userMap)}
                                  </div>
                                  <div className="mt-1 text-xs font-medium text-slate-500">
                                    Price: ₹{user.price ?? 0} &nbsp; Capacity: {user.capacity ?? 1}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#f5f3ff] hover:text-[#7c3aed]"
                                  onClick={() =>
                                    setEditingUser({
                                      serviceId: service.id,
                                      userUid: user.userUid,
                                      userName: resolveUserName(user.userUid, user.userName, userMap),
                                      price: String(user.price ?? 0),
                                      capacity: String(user.capacity ?? 1),
                                    })
                                  }
                                >
                                  Edit
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="py-2 text-sm italic text-slate-400">No users assigned to this service.</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-500">
                      No services have been mapped to this time window yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-10">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8EAF3] bg-[#fafbff] p-4">
                  <Checkbox
                    id="bookings-customize-time-window-apply-all"
                    checked={applyToAll}
                    onChange={() => setApplyToAll((current) => !current)}
                    label={
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-slate-900">Apply to all schedules and time windows</span>
                        <span className="mt-1 text-sm text-slate-500">
                          Propagate these customizations to all schedules and time windows under the same calendar.
                        </span>
                      </div>
                    }
                    controlClassName="items-start"
                  />
                </label>
              </section>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
                  variant="secondary"
                  className="h-11 rounded-lg px-6 sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  loading={saving}
                  onClick={handleSave}
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
        allServices={allServices}
        initialSelectedServices={selectedServiceObjects}
        onSave={(selected) => {
          setSelectedServiceIds(unique(selected.map((service) => service.uid ?? service.id ?? "")));
          setServiceAssignments((current) => {
            const next = { ...current };
            for (const service of selected) {
              const id = service.uid ?? service.id ?? "";
              if (!next[id]) {
                next[id] = [];
              }
            }
            return next;
          });
          setIsServicesModalOpen(false);
        }}
      />

      <DualListUsersModal
        isOpen={usersModalServiceId !== null}
        onClose={() => setUsersModalServiceId(null)}
        serviceName={displayServices.find((service) => service.id === usersModalServiceId)?.name || "this service"}
        allUsers={allUsers.map((user) => ({
          id: user.userUid,
          name: user.userDisplayName || user.displayName || user.firstName || "Unknown",
          role: user.title || "Practitioner",
        }))}
        initialSelectedUsers={(serviceAssignments[usersModalServiceId ?? ""] ?? []).map((assignment) => ({
          id: assignment.userUid,
          name: resolveUserName(assignment.userUid, assignment.userName, userMap),
          role: userMap.get(assignment.userUid)?.title || "Practitioner",
        }))}
        onSave={(selected) => {
          if (usersModalServiceId) {
            setServiceAssignments((current) => {
              const existing = new Map((current[usersModalServiceId] ?? []).map((item) => [item.userUid, item]));
              return {
                ...current,
                [usersModalServiceId]: selected.map((user) => ({
                  userUid: user.id,
                  userName: resolveUserName(user.id, user.name, userMap),
                  price: existing.get(user.id)?.price ?? timeWindow?.price ?? 0,
                  capacity: existing.get(user.id)?.capacity ?? timeWindow?.slotCapacity ?? 1,
                })),
              };
            });
          }
          setUsersModalServiceId(null);
        }}
      />

      <Dialog
        open={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title="Customize Price and Slot Capacity"
        description="Customize the price and slot capacity for this provider within the selected time window."
        className="max-w-[460px]"
      >
        <div className="space-y-6 p-6 pt-0">
          {editingUser ? (
            <>
              <div className="rounded-xl border border-[#E3E5EE] p-3 text-sm font-medium text-slate-900">
                {editingUser.userName}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Price</label>
                <Input
                  type="number"
                  value={editingUser.price}
                  onChange={(event) =>
                    setEditingUser((current) =>
                      current ? { ...current, price: event.target.value } : null,
                    )
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Slot Capacity</label>
                <Input
                  type="number"
                  value={editingUser.capacity}
                  onChange={(event) =>
                    setEditingUser((current) =>
                      current ? { ...current, capacity: event.target.value } : null,
                    )
                  }
                />
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="!bg-[#31028C] text-white hover:!bg-[#230166]"
            onClick={() => {
              if (editingUser) {
                setServiceAssignments((current) => ({
                  ...current,
                  [editingUser.serviceId]: (current[editingUser.serviceId] ?? []).map((item) =>
                    item.userUid === editingUser.userUid
                      ? {
                          ...item,
                          price: Number(editingUser.price || 0),
                          capacity: Number(editingUser.capacity || 1),
                        }
                      : item,
                  ),
                }));
              }
              setEditingUser(null);
            }}
          >
            Update
          </Button>
        </DialogFooter>
      </Dialog>
    </main>
  );
}
