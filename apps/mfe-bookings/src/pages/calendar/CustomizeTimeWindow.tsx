import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Dialog, DialogFooter, Input, PageHeader } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import type { Calendar, Schedule, TimeWindow, TimeWindowCustomizationRequest } from "../../types";
import DualListServicesModal from "./components/DualListServicesModal";
import DualListUsersModal from "./components/DualListUsersModal";
import LabelSelectorModal from "../../components/LabelSelectorModal";
import { useCustomerLabels } from "../../services/useCustomerLabels";

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
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
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

function format12Hour(time: string) {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  let hour = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m} ${ampm}`;
}

const DAY_MAP: Record<number, string> = {
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
  7: "S",
};

function formatTimeWindowDisplay(tw: { weekDays?: number[]; startTime: string; endTime: string }) {
  if (!tw) return "Time Window";
  const days = tw.weekDays
    ?.slice()
    .sort((a, b) => a - b)
    .map(d => DAY_MAP[d] || "")
    .filter(Boolean)
    .join(",");
  const timeString = `${format12Hour(tw.startTime)} - ${format12Hour(tw.endTime)}`;
  return days ? `${days} (${timeString})` : timeString;
}

function DetailsHeader({
  title,
  onBack,
  actions,
}: {
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center bg-white px-4 md:px-8 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
        <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 border-0 bg-transparent p-0 text-[17px] font-bold text-slate-900 transition-colors hover:text-[#5B2D8E]"
            aria-label="Go back"
        >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            {title}
        </button>
        {actions && <div className="ml-3">{actions}</div>}
    </header>
  );
}

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
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const { labels: availableLabels } = useCustomerLabels();

  const serviceMap = useMemo(
    () => new Map(allServices.map((service) => [service.uid ?? service.id, service])),
    [allServices],
  );
  const userMap = useMemo(
    () => new Map(allUsers.map((user) => [user.userUid, user])),
    [allUsers],
  );

  const availableServices = useMemo(() => {
    return allServices.map(service => {
      const assignedUserNames = (service.assignedProviders || [])
        .map(uid => allUsers.find(u => u.userUid === uid)?.displayName)
        .filter(Boolean)
        .join(', ');
      
      return {
        id: service.uid ?? service.id,
        uid: service.uid ?? service.id,
        name: service.name,
        code: service.serviceType,
        assignedProviders: service.assignedProviders,
        assignedUserNames: assignedUserNames || undefined,
      };
    });
  }, [allServices, allUsers]);

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

  // addTag not needed

  const buildPayload = (): TimeWindowCustomizationRequest => {
    const channelDiff = diffList(selectedChannels, initialChannels);
    const labelDiff = diffList(tags, initialTags);
    const serviceDiff = diffList(selectedServiceIds, initialServiceIds);

    const addServices: TimeWindowCustomizationRequest["addServices"] = serviceDiff.add.map((serviceUid) => ({
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

    const removeServices: TimeWindowCustomizationRequest["removeServices"] = serviceDiff.remove.map((serviceUid) => ({ serviceUid }));

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

      if (addedUsers.length > 0 || changedUsers.length > 0) {
        addServices.push({
          serviceUid,
          serviceName: serviceMap.get(serviceUid)?.name ?? serviceUid,
          addUsers: [...addedUsers, ...changedUsers],
        });
      }

      if (removedUsers.length > 0) {
        removeServices.push({
          serviceUid,
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
    <main className="flex flex-col h-full overflow-y-auto bg-[#f6f7fb]">
      <DetailsHeader
        title="Customize"
        onBack={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
        actions={calendar?.name ? <Badge variant="primary" className="!text-[11px] !px-2 !py-0.5">{calendar.name}</Badge> : undefined}
      />
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 flex-1">

        <div className="rounded-xl border border-[#E8EAF3] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] p-6 md:p-8 pb-10">
          {!calendarUid || !scheduleUid || !timeWindowUid ? (
            <Alert variant="danger">Open this screen from a time window to save settings.</Alert>
          ) : loading ? (
            <div className="text-sm text-slate-500">Loading time window...</div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-[17px] font-bold text-slate-900">
                  {timeWindow ? formatTimeWindowDisplay(timeWindow) : "Customize Your Timewindow"}
                </h1>
                <p className="mt-1 text-[11px] text-slate-400">
                  Applicable to selected schedule and timewindow in this calendar
                </p>
              </div>

              <div className="flex flex-wrap gap-8">
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-500">Schedule</div>
                  <div className="inline-flex items-center rounded-full border border-purple-200 bg-white px-3 py-0.5 text-[11px] font-medium text-purple-700">
                    {schedule?.name || "Schedule"}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-500">Time Window</div>
                  <div className="inline-flex items-center rounded-full border border-purple-200 bg-white px-3 py-0.5 text-[11px] font-medium text-purple-700">
                    {timeWindow ? formatTimeWindowDisplay(timeWindow) : "Time Window"}
                  </div>
                </div>
              </div>

              <section className="mt-10 border-b border-slate-50 pb-6">
                <h2 className="text-[15px] font-bold text-[#1f2937]">Booking Channel Setup</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Configure which channels customers can use to book appointments for this time window.
                </p>

                <div className="mt-5 space-y-4">
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
                        className="flex cursor-pointer items-start gap-2 py-1"
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
                            <div className="flex flex-col mt-[-2px]">
                              <span className="text-[13px] font-bold text-slate-900 leading-tight">{channel.title}</span>
                              <span className="text-[11px] text-slate-400 leading-tight mt-0.5">{channel.description}</span>
                            </div>
                          }
                          controlClassName="items-start"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="mt-8 border-b border-slate-50 pb-6">
                <h2 className="text-[15px] font-bold text-[#1f2937]">Label</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {tags.map((tagId) => {
                    const labelObj = availableLabels.find(l => l.id === tagId || l.name === tagId);
                    const displayName = labelObj ? labelObj.name : tagId;
                    return (
                      <span
                        key={tagId}
                        data-testid={`bookings-customize-tag-${tagId.replace(/\s+/g, '-')}`}
                        className="inline-flex h-[34px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      >
                        {displayName}
                        <button
                          id={`bookings-customize-tag-${tagId.replace(/\s+/g, '-')}-remove`}
                          data-testid={`bookings-customize-tag-${tagId.replace(/\s+/g, '-')}-remove`}
                          type="button"
                          aria-label={`Remove ${displayName}`}
                          onClick={() => setTags((current) => current.filter((value) => value !== tagId))}
                          className="text-slate-400 transition hover:text-slate-700"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  <div className="flex items-center gap-3 ml-2">
                    <Button type="button" variant="link" size="inline" onClick={() => setIsLabelModalOpen(true)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                      Add Label
                    </Button>
                  </div>
                </div>
              </section>

              <section className="mt-10 rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#1f2937]">Service User Assignment</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Customize which doctors are assigned to each service
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-8 rounded-md bg-[#333] px-3 py-1.5 text-xs font-medium text-white hover:bg-black border-0"
                    onClick={() => setIsServicesModalOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1 inline"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg> Add Services
                  </Button>
                </div>

                <div className="flex flex-col gap-6 p-5">
                  {displayServices.length ? (
                    displayServices.map((service) => (
                      <div key={service.id} className="border-b border-[#E8EAF3] pb-6 last:border-0 last:pb-0">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-[15px] font-bold text-[#1f2937]">{service.name}</h4>
                          <button
                            type="button"
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                            onClick={() => setUsersModalServiceId(service.id)}
                          >
                            Edit
                          </button>
                        </div>
                        <div className="mb-3 text-[13px] text-slate-500">Assigned Users</div>
                        <div className="flex flex-wrap gap-4">
                          {service.users.length ? (
                            service.users.map((user, index) => (
                              <div
                                key={`${service.id}-${user.userUid}`}
                                className="flex min-w-[220px] items-center gap-3 rounded-lg border border-slate-200 bg-[#f7f8fc] p-2 pr-3"
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarColors[index % avatarColors.length]}`}
                                >
                                  {getInitials(user.userName)}
                                </div>
                                <div className="flex-1">
                                  <div className="text-[13px] font-semibold leading-tight text-slate-900">
                                    {resolveUserName(user.userUid, user.userName, userMap)}
                                  </div>
                                  <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                    Price: ₹{user.price ?? 0} &nbsp; Capacity:{user.capacity ?? 1}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="text-slate-400 transition-colors hover:text-indigo-600 ml-2"
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
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="py-2 text-xs italic text-slate-400">No users assigned to this service.</div>
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
                {applyToAll && (
                  <div className="mt-3">
                    <Alert variant="danger">
                      Warning: Enabling "Apply to all" will replace the schedule configuration for every schedule in this calendar, including all existing time windows. This action will overwrite current settings and may affect availability across the entire calendar.
                    </Alert>
                  </div>
                )}
              </section>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
                  variant="secondary"
                  className="h-10 rounded px-6 sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  loading={saving}
                  onClick={handleSave}
                  className="h-10 rounded !bg-[#4318FF] px-6 !text-white hover:!bg-[#3510cf] hover:!text-white sm:min-w-[120px] border-0"
                >
                  Update
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <DualListServicesModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        allServices={availableServices}
        initialSelectedServices={displayServices}
        onSave={(selected) => {
          setSelectedServiceIds(unique(selected.map((service) => service.uid ?? service.id)));
          setServiceAssignments((prev) => {
            const next = { ...prev };
            selected.forEach((service) => {
              const id = service.uid ?? service.id ?? "";
              if (!next[id]) {
                const assignedUsers = [];
                if (service.assignedProviders && service.assignedProviders.length > 0) {
                  const matchedUsers = service.assignedProviders
                    .map(uid => allUsers.find(u => u.userUid === uid))
                    .filter(Boolean);
                  if (matchedUsers.length > 0) {
                    matchedUsers.forEach(u => {
                      assignedUsers.push({
                        userUid: u!.userUid,
                        userName: resolveUserName(u!.userUid, u!.userDisplayName || u!.displayName || u!.firstName, userMap),
                        price: timeWindow?.price ?? 0,
                        capacity: timeWindow?.slotCapacity ?? 1,
                      });
                    });
                  }
                }
                next[id] = assignedUsers;
              }
            });
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

      <LabelSelectorModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        selectedLabels={tags}
        onSave={setTags}
      />

      <Dialog
        open={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title="Customize Price and Slot Capacity"
        description="Customize the price and slot capacity for this provider within the selected time window."
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
