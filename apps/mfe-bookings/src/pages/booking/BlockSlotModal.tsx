import { useEffect, useState } from "react";
import {
  Button, DialogFooter, FormSection, Input, Select, Textarea, TimePicker,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCalendars } from "../../services/useCalendars";
import { useProviders } from "../../services/useProviders";
import { useServices } from "../../services/useServices";
import { useBlockSlot } from "../../services/useBlockSlot";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BlockSlotModalProps {
  initialDate?: string;
  initialProviderUid?: string;
  initialCalendarUid?: string;
}

/** Block a time slot so it can't be booked (e.g. a meeting or maintenance window). */
export default function BlockSlotModal({ initialDate, initialProviderUid, initialCalendarUid }: BlockSlotModalProps = {}) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { calendars, searchSchedules } = useCalendars();
  const { providers } = useProviders();
  const { services } = useServices();
  const { blockSlot, submitting } = useBlockSlot();

  const [calendarUid, setCalendarUid] = useState(initialCalendarUid || "");
  const [scheduleUid, setScheduleUid] = useState("");
  const [providerUid, setProviderUid] = useState(initialProviderUid || "");
  const [serviceUid, setServiceUid] = useState("");
  const [date, setDate] = useState(initialDate || "");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<{ value: string; label: string }[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    setScheduleUid("");
    if (!calendarUid) { setScheduleOptions([]); return; }
    let cancelled = false;
    setSchedulesLoading(true);
    searchSchedules(calendarUid)
      .then((schedules) => { if (!cancelled) setScheduleOptions(schedules.map((s) => ({ value: s.uid, label: s.name }))); })
      .catch(() => { if (!cancelled) setScheduleOptions([]); })
      .finally(() => { if (!cancelled) setSchedulesLoading(false); });
    return () => { cancelled = true; };
  }, [calendarUid, searchSchedules]);

  const resolvedProviderUid = UUID_PATTERN.test(providerUid) ? providerUid : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleUid) { showToast("Select a calendar and schedule", "error"); return; }
    if (!date) { showToast("Pick a date", "error"); return; }
    if (endTime <= startTime) { showToast("End time must be after start time", "error"); return; }
    try {
      await blockSlot({ scheduleUid, serviceUid: serviceUid || undefined, providerUid: resolvedProviderUid || undefined, date, startTime, endTime, notes });
      showToast("Slot blocked", "success");
      closeModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not block the slot", "error");
    }
  };

  return (
    <form data-testid="bookings-block-slot-form" onSubmit={submit} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Block a Slot</h2>
        <p className="mt-1 text-sm text-slate-500">Reserve time on a schedule so it can't be booked.</p>
      </header>
      <div className="space-y-6">
        <FormSection title="Where">
          <Select id="blk-calendar" testId="bookings-block-calendar" label="Calendar" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={calendars.map((c) => ({ value: c.uid, label: c.name }))} />
          <Select id="blk-schedule" testId="bookings-block-schedule" label="Schedule" required placeholder={calendarUid ? (schedulesLoading ? "Loading…" : "Select schedule") : "Select calendar first"} value={scheduleUid} onChange={(e) => setScheduleUid(e.target.value)} options={scheduleOptions} />
          <Select id="blk-provider" testId="bookings-block-provider" label="Provider (optional)" placeholder="Any / all" value={providerUid} onChange={(e) => setProviderUid(e.target.value)} options={providers.map((p) => ({ value: p.uid ?? p.id, label: p.name, disabled: !UUID_PATTERN.test(p.uid ?? p.id ?? "") }))} />
          <Select id="blk-service" testId="bookings-block-service" label="Service (optional)" placeholder="None" value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={services.map((s) => ({ value: s.uid ?? s.id, label: s.name }))} />
        </FormSection>
        <FormSection title="When">
          <Input id="blk-date" data-testid="bookings-block-date" type="date" label="Date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex items-end gap-2">
            <div className="flex-1"><label className="mb-1 block text-xs font-medium text-slate-600">From</label><TimePicker value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="flex-1"><label className="mb-1 block text-xs font-medium text-slate-600">To</label><TimePicker value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
        </FormSection>
        <Textarea id="blk-notes" data-testid="bookings-block-notes" label="Reason / notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Staff meeting, equipment maintenance" />
      </div>
      <DialogFooter>
        <Button variant="secondary" id="bookings-block-cancel" onClick={closeModal}>Cancel</Button>
        <Button type="submit" id="bookings-block-confirm" data-testid="bookings-block-confirm" loading={submitting}>Block Slot</Button>
      </DialogFooter>
    </form>
  );
}
