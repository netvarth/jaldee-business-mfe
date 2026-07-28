import { useState, type CSSProperties } from "react";
import { GitBranch, Plus, Pencil, Trash2, Loader2, X, ArrowDown } from "lucide-react";
import { Button, Input, Select } from "@jaldee/design-system";
import {
  useApprovalChains, RESOLVER_LABELS,
  type ApprovalChain, type ApprovalChainStep, type ApprovalRequestType, type ApproverResolverType,
} from "../../services/useApprovals";
import { useEmployees } from "../../services/useEmployees";
import { PanelHeader } from "./SettingsComponents";

const TEAL = "var(--primary-color)";
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20 };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", boxShadow: "var(--shadow-lg, 0 20px 50px rgba(0,0,0,0.2))" };

const REQUEST_TYPES: { value: ApprovalRequestType; label: string; wired: boolean }[] = [
  { value: "LEAVE", label: "Leave", wired: true },
  { value: "EXPENSE", label: "Expense (coming soon)", wired: false },
  { value: "EXIT", label: "Separation (coming soon)", wired: false },
  { value: "ON_DUTY", label: "On-duty (coming soon)", wired: false },
  { value: "COMP_OFF", label: "Comp-off (coming soon)", wired: false },
];

const EMPTY_STEP: ApprovalChainStep = { stepOrder: 1, resolverType: "REPORTING_MANAGER", resolverValue: null };

