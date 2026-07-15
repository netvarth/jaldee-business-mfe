import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, DataTable, EmptyState, Input, PageHeader, Select, Textarea, type ColumnDef,
} from "@jaldee/design-system";
import { useQrLinks, type QrLink } from "../../services/useQrLinks";
import { useCalendars } from "../../services/useCalendars";
import { useToast } from "../../contexts/ToastContext";
import type { Schedule } from "../../types";

const QR_TYPE_OPTIONS = [
  { value: "CALENDAR", label: "Calendar" },
  { value: "SCHEDULE", label: "Schedule" },
  { value: "TIMEWINDOW", label: "Time Window" },
];

interface FormState {
  uid?: string;
  name: string;
  description: string;
  type: string;
  calendarUid: string;
  scheduleUid: string;
  timeWindowUid: string;
  expiryDate: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: "", description: "", type: "CALENDAR", calendarUid: "", scheduleUid: "", timeWindowUid: "", expiryDate: "", status: "Enabled",
};

function fmtDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function QrLinksPage() {
  const navigate = useNavigate();
  const { qrLinks, loading, error, create, update } = useQrLinks();
  const { calendars, searchSchedules } = useCalendars();
  const { showToast } = useToast();

  const [searchVal, setSearchVal] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

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
    () => [
      { value: "", label: "Select calendar" },
      ...calendars.map((c) => ({ value: c.uid, label: c.name })),
    ],
    [calendars],
  );

  const scheduleOptions = useMemo(() => {
    return [
      { value: "", label: "Select schedule" },
      ...schedules.map(s => ({ value: s.uid, label: s.name }))
    ];
  }, [schedules]);

  const timeWindowOptions = useMemo(() => {
    const activeSchedule = schedules.find(s => s.uid === form.scheduleUid);
    const windows = activeSchedule?.timeWindows || [];
    return [
      { value: "", label: "Select time window" },
      ...windows.map(w => ({ value: w.uid, label: `${w.startTime} - ${w.endTime}` }))
    ];
  }, [schedules, form.scheduleUid]);

  const openCreate = () => { setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (q: QrLink) => {
    setForm({
      uid: q.uid, name: q.name ?? "", description: q.description ?? "",
      type: q.type ?? "CALENDAR", calendarUid: q.calendarUid ?? "",
      scheduleUid: q.schedule?.[0] ?? "", timeWindowUid: q.timeWindow?.[0] ?? "",
      expiryDate: q.expiryDate ?? "", status: q.status ?? "Enabled",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const calendarName = calendars.find((c) => c.uid === form.calendarUid)?.name;
      const payload: QrLink = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        calendarUid: form.calendarUid || undefined,
        calendarName,
        schedule: form.scheduleUid ? [form.scheduleUid] : undefined,
        timeWindow: form.timeWindowUid ? [form.timeWindowUid] : undefined,
        expiryDate: form.expiryDate || undefined,
        status: form.status,
      };
      if (form.uid) await update(form.uid, payload);
      else await create(payload);
      showToast(form.uid ? "QR link updated" : "QR link created", "success");
      setFormOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save QR link", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = qrLinks.filter((q) =>
    !searchVal || (q.name?.toLowerCase().includes(searchVal.toLowerCase())));

  const columns: ColumnDef<QrLink>[] = [
    { key: "name", header: "Name", render: (q) => q.name ?? "—" },
    { key: "type", header: "Type", render: (q) => q.type ?? "—" },
    { key: "calendarName", header: "Calendar", render: (q) => q.calendarName ?? "—" },
    { key: "expiryDate", header: "Expires", render: (q) => fmtDate(q.expiryDate) },
    { key: "status", header: "Status", render: (q) => q.status ?? "—" },
    {
      key: "qrLink", header: "Link",
      render: (q) => q.qrLink
        ? <a href={q.qrLink} target="_blank" rel="noreferrer" className="text-violet-600 underline">Open</a>
        : "—",
    },
    { 
      key: "actions", header: "", align: "right", 
      render: (q) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/qrlinks/${q.uid}`)}>View Details</Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>Edit</Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <PageHeader
        title="QR Links"
        subtitle="Shareable QR codes for calendars, schedules and time windows."
        actions={<Button onClick={openCreate}>New QR Link</Button>}
      />

      {formOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Type" value={form.type} options={QR_TYPE_OPTIONS}
              onChange={(e) => setForm({ ...form, type: e.target.value, scheduleUid: "", timeWindowUid: "" })} />
            <Select label="Calendar" value={form.calendarUid} options={calendarOptions}
              onChange={(e) => setForm({ ...form, calendarUid: e.target.value, scheduleUid: "", timeWindowUid: "" })} />
            
            {(form.type === "SCHEDULE" || form.type === "TIMEWINDOW") && (
              <Select label="Schedule" value={form.scheduleUid} options={scheduleOptions}
                onChange={(e) => setForm({ ...form, scheduleUid: e.target.value, timeWindowUid: "" })} disabled={loadingSchedules} />
            )}
            
            {form.type === "TIMEWINDOW" && (
              <Select label="Time Window" value={form.timeWindowUid} options={timeWindowOptions}
                onChange={(e) => setForm({ ...form, timeWindowUid: e.target.value })} disabled={!form.scheduleUid} />
            )}

            <Input type="date" label="Expiry Date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}

      {!formOpen && (
        <>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Input placeholder="Search QR links…" value={searchVal} onChange={(e) => setSearchVal(e.target.value)} containerClassName="sm:max-w-xs" />
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(q) => String(q.uid ?? q.name)}
            loading={loading}
            emptyState={<EmptyState title="No QR links" description="Create a QR link to share booking access." />}
          />
        </>
      )}
    </div>
  );
}
