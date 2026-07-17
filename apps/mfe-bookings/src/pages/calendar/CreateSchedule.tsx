import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
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
import type { Calendar, TimeWindow } from "../../types";

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

export default function CreateSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ calendarUid: string }>();
  const { showToast } = useToast();
  const initialCalendar = (location.state as { calendar?: Calendar } | null)?.calendar ?? null;
  const calendarUid = params.calendarUid ?? initialCalendar?.uid ?? "";
  const { getCalendar, createSchedule } = useCalendars();

  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar);
  const [loading, setLoading] = useState(Boolean(calendarUid));
  const [saving, setSaving] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeWindows, setTimeWindows] = useState<EditableTimeWindow[]>([createNewTimeWindow()]);
  const [confirmDelete, setConfirmDelete] = useState<EditableTimeWindow | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarUid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      try {
        const calendarData = await getCalendar(calendarUid);
        if (cancelled) return;
        setCalendar(calendarData);
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Failed to load calendar details.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar, showToast]);

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
    if (!calendar || !calendarUid) return;
    if (!validate()) return;
    setSaving(true);
    setOverlapError(null);
    try {
      const schedulePayload: CreateSchedulePayload = {
        name: scheduleName.trim(),
        description: "",
        calendarUid: calendar.uid,
        calendarName: calendar.name,
        startDate,
        endDate: endDate || startDate,
        slotCapacity: 0,
        qrLinkRequired: true,
        timeWindows: timeWindows.map((timeWindow) => formatTimeWindowPayload(calendar, "", scheduleName.trim(), timeWindow)),
      };
      await createSchedule(calendarUid, schedulePayload);
      navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create schedule.";
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
    <main data-testid="bookings-create-schedule-page" className="h-full flex flex-col bg-slate-50 calendar-details-page">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
        <PageHeader
          title="Add Schedule"
          subtitle="Configure schedule details and time windows."
          back={{ label: "Back to calendar details", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          className="mb-4"
        />
      </header>

      <div className="calendar-details-layout" style={{ overflowY: "auto" }}>
        <div className="max-w-5xl">
          {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading schedule...
          </div>
        ) : (
          <div className="wizard-step-panel active" style={{ display: 'block', margin: 0, maxWidth: 'none' }}>
            <div className="section-header-row mb-6">
                <h2 className="section-title">Schedule Details</h2>
            </div>
            <form
              data-testid="bookings-create-schedule-form"
              className="wizard-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="form-row">
                <div className="form-group">
                  <Input
                    id="create-schedule-name"
                    data-testid="bookings-create-schedule-name"
                    label="Schedule Name"
                    className="wiz-sch-input"
                    required
                    value={scheduleName}
                    onChange={(event) => setScheduleName(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <Input
                    id="create-schedule-start"
                    data-testid="bookings-create-schedule-start"
                    type="date"
                    label="Start Date"
                    className="wiz-sch-input"
                    required
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <Input
                    id="create-schedule-end"
                    data-testid="bookings-create-schedule-end"
                    type="date"
                    label="End Date"
                    className="wiz-sch-input"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="time-windows-wrapper mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="bold text-sm">Working Hours / Slots</h4>
                </div>

                {overlapError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                    <span className="font-semibold">Overlap Error: </span> {overlapError}
                  </div>
                )}

                {timeWindows.length ? (
                  timeWindows.map((timeWindow, index) => (
                    <div key={timeWindow.tempId} className="time-window-setup-row">
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={<span aria-hidden="true">&times;</span>}
                          className="btn-remove-timewindow-row"
                          aria-label="Remove time window"
                          onClick={() => removeTimeWindow(timeWindow)}
                        />
                      )}

                      <div className="form-group mb-2">
                        <label>Select Weekdays</label>
                        <div className="weekdays-pill-selector">
                          {WEEKDAY_OPTIONS.map((day) => (
                            <Checkbox
                              key={`${timeWindow.tempId}-${day.value}`}
                              id={`create-schedule-weekday-${timeWindow.tempId}-${day.value}`}
                              label={day.label}
                              checked={timeWindow.weekDays.includes(day.value)}
                              onChange={(event) => toggleWeekday(timeWindow.tempId, day.value, event.target.checked)}
                              className="weekday-pill-input wiz-day-pill-input"
                              containerClassName="mr-1"
                              labelClassName="weekday-pill-label"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="form-row mt-3">
                        <div className="form-group">
                          <TimePicker
                            label="Start Time"
                            className="wiz-tw-input"
                            value={timeWindow.startTime}
                            onChange={(event) => updateTimeWindowField(timeWindow.tempId, { startTime: event.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <TimePicker
                            label="End Time"
                            className="wiz-tw-input"
                            value={timeWindow.endTime}
                            onChange={(event) => updateTimeWindowField(timeWindow.tempId, { endTime: event.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <Select
                            id={`create-schedule-duration-${timeWindow.tempId}`}
                            label="Slot Duration (m)"
                            className="wiz-tw-input"
                            value={String(timeWindow.slotDuration)}
                            onChange={(event) => updateTimeWindowField(timeWindow.tempId, { slotDuration: Number(event.target.value) })}
                            options={DURATION_OPTIONS}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No time windows"
                    description="Add at least one time window before updating the schedule."
                  />
                )}

                <Button
                  type="button"
                  variant="link"
                  size="inline"
                  className="btn-add-timewindow-link btn-wiz-add-tw-row mt-4"
                  onClick={() => setTimeWindows((current) => [...current, createNewTimeWindow()])}
                >
                  + Add New Time Window
                </Button>
              </div>

              <div className="wizard-footer-actions mt-12">
                <Button type="button" variant="secondary" className="btn-wizard-discard" onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}>
                  Discard
                </Button>
                <Button type="submit" loading={saving} disabled={loading}>
                  Create Schedule
                </Button>
              </div>
            </form>
          </div>
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
      </div>
    </main>
  );
}
