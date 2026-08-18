import React from "react";
import { Eye, Info, X, Check, CheckCircle2, Save } from "lucide-react";
import { Dialog, Select, Textarea, Button, DatePicker, Combobox } from "@jaldee/design-system";
import type { LeaveRequest, LeaveBalance } from "../../services/useLeaveData";
import type { LeaveType } from "../../services/useSettingsData";

const TEAL = "var(--primary-color)";
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)" };
const infoBox: React.CSSProperties = { padding: 12, borderRadius: 12, background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)" };
const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center" };

export interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
  form: {
    employeeUid: string;
    leaveTypeUid: string;
    type: string;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    halfDayType: "FIRST_HALF" | "SECOND_HALF";
    reason: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    employeeUid: string;
    leaveTypeUid: string;
    type: string;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    halfDayType: "FIRST_HALF" | "SECOND_HALF";
    reason: string;
  }>>;
  applyErrors: Partial<Record<"employeeUid" | "leaveTypeUid" | "startDate" | "reason", string>>;
  setApplyErrors: React.Dispatch<React.SetStateAction<Partial<Record<"employeeUid" | "leaveTypeUid" | "startDate" | "reason", string>>>>;
  employeeOptions: {
    data: Array<{ id?: string; name?: string; employeeId?: string }>;
    searchValue: string;
    onSearchChange: (v: string) => void;
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
  };
  assignedLeaveTypes: LeaveType[];
  leaveTypesLoading: boolean;
  balancesLoading: boolean;
  calcDays: (start?: string, end?: string, isHalf?: boolean) => number;
  showInsufficientBalanceWarning: boolean;
  missingApplyFieldsText?: string;
  msg: string | null;
  submitApply: () => Promise<void>;
  saving: boolean;
}

