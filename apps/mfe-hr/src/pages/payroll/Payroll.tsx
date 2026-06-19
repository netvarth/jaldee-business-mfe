import { useMemo, useState, type CSSProperties } from "react";
import { Download, Play, Plus, History as HistoryIcon, Loader2, UserPlus, X } from "lucide-react";
import { PageHeader, Select, Dialog, MonthPicker, SkeletonTable } from "@jaldee/design-system";
import { useEmployees } from "../../services/useEmployees";
import {
  usePayslips,
  usePayrollRuns,
  usePayrollPlans,
  type Payslip,
  type PayrollPlan,
} from "../../services/usePayrollData";
import { formatCurrency, formatDate, exportToCSV } from "../../lib/utils";
import type { SalaryStructure } from "../../types";

type Tab = "overview" | "structure" | "plans" | "history";

const inr = (n?: number) => formatCurrency(n ?? 0);

/** Built-in salary components (custom/admin-defined components are a backend follow-up). */
const COMP_GROUPS: { title: string; keys: (keyof SalaryStructure)[] }[] = [
  { title: "Earnings", keys: ["basic", "hra", "allowance"] },
  { title: "Deductions", keys: ["pf", "esiEmployee", "tax", "professionalTax", "lwf", "otherDeductions"] },
  { title: "Employer Contributions", keys: ["pfEmployer", "esiEmployer"] },
];
const COMP_LABEL: Record<string, string> = {
  basic: "Basic", hra: "HRA", allowance: "Allowance",
  pf: "PF (Employee)", esiEmployee: "ESI (Employee)", tax: "TDS / Tax",
  professionalTax: "Professional Tax", lwf: "LWF", otherDeductions: "Other Deductions",
  pfEmployer: "PF (Employer)", esiEmployer: "ESI (Employer)",
};
const ALL_COMP_KEYS = COMP_GROUPS.flatMap((g) => g.keys);

function StageCard({ stage, label, value, pill, dark }: {
  stage: string; label: string; value: string; pill?: string; dark?: boolean;
}) {
  return (
    <div style={{
      background: dark ? "var(--dark-bg)" : "var(--surface-bg)",
      border: dark ? "none" : "1px solid var(--border-color)",
      borderRadius: 16, padding: "20px 22px", boxShadow: "var(--shadow-sm)",
      display: "flex", flexDirection: "column", gap: 6, minHeight: 132, justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: dark ? "rgba(255,255,255,0.5)" : "var(--light-text)" }}>{stage}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: dark ? "rgba(255,255,255,0.7)" : "var(--light-text)" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: dark ? "white" : "var(--dark-text)", marginTop: 4, fontFamily: "var(--font-heading)" }}>{value}</div>
      </div>
      {pill && (
        <div style={{ fontSize: 11, fontWeight: 700, color: dark ? "#6ee7b7" : "var(--primary-color)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: dark ? "#6ee7b7" : "var(--primary-color)", display: "inline-block" }} />
          {pill}
        </div>
      )}
    </div>
  );
}

