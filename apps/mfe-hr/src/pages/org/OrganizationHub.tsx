import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { Briefcase, Layers, MapPinned, ArrowLeftRight, Gauge, Plus, X, Trash2, Pencil, Loader2, AlertCircle, Play } from "lucide-react";
import { PageHeader, Button, Input, Select, Tabs, Textarea } from "@jaldee/design-system";
import { usePositions, useHierarchyLevels, useAreaManagers, useTransfers } from "../../services/useOrg";
import { useEmployees } from "../../services/useEmployees";
import { useBranches } from "../../services/useBranches";
import { useDepartments, useDesignations, useBranchesAdmin, useShifts } from "../../services/useSettingsData";
import { CrudPanel } from "../../components/CrudPanel";
import OrgChartTab from "./OrgChartTab";
import HeadcountDashboardTab from "./HeadcountDashboardTab";

/**
 * W3 / R2.2–R2.6 — org structure admin: positions & sanctioned strength,
 * hierarchy level taxonomy, area-manager↔branch mapping, transfers
 * (schedule → effect), and the branch staff-norms dashboard.
 */

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto" };

type Tab = "chart" | "headcount" | "departments" | "designations" | "branches" | "positions" | "levels" | "areamgr" | "transfers";

function ErrBar({ text }: { text: string }) {
  return (
    <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
      <AlertCircle size={15} /> {text}
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>{footer}</div>
      </div>
    </div>
  );
}