export function ApplyLeaveModal(props: ApplyModalProps) {
  const {
    open, onClose, form, setForm, applyErrors, setApplyErrors, employeeOptions,
    assignedLeaveTypes, leaveTypesLoading, balancesLoading, calcDays,
    showInsufficientBalanceWarning, missingApplyFieldsText, msg, submitApply, saving,
  } = props;

  return (
    <Dialog open={open} onClose={onClose} testId="hr-leave-apply-modal" hideHeader contentClassName="max-w-[760px] p-0 overflow-visible">
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Log Absence Application</h3>
          <p style={{ ...lbl, marginTop: 3 }}>Request time off for an employee with live quota balance checking</p>
        </div>
        <button id="hr-leave-apply-modal-close" data-testid="hr-leave-apply-modal-close" onClick={onClose} style={iconBtn}><X size={20} /></button>
      </div>
      {missingApplyFieldsText && (
        <div id="hr-leave-apply-validation-summary" data-testid="hr-leave-apply-validation-summary" style={{ margin: "16px 24px 0", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          Please select or enter {missingApplyFieldsText} before submitting.
        </div>
      )}
      <div className="max-[480px]:!grid-cols-1" style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Combobox
            id="hr-leave-employee-uid"
            data-testid="hr-leave-employee"
            testId="hr-leave-employee"
            label="Applicant Staff Member"
            value={form.employeeUid}
            onValueChange={(val) => { setForm({ ...form, employeeUid: val, leaveTypeUid: "", type: "" }); setApplyErrors((current) => ({ ...current, employeeUid: undefined })); }}
            placeholder="Select employee"
            searchPlaceholder="Search employees..."
            searchValue={employeeOptions.searchValue}
            onSearchChange={employeeOptions.onSearchChange}
            loading={employeeOptions.loading}
            hasMore={employeeOptions.hasMore}
            onEndReached={employeeOptions.onLoadMore}
            options={employeeOptions.data.map((employee) => {
              const name = employee.name || employee.id || "Employee";
              const empId = employee.employeeId ? ` ${employee.employeeId}` : "";
              const fullLabel = employee.employeeId && !name.includes(employee.employeeId) ? `${name}${empId}` : name;
              return {
                value: employee.id || "",
                label: fullLabel,
              };
            })}
          />
          <Select
            id="hr-leave-type-uid"
            testId="hr-leave-type"
            data-testid="hr-leave-type"
            label="Leave Type Category"
            value={form.leaveTypeUid}
            onChange={(e) => {
              const selectedLeaveType = assignedLeaveTypes.find((type) => type.id === e.target.value || type.uid === e.target.value);
              setForm({ ...form, leaveTypeUid: e.target.value, type: selectedLeaveType?.name || "" });
              setApplyErrors((current) => ({ ...current, leaveTypeUid: undefined }));
            }}
            placeholder={leaveTypesLoading || balancesLoading ? "Loading assigned leave types" : "Select leave type"}
            options={assignedLeaveTypes.map((type) => ({ value: type.id, label: type.name || type.id }))}
          />
          {form.employeeUid && !leaveTypesLoading && !balancesLoading && assignedLeaveTypes.length === 0 && (
            <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", color: "#b45309", fontSize: 12, fontWeight: 700 }}>
              No active leave types assigned to this employee.
            </div>
          )}
          <div className="max-[480px]:!grid-cols-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <DatePicker
              id="hr-leave-start-date"
              data-testid="hr-leave-start-date"
              label="Start Date"
              value={form.startDate}
              onChange={(e) => { setForm({ ...form, startDate: e.target.value }); setApplyErrors((current) => ({ ...current, startDate: undefined })); }}
            />
            <DatePicker
              id="hr-leave-end-date"
              data-testid="hr-leave-end-date"
              label="End Date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          {form.startDate && (!form.endDate || form.startDate === form.endDate) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>
                <input id="hr-leave-half-day" data-testid="hr-leave-half-day" type="checkbox" checked={form.isHalfDay} onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })} /> Apply as Half Day (0.5 days)
              </label>
              {form.isHalfDay && (
                <div style={{ padding: 12, background: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.18)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ ...lbl, color: TEAL }}>Half-Day Session</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      id="hr-leave-half-day-session-first"
                      data-testid="hr-leave-half-day-session-first"
                      onClick={() => setForm({ ...form, halfDayType: "FIRST_HALF" })}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: form.halfDayType === "FIRST_HALF" ? "2px solid var(--primary-color)" : "1px solid var(--border-color)",
                        background: form.halfDayType === "FIRST_HALF" ? "rgba(13,148,136,0.1)" : "var(--surface-bg)",
                        color: form.halfDayType === "FIRST_HALF" ? "var(--primary-color)" : "var(--dark-text)",
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      First Half
                    </button>
                    <button
                      type="button"
                      id="hr-leave-half-day-session-second"
                      data-testid="hr-leave-half-day-session-second"
                      onClick={() => setForm({ ...form, halfDayType: "SECOND_HALF" })}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: form.halfDayType === "SECOND_HALF" ? "2px solid var(--primary-color)" : "1px solid var(--border-color)",
                        background: form.halfDayType === "SECOND_HALF" ? "rgba(13,148,136,0.1)" : "var(--surface-bg)",
                        color: form.halfDayType === "SECOND_HALF" ? "var(--primary-color)" : "var(--dark-text)",
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Second Half
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {form.startDate && (
            <div style={{ background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.1)", padding: 14, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...lbl, color: TEAL }}>Total Days Count</span>
              <span style={{ background: TEAL, color: "white", fontWeight: 900, fontSize: 12, padding: "4px 12px", borderRadius: 999 }}>{calcDays(form.startDate, form.endDate || form.startDate, form.isHalfDay)} Days</span>
            </div>
          )}
          {showInsufficientBalanceWarning && (
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", padding: 14, borderRadius: 14, color: "#92400e", fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>
              You have insufficient balance for this leave type. Your manager may approve this as Loss of Pay or reject it.
            </div>
          )}
          <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: 14, display: "flex", gap: 12 }}>
            <div style={{ height: 36, width: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Info size={18} /></div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", lineHeight: 1.45, margin: 0 }}>Leave balances are real-time and auto-deducted once administrators verify and approve your request.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Textarea
            id="hr-leave-reason"
            data-testid="hr-leave-reason"
            label="Detailed Statement / Reason"
            placeholder="Share a short note detailing the cause of your request…"
            value={form.reason}
            onChange={(e) => { setForm({ ...form, reason: e.target.value }); setApplyErrors((current) => ({ ...current, reason: undefined })); }}
            style={{ flex: 1, minHeight: 180, borderRadius: 12, border: applyErrors.reason ? "1px solid #e11d48" : "1px solid var(--border-color)", background: "var(--surface-bg)", padding: 12, fontSize: 13, color: "var(--dark-text)" }}
          />
          {applyErrors.reason && (
            <span id="hr-leave-reason-error" data-testid="hr-leave-reason-error" style={{ color: "#e11d48", fontSize: 11, fontWeight: 700, marginTop: 4 }}>
              {applyErrors.reason}
            </span>
          )}
        </div>
      </div>
      {msg && <div style={{ margin: "0 24px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
      <div className="max-[480px]:!px-4 max-[480px]:[&>button]:flex-1" style={{ padding: "16px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, shrink: 0 }}>
        <Button id="hr-leave-apply-cancel" data-testid="hr-leave-apply-cancel" variant="outline" onClick={onClose}>Close</Button>
        <Button id="hr-leave-apply-submit" data-testid="hr-leave-apply-submit" variant="primary" onClick={submitApply} disabled={leaveTypesLoading} loading={saving}>Submit Application</Button>
      </div>
    </Dialog>
  );
}

export interface DetailModalProps {
  selected: LeaveRequest | null;
  onClose: () => void;
  empName: (uid?: string) => string;
  empCode: (uid?: string) => string;
  empDept: (uid?: string) => string;
  formatLeaveDate: (iso?: string) => string;
  calcDays: (start?: string, end?: string, isHalf?: boolean) => number;
  balanceTypes: Array<{ type: string; uid?: string }>;
  balFor: (uid: string, type: string, leaveTypeUid?: string) => LeaveBalance[];
  balanceStatusPill: (s?: string) => React.CSSProperties;
  remarks: string;
  setRemarks: (r: string) => void;
  approvalError: string | null;
  act: (action: "APPROVE" | "APPROVE_AS_LOSS_OF_PAY" | "REJECT") => Promise<void>;
  acting: boolean;
}

export function LeaveDetailModal(props: DetailModalProps) {
  const {
    selected, onClose, empName, empCode, empDept, formatLeaveDate, calcDays,
    balanceTypes, balFor, balanceStatusPill, remarks, setRemarks, approvalError, act, acting,
  } = props;

  if (!selected) return null;

  return (
    <Dialog
      open={!!selected}
      onClose={onClose}
      testId="hr-leave-detail-modal"
      hideHeader
      contentClassName="max-w-[760px] h-auto max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] p-0 overflow-hidden flex flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 28px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Leave Request Detail</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{empName(selected.employeeUid)} · {empCode(selected.employeeUid)}</p></div>
        <button id="hr-leave-detail-close" data-testid="hr-leave-detail-close" onClick={onClose} style={iconBtn}><X size={20} /></button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Applicant</span><span style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)", display: "block", marginTop: 4 }}>{empName(selected.employeeUid)}</span></div>
          <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Department</span><span style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)", display: "block", marginTop: 4 }}>{empDept(selected.employeeUid)}</span></div>
        </div>
        <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><span style={{ ...lbl, fontSize: 8, color: "#2563eb" }}>Period</span><div style={{ fontSize: 13, fontWeight: 800, color: TEAL, marginTop: 2 }}>{formatLeaveDate(selected.startDate)} to {formatLeaveDate(selected.endDate)}</div></div>
            <div><span style={{ ...lbl, fontSize: 8, color: "#2563eb" }}>Requested</span><div><span style={{ background: TEAL, color: "white", fontWeight: 900, fontSize: 12, padding: "3px 12px", borderRadius: 999, display: "inline-block", marginTop: 2 }}>{selected.isHalfDay ? `0.5 Day (${selected.halfDayType === "SECOND_HALF" ? "Second Half" : "First Half"})` : `${calcDays(selected.startDate, selected.endDate, false)} Days`}</span></div></div>
          </div>
        </div>
        {balanceTypes.some((q) => balFor(selected.employeeUid || "", q.type, q.uid).length > 0) && (
          <div>
            <span style={{ ...lbl, marginBottom: 8, display: "block" }}>Applicant Remaining Balance</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {balanceTypes.filter((q) => balFor(selected.employeeUid || "", q.type, q.uid).length > 0).map((q) => {
                const isReq = q.type.toLowerCase() === (selected.leaveTypeName || selected.type || "").toLowerCase();
                const balancesList = balFor(selected.employeeUid || "", q.type, q.uid);
                const activeList = balancesList.filter((b) => (b.status || "ACTIVE").toUpperCase() === "ACTIVE");
                const avl = activeList.reduce((s, b) => s + (b.available ?? 0), 0);
                const status = activeList.length > 0 ? "ACTIVE" : (balancesList[0]?.status || "EXPIRED").toUpperCase();
                return (
                  <div key={q.type} style={{ padding: 10, borderRadius: 12, textAlign: "center", opacity: status === "ACTIVE" ? 1 : 0.55, background: isReq ? "rgba(17,94,89,0.08)" : "rgba(100,116,139,0.04)", border: isReq ? "1px solid rgba(17,94,89,0.3)" : "1px solid var(--border-color)" }}>
                    <span style={{ ...lbl, fontSize: 7.5, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: isReq ? TEAL : "var(--dark-text)", display: "block", marginTop: 2 }}>{avl} avl</span>
                    <span style={{ ...balanceStatusPill(status), display: "inline-block", marginTop: 5, padding: "1px 5px", borderRadius: 6, fontSize: 7.5, fontWeight: 800 }}>{status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 14 }}>
          <span style={{ ...lbl, fontSize: 8, display: "block", marginBottom: 4 }}>Applicant Statement / Cause</span>
          <p style={{ fontSize: 13, color: "var(--dark-text)", margin: 0, fontStyle: "italic" }}>“{selected.reason}”</p>
        </div>
        {(selected.status || "").toLowerCase() === "pending" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ ...lbl, display: "block" }}>Manager Remarks / Feedback</label>
            <Textarea
              id="hr-leave-detail-remarks"
              data-testid="hr-leave-detail-remarks"
              placeholder="Add optional notes for approval or required reason for rejection..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: "100%", height: 72, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: 10, fontSize: 12.5 }}
            />
            {approvalError && <div style={{ fontSize: 11, color: "#e11d48", fontWeight: 700 }}>{approvalError}</div>}
          </div>
        )}
      </div>
      {(selected.status || "").toLowerCase() === "pending" ? (
        <div className="max-[480px]:!px-4 max-[480px]:[&>button]:flex-1" style={{ padding: "16px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 10, shrink: 0 }}>
          <Button id="hr-leave-detail-reject" data-testid="hr-leave-detail-reject" variant="danger" icon={<X size={15} />} onClick={() => act("REJECT")} loading={acting}>Reject Request</Button>
          <Button id="hr-leave-detail-approve-lop" data-testid="hr-leave-detail-approve-lop" variant="outline" icon={<Save size={15} />} onClick={() => act("APPROVE_AS_LOSS_OF_PAY")} loading={acting} className="!border-[rgba(245,158,11,0.3)] !bg-[rgba(245,158,11,0.08)] !text-[#b45309]">Approve as LOP</Button>
          <Button id="hr-leave-detail-approve" data-testid="hr-leave-detail-approve" variant="primary" icon={<Check size={15} />} onClick={() => act("APPROVE")} loading={acting}>Approve Request</Button>
        </div>
      ) : (
        <div style={{ padding: "16px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
          <Button id="hr-leave-detail-close-bottom" data-testid="hr-leave-detail-close-bottom" variant="outline" onClick={onClose}>Close Inspection</Button>
        </div>
      )}
    </Dialog>
  );
}
