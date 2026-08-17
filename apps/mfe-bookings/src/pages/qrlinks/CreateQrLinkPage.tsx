import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, Input, Select, Button, Badge, Checkbox } from "@jaldee/design-system";
import { useQrLinks, type QrLink } from "../../services/useQrLinks";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import { useToast } from "../../contexts/ToastContext";
import type { Schedule, TimeWindow } from "../../types";
import DualListUsersModal from "../calendar/components/DualListUsersModal";

const QR_TYPE_OPTIONS = [
  { value: "CALENDAR", label: "Calendar" },
  { value: "SCHEDULE", label: "Schedule" },
  { value: "TIMEWINDOW", label: "Time Window" },
];

export default function CreateQrLinkPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const isEditing = !!uid;
  const { getById, create, update } = useQrLinks();
  const { calendars, searchSchedules, getCalendar, getSchedule, getTimeWindowDetails } = useCalendars();
  const { services: allServices } = useServices();
  const { users: allUsers } = useUsers();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "CALENDAR",
    calendarUid: "",
    scheduleUid: "",
    timeWindowUid: "",
    startDate: "",
    expiryDate: "",
    description: "",
  });

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);
  const hasInitializedEdit = useRef(false);

  useEffect(() => {
    if (isEditing && uid) {
      getById(uid).then((q) => {
        setForm({
          name: q.name ?? "",
          type: q.type ?? "CALENDAR",
          calendarUid: q.calendarUid ?? "",
          scheduleUid: q.schedules?.[0]?.uid ?? q.schedule?.[0] ?? "",
          timeWindowUid: q.timeWindows?.[0]?.uid ?? q.timeWindow?.[0] ?? "",
          startDate: q.startDate ?? "",
          expiryDate: q.expiryDate ?? "",
          description: q.description ?? "",
        });
        if (q.services) {
           const mapped = q.services.map(s => ({
             serviceUid: s.service?.uid,
             serviceName: s.service?.name,
             users: s.users?.map(u => {
               const matchedUser = allUsers.find(au => au.userUid === u.uid);
               return {
                 userUid: u.uid,
                 userName: matchedUser?.userDisplayName || matchedUser?.displayName || matchedUser?.firstName || u.uid
               };
             }) || []
           }));
           setCustomServices(mapped);
           hasInitializedEdit.current = true;
        }
      }).catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load QR Link");
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isEditing, uid, getById]);

  useEffect(() => {
    let active = true;
    if (!form.calendarUid) {
      setSchedules([]);
      return;
    }
    setLoadingSchedules(true);
    searchSchedules(form.calendarUid)
      .then(data => {
        if (active) setSchedules(data);
      })
      .catch(e => {
        console.error("Failed to load schedules", e);
      })
      .finally(() => {
        if (active) setLoadingSchedules(false);
      });
    return () => { active = false; };
  }, [form.calendarUid, searchSchedules]);

  const calendarOptions = useMemo(
    () => calendars.map((c) => ({ value: c.uid, label: c.name })),
    [calendars],
  );

  const scheduleOptions = useMemo(() => {
    return schedules.map(s => ({ value: s.uid, label: s.name }));
  }, [schedules]);

  const timeWindowOptions = useMemo(() => {
    const activeSchedule = schedules.find(s => s.uid === form.scheduleUid);
    const windows = activeSchedule?.timeWindows || [];
    return windows.map(w => ({ value: w.uid, label: `${w.startTime} - ${w.endTime}` }));
  }, [schedules, form.scheduleUid]);

  useEffect(() => {
    if (calendarOptions.length > 0) {
      if (!form.calendarUid || !calendarOptions.some(opt => opt.value === form.calendarUid)) {
        setForm(prev => ({ ...prev, calendarUid: calendarOptions[0].value }));
      }
    }
  }, [form.calendarUid, calendarOptions]);

  useEffect(() => {
    if (scheduleOptions.length > 0 && !loadingSchedules) {
      if (!form.scheduleUid || !scheduleOptions.some(opt => opt.value === form.scheduleUid)) {
        setForm(prev => ({ ...prev, scheduleUid: scheduleOptions[0].value }));
      }
    }
  }, [form.scheduleUid, scheduleOptions, loadingSchedules]);

  useEffect(() => {
    if (timeWindowOptions.length > 0 && !loadingSchedules) {
      if (!form.timeWindowUid || !timeWindowOptions.some(opt => opt.value === form.timeWindowUid)) {
        setForm(prev => ({ ...prev, timeWindowUid: timeWindowOptions[0].value }));
      }
    }
  }, [form.timeWindowUid, timeWindowOptions, loadingSchedules]);

  // Extract services and users to populate the mapping table
  const [mappedServices, setMappedServices] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function loadMappedServices() {
      try {
        let calendarData: any = null;
        let scheduleData: any = null;
        let twData: any = null;

        if (form.calendarUid) calendarData = await getCalendar(form.calendarUid).catch(() => null);
        if (form.calendarUid && form.scheduleUid) scheduleData = await getSchedule(form.calendarUid, form.scheduleUid).catch(() => null);
        if (form.timeWindowUid) twData = await getTimeWindowDetails(form.timeWindowUid).catch(() => null);

        let rawServices: any[] = [];
        if (form.type === "TIMEWINDOW") {
          rawServices = twData?.services && twData.services.length > 0 
            ? twData.services 
            : (scheduleData?.services && scheduleData.services.length > 0 
                ? scheduleData.services 
                : calendarData?.services || []);
        } else if (form.type === "SCHEDULE") {
          rawServices = scheduleData?.services && scheduleData.services.length > 0 
            ? scheduleData.services 
            : calendarData?.services || [];
        } else if (form.type === "CALENDAR") {
          rawServices = calendarData?.services || [];
        }

        if (!active) return;

        const calendarUserIds = Array.isArray(calendarData?.users) 
           ? calendarData.users.map((u: any) => typeof u === 'string' ? u : (u.userUid || u.uid || u.id)).filter(Boolean)
           : [];

        const servicesToMap = rawServices.map((svc: any) => {
          let serviceUid = "";
          let serviceName = "";
          if (typeof svc === "string") {
            serviceUid = svc;
            serviceName = allServices.find((s) => (s.uid ?? s.id) === svc)?.name || svc;
          } else {
            serviceUid = svc.serviceUid || svc.uid || svc.id;
            serviceName = svc.serviceName || svc.name || allServices.find((s) => (s.uid ?? s.id) === serviceUid)?.name || serviceUid;
          }

          let usersArray: any[] = [];
          if (typeof svc === "string" || !svc.users || svc.users.length === 0) {
            // Inherit from calendarUsers if no specific users array is provided
            usersArray = calendarUserIds.map((uId: string) => {
              const matchedUser = allUsers.find(au => au.userUid === uId);
              return {
                 userUid: uId,
                 userName: matchedUser?.userDisplayName || matchedUser?.displayName || matchedUser?.firstName || uId
              };
            });
          } else {
            usersArray = svc.users.map((u: any) => {
              const uId = typeof u === "string" ? u : (u.userUid || u.uid || u.id);
              const matchedUser = allUsers.find(au => au.userUid === uId);
              const uName = typeof u === "string" ? null : (u.userName || u.name || u.displayName);
              return { 
                 userUid: uId, 
                 userName: uName || matchedUser?.userDisplayName || matchedUser?.displayName || matchedUser?.firstName || uId
              };
            });
          }

          return { serviceUid, serviceName, users: usersArray };
        });
        
        setMappedServices(servicesToMap);
      } catch (e) {
        console.error("Failed to load services for mapping", e);
      }
    }

    loadMappedServices();
    
    return () => { active = false; };
  }, [form.type, form.scheduleUid, form.timeWindowUid, form.calendarUid, getCalendar, getSchedule, getTimeWindowDetails, allServices, allUsers]);

  useEffect(() => {
    if (isEditing && hasInitializedEdit.current) {
      hasInitializedEdit.current = false;
      return;
    }
    setCustomServices(JSON.parse(JSON.stringify(mappedServices)));
  }, [mappedServices, isEditing]);

  const handleDeleteService = (serviceUid: string) => {
    setCustomServices(prev => prev.filter(s => s.serviceUid !== serviceUid));
  };

  const activeCalendarName = calendars.find(c => c.uid === form.calendarUid)?.name;

  const save = async () => {
    if (!form.name.trim()) { showToast("Name is required", "error"); return; }
    if (!form.calendarUid) { showToast("Calendar is required", "error"); return; }
    
    setSaving(true);
    try {
      const payload: QrLink = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        calendarUid: form.calendarUid,
        calendarName: activeCalendarName,
        schedule: form.scheduleUid ? [form.scheduleUid] : undefined,
        timeWindow: form.timeWindowUid ? [form.timeWindowUid] : undefined,
        startDate: form.startDate || undefined,
        expiryDate: form.expiryDate || undefined,
        status: "Enabled",
        service: customServices.map(s => ({
          serviceUid: s.serviceUid,
          userUids: s.users?.length ? s.users.map((u: any) => u.userUid) : null
        })),
      };
      
      if (isEditing && uid) {
        await update(uid, payload);
        showToast("QR link updated", "success");
      } else {
        await create(payload);
        showToast("QR link created", "success");
      }
      navigate("/qr-links");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save QR link", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 overflow-y-auto">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 md:px-8 md:py-3 shadow-sm">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              {isEditing ? "Edit QR Link" : "New QR Links"}
              {activeCalendarName && (
                <Badge variant="primary" className="bg-indigo-600 text-white border-0 hover:bg-indigo-600 text-xs font-semibold px-2 py-0.5">
                  {activeCalendarName}
                </Badge>
              )}
            </div>
          }
          back={{ label: "Back to QR Links", href: "/qr-links" }}
          onNavigate={() => navigate("/qr-links")}
          variant="navigation"
          className="mb-0 !mx-0 !shadow-none !bg-transparent !p-0"
        />
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm flex flex-col gap-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <Input label="QR Link Name" placeholder="e.g. Dr. Smith's Morning Shift Link" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <Input type="date" label="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            <Input type="date" label="Expiry Date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            
            <Select label="Type" value={form.type} options={QR_TYPE_OPTIONS} onChange={(e) => setForm({ ...form, type: e.target.value, scheduleUid: "", timeWindowUid: "" })} />
            <Select label="Calendar" value={form.calendarUid} options={calendarOptions} onChange={(e) => setForm({ ...form, calendarUid: e.target.value, scheduleUid: "", timeWindowUid: "" })} />
            
            {(form.type === "SCHEDULE" || form.type === "TIMEWINDOW") && (
              <Select label="Schedule" value={form.scheduleUid} options={scheduleOptions} onChange={(e) => setForm({ ...form, scheduleUid: e.target.value, timeWindowUid: "" })} disabled={loadingSchedules} />
            )}
            
            {form.type === "TIMEWINDOW" && (
              <Select label="Time Window" value={form.timeWindowUid} options={timeWindowOptions} onChange={(e) => setForm({ ...form, timeWindowUid: e.target.value })} disabled={!form.scheduleUid} />
            )}
          </div>

          {mappedServices.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden mt-4">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">
                      <Checkbox 
                        checked={customServices.length > 0 && customServices.length === mappedServices.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomServices(JSON.parse(JSON.stringify(mappedServices)));
                          } else {
                            setCustomServices([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Services</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {mappedServices.map((baseSvc: any) => {
                    const isSelected = customServices.some(s => s.serviceUid === baseSvc.serviceUid);
                    const svc = customServices.find(s => s.serviceUid === baseSvc.serviceUid) || baseSvc;

                    return (
                      <tr key={baseSvc.serviceUid} className={!isSelected ? "opacity-60 bg-slate-50" : ""}>
                        <td className="px-4 py-4 w-12 text-center align-top">
                          <Checkbox 
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomServices([...customServices, baseSvc]);
                              } else {
                                setCustomServices(customServices.filter(s => s.serviceUid !== baseSvc.serviceUid));
                              }
                            }}
                          />
                        </td>
                        <td className={`px-4 py-4 font-medium align-top ${isSelected ? "text-indigo-700" : "text-slate-500"}`}>
                          {svc.serviceName || svc.serviceUid}
                        </td>
                        <td className="px-4 py-4 text-slate-600 align-top">
                          {svc.users && svc.users.length > 0 
                            ? svc.users.map((u: any) => u.userName || u.userUid).join(", ")
                            : "Any"}
                        </td>
                        <td className="px-4 py-4 text-right align-top whitespace-nowrap">
                          <button type="button" disabled={!isSelected} onClick={() => setUsersModalServiceId(svc.serviceUid)} className={`text-xs font-medium mr-3 ${isSelected ? 'text-indigo-600 hover:underline' : 'text-slate-400 cursor-not-allowed'}`}>Edit</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {usersModalServiceId && (
            <DualListUsersModal 
              isOpen={true}
              onClose={() => setUsersModalServiceId(null)}
              serviceName={customServices.find(s => s.serviceUid === usersModalServiceId)?.serviceName || ''}
              allUsers={
                mappedServices.find(s => s.serviceUid === usersModalServiceId)?.users?.map((u: any) => ({ id: u.userUid, name: u.userName })) || []
              }
              initialSelectedUsers={
                customServices.find(s => s.serviceUid === usersModalServiceId)?.users?.map((u: any) => ({ id: u.userUid, name: u.userName })) || []
              }
              onSave={(users) => {
                setCustomServices(prev => prev.map(s => {
                  if (s.serviceUid === usersModalServiceId) {
                    return {
                      ...s,
                      users: users.map((u: any) => ({ userUid: u.id, userName: u.name }))
                    };
                  }
                  return s;
                }));
                setUsersModalServiceId(null);
              }}
            />
          )}

          <div className="flex gap-4 pt-4 mt-2">
            <Button variant="secondary" onClick={() => navigate("/qr-links")} className="rounded-full px-8">Discard</Button>
            <Button variant="primary" onClick={save} disabled={saving} className="rounded-full bg-indigo-800 hover:bg-indigo-900 px-8">
              {saving ? "Generating..." : (isEditing ? "Update Link" : "Generate Link")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
