import { useMemo, useState, type CSSProperties } from "react";
import { Package, Plus, X, AlertCircle, Loader2, History, Undo2, UserPlus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, Button, Input, Select, Textarea } from "@jaldee/design-system";
import { useAssets, type Asset, type AssetAllocation, type AssetStatus } from "../../services/useAssets";
import { useEmployees } from "../../services/useEmployees";
import { useShellErrorToast } from "../../services/useShellFeedback";

/**
 * W9 / R9.1 — asset register: create/edit assets, allocate to an employee
 * (only when Available — double allocation is impossible), return/write-off,
 * and per-asset history. Unreturned assets block exit completion (R6.2).
 */

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "88vh", overflowY: "auto" };

const STATUS_COLORS: Record<string, string> = {
  Available: "#059669", Allocated: "#2563eb", UnderRepair: "#d97706", Lost: "#e11d48", Retired: "#64748b",
};
const ASSET_TYPES = ["Laptop", "Desktop", "Monitor", "Phone", "SIM", "ID Card", "Access Card", "Vehicle", "Furniture", "Other"];

function Pill({ s }: { s?: string }) {
  const c = STATUS_COLORS[s || ""] || "#64748b";
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{s || "—"}</span>;
}

const EMPTY_FORM = { assetType: "Laptop", name: "", tagNumber: "", serialNumber: "", assetValue: "", ownerDepartment: "", accountsRef: "", notes: "" };

