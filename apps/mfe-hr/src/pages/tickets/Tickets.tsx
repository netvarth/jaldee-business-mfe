import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Paperclip, Loader2, X } from "lucide-react";
import { PageHeader } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useTickets, type Ticket } from "../../services/useEngagement";

const TEAL = "var(--primary-color)";
const CATEGORIES = ["Payroll", "IT Support", "HR Policy", "Admin/Facility"];
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const field: CSSProperties = { width: "100%", height: 52, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", padding: "0 16px", fontSize: 15, fontWeight: 700, color: "var(--dark-text)" };

function statusBar(s?: string): string {
  if (s === "Open") return "#3b82f6";
  if (s === "In Progress") return "#f59e0b";
  return "#10b981";
}
function statusBadge(s?: string): { bg: string; icon: ReactNode } {
  if (s === "Resolved") return { bg: "#10b981", icon: <CheckCircle2 size={12} /> };
  if (s === "In Progress") return { bg: "#f59e0b", icon: <Clock size={12} /> };
  return { bg: "#3b82f6", icon: <AlertCircle size={12} /> };
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <div style={{ background: "var(--surface-bg)", borderRadius: 28, padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ height: 48, width: 48, borderRadius: 16, background: `${tone}1a`, color: tone, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
      <p style={{ ...lbl, marginBottom: 4 }}>{label}</p>
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", color: "var(--dark-text)" }}>{value}</div>
    </div>
  );
}

export default function Tickets() {
  const { eventBus } = useMFEProps();
  const { data: employees } = useEmployees();
  const tickets = useTickets();

  useEffect(() => {
    if (tickets.error) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Helpdesk",
        message: tickets.error,
      });
    }
  }, [tickets.error, eventBus]);
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  const empName = (uid?: string) => (uid ? empMap.get(uid)?.name ?? "Staff" : "Staff");

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [form, setForm] = useState({ employeeUid: "", title: "", category: "Payroll", priority: "Medium", description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const counts = useMemo(() => ({
    open: tickets.data.filter((t) => t.status === "Open").length,
    progress: tickets.data.filter((t) => t.status === "In Progress").length,
    resolved: tickets.data.filter((t) => t.status === "Resolved").length,
    total: tickets.data.length,
  }), [tickets.data]);

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.data.filter((t) => !q || (t.title || "").toLowerCase().includes(q) || (t.id || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q));
  }, [tickets.data, search]);

  const raise = async () => {
    if (!form.employeeUid || !form.title || !form.description) { setMsg("Employee, subject and description are required."); return; }
    setSaving(true); setMsg(null);
    try {
      await tickets.create({ employeeUid: form.employeeUid, title: form.title, category: form.category, description: form.description, department: form.category.toUpperCase(), status: "Open", responses: [] });
      setForm({ employeeUid: "", title: "", category: "Payroll", priority: "Medium", description: "" });
      setAddOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to raise ticket."); }
    finally { setSaving(false); }
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await tickets.reply(selected.id, replyText.trim());
      setReplyText("");
      // refresh selected from reloaded data
      const fresh = tickets.data.find((t) => t.id === selected.id);
      if (fresh) setSelected(fresh);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Reply failed."); }
    finally { setReplying(false); }
  };

  // keep selected in sync after reloads
  const liveSelected = selected ? tickets.data.find((t) => t.id === selected.id) ?? selected : null;

  return (
    <section id="hr-tickets-page" data-testid="hr-tickets-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <PageHeader
          title="HR Helpdesk"
          subtitle="Raise and track your HR or admin-related issues."
          actions={<button id="hr-tickets-create-button" data-testid="hr-tickets-create-button" onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Raise New Ticket</button>}
        />

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24 }}>
          <StatCard label="Open Tickets" value={counts.open} tone="#3b82f6" icon={<AlertCircle size={24} />} />
          <StatCard label="In Progress" value={counts.progress} tone="#f59e0b" icon={<Clock size={24} />} />
          <StatCard label="Resolved (MTD)" value={counts.resolved} tone="#10b981" icon={<CheckCircle2 size={24} />} />
          <StatCard label="Total Tickets" value={counts.total} tone={TEAL} icon={<Send size={24} />} />
        </div>

        {/* SEARCH */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={20} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
            <input id="hr-tickets-search" data-testid="hr-tickets-search" placeholder="Search tickets by ID or subject…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...field, height: 64, borderRadius: 28, paddingLeft: 50, background: "var(--surface-bg)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", fontSize: 17 }} />
          </div>
          <button id="hr-tickets-filter-button" data-testid="hr-tickets-filter-button" style={{ height: 64, width: 64, borderRadius: 28, border: "none", background: "var(--surface-bg)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", color: "var(--light-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Filter size={24} /></button>
        </div>



        {/* FEED */}
        <div style={{ display: "grid", gap: 24 }}>
          {tickets.loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--light-text)", fontWeight: 700 }}><Loader2 size={22} className="animate-spin" style={{ display: "inline" }} /> Loading tickets…</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--light-text)", fontWeight: 700 }}>No tickets found.</div>
          ) : items.map((t) => {
            const sb = statusBadge(t.status);
            return (
              <div key={t.id} data-testid={`hr-ticket-card-${t.id}`} onClick={() => { setMsg(null); setReplyText(""); setSelected(t); }} style={{ background: "var(--surface-bg)", borderRadius: 36, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", cursor: "pointer" }}>
                <div style={{ width: 8, background: statusBar(t.status), flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "30px 36px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ ...lbl, color: TEAL, background: "rgba(17,94,89,0.05)", padding: "4px 12px", borderRadius: 10, letterSpacing: "0.08em" }}>{(t.id || "").slice(-6).toUpperCase()}</span>
                      <span style={{ borderRadius: 999, padding: "4px 16px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "var(--dark-text)", border: "2px solid var(--border-color)" }}>{t.category}</span>
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.8px", color: "var(--dark-text)", margin: "0 0 8px" }}>{t.title}</h3>
                    <p style={{ fontSize: 16, color: "var(--light-text)", fontWeight: 500, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.description}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 28, background: "rgba(100,116,139,0.04)", padding: "20px 28px", borderRadius: 28 }}>
                    <div><p style={{ ...lbl, fontSize: 9, marginBottom: 4 }}>Created</p><p style={{ fontSize: 13, fontWeight: 900, color: "var(--dark-text)" }}>{t.createdAtTs ? new Date(t.createdAtTs).toLocaleDateString() : "N/A"}</p></div>
                    <div><p style={{ ...lbl, fontSize: 9, marginBottom: 4 }}>Dept</p><p style={{ fontSize: 13, fontWeight: 900, color: "var(--dark-text)" }}>{t.department || "—"}</p></div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 14px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "white", background: sb.bg }}>{sb.icon} {t.status}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--light-text)" }}><MessageSquare size={18} /><span style={{ fontSize: 14, fontWeight: 900 }}>{t.responses?.length || 0}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RAISE MODAL */}
      {addOpen && (
        <div id="hr-tickets-create-modal-overlay" data-testid="hr-tickets-create-modal-overlay" data-state={addOpen ? "open" : "closed"} style={overlay} onClick={() => setAddOpen(false)}>
          <div id="hr-tickets-create-modal" data-testid="hr-tickets-create-modal" data-state={addOpen ? "open" : "closed"} onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 820 }}>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><h3 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: 0 }}>Raise a Ticket</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Provide details about your issue so we can help you better.</p></div>
              <button id="hr-tickets-create-close" data-testid="hr-tickets-create-close" onClick={() => setAddOpen(false)} style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div><label style={lbl}>Claimant Employee</label><select id="hr-tickets-employee" data-testid="hr-tickets-employee" value={form.employeeUid} onChange={(e) => setForm({ ...form, employeeUid: e.target.value })} style={{ ...field, marginTop: 6 }}><option value="">Select employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                <div><label style={lbl}>Subject</label><input id="hr-tickets-subject" data-testid="hr-tickets-subject" placeholder="Brief summary of the issue…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ ...field, marginTop: 6, fontSize: 17 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={lbl}>Category</label><select id="hr-tickets-category" data-testid="hr-tickets-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...field, marginTop: 6 }}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label style={lbl}>Priority</label><select id="hr-tickets-priority" data-testid="hr-tickets-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ ...field, marginTop: 6 }}><option>Low</option><option>Medium</option><option>High</option></select></div>
                </div>
                <button id="hr-tickets-attachment" data-testid="hr-tickets-attachment" type="button" style={{ height: 52, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", color: "var(--light-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Paperclip size={16} /> Attachment (Optional)</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={lbl}>Description</label>
                <textarea id="hr-tickets-description" data-testid="hr-tickets-description" placeholder="Provide more details about your issue…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginTop: 6, flex: 1, minHeight: 220, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", padding: 20, fontSize: 15, fontWeight: 500, color: "var(--dark-text)", resize: "vertical" }} />
              </div>
            </div>
            {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            <div style={{ padding: "20px 28px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button id="hr-tickets-cancel" data-testid="hr-tickets-cancel" onClick={() => setAddOpen(false)} style={ghostBtn}>Cancel</button>
              <button id="hr-tickets-submit" data-testid="hr-tickets-submit" onClick={raise} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Ticket"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL / THREAD MODAL */}
      {liveSelected && (
        <div id="hr-tickets-detail-modal-overlay" data-testid="hr-tickets-detail-modal-overlay" data-state={liveSelected ? "open" : "closed"} style={overlay} onClick={() => setSelected(null)}>
          <div id="hr-tickets-detail-modal" data-testid="hr-tickets-detail-modal" data-state={liveSelected ? "open" : "closed"} onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 620 }}>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ ...lbl, color: TEAL, background: "rgba(17,94,89,0.08)", padding: "3px 10px", borderRadius: 8 }}>{(liveSelected.id || "").slice(-6).toUpperCase()}</span>
                  {(() => { const sb = statusBadge(liveSelected.status); return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "3px 12px", fontWeight: 900, fontSize: 9, textTransform: "uppercase", color: "white", background: sb.bg }}>{sb.icon} {liveSelected.status}</span>; })()}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.8px", color: "var(--dark-text)", margin: 0 }}>{liveSelected.title}</h3>
                <p style={{ ...lbl, marginTop: 4 }}>{liveSelected.category} · {empName(liveSelected.employeeUid)}</p>
              </div>
              <button id="hr-tickets-detail-close" data-testid="hr-tickets-detail-close" onClick={() => setSelected(null)} style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "62vh", overflowY: "auto" }}>
              <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 16 }}>
                <span style={{ ...lbl, fontSize: 9 }}>Issue Description</span>
                <p style={{ fontSize: 14.5, fontWeight: 500, color: "var(--dark-text)", lineHeight: 1.5, margin: "8px 0 0" }}>{liveSelected.description}</p>
              </div>
              <div>
                <span style={{ ...lbl, fontSize: 9, marginBottom: 10, display: "block" }}>Conversation ({liveSelected.responses?.length || 0})</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {!liveSelected.responses?.length ? (
                    <p style={{ fontSize: 13, color: "var(--light-text)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>No replies yet. Start the conversation below.</p>
                  ) : liveSelected.responses.map((r) => {
                    const replyKey = `${r.respondedAt || r.respondedBy || "reply"}-${(r.message || "").slice(0, 24)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "reply";
                    return (
                    <div key={replyKey} data-testid={`hr-ticket-reply-${liveSelected.id}-${replyKey}`} style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ ...lbl, fontSize: 9, color: TEAL }}>{r.respondedBy || "Support Desk"}</span>
                        <span style={{ ...lbl, fontSize: 8 }}>{r.respondedAt ? new Date(r.respondedAt).toLocaleString() : ""}</span>
                      </div>
                      <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--dark-text)", margin: 0 }}>{r.message}</p>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 10 }}>
              <input id="hr-tickets-reply-input" data-testid="hr-tickets-reply-input" placeholder="Write a reply…" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} style={{ ...field, height: 46, borderRadius: 14 }} />
              <button id="hr-tickets-reply-send" data-testid="hr-tickets-reply-send" onClick={sendReply} disabled={replying || !replyText.trim()} style={{ height: 46, padding: "0 20px", borderRadius: 14, border: "none", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: replyText.trim() ? 1 : 0.6 }}>{replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send</button>
            </div>
            {msg && <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 32, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh", display: "flex", flexDirection: "column" };
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: "2px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
