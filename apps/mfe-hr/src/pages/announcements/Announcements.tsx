import { useMemo, useState, type CSSProperties } from "react";
import { Plus, Search, Filter, Calendar, CheckCircle2, Pin, Paperclip, Loader2, AlertCircle, X } from "lucide-react";
import { PageHeader } from "@jaldee/design-system";
import { useEmployees } from "../../services/useEmployees";
import { useAnnouncements, type Announcement } from "../../services/useEngagement";

const TEAL = "var(--primary-color)";
const TYPES = ["Policy", "Event", "Payroll", "General"];
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const field: CSSProperties = { width: "100%", height: 52, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", padding: "0 16px", fontSize: 15, fontWeight: 700, color: "var(--dark-text)" };

function typeColor(t?: string): string {
  switch (t) {
    case "Policy": return "#6366f1";
    case "Event": return "#10b981";
    case "Payroll": return "#f59e0b";
    default: return "#115E59";
  }
}

export default function Announcements() {
  const { data: employees } = useEmployees();
  const ann = useAnnouncements();
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [tracking, setTracking] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", type: "General", endDate: "", isPinned: false, description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return ann.data
      .filter((a) => !q || (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) || (a.type || "").toLowerCase().includes(q))
      .slice().sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [ann.data, search]);

  const post = async () => {
    if (!form.title || !form.description) { setMsg("Title and content are required."); return; }
    setSaving(true); setMsg(null);
    try {
      await ann.create({ title: form.title, description: form.description, type: form.type, startDate: new Date().toISOString(), endDate: form.endDate || null, isPinned: form.isPinned, acknowledgedBy: [] });
      setForm({ title: "", type: "General", endDate: "", isPinned: false, description: "" });
      setAddOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to post."); }
    finally { setSaving(false); }
  };

  return (
    <section className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        <PageHeader
          title="StaffSpace"
          subtitle="Stay updated with the latest company news and policies."
          actions={<button onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> New Announcement</button>}
        />

        {/* SEARCH */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={20} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
            <input placeholder="Search announcements…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...field, height: 64, borderRadius: 28, paddingLeft: 50, background: "var(--surface-bg)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", fontSize: 17 }} />
          </div>
          <button style={{ height: 64, width: 64, borderRadius: 28, border: "none", background: "var(--surface-bg)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", color: "var(--light-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Filter size={24} /></button>
        </div>

        {ann.error && (
          <div style={{ padding: "12px 16px", borderRadius: 14, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> {ann.error}</div>
        )}

        {/* FEED */}
        <div style={{ display: "grid", gap: 28 }}>
          {ann.loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--light-text)", fontWeight: 700 }}><Loader2 size={22} className="animate-spin" style={{ display: "inline" }} /> Loading announcements…</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--light-text)", fontWeight: 700 }}>No announcements yet.</div>
          ) : items.map((a) => {
            const color = typeColor(a.type);
            return (
              <div key={a.id} style={{ background: a.isPinned ? "rgba(17,94,89,0.02)" : "var(--surface-bg)", borderRadius: 36, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: a.isPinned ? "2px solid rgba(17,94,89,0.2)" : "1px solid transparent", display: "flex" }}>
                <div style={{ width: 8, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "32px 36px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                      {a.isPinned && <div style={{ background: "rgba(17,94,89,0.1)", padding: 8, borderRadius: 12, display: "flex" }}><Pin size={16} color={TEAL} fill={TEAL} /></div>}
                      <span style={{ borderRadius: 999, padding: "5px 16px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "white", background: color }}>{a.type || "General"}</span>
                      <span style={{ ...lbl, display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar size={12} /> {a.startDate ? new Date(a.startDate).toLocaleDateString() : "Recently"}</span>
                    </div>
                  </div>
                  <h2 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: "0 0 16px" }}>{a.title}</h2>
                  <p style={{ fontSize: 17, color: "var(--light-text)", fontWeight: 500, lineHeight: 1.6, margin: "0 0 32px" }}>{a.description}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, paddingTop: 28, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ height: 48, width: 48, borderRadius: 16, background: "rgba(17,94,89,0.1)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>A</div>
                      <div><div style={{ ...lbl, color: "var(--dark-text)" }}>Official Update</div><div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 500 }}>Organization Board</div></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, ...lbl, color: "#10b981", marginBottom: 2 }}><CheckCircle2 size={14} /> Acknowledged</div>
                        <span onClick={() => setTracking(a)} style={{ fontSize: 14, fontWeight: 900, color: "var(--light-text)", cursor: "pointer" }}>{a.acknowledgedBy?.length || 0} Staff</span>
                      </div>
                      <button onClick={() => ann.acknowledge(a.id)} style={{ height: 48, padding: "0 30px", borderRadius: 16, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 900, fontSize: 14, boxShadow: "0 8px 18px rgba(17,94,89,0.12)" }}>Acknowledge</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE MODAL */}
      {addOpen && (
        <div style={overlay} onClick={() => setAddOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 820 }}>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "28px 32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><h3 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: 0 }}>Create Announcement</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Post a new update for all employees to see.</p></div>
                <button onClick={() => setAddOpen(false)} style={iconBtn}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div><label style={lbl}>Title</label><input placeholder="Enter a catchy title…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ ...field, marginTop: 6, fontSize: 17 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={lbl}>Category</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...field, marginTop: 6 }}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>Validity (Optional)</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ ...field, marginTop: 6 }} /></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                  <button type="button" style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "2px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><Paperclip size={16} /> Add Attachment</button>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(100,116,139,0.06)", padding: "10px 16px", borderRadius: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} style={{ width: 18, height: 18 }} />
                    <span style={lbl}>Pin to top</span>
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={lbl}>Content</label>
                <textarea placeholder="Write your announcement here…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginTop: 6, flex: 1, minHeight: 200, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", padding: 20, fontSize: 15, fontWeight: 500, color: "var(--dark-text)", resize: "vertical" }} />
              </div>
            </div>
            {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            <div style={{ padding: "20px 28px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setAddOpen(false)} style={ghostBtn}>Cancel</button>
              <button onClick={post} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : "Post Announcement"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {tracking && (
        <div style={overlay} onClick={() => setTracking(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 440 }}>
            <div style={{ padding: "24px 28px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.6px", color: "var(--dark-text)", margin: 0 }}>Acknowledgment Tracking</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Staff who have acknowledged this announcement.</p></div>
              <button onClick={() => setTracking(null)} style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
              {!tracking.acknowledgedBy?.length ? (
                <p style={{ textAlign: "center", color: "var(--light-text)", fontWeight: 500, padding: "32px 0" }}>No one has acknowledged this yet.</p>
              ) : tracking.acknowledgedBy.map((id) => {
                const emp = empMap.get(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 16 }}>
                    <div style={{ height: 40, width: 40, borderRadius: 12, background: "rgba(17,94,89,0.1)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{emp?.name?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 13, color: "var(--dark-text)" }}>{emp?.name || "Unknown Staff"}</div><div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 500 }}>{emp?.designation || "Staff"}</div></div>
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 32, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: "2px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