export default function Assets() {
  const assets = useAssets();
  const { data: employees } = useEmployees();
  useShellErrorToast("hr.assets", "Assets", assets.error);

  const [filter, setFilter] = useState<"all" | AssetStatus>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // add/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // allocate modal
  const [allocFor, setAllocFor] = useState<Asset | null>(null);
  const [allocEmp, setAllocEmp] = useState("");
  const [allocCond, setAllocCond] = useState("");

  // history drawer
  const [histFor, setHistFor] = useState<Asset | null>(null);
  const [hist, setHist] = useState<AssetAllocation[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const rows = useMemo(() => assets.data.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || [a.name, a.assetType, a.tagNumber, a.serialNumber, a.holderEmployeeName]
      .some((v) => (v || "").toLowerCase().includes(q));
  }), [assets.data, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    assets.data.forEach((a) => { c[a.status || "?"] = (c[a.status || "?"] || 0) + 1; });
    return c;
  }, [assets.data]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  };

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setMsg(null); setFormOpen(true); };
  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      assetType: a.assetType || "Other", name: a.name || "", tagNumber: a.tagNumber || "",
      serialNumber: a.serialNumber || "", assetValue: a.assetValue != null ? String(a.assetValue) : "",
      ownerDepartment: a.ownerDepartment || "", accountsRef: a.accountsRef || "", notes: a.notes || "",
    });
    setMsg(null); setFormOpen(true);
  };

  const saveForm = () => act(async () => {
    if (!form.name.trim()) throw new Error("Asset name is required.");
    const payload = {
      assetType: form.assetType, name: form.name.trim(), tagNumber: form.tagNumber || null,
      serialNumber: form.serialNumber || null, assetValue: form.assetValue ? Number(form.assetValue) : null,
      ownerDepartment: form.ownerDepartment || null, accountsRef: form.accountsRef || null, notes: form.notes || null,
    };
    if (editing) await assets.update(editing.id, payload); else await assets.create(payload);
    setFormOpen(false);
  });

  const openHistory = async (a: Asset) => {
    setHistFor(a); setHist([]); setHistLoading(true);
    try { setHist(await assets.history(a.id)); } catch { setHist([]); }
    finally { setHistLoading(false); }
  };

  return (
    <section className="page-section active" style={{ overflowY: "auto", padding: "28px 32px", background: "var(--app-bg)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <PageHeader title="Assets" subtitle="Registry, allocation & returns — coordinated with Accounts" />
        <Button onClick={openAdd} icon={<Plus size={16} />}>Register Asset</Button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ width: 300, maxWidth: "100%" }}>
          <Input placeholder="Search name, tag, serial, holder…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(["all", "Available", "Allocated", "UnderRepair", "Lost", "Retired"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 800, border: filter === s ? `1px solid ${TEAL}` : "1px solid var(--border-color)", background: filter === s ? "rgba(17,94,89,0.08)" : "var(--surface-bg)", color: filter === s ? TEAL : "var(--dark-text)" }}>
            {s === "all" ? `All (${assets.data.length})` : `${s} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {(assets.error || msg) && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 14, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {msg || assets.error}
        </div>
      )}

      <div style={card}>
        {assets.loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={20} className="animate-spin" style={{ display: "inline" }} /></div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--light-text)" }}>
            <Package size={40} strokeWidth={1.2} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={lbl}>No assets {filter !== "all" ? `with status ${filter}` : "registered yet"}</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Asset</th><th style={th}>Tag / Serial</th><th style={th}>Status</th>
              <th style={th}>Holder</th><th style={th}>Dept / Accounts Ref</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td style={td}><b>{a.name}</b><div style={{ ...lbl, fontSize: 8.5, marginTop: 2 }}>{a.assetType}{a.assetValue != null ? ` · ₹${a.assetValue}` : ""}</div></td>
                  <td style={td}>{a.tagNumber || "—"}<div style={{ ...lbl, fontSize: 8.5, marginTop: 2 }}>{a.serialNumber || ""}</div></td>
                  <td style={td}><Pill s={a.status} /></td>
                  <td style={td}>{a.holderEmployeeName ? <><b>{a.holderEmployeeName}</b><div style={{ ...lbl, fontSize: 8.5, marginTop: 2 }}>since {a.issuedOn}</div></> : "—"}</td>
                  <td style={td}>{a.ownerDepartment || "—"}<div style={{ ...lbl, fontSize: 8.5, marginTop: 2 }}>{a.accountsRef || ""}</div></td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    {a.status === "Available" && (
                      <Button variant="ghost" size="icon" title="Allocate" onClick={() => { setAllocFor(a); setAllocEmp(""); setAllocCond(""); setMsg(null); }}><UserPlus size={15} /></Button>
                    )}
                    {a.status === "Allocated" && (
                      <Button variant="ghost" size="icon" title="Return" disabled={busy} onClick={() => act(() => assets.returnAsset(a.id))}><Undo2 size={15} /></Button>
                    )}
                    <Button variant="ghost" size="icon" title="History" onClick={() => void openHistory(a)}><History size={15} /></Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(a)}><Pencil size={15} /></Button>
                    <Button variant="ghost" size="icon" title="Delete" style={{ color: "#e11d48" }}
                      onClick={() => { if (confirm("Delete this asset?")) void act(() => assets.remove(a.id)); }}><Trash2 size={15} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== ADD / EDIT ===== */}
      {formOpen && (
        <div style={overlay} onClick={() => setFormOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit Asset" : "Register Asset"}</h3>
              <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Select label="Type" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })} options={ASSET_TYPES.map((t) => ({ value: t, label: t }))} />
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. MacBook Pro 14" />
              <Input label="Tag Number" value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} />
              <Input label="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              <Input label="Value" type="number" value={form.assetValue} onChange={(e) => setForm({ ...form, assetValue: e.target.value })} />
              <Input label="Owner Department" value={form.ownerDepartment} onChange={(e) => setForm({ ...form, ownerDepartment: e.target.value })} />
              <Input label="Accounts Ref" value={form.accountsRef} onChange={(e) => setForm({ ...form, accountsRef: e.target.value })} placeholder="External asset ID" />
              <div style={{ gridColumn: "1 / -1" }}>
                <Textarea label="Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {msg && <div style={{ gridColumn: "1 / -1", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
            <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={saveForm} disabled={busy} loading={busy}>{editing ? "Save" : "Register"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ALLOCATE ===== */}
      {allocFor && (
        <div style={overlay} onClick={() => setAllocFor(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Allocate — {allocFor.name}</h3>
              <button onClick={() => setAllocFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <Select label="Employee" value={allocEmp} onChange={(e) => setAllocEmp(e.target.value)}
                options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
              <Input label="Condition at Issue" value={allocCond} onChange={(e) => setAllocCond(e.target.value)} placeholder="e.g. New, minor scratches…" />
              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
            <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button variant="secondary" onClick={() => setAllocFor(null)}>Cancel</Button>
              <Button disabled={busy || !allocEmp} loading={busy}
                onClick={() => act(async () => { await assets.allocate(allocFor.id, allocEmp, allocCond); setAllocFor(null); })}>
                Allocate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {histFor && (
        <div style={overlay} onClick={() => setHistFor(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>History — {histFor.name}</h3>
              <button onClick={() => setHistFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              {histLoading ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--light-text)" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
              ) : hist.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--light-text)", fontSize: 13 }}>Never allocated.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {hist.map((h) => (
                    <div key={h.id} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <b style={{ fontSize: 13 }}>{h.employeeName || h.employeeUid}</b>
                        <span style={{ ...lbl }}>{h.issuedOn} → {h.returnedOn || "in use"}</span>
                      </div>
                      {(h.issueCondition || h.returnCondition) && (
                        <div style={{ ...lbl, fontSize: 9, marginTop: 4 }}>
                          {h.issueCondition ? `Issued: ${h.issueCondition}` : ""}{h.issueCondition && h.returnCondition ? " · " : ""}{h.returnCondition ? `Returned: ${h.returnCondition}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