export default function Payroll() {
  const [tab, setTab] = useState<Tab>("overview");
  const { data: employees, assignStructure } = useEmployees();
  const payslips = usePayslips();
  const runs = usePayrollRuns();
  const plans = usePayrollPlans();

  const empName = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, e.name] as const));
    return (uid?: string) => (uid ? m.get(uid) ?? uid : "—");
  }, [employees]);

  const monthNow = new Date().toISOString().slice(0, 7);
  const [genEmp, setGenEmp] = useState("");
  const [genMonth, setGenMonth] = useState(monthNow);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);

  const stats = useMemo(() => {
    const totalPayout = payslips.data.reduce((a, p) => a + (p.netPay ?? 0), 0);
    const basics = employees.map((e) => e.salaryStructure?.basic ?? 0).filter((n) => n > 0);
    const avgSalary = basics.length ? basics.reduce((a, b) => a + b, 0) / basics.length : 0;
    const pending = payslips.data.filter((p) => (p.status || "").toLowerCase() === "pending").length;
    const taxLiability = employees.reduce((a, e) => a + (e.salaryStructure?.tax ?? 0), 0);
    return { totalPayout, avgSalary, pending, taxLiability };
  }, [payslips.data, employees]);

  const handleGenerate = async () => {
    if (!genEmp) { setMsg("Select an employee."); return; }
    setBusy(true); setMsg(null);
    try { await payslips.generate(genEmp, genMonth); setMsg("Payslip generated."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Generation failed."); }
    finally { setBusy(false); }
  };

  const handleRunPayroll = async () => {
    setBusy(true); setMsg(null);
    try {
      const run = await runs.processRun(genMonth);
      await payslips.reload();
      setMsg(
        `Processed ${run?.employeeCount ?? 0} employee(s) for ${genMonth}. ` +
        `Net payout: ${inr(run?.totalPayout)}.`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payroll run failed.");
    } finally { setBusy(false); }
  };

  const handleExport = () => exportToCSV(
    ["Employee", "Month", "Net Pay", "Status", "Generated"],
    payslips.data.map((p) => [empName(p.employeeUid), p.month ?? "", p.netPay ?? 0, p.status ?? "", formatDate(p.generatedAt)]),
    "payroll-export.csv"
  );

  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, string>>({ name: "" });
  const submitPlan = async () => {
    if (!plan.name) return;
    const payload: Record<string, unknown> = { name: plan.name };
    ALL_COMP_KEYS.forEach((k) => { payload[k] = Number(plan[k]) || 0; });
    if (editingPlanId) await plans.updatePlan(editingPlanId, payload);
    else await plans.createPlan(payload);
    setPlanOpen(false); setPlan({ name: "" }); setEditingPlanId(null);
  };
  const openNewPlan = () => {
    setEditingPlanId(null);
    setPlan({ name: "" });
    setPlanOpen(true);
  };
  const openEditPlan = (currentPlan: PayrollPlan) => {
    const values: Record<string, string> = { name: currentPlan.name ?? "" };
    ALL_COMP_KEYS.forEach((key) => {
      const value = (currentPlan as Record<string, unknown>)[key];
      values[key] = value == null ? "" : String(value);
    });
    setEditingPlanId(currentPlan.id);
    setPlan(values);
    setPlanOpen(true);
  };
  const removePlan = async (currentPlan: PayrollPlan) => {
    if (!window.confirm(`Delete plan "${currentPlan.name}"?`)) return;
    await plans.removePlan(currentPlan.id);
  };

  /* ---- Assign salary structure to an employee (doubles as edit) ---- */
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignStruct, setAssignStruct] = useState<SalaryStructure>({});
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const openAssign = (planId?: string) => {
    setAssignEmpId(""); setAssignMsg(null);
    const p = planId ? plans.data.find((pl) => pl.id === planId) : undefined;
    const seed: SalaryStructure = {};
    if (p) ALL_COMP_KEYS.forEach((k) => { (seed as Record<string, unknown>)[k] = (p as Record<string, unknown>)[k]; });
    setAssignStruct(seed);
    setAssignOpen(true);
  };
  const pickAssignEmp = (id: string) => {
    setAssignEmpId(id);
    // Pre-fill from the employee's current structure so re-opening = edit.
    const emp = employees.find((e) => e.id === id);
    if (emp?.salaryStructure) setAssignStruct({ ...emp.salaryStructure });
  };
  const applyPlan = (planId: string) => {
    const p = plans.data.find((pl) => pl.id === planId);
    if (!p) return;
    const next: SalaryStructure = { ...assignStruct };
    ALL_COMP_KEYS.forEach((k) => { (next as Record<string, unknown>)[k] = (p as Record<string, unknown>)[k]; });
    setAssignStruct(next);
  };
  const saveAssign = async () => {
    const emp = employees.find((e) => e.id === assignEmpId);
    if (!emp) { setAssignMsg("Select an employee."); return; }
    setAssignBusy(true); setAssignMsg(null);
    try {
      await assignStructure(emp, assignStruct);
      setAssignMsg("Salary structure saved.");
      setTimeout(() => setAssignOpen(false), 700);
    } catch (e) { setAssignMsg(e instanceof Error ? e.message : "Save failed."); }
    finally { setAssignBusy(false); }
  };
  const assignGross = ["basic", "hra", "allowance"].reduce((a, k) => a + ((assignStruct as Record<string, number>)[k] || 0), 0);
  const assignDed = ["pf", "esiEmployee", "tax", "professionalTax", "lwf", "otherDeductions"].reduce((a, k) => a + ((assignStruct as Record<string, number>)[k] || 0), 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "structure", label: "Structure" },
    { key: "plans", label: "Create & Assign Plans" },
    { key: "history", label: "History" },
  ];

  const tabBtn = (active: boolean): CSSProperties => ({
    padding: "8px 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer",
    background: active ? "var(--surface-bg)" : "transparent",
    color: active ? "var(--dark-text)" : "var(--light-text)",
    boxShadow: active ? "var(--shadow-sm)" : "none", textTransform: "capitalize",
  });

  const fieldStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 14, background: "var(--surface-bg)", color: "var(--dark-text)" };
  const thStyle: CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--light-text)", borderBottom: "1px solid var(--border-color)" };
  const tdStyle: CSSProperties = { padding: "14px 16px", fontSize: 14, color: "var(--dark-text)", borderBottom: "1px solid var(--border-color)" };
  const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)", display: "inline-flex", alignItems: "center", justifyContent: "center" };

  return (
    <section id="hr-payroll-page" data-testid="hr-payroll-page" className="page-section active" style={{ background: "var(--app-bg)", flexGrow: 1, minWidth: 0 }}>
      <PageHeader
        title="Payroll Management"
        subtitle="Financial operations"
        actions={
          <>
          <button id="hr-payroll-run" data-testid="hr-payroll-run" className="btn btn-secondary" onClick={handleRunPayroll} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 12 }}>
            <Play size={16} /> Run Payroll
          </button>
          <button id="hr-payroll-export" data-testid="hr-payroll-export" className="btn btn-primary" onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 12 }}>
            <Download size={16} /> Export
          </button>
          </>
        }
      />

      {/* TABS */}
      <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "var(--border-color)", borderRadius: 12, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button key={t.key} id={`hr-payroll-tab-${t.key}`} data-testid={`hr-payroll-tab-${t.key}`} data-active={tab === t.key ? "true" : "false"} style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* STAGE CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StageCard stage="STAGE 1" label="Total Payout" value={inr(stats.totalPayout)} pill={`${payslips.data.length} Payslips`} dark />
        <StageCard stage="STAGE 2" label="Avg Salary" value={inr(stats.avgSalary)} pill={`${employees.length} Employees`} />
        <StageCard stage="STAGE 3" label="Pending" value={String(stats.pending)} />
        <StageCard stage="STAGE 4" label="Tax Liability" value={inr(stats.taxLiability)} />
      </div>

      {/* TAB BODY */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
          {/* Recent payslips */}
          <div id="hr-payroll-recent-payslips" data-testid="hr-payroll-recent-payslips" className="modal-card" style={{ position: "relative", transform: "none", left: 0, top: 0, width: "100%", maxHeight: "none", boxShadow: "var(--shadow-sm)" }}>
            <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Recent Payslips</h3>
                <p className="modal-subtitle" style={{ margin: "2px 0 0" }}>Digital Records</p>
              </div>
              <HistoryIcon size={18} stroke="var(--light-text)" />
            </div>
            {payslips.loading ? (
              <div className="p-4">
                <SkeletonTable rows={4} columns={5} />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table id="hr-payroll-payslips-table" data-testid="hr-payroll-payslips-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={thStyle}>Employee</th><th style={thStyle}>Month</th><th style={thStyle}>Net Pay</th><th style={thStyle}>Status</th><th style={{ ...thStyle, textAlign: "right" }}>Action</th></tr></thead>
                  <tbody>
                    {payslips.data.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--light-text)", padding: "48px 16px" }}>No records found</td></tr>
                    ) : payslips.data.map((p) => (
                      <tr key={p.id} id={`hr-payroll-payslip-row-${p.id}`} data-testid={`hr-payroll-payslip-row-${p.id}`}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{empName(p.employeeUid)}</td>
                        <td style={{ ...tdStyle, color: "var(--light-text)" }}>{p.month || "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{p.netPay != null ? inr(p.netPay) : "—"}</td>
                        <td style={tdStyle}><span className="badge" style={{ background: "var(--success-bg)", color: "var(--success-color)", padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{p.status || "—"}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}><button id={`hr-payroll-payslip-view-${p.id}`} data-testid={`hr-payroll-payslip-view-${p.id}`} className="btn-grid-action" onClick={() => setViewSlip(p)} style={{ borderRadius: 12 }}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick create */}
          <div id="hr-payroll-quick-create" data-testid="hr-payroll-quick-create" className="modal-card" style={{ position: "relative", transform: "none", left: 0, top: 0, width: "100%", maxHeight: "none", boxShadow: "var(--shadow-sm)" }}>
            <div className="modal-header" style={{ padding: "20px 24px" }}><h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Quick Create</h3></div>
            <div className="modal-body" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <Select
                id="hr-payroll-generate-employee"
                testId="hr-payroll-generate-employee"
                label="Employee"
                value={genEmp}
                onChange={(e) => setGenEmp(e.target.value)}
                placeholder="Select employee"
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
              />
              <MonthPicker
                id="hr-payroll-generate-month"
                data-testid="hr-payroll-generate-month"
                label="Month"
                value={genMonth}
                onChange={(e) => setGenMonth(e.target.value)}
              />
              <button id="hr-payroll-generate-submit" data-testid="hr-payroll-generate-submit" className="btn btn-primary" onClick={handleGenerate} disabled={busy} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--primary-color)", border: "none", color: "white", borderRadius: 12 }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> Working…</> : "Generate Payslip"}
              </button>
              {msg && <div style={{ fontSize: 12, color: "var(--light-text)", textAlign: "center" }}>{msg}</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "structure" && (
        <div className="modal-card" style={{ position: "relative", transform: "none", left: 0, top: 0, width: "100%", maxHeight: "none", boxShadow: "var(--shadow-sm)" }}>
          <div className="modal-header" style={{ padding: "20px 24px" }}><h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Salary Structures</h3></div>
          {plans.loading ? (
            <div className="p-4">
              <SkeletonTable rows={4} columns={5} />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={thStyle}>Plan</th><th style={thStyle}>Basic</th><th style={thStyle}>HRA</th><th style={thStyle}>Allowance</th><th style={thStyle}>Deductions</th></tr></thead>
                <tbody>
                  {plans.data.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--light-text)", padding: "48px 16px" }}>No salary plans configured.</td></tr>
                  ) : plans.data.map((p) => (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name || "—"}</td>
                      <td style={tdStyle}>{p.basic != null ? inr(p.basic) : "—"}</td>
                      <td style={tdStyle}>{p.hra != null ? inr(p.hra) : "—"}</td>
                      <td style={tdStyle}>{p.allowance != null ? inr(p.allowance) : "—"}</td>
                      <td style={tdStyle}>{p.otherDeductions != null ? inr(p.otherDeductions) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "plans" && (
        <div className="modal-card" style={{ position: "relative", transform: "none", left: 0, top: 0, width: "100%", maxHeight: "none", boxShadow: "var(--shadow-sm)" }}>
          <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
            <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Create &amp; Assign Plans</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button id="hr-payroll-assign-open" data-testid="hr-payroll-assign-open" className="btn btn-secondary" onClick={() => openAssign()} style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 12 }}><UserPlus size={16} /> Assign to Employee</button>
              <button id="hr-payroll-plan-toggle" data-testid="hr-payroll-plan-toggle" data-state={planOpen ? "open" : "closed"} className="btn btn-primary" onClick={openNewPlan} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--primary-color)", border: "none", color: "white", borderRadius: 12 }}><Plus size={16} /> New Plan</button>
            </div>
          </div>
          {planOpen && (
            <div style={{ padding: 24, borderBottom: "1px solid var(--border-color)" }}>
              <div className="form-group" style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 6 }}>Plan Name</label><input id="hr-payroll-plan-name" data-testid="hr-payroll-plan-name" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} style={fieldStyle} /></div>
              {COMP_GROUPS.map((g) => (
                <div key={g.title} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)", marginBottom: 8 }}>{g.title}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                    {g.keys.map((k) => (
                      <div className="form-group" key={k} style={{ margin: 0 }}>
                        <label>{COMP_LABEL[k]}</label>
                        <input id={`hr-payroll-plan-${k}`} data-testid={`hr-payroll-plan-${k}`} type="number" value={plan[k] ?? ""} onChange={(e) => setPlan({ ...plan, [k]: e.target.value })} style={fieldStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button id="hr-payroll-plan-save" data-testid="hr-payroll-plan-save" className="btn btn-primary" onClick={submitPlan} disabled={!plan.name} style={{ background: "var(--primary-color)", border: "none", color: "white", borderRadius: 12 }}>{editingPlanId ? "Update Plan" : "Save Plan"}</button>
              </div>
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={thStyle}>Plan</th><th style={thStyle}>Basic</th><th style={thStyle}>HRA</th><th style={thStyle}>Allowance</th><th style={thStyle}>Deductions</th><th style={{ ...thStyle, textAlign: "right" }}>Action</th></tr></thead>
              <tbody>
                {plans.data.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--light-text)", padding: "32px 16px" }}>No plans yet.</td></tr>
                ) : plans.data.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={tdStyle}>{inr(p.basic)}</td>
                    <td style={tdStyle}>{inr(p.hra)}</td>
                    <td style={tdStyle}>{inr(p.allowance)}</td>
                    <td style={tdStyle}>{inr(p.otherDeductions)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button id={`hr-payroll-plan-assign-${p.id}`} data-testid={`hr-payroll-plan-assign-${p.id}`} className="btn-grid-action" onClick={() => openAssign(p.id)} style={{ borderRadius: 12 }}>Assign</button>
                        <button id={`hr-payroll-plan-edit-${p.id}`} data-testid={`hr-payroll-plan-edit-${p.id}`} className="btn-grid-action" onClick={() => openEditPlan(p)} style={{ borderRadius: 12 }}>Edit</button>
                        <button id={`hr-payroll-plan-delete-${p.id}`} data-testid={`hr-payroll-plan-delete-${p.id}`} className="btn-grid-action" onClick={() => void removePlan(p)} style={{ borderRadius: 12, color: "var(--danger-color, #dc2626)" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="modal-card" style={{ position: "relative", transform: "none", left: 0, top: 0, width: "100%", maxHeight: "none", boxShadow: "var(--shadow-sm)" }}>
          <div className="modal-header" style={{ padding: "20px 24px" }}><h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Payroll Runs</h3></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={thStyle}>Month</th><th style={thStyle}>Employees</th><th style={thStyle}>Net Payout</th><th style={thStyle}>Deductions</th><th style={thStyle}>Employer Cost</th><th style={thStyle}>Status</th><th style={thStyle}>Processed</th></tr></thead>
              <tbody>
                {runs.loading ? (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "var(--light-text)" }}>Loading…</td></tr>
                ) : runs.data.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "var(--light-text)", padding: "48px 16px" }}>No payroll runs yet.</td></tr>
                ) : runs.data.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.month || "—"}</td>
                    <td style={tdStyle}>{r.employeeCount ?? "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.totalPayout != null ? inr(r.totalPayout) : "—"}</td>
                    <td style={tdStyle}>{r.totalDeductions != null ? inr(r.totalDeductions) : "—"}</td>
                    <td style={tdStyle}>{r.totalEmployerCost != null ? inr(r.totalEmployerCost) : "—"}</td>
                    <td style={tdStyle}><span className="badge" style={{ background: "var(--success-bg)", color: "var(--success-color)", padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{r.status || "—"}</span></td>
                    <td style={{ ...tdStyle, color: "var(--light-text)" }}>{formatDate(r.processedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYSLIP DETAIL MODAL */}
      <Dialog
        open={!!viewSlip}
        onClose={() => setViewSlip(null)}
        testId="hr-payroll-payslip-modal"
        hideHeader
        contentClassName="max-w-[460px] p-0 overflow-hidden"
      >
        {viewSlip && (() => {
          const e = viewSlip.earnings ?? {};
          const d = viewSlip.deductions ?? {};
          const gross = e.gross ?? (e.basic ?? 0) + (e.hra ?? 0) + (e.allowance ?? 0) + (e.bonus ?? 0);
          const tds = d.tds ?? d.tax ?? 0;
          const totalDed = d.total ??
            (d.pf ?? 0) + (d.esi ?? 0) + (d.professionalTax ?? 0) +
            tds + (d.lwf ?? 0) + (d.other ?? 0);
          const employerContribution = (d.pfEmployer ?? 0) + (d.esiEmployer ?? 0);
          const net = viewSlip.netPay != null ? viewSlip.netPay : gross - totalDed;
          const row = (label: string, val?: number, bold?: boolean) => (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 14, borderTop: bold ? "1px solid var(--border-color)" : "none", color: "var(--dark-text)" }}>
              <span style={{ color: bold ? "var(--dark-text)" : "var(--light-text)" }}>{label}</span><span>{inr(val)}</span>
            </div>
          );
          return (
            <>
              <div className="modal-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Payslip — {empName(viewSlip.employeeUid)}</h3>
                  <p className="modal-subtitle" style={{ margin: "2px 0 0" }}>{viewSlip.month || "—"} · {viewSlip.status || "—"} · {formatDate(viewSlip.generatedAt)}</p>
                </div>
                <button id="hr-payroll-payslip-modal-close" data-testid="hr-payroll-payslip-modal-close" onClick={() => setViewSlip(null)} style={iconBtn} aria-label="Close"><X size={20} /></button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)", marginBottom: 4 }}>Earnings</div>
                {row("Basic", e.basic)}
                {row("HRA", e.hra)}
                {row("Allowance", e.allowance)}
                {row("Bonus", e.bonus)}
                {row("Gross Earnings", gross, true)}

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)", margin: "20px 0 4px" }}>Deductions</div>
                {row("Provident Fund", d.pf)}
                {d.esi ? row("ESI", d.esi) : null}
                {d.professionalTax ? row("Professional Tax", d.professionalTax) : null}
                {row("TDS / Income Tax", tds)}
                {d.lwf ? row("Labour Welfare Fund", d.lwf) : null}
                {row("Other", d.other)}
                {row("Total Deductions", totalDed, true)}

                {employerContribution > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)", margin: "20px 0 4px" }}>Employer Contributions</div>
                    {d.pfEmployer ? row("PF (Employer)", d.pfEmployer) : null}
                    {d.esiEmployer ? row("ESI (Employer)", d.esiEmployer) : null}
                    {row("Total Employer Cost", gross + employerContribution, true)}
                  </>
                )}

                <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 12, background: "var(--dark-bg)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Net Pay</span>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{inr(net)}</span>
                </div>
              </div>
            </>
          );
        })()}
      </Dialog>

      {/* ASSIGN / EDIT SALARY STRUCTURE MODAL */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        testId="hr-payroll-assign-modal"
        hideHeader
        contentClassName="max-w-[560px] p-0 overflow-hidden"
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>Assign Salary Structure</h3>
            <p className="modal-subtitle" style={{ margin: "2px 0 0" }}>Pick an employee, optionally apply a plan, then edit & save</p>
          </div>
          <button id="hr-payroll-assign-modal-close" data-testid="hr-payroll-assign-modal-close" onClick={() => setAssignOpen(false)} style={iconBtn} aria-label="Close"><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Select
              id="hr-payroll-assign-employee"
              testId="hr-payroll-assign-employee"
              label="Employee"
              value={assignEmpId}
              onChange={(e) => pickAssignEmp(e.target.value)}
              placeholder="Select employee"
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
            />
            <Select
              id="hr-payroll-assign-plan"
              testId="hr-payroll-assign-plan"
              label="Apply a plan (optional)"
              defaultValue=""
              onChange={(e) => { if (e.target.value) applyPlan(e.target.value); }}
              placeholder="— pick a plan —"
              options={plans.data.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>

          {COMP_GROUPS.map((g) => (
            <div key={g.title} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)", marginBottom: 8 }}>{g.title}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {g.keys.map((k) => (
                  <div className="form-group" key={k} style={{ margin: 0 }}>
                    <label>{COMP_LABEL[k]}</label>
                    <input id={`hr-payroll-assign-${k}`} data-testid={`hr-payroll-assign-${k}`} type="number" value={(assignStruct as Record<string, number | undefined>)[k] ?? ""} onChange={(e) => setAssignStruct((s) => ({ ...s, [k]: e.target.value === "" ? undefined : Number(e.target.value) }))} style={fieldStyle} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 8, padding: "12px 16px", borderRadius: 12, background: "var(--app-bg)", fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: "var(--light-text)" }}>Gross {inr(assignGross)} · Deductions {inr(assignDed)}</span>
            <span>Net {inr(assignGross - assignDed)}</span>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
          {assignMsg && <span style={{ fontSize: 13, fontWeight: 600, color: assignMsg.includes("saved") ? "#059669" : "#e11d48" }}>{assignMsg}</span>}
          <button id="hr-payroll-assign-cancel" data-testid="hr-payroll-assign-cancel" className="btn btn-secondary" onClick={() => setAssignOpen(false)} style={{ borderRadius: 12 }}>Cancel</button>
          <button id="hr-payroll-assign-save" data-testid="hr-payroll-assign-save" className="btn btn-primary" onClick={saveAssign} disabled={assignBusy || !assignEmpId} style={{ background: "var(--primary-color)", border: "none", color: "white", borderRadius: 12 }}>{assignBusy ? <Loader2 size={16} className="animate-spin" /> : "Save"}</button>
        </div>
      </Dialog>
    </section>
  );
}
