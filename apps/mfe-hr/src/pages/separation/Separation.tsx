import { useMemo, useState, type CSSProperties } from "react";
import { LogOut, Plus, X, AlertCircle, Loader2, ShieldCheck, Scissors, MessageSquare } from "lucide-react";
import { PageHeader, Button, Input, Select, Textarea } from "@jaldee/design-system";
import { useExits, type ExitRequest, type ClearanceStatus } from "../../services/useExits";
import { useEmployees } from "../../services/useEmployees";
import { useApprovalSteps } from "../../services/useApprovals";
import { useEmployeeAssets } from "../../services/useAssets";
import { useShellErrorToast } from "../../services/useShellFeedback";

/**
 * W2 / R6.2 + R6.5 + R6.6 — separation workflow: raise → approve (W1 chain
 * when configured) → per-department clearance → completed. Notice waive and
 * exit interview live on the detail view.
 */

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 720, maxHeight: "88vh", overflowY: "auto" };
const infoBox: CSSProperties = { background: "rgba(100,116,139,0.05)", borderRadius: 12, padding: "10px 14px" };

const STATUS_COLORS: Record<string, string> = {
  Pending: "#d97706", Partially_Approved: "#d97706", Approved: "#2563eb",
  Completed: "#059669", Rejected: "#e11d48", Cancelled: "#64748b",
};
const CLEARANCE_STATUSES: ClearanceStatus[] = ["Pending", "InProgress", "Cleared", "Rejected"];
const INTERVIEW_QUESTIONS = [
  "Primary reason for leaving",
  "What did you like most about working here?",
  "What should we improve?",
  "Would you recommend us as an employer?",
];

function StatusPill({ s }: { s?: string }) {
  const c = STATUS_COLORS[s || ""] || "#64748b";
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{(s || "—").replace("_", " ")}</span>;
}

