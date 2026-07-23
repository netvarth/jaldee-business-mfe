import { useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, Loader2, Lock, Send, ShieldAlert, Trash2 } from "lucide-react";
import { Button, Input, Select, Tabs } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { formatDate } from "../../lib/utils";
import {
  useAmIGrievanceHandler, useGrievances, useGrievanceConfig,
  type Grievance, type GrievanceAccessLogEntry, type GrievanceStatus,
} from "../../services/useGrievances";
import { useEmployees } from "../../services/useEmployees";

/**
 * W10 / R8.1 — confidential grievance console for designated HR + CS handlers.
 * Backend enforces access (403 for non-handlers) and audits every action;
 * this screen only renders what the API serves — no client-side secrets.
 */

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.05)" };
const td: CSSProperties = { padding: "12px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };

const STATUS_COLORS: Record<string, [string, string]> = {
  Open: ["#d97706", "rgba(245,158,11,0.1)"],
  InProgress: ["#0369a1", "rgba(14,165,233,0.1)"],
  Resolved: ["#059669", "rgba(16,185,129,0.1)"],
  Closed: ["#475569", "rgba(100,116,139,0.1)"],
};

function pill(s?: string): CSSProperties {
  const [color, background] = STATUS_COLORS[s || ""] ?? ["#475569", "rgba(100,116,139,0.1)"];
  return { display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color, background };
}

function slaBadge(g: Grievance) {
  if (g.escalatedAt) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#e11d48", background: "rgba(244,63,94,0.1)" }}><ShieldAlert size={10} /> Escalated</span>;
  }
  if (g.slaDueAt && (g.status === "Open" || g.status === "InProgress")) {
    const overdue = new Date(g.slaDueAt).getTime() < Date.now();
    return (
      <span style={{ ...lbl, color: overdue ? "#e11d48" : "var(--light-text)" }}>
        SLA {overdue ? "breached" : "due"} {formatDate(g.slaDueAt)}
      </span>
    );
  }
  return null;
}

function Banner({ msg }: { msg: string }) {
  return (
    <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
      <AlertCircle size={16} /> {msg}
    </div>
  );
}

export default function Grievances() {
  const gate = useAmIGrievanceHandler();
  const [tab, setTab] = useState<"queue" | "config">("queue");

  return (
    <section style={{ padding: "28px 32px", background: "var(--app-bg)", overflowY: "auto" }}>
      <div style={{ marginBottom: 24 }}>
        <PageHeader
          title="Grievances"
          subtitle="Confidential — visible only to designated HR & Company Secretary handlers. Every access is audited."
        />
      </div>

      {gate.handler === null ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: "var(--light-text)" }}>
          <Loader2 size={18} className="animate-spin" style={{ display: "inline" }} />
        </div>
      ) : !gate.handler ? (
        <div style={{ ...card, padding: 40, textAlign: "center", maxWidth: 560 }}>
          <Lock size={28} style={{ color: "var(--light-text)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dark-text)" }}>Restricted area</div>
          <p style={{ fontSize: 13, color: "var(--light-text)", marginTop: 8 }}>
            Grievances are confidential and readable only by the designated HR and Company Secretary
            handlers. You are not on this tenant's handler list.
            {gate.error ? ` (${gate.error})` : ""}
          </p>
          <p style={{ fontSize: 12, color: "var(--light-text)", marginTop: 8 }}>
            Raise your own grievance from My Workspace → Grievances.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <Tabs
              items={[{ value: "queue", label: "Queue" }, { value: "config", label: "Handlers & SLA" }]}
              value={tab}
              onValueChange={(val) => setTab(val as "queue" | "config")}
            />
          </div>
          {tab === "queue" ? <Queue /> : <Config />}
        </>
      )}
    </section>
  );
}

