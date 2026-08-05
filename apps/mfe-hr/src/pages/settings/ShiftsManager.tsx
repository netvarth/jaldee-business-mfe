import { useEffect, useMemo, useState } from "react";
import { Clock, LayoutGrid, Table } from "lucide-react";
import { Dialog, DialogFooter, Button, Input, Select, Badge, TimePicker } from "@jaldee/design-system";
import { useShifts, useShiftRotations, type Shift, type ShiftRotation } from "../../services/useSettingsData";
import { useEmployees } from "../../services/useEmployees";
import { useShiftOps, type Roster } from "../../services/useShiftOps";
import { PanelHeader, SettingsEmptyState } from "./SettingsComponents";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayShort = (d: string) => d.slice(0, 3);
const asDays = (v: unknown): string[] => Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? v.split(",").map((s) => s.trim()) : [];
const to12HourTime = (value?: string) => {
  const input = String(value ?? "").trim();
  const twelveHour = input.match(/^(\d{1,2})[.:](\d{2})\s*([AP]M)$/i);
  if (twelveHour) {
    return `${String(Number(twelveHour[1])).padStart(2, "0")}:${twelveHour[2]} ${twelveHour[3].toUpperCase()}`;
  }
  const twentyFourHour = input.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!twentyFourHour) return input;
  const hour24 = Number(twentyFourHour[1]);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${twentyFourHour[2]} ${period}`;
};
const displayTime = (value?: string) => to12HourTime(value) || "—";

type Tab = "shifts" | "rotations";

export default function ShiftsManager() {
  const [tab, setTab] = useState<Tab>("shifts");
  return (
    <div className="p-3 sm:p-4 lg:p-5">
      <PanelHeader
        title="Shifts & Rotations"
        subtitle="Define working hours, assign staff, and set up rotating rosters — all in one place."
        icon={<Clock size={20} />}
      />
      <div className="flex gap-1.5 border-b border-gray-200 mb-5 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        {(["shifts", "rotations"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors shrink-0 ${tab === t ? "bg-teal-700 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {t === "shifts" ? "Shifts" : "Rotations"}
          </button>
        ))}
      </div>
      {tab === "shifts" ? <ShiftsTab /> : <RotationsTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ Shifts */

function ShiftsTab() {
  const { data, loading, error, create, update, remove } = useShifts();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [editing, setEditing] = useState<Partial<Shift> | null>(null);
  const [assigning, setAssigning] = useState<Shift | null>(null);

  return (
    <div id="hr-settings-shifts-panel" data-testid="hr-settings-shifts-panel" className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500">{data.length} shift{data.length === 1 ? "" : "s"}</div>
        <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
          <Button id="hr-settings-shifts-add" data-testid="hr-settings-shifts-add" variant="primary" onClick={() => setEditing({})}>+ Add Shift</Button>
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
              title="Table View"
              aria-label="Table View"
            >
              <Table size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
              title="Card View"
              aria-label="Card View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>
      {error ? <div className="p-6 text-sm text-red-600">{error}</div>
        : loading ? <div className="p-6 text-sm text-gray-500">Loading…</div>
        : data.length === 0 ? <SettingsEmptyState title="No shifts" description="Add a shift to define working hours and weekly offs." compact />
        : viewMode === "table" ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full">
            <table id="hr-settings-shifts-table" data-testid="hr-settings-shifts-table" className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Timing</th>
                  <th className="text-left px-4 py-3 font-semibold">Grace</th>
                  <th className="text-left px-4 py-3 font-semibold">Half-day</th>
                  <th className="text-left px-4 py-3 font-semibold">Break</th>
                  <th className="text-left px-4 py-3 font-semibold">Weekly off</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.uid} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{displayTime(s.startTime)} – {displayTime(s.endTime)}</td>
                    <td className="px-4 py-3 text-gray-600">{s.graceMinutes != null ? `${s.graceMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.halfDayThresholdMinutes != null ? `${s.halfDayThresholdMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.breakMinutes != null ? `${s.breakMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{asDays(s.weeklyOffDays).map(dayShort).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setAssigning(s)}>Assign</Button>{" "}
                      <Button id={`hr-settings-shifts-edit-${s.uid}`} data-testid={`hr-settings-shifts-edit-${s.uid}`} variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>{" "}
                      <Button variant="outline" size="sm" onClick={() => s.uid && remove(s.uid)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {data.map((s) => (
              <div key={s.uid} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-shadow">
                <div>
                  <h4 className="font-semibold text-gray-900 text-base mb-1">{s.name || "Untitled Shift"}</h4>
                  <p className="text-sm font-medium text-teal-700 mb-2">{displayTime(s.startTime)} – {displayTime(s.endTime)}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><b>Grace:</b> {s.graceMinutes != null ? `${s.graceMinutes}m` : "—"}</p>
                    <p><b>Half-day threshold:</b> {s.halfDayThresholdMinutes != null ? `${s.halfDayThresholdMinutes}m` : "—"}</p>
                    <p><b>Break:</b> {s.breakMinutes != null ? `${s.breakMinutes}m` : "—"}</p>
                    <p><b>Off days:</b> {asDays(s.weeklyOffDays).map(dayShort).join(", ") || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 mt-1">
                  <Button variant="outline" size="sm" onClick={() => setAssigning(s)}>Assign</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => s.uid && remove(s.uid)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}

      {editing && (
        <ShiftModal initial={editing} onClose={() => setEditing(null)}
          onSave={async (v) => { if (v.uid) await update(v.uid, v as unknown as Record<string, unknown>); else await create(v as unknown as Record<string, unknown>); }} />
      )}
      {assigning && assigning.uid && (
        <AssignModal title={`Assign to ${assigning.name}`} entityUid={assigning.uid} kind="shift" onClose={() => setAssigning(null)} />
      )}
    </div>
  );
}

function ShiftModal({ initial, onClose, onSave }: { initial: Partial<Shift>; onClose: () => void; onSave: (v: Partial<Shift>) => Promise<void> }) {
  const initialOffDays = asDays(initial.weeklyOffDays);
  const [s, setS] = useState<Partial<Shift>>({
    graceMinutes: 10,
    halfDayThresholdMinutes: 240,
    breakMinutes: 60,
    ...initial,
    weeklyOffDays: initial.uid ? initialOffDays : (initialOffDays.length ? initialOffDays : ["SATURDAY", "SUNDAY"]),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Shift>(k: K, v: Shift[K]) => setS((p) => ({ ...p, [k]: v }));
  const offDays = asDays(s.weeklyOffDays);
  const toggleDay = (d: string) => set("weeklyOffDays", offDays.includes(d) ? offDays.filter((x) => x !== d) : [...offDays, d]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.name?.trim()) { setErr("Give the shift a name."); return; }
    if (!s.startTime || !s.endTime) { setErr("Set start and end time."); return; }
    setBusy(true); setErr(null);
    try { await onSave({ ...s, weeklyOffDays: offDays }); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog testId="hr-settings-shifts-modal" open onClose={onClose} title={initial.uid ? "Update shift" : "New shift"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        <Input id="hr-settings-shifts-name" data-testid="hr-settings-shifts-name" label="Shift name" required value={s.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. General / Housekeeping / Security" />
        <div className="grid grid-cols-2 gap-3">
          <TimePicker id="hr-settings-shifts-starttime" data-testid="hr-settings-shifts-starttime" label="Start time" use12Hour value={to12HourTime(s.startTime)} onChange={(e) => set("startTime", to12HourTime(e.target.value))} />
          <TimePicker id="hr-settings-shifts-endtime" data-testid="hr-settings-shifts-endtime" label="End time" use12Hour value={to12HourTime(s.endTime)} onChange={(e) => set("endTime", to12HourTime(e.target.value))} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input id="hr-settings-shifts-graceminutes" data-testid="hr-settings-shifts-graceminutes" label="Grace (min)" type="number" value={String(s.graceMinutes ?? "")} onChange={(e) => set("graceMinutes", Number(e.target.value))} />
          <Input id="hr-settings-shifts-halfdaythreshold" data-testid="hr-settings-shifts-halfdaythreshold" label="Half-day threshold (min)" type="number" value={String(s.halfDayThresholdMinutes ?? "")} onChange={(e) => set("halfDayThresholdMinutes", Number(e.target.value))} />
          <Input id="hr-settings-shifts-breakminutes" data-testid="hr-settings-shifts-breakminutes" label="Break (min)" type="number" value={String(s.breakMinutes ?? "")} onChange={(e) => set("breakMinutes", Number(e.target.value))} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Weekly off</div>
          <div id="hr-settings-shifts-weeklyoffdays" data-testid="hr-settings-shifts-weeklyoffdays" className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = offDays.includes(d);
              return <button type="button" key={d} id={`hr-settings-shifts-weeklyoffdays-option-${d}`} data-testid={`hr-settings-shifts-weeklyoffdays-option-${d}`} onClick={() => toggleDay(d)}
                aria-pressed={on} data-state={on ? "selected" : "unselected"}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${on ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-300"}`}>{dayShort(d)}</button>;
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button id="hr-settings-shifts-save" data-testid="hr-settings-shifts-save" variant="primary" type="submit" loading={busy}>{initial.uid ? "Update shift" : "Save shift"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/* --------------------------------------------------------------- Rotations */

function RotationsTab() {
  const { data, loading, error, create, update, remove } = useShiftRotations();
  const shifts = useShifts();
  const shiftName = (uid: string) => shifts.data.find((s) => s.uid === uid)?.name || uid.slice(0, 6);
  const [editing, setEditing] = useState<Partial<ShiftRotation> | null>(null);
  const [assigning, setAssigning] = useState<ShiftRotation | null>(null);
  const [roster, setRoster] = useState<ShiftRotation | null>(null);

  return (
    <div id="hr-settings-rotations-panel" data-testid="hr-settings-rotations-panel" className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500">{data.length} rotation{data.length === 1 ? "" : "s"}</div>
        <Button id="hr-settings-rotations-add" data-testid="hr-settings-rotations-add" variant="primary" onClick={() => setEditing({ active: true, rotationPeriodDays: 7, shiftUids: [] })}>+ Add Rotation</Button>
      </div>
      {error ? <div className="p-6 text-sm text-red-600">{error}</div>
        : loading ? <div className="p-6 text-sm text-gray-500">Loading…</div>
        : data.length === 0 ? <SettingsEmptyState title="No rotations" description="Add a rotation to organize recurring shift sequences." compact />
        : (
          <table id="hr-settings-rotations-table" data-testid="hr-settings-rotations-table" className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="text-left px-6 py-3">Name</th><th className="text-left px-4 py-3">Shift sequence</th>
                <th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Starts</th>
                <th className="text-left px-4 py-3">Active</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.uid} className="border-b border-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.name || "—"}</td>
                  <td className="px-4 py-3">{(r.shiftUids ?? []).length ? (r.shiftUids ?? []).map((u, i) => <Badge key={i} variant="info">{shiftName(u)}</Badge>) : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.rotationPeriodDays ? `${r.rotationPeriodDays} days` : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.startDate || "—"}</td>
                  <td className="px-4 py-3">{r.active ? <Badge variant="success">Active</Badge> : <Badge>Off</Badge>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setRoster(r)}>Roster</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => setAssigning(r)}>Assign</Button>{" "}
                    <Button id={`hr-settings-rotations-edit-${r.uid}`} data-testid={`hr-settings-rotations-edit-${r.uid}`} variant="outline" size="sm" onClick={() => setEditing(r)}>Edit</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => r.uid && remove(r.uid)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {editing && (
        <RotationModal initial={editing} shifts={shifts.data} onClose={() => setEditing(null)}
          onSave={async (v) => { if (v.uid) await update(v.uid, v as unknown as Record<string, unknown>); else await create(v as unknown as Record<string, unknown>); }} />
      )}
      {assigning && assigning.uid && (
        <AssignModal title={`Assign to ${assigning.name}`} entityUid={assigning.uid} kind="rotation" onClose={() => setAssigning(null)} />
      )}
      {roster && roster.uid && <RosterModal rotationName={roster.name || ""} shiftName={shiftName} onClose={() => setRoster(null)} />}
    </div>
  );
}

function RotationModal({ initial, shifts, onClose, onSave }:
  { initial: Partial<ShiftRotation>; shifts: Shift[]; onClose: () => void; onSave: (v: Partial<ShiftRotation>) => Promise<void> }) {
  const [r, setR] = useState<Partial<ShiftRotation>>({ active: true, rotationPeriodDays: 7, shiftUids: [], ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seq = r.shiftUids ?? [];
  const set = <K extends keyof ShiftRotation>(k: K, v: ShiftRotation[K]) => setR((p) => ({ ...p, [k]: v }));
  const addShift = (uid: string) => { if (uid) set("shiftUids", [...seq, uid]); };
  const removeAt = (i: number) => set("shiftUids", seq.filter((_, idx) => idx !== i));
  const name = (uid: string) => shifts.find((s) => s.uid === uid)?.name || uid.slice(0, 6);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.name?.trim()) { setErr("Give the rotation a name."); return; }
    if (seq.length === 0) { setErr("Add at least one shift to the sequence."); return; }
    setBusy(true); setErr(null);
    try { await onSave(r); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog testId="hr-settings-rotations-modal" open onClose={onClose} title={initial.uid ? "Edit rotation" : "New rotation"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        <Input id="hr-settings-rotations-name" data-testid="hr-settings-rotations-name" label="Rotation name" required value={r.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Security 3-shift rotation" />
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Shift sequence (cycles in this order)</div>
          <div className="flex flex-wrap items-center gap-2 mb-2 min-h-[2rem]">
            {seq.length === 0 ? <span className="text-sm text-gray-400">No shifts added yet</span>
              : seq.map((u, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs border border-teal-200">
                  {i + 1}. {name(u)}
                  <button type="button" onClick={() => removeAt(i)} className="ml-1 text-teal-500 hover:text-teal-800">Ã—</button>
                </span>
              ))}
          </div>
          <Select id="hr-settings-rotations-add-shift" testId="hr-settings-rotations-add-shift" label="Add a shift" options={[{ value: "", label: "Select a shift…" }, ...shifts.map((s) => ({ value: s.uid ?? "", label: s.name ?? "" }))]}
            value="" onChange={(e) => addShift(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input id="hr-settings-rotations-period" data-testid="hr-settings-rotations-period" label="Period (days)" type="number" value={String(r.rotationPeriodDays ?? "")} onChange={(e) => set("rotationPeriodDays", Number(e.target.value))} />
          <Input id="hr-settings-rotations-startdate" data-testid="hr-settings-rotations-startdate" label="Start date" type="date" value={r.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
            <input type="checkbox" checked={!!r.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button id="hr-settings-rotations-save" data-testid="hr-settings-rotations-save" variant="primary" type="submit" loading={busy}>Save rotation</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/* ----------------------------------------------------------- shared modals */

function AssignModal({ title, entityUid, kind, onClose }:
  { title: string; entityUid: string; kind: "shift" | "rotation"; onClose: () => void }) {
  const employees = useEmployees();
  const ops = useShiftOps();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (kind === "shift" ? ops.getShiftAssigned(entityUid) : ops.getRotationAssigned(entityUid))
      .then((ids) => setSelected(new Set(ids)))
      .catch(() => { /* none assigned yet */ });
  }, [entityUid, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return employees.data.filter((e) => !term
      || (e.name ?? "").toLowerCase().includes(term)
      || (e.employeeId ?? "").toLowerCase().includes(term));
  }, [employees.data, q]);

  const toggle = (uid: string) => setSelected((p) => { const n = new Set(p); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const ids = [...selected];
      if (kind === "shift") await ops.assignShift(entityUid, ids); else await ops.assignRotation(entityUid, ids);
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        <Input placeholder="Search by name or employee ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="text-xs text-gray-500">{selected.size} selected</div>
        <div className="max-h-80 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
          {employees.loading ? <div className="p-4 text-sm text-gray-500">Loading employees…</div>
            : list.length === 0 ? <SettingsEmptyState title="No employees found" description="No employees match the current search." compact />
            : list.map((e) => (
              <label key={e.uid} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={e.uid ? selected.has(e.uid) : false} onChange={() => e.uid && toggle(e.uid)} />
                <span className="font-medium text-gray-800">{e.name || "—"}</span>
                {e.employeeId ? <span className="text-gray-400">{e.employeeId}</span> : null}
              </label>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="button" onClick={save} loading={busy}>Save assignment</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

function RosterModal({ rotationName, shiftName, onClose }:
  { rotationName: string; shiftName: (uid: string) => string; onClose: () => void }) {
  const ops = useShiftOps();
  const employees = useEmployees();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [roster, setRoster] = useState<Roster>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setErr(null);
    ops.roster(month).then(setRoster).catch((e) => setErr(e instanceof Error ? e.message : "Failed to load roster")).finally(() => setLoading(false));
  };
  useEffect(load, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const empName = (uid: string) => employees.data.find((e) => e.uid === uid)?.name || uid.slice(0, 6);
  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  }, [month]);
  const rows = Object.keys(roster);

  return (
    <Dialog open onClose={onClose} title={`Roster — ${rotationName}`} size="xl">
      <div className="space-y-3">
        <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        {loading ? <div className="p-4 text-sm text-gray-500">Generating roster…</div>
          : rows.length === 0 ? <SettingsEmptyState title="No roster entries" description="Assign employees to this rotation or select another month." compact />
          : (
            <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
              <table className="text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 text-left px-3 py-2 font-medium text-gray-600">Employee</th>
                    {days.map((d) => <th key={d} className="px-2 py-2 text-gray-400 font-normal">{d.slice(8)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((emp) => (
                    <tr key={emp} className="border-t border-gray-50">
                      <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{empName(emp)}</td>
                      {days.map((d) => {
                        const sh = roster[emp]?.[d];
                        return <td key={d} className="px-2 py-2 text-center text-gray-600">{sh ? shiftName(sh).slice(0, 3) : "Â·"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <DialogFooter>
          <Button variant="primary" type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
