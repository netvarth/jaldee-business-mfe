import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, Switch, Dialog, DialogFooter, Input, Button, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { apiClient } from "@jaldee/api-client";

interface Schedule {
  id: string;
  userName: string;
  providerId: string;
  scheduleName: string;
  days: string;
  repeatIntervals: number[];
  timeSlot: string;
  dateRange: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: boolean;
}

interface IvrUserOption {
  value: string;
  label: string;
}

export default function IvrSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Form / Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "update">("create");
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formProviderId, setFormProviderId] = useState("");
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [formStartDate, setFormStartDate] = useState(() => getTodayDateString());
  const [formEndDate, setFormEndDate] = useState(() => getFutureDateString(5));

  // Meridian Time Picker States (AM/PM)
  const [formStartHour, setFormStartHour] = useState("09");
  const [formStartMin, setFormStartMin] = useState("00");
  const [formStartPeriod, setFormStartPeriod] = useState<"AM" | "PM">("AM");

  const [formEndHour, setFormEndHour] = useState("05");
  const [formEndMin, setFormEndMin] = useState("00");
  const [formEndPeriod, setFormEndPeriod] = useState<"AM" | "PM">("PM");

  const [ivrUsers, setIvrUsers] = useState<IvrUserOption[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  const fallbackSchedules: Schedule[] = [
    { id: "1", userName: "Balu K", providerId: "1", scheduleName: "Balu's schedule", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "09:00 AM - 10:00 AM", dateRange: "30/07/2025 - 20/11/2029", startDate: "2025-07-30", endDate: "2029-11-20", status: false },
    { id: "2", userName: "Beena K", providerId: "2", scheduleName: "Beena's schedule", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "09:00 AM - 08:00 PM", dateRange: "03/07/2025 - 10/05/2028", startDate: "2025-07-03", endDate: "2028-05-10", status: true },
    { id: "3", userName: "Remesh K", providerId: "3", scheduleName: "Remesh's schedule", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "02:00 PM - 06:00 PM", dateRange: "30/07/2025 - 02/05/2029", startDate: "2025-07-30", endDate: "2029-05-02", status: false },
    { id: "4", userName: "Reshma Mohan", providerId: "4", scheduleName: "Reshma's schedule", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "12:00 PM - 04:00 PM", dateRange: "27/04/2026 - 01/05/2029", startDate: "2026-04-27", endDate: "2029-05-01", status: false },
    { id: "5", userName: "Sachin S", providerId: "5", scheduleName: "Sachin", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "10:00 AM - 07:00 PM", dateRange: "11/08/2023 - 31/12/2026", startDate: "2023-08-11", endDate: "2026-12-31", status: true },
    { id: "6", userName: "Sanoop as", providerId: "6", scheduleName: "Sanoop", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "10:00 AM - 08:00 PM", dateRange: "12/01/2024 - 07/04/2027", startDate: "2024-01-12", endDate: "2027-04-07", status: false },
    { id: "7", userName: "Yedu Kondalu", providerId: "7", scheduleName: "Test", days: "Sun,Mon,Tue,Wed,Thu,Fri,Sat", repeatIntervals: [1,2,3,4,5,6,7], timeSlot: "01:00 PM - 11:30 PM", dateRange: "30/07/2025 - 30/11/2025", startDate: "2025-07-30", endDate: "2025-11-30", status: false }
  ];

  const daysOfWeek = [
    { name: "Sun", value: 1 },
    { name: "Mon", value: 2 },
    { name: "Tue", value: 3 },
    { name: "Wed", value: 4 },
    { name: "Thu", value: 5 },
    { name: "Fri", value: 6 },
    { name: "Sat", value: 7 }
  ];

  // Options for custom AM/PM Timepicker
  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
  }, []);

  function getTodayDateString() {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }

  function getFutureDateString(yearsAhead: number) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsAhead);
    return d.toISOString().split("T")[0];
  }

  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const res = await apiClient.get("provider/ivr/users", { params: { "extension-ge": 0 } });
      const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []);
      if (rawList.length > 0) {
        const mappedUsers = rawList.map((u: any) => ({
          value: String(u.id || u.userId || u.uid || ""),
          label: String(u.userName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Agent")
        }));
        setIvrUsers(mappedUsers);
        if (mappedUsers.length > 0) {
          setFormProviderId(mappedUsers[0].value);
        }
      } else {
        // Fallback options
        const fallbackUsers = fallbackSchedules.map((s) => ({ value: s.providerId, label: s.userName }));
        setIvrUsers(fallbackUsers);
        setFormProviderId(fallbackUsers[0].value);
      }
    } catch (e) {
      console.error("Failed to load IVR users list", e);
      const fallbackUsers = fallbackSchedules.map((s) => ({ value: s.providerId, label: s.userName }));
      setIvrUsers(fallbackUsers);
      setFormProviderId(fallbackUsers[0].value);
    } finally {
      setUserLoading(false);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("provider/schedule");
      const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []);
      if (rawList.length > 0) {
        const mapped: Schedule[] = rawList.map((s: any) => {
          const repeatIntervals = s.scheduleTime?.repeatIntervals || [];
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const daysStr = repeatIntervals.length > 0 
            ? repeatIntervals.map((i: number) => dayNames[i - 1]).filter(Boolean).join(",") 
            : "Sun,Mon,Tue,Wed,Thu,Fri,Sat";

          const sTime = s.scheduleTime?.timeSlots?.[0]?.sTime || "09:00 AM";
          const eTime = s.scheduleTime?.timeSlots?.[0]?.eTime || "05:00 PM";
          const formattedTimeSlot = `${sTime} - ${eTime}`;

          const startDate = s.scheduleTime?.startDate || getTodayDateString();
          const endDate = s.scheduleTime?.terminator?.endDate || getFutureDateString(5);
          const formattedDateRange = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;

          return {
            id: String(s.id || Math.random().toString()),
            userName: s.providerName || s.userName || findUserName(s.providerId),
            providerId: String(s.providerId || ""),
            scheduleName: s.name || "Custom schedule",
            days: daysStr,
            repeatIntervals: repeatIntervals,
            timeSlot: formattedTimeSlot,
            dateRange: formattedDateRange,
            startDate: startDate,
            endDate: endDate,
            status: s.scheduleState === "ENABLED" || s.state === "ENABLED" || s.status === "ENABLED" || s.status === true
          };
        });
        setSchedules(mapped);
      } else {
        setSchedules(fallbackSchedules);
      }
    } catch (e) {
      console.error("Failed to load callback schedules", e);
      setSchedules(fallbackSchedules);
    } finally {
      setLoading(false);
    }
  };

  function findUserName(id: string): string {
    const userObj = ivrUsers.find((u) => u.value === id);
    if (userObj) return userObj.label;
    const matchFallback = fallbackSchedules.find((s) => s.providerId === id);
    return matchFallback ? matchFallback.userName : "Agent";
  }

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  const handleToggleStatus = async (id: string, nextStatus: boolean) => {
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, status: nextStatus } : s));
    try {
      const statusString = nextStatus ? "ENABLED" : "DISABLED";
      await apiClient.put(`provider/schedule/${statusString}/${id}`);
    } catch (e) {
      console.error("Failed to toggle schedule status", e);
      alert("Failed to update status. Reverting change.");
      setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, status: !nextStatus } : s));
    }
  };

  const handleCreateOpen = () => {
    setDialogMode("create");
    setEditScheduleId(null);
    setFormName("");
    if (ivrUsers.length > 0) {
      setFormProviderId(ivrUsers[0].value);
    }
    setFormDays([1, 2, 3, 4, 5, 6, 7]);
    setFormStartDate(getTodayDateString());
    setFormEndDate(getFutureDateString(5));
    
    // Default Start Time: 09:00 AM
    setFormStartHour("09");
    setFormStartMin("00");
    setFormStartPeriod("AM");

    // Default End Time: 05:00 PM
    setFormEndHour("05");
    setFormEndMin("00");
    setFormEndPeriod("PM");

    setIsDialogOpen(true);
  };

  const handleUpdateOpen = (schedule: Schedule) => {
    setDialogMode("update");
    setEditScheduleId(schedule.id);
    setFormName(schedule.scheduleName);
    setFormProviderId(schedule.providerId);
    setFormDays(schedule.repeatIntervals.length > 0 ? schedule.repeatIntervals : [1, 2, 3, 4, 5, 6, 7]);
    setFormStartDate(schedule.startDate);
    setFormEndDate(schedule.endDate);

    // Parse existing timeSlot "09:00 AM - 10:00 AM"
    const times = schedule.timeSlot.split(" - ");
    const startParts = parse12HourTime(times[0]);
    setFormStartHour(startParts.hour);
    setFormStartMin(startParts.minute);
    setFormStartPeriod(startParts.period);

    const endParts = parse12HourTime(times[1]);
    setFormEndHour(endParts.hour);
    setFormEndMin(endParts.minute);
    setFormEndPeriod(endParts.period);

    setIsDialogOpen(true);
  };

  // Helper to parse "09:00 AM" into individual parts
  function parse12HourTime(time12: string) {
    if (!time12) return { hour: "09", minute: "00", period: "AM" as const };
    try {
      const parts = time12.trim().split(/\s+/);
      if (parts.length < 2) return { hour: "09", minute: "00", period: "AM" as const };
      const [time, ampm] = parts;
      const [h, m] = time.split(":");
      return {
        hour: String(parseInt(h, 10) || 12).padStart(2, "0"),
        minute: String(parseInt(m, 10) || 0).padStart(2, "0"),
        period: (ampm.toUpperCase() === "PM" ? "PM" : "AM") as "AM" | "PM"
      };
    } catch {
      return { hour: "09", minute: "00", period: "AM" as const };
    }
  }

  const toggleDaySelection = (dayVal: number) => {
    setFormDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal].sort()
    );
  };

  const handleSelectAllToggle = () => {
    if (formDays.length === 7) {
      setFormDays([]);
    } else {
      setFormDays([1, 2, 3, 4, 5, 6, 7]);
    }
  };

  const handleSaveSchedule = async () => {
    if (!formName.trim()) {
      alert("Please enter a schedule name.");
      return;
    }
    if (!formProviderId) {
      alert("Please select a user.");
      return;
    }
    if (formDays.length === 0) {
      alert("Please select at least one day.");
      return;
    }

    // Build standard 12-hour "hh:mm AM/PM" strings
    const finalStartTime = `${formStartHour}:${formStartMin} ${formStartPeriod}`;
    const finalEndTime = `${formEndHour}:${formEndMin} ${formEndPeriod}`;

    const payload = {
      name: formName,
      scheduleTime: {
        recurringType: "Weekly",
        repeatIntervals: formDays,
        startDate: formStartDate,
        terminator: {
          endDate: formEndDate,
          noOfOccurance: ""
        },
        timeSlots: [
          {
            sTime: finalStartTime,
            eTime: finalEndTime
          }
        ]
      },
      scheduleState: "ENABLED",
      providerId: formProviderId
    };

    setLoading(true);
    setIsDialogOpen(false);

    try {
      if (dialogMode === "create") {
        await apiClient.post("provider/schedule", payload);
        alert("Schedule created successfully!");
      } else {
        const updatePayload = { ...payload, id: editScheduleId };
        await apiClient.put("provider/schedule", updatePayload);
        alert("Schedule updated successfully!");
      }
      fetchSchedules();
    } catch (e) {
      console.error("Failed to save schedule", e);
      alert("Failed to save schedule. Reverting changes.");
      fetchSchedules();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    try {
      await apiClient.delete(`provider/schedule/${id}`);
      alert("Schedule deleted successfully!");
    } catch (e) {
      console.error("Failed to delete schedule", e);
      alert("Failed to delete schedule. Refreshing list.");
      fetchSchedules();
    }
  };

  const columns: ColumnDef<Schedule>[] = [
    {
      key: "userName",
      header: "User",
      render: (row) => <span className="font-medium text-[var(--color-text-primary)]">{row.userName}</span>
    },
    {
      key: "scheduleName",
      header: "Name",
      render: (row) => <span className="text-[var(--color-text-secondary)]">{row.scheduleName}</span>
    },
    {
      key: "days",
      header: "Days",
      render: (row) => <span className="text-[var(--color-text-secondary)] text-xs tracking-tight">{row.days}</span>
    },
    {
      key: "timeSlot",
      header: "Start Time - End Time",
      render: (row) => <span className="text-[var(--color-text-primary)] font-medium">{row.timeSlot}</span>
    },
    {
      key: "dateRange",
      header: "Start Date - End Date",
      render: (row) => <span className="text-[var(--color-text-secondary)] font-medium">{row.dateRange}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} data-testid={`schedule-status-container-${row.id}`}>
          <Switch
            checked={row.status}
            onChange={(nextVal) => handleToggleStatus(row.id, nextVal)}
          />
        </div>
      )
    },
    {
      key: "actions",
      header: "More Actions",
      align: "left",
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleUpdateOpen(row)} 
            className="bg-blue-900 hover:bg-blue-800 text-white rounded px-3 py-1.5 text-xs font-bold transition-colors shadow-xs"
            data-testid={`schedule-action-update-${row.id}`}
          >
            Update
          </button>
          <button 
            onClick={() => handleDelete(row.id)} 
            className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1.5 text-xs font-bold transition-colors shadow-xs"
            data-testid={`schedule-action-delete-${row.id}`}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="shell-home" data-testid="ivr-schedules">
      <PageHeader
        title="Schedules"
        back={{ label: "Back", href: "/ivr" }}
        onNavigate={navigate}
        actions={
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCreateOpen} 
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm px-5 py-2 rounded flex items-center gap-1.5 shadow-sm transition-colors"
              data-testid="schedule-create-button"
            >
              <span className="text-lg leading-none font-semibold">+</span> Create
            </button>
            <button className="text-purple-700 hover:text-purple-900 transition-colors" title="Filter list">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
            </button>
          </div>
        }
      />

      <div className="mt-4">
        <DataTable
          data={schedules}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: pageSize,
            total: schedules.length,
            page: currentPage,
            onChange: setCurrentPage,
          }}
          tableClassName="min-w-full"
        />
      </div>

      {/* Create / Edit Schedule Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={dialogMode === "create" ? "Create Schedule" : "Update Schedule"}
        size="lg"
        bodyClassName="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input 
            label="Schedule Name" 
            placeholder="e.g. Balu's general schedule" 
            value={formName} 
            onChange={(e) => setFormName(e.target.value)}
            id="schedule-form-name"
            data-testid="schedule-form-name"
          />

          <div className="flex flex-col gap-1.5">
            <label className="ds-form-label" htmlFor="schedule-form-user">User</label>
            <Select
              id="schedule-form-user"
              data-testid="schedule-form-user"
              value={formProviderId}
              onChange={(e) => setFormProviderId(e.target.value)}
              options={ivrUsers}
              disabled={userLoading}
            />
          </div>
        </div>

        {/* Days of Week Selectors with Select All */}
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex justify-between items-center">
            <label className="ds-form-label font-semibold text-gray-800">Repeat Days</label>
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="text-xs font-bold text-blue-900 hover:underline transition-all"
              data-testid="schedule-form-select-all"
            >
              {formDays.length === 7 ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {daysOfWeek.map((day) => {
              const isSelected = formDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDaySelection(day.value)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm border ${
                    isSelected
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                  data-testid={`schedule-form-day-btn-${day.name.toLowerCase()}`}
                >
                  {day.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom AM/PM Timepicker Grid */}
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {/* Start Time Selectors */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-form-label font-semibold text-gray-700">Start Time</label>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <Select
                  value={formStartHour}
                  onChange={(e) => setFormStartHour(e.target.value)}
                  options={hourOptions.map((h) => ({ value: h, label: h }))}
                />
              </div>
              <span className="text-gray-400 font-bold">:</span>
              <div className="w-20">
                <Select
                  value={formStartMin}
                  onChange={(e) => setFormStartMin(e.target.value)}
                  options={minuteOptions.map((m) => ({ value: m, label: m }))}
                />
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden h-10 ml-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setFormStartPeriod("AM")}
                  className={`px-3 font-bold text-xs transition-colors ${
                    formStartPeriod === "AM" ? "bg-blue-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setFormStartPeriod("PM")}
                  className={`px-3 font-bold text-xs transition-colors ${
                    formStartPeriod === "PM" ? "bg-blue-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* End Time Selectors */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-form-label font-semibold text-gray-700">End Time</label>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <Select
                  value={formEndHour}
                  onChange={(e) => setFormEndHour(e.target.value)}
                  options={hourOptions.map((h) => ({ value: h, label: h }))}
                />
              </div>
              <span className="text-gray-400 font-bold">:</span>
              <div className="w-20">
                <Select
                  value={formEndMin}
                  onChange={(e) => setFormEndMin(e.target.value)}
                  options={minuteOptions.map((m) => ({ value: m, label: m }))}
                />
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden h-10 ml-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setFormEndPeriod("AM")}
                  className={`px-3 font-bold text-xs transition-colors ${
                    formEndPeriod === "AM" ? "bg-blue-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setFormEndPeriod("PM")}
                  className={`px-3 font-bold text-xs transition-colors ${
                    formEndPeriod === "PM" ? "bg-blue-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <div className="flex flex-col gap-1.5">
            <Input
              label="Start Date"
              type="date"
              id="schedule-form-start-date"
              data-testid="schedule-form-start-date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Input
              label="End Date"
              type="date"
              id="schedule-form-end-date"
              data-testid="schedule-form-end-date"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsDialogOpen(false)} data-testid="schedule-form-cancel">
            Cancel
          </Button>
          <Button onClick={handleSaveSchedule} data-testid="schedule-form-save">
            {dialogMode === "create" ? "Create Schedule" : "Save Changes"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
