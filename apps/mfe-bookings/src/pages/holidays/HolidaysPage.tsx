import { useMemo, useState } from "react";
import {
  Button, Checkbox, DataTable, EmptyState, Input, PageHeader, Select, Textarea,
  TimePicker, type ColumnDef,
} from "@jaldee/design-system";
import { useHolidays, type Holiday } from "../../services/useHolidays";
import { useProviders } from "../../services/useProviders";
import { useBookingPreferences } from "../../services/useBookingPreferences";
import { useToast } from "../../contexts/ToastContext";
import { buildOffsetDateTime, formatIsoTime } from "../../utils/dateTime";

type Scope = "GLOBAL" | "USER";

interface FormState {
  uid?: string;
  title: string;
  description: string;
  scope: Scope;
  userUid: string;
  startDate: string;
  endDate: string;
  fullDay: boolean;
  startTime: string;
  endTime: string;
}

const EMPTY_FORM: FormState = {
  title: "", description: "", scope: "GLOBAL", userUid: "",
  startDate: "", endDate: "", fullDay: true, startTime: "09:00", endTime: "17:00",
};

function fmtDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HolidaysPage() {
  const { holidays, loading, error, create, update, remove } = useHolidays();
  const { providers } = useProviders();
  const { preference } = useBookingPreferences();
  const { showToast } = useToast();

  const [searchVal, setSearchVal] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const providerName = useMemo(
    () => providers.find((p) => (p.uid ?? p.id) === form.userUid)?.name ?? "",
    [providers, form.userUid],
  );

  const filtered = holidays.filter((h) => {
    if (!searchVal) return true;
    const s = searchVal.toLowerCase();
    return (h.title?.toLowerCase().includes(s)) || (h.userName?.toLowerCase().includes(s));
  });

  const openCreate = () => { setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (h: Holiday) => {
    setForm({
      uid: h.uid,
      title: h.title ?? "",
      description: h.description ?? "",
      scope: h.userUid ? "USER" : "GLOBAL",
      userUid: h.userUid ?? "",
      startDate: h.startDate ?? "",
      endDate: h.endDate ?? "",
      fullDay: !h.startTime,
      startTime: h.startTime ? formatIsoTime(h.startTime, preference?.timezone, "09:00") : "09:00",
      endTime: h.endTime ? formatIsoTime(h.endTime, preference?.timezone, "17:00") : "17:00",
    });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) { showToast("Title is required", "error"); return; }
    if (!form.startDate) { showToast("Start date is required", "error"); return; }
    if (form.scope === "USER" && !form.userUid) { showToast("Select a provider for this leave", "error"); return; }
    const endDate = form.endDate || form.startDate;
    if (endDate < form.startDate) { showToast("End date cannot be before start date", "error"); return; }

    const payload: Holiday = {
      ...(form.uid ? { uid: form.uid } : {}),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      userUid: form.scope === "USER" ? form.userUid : null,
      userName: form.scope === "USER" ? providerName || null : null,
      startDate: form.startDate,
      endDate,
      startTime: form.fullDay ? null : buildOffsetDateTime(form.startDate, form.startTime, preference?.timezone),
      endTime: form.fullDay ? null : buildOffsetDateTime(form.startDate, form.endTime, preference?.timezone),
    };

    setSaving(true);
    try {
      if (form.uid) {
        await update(form.uid, payload);
        showToast("Holiday updated", "success");
      } else {
        await create(payload);
        showToast("Holiday added", "success");
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save the holiday", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (h: Holiday) => {
    if (!h.uid) return;
    try {
      await remove(h.uid);
      showToast("Holiday removed", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not delete the holiday", "error");
    }
  };

  const columns = useMemo<ColumnDef<Holiday>[]>(() => [
    {
      key: "title", header: "Holiday", sortable: true, width: "30%",
      render: (h) => (
        <div>
          <p className="font-semibold text-slate-900">{h.title || "—"}</p>
          {h.description ? <p className="text-xs text-slate-500 truncate max-w-[280px]">{h.description}</p> : null}
        </div>
      ),
    },
    {
      key: "scope", header: "Applies to", sortable: true,
      render: (h) => h.userUid
        ? <span className="text-slate-700">{h.userName || "Provider"}</span>
        : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">All providers</span>,
    },
    {
      key: "dates", header: "Dates", sortable: true,
      render: (h) => h.startDate === h.endDate || !h.endDate
        ? fmtDate(h.startDate)
        : `${fmtDate(h.startDate)} – ${fmtDate(h.endDate)}`,
    },
    {
      key: "type", header: "Type",
      render: (h) => h.startTime
        ? `${formatIsoTime(h.startTime, preference?.timezone, "—")} – ${formatIsoTime(h.endTime ?? undefined, preference?.timezone, "—")}`
        : <span className="text-slate-500">Full day</span>,
    },
    {
      key: "actions", header: "Actions", align: "right", sticky: "right", width: 160,
      render: (h) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(h); }}>Edit</Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete(h); }}>Delete</Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [preference?.timezone, providers]);

  return (
    <div className="space-y-6 md:space-y-8 pb-10 w-full px-6 lg:px-10 py-8">
      <PageHeader
        title="Holidays & Leave"
        subtitle="Block dates for the whole business or a specific provider so they can't be booked."
        actions={<Button className="h-10 rounded-xl" onClick={openCreate}>Add Holiday</Button>}
      />

      {formOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" data-testid="bookings-holiday-form">
          <h3 className="text-base font-bold text-slate-800">{form.uid ? "Edit holiday" : "New holiday"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Diwali, Dr. Rao on leave" />
            <Select
              label="Applies to"
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as Scope }))}
              options={[{ value: "GLOBAL", label: "All providers (business holiday)" }, { value: "USER", label: "A specific provider" }]}
            />
            {form.scope === "USER" && (
              <Select
                label="Provider"
                required
                placeholder="Select provider"
                value={form.userUid}
                onChange={(e) => setForm((f) => ({ ...f, userUid: e.target.value }))}
                options={providers.map((p) => ({ value: p.uid ?? p.id, label: p.name }))}
              />
            )}
            <Input type="date" label="Start date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input type="date" label="End date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} hint="Leave blank for a single day" />
          </div>
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox label="Full day" checked={form.fullDay} onChange={(e) => setForm((f) => ({ ...f, fullDay: e.target.checked }))} />
            {!form.fullDay && (
              <div className="flex items-end gap-2">
                <div><label className="mb-1 block text-xs font-medium text-slate-600">From</label><TimePicker value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} fullWidth={false} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600">To</label><TimePicker value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} fullWidth={false} /></div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving}>{form.uid ? "Save changes" : "Add holiday"}</Button>
          </div>
        </div>
      )}

      <div className="w-full md:w-64">
        <Input type="text" value={searchVal} onChange={(e) => setSearchVal(e.target.value)} placeholder="Search holidays..." />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(h) => h.uid ?? `${h.title}-${h.startDate}`}
        emptyState={
          <EmptyState
            title={loading ? "Loading holidays…" : error ? "Could not load holidays" : "No holidays yet"}
            description={loading ? "Fetching your blocked dates." : error ? error : "Add a business holiday or provider leave to block those dates from booking."}
          />
        }
        data-testid="bookings-holidays"
      />
    </div>
  );
}
