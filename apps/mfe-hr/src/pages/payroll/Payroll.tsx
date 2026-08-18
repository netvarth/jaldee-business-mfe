import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Layers3, ReceiptText, Settings2, UserCog } from "lucide-react";
import { Button } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";
import { PayslipStatementDialog } from "../../components/PayslipStatementDialog";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";
import {
  useEmployeePayroll,
  usePayslips,
  usePayrollComponents,
  usePayrollCustomFields,
  usePayrollRuns,
  usePayrollStructures,
  type EmployeeComponentValue,
  type PayrollComponent,
  type PayrollStructure,
  type Payslip,
  type StructureComponentMapping,
} from "../../services/usePayrollData";
import { exportToCSV, formatDate } from "../../lib/utils";
import {
  PAYROLL_ROUTES,
  emptyComponent,
  emptyMapping,
  emptyStructure,
  money,
  type Tab,
  type ViewMode,
} from "./payrollTypes";
import { StatTile, statTile, tabBar, tabButton } from "./PayrollComponents";
import { ComponentDialog, StructureBuilderDialog, StructureDialog } from "./PayrollModals";
import { PayrollComponentsTab } from "./tabs/PayrollComponentsTab";
import { PayrollStructuresTab } from "./tabs/PayrollStructuresTab";
import { PayrollEmployeesTab } from "./tabs/PayrollEmployeesTab";
import { PayrollPayslipsTab } from "./tabs/PayrollPayslipsTab";

const uidOf = (item?: { uid?: string; id?: string }) => item?.uid || item?.id || "";

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed.";
}