export default function ApprovalsPanel() {
  const chains = useApprovalChains();
  const { data: employees } = useEmployees();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalChain | null>(null);
  const [name, setName] = useState("");
  const [requestType, setRequestType] = useState<ApprovalRequestType>("LEAVE");
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<ApprovalChainStep[]>([{ ...EMPTY_STEP }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const empName = (uid?: string | null) => employees.find((e) => e.id === uid)?.name || uid || "—";

  const openAdd = () => {
    setEditing(null); setName(""); setRequestType("LEAVE"); setActive(true);
    setSteps([{ ...EMPTY_STEP }]); setMsg(null); setOpen(true);
  };
  const openEdit = (c: ApprovalChain) => {
    setEditing(c); setName(c.name); setRequestType(c.requestType); setActive(c.active);
    setSteps(c.steps.length ? c.steps.map((s) => ({ ...s })) : [{ ...EMPTY_STEP }]);
    setMsg(null); setOpen(true);
  };

  const setStep = (i: number, patch: Partial<ApprovalChainStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () => setSteps((prev) => [...prev, { ...EMPTY_STEP, stepOrder: prev.length + 1 }]);
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim()) { setMsg("Chain name is required."); return; }
    for (const [i, s] of steps.entries()) {
      if (s.resolverType === "NAMED_EMPLOYEE" && !s.resolverValue) { setMsg(`Step ${i + 1}: pick an employee.`); return; }
      if (s.resolverType === "HIERARCHY_LEVEL" && !/^\d+$/.test(s.resolverValue || "")) { setMsg(`Step ${i + 1}: level must be a number.`); return; }
    }
    setSaving(true); setMsg(null);
    const payload = {
      requestType, name: name.trim(), active,
      steps: steps.map((s, i) => ({
        stepOrder: i + 1,
        resolverType: s.resolverType,
        resolverValue: s.resolverType === "REPORTING_MANAGER" ? null : s.resolverValue,
      })),
    };
    try {
      if (editing) await chains.update(editing.id, payload); else await chains.create(payload);
      setOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  };

  const stepSummary = (c: ApprovalChain) =>
    c.steps.map((s) =>
      s.resolverType === "REPORTING_MANAGER" ? "Manager"
        : s.resolverType === "NAMED_EMPLOYEE" ? empName(s.resolverValue)
        : `Level ${s.resolverValue}`
    ).join(" → ") || "—";

  return (
    <div>
      <PanelHeader
        title="Approval Chains"
        subtitle="Ordered multi-level approval per request type • no chain = single-step (reporting manager)"
        icon={<GitBranch size={20} />}
        action={
          <Button onClick={openAdd} icon={<Plus size={16} />} className="whitespace-nowrap shrink-0">Add Chain</Button>
        }
      />

      {chains.error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.2)", color: "#e11d48", fontSize: 12.5, fontWeight: 600 }}>
          {chains.error}
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        {chains.loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
        ) : chains.data.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--light-text)", fontSize: 13 }}>
            No approval chains configured. Requests use the legacy single-step approval until a chain is added.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...lbl, textAlign: "left", padding: "11px 16px", background: "rgba(100,116,139,0.04)" }}>Name</th>
              <th style={{ ...lbl, textAlign: "left", padding: "11px 16px", background: "rgba(100,116,139,0.04)" }}>Type</th>
              <th style={{ ...lbl, textAlign: "left", padding: "11px 16px", background: "rgba(100,116,139,0.04)" }}>Steps</th>
              <th style={{ ...lbl, textAlign: "left", padding: "11px 16px", background: "rgba(100,116,139,0.04)" }}>Active</th>
              <th style={{ ...lbl, textAlign: "right", padding: "11px 16px", background: "rgba(100,116,139,0.04)" }}>Actions</th>
            </tr></thead>
            <tbody>
              {chains.data.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 800, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" }}>{c.name}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ ...lbl, border: "1px solid var(--border-color)", borderRadius: 8, padding: "3px 8px" }}>{c.requestType}</span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" }}>{stepSummary(c)}</td>
                  <td style={{ padding: "13px 16px", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ ...lbl, color: c.active ? "#059669" : "var(--light-text)" }}>{c.active ? "Active" : "Off"}</span>
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "right", borderTop: "1px solid var(--border-color)" }}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit"><Pencil size={15} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this chain? In-flight requests keep their existing steps.")) chains.remove(c.id); }} title="Delete" style={{ color: "#e11d48" }}><Trash2 size={15} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit Chain" : "Add Approval Chain"}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Chain Name" placeholder="e.g. Two-level leave approval" value={name} onChange={(e) => setName(e.target.value)} />
                <Select label="Request Type" value={requestType} onChange={(e) => setRequestType(e.target.value as ApprovalRequestType)}
                  options={REQUEST_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--dark-text)", cursor: "pointer" }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (routes new decisions through this chain)
              </label>

              <div>
                <div style={{ ...lbl, marginBottom: 8 }}>Steps (in order)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {steps.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 12 }}>
                        <span style={{ ...lbl, width: 44, flexShrink: 0 }}>L{i + 1}</span>
                        <div style={{ width: 190, flexShrink: 0 }}>
                          <Select value={s.resolverType} onChange={(e) => setStep(i, { resolverType: e.target.value as ApproverResolverType, resolverValue: null })}
                            options={(Object.keys(RESOLVER_LABELS) as ApproverResolverType[]).map((k) => ({ value: k, label: RESOLVER_LABELS[k] }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          {s.resolverType === "NAMED_EMPLOYEE" && (
                            <Select value={s.resolverValue ?? ""} onChange={(e) => setStep(i, { resolverValue: e.target.value })}
                              options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
                          )}
                          {s.resolverType === "HIERARCHY_LEVEL" && (
                            <Input type="number" placeholder="Level (e.g. 2)" value={s.resolverValue ?? ""} onChange={(e) => setStep(i, { resolverValue: e.target.value })} />
                          )}
                          {s.resolverType === "REPORTING_MANAGER" && (
                            <span style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 600 }}>Resolved per requester at decision time</span>
                          )}
                        </div>
                        {steps.length > 1 && (
                          <button onClick={() => removeStep(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e11d48" }} title="Remove step"><Trash2 size={15} /></button>
                        )}
                      </div>
                      {i < steps.length - 1 && <div style={{ display: "flex", justifyContent: "center", padding: 2, color: "var(--light-text)" }}><ArrowDown size={13} /></div>}
                    </div>
                  ))}
                </div>
                <Button variant="secondary" onClick={addStep} icon={<Plus size={14} />} style={{ marginTop: 10 }}>Add Step</Button>
              </div>

              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>

            <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} loading={saving}>{editing ? "Save Chain" : "Create Chain"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