export default function OrgStructure() {
  const [tab, setTab] = useState<Tab>("chart");
  const positions = usePositions();
  const levels = useHierarchyLevels();
  const areaMgrs = useAreaManagers();
  const transfers = useTransfers();
  const departments = useDepartments();
  const designations = useDesignations();
  const branchesAdmin = useBranchesAdmin();
  const shifts = useShifts();
  const { data: employees } = useEmployees();
  const { data: branches } = useBranches();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transferEmp = params.get("transferEmp");
    if (transferEmp) {
      setTab("transfers");
      setTr({ 
        employeeUid: transferEmp, 
        toLocationUid: params.get("toLocation") || "", 
        toDepartmentUid: params.get("toDepartment") || "", 
        toShiftUid: params.get("toShift") || "", 
        toManagerUid: "", effectiveDate: "", reason: "" 
      });
      setTrOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  };

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid.slice(0, 8) : "All branches");
  }, [branches]);

  // position modal
  const [posOpen, setPosOpen] = useState(false);
  const [posEditing, setPosEditing] = useState<string | null>(null);
  const [pos, setPos] = useState({ designationUid: "", departmentUid: "", shiftUid: "", locationUid: "", sanctionedCount: "" });

  const designationName = useMemo(() => {
    const m = new Map(designations.data.map(d => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Unknown");
  }, [designations.data]);

  const departmentName = useMemo(() => {
    const m = new Map(departments.data.map(d => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Any / Global");
  }, [departments.data]);

  const shiftName = useMemo(() => {
    const m = new Map(shifts.data.map(s => [s.id, s.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Any Shift");
  }, [shifts.data]);

  // level modal
  const [lvlOpen, setLvlOpen] = useState(false);
  const [lvlEditing, setLvlEditing] = useState<string | null>(null);
  const [lvl, setLvl] = useState({ levelNo: "", label: "" });

  // area manager modal
  const [amOpen, setAmOpen] = useState(false);
  const [am, setAm] = useState({ managerEmployeeUid: "", locationUid: "" });

  // transfer modal
  const [trOpen, setTrOpen] = useState(false);
  const [tr, setTr] = useState({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" });

  const tabs: { k: Tab; label: string; icon: ReactNode }[] = [
    { k: "chart", label: "Org Chart", icon: <MapPinned size={14} /> },
    { k: "headcount", label: "Headcount & Norms", icon: <Gauge size={14} /> },
    { k: "departments", label: "Departments", icon: <Briefcase size={14} /> },
    { k: "designations", label: "Job Roles (Designations)", icon: <Briefcase size={14} /> },
    { k: "branches", label: "Branches", icon: <MapPinned size={14} /> },
    { k: "positions", label: "Headcount Planning (Seats)", icon: <Briefcase size={14} /> },
    { k: "levels", label: "Seniority Bands (Levels)", icon: <Layers size={14} /> },
    { k: "areamgr", label: "Branch Assignments", icon: <MapPinned size={14} /> },
    { k: "transfers", label: "Transfers", icon: <ArrowLeftRight size={14} /> },
  ];

  return (
    <section className="page-section active" style={{ overflowY: "auto", padding: "28px 32px", background: "var(--app-bg)" }}>
      <div style={{ marginBottom: 20 }}>
        <PageHeader title="Org Structure" subtitle="Positions, seniority levels, branch coverage, transfers & norms" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setMsg(null); }} items={tabs.map((t) => ({ value: t.k, label: t.label }))} />
      </div>

      {msg && <ErrBar text={msg} />}

      {tab === "chart" && <OrgChartTab />}
      {tab === "headcount" && <HeadcountDashboardTab onRequestTransfer={(loc, dept, shift) => {
        setTab("transfers");
        setTr({ employeeUid: "", toLocationUid: loc === "global_branch" ? "" : loc, toDepartmentUid: dept === "global_dept" ? "" : dept, toShiftUid: shift === "global_shift" ? "" : shift, toManagerUid: "", effectiveDate: "", reason: "" });
        setTrOpen(true);
      }} />}

      {tab === "departments" && (
        <CrudPanel title="Departments" subtitle="Organizational units" icon={<Briefcase size={20} />} addLabel="Add Department" hook={departments}
          fields={[{ key: "name", label: "Department Name" }, { key: "code", label: "Code" }]}
          columns={[{ label: "Name", render: (r) => <b>{r.name as string}</b> }, { label: "Code", render: (r) => (r.code as string) || "—" }]} />
      )}

      {tab === "designations" && (
        <CrudPanel title="Roles & Designations" subtitle="Job roles / titles, bands & owning department" icon={<Briefcase size={20} />} addLabel="Add Role / Designation" hook={designations}
          fields={[
            { key: "name", label: "Role / Designation" }, { key: "code", label: "Code" },
            { key: "department", label: "Department", type: "select", options: departments.data.map((d) => (d.name as string)).filter(Boolean) },
            { key: "level", label: "Level / Band", type: "number" },
            { key: "description", label: "Description", type: "textarea", full: true },
          ]}
          columns={[
            { label: "Role / Designation", render: (r) => <b>{r.name as string}</b> },
            { label: "Code", render: (r) => (r.code as string) || "—" },
            { label: "Department", render: (r) => (r.department as string) || "—" },
            { label: "Level", render: (r) => r.level != null ? `L${r.level}` : "—" },
          ]} />
      )}

      {tab === "branches" && (
        <CrudPanel title="Branches" subtitle="Office locations (from Jaldee base)" icon={<MapPinned size={20} />} addLabel="Add Branch" hook={branchesAdmin}
          readOnly={branchesAdmin.readOnlyNote}
          fields={[]}
          columns={[
            { label: "Name", render: (r) => <b>{r.name as string}</b> },
            { label: "Address", render: (r) => (r.address as string) || "—" },
            { label: "Coordinates", render: (r) => r.latitude != null ? `${r.latitude}, ${r.longitude}` : "—" },
          ]} />
      )}

      {/* ===== POSITIONS (R2.4) ===== */}
      {tab === "positions" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={lbl}>Seats (Headcount) allocated per Job Role across Branches, Departments, and Shifts</span>
            <Button icon={<Plus size={15} />} onClick={() => { setPosEditing(null); setPos({ designationUid: "", departmentUid: "", shiftUid: "", locationUid: "", sanctionedCount: "" }); setPosOpen(true); }}>Allocate Headcount</Button>
          </div>
          {positions.error && <ErrBar text={positions.error} />}
          <div style={card}>
            {positions.loading ? <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Job Role</th><th style={th}>Branch</th><th style={th}>Department</th><th style={th}>Shift</th><th style={th}>Sanctioned</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {positions.data.length === 0 ? <tr><td colSpan={6} style={{ ...td, textAlign: "center", ...lbl, padding: 32 }}>No headcount allocated.</td></tr>
                    : positions.data.map((p) => (
                      <tr key={p.id}>
                        <td style={{ ...td, fontWeight: 800 }}>{designationName(p.designationUid)}</td>
                        <td style={td}>{branchName(p.locationUid)}</td>
                        <td style={td}>{departmentName(p.departmentUid)}</td>
                        <td style={td}>{shiftName(p.shiftUid)}</td>
                        <td style={{ ...td, fontWeight: 800, color: TEAL }}>{p.sanctionedCount ?? "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <Button variant="ghost" size="icon" onClick={() => { setPosEditing(p.id); setPos({ designationUid: p.designationUid || "", departmentUid: p.departmentUid || "", shiftUid: p.shiftUid || "", locationUid: p.locationUid || "", sanctionedCount: p.sanctionedCount != null ? String(p.sanctionedCount) : "" }); setPosOpen(true); }}><Pencil size={15} /></Button>
                          <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this allocated seat?")) void act(() => positions.remove(p.id)); }}><Trash2 size={15} /></Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== LEVELS (R2.3) ===== */}
      {tab === "levels" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={lbl}>Labels for employee hierarchy levels (e.g. 3 = Sales Head) — used by org chart & approval routing</span>
            <Button icon={<Plus size={15} />} onClick={() => { setLvlEditing(null); setLvl({ levelNo: "", label: "" }); setLvlOpen(true); }}>Add Level</Button>
          </div>
          {levels.error && <ErrBar text={levels.error} />}
          <div style={card}>
            {levels.loading ? <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Level</th><th style={th}>Label</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {levels.data.length === 0 ? <tr><td colSpan={3} style={{ ...td, textAlign: "center", ...lbl, padding: 32 }}>No levels defined.</td></tr>
                    : levels.data.map((l) => (
                      <tr key={l.id}>
                        <td style={{ ...td, fontWeight: 900, color: TEAL }}>L{l.levelNo}</td>
                        <td style={{ ...td, fontWeight: 800 }}>{l.label}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <Button variant="ghost" size="icon" onClick={() => { setLvlEditing(l.id); setLvl({ levelNo: String(l.levelNo ?? ""), label: l.label || "" }); setLvlOpen(true); }}><Pencil size={15} /></Button>
                          <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this level label?")) void act(() => levels.remove(l.id)); }}><Trash2 size={15} /></Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== BRANCH ASSIGNMENTS (R2.2) ===== */}
      {tab === "areamgr" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={lbl}>Map employees to branches — feeds dashboards & approval routing</span>
            <Button icon={<Plus size={15} />} onClick={() => { setAm({ managerEmployeeUid: "", locationUid: "" }); setAmOpen(true); }}>Map Employee</Button>
          </div>
          {areaMgrs.error && <ErrBar text={areaMgrs.error} />}
          <div style={card}>
            {areaMgrs.loading ? <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Employee</th><th style={th}>Branch</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {areaMgrs.data.length === 0 ? <tr><td colSpan={3} style={{ ...td, textAlign: "center", ...lbl, padding: 32 }}>No mappings yet.</td></tr>
                    : areaMgrs.data.map((m) => (
                      <tr key={m.id}>
                        <td style={{ ...td, fontWeight: 800 }}>{m.managerName || m.managerEmployeeUid}</td>
                        <td style={td}>{branchName(m.locationUid)}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Remove this mapping?")) void act(() => areaMgrs.remove(m.id)); }}><Trash2 size={15} /></Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== TRANSFERS (R2.5) ===== */}
      {tab === "transfers" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={lbl}>Schedule branch/department/shift moves; effecting updates the employee record</span>
            <Button icon={<Plus size={15} />} onClick={() => { setTr({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" }); setTrOpen(true); }}>Schedule Transfer</Button>
          </div>
          {transfers.error && <ErrBar text={transfers.error} />}
          <div style={card}>
            {transfers.loading ? <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Employee</th><th style={th}>Changes</th><th style={th}>Effective</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {transfers.data.length === 0 ? <tr><td colSpan={5} style={{ ...td, textAlign: "center", ...lbl, padding: 32 }}>No transfers.</td></tr>
                    : transfers.data.map((t) => {
                      const c = t.status === "Effected" ? "#059669" : t.status === "Cancelled" ? "#64748b" : "#d97706";
                      const changes = [];
                      if (t.toLocationUid) changes.push(`Branch ➔ ${branchName(t.toLocationUid)}`);
                      if (t.toDepartmentUid) changes.push(`Dept ➔ ${departmentName(t.toDepartmentUid)}`);
                      if (t.toShiftUid) changes.push(`Shift ➔ ${shiftName(t.toShiftUid)}`);
                      if (t.toManagerUid) changes.push(`Mgr ➔ ${t.toManagerName || t.toManagerUid}`);
                      
                      return (
                        <tr key={t.id}>
                          <td style={{ ...td, fontWeight: 800 }}>{t.employeeName || t.employeeUid}</td>
                          <td style={td}>{changes.length > 0 ? changes.join(", ") : "—"}</td>
                          <td style={td}>{t.effectiveDate}</td>
                          <td style={td}><span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{t.status}</span></td>
                          <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                            {t.status === "Scheduled" && (
                              <>
                                <Button variant="ghost" size="icon" title="Effect now" disabled={busy} onClick={() => act(() => transfers.effect(t.id))}><Play size={15} /></Button>
                                <Button variant="ghost" size="icon" title="Cancel" style={{ color: "#e11d48" }} disabled={busy} onClick={() => { if (confirm("Cancel this transfer?")) void act(() => transfers.cancel(t.id)); }}><X size={15} /></Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      {posOpen && (
        <Modal title={posEditing ? "Edit Headcount Seat" : "Allocate Headcount Seat"} onClose={() => setPosOpen(false)}
          footer={<>
            <Button variant="secondary" onClick={() => setPosOpen(false)}>Cancel</Button>
            <Button disabled={busy || !pos.designationUid || !pos.locationUid || !pos.sanctionedCount} loading={busy} onClick={() => act(async () => {
              const payload = { designationUid: pos.designationUid, departmentUid: pos.departmentUid || null, shiftUid: pos.shiftUid || null, locationUid: pos.locationUid, sanctionedCount: Number(pos.sanctionedCount) };
              if (posEditing) await positions.update(posEditing, payload); else await positions.create(payload);
              setPosOpen(false);
            })}>{posEditing ? "Save" : "Create"}</Button>
          </>}>
          <Select label="Job Role (Designation)" value={pos.designationUid} onChange={(e) => setPos({ ...pos, designationUid: e.target.value })}
            options={[{ value: "", label: "Select Job Role..." }, ...designations.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="Branch" value={pos.locationUid} onChange={(e) => setPos({ ...pos, locationUid: e.target.value })}
            options={[{ value: "", label: "Select Branch..." }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <Select label="Department (Optional)" value={pos.departmentUid} onChange={(e) => setPos({ ...pos, departmentUid: e.target.value })}
            options={[{ value: "", label: "Global / Multi-department" }, ...departments.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="Shift (Optional)" value={pos.shiftUid} onChange={(e) => setPos({ ...pos, shiftUid: e.target.value })}
            options={[{ value: "", label: "Any Shift" }, ...shifts.data.map((s) => ({ value: s.id, label: String(s.name) }))]} />
          <Input label="Sanctioned Count" type="number" value={pos.sanctionedCount} onChange={(e) => setPos({ ...pos, sanctionedCount: e.target.value })} />
        </Modal>
      )}

      {lvlOpen && (
        <Modal title={lvlEditing ? "Edit Level" : "Add Level"} onClose={() => setLvlOpen(false)}
          footer={<>
            <Button variant="secondary" onClick={() => setLvlOpen(false)}>Cancel</Button>
            <Button disabled={busy || !lvl.label.trim() || !lvl.levelNo} loading={busy} onClick={() => act(async () => {
              const payload = { levelNo: Number(lvl.levelNo), label: lvl.label.trim() };
              if (lvlEditing) await levels.update(lvlEditing, payload); else await levels.create(payload);
              setLvlOpen(false);
            })}>{lvlEditing ? "Save" : "Create"}</Button>
          </>}>
          <Input label="Level Number" type="number" value={lvl.levelNo} onChange={(e) => setLvl({ ...lvl, levelNo: e.target.value })} placeholder="matches employee hierarchyLevel" />
          <Input label="Label" value={lvl.label} onChange={(e) => setLvl({ ...lvl, label: e.target.value })} placeholder="e.g. Business Head" />
        </Modal>
      )}

      {amOpen && (
        <Modal title="Map Employee to Branch" onClose={() => setAmOpen(false)}
          footer={<>
            <Button variant="secondary" onClick={() => setAmOpen(false)}>Cancel</Button>
            <Button disabled={busy || !am.managerEmployeeUid || !am.locationUid} loading={busy} onClick={() => act(async () => {
              await areaMgrs.create({ managerEmployeeUid: am.managerEmployeeUid, locationUid: am.locationUid });
              setAmOpen(false);
            })}>Save</Button>
          </>}>
          <Select label="Employee" value={am.managerEmployeeUid} onChange={(e) => setAm({ ...am, managerEmployeeUid: e.target.value })}
            options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Select label="Branch" value={am.locationUid} onChange={(e) => setAm({ ...am, locationUid: e.target.value })}
            options={[{ value: "", label: "Select branch" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        </Modal>
      )}

      {trOpen && (
        <Modal title="Schedule Transfer" onClose={() => setTrOpen(false)}
          footer={<>
            <Button variant="secondary" onClick={() => setTrOpen(false)}>Cancel</Button>
            <Button disabled={busy || !tr.employeeUid || !tr.effectiveDate || (!tr.toLocationUid && !tr.toManagerUid && !tr.toDepartmentUid && !tr.toShiftUid)} loading={busy} onClick={() => act(async () => {
              await transfers.create({
                employeeUid: tr.employeeUid, 
                toLocationUid: tr.toLocationUid || null, 
                toDepartmentUid: tr.toDepartmentUid || null,
                toShiftUid: tr.toShiftUid || null,
                toManagerUid: tr.toManagerUid || null,
                effectiveDate: tr.effectiveDate, reason: tr.reason || null,
              });
              setTrOpen(false);
            })}>Schedule</Button>
          </>}>
          <Select label="Employee to Transfer" value={tr.employeeUid} onChange={(e) => setTr({ ...tr, employeeUid: e.target.value })}
            options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Select label="To Branch (optional)" value={tr.toLocationUid} onChange={(e) => setTr({ ...tr, toLocationUid: e.target.value })}
            options={[{ value: "", label: "No branch change" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <Select label="To Department (optional)" value={tr.toDepartmentUid} onChange={(e) => setTr({ ...tr, toDepartmentUid: e.target.value })}
            options={[{ value: "", label: "No department change" }, ...departments.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="To Shift (optional)" value={tr.toShiftUid} onChange={(e) => setTr({ ...tr, toShiftUid: e.target.value })}
            options={[{ value: "", label: "No shift change" }, ...shifts.data.map((s) => ({ value: s.id, label: String(s.name) }))]} />
          <Select label="To Manager (optional)" value={tr.toManagerUid} onChange={(e) => setTr({ ...tr, toManagerUid: e.target.value })}
            options={[{ value: "", label: "No manager change" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Input label="Effective Date" type="date" value={tr.effectiveDate} onChange={(e) => setTr({ ...tr, effectiveDate: e.target.value })} />
          <Textarea label="Reason" rows={3} value={tr.reason} onChange={(e) => setTr({ ...tr, reason: e.target.value })} />
        </Modal>
      )}
    </section>
  );
}