function getPreferredViewMode(): ViewMode {
  if (typeof window === "undefined") return "table";
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function payrollRouteState(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const payrollIndex = segments.lastIndexOf("payroll");
  const payrollSegments = payrollIndex >= 0 ? segments.slice(payrollIndex + 1) : segments;
  const tabSegment = payrollSegments[0];

  let payslipUid: string | null = null;
  if (tabSegment === "payslips" || tabSegment === "payslip") {
    payslipUid = payrollSegments[1] || null;
  } else if (tabSegment === "runs" && (payrollSegments[1] === "payslips" || payrollSegments[1] === "payslip")) {
    payslipUid = payrollSegments[2] || null;
  }

  const normSegment = tabSegment === "runs" ? "payslips" : tabSegment;
  const match = PAYROLL_ROUTES.find((item) => item.route === normSegment || item.key === normSegment);
  const tab = payslipUid ? "payslips" : (match?.key || "components");
  const builderStructureUid = tab === "structures" && payrollSegments[2] === "build" ? payrollSegments[1] || null : null;
  const employeeAssignUid = tab === "employees" && payrollSegments[2] === "assign" ? payrollSegments[1] || null : null;
  return {
    tab,
    payslipUid,
    isPayslipView: Boolean(payslipUid),
    builderStructureUid,
    isStructureBuilder: Boolean(builderStructureUid),
    employeeAssignUid,
    isEmployeeAssign: Boolean(employeeAssignUid),
  };
}

export default function Payroll() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const fromAnalytics = isAnalyticsNavigation(location.state);
  const api = useHrApi();
  const routeState = useMemo(() => payrollRouteState(location.pathname), [location.pathname]);
  const tab = routeState.tab;

  const { data: employees, loading: employeesLoading, reload: reloadEmployees } = useEmployees({ enabled: true });
  const components = usePayrollComponents({ enabled: true });
  const structures = usePayrollStructures({ enabled: true });
  const runs = usePayrollRuns({ enabled: true });
  const payslips = usePayslips({ enabled: true });

  const employeeList = useMemo(() => employees || [], [employees]);
  const componentList = useMemo(() => components.data || [], [components.data]);
  const structureList = useMemo(() => structures.data || [], [structures.data]);
  const runList = useMemo(() => runs.data || [], [runs.data]);
  const payslipList = useMemo(() => payslips.data || [], [payslips.data]);
  const payslipFields = useMemo(() => [], []);

  const [selectedEmployeeUid, setSelectedEmployee] = useState<string>("");
  const activeEmployeeUid = selectedEmployeeUid || employeeList[0]?.id || "";
  const employeePayroll = useEmployeePayroll(activeEmployeeUid);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);
  const [runMonth, setRunMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const activePayslipRecord = useMemo(() => {
    if (!routeState.payslipUid) return viewSlip;
    const match = payslipList.find((p) => p.id === routeState.payslipUid || p.uid === routeState.payslipUid);
    if (match) return match;
    if (viewSlip && (viewSlip.id === routeState.payslipUid || viewSlip.uid === routeState.payslipUid)) return viewSlip;
    return { id: routeState.payslipUid, status: "Generated" } as Payslip;
  }, [routeState.payslipUid, payslipList, viewSlip]);

  const [componentOpen, setComponentOpen] = useState(false);
  const [editingComponentUid, setEditingComponentUid] = useState<string | null>(null);
  const [componentForm, setComponentForm] = useState<Partial<PayrollComponent>>(emptyComponent);

  const [structureOpen, setStructureOpen] = useState(false);
  const [editingStructureUid, setEditingStructureUid] = useState<string | null>(null);
  const [structureForm, setStructureForm] = useState<Partial<PayrollStructure>>(emptyStructure);
  const [builderStructureUid, setBuilderStructureUid] = useState("");
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [mappingForm, setMappingForm] = useState<Partial<StructureComponentMapping>>(emptyMapping);

  const [componentsView, setComponentsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [structuresView, setStructuresView] = useState<ViewMode>(() => getPreferredViewMode());
  const [builderComponentsView, setBuilderComponentsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [employeesView, setEmployeesView] = useState<ViewMode>(() => getPreferredViewMode());
  const [payslipsView, setPayslipsView] = useState<ViewMode>(() => getPreferredViewMode());

  const [employeeQuery, setEmployeeQuery] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    structureUid: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  });
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, EmployeeComponentValue>>({});

  const selectedStructure = useMemo(() => {
    const activeBuilderUid = routeState.builderStructureUid || builderStructureUid;
    if (!activeBuilderUid) return structureList[0];
    return structureList.find((s) => uidOf(s) === activeBuilderUid);
  }, [builderStructureUid, routeState.builderStructureUid, structureList]);

  const effectiveBuilderUid = uidOf(selectedStructure) || routeState.builderStructureUid || builderStructureUid;
  const effectiveComponentUid = mappingForm.componentUid || uidOf(componentList[0]);
  const activeStructureUid = employeePayroll.assignment?.structureUid || uidOf(employeePayroll.assignment?.structure);
  const activeStructure = structureList.find((s) => uidOf(s) === activeStructureUid) || employeePayroll.assignment?.structure;
  const activeEmployeeRecord = employeeList.find((e) => e.id === activeEmployeeUid);

  const apiError = components.error || structures.error || runs.error || payslips.error || employeePayroll.error;

  useEffect(() => {
    if (!apiError) return;
    eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Payroll", message: apiError });
  }, [apiError, eventBus]);

  useEffect(() => {
    if (!message) return;
    const isError = /failed|missing|cannot|error|select|required|conflict|denied/i.test(message);
    eventBus?.emit(SHELL_TOAST_EVENT, { intent: isError ? "error" : "success", title: "Payroll", message });
  }, [message, eventBus]);

  useEffect(() => {
    if (!routeState.isStructureBuilder || !effectiveBuilderUid) return;
    void structures.loadComponents(effectiveBuilderUid).catch((e) => setMessage(getErrorMessage(e)));
  }, [effectiveBuilderUid, routeState.isStructureBuilder, structures.loadComponents]);

  useEffect(() => {
    if (routeState.employeeAssignUid) setSelectedEmployee(routeState.employeeAssignUid);
  }, [routeState.employeeAssignUid]);

  useEffect(() => {
    if (!routeState.isEmployeeAssign || !activeEmployeeUid) return;
    const structureUid = employeePayroll.assignment?.structureUid || uidOf(employeePayroll.assignment?.structure);
    setAssignmentForm({
      structureUid: structureUid || "",
      effectiveFrom: employeePayroll.assignment?.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: employeePayroll.assignment?.effectiveTo || "",
    });
  }, [activeEmployeeUid, employeePayroll.assignment, routeState.isEmployeeAssign]);

  const stats = useMemo(() => {
    const totalPayout = payslipList.reduce((sum, p) => sum + (p.netPay ?? 0), 0);
    const finalized = runList.filter((r) => /final/i.test(r.status || "")).length;
    return { components: componentList.length, structures: structureList.length, runs: runList.length, totalPayout, finalized };
  }, [componentList.length, payslipList, runList, structureList.length]);

  const employeeName = (uid?: string) => {
    if (!uid) return "-";
    return employeeList.find((e) => e.id === uid || e.uid === uid)?.name || uid;
  };

  const openComponent = (component?: PayrollComponent) => {
    setEditingComponentUid(component ? uidOf(component) : null);
    setComponentForm(component ? { ...component } : { ...emptyComponent });
    setComponentOpen(true);
  };

  const saveComponent = async () => {
    if (!componentForm.componentName || !componentForm.componentCode) {
      setMessage("Component name and code are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await components.save({ ...componentForm, componentCode: normalizeCode(componentForm.componentCode) }, editingComponentUid || undefined);
      setComponentOpen(false);
      setMessage("Payroll component saved.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openStructure = (structure?: PayrollStructure) => {
    setEditingStructureUid(structure ? uidOf(structure) : null);
    setStructureForm(structure ? { ...structure } : { ...emptyStructure });
    setStructureOpen(true);
  };

  const openStructureBuilder = (structureUid: string) => {
    if (!structureUid) return;
    setBuilderStructureUid(structureUid);
    navigate(`/payroll/structures/${structureUid}/build`);
  };

  const saveStructure = async () => {
    if (!structureForm.structureName || !structureForm.structureCode) {
      setMessage("Structure name and code are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await structures.save({ ...structureForm, structureCode: normalizeCode(structureForm.structureCode || "") }, editingStructureUid || undefined);
      setStructureOpen(false);
      setMessage("Payroll structure saved.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addStructureComponent = async () => {
    if (!effectiveBuilderUid || !effectiveComponentUid) {
      setMessage("Select a structure and component.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await structures.addComponent(effectiveBuilderUid, { ...mappingForm, componentUid: effectiveComponentUid });
      setMappingForm({ ...emptyMapping });
      setBuilderDialogOpen(false);
      setMessage("Component added to structure.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const assignStructure = async () => {
    if (!activeEmployeeUid || !assignmentForm.structureUid || !assignmentForm.effectiveFrom) {
      setMessage("Select an employee, structure, and effective date.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await employeePayroll.assignStructure({
        uid: employeePayroll.assignment?.uid || employeePayroll.assignment?.id,
        structureUid: assignmentForm.structureUid,
        effectiveFrom: assignmentForm.effectiveFrom,
        effectiveTo: assignmentForm.effectiveTo || undefined,
        status: "Enabled",
      });
      await reloadEmployees();
      setMessage("Employee payroll structure assigned.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const componentValueKey = (value: EmployeeComponentValue, mapping?: StructureComponentMapping) => {
    return value.uid || value.id || value.componentUid || mapping?.uid || mapping?.id || mapping?.componentUid || "";
  };

  const seedOverride = (value: EmployeeComponentValue, mapping?: StructureComponentMapping): EmployeeComponentValue => {
    return {
      uid: value.uid,
      id: value.id,
      componentUid: value.componentUid || mapping?.componentUid || mapping?.payrollComponentUid,
      calculationType: value.calculationType || mapping?.calculationType || "FIXED_AMOUNT",
      previousAmount: value.previousAmount ?? value.overrideAmount ?? mapping?.defaultAmount,
      previousPercentage: value.previousPercentage ?? value.overridePercentage ?? mapping?.defaultPercentage,
      overrideAmount: value.overrideAmount,
      overridePercentage: value.overridePercentage,
      formulaExpression: value.formulaExpression ?? mapping?.formulaExpression,
      isApplicable: value.isApplicable !== false,
    };
  };

  const updateOverride = (value: EmployeeComponentValue, patch: Partial<EmployeeComponentValue>, mapping?: StructureComponentMapping) => {
    const key = componentValueKey(value, mapping);
    if (!key) return;
    setOverrideDrafts((current) => {
      const existing = current[key] || seedOverride(value, mapping);
      return { ...current, [key]: { ...existing, ...patch } };
    });
  };

  const saveOverrides = async () => {
    const values = Object.values(overrideDrafts);
    if (values.length === 0 || !activeEmployeeUid) return;
    setBusy(true);
    setMessage(null);
    try {
      await employeePayroll.saveComponentValues(values);
      setOverrideDrafts({});
      setMessage("Employee payroll overrides saved.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const processRun = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await runs.createRun({ monthStr: runMonth, status: "Draft" });
      await payslips.reload();
      setMessage(`Payroll run draft generated for ${runMonth}.`);
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const finalizeRun = async () => {
    const latestRun = runs.data[0];
    const targetRunUid = latestRun?.uid || latestRun?.id;
    setBusy(true);
    setMessage(null);
    try {
      await runs.finalizeRun(targetRunUid, { status: "Finalized", monthStr: runMonth });
      await payslips.reload();
      setMessage("Payroll run finalized and payslips published.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadPayrollSummaryCSV = () => {
    exportToCSV(
      ["Employee", "Month", "Gross Pay", "Deductions", "Net Pay", "Status"],
      payslipList.map((p) => [
        p.employeeName || employeeName(p.employeeUid),
        p.monthStr || p.month || "",
        p.grossPay ?? 0,
        p.totalDeductions ?? 0,
        p.netPay ?? 0,
        p.status ?? "",
      ]),
      "payroll-register.csv"
    );
  };

  const filteredEmployees = useMemo(() => {
    return employeeList.filter((emp) => {
      const q = employeeQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      );
    });
  }, [employeeQuery, employeeList]);

  const employeeHasAssignedStructure = (emp: any) => Boolean(emp.assignedStructureUid || emp.structureUid);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Manage components, structures, salary assignments, and run monthly payroll."
        actions={
          fromAnalytics ? (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={() => navigate(HR_ANALYTICS_BACK)}
            >
              Back to Analytics
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={<Settings2 size={18} />} label="Components" value={String(stats.components)} />
        <StatTile icon={<Layers3 size={18} />} label="Structures" value={String(stats.structures)} />
        <StatTile icon={<ReceiptText size={18} />} label="Payroll Runs" value={String(stats.runs)} />
        <StatTile icon={<UserCog size={18} />} label="Net Payout" value={money(stats.totalPayout)} />
      </div>

      <div style={tabBar}>
        {PAYROLL_ROUTES.map(({ key, route, label, Icon }) => (
          <button
            key={key}
            id={`hr-payroll-tab-${key}`}
            data-testid={`hr-payroll-tab-${key}`}
            type="button"
            onClick={() => navigate(`/payroll/${route}`)}
            data-active={tab === key ? "true" : "false"}
            style={tabButton(tab === key)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "components" && (
        <PayrollComponentsTab
          components={{ ...components, data: componentList }}
          componentsView={componentsView}
          setComponentsView={setComponentsView}
          openComponent={openComponent}
          setMessage={setMessage}
          setBusy={setBusy}
        />
      )}

      {tab === "structures" && (
        <PayrollStructuresTab
          structures={{ ...structures, data: structureList }}
          components={componentList}
          structuresView={structuresView}
          setStructuresView={setStructuresView}
          builderComponentsView={builderComponentsView}
          setBuilderComponentsView={setBuilderComponentsView}
          routeState={routeState}
          selectedStructure={selectedStructure || null}
          openStructure={openStructure}
          openStructureBuilder={openStructureBuilder}
          openAddComponentDialog={() => {
            setMappingForm({ ...emptyMapping, componentUid: uidOf(componentList[0]) });
            setBuilderDialogOpen(true);
          }}
          navigate={navigate}
          setMessage={setMessage}
          setBusy={setBusy}
        />
      )}

      {tab === "employees" && (
        <PayrollEmployeesTab
          employees={employeeList}
          filteredEmployees={filteredEmployees}
          employeesLoading={employeesLoading}
          employeesView={employeesView}
          setEmployeesView={setEmployeesView}
          employeeQuery={employeeQuery}
          setEmployeeQuery={setEmployeeQuery}
          routeState={routeState}
          activeEmployeeUid={activeEmployeeUid}
          activeEmployeeRecord={activeEmployeeRecord}
          activeStructure={activeStructure}
          structures={structureList}
          assignmentForm={assignmentForm}
          setAssignmentForm={setAssignmentForm}
          employeePayroll={employeePayroll}
          employeeComponentRows={(employeePayroll.componentValues || []).map((v) => ({
            value: v,
            mapping: (activeStructure?.components || []).find(
              (m) => (m.componentUid || m.payrollComponentUid) === v.componentUid
            ),
          }))}
          overrideDrafts={overrideDrafts}
          updateOverride={updateOverride}
          seedOverride={seedOverride}
          componentValueKey={componentValueKey}
          assignStructure={assignStructure}
          saveOverrides={saveOverrides}
          openEmployeeAssignment={(id) => {
            setSelectedEmployee(id);
            navigate(`/payroll/employees/${id}/assign`);
          }}
          employeeHasAssignedStructure={employeeHasAssignedStructure}
          navigate={navigate}
          busy={busy}
        />
      )}

      {tab === "payslips" && (
        <PayrollPayslipsTab
          payslips={{ ...payslips, data: payslipList }}
          runs={{ ...runs, data: runList }}
          payslipsView={payslipsView}
          setPayslipsView={setPayslipsView}
          runMonth={runMonth}
          setRunMonth={setRunMonth}
          processRun={processRun}
          finalizeRun={finalizeRun}
          downloadPayrollSummaryCSV={downloadPayrollSummaryCSV}
          employeeName={employeeName}
          setViewSlip={setViewSlip}
          navigate={navigate}
          routeState={routeState}
          activePayslipRecord={activePayslipRecord}
          activeEmployeeRecord={activeEmployeeRecord}
          payslipFields={payslipFields}
          busy={busy}
        />
      )}

      <ComponentDialog
        open={componentOpen}
        form={componentForm}
        busy={busy}
        onClose={() => setComponentOpen(false)}
        onSave={saveComponent}
        onChange={setComponentForm}
      />
      <StructureDialog
        open={structureOpen}
        form={structureForm}
        busy={busy}
        onClose={() => setStructureOpen(false)}
        onSave={saveStructure}
        onChange={setStructureForm}
      />
      <StructureBuilderDialog
        open={builderDialogOpen}
        busy={busy}
        form={mappingForm}
        components={componentList}
        selectedStructure={selectedStructure || null}
        onClose={() => setBuilderDialogOpen(false)}
        onSave={addStructureComponent}
        onChange={setMappingForm}
      />
      <PayslipStatementDialog
        payslip={viewSlip}
        employee={activeEmployeeRecord || null}
        fields={payslipFields}
        employeeName={employeeName(viewSlip?.employeeUid)}
        onClose={() => setViewSlip(null)}
      />
    </section>
  );
}