function Queue() {
  const grievances = useGrievances();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<GrievanceAccessLogEntry[] | null>(null);

  const rows = useMemo(
    () => grievances.data.filter((g) => !statusFilter || g.status === statusFilter),
    [grievances.data, statusFilter]
  );
  const selected = useMemo(
    () => grievances.data.find((g) => g.id === selectedId) ?? null,
    [grievances.data, selectedId]
  );

  const act = async (fn: () => Promise<unknown>, fail: string) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : fail); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20, alignItems: "start" }}>
      <div>
        {(grievances.error || err) && <Banner msg={grievances.error || err || ""} />}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{ width: 180 }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              options={[{ value: "", label: "All statuses" }, ...Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))]} />
          </div>
          <span style={{ ...lbl, marginLeft: "auto" }}>{rows.length} grievance{rows.length === 1 ? "" : "s"}</span>
        </div>
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Raised by</th><th style={th}>Title</th><th style={th}>Category</th><th style={th}>Raised</th><th style={th}>SLA</th><th style={th}>Status</th></tr></thead>
            <tbody>
              {grievances.loading ? <tr><td style={td} colSpan={6}>Loading…</td></tr>
                : rows.length === 0 ? <tr><td style={{ ...td, ...lbl, textAlign: "center", padding: 28 }} colSpan={6}>No grievances.</td></tr>
                : rows.map((g) => (
                  <tr key={g.id} onClick={() => { setSelectedId(g.id); setLog(null); }}
                      style={{ cursor: "pointer", background: g.id === selectedId ? "rgba(13,148,136,0.05)" : undefined }}>
                    <td style={{ ...td, fontWeight: 700 }}>{g.employeeName || "—"}</td>
                    <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</td>
                    <td style={td}>{g.category || "—"}</td>
                    <td style={td}>{g.createdAt ? formatDate(g.createdAt) : "—"}</td>
                    <td style={td}>{slaBadge(g)}</td>
                    <td style={td}><span style={pill(g.status)}>{g.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ ...card, padding: 20, position: "sticky", top: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={14} style={{ color: "#e11d48" }} />
            <b style={{ fontSize: 14 }}>{selected.title}</b>
          </div>
          <div style={{ ...lbl, marginTop: 6 }}>
            {selected.employeeName || "—"} · {selected.category || "Grievance"} · {selected.createdAt ? formatDate(selected.createdAt) : ""}
          </div>
          <div style={{ marginTop: 8 }}>{slaBadge(selected)}</div>
          <p style={{ fontSize: 13, color: "var(--dark-text)", margin: "12px 0" }}>{selected.description}</p>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
            <div style={{ width: 170 }}>
              <Select value={selected.status || "Open"} disabled={busy}
                onChange={(e) => act(() => grievances.updateStatus(selected.id, e.target.value as GrievanceStatus), "Status update failed.")}
                options={Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))} />
            </div>
            <Button variant="secondary" disabled={busy}
              onClick={() => act(async () => setLog(await grievances.accessLog(selected.id)), "Could not load access log.")}>
              Access log
            </Button>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {(selected.responses || []).length === 0 ? (
              <div style={{ ...lbl, textAlign: "center", padding: 12 }}>No replies yet.</div>
            ) : (selected.responses || []).map((r, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: r.isInternal ? "rgba(245,158,11,0.07)" : "rgba(100,116,139,0.05)", border: r.isInternal ? "1px dashed rgba(245,158,11,0.4)" : "1px solid var(--border-color)" }}>
                {r.isInternal && <div style={{ ...lbl, color: "#d97706", marginBottom: 4 }}>Internal note — hidden from raiser</div>}
                <p style={{ fontSize: 13, color: "var(--dark-text)", margin: 0 }}>{r.message}</p>
                <div style={{ ...lbl, marginTop: 5 }}>{r.timestamp ? formatDate(r.timestamp) : ""}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Input placeholder={internalNote ? "Internal note (hidden from raiser)…" : "Reply to the raiser…"} value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && replyText.trim()) { void act(() => grievances.reply(selected.id, replyText.trim(), internalNote), "Reply failed."); setReplyText(""); } }} />
            </div>
            <Button disabled={busy || !replyText.trim()} icon={<Send size={14} />}
              onClick={() => { void act(() => grievances.reply(selected.id, replyText.trim(), internalNote), "Reply failed."); setReplyText(""); }}>
              Send
            </Button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--light-text)", cursor: "pointer" }}>
            <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
            Internal note (not visible to the raiser)
          </label>

          {log && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Access audit trail</div>
              <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {log.length === 0 ? <div style={lbl}>No entries.</div> : log.map((l) => (
                  <div key={l.id} style={{ fontSize: 11.5, color: "var(--dark-text)" }}>
                    <b>{l.actorEmployeeName || "System"}</b> · {l.action}
                    {l.detail ? ` — ${l.detail}` : ""}
                    <span style={{ color: "var(--light-text)" }}>{l.accessedAt ? ` · ${formatDate(l.accessedAt)}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Config() {
  const config = useGrievanceConfig();
  const employees = useEmployees();
  const [employeeUid, setEmployeeUid] = useState("");
  const [role, setRole] = useState("HR");
  const [slaHours, setSlaHours] = useState<string>("");
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [policyLoaded, setPolicyLoaded] = useState(false);

  if (config.policy && !policyLoaded) {
    setSlaHours(String(config.policy.slaHours));
    setEscalationEnabled(config.policy.escalationEnabled);
    setPolicyLoaded(true);
  }

  const act = async (fn: () => Promise<unknown>, fail: string) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : fail); }
    finally { setBusy(false); }
  };

  const activeHandlers = config.handlers.filter((h) => h.active);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start", maxWidth: 980 }}>
      {(config.error || err) && <div style={{ gridColumn: "1 / -1" }}><Banner msg={config.error || err || ""} /></div>}

      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dark-text)", marginBottom: 4 }}>Grievance handlers</div>
        <p style={{ fontSize: 12, color: "var(--light-text)", margin: "0 0 14px" }}>
          Employees designated to see and act on confidential grievances (HR / Company Secretary).
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Select value={employeeUid} onChange={(e) => setEmployeeUid(e.target.value)}
              options={[{ value: "", label: employees.loading ? "Loading employees…" : "Select employee" },
                ...employees.data.map((e) => ({ value: e.id, label: e.name || e.id }))]} />
          </div>
          <div style={{ width: 110 }}>
            <Select value={role} onChange={(e) => setRole(e.target.value)}
              options={[{ value: "HR", label: "HR" }, { value: "CS", label: "CS" }]} />
          </div>
          <Button disabled={busy || !employeeUid}
            onClick={() => act(() => config.addHandler(employeeUid, role).then(() => setEmployeeUid("")), "Could not add handler.")}>
            Add
          </Button>
        </div>
        {config.loading ? <div style={lbl}>Loading…</div>
          : activeHandlers.length === 0 ? (
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 12.5, color: "#b45309" }}>
              No handlers configured — nobody can see raised grievances until HR/CS designates are added here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeHandlers.map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--border-color)" }}>
                  <b style={{ fontSize: 13 }}>{h.employeeName || h.employeeUid}</b>
                  <span style={pill()}>{h.role}</span>
                  <button title="Remove handler" disabled={busy}
                    onClick={() => act(() => config.removeHandler(h.id), "Could not remove handler.")}
                    style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", color: "#e11d48" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dark-text)", marginBottom: 4 }}>SLA & escalation</div>
        <p style={{ fontSize: 12, color: "var(--light-text)", margin: "0 0 14px" }}>
          Grievances unresolved past the SLA are marked escalated, audited, and handlers are notified (hourly check).
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 140 }}>
            <Input type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} placeholder="SLA hours" />
          </div>
          <span style={{ fontSize: 12.5, color: "var(--light-text)" }}>hours to first resolution</span>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--dark-text)", cursor: "pointer", marginBottom: 16 }}>
          <input type="checkbox" checked={escalationEnabled} onChange={(e) => setEscalationEnabled(e.target.checked)} />
          Escalate on SLA breach
        </label>
        <Button disabled={busy || !slaHours || Number(slaHours) < 1}
          onClick={() => act(() => config.updatePolicy({ slaHours: Number(slaHours), escalationEnabled }), "Could not save policy.")}>
          Save policy
        </Button>
      </div>
    </div>
  );
}
