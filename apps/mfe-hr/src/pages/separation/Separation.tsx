import { useMemo, useState, type CSSProperties } from "react";
import { LogOut, Plus, X, AlertCircle, Loader2, ShieldCheck, Scissors, MessageSquare, Rows3, LayoutGrid } from "lucide-react";
import { Button, Combobox, DataTable, EmptyState, Input, Select, Textarea, type ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { useExits, type ExitRequest, type ClearanceStatus } from "../../services/useExits";
import { useEmployees } from "../../services/useEmployees";
import { usePagedEmployeeOptions } from "../../services/usePagedEmployeeOptions";
import { useApprovalSteps } from "../../services/useApprovals";
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
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 };
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
type ViewMode = "table" | "cards";

function initialViewMode(): ViewMode {
  if (typeof window === "undefined") return "table";
  const saved = window.localStorage.getItem("hr-separation-view");
  if (saved === "table" || saved === "cards") return saved;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function StatusPill({ s }: { s?: string }) {
  const c = STATUS_COLORS[s || ""] || "#64748b";
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: c, background: `${c}14`, border: `1px solid ${c}33` }}>{(s || "—").replace("_", " ")}</span>;
}

function canRecordExitInterview(status?: string) {
  const normalized = status?.trim().toLowerCase();
  return normalized !== "rejected" && normalized !== "cancelled" && normalized !== "canceled";
}