export default function Separation() {
  const exits = useExits();
  const { data: employees } = useEmployees();
  useShellErrorToast("hr.separation", "Separation", exits.error);

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [selected, setSelected] = useState<ExitRequest | null>(null);
  const current = useMemo(() => exits.data.find((e) => e.id === selected?.id) ?? selected, [exits.data, selected]);
  const approvalSteps = useApprovalSteps("EXIT", selected?.id ?? null);
  // W9 — unreturned assets gate exit completion; show them on the detail.
  const pendingAssets = useEmployeeAssets(selected?.employeeUid, true);

  const [form, setForm] = useState({ employeeUid: "", separationType: "Resignation", reason: "", noticePeriodDays: "30" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [remarks, setRemarks] = useState("");
  const [waive, setWaive] = useState({ days: "", reason: "" });
  const [interview, setInterview] = useState<Record<string, string>>({});
  const [interviewOpen, setInterviewOpen] = useState(false);

  const openDetail = (e: ExitRequest) => {
    setSelected(e); setRemarks(""); setWaive({ days: "", reason: "" });
    setInterview(e.exitInterview ?? {}); setInterviewOpen(false); setMsg(null);
  };

  const submitRaise = async () => {
    if (!form.employeeUid || !form.separationType) { setMsg("Employee and separation type are required."); return; }
    setBusy(true); setMsg(null);
    try {
      await exits.raise({
        employeeUid: form.employeeUid, separationType: form.separationType,
        reason: form.reason || undefined, noticePeriodDays: Number(form.noticePeriodDays) || undefined,
      });
      setRaiseOpen(false);
      setForm({ employeeUid: "", separationType: "Resignation", reason: "", noticePeriodDays: "30" });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to raise exit."); }
    finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); await approvalSteps.reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  };

  const awaitingApproval = (s?: string) => s === "Pending" || s === "Partially_Approved";

  return (
    <section className="page-section active hr-page-shell">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <PageHeader title="Separation" subtitle="Resignations, terminations, notice & clearance" />
        <Button onClick={() => { setMsg(null); setRaiseOpen(true); }} icon={<Plus size={16} />}>Raise Exit Request</Button>
      </div>

      {exits.error && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 14, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {exits.error}
        </div>
      )}

      <div style={card}>
        {exits.loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={20} className="animate-spin" style={{ display: "inline" }} /></div>
        ) : exits.data.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--light-text)" }}>
            <LogOut size={40} strokeWidth={1.2} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={lbl}>No exit requests yet</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Employee</th><th style={th}>Type</th><th style={th}>Status</th>
              <th style={th}>Notice</th><th style={th}>Last Working Day</th><th style={th}>Clearance</th>
              <th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {exits.data.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...td, fontWeight: 800 }}>{e.employeeName || e.employeeUid}</td>
                  <td style={td}>{e.separationType || "—"}</td>
                  <td style={td}><StatusPill s={e.status} /></td>
                  <td style={td}>{e.noticePeriodDays != null ? `${e.noticePeriodDays}d${e.noticeWaivedDays ? ` (−${e.noticeWaivedDays} waived)` : ""}` : "—"}</td>
                  <td style={td}>{e.lastWorkingDay || "—"}</td>
                  <td style={td}>{e.clearanceStatus || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}><Button variant="secondary" onClick={() => openDetail(e)}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== RAISE MODAL ===== */}
      {raiseOpen && (
        <div style={overlay} onClick={() => setRaiseOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Raise Exit Request</h3>
              <button onClick={() => setRaiseOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <Select label="Employee" value={form.employeeUid} onChange={(e) => setForm({ ...form, employeeUid: e.target.value })}
                options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Select label="Separation Type" value={form.separationType} onChange={(e) => setForm({ ...form, separationType: e.target.value })}
                  options={["Resignation", "Termination", "Retirement", "End of Contract"].map((t) => ({ value: t, label: t }))} />
                <Input label="Notice Period (days)" type="number" value={form.noticePeriodDays} onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })} />
              </div>
              <Textarea label="Reason" rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for separation…" />
              <div style={{ ...lbl }}>Clearance items are created for IT, Finance, HR and Admin. Last working day = today + notice.</div>
              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
            <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button variant="secondary" onClick={() => setRaiseOpen(false)}>Cancel</Button>
              <Button onClick={submitRaise} disabled={busy} loading={busy}>Raise Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {current && selected && (
        <div style={overlay} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 26px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 900, color: TEAL, margin: 0 }}>{current.employeeName || "Exit Request"}</h3>
                <p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{current.separationType} · <StatusPill s={current.status} /></p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Notice</span><div style={{ fontSize: 13, fontWeight: 800, marginTop: 3 }}>{current.noticePeriodDays ?? "—"}d{current.noticeWaivedDays ? ` (−${current.noticeWaivedDays})` : ""}</div></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Last Working Day</span><div style={{ fontSize: 13, fontWeight: 800, marginTop: 3 }}>{current.lastWorkingDay || "—"}</div></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Clearance</span><div style={{ fontSize: 13, fontWeight: 800, marginTop: 3 }}>{current.clearanceStatus || "Pending"}</div></div>
              </div>
              {current.reason && <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Reason</span><p style={{ fontSize: 12.5, fontWeight: 600, margin: "4px 0 0", fontStyle: "italic" }}>“{current.reason}”</p></div>}
              {current.waiveReason && <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Waive Reason</span><p style={{ fontSize: 12.5, fontWeight: 600, margin: "4px 0 0" }}>{current.waiveReason}</p></div>}

              {/* approval timeline (W1) */}
              {approvalSteps.data.length > 0 && (
                <div style={{ background: "rgba(17,94,89,0.03)", border: "1px solid rgba(17,94,89,0.12)", borderRadius: 14, padding: 14 }}>
                  <span style={{ ...lbl, color: TEAL, display: "block", marginBottom: 8 }}>Approval Chain Progress</span>
                  {approvalSteps.data.map((s) => {
                    const c = s.decision === "APPROVED" ? "#059669" : s.decision === "REJECTED" ? "#e11d48" : "#d97706";
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                        <span style={{ width: 24, height: 24, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: c, background: `${c}14`, border: `1px solid ${c}33`, flexShrink: 0 }}>L{s.stepOrder}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>{s.approverName || s.approverUid.slice(0, 8)}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: c }}>{s.decision}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* decide */}
              {awaitingApproval(current.status) && (
                <div style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)", borderRadius: 14, padding: 14 }}>
                  <span style={{ ...lbl, color: "#b45309", display: "block", marginBottom: 8 }}><ShieldCheck size={11} style={{ display: "inline", marginRight: 4 }} />Approval Decision</span>
                  <Textarea rows={2} placeholder="Remarks (optional)…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "flex-end" }}>
                    <Button variant="secondary" disabled={busy} onClick={() => act(() => exits.decide(current.id, "REJECT", remarks))} style={{ color: "#e11d48" }}>Reject</Button>
                    <Button disabled={busy} loading={busy} onClick={() => act(() => exits.decide(current.id, "APPROVE", remarks))}>Approve</Button>
                  </div>
                </div>
              )}

              {/* notice waive (R6.5) */}
              {(awaitingApproval(current.status) || current.status === "Approved") && (
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                  <span style={{ ...lbl, display: "block", marginBottom: 8 }}><Scissors size={11} style={{ display: "inline", marginRight: 4 }} />Waive Notice (recomputes last working day)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 10, alignItems: "end" }}>
                    <Input label="Days" type="number" value={waive.days} onChange={(e) => setWaive({ ...waive, days: e.target.value })} />
                    <Input label="Reason" value={waive.reason} onChange={(e) => setWaive({ ...waive, reason: e.target.value })} placeholder="Why is notice being waived?" />
                    <Button variant="secondary" disabled={busy || !Number(waive.days) || !waive.reason.trim()}
                      onClick={() => act(async () => { await exits.waiveNotice(current.id, Number(waive.days), waive.reason.trim()); setWaive({ days: "", reason: "" }); })}>
                      Waive
                    </Button>
                  </div>
                </div>
              )}

              {/* W9 — assets pending return (block final clearance) */}
              {pendingAssets.data.length > 0 && current.status !== "Completed" && (
                <div style={{ border: "1px solid rgba(244,63,94,0.25)", background: "rgba(244,63,94,0.04)", borderRadius: 14, padding: 14 }}>
                  <span style={{ ...lbl, color: "#e11d48", display: "block", marginBottom: 8 }}>
                    Assets pending return ({pendingAssets.data.length}) — exit cannot complete until returned (Assets module)
                  </span>
                  {pendingAssets.data.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", fontSize: 12.5, fontWeight: 700, color: "var(--dark-text)" }}>
                      <span>{a.assetName}{a.tagNumber ? ` · ${a.tagNumber}` : ""}</span>
                      <span style={{ ...lbl, fontSize: 8.5 }}>since {a.issuedOn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* clearance board (opens after approval) */}
              {(current.status === "Approved" || current.status === "Completed") && (
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                  <span style={{ ...lbl, display: "block", marginBottom: 8 }}>Department Clearance — exit completes when all are Cleared</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(current.clearances ?? []).map((c) => {
                      const col = c.status === "Cleared" ? "#059669" : c.status === "Rejected" ? "#e11d48" : "#d97706";
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(100,116,139,0.04)" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>{c.departmentName}</span>
                          {c.clearedByName && <span style={{ ...lbl, fontSize: 8 }}>by {c.clearedByName}</span>}
                          {current.status === "Completed" ? (
                            <span style={{ fontSize: 10, fontWeight: 800, color: col }}>{c.status}</span>
                          ) : (
                            <select value={c.status || "Pending"} disabled={busy}
                              onChange={(e) => act(() => exits.updateClearance(c.id, e.target.value as ClearanceStatus))}
                              style={{ height: 30, borderRadius: 8, border: `1px solid ${col}55`, color: col, background: "var(--surface-bg)", fontSize: 11.5, fontWeight: 800, padding: "0 8px" }}>
                              {CLEARANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* exit interview (R6.6) */}
              <div style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={lbl}><MessageSquare size={11} style={{ display: "inline", marginRight: 4 }} />Exit Interview {current.exitInterview && Object.keys(current.exitInterview).length ? "· recorded" : "· not recorded"}</span>
                  <Button variant="ghost" onClick={() => setInterviewOpen((v) => !v)}>{interviewOpen ? "Hide" : current.exitInterview && Object.keys(current.exitInterview).length ? "View / Edit" : "Record"}</Button>
                </div>
                {interviewOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    {INTERVIEW_QUESTIONS.map((q) => (
                      <div key={q}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--dark-text)", marginBottom: 4 }}>{q}</div>
                        <Input value={interview[q] ?? ""} onChange={(e) => setInterview({ ...interview, [q]: e.target.value })} placeholder="Response…" />
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button variant="secondary" disabled={busy} onClick={() => act(() => exits.saveInterview(current.id, interview))}>Save Interview</Button>
                    </div>
                  </div>
                )}
              </div>

              {awaitingApproval(current.status) && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button variant="ghost" disabled={busy} style={{ color: "#e11d48" }}
                    onClick={() => { if (confirm("Cancel this exit request?")) void act(() => exits.cancel(current.id)); }}>
                    Cancel Request
                  </Button>
                </div>
              )}

              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
