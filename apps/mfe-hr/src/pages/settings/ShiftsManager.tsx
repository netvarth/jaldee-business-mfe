import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select, Badge } from "@jaldee/design-system";
import { useShifts, useShiftRotations, type Shift, type ShiftRotation } from "../../services/useSettingsData";
import { useEmployees } from "../../services/useEmployees";
import { useShiftOps, type Roster } from "../../services/useShiftOps";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayShort = (d: string) => d.slice(0, 3);
const asDays = (v: unknown): string[] => Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? v.split(",").map((s) => s.trim()) : [];
const hhmm = (t?: string) => (t || "").slice(0, 5);

type Tab = "shifts" | "rotations";

export default function ShiftsManager() {
  const [tab, setTab] = useState<Tab>("shifts");
  return (
    <div className="p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Shifts &amp; Rotations</h1>
        <p className="text-sm text-gray-500 mt-1">Define working hours, assign staff, and set up rotating rosters â€” all in one place.</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {(["shifts", "rotations"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? "bg-teal-700 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
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
  const [editing, setEditing] = useState<Partial<Shift> | null>(null);
  const [assigning, setAssigning] = useState<Shift | null>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500">{data.length} shift{data.length === 1 ? "" : "s"}</div>
        <Button variant="primary" onClick={() => setEditing({})}>+ Add Shift</Button>
      </div>
      {error ? <div className="p-6 text-sm text-red-600">{error}</div>
        : loading ? <div className="p-6 text-sm text-gray-500">Loadingâ€¦</div>
        : data.length === 0 ? <div className="py-12 text-center text-gray-500 text-sm">No shifts yet.</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="text-left px-6 py-3">Name</th><th className="text-left px-4 py-3">Timing</th>
                <th className="text-left px-4 py-3">Grace</th><th className="text-left px-4 py-3">Half-day</th>
                <th className="text-left px-4 py-3">Break</th><th className="text-left px-4 py-3">Weekly off</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.uid} className="border-b border-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{s.name || "â€”"}</td>
                  <td className="px-4 py-3 text-gray-700">{hhmm(s.startTime)} â€“ {hhmm(s.endTime)}
                    {s.startTime && s.endTime && s.endTime < s.startTime ? <span className="ml-1 text-xs text-amber-600">(overnight)</span> : null}</td>
                  <td className="px-4 py-3 text-gray-600">{s.graceMinutes != null ? `${s.graceMinutes}m` : "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.halfDayThresholdMinutes != null ? `${s.halfDayThresholdMinutes}m` : "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.breakMinutes != null ? `${s.breakMinutes}m` : "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600">{asDays(s.weeklyOffDays).map(dayShort).join(", ") || "â€”"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setAssigning(s)}>Assign</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => s.uid && remove(s.uid)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [s, setS] = useState<Partial<Shift>>({ graceMinutes: 10, halfDayThresholdMinutes: 240, breakMinutes: 60, ...initial, weeklyOffDays: asDays(initial.weeklyOffDays).length ? asDays(initial.weeklyOffDays) : ["SUNDAY"] });
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
    <Dialog open onClose={onClose} title={initial.uid ? "Edit shift" : "New shift"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        <Input label="Shift name" required value={s.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. General / Housekeeping / Security" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time" type="time" value={hhmm(s.startTime)} onChange={(e) => set("startTime", e.target.value)} />
          <Input label="End time" type="time" value={hhmm(s.endTime)} onChange={(e) => set("endTime", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Grace (min)" type="number" value={String(s.graceMinutes ?? "")} onChange={(e) => set("graceMinutes", Number(e.target.value))} />
          <Input label="Half-day threshold (min)" type="number" value={String(s.halfDayThresholdMinutes ?? "")} onChange={(e) => set("halfDayThresholdMinutes", Number(e.target.value))} />
          <Input label="Break (min)" type="number" value={String(s.breakMinutes ?? "")} onChange={(e) => set("breakMinutes", Number(e.target.value))} />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1.5">Weekly off</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = offDays.includes(d);
              return <button type="button" key={d} onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${on ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-300"}`}>{dayShort(d)}</button>;
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" loading={busy}>Save shift</Button>
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
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="text-sm text-gray-500">{data.length} rotation{data.length === 1 ? "" : "s"}</div>
        <Button variant="primary" onClick={() => setEditing({ active: true, rotationPeriodDays: 7, shiftUids: [] })}>+ Add Rotation</Button>
      </div>
      {error ? <div className="p-6 text-sm text-red-600">{error}</div>
        : loading ? <div className="p-6 text-sm text-gray-500">Loadingâ€¦</div>
        : data.length === 0 ? <div className="py-12 text-center text-gray-500 text-sm">No rotations yet.</div>
        : (
          <table className="w-full text-sm">
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
                  <td className="px-6 py-3 font-medium text-gray-900">{r.name || "â€”"}</td>
                  <td className="px-4 py-3">{(r.shiftUids ?? []).length ? (r.shiftUids ?? []).map((u, i) => <Badge key={i} variant="info">{shiftName(u)}</Badge>) : "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.rotationPeriodDays ? `${r.rotationPeriodDays} days` : "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.startDate || "â€”"}</td>
                  <td className="px-4 py-3">{r.active ? <Badge variant="success">Active</Badge> : <Badge>Off</Badge>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setRoster(r)}>Roster</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => setAssigning(r)}>Assign</Button>{" "}
                    <Button variant="outline" size="sm" onClick={() => setEditing(r)}>Edit</Button>{" "}
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
    <Dialog open onClose={onClose} title={initial.uid ? "Edit rotation" : "New rotation"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        <Input label="Rotation name" required value={r.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Security 3-shift rotation" />
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
          <Select label="Add a shift" options={[{ value: "", label: "Select a shiftâ€¦" }, ...shifts.map((s) => ({ value: s.uid ?? "", label: s.name ?? "" }))]}
            value="" onChange={(e) => addShift(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Period (days)" type="number" value={String(r.rotationPeriodDays ?? "")} onChange={(e) => set("rotationPeriodDays", Number(e.target.value))} />
          <Input label="Start date" type="date" value={r.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
            <input type="checkbox" checked={!!r.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" loading={busy}>Save rotation</Button>
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
        <Input placeholder="Search by name or employee IDâ€¦" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="text-xs text-gray-500">{selected.size} selected</div>
        <div className="max-h-80 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
          {employees.loading ? <div className="p-4 text-sm text-gray-500">Loading employeesâ€¦</div>
            : list.length === 0 ? <div className="p-4 text-sm text-gray-400">No employees match.</div>
            : list.map((e) => (
              <label key={e.uid} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={e.uid ? selected.has(e.uid) : false} onChange={() => e.uid && toggle(e.uid)} />
                <span className="font-medium text-gray-800">{e.name || "â€”"}</span>
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
    <Dialog open onClose={onClose} title={`Roster â€” ${rotationName}`} size="xl">
      <div className="space-y-3">
        <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
        {loading ? <div className="p-4 text-sm text-gray-500">Generating rosterâ€¦</div>
          : rows.length === 0 ? <div className="p-6 text-center text-sm text-gray-400">No assigned employees for this rotation, or no roster for this month.</div>
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
