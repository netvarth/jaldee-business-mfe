import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Loader2, AlertCircle, Save, X, Filter, Plane, Users2, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, Select, Input, Checkbox, Textarea, Skeleton, SkeletonTable, MultiCombobox, TimePicker, DatePicker, DataTable, Drawer, SectionCard, Button, type ColumnDef } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";
import { TEAL, lbl, th, tdc, card, PanelHeader, ErrorBar, Center, LEAVE_CATEGORY_OPTIONS, leaveCategoryLabel, type Crud, type Row } from "./SettingsComponents";

function LeavePolicyAssignmentDashboard({ leaveTypes }: { leaveTypes: Crud & { setStatus: (uid: string, status: "Enabled" | "Disabled") => Promise<void> } }) {
  const { eventBus } = useMFEProps();
  const api = useHrApi();
  const navigate = useNavigate();
  const { subsection } = useParams<{ subsection?: string }>();
  const employees = useEmployees();
  const view = subsection === "assign" ? "assignment" : "policies";
  const [policyOpen, setPolicyOpen] = useState(false);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [policyForm, setPolicyForm] = useState<Row>({
    name: "",
    category: "CASUAL",
    annualQuota: 0,
    accrualType: "Monthly",
    paid: true,
    carryForward: false,
    carryForwardMax: 0,
    colorHex: "#115E59",
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [statusPolicy, setStatusPolicy] = useState<(Row & { id: string }) | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [selectedPolicyUid, setSelectedPolicyUid] = useState("");
  const [selectedLeaveTypeUids, setSelectedLeaveTypeUids] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [assignAllActive, setAssignAllActive] = useState(true);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeUids, setSelectedEmployeeUids] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const activeEmployees = useMemo(
    () => employees.data.filter((employee) => !employee.status || String(employee.status).toLowerCase() === "active"),
    [employees.data]
  );
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter((employee) => (
      employee.name.toLowerCase().includes(q) ||
      (employee.employeeId || "").toLowerCase().includes(q) ||
      (employee.department || "").toLowerCase().includes(q) ||
      (employee.email || "").toLowerCase().includes(q)
    ));
  }, [activeEmployees, employeeSearch]);
  const selectedPolicy = leaveTypes.data.find((policy) => policy.id === selectedPolicyUid || policy.uid === selectedPolicyUid);
  const effectiveLeaveTypeUids = selectedLeaveTypeUids.length > 0 ? selectedLeaveTypeUids : selectedPolicyUid ? [selectedPolicyUid] : [];
  const assignmentCount = assignAllActive ? activeEmployees.length : selectedEmployeeUids.length;
  const canAssign = effectiveLeaveTypeUids.length > 0 && !!periodStart && !!periodEnd && !assigning && !employees.loading && (assignAllActive || selectedEmployeeUids.length > 0);

  const openCreatePolicy = () => {
    setEditing(null);
    setPolicyForm({
      name: "",
      category: "CASUAL",
      annualQuota: 0,
      accrualType: "Monthly",
      paid: true,
      carryForward: false,
      carryForwardMax: 0,
      colorHex: "#115E59",
    });
    setPolicyOpen(true);
  };

  const openEditPolicy = (policy: Row & { id: string }) => {
    setEditing(policy);
    setPolicyForm({
      name: policy.name || "",
      category: policy.category || "CASUAL",
      annualQuota: policy.annualQuota ?? 0,
      accrualType: policy.accrualType || "Monthly",
      paid: policy.paid ?? true,
      carryForward: policy.carryForward ?? false,
      carryForwardMax: policy.carryForwardMax ?? 0,
      colorHex: policy.colorHex || "#115E59",
    });
    setPolicyOpen(true);
  };

  const savePolicy = async () => {
    if (!policyForm.name) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Policy", message: "Leave type name is required." });
      return;
    }
    setSavingPolicy(true);
    try {
      const payload = {
        name: policyForm.name,
        category: policyForm.category,
        annualQuota: Number(policyForm.annualQuota || 0),
        accrualType: policyForm.accrualType,
        paid: !!policyForm.paid,
        carryForward: !!policyForm.carryForward,
        carryForwardMax: policyForm.carryForward ? Number(policyForm.carryForwardMax || 0) : 0,
        colorHex: policyForm.colorHex || "#115E59",
      };
      if (editing) await leaveTypes.update(editing.id, payload);
      else await leaveTypes.create(payload);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Leave Policy",
        message: editing ? "Leave type updated successfully." : "Leave type created successfully.",
      });
      setPolicyOpen(false);
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Leave Policy",
        message: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const confirmPolicyStatus = async () => {
    if (!statusPolicy) return;
    const enabled = String(statusPolicy.status || "Enabled").toLowerCase() !== "disabled";
    const nextStatus = enabled ? "Disabled" : "Enabled";
    setStatusSaving(true);
    try {
      await leaveTypes.setStatus(statusPolicy.id, nextStatus);
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", title: "Leave Policy", message: `Leave type ${nextStatus.toLowerCase()} successfully.` });
      setStatusPolicy(null);
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Policy", message: e instanceof Error ? e.message : "Status update failed." });
    } finally {
      setStatusSaving(false);
    }
  };

  const toggleEmployee = (employeeUid: string) => {
    setSelectedEmployeeUids((current) => current.includes(employeeUid)
      ? current.filter((uid) => uid !== employeeUid)
      : [...current, employeeUid]);
  };
  const selectVisibleEmployees = () => {
    setSelectedEmployeeUids((current) => Array.from(new Set([...current, ...filteredEmployees.map((employee) => employee.id)])));
  };
  const clearSelectedEmployees = () => setSelectedEmployeeUids([]);

  const confirmAssignment = async () => {
    if (effectiveLeaveTypeUids.length === 0) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Select at least one leave type." });
      return;
    }
    if (!periodStart || !periodEnd) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Period start and end dates are required." });
      return;
    }
    if (periodEnd < periodStart) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Period end date must be on or after the start date." });
      return;
    }
    if (!assignAllActive && selectedEmployeeUids.length === 0) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Select at least one employee." });
      return;
    }
    setAssigning(true);
    try {
      await api.post("/leaves/balances/assign", {
        leaveTypeUids: effectiveLeaveTypeUids,
        employeeUids: assignAllActive ? [] : selectedEmployeeUids,
        allEmployees: assignAllActive,
        periodStart,
        periodEnd,
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Leave Assignment",
        message: assignAllActive
          ? `Leave balances assigned for ${activeEmployees.length} active employees.`
          : `Leave balances assigned for ${selectedEmployeeUids.length} selected employees.`,
      });
      setSelectedEmployeeUids([]);
      setSelectedLeaveTypeUids([]);
      setSelectedPolicyUid("");
      setAssignAllActive(true);
      setPeriodStart("");
      setPeriodEnd("");
      navigate("/settings/leavetypes");
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Leave Assignment",
        message: e instanceof Error ? e.message : "Assignment failed.",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div id="hr-settings-leave-policy-dashboard" data-testid="hr-settings-leave-policy-dashboard" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <PanelHeader
        title={view === "assignment" ? "Assign Leave Balance" : "Leave Types"}
        subtitle={view === "assignment" ? "Assign explicit balance periods to employees and leave types" : "Define leave types, quotas and carry-forward rules"}
        icon={<Plane size={20} />}
        action={view === "assignment"
          ? <Button id="hr-settings-leave-assignment-back" data-testid="hr-settings-leave-assignment-back" variant="outline" onClick={() => navigate("/settings/leavetypes")}>Back to Leave Types</Button>
          : <Button id="hr-settings-leave-assignment-open" data-testid="hr-settings-leave-assignment-open" variant="primary" icon={<Users2 size={16} />} onClick={() => navigate("/settings/leavetypes/assign")}>Assign Balance</Button>}
      />

      {view === "policies" && <div style={card}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Leave Type Configuration</h3>
            <p style={{ ...lbl, marginTop: 4 }}>Policy builder for quotas, accrual and calendar styling</p>
          </div>
          <Button id="hr-settings-leave-policy-create" data-testid="hr-settings-leave-policy-create" variant="primary" icon={<Plus size={16} />} onClick={openCreatePolicy}>Create New Leave Type</Button>
        </div>
        {leaveTypes.error && <div style={{ padding: "16px 24px" }}><ErrorBar text={leaveTypes.error} /></div>}
        {leaveTypes.loading ? (
          <div style={{ padding: 20 }}><SkeletonTable rows={4} columns={7} /></div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table id="hr-settings-leave-policy-table" data-testid="hr-settings-leave-policy-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Leave Type</th><th style={th}>Category</th><th style={th}>Quota</th><th style={th}>Accrual</th><th style={th}>Rules</th><th style={th}>Color</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {leaveTypes.data.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...tdc, textAlign: "center", ...lbl, padding: "36px 0" }}>No leave types configured.</td></tr>
                ) : leaveTypes.data.map((policy) => (
                  <tr key={policy.id}>
                    <td style={tdc}><b>{policy.name as string}</b></td>
                    <td style={tdc}>{leaveCategoryLabel(policy.category)}</td>
                    <td style={tdc}>{policy.annualQuota != null ? `${policy.annualQuota} days` : "â€”"}</td>
                    <td style={tdc}>{(policy.accrualType as string) || "â€”"}</td>
                    <td style={tdc}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={miniPill(policy.paid ? "#059669" : "#64748b")}>{policy.paid ? "Paid" : "Unpaid"}</span>
                        <span style={miniPill(policy.carryForward ? "#2563eb" : "#64748b")}>{policy.carryForward ? `Carry ${policy.carryForwardMax || 0}d` : "No Carry"}</span>
                      </div>
                    </td>
                    <td style={tdc}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid var(--border-color)", background: (policy.colorHex as string) || "#cbd5e1" }} />{(policy.colorHex as string) || "â€”"}</span></td>
                    <td style={{ ...tdc, textAlign: "right" }}>
                      <button id={`hr-settings-leave-policy-edit-${policy.id}`} data-testid={`hr-settings-leave-policy-edit-${policy.id}`} onClick={() => openEditPolicy(policy)} title="Edit" aria-label="Edit leave type" style={iconAction}><Pencil size={15} /></button>
                      {(() => {
                        const enabled = String(policy.status || "Enabled").toLowerCase() !== "disabled";
                        const action = enabled ? "disable" : "enable";
                        return <button id={`hr-settings-leave-policy-${action}-${policy.id}`} data-testid={`hr-settings-leave-policy-${action}-${policy.id}`} onClick={() => setStatusPolicy(policy)} title={enabled ? "Disable leave type" : "Enable leave type"} aria-label={enabled ? "Disable leave type" : "Enable leave type"} style={{ ...iconAction, width: 38, color: enabled ? "#059669" : "#64748b", background: enabled ? "rgba(5,150,105,0.07)" : "rgba(100,116,139,0.07)" }}>{enabled ? <ToggleRight size={22} strokeWidth={2.2} /> : <ToggleLeft size={22} strokeWidth={2.2} />}</button>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {view === "assignment" && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ ...card, overflow: "visible", padding: 22, position: "relative", zIndex: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18, alignItems: "end" }}>
            <div style={{ minWidth: 0 }}>
              <MultiCombobox
                id="hr-settings-leave-assignment-policy"
                data-testid="hr-settings-leave-assignment-policy"
                label="Leave Type Selection"
                value={effectiveLeaveTypeUids}
                onValueChange={(value) => {
                  setSelectedLeaveTypeUids(value);
                  setSelectedPolicyUid(value[0] || "");
                }}
                placeholder="Select leave types"
                searchPlaceholder="Search leave types..."
                options={leaveTypes.data.map((policy) => ({ value: policy.id, label: String(policy.name || policy.id) }))}
                maxDisplay={3}
              />
            </div>
            <DatePicker
              id="hr-settings-leave-assignment-period-start"
              label="Period Start Date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
            <DatePicker
              id="hr-settings-leave-assignment-period-end"
              label="Period End Date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </div>
          <div style={{ display: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 320px" }}>
              <div style={{ height: 40, width: 40, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users2 size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ ...lbl, display: "block", marginBottom: 3 }}>Employees</span>
                <p style={{ margin: 0, color: "var(--dark-text)", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                  <strong style={{ color: TEAL }}>{assignmentCount} selected</strong>
                  <span style={{ color: "var(--light-text)", fontWeight: 700 }}> Â· {selectedPolicy ? `${selectedPolicy.name} will be assigned to ${assignmentCount} employee${assignmentCount === 1 ? "" : "s"}.` : "Select a leave type to continue."}</span>
                </p>
              </div>
            </div>
            <Button id="hr-settings-leave-assignment-confirm" data-testid="hr-settings-leave-assignment-confirm" variant="primary" icon={<Save size={16} />} onClick={confirmAssignment} disabled={!canAssign} loading={assigning}>Confirm Assignment</Button>
          </div>
        </div>

        <div style={{ ...card, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 280, maxWidth: "100%" }}>
            <button id="hr-settings-leave-assignment-all" data-testid="hr-settings-leave-assignment-all" onClick={() => { setTargetMode("all"); setAssignAllActive(true); setSelectedEmployeeUids([]); }} style={segmentedButton(assignAllActive)} type="button">All Active</button>
            <button id="hr-settings-leave-assignment-specific" data-testid="hr-settings-leave-assignment-specific" onClick={() => { setTargetMode("specific"); setAssignAllActive(false); }} style={segmentedButton(!assignAllActive)} type="button">Specific</button>
          </div>
          <p style={{ margin: 0, color: "var(--dark-text)", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere", textAlign: "right", flex: "1 1 320px" }}>
            <strong style={{ color: TEAL }}>{assignmentCount} selected</strong>
            <span style={{ color: "var(--light-text)", fontWeight: 700 }}> - {selectedPolicy ? `${selectedPolicy.name} will be assigned to ${assignmentCount} employee${assignmentCount === 1 ? "" : "s"}.` : "Select a leave type to continue."}</span>
          </p>
        </div>

        {!assignAllActive && (
          <div style={card}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--dark-text)" }}>Select Employees</h3>
                <p style={{ ...lbl, marginTop: 3 }}>{selectedEmployeeUids.length} selected from {activeEmployees.length} active employees</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button id="hr-settings-leave-select-visible" data-testid="hr-settings-leave-select-visible" variant="outline" onClick={selectVisibleEmployees} type="button">Select Visible</Button>
                <Button id="hr-settings-leave-clear-selected" data-testid="hr-settings-leave-clear-selected" variant="outline" onClick={clearSelectedEmployees} type="button">Clear</Button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <Input
                id="hr-settings-leave-employee-search"
                data-testid="hr-settings-leave-employee-search"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search by name, ID, department, or email"
                className="rounded-xl !h-11 mb-3"
              />
              {employees.loading ? (
                <SkeletonTable rows={5} columns={4} />
              ) : (
                <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Select</th><th style={th}>Employee</th><th style={th}>Department</th><th style={th}>Status</th></tr></thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr><td colSpan={4} style={{ ...tdc, textAlign: "center", ...lbl, padding: "30px 0" }}>No active employees found.</td></tr>
                      ) : filteredEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td style={tdc}><input id={`hr-settings-leave-employee-${employee.id}`} data-testid={`hr-settings-leave-employee-${employee.id}`} type="checkbox" checked={selectedEmployeeUids.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td>
                          <td style={tdc}><b>{employee.name}</b><span style={{ display: "block", ...lbl, fontSize: 8 }}>{employee.employeeId}</span></td>
                          <td style={tdc}>{employee.department || "General"}</td>
                          <td style={tdc}><span style={miniPill("#059669")}>{employee.status || "Active"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button id="hr-settings-leave-assignment-confirm-bottom" data-testid="hr-settings-leave-assignment-confirm-bottom" variant="primary" icon={<Save size={16} />} onClick={confirmAssignment} disabled={!canAssign} loading={assigning}>Confirm Assignment</Button>
        </div>
      </div>}

      <Dialog open={policyOpen} onClose={() => setPolicyOpen(false)} testId="hr-settings-leave-policy-modal" hideHeader contentClassName="max-w-[620px] p-0 overflow-visible">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit Leave Type" : "Create New Leave Type"}</h3>
            <p style={{ ...lbl, marginTop: 3 }}>Define quota, accrual, rules and calendar color</p>
          </div>
          <button id="hr-settings-leave-policy-modal-close" data-testid="hr-settings-leave-policy-modal-close" onClick={() => setPolicyOpen(false)} style={{ background: "none", border: "none", color: "var(--light-text)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Name</label>
            <Input id="hr-settings-leave-policy-name" data-testid="hr-settings-leave-policy-name" value={(policyForm.name as string) || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))} placeholder="Casual Leave" className="rounded-xl !h-11" />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Category</label>
            <Select id="hr-settings-leave-policy-category" testId="hr-settings-leave-policy-category" value={(policyForm.category as string) || "CASUAL"} onChange={(e) => setPolicyForm((f) => ({ ...f, category: e.target.value }))} options={LEAVE_CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Annual Quota</label>
            <Input id="hr-settings-leave-policy-quota" data-testid="hr-settings-leave-policy-quota" type="number" value={String(policyForm.annualQuota ?? "")} onChange={(e) => setPolicyForm((f) => ({ ...f, annualQuota: e.target.value }))} className="rounded-xl !h-11" />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Accrual Type</label>
            <Select id="hr-settings-leave-policy-accrual" testId="hr-settings-leave-policy-accrual" value={(policyForm.accrualType as string) || "Monthly"} onChange={(e) => setPolicyForm((f) => ({ ...f, accrualType: e.target.value }))} options={["Monthly", "Yearly", "Quarterly"].map((value) => ({ value, label: value }))} />
          </div>
          <label style={{ ...ruleToggle(!!policyForm.paid), gridColumn: "1 / -1" }}>
            <input id="hr-settings-leave-policy-paid" data-testid="hr-settings-leave-policy-paid" type="checkbox" checked={!!policyForm.paid} onChange={(e) => setPolicyForm((f) => ({ ...f, paid: e.target.checked }))} />
            <span><b>Is Paid Leave?</b><small style={{ display: "block", color: "var(--light-text)", marginTop: 2 }}>Approved days remain payable.</small></span>
          </label>
          <label style={{ ...ruleToggle(!!policyForm.carryForward), gridColumn: "1 / -1" }}>
            <input id="hr-settings-leave-policy-carry-forward" data-testid="hr-settings-leave-policy-carry-forward" type="checkbox" checked={!!policyForm.carryForward} onChange={(e) => setPolicyForm((f) => ({ ...f, carryForward: e.target.checked }))} />
            <span><b>Allow Carry Forward?</b><small style={{ display: "block", color: "var(--light-text)", marginTop: 2 }}>Unused balance can roll into the next cycle.</small></span>
          </label>
          {policyForm.carryForward && (
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Max Carry Forward Days</label>
              <Input id="hr-settings-leave-policy-carry-forward-max" data-testid="hr-settings-leave-policy-carry-forward-max" type="number" value={String(policyForm.carryForwardMax ?? "")} onChange={(e) => setPolicyForm((f) => ({ ...f, carryForwardMax: e.target.value }))} className="rounded-xl !h-11" />
            </div>
          )}
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Badge Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input id="hr-settings-leave-policy-color-picker" data-testid="hr-settings-leave-policy-color-picker" type="color" value={(policyForm.colorHex as string) || "#115E59"} onChange={(e) => setPolicyForm((f) => ({ ...f, colorHex: e.target.value }))} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--border-color)", padding: 2, background: "var(--surface-bg)" }} />
              <Input id="hr-settings-leave-policy-color" data-testid="hr-settings-leave-policy-color" value={(policyForm.colorHex as string) || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, colorHex: e.target.value }))} placeholder="#115E59" className="rounded-xl !h-11" />
            </div>
          </div>
        </div>
        <div style={{ padding: "18px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button id="hr-settings-leave-policy-cancel" data-testid="hr-settings-leave-policy-cancel" variant="outline" onClick={() => setPolicyOpen(false)}>Cancel</Button>
          <Button id="hr-settings-leave-policy-save" data-testid="hr-settings-leave-policy-save" variant="primary" icon={<Save size={16} />} onClick={savePolicy} loading={savingPolicy}>Save Leave Type</Button>
        </div>
      </Dialog>
      <Dialog
        open={!!statusPolicy}
        onClose={() => !statusSaving && setStatusPolicy(null)}
        testId="hr-settings-leave-policy-status-modal"
        title={`${statusPolicy && String(statusPolicy.status || "Enabled").toLowerCase() !== "disabled" ? "Disable" : "Enable"} Leave Type`}
        description={`Are you sure you want to ${statusPolicy && String(statusPolicy.status || "Enabled").toLowerCase() !== "disabled" ? "disable" : "enable"} this leave type?`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button id="hr-settings-leave-policy-status-cancel" data-testid="hr-settings-leave-policy-status-cancel" variant="outline" onClick={() => setStatusPolicy(null)} disabled={statusSaving}>Cancel</Button>
          <Button id="hr-settings-leave-policy-status-confirm" data-testid="hr-settings-leave-policy-status-confirm" variant="primary" onClick={confirmPolicyStatus} loading={statusSaving}>Confirm</Button>
        </div>
      </Dialog>
    </div>
  );
}

/* ---- small shared bits ---- */

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 24, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const ghostBtn: CSSProperties = { height: 42, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 42, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const iconAction: CSSProperties = { height: 32, width: 32, borderRadius: 9, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--light-text)", cursor: "pointer", marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const wizardStep: CSSProperties = { display: "flex", gap: 14, padding: 16, borderRadius: 16, border: "1px solid var(--border-color)", background: "rgba(100,116,139,0.03)" };
const stepBadge: CSSProperties = { height: 28, width: 28, borderRadius: 10, background: "rgba(17,94,89,0.1)", color: TEAL, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 };
const miniPill = (color: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, background: `${color}12`, color, border: `1px solid ${color}24`, fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" });
const segmentedButton = (active: boolean): CSSProperties => ({ height: 42, borderRadius: 12, border: active ? "1px solid rgba(17,94,89,0.35)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.08)" : "var(--surface-bg)", color: active ? TEAL : "var(--dark-text)", fontSize: 12, fontWeight: 900, cursor: "pointer" });
const assignmentActionRow: CSSProperties = { padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" };
const radioCard = (active: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: active ? "1px solid rgba(17,94,89,0.28)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.06)" : "var(--surface-bg)", color: "var(--dark-text)", fontSize: 13, cursor: "pointer" });
const ruleToggle = (active: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: active ? "1px solid rgba(17,94,89,0.28)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.06)" : "rgba(100,116,139,0.03)", color: "var(--dark-text)", fontSize: 13, cursor: "pointer" });

export { LeavePolicyAssignmentDashboard };
