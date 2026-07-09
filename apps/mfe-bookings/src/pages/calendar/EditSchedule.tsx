import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  TimePicker,
} from "@jaldee/design-system";
import { useCalendars, type CreateSchedulePayload, type CreateTimeWindowPayload } from "../../services/useCalendars";
import { useToast } from "../../contexts/ToastContext";
import type { Calendar, Schedule, TimeWindow } from "../../types";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 Minutes" },
  { value: "20", label: "20 Minutes" },
  { value: "30", label: "30 Minutes" },
  { value: "45", label: "45 Minutes" },
  { value: "60", label: "60 Minutes" },
];

interface EditableTimeWindow {
  uid?: string;
  tempId: string;
  weekDays: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  qrLinkRequired: boolean;
}

function normalizeTimeValue(value?: string) {
  if (!value) return "";
  if (value.includes("T")) {
    const [, time] = value.split("T");
    return time.slice(0, 5);
  }
  return value.slice(0, 5);
}

function toEditableTimeWindow(timeWindow: TimeWindow, index: number): EditableTimeWindow {
  return {
    uid: timeWindow.uid,
    tempId: timeWindow.uid ?? `existing-${index}`,
    weekDays: [...(timeWindow.weekDays ?? [])],
    startTime: normalizeTimeValue(timeWindow.startTime),
    endTime: normalizeTimeValue(timeWindow.endTime),
    slotDuration: Number(timeWindow.slotDuration) || 30,
    qrLinkRequired: Boolean(timeWindow.qrLinkRequired),
  };
}

function createNewTimeWindow(): EditableTimeWindow {
  const stamp = Date.now();
  return {
    tempId: `new-${stamp}`,
    weekDays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
    qrLinkRequired: true,
  };
}

function parseMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const startA = parseMinutes(aStart);
  const endA = parseMinutes(aEnd);
  const startB = parseMinutes(bStart);
  const endB = parseMinutes(bEnd);
  if (startA == null || endA == null || startB == null || endB == null) return false;
  return startA < endB && startB < endA;
}

function formatTimeWindowPayload(
  calendar: Calendar,
  scheduleUid: string,
  scheduleName: string,
  timeWindow: EditableTimeWindow,
): CreateTimeWindowPayload {
  return {
    uid: timeWindow.uid,
    calendarUid: calendar.uid,
    calendarName: calendar.name,
    scheduleUid,
    scheduleName,
    weekDays: [...timeWindow.weekDays].sort((a, b) => a - b),
    startTime: timeWindow.startTime,
    endTime: timeWindow.endTime,
    slotDuration: Number(timeWindow.slotDuration) || 0,
    slotCapacity: 0,
    channel: "WALK_IN",
    label: [],
    qrLinkRequired: timeWindow.qrLinkRequired,
  };
}