export default function Separation() {
  const exits = useExits();
  const { data: employees } = useEmployees();
  useShellErrorToast("hr.separation", "Separation", exits.error);

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    window.localStorage.setItem("hr-separation-view", mode);
  };
  const employeeOptions = usePagedEmployeeOptions({ enabled: raiseOpen });
  const [selected, setSelected] = useState<ExitRequest | null>(null);
  const current = useMemo(() => exits.data.find((e) => e.id === selected?.id) ?? selected, [exits.data, selected]);
  const approvalSteps = useApprovalSteps("EXIT", selected?.id ?? null);

  const [form, setForm] = useState({ employeeUid: "", separationType: "Resignation", reason: "", noticePeriodDays: "30" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [remarks, setRemarks] = useState("");
  const [waive, setWaive] = useState({ days: "", reason: "" });
  const [interview, setInterview] = useState<Record<string, string>>({});
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [noticeEditOpen, setNoticeEditOpen] = useState(false);
  const [noticeEditDays, setNoticeEditDays] = useState("");

  const openDetail = (e: ExitRequest) => {
    setSelected(e); setRemarks(""); setWaive({ days: "", reason: "" });
    setInterview(e.exitInterview ?? {}); setInterviewOpen(false); setMsg(null);
    setNoticeEditOpen(false);
    setNoticeEditDays(e.noticePeriodDays != null ? String(e.noticePeriodDays) : "");
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
  const noticeCanBeChanged = (s?: string) => {
    const normalized = s?.trim().toLowerCase();
    return normalized !== "completed" && normalized !== "rejected" && normalized !== "cancelled" && normalized !== "canceled";
  };

  return (
    <section id="hr-separation-page" data-testid="hr-separation-page" className="page-section active hr-page-shell">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <PageHeader title="Separation" subtitle="Resignations, terminations, notice & clearance" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginLeft: "auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 3, border: "1px solid var(--border-color)", borderRadius: 8, background: "var(--surface-bg)" }}>
            <button type="button" id="hr-separation-view-table" data-testid="hr-separation-view-table" aria-label="Table view" title="Table view" onClick={() => setViewMode("table")} style={{ display: "inline-flex", flex: "0 0 32px", width: 32, height: 32, padding: 0, alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === "table" ? TEAL : "transparent", color: viewMode === "table" ? "white" : "var(--light-text)", transition: "background-color 0.15s, color 0.15s" }}><Rows3 size={16} strokeWidth={2} /></button>
            <button type="button" id="hr-separation-view-cards" data-testid="hr-separation-view-cards" aria-label="Card view" title="Card view" onClick={() => setViewMode("cards")} style={{ display: "inline-flex", flex: "0 0 32px", width: 32, height: 32, padding: 0, alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", cursor: "pointer", background: viewMode === "cards" ? TEAL : "transparent", color: viewMode === "cards" ? "white" : "var(--light-text)", transition: "background-color 0.15s, color 0.15s" }}><LayoutGrid size={16} strokeWidth={2} /></button>
          </div>
          <Button id="hr-separation-raise-open" data-testid="hr-separation-raise-open" className="!h-10" onClick={() => { setMsg(null); setRaiseOpen(true); }} icon={<Plus size={16} />}>Raise Exit Request</Button>
        </div>
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
          <div style={{ padding: 16 }}>
            <EmptyState
              icon={<LogOut size={36} strokeWidth={1.5} />}
              title="No exit requests yet"
              description="Raised exit requests will appear here for approval, clearance, and final settlement."
            />
          </div>
        ) : viewMode === "table" ? (
          <>
          <DataTable
            data-testid="hr-separation-table"
            data={exits.data}
            columns={[
              { key: "employeeUid", header: "Employee", width: "20%", render: (e) => <strong>{e.employeeName || e.employeeUid}</strong> },
              { key: "separationType", header: "Type", width: "14%", render: (e) => e.separationType || "—" },
              { key: "status", header: "Status", width: "14%", render: (e) => <StatusPill s={e.status} /> },
              { key: "noticePeriodDays", header: "Notice", width: "14%", render: (e) => e.noticePeriodDays != null ? `${e.noticePeriodDays}d${e.noticeWaivedDays ? ` (−${e.noticeWaivedDays} waived)` : ""}` : "—" },
              { key: "lastWorkingDay", header: "Last Working Day", width: "16%", render: (e) => e.lastWorkingDay || "—" },
              { key: "clearanceStatus", header: "Clearance", width: "12%", render: (e) => e.clearanceStatus || "—" },
              { key: "action", header: "Action", width: "10%", align: "right", render: (e) => <Button data-testid={`hr-separation-open-${e.id}`} variant="secondary" onClick={() => openDetail(e)}>Open</Button> },
            ] as ColumnDef<ExitRequest>[]}
            getRowId={(e) => e.id}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="min-w-[820px]"
          />
          {false && <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Employee</th><th style={th}>Type</th><th style={th}>Status</th>
              <th style={th}>Notice</th><th style={th}>Last Working Day</th><th style={th}>Clearance</th>
              <th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {exits.data.map((e) => (
                <tr key={e.id} data-testid={`hr-separation-row-${e.id}`}>
                  <td style={{ ...td, fontWeight: 800 }}>{e.employeeName || e.employeeUid}</td>
                  <td style={td}>{e.separationType || "—"}</td>
                  <td style={td}><StatusPill s={e.status} /></td>
                  <td style={td}>{e.noticePeriodDays != null ? `${e.noticePeriodDays}d${e.noticeWaivedDays ? ` (−${e.noticeWaivedDays} waived)` : ""}` : "—"}</td>
                  <td style={td}>{e.lastWorkingDay || "—"}</td>
                  <td style={td}>{e.clearanceStatus || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}><Button data-testid={`hr-separation-open-${e.id}`} variant="secondary" onClick={() => openDetail(e)}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>}
          </>
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {exits.data.map((e) => (
              <article key={e.id} data-testid={`hr-separation-card-${e.id}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{e.employeeName || e.employeeUid}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "var(--light-text)" }}>{e.separationType || "—"}</div>
                  </div>
                  <StatusPill s={e.status} />
                </div>
                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={lbl}>Notice</span><strong style={{ fontSize: 12 }}>{e.noticePeriodDays != null ? `${e.noticePeriodDays}d${e.noticeWaivedDays ? ` (−${e.noticeWaivedDays} waived)` : ""}` : "—"}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={lbl}>Last Working Day</span><strong style={{ fontSize: 12 }}>{e.lastWorkingDay || "—"}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={lbl}>Clearance</span><strong style={{ fontSize: 12 }}>{e.clearanceStatus || "—"}</strong></div>
                </div>
                <Button data-testid={`hr-separation-open-${e.id}`} variant="secondary" className="mt-4 w-full" onClick={() => openDetail(e)}>Open</Button>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ===== RAISE MODAL ===== */}
      {raiseOpen && (
        <div data-testid="hr-separation-raise-overlay" className="max-[520px]:!p-0" style={overlay} onClick={() => setRaiseOpen(false)}>
          <div data-testid="hr-separation-raise-modal" className="max-[520px]:!h-[100dvh] max-[520px]:!max-h-none max-[520px]:!max-w-none max-[520px]:!rounded-none max-[520px]:flex max-[520px]:flex-col" onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: 560 }}>
            <div className="max-[520px]:!px-4 max-[520px]:!py-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Raise Exit Request</h3>
              <button data-testid="hr-separation-raise-close" aria-label="Close separation request dialog" onClick={() => setRaiseOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div className="max-[520px]:!p-4" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
              <Combobox id="hr-separation-employee" data-testid="hr-separation-employee" label="Employee" value={form.employeeUid} onValueChange={(employeeUid) => setForm({ ...form, employeeUid })}
                placeholder="Select employee" searchPlaceholder="Search employees..." searchValue={employeeOptions.searchValue} onSearchChange={employeeOptions.onSearchChange}
                loading={employeeOptions.loading} hasMore={employeeOptions.hasMore} onEndReached={employeeOptions.onLoadMore}
                options={employeeOptions.data.map((employee) => ({ value: employee.id, label: employee.name }))} />
              <div className="max-[520px]:!grid-cols-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Select id="hr-separation-type" testId="hr-separation-type" label="Separation Type" value={form.separationType} onChange={(e) => setForm({ ...form, separationType: e.target.value })}
                  options={["Resignation", "Termination", "Retirement", "End of Contract"].map((t) => ({ value: t, label: t }))} />
                <Input id="hr-separation-notice-days" data-testid="hr-separation-notice-days" label="Notice Period (days)" type="number" value={form.noticePeriodDays} onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })} />
              </div>
              <Textarea id="hr-separation-reason" data-testid="hr-separation-reason" label="Reason" rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for separation…" />
              <div style={{ ...lbl }}>Clearance items are created for IT, Finance, HR and Admin. Last working day = today + notice.</div>
              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
            <div className="max-[520px]:!px-4 max-[520px]:[&>button]:flex-1" style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              <Button id="hr-separation-raise-cancel" data-testid="hr-separation-raise-cancel" variant="secondary" onClick={() => setRaiseOpen(false)}>Cancel</Button>
              <Button id="hr-separation-raise-submit" data-testid="hr-separation-raise-submit" onClick={submitRaise} disabled={busy} loading={busy}>Raise Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {current && selected && (
        <div data-testid="hr-separation-detail-overlay" style={overlay} onClick={() => setSelected(null)}>
          <div data-testid="hr-separation-detail-modal" onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 26px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 900, color: TEAL, margin: 0 }}>{current.employeeName || "Exit Request"}</h3>
                <p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{current.separationType} · <StatusPill s={current.status} /></p>
              </div>
              <button data-testid="hr-separation-detail-close" aria-label="Close separation details" onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <div style={infoBox}>
                  {noticeEditOpen && noticeCanBeChanged(current.status) ? (
                    <>
                      <Input label="Notice Period (days)" type="number" min={0} value={noticeEditDays} onChange={(event) => setNoticeEditDays(event.target.value)} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setNoticeEditOpen(false)}>Cancel</Button>
                        <Button
                          size="sm"
                          data-testid="hr-separation-notice-save"
                          loading={busy}
                          disabled={busy || noticeEditDays === "" || !Number.isInteger(Number(noticeEditDays)) || Number(noticeEditDays) < 0 || Number(noticeEditDays) === current.noticePeriodDays}
                          onClick={() => void act(async () => { await exits.updateNoticePeriod(current, Number(noticeEditDays)); setNoticeEditOpen(false); })}
                        >
                          Save
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ ...lbl, fontSize: 8 }}>Notice</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3 }}>{current.noticePeriodDays ?? "—"}d{current.noticeWaivedDays ? ` (−${current.noticeWaivedDays})` : ""}</div>
                    </>
                  )}
                </div>
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
                  <Textarea id="hr-separation-decision-remarks" data-testid="hr-separation-decision-remarks" rows={2} placeholder="Remarks (optional)…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "flex-end" }}>
                    <Button id="hr-separation-reject" data-testid="hr-separation-reject" variant="secondary" disabled={busy} onClick={() => act(() => exits.decide(current.id, "REJECT", remarks))} style={{ color: "#e11d48" }}>Reject</Button>
                    <Button id="hr-separation-approve" data-testid="hr-separation-approve" disabled={busy} loading={busy} onClick={() => act(() => exits.decide(current.id, "APPROVE", remarks))}>Approve</Button>
                  </div>
                </div>
              )}

              {/* notice waive (R6.5) */}
              {(awaitingApproval(current.status) || current.status === "Approved") && (
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                  {current.noticeWaivedDays ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <span style={{ ...lbl, display: "block", marginBottom: 4 }}><Scissors size={11} style={{ display: "inline", marginRight: 4 }} />Notice Waived</span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>
                          {current.noticeWaivedDays} day{current.noticeWaivedDays === 1 ? "" : "s"} waived{current.waiveReason ? ` · ${current.waiveReason}` : ""}
                        </div>
                      </div>
                      <Button
                        data-testid="hr-separation-undo-notice-waiver"
                        variant="secondary"
                        disabled={busy}
                        loading={busy}
                        onClick={() => {
                          if (confirm("Undo the notice waiver and restore the original notice period?")) {
                            void act(() => exits.undoNoticeWaiver(current.id));
                          }
                        }}
                      >
                        Undo Waiver
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span style={{ ...lbl, display: "block", marginBottom: 8 }}><Scissors size={11} style={{ display: "inline", marginRight: 4 }} />Waive Notice (recomputes last working day)</span>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 10, alignItems: "end" }}>
                        <Input label="Days" type="number" value={waive.days} onChange={(e) => setWaive({ ...waive, days: e.target.value })} />
                        <Input label="Reason" value={waive.reason} onChange={(e) => setWaive({ ...waive, reason: e.target.value })} placeholder="Why is notice being waived?" />
                        <Button variant="secondary" disabled={busy || !Number(waive.days) || !waive.reason.trim()}
                          onClick={() => act(async () => { await exits.waiveNotice(current.id, Number(waive.days), waive.reason.trim()); setWaive({ days: "", reason: "" }); })}>
                          Waive
                        </Button>
                      </div>
                    </>
                  )}
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
              {canRecordExitInterview(current.status) && (
              <div data-testid="hr-separation-exit-interview" style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
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
              )}

              {awaitingApproval(current.status) && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button id="hr-separation-cancel-request" data-testid="hr-separation-cancel-request" variant="ghost" disabled={busy} style={{ color: "#e11d48" }}
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
