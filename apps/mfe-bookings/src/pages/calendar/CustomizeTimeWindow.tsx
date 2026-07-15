import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button, PageHeader, Badge, Checkbox, Dialog, DialogFooter, Input } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useToast } from "../../contexts/ToastContext";
import { useBookingApi } from "../../services/useBookingApi";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import DualListServicesModal from "./components/DualListServicesModal";
import DualListUsersModal from "./components/DualListUsersModal";

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

function normalizeList(values: unknown[] | undefined, fallbackKeys: string[] = ["name", "displayName", "label", "title", "uid", "id", "userUid"]) {
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

const colors = [
  "bg-cyan-100 text-cyan-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700"
];

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CustomizeTimeWindow() {
  const { calendarUid, scheduleUid, timeWindowUid } = useParams<{ calendarUid: string, scheduleUid: string, timeWindowUid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { calendars } = useCalendars();
  const { services: allServices } = useServices();
  const { users: allUsers } = useUsers();
  const api = useBookingApi();

  const calendar = location.state?.calendar || calendars.find(c => c.uid === calendarUid);
  const schedule = location.state?.schedule || calendar?.schedules?.find((s: any) => s.uid === scheduleUid);
  const timeWindow = location.state?.timeWindow || schedule?.timeWindows?.find((tw: any) => tw.uid === timeWindowUid);

  const [saving, setSaving] = useState(false);
  const [customizationData, setCustomizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);

  const [selectedChannels, setSelectedChannels] = useState<string[]>(["ONLINE"]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    normalizeList(calendar?.services as unknown[], ["uid", "id"]) as string[]
  );

  const serviceMap = useMemo(() => new Map(allServices.map(s => [s.uid || s.id, s])), [allServices]);
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.userUid, u])), [allUsers]);

  const defaultAssignedUsers = useMemo(() => {
    const rawUsers = Array.isArray(calendar?.users) ? calendar.users : [];
    return rawUsers.map((u: any) => typeof u === 'string' ? u : (u?.userUid || u?.uid || u?.id)).filter(Boolean);
  }, [calendar?.users]);

  const [serviceUsersMapping, setServiceUsersMapping] = useState<Record<string, string[]>>({});
  const [userConfigs, setUserConfigs] = useState<Record<string, { price: string, capacity: string }>>({});
  const [editingUser, setEditingUser] = useState<{ serviceId: string, userId: string, name: string, initials: string, color: string, price: string, capacity: string } | null>(null);

  const displayServices = useMemo(() => {
    return selectedServiceIds.map(sId => {
      const service = serviceMap.get(sId);
      const assignedUserIds = serviceUsersMapping[sId] ?? defaultAssignedUsers;
      
      const assignedUsers = assignedUserIds.map((uId, idx) => {
        const userProfile = userMap.get(uId);
        const name = userProfile?.displayName || userProfile?.firstName || uId || "Unknown User";
        const config = userConfigs[`${sId}_${uId}`] || { price: "300", capacity: "1" };
        
        return {
          id: uId,
          name,
          initials: getInitials(name),
          color: colors[idx % colors.length],
          price: config.price,
          capacity: config.capacity
        };
      }).filter(u => u.id);

      return {
        id: sId,
        name: service?.name || sId,
        users: assignedUsers
      };
    });
  }, [selectedServiceIds, serviceUsersMapping, defaultAssignedUsers, serviceMap, userMap]);

  const channelsList = [
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
    }
  ];

  useEffect(() => {
    let cancelled = false;
    async function fetchCustomization() {
      try {
        setLoading(true);
        const res = await api.get(`/calendars/schedules/time-windows/${timeWindowUid}/customization`);
        if (!cancelled && res) {
          setCustomizationData(res);
        }
      } catch (err) {
        console.warn("Failed to fetch customization", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (timeWindowUid) fetchCustomization();
    return () => { cancelled = true; };
  }, [timeWindowUid, api]);

  const handleSave = async () => {
    setSaving(true);
    try {
      setTimeout(() => {
        setSaving(false);
        showToast("Time window customizations saved successfully", "success");
        navigate(-1);
      }, 600);
    } catch (err) {
      setSaving(false);
      showToast("Failed to save customizations", "error");
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-[#f6f7fb]">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <PageHeader
          title="Customize"
          subtitle="Configure booking channels, labels, and services for this time window."
          back={{ label: "Back to calendar", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          actions={calendar?.name ? <Badge variant="primary">{calendar.name}</Badge> : undefined}
        />

        <section className="mt-8 rounded-xl border border-[#E8EAF3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:p-8">
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-[30px]">
                Customize Your Timewindow
              </h1>
              <p className="mt-2 text-[15px] text-slate-500">
                Applicable to selected schedule and timewindow in this calendar
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-4">
            <div>
              <div className="text-sm text-slate-500 mb-1.5 font-medium">Schedule</div>
              <div
                className="inline-flex h-9 items-center rounded-full border border-[#7c3aed] px-4 text-sm font-semibold"
                style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}
              >
                {schedule?.name || "Morning Schedule"}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1.5 font-medium">Time Window</div>
              <div
                className="inline-flex h-9 items-center rounded-full border border-[#7c3aed] px-4 text-sm font-semibold"
                style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}
              >
                {timeWindow ? `${timeWindow.startTime} - ${timeWindow.endTime}` : "M,T,W,T,F (09:00 AM - 11:00 AM)"}
              </div>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-[22px] font-semibold text-slate-900">Booking Channel Setup</h2>
            <p className="mt-2 text-sm text-slate-500">
              Configure which channels customers can use to book appointments for this time window.
            </p>

            <div className="mt-5 space-y-5">
              {channelsList.map((channel) => {
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
              <span className="inline-flex h-[34px] items-center gap-2 rounded-2xl border border-[#E3E5EE] bg-[#F5F6FA] px-4 text-sm font-medium text-slate-700">
                Friends
              </span>
              <span className="inline-flex h-[34px] items-center gap-2 rounded-2xl border border-[#E3E5EE] bg-[#F5F6FA] px-4 text-sm font-medium text-slate-700">
                VIP
              </span>
              <button
                type="button"
                className="inline-flex h-[34px] items-center rounded-2xl px-3 text-sm font-semibold text-[#7c3aed] transition hover:bg-[#f5f3ff]"
              >
                + Add Label
              </button>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-[22px] font-semibold text-slate-900">Service User Assignment</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Customize which doctors are assigned to each service
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
                displayServices.map(service => (
                  <div key={service.id} className="border-b border-[#E8EAF3] pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900">{service.name}</h4>
                      <button type="button" onClick={() => setUsersModalServiceId(service.id)} className="text-sm font-semibold text-[#7c3aed] hover:underline">Edit Users</button>
                    </div>
                    <div className="text-sm text-slate-500 mb-3">Assigned Users</div>
                    <div className="flex flex-wrap gap-4">
                      {service.users.length ? (
                        service.users.map(user => (
                          <div key={user.id} className="flex items-center gap-3 rounded-xl border border-[#E3E5EE] p-3 bg-[#f7f8fc] pr-4 min-w-[260px]">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.color}`}>
                              {user.initials}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
                              <div className="text-xs text-slate-500 font-medium mt-1">
                                Price: ₹{user.price} &nbsp; Capacity:{user.capacity}
                              </div>
                            </div>
                            <button type="button" onClick={() => setEditingUser({ serviceId: service.id, userId: user.id, name: user.name, initials: user.initials, color: user.color, price: user.price, capacity: user.capacity })} className="p-2 text-slate-400 hover:text-[#7c3aed] hover:bg-[#f5f3ff] rounded-lg transition-colors">
                              <EditIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-400 italic py-2">No users assigned to this service.</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                  No services have been mapped to this time window yet.
                </div>
              )}
            </div>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={() => navigate(-1)}
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

        </section>
      </div>
      
      <DualListServicesModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        allServices={allServices}
        initialSelectedServices={allServices.filter(s => selectedServiceIds.includes(s.uid ?? s.id ?? ""))}
        onSave={(selected) => {
          setSelectedServiceIds(selected.map((s) => s.uid ?? s.id ?? ""));
          setIsServicesModalOpen(false);
        }}
      />

      <DualListUsersModal
        isOpen={usersModalServiceId !== null}
        onClose={() => setUsersModalServiceId(null)}
        serviceName={displayServices.find(s => s.id === usersModalServiceId)?.name || "this service"}
        allUsers={allUsers.map(u => ({ id: u.userUid, name: u.displayName || u.firstName || "Unknown", role: u.designation || "Practitioner" }))}
        initialSelectedUsers={(serviceUsersMapping[usersModalServiceId!] ?? defaultAssignedUsers).map(uId => {
          const u = userMap.get(uId);
          return { id: uId, name: u?.displayName || u?.firstName || "Unknown", role: u?.designation || "Practitioner" };
        })}
        onSave={(selected) => {
          if (usersModalServiceId) {
            setServiceUsersMapping(prev => ({ ...prev, [usersModalServiceId]: selected.map(s => s.id) }));
          }
          setUsersModalServiceId(null);
        }}
      />

      <Dialog 
        open={editingUser !== null} 
        onClose={() => setEditingUser(null)}
        title="Customize Price and Slot Capacity"
        description="You can customize the price and Slot capacity for each time slot."
        className="max-w-[460px]"
      >
        <div className="p-6 pt-0 space-y-6">
          {editingUser && (
            <div className="flex items-center gap-3 rounded-xl border border-[#E3E5EE] p-3 min-w-[260px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${editingUser.color}`}>
                {editingUser.initials}
              </div>
              <div className="text-sm font-medium text-slate-900">{editingUser.name}</div>
            </div>
          )}
          
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Price</label>
            <Input 
              type="number"
              value={editingUser?.price || ""}
              onChange={(e) => setEditingUser(prev => prev ? { ...prev, price: e.target.value } : null)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Slot Capacity</label>
            <Input 
              type="number"
              value={editingUser?.capacity || ""}
              onChange={(e) => setEditingUser(prev => prev ? { ...prev, capacity: e.target.value } : null)}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            className="!bg-[#31028C] hover:!bg-[#230166] text-white"
            onClick={() => {
              if (editingUser) {
                setUserConfigs(prev => ({ ...prev, [`${editingUser.serviceId}_${editingUser.userId}`]: { price: editingUser.price, capacity: editingUser.capacity } }));
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