export default function EditSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ calendarUid: string; scheduleUid: string }>();
  const { showToast } = useToast();
  const initialCalendar = (location.state as { calendar?: Calendar; schedule?: Schedule } | null)?.calendar ?? null;
  const initialSchedule = (location.state as { calendar?: Calendar; schedule?: Schedule } | null)?.schedule ?? null;
  const calendarUid = params.calendarUid ?? initialCalendar?.uid ?? "";
  const scheduleUid = params.scheduleUid ?? initialSchedule?.uid ?? "";
  const { getCalendar, getSchedule, updateSchedule } = useCalendars();

  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar);
  const [loading, setLoading] = useState(Boolean(calendarUid && scheduleUid));
  const [saving, setSaving] = useState(false);
  const [scheduleName, setScheduleName] = useState(initialSchedule?.name ?? "");
  const [startDate, setStartDate] = useState(initialSchedule?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialSchedule?.endDate ?? "");
  const [timeWindows, setTimeWindows] = useState<EditableTimeWindow[]>(
    initialSchedule?.timeWindows?.map(toEditableTimeWindow) ?? [],
  );
  const [confirmDelete, setConfirmDelete] = useState<EditableTimeWindow | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarUid || !scheduleUid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      try {
        const [calendarData, scheduleData] = await Promise.all([
          getCalendar(calendarUid),
          getSchedule(calendarUid, scheduleUid),
        ]);
        if (cancelled) return;
        setCalendar(calendarData);
        if (scheduleData) {
          setScheduleName(scheduleData.name ?? "");
          setStartDate(scheduleData.startDate ?? "");
          setEndDate(scheduleData.endDate ?? "");
          setTimeWindows((scheduleData.timeWindows ?? []).map(toEditableTimeWindow));
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Failed to load schedule.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar, getSchedule, scheduleUid, showToast]);

  const hasOverlaps = useMemo(() => {
    for (let i = 0; i < timeWindows.length; i += 1) {
      for (let j = i + 1; j < timeWindows.length; j += 1) {
        const a = timeWindows[i];
        const b = timeWindows[j];
        const sharedDays = a.weekDays.filter((day) => b.weekDays.includes(day));
        if (sharedDays.length && rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
          return true;
        }
      }
    }
    return false;
  }, [timeWindows]);

  const updateTimeWindowField = (tempId: string, patch: Partial<EditableTimeWindow>) => {
    setTimeWindows((current) =>
      current.map((timeWindow) =>
        timeWindow.tempId === tempId ? { ...timeWindow, ...patch } : timeWindow,
      ),
    );
  };

  const toggleWeekday = (tempId: string, day: number, checked: boolean) => {
    setTimeWindows((current) =>
      current.map((timeWindow) => {
        if (timeWindow.tempId !== tempId) return timeWindow;
        const nextDays = checked
          ? Array.from(new Set([...timeWindow.weekDays, day])).sort((a, b) => a - b)
          : timeWindow.weekDays.filter((item) => item !== day);
        return { ...timeWindow, weekDays: nextDays };
      }),
    );
  };

  const removeTimeWindow = (timeWindow: EditableTimeWindow) => {
    if (!timeWindow.uid) {
      setTimeWindows((current) => current.filter((item) => item.tempId !== timeWindow.tempId));
      return;
    }
    setConfirmDelete(timeWindow);
  };

  const validate = () => {
    if (!scheduleName.trim()) {
      showToast("Schedule name is required.", "error");
      return false;
    }
    if (!startDate) {
      showToast("Schedule start date is required.", "error");
      return false;
    }
    if (!timeWindows.length) {
      showToast("Add at least one time window before updating.", "error");
      return false;
    }
    for (const timeWindow of timeWindows) {
      if (!timeWindow.weekDays.length) {
        showToast("Each time window needs at least one weekday.", "error");
        return false;
      }
      if (!timeWindow.startTime || !timeWindow.endTime) {
        showToast("Start time and end time are required for each time window.", "error");
        return false;
      }
      const startMinutes = parseMinutes(timeWindow.startTime);
      const endMinutes = parseMinutes(timeWindow.endTime);
      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        showToast("End time must be later than start time.", "error");
        return false;
      }
      if (!timeWindow.slotDuration) {
        showToast("Slot duration is required for each time window.", "error");
        return false;
      }
    }
    if (hasOverlaps) {
      showToast("Time windows cannot overlap on the same weekdays.", "error");
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!calendar || !calendarUid || !scheduleUid) return;
    if (!validate()) return;
    setSaving(true);
    setOverlapError(null);
    try {
      const schedulePayload: CreateSchedulePayload = {
        uid: scheduleUid,
        name: scheduleName.trim(),
        description: initialSchedule?.description ?? "",
        calendarUid: calendar.uid,
        calendarName: calendar.name,
        startDate,
        endDate: endDate || startDate,
        slotCapacity: 0,
        qrLinkRequired: initialSchedule?.qrLinkRequired ?? true,
        timeWindows: timeWindows.map((timeWindow) => formatTimeWindowPayload(calendar, scheduleUid, scheduleName.trim(), timeWindow)),
      };
      await updateSchedule(scheduleUid, schedulePayload);
      navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update schedule.";
      if (msg.toLowerCase().includes("overlap") || (error as any)?.code === "OVERLAP_ERROR") {
        setOverlapError(msg);
      } else {
        showToast(msg, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main data-testid="bookings-edit-schedule-page" className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Edit Schedule"
          back={{ label: "Back to calendar details", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
        />

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading schedule...
          </div>
        ) : (
          <form
            data-testid="bookings-edit-schedule-form"
            className="mt-6 space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  id="edit-schedule-name"
                  data-testid="bookings-edit-schedule-name"
                  label="Schedule Name"
                  required
                  value={scheduleName}
                  onChange={(event) => setScheduleName(event.target.value)}
                />
                <Input
                  id="edit-schedule-start"
                  data-testid="bookings-edit-schedule-start"
                  type="date"
                  label="Start Date"
                  required
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <Input
                  id="edit-schedule-end"
                  data-testid="bookings-edit-schedule-end"
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Time Windows</h2>
                  <p className="mt-1 text-sm text-slate-500">Configure weekdays, working hours, and slot duration.</p>
                </div>
              </div>
              {overlapError && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                  <span className="font-semibold">Overlap Error: </span> {overlapError}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {timeWindows.length ? (
                  timeWindows.map((timeWindow, index) => (
                    <div key={timeWindow.tempId} className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Time Window {index + 1}</h3>
                          <p className="mt-1 text-xs text-slate-500">Set weekdays, working hours, and slot duration.</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={<span aria-hidden="true">×</span>}
                          aria-label="Delete time window"
                          onClick={() => removeTimeWindow(timeWindow)}
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">Weekdays</label>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAY_OPTIONS.map((day) => (
                            <Checkbox
                              key={`${timeWindow.tempId}-${day.value}`}
                              id={`edit-schedule-weekday-${timeWindow.tempId}-${day.value}`}
                              label={day.label}
                              checked={timeWindow.weekDays.includes(day.value)}
                              onChange={(event) => toggleWeekday(timeWindow.tempId, day.value, event.target.checked)}
                              className="weekday-pill-input"
                              labelClassName="weekday-pill-label"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <TimePicker
                          label="Start Time"
                          value={timeWindow.startTime}
                          onChange={(event) => updateTimeWindowField(timeWindow.tempId, { startTime: event.target.value })}
                        />
                        <TimePicker
                          label="End Time"
                          value={timeWindow.endTime}
                          onChange={(event) => updateTimeWindowField(timeWindow.tempId, { endTime: event.target.value })}
                        />
                        <Select
                          id={`edit-schedule-duration-${timeWindow.tempId}`}
                          label="Slot Duration"
                          value={String(timeWindow.slotDuration)}
                          onChange={(event) => updateTimeWindowField(timeWindow.tempId, { slotDuration: Number(event.target.value) })}
                          options={DURATION_OPTIONS}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No time windows"
                    description="Add at least one time window before updating the schedule."
                  />
                )}
              </div>

              <div className="mt-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTimeWindows((current) => [...current, createNewTimeWindow()])}
                >
                  + Add New Time Window
                </Button>
              </div>
            </section>

            <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}>
                Discard
              </Button>
              <Button type="submit" loading={saving} disabled={loading}>
                Update
              </Button>
            </div>
          </form>
        )}

        <ConfirmDialog
          open={Boolean(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (!confirmDelete) return;
            setTimeWindows((current) => current.filter((item) => item.tempId !== confirmDelete.tempId));
            setConfirmDelete(null);
          }}
          title="Delete time window?"
          description="This will remove the selected time window from the schedule."
          confirmLabel="Delete"
          confirmVariant="danger"
        />
      </div>
    </main>
  );
}
