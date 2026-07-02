import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  CircleCheck,
  LayoutGrid,
  Rows3,
  Download,
  FileText,
  Layers3,
  Loader2,
  Pencil,
  Play,
  Plus,
  ReceiptText,
  Settings2,
  SlidersHorizontal,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, DataTable, DataTableToolbar, DatePicker, Dialog, EmptyState, MonthPicker, PageHeader, Select, SkeletonTable } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { PayslipStatementDialog } from "../../components/PayslipStatementDialog";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";
import {
  useEmployeePayroll,
  usePayslips,
  PAYROLL_CUSTOM_FIELD_TARGETS,
  usePayrollComponents,
  usePayrollCustomFields,
  usePayrollRuns,
  usePayrollStructures,
  type CalculationType,
  type ComponentCategory,
  type ComponentType,
  type CustomFieldDataType,
  type CustomFieldTarget,
  type EmployeeComponentValue,
  type PayrollComponent,
  type PayrollCustomField,
  type PayrollStructure,
  type Payslip,
  type SlabTier,
  type StructureComponentMapping,
} from "../../services/usePayrollData";
import { exportToCSV, formatCurrency, formatDate } from "../../lib/utils";

type Tab = "components" | "structures" | "employees" | "runs" | "fields";
type ViewMode = "table" | "cards";

const PAYROLL_ROUTES: Array<{ key: Tab; route: string; label: string; Icon: LucideIcon }> = [
  { key: "components", route: "components", label: "Components", Icon: Settings2 },
  { key: "structures", route: "structures", label: "Structures", Icon: Layers3 },
  { key: "employees", route: "employees", label: "Employees", Icon: UserCog },
  { key: "runs", route: "runs", label: "Runs & Payslips", Icon: ReceiptText },
  { key: "fields", route: "custom-fields", label: "Custom Fields", Icon: SlidersHorizontal },
];

const COMPONENT_TYPES: ComponentType[] = ["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "MEMO"];
const CATEGORIES: ComponentCategory[] = [
  "BASIC",
  "HRA",
  "ALLOWANCE",
  "BONUS",
  "OVERTIME",
  "ARREARS",
  "REIMBURSEMENT",
  "PF",
  "ESI",
  "TDS",
  "PROFESSIONAL_TAX",
  "LWF",
  "GRATUITY",
  "LOAN",
  "ADVANCE",
  "MEDICLAIM",
  "CUSTOM",
];
const CALC_TYPES: CalculationType[] = ["FIXED_AMOUNT", "PERCENTAGE", "FORMULA", "SLAB_BASED"];
const TARGET_TYPES: CustomFieldTarget[] = PAYROLL_CUSTOM_FIELD_TARGETS;
const FIELD_TYPES: CustomFieldDataType[] = ["TEXT", "NUMBER", "DECIMAL", "DATE", "BOOLEAN", "DROPDOWN", "MULTI_SELECT", "JSON"];

const emptyComponent: Partial<PayrollComponent> = {
  componentName: "",
  componentCode: "",
  componentType: "EARNING",
  componentCategory: "BASIC",
  calculationType: "FIXED_AMOUNT",
  isStatutory: false,
  isTaxable: true,
  affectsGrossPay: true,
  affectsNetPay: true,
  affectsCtc: true,
  visibleInPayslip: true,
};

const emptyStructure: Partial<PayrollStructure> = {
  structureName: "",
  structureCode: "",
  description: "",
  payrollFrequency: "MONTHLY",
  currencyCode: "INR",
};

const emptyMapping: Partial<StructureComponentMapping> = {
  componentUid: "",
  calculationType: "FIXED_AMOUNT",
  defaultAmount: undefined,
  defaultPercentage: undefined,
  formulaExpression: "",
  slabConfigJson: [],
  isMandatory: true,
  allowEmployeeOverride: false,
};

const emptyField: Partial<PayrollCustomField> = {
  targetType: "EMPLOYEE_PAYROLL_STRUCTURE",
  fieldKey: "",
  fieldLabel: "",
  dataType: "TEXT",
  isRequired: false,
  defaultValue: "",
};

const money = (value?: number) => formatCurrency(value ?? 0);
const labelize = (value?: string) => (value ? value.replaceAll("_", " ") : "-");
const uidOf = (item?: { uid?: string; id?: string }) => item?.uid || item?.id || "";

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function numericOrUndefined(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed.";
}

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function payrollRouteState(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const payrollIndex = segments.lastIndexOf("payroll");
  const payrollSegments = payrollIndex >= 0 ? segments.slice(payrollIndex + 1) : segments;
  const tabSegment = payrollSegments[0];
  const match = PAYROLL_ROUTES.find((item) => item.route === tabSegment || item.key === tabSegment);
  const tab = match?.key || "components";
  const builderStructureUid = tab === "structures" && payrollSegments[2] === "build" ? payrollSegments[1] || null : null;
  const employeeAssignUid = tab === "employees" && payrollSegments[2] === "assign" ? payrollSegments[1] || null : null;
  return { tab, builderStructureUid, isStructureBuilder: Boolean(builderStructureUid), employeeAssignUid, isEmployeeAssign: Boolean(employeeAssignUid) };
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={toggleStyle}>
      <span>{label}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}{required ? " *" : ""}</span>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
    </label>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={statTile}>
      <div style={statIcon}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dark-text)", fontFamily: "var(--font-heading)" }}>{value}</div>
      </div>
    </div>
  );
}

export default function Payroll() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useHrApi();
  const routeState = useMemo(() => payrollRouteState(location.pathname), [location.pathname]);
  const tab = routeState.tab;
  const needsComponents = tab === "components" || tab === "structures";
  const needsStructures = tab === "structures" || tab === "employees";
  const needsEmployees = tab === "employees" || tab === "runs";
  const needsRuns = tab === "runs";
  const needsPayslips = tab === "runs";
  const needsCustomFields = tab === "fields" || tab === "employees" || tab === "runs";
  const customFieldTargets = useMemo<CustomFieldTarget[]>(() => {
    if (tab === "employees") return ["EMPLOYEE_PAYROLL_STRUCTURE"];
    if (tab === "runs") return ["PAYSLIP"];
    return PAYROLL_CUSTOM_FIELD_TARGETS;
  }, [tab]);
  const components = usePayrollComponents({ enabled: needsComponents });
  const structures = usePayrollStructures({ enabled: needsStructures });
  const runs = usePayrollRuns({ enabled: needsRuns });
  const payslips = usePayslips({ enabled: needsPayslips });
  const customFields = usePayrollCustomFields({ enabled: needsCustomFields, targetTypes: customFieldTargets });
  const { data: employees, loading: employeesLoading, reload: reloadEmployees } = useEmployees({ enabled: needsEmployees });

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState(routeState.employeeAssignUid || "");
  const activeEmployeeUid = routeState.employeeAssignUid || selectedEmployee;
  const employeePayroll = useEmployeePayroll(activeEmployeeUid || null, { enabled: tab === "employees" });
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);

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
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");

  const [assignmentForm, setAssignmentForm] = useState({
    structureUid: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  });
  const [employeeCustomValues, setEmployeeCustomValues] = useState<Record<string, unknown>>({});
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, EmployeeComponentValue>>({});

  const [fieldOpen, setFieldOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<Partial<PayrollCustomField>>(emptyField);

  const selectedStructure = useMemo(() => {
    const activeBuilderUid = routeState.builderStructureUid || builderStructureUid;
    if (!activeBuilderUid) return structures.data[0];
    return structures.data.find((s) => uidOf(s) === activeBuilderUid);
  }, [builderStructureUid, routeState.builderStructureUid, structures.data]);
  const effectiveBuilderUid = uidOf(selectedStructure) || routeState.builderStructureUid || builderStructureUid;
  const effectiveComponentUid = mappingForm.componentUid || uidOf(components.data[0]);
  const activeStructureUid = employeePayroll.assignment?.structureUid || uidOf(employeePayroll.assignment?.structure);
  const activeStructure = structures.data.find((s) => uidOf(s) === activeStructureUid) || employeePayroll.assignment?.structure;
  const activeEmployeeRecord = employees.find((employee) => employee.id === activeEmployeeUid);
  const employeeFields = customFields.data.filter((f) => f.targetType === "EMPLOYEE_PAYROLL_STRUCTURE");
  const payslipFields = customFields.data.filter((f) => f.targetType === "PAYSLIP");
  const apiError = components.error || structures.error || runs.error || payslips.error || customFields.error || employeePayroll.error;

  useEffect(() => {
    if (!apiError) return;
    eventBus?.emit(SHELL_TOAST_EVENT, {
      intent: "error",
      title: "Payroll",
      message: apiError,
    });
  }, [apiError, eventBus]);

  useEffect(() => {
    if (!message) return;
    const isError = /failed|missing|cannot|error|select|required|conflict|denied/i.test(message);
    eventBus?.emit(SHELL_TOAST_EVENT, {
      intent: isError ? "error" : "success",
      title: "Payroll",
      message,
    });
  }, [message, eventBus]);

  useEffect(() => {
    if (!routeState.isStructureBuilder || !effectiveBuilderUid) return;
    void structures.loadComponents(effectiveBuilderUid).catch((e) => {
      setMessage(getErrorMessage(e));
    });
  }, [effectiveBuilderUid, routeState.isStructureBuilder, structures.loadComponents]);

  useEffect(() => {
    if (!routeState.isEmployeeAssign || !activeStructureUid) return;
    void structures.loadComponents(activeStructureUid).catch((e) => {
      setMessage(getErrorMessage(e));
    });
  }, [activeStructureUid, routeState.isEmployeeAssign, structures.loadComponents]);

  useEffect(() => {
    if (routeState.employeeAssignUid) {
      setSelectedEmployee(routeState.employeeAssignUid);
    }
  }, [routeState.employeeAssignUid]);

  useEffect(() => {
    if (!routeState.isEmployeeAssign || !activeEmployeeUid) return;
    const structureUid = employeePayroll.assignment?.structureUid || uidOf(employeePayroll.assignment?.structure);
    setAssignmentForm({
      structureUid: structureUid || "",
      effectiveFrom: employeePayroll.assignment?.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: employeePayroll.assignment?.effectiveTo || "",
    });
    setEmployeeCustomValues(
      employeePayroll.assignment?.customFields ||
      employeePayroll.assignment?.customFieldsJson ||
      {}
    );
  }, [activeEmployeeUid, employeePayroll.assignment, routeState.isEmployeeAssign]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewModes = () => {
      const next = media.matches ? "cards" : "table";
      setComponentsView(next);
      setStructuresView(next);
      setBuilderComponentsView(next);
    };
    syncViewModes();
    media.addEventListener("change", syncViewModes);
    return () => media.removeEventListener("change", syncViewModes);
  }, []);

  const stats = useMemo(() => {
    const totalPayout = payslips.data.reduce((sum, p) => sum + (p.netPay ?? 0), 0);
    const finalized = runs.data.filter((r) => /final/i.test(r.status || "")).length;
    return {
      components: components.data.length,
      structures: structures.data.length,
      runs: runs.data.length,
      totalPayout,
      finalized,
    };
  }, [components.data.length, payslips.data, runs.data, structures.data.length]);

  const employeeName = (uid?: string) => {
    if (!uid) return "-";
    return employees.find((e) => e.id === uid || e.uid === uid)?.name || uid;
  };

  const componentName = (mapping: StructureComponentMapping) => {
    const componentUid = mapping.componentUid || mapping.payrollComponentUid || uidOf(mapping.component);
    const component = components.data.find((item) => uidOf(item) === componentUid);
    return mapping.componentName || mapping.component?.componentName || component?.componentName || mapping.componentCode || component?.componentCode || componentUid || "-";
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
      await components.save(
        { ...componentForm, componentCode: normalizeCode(componentForm.componentCode) },
        editingComponentUid || undefined
      );
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
      await structures.save(
        { ...structureForm, structureCode: normalizeCode(structureForm.structureCode || "") },
        editingStructureUid || undefined
      );
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
        structureUid: assignmentForm.structureUid,
        effectiveFrom: assignmentForm.effectiveFrom,
        effectiveTo: assignmentForm.effectiveTo || undefined,
        status: "Enabled",
        customFields: employeeCustomValues,
      });
      await reloadEmployees();
      setMessage("Employee payroll structure assigned.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const seedOverride = (mapping: StructureComponentMapping) => {
    const key = uidOf(mapping);
    const existing = employeePayroll.componentValues.find((v) => v.structureComponentUid === key || v.componentUid === mapping.componentUid);
    return existing || {
      structureComponentUid: key,
      componentUid: mapping.componentUid || mapping.payrollComponentUid,
      calculationType: mapping.calculationType,
      isApplicable: true,
    };
  };

  const updateOverride = (mapping: StructureComponentMapping, patch: Partial<EmployeeComponentValue>) => {
    const key = uidOf(mapping);
    setOverrideDrafts((drafts) => ({
      ...drafts,
      [key]: { ...seedOverride(mapping), ...(drafts[key] || {}), ...patch },
    }));
  };

  const saveOverrides = async () => {
    const payload = Object.values(overrideDrafts);
    if (!activeEmployeeUid || payload.length === 0) {
      setMessage("No employee payroll overrides to save.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await employeePayroll.saveComponentValues(payload);
      setOverrideDrafts({});
      setMessage("Employee component overrides saved.");
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
      const run = await runs.processRun(runMonth);
      await payslips.reload();
      setMessage(`Processed payroll for ${run?.monthStr || run?.month || runMonth}.`);
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveCustomField = async () => {
    if (!fieldForm.fieldKey || !fieldForm.fieldLabel) {
      setMessage("Field key and label are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await customFields.save({ ...fieldForm, fieldKey: normalizeCode(fieldForm.fieldKey).toLowerCase() });
      setFieldOpen(false);
      setFieldForm({ ...emptyField });
      setMessage("Custom field saved.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const exportPayslips = () => {
    exportToCSV(
      ["Employee", "Month", "Gross", "Deductions", "Net", "Status"],
      payslips.data.map((p) => [
        p.employeeName || employeeName(p.employeeUid),
        p.monthStr || p.month || "",
        p.grossPay ?? "",
        p.totalDeductions ?? "",
        p.netPay ?? "",
        p.status ?? "",
      ]),
      "payroll-payslips.csv"
    );
  };

  const componentLookup = useMemo(() => new Map(components.data.map((component) => [uidOf(component), component] as const)), [components.data]);
  const componentColumns = useMemo(() => [
    {
      key: "componentCode",
      header: "Code",
      render: (component: PayrollComponent) => <span style={{ fontWeight: 800 }}>{component.componentCode || "-"}</span>,
    },
    {
      key: "componentName",
      header: "Name",
      render: (component: PayrollComponent) => component.componentName || "-",
    },
    {
      key: "componentType",
      header: "Type",
      render: (component: PayrollComponent) => labelize(component.componentType),
    },
    {
      key: "componentCategory",
      header: "Category",
      render: (component: PayrollComponent) => labelize(component.componentCategory),
    },
    {
      key: "calculationType",
      header: "Calculation",
      render: (component: PayrollComponent) => labelize(component.calculationType),
    },
    {
      key: "flags",
      header: "Flags",
      render: (component: PayrollComponent) => (
        <FlagList flags={[
          component.isStatutory && "Statutory",
          component.isTaxable && "Taxable",
          component.visibleInPayslip && "Payslip",
        ]} />
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right" as const,
      render: (component: PayrollComponent) => (
        <button
          id={`hr-payroll-component-edit-${component.id}`}
          data-testid={`hr-payroll-component-edit-${component.id}`}
          className="btn-grid-action"
          onClick={() => openComponent(component)}
          style={smallAction}
        >
          <Pencil size={14} /> Edit
        </button>
      ),
    },
  ], []);
  const structureColumns = useMemo(() => [
    {
      key: "structureCode",
      header: "Code",
      render: (structure: PayrollStructure) => <span style={{ fontWeight: 800 }}>{structure.structureCode}</span>,
    },
    {
      key: "structureName",
      header: "Name",
      render: (structure: PayrollStructure) => structure.structureName,
    },
    {
      key: "payrollFrequency",
      header: "Frequency",
      render: (structure: PayrollStructure) => structure.payrollFrequency || "MONTHLY",
    },
    {
      key: "currencyCode",
      header: "Currency",
      render: (structure: PayrollStructure) => structure.currencyCode || "INR",
    },
    {
      key: "components",
      header: "Components",
      align: "center" as const,
      render: (structure: PayrollStructure) => String(structure.components?.length ?? 0),
    },
    {
      key: "actions",
      header: "Action",
      align: "right" as const,
      render: (structure: PayrollStructure) => (
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button
            id={`hr-payroll-structure-build-${structure.id}`}
            data-testid={`hr-payroll-structure-build-${structure.id}`}
            className="btn-grid-action"
            onClick={() => openStructureBuilder(uidOf(structure))}
            style={smallAction}
          >
            Build
          </button>
          <button
            id={`hr-payroll-structure-edit-${structure.id}`}
            data-testid={`hr-payroll-structure-edit-${structure.id}`}
            className="btn-grid-action"
            onClick={() => openStructure(structure)}
            style={smallAction}
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
      ),
    },
  ], [navigate]);

  const structureComponentColumns = useMemo(() => [
    {
      key: "componentName",
      header: "Component",
      render: (mapping: StructureComponentMapping) => (
        <div>
          <div style={{ fontWeight: 800 }}>{componentName(mapping)}</div>
          <div style={{ fontSize: 12, color: "var(--light-text)" }}>
            {(componentLookup.get(mapping.componentUid || mapping.payrollComponentUid || uidOf(mapping.component))?.componentCode) || mapping.componentCode || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "componentType",
      header: "Type",
      render: (mapping: StructureComponentMapping) => {
        const component = componentLookup.get(mapping.componentUid || mapping.payrollComponentUid || uidOf(mapping.component));
        return labelize(component?.componentType);
      },
    },
    {
      key: "calculationType",
      header: "Calculation",
      render: (mapping: StructureComponentMapping) => labelize(mapping.calculationType),
    },
    {
      key: "defaults",
      header: "Default",
      render: (mapping: StructureComponentMapping) => {
        if (mapping.defaultAmount != null) return money(mapping.defaultAmount);
        if (mapping.defaultPercentage != null) return `${mapping.defaultPercentage}%`;
        if (mapping.formulaExpression) return mapping.formulaExpression;
        if ((mapping.slabConfigJson || []).length > 0) return `${mapping.slabConfigJson?.length || 0} slabs`;
        return "-";
      },
    },
    {
      key: "flags",
      header: "Flags",
      render: (mapping: StructureComponentMapping) => <FlagList flags={[mapping.isMandatory && "Mandatory", mapping.allowEmployeeOverride && "Override"]} />,
    },
  ], [componentLookup]);

  const openAddComponentDialog = () => {
    setMappingForm((current) => ({
      ...emptyMapping,
      ...current,
      componentUid: current.componentUid || uidOf(components.data[0]),
      calculationType: current.calculationType || "FIXED_AMOUNT",
      isMandatory: current.isMandatory ?? true,
      allowEmployeeOverride: current.allowEmployeeOverride ?? false,
    }));
    setBuilderDialogOpen(true);
  };

  const openEmployeeAssignment = (employeeUid: string) => {
    if (!employeeUid) return;
    setSelectedEmployee(employeeUid);
    setOverrideDrafts({});
    navigate(`/payroll/employees/${employeeUid}/assign`);
  };

  const employeeHasAssignedStructure = (employee: typeof employees[number]) =>
    Boolean((employee as unknown as Record<string, unknown>).payrollStructureAssigned);

  const removeEmployeeAssignment = async (employeeUid: string) => {
    if (!employeeUid) return;
    setBusy(true);
    setMessage(null);
    try {
      const activeAssignment = await api.get<{ uid?: string; id?: string; structureUid?: string; structure?: { uid?: string; id?: string }; effectiveFrom?: string; customFields?: Record<string, unknown>; customFieldsJson?: Record<string, unknown> } | null>(`/payroll/employees/${employeeUid}/structures/active`);
      const structureUid = activeAssignment?.structureUid || uidOf(activeAssignment?.structure);
      if (!structureUid) {
        throw new Error("No active payroll structure found for this employee.");
      }
      await api.post(`/payroll/employees/${employeeUid}/structures`, {
        uid: activeAssignment?.uid || activeAssignment?.id,
        employeeUid,
        structureUid,
        effectiveFrom: activeAssignment?.effectiveFrom || new Date().toISOString().slice(0, 10),
        effectiveTo: new Date().toISOString().slice(0, 10),
        status: "Disabled",
        customFields: activeAssignment?.customFields || activeAssignment?.customFieldsJson || {},
      });
      await reloadEmployees();
      if (activeEmployeeUid === employeeUid) {
        await employeePayroll.reload();
      }
      setMessage("Employee payroll structure removed.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const employeeDepartments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [employees]
  );
  const employeeStatuses = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.status).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [employees]
  );
  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesQuery = !query || [
        employee.name,
        employee.email,
        employee.employeeId,
        employee.department,
        employee.designation,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesDepartment = employeeDepartmentFilter === "all" || (employee.department || "") === employeeDepartmentFilter;
      const matchesStatus = employeeStatusFilter === "all" || (employee.status || "Active") === employeeStatusFilter;
      return matchesQuery && matchesDepartment && matchesStatus;
    });
  }, [employeeDepartmentFilter, employeeQuery, employeeStatusFilter, employees]);
  const employeeColumns = useMemo(() => [
    {
      key: "employeeId",
      header: "Employee ID",
      width: "18%",
      render: (employee: typeof employees[number]) => (
        <div style={{ display: "grid", gap: 6 }}>
          {employeeHasAssignedStructure(employee) ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#059669", fontSize: 12, fontWeight: 700 }}>
              <CircleCheck size={14} />
              Assigned
            </span>
          ) : null}
          <span style={{ fontWeight: 800 }}>{employee.employeeId || "-"}</span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Employee",
      width: "28%",
      render: (employee: typeof employees[number]) => (
        <div>
          <div style={{ fontWeight: 800 }}>{employee.name || "-"}</div>
          <div style={{ fontSize: 12, color: "var(--light-text)" }}>{employee.email || "-"}</div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      width: "18%",
      filter: {
        value: employeeDepartmentFilter,
        onChange: setEmployeeDepartmentFilter,
        allValue: "all",
        options: employeeDepartments.map((department) => ({ value: department, label: department })),
        testId: "hr-payroll-employees-filter-department",
      },
      render: (employee: typeof employees[number]) => employee.department || "-",
    },
    {
      key: "designation",
      header: "Designation",
      width: "24%",
      render: (employee: typeof employees[number]) => employee.designation || "-",
    },
    {
      key: "actions",
      header: "Action",
      width: "12%",
      align: "right" as const,
      render: (employee: typeof employees[number]) => employeeHasAssignedStructure(employee) ? (
        <button
          id={`hr-payroll-employee-edit-${employee.id}`}
          data-testid={`hr-payroll-employee-edit-${employee.id}`}
          className="btn-grid-action"
          onClick={() => openEmployeeAssignment(employee.id)}
          style={employeeActionButton}
        >
          Edit Structure
        </button>
      ) : (
        <button
          id={`hr-payroll-employee-assign-${employee.id}`}
          data-testid={`hr-payroll-employee-assign-${employee.id}`}
          className="btn-grid-action"
          onClick={() => openEmployeeAssignment(employee.id)}
          style={employeeActionButton}
        >
          Assign Structure
        </button>
      ),
    },
  ], [busy, employeeDepartmentFilter, employeeDepartments, employees]);

  const structureCards = structures.data.map((structure) => (
    <InfoCard
      key={structure.id}
      title={structure.structureName || "-"}
      subtitle={structure.structureCode || "-"}
      rows={[
        { label: "Frequency", value: structure.payrollFrequency || "MONTHLY" },
        { label: "Currency", value: structure.currencyCode || "INR" },
        { label: "Components", value: String(structure.components?.length ?? 0) },
      ]}
      actions={
        <>
          <Button
            id={`hr-payroll-structure-build-card-${structure.id}`}
            data-testid={`hr-payroll-structure-build-card-${structure.id}`}
            variant="primary"
            size="sm"
            onClick={() => openStructureBuilder(uidOf(structure))}
          >
            Build
          </Button>
          <Button
            id={`hr-payroll-structure-edit-card-${structure.id}`}
            data-testid={`hr-payroll-structure-edit-card-${structure.id}`}
            variant="outline"
            size="sm"
            icon={<Pencil size={14} />}
            onClick={() => openStructure(structure)}
          >
            Edit
          </Button>
        </>
      }
    />
  ));

  const componentCards = components.data.map((component) => (
    <InfoCard
      key={component.id}
      title={component.componentName || "-"}
      subtitle={component.componentCode || "-"}
      rows={[
        { label: "Type", value: labelize(component.componentType) },
        { label: "Category", value: labelize(component.componentCategory) },
        { label: "Calculation", value: labelize(component.calculationType) },
      ]}
      footer={<FlagList flags={[component.isStatutory && "Statutory", component.isTaxable && "Taxable", component.visibleInPayslip && "Payslip"]} />}
      actions={
        <Button
          id={`hr-payroll-component-edit-card-${component.id}`}
          data-testid={`hr-payroll-component-edit-card-${component.id}`}
          variant="outline"
          size="sm"
          icon={<Pencil size={14} />}
          onClick={() => openComponent(component)}
        >
          Edit
        </Button>
      }
    />
  ));

  const structureComponentCards = (selectedStructure?.components || []).map((mapping) => {
    const component = componentLookup.get(mapping.componentUid || mapping.payrollComponentUid || uidOf(mapping.component));
    const defaultValue = mapping.defaultAmount != null
      ? money(mapping.defaultAmount)
      : mapping.defaultPercentage != null
        ? `${mapping.defaultPercentage}%`
        : mapping.formulaExpression
          ? mapping.formulaExpression
          : (mapping.slabConfigJson || []).length > 0
            ? `${mapping.slabConfigJson?.length || 0} slabs`
            : "-";

    return (
      <InfoCard
        key={uidOf(mapping) || mapping.componentUid || mapping.payrollComponentUid || componentName(mapping)}
        title={componentName(mapping)}
        subtitle={component?.componentCode || mapping.componentCode || "-"}
        rows={[
          { label: "Type", value: labelize(component?.componentType) },
          { label: "Calculation", value: labelize(mapping.calculationType) },
          { label: "Default", value: defaultValue },
        ]}
        footer={<FlagList flags={[mapping.isMandatory && "Mandatory", mapping.allowEmployeeOverride && "Override"]} />}
      />
    );
  });

  return (
    <section id="hr-payroll-page" data-testid="hr-payroll-page" className="page-section active" style={{ background: "var(--app-bg)", flexGrow: 1, minWidth: 0 }}>
      <PageHeader
        title="Payroll Management"
        subtitle="Configurable components, salary structures, employee overrides, and payroll runs."
        actions={
          <>
            <button id="hr-payroll-run-month" data-testid="hr-payroll-run-month" className="btn btn-secondary" onClick={processRun} disabled={busy} style={buttonStyle}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Month
            </button>
            <button id="hr-payroll-export" data-testid="hr-payroll-export" className="btn btn-primary" onClick={exportPayslips} style={{ ...buttonStyle, background: "var(--primary-color)", border: "none", color: "white" }}>
              <Download size={16} /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile icon={<Settings2 size={18} />} label="Components" value={String(stats.components)} />
        <StatTile icon={<Layers3 size={18} />} label="Structures" value={String(stats.structures)} />
        <StatTile icon={<ReceiptText size={18} />} label="Payroll Runs" value={`${stats.finalized}/${stats.runs}`} />
        <StatTile icon={<FileText size={18} />} label="Net Payout" value={money(stats.totalPayout)} />
      </div>

      <div style={tabBar}>
        {PAYROLL_ROUTES.map(({ key, route, label, Icon }) => (
          <button key={key} id={`hr-payroll-tab-${key}`} data-testid={`hr-payroll-tab-${key}`} onClick={() => navigate(`/payroll/${route}`)} data-active={tab === key ? "true" : "false"} style={tabButton(tab === key)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "components" && (
        <Panel
          title="Payroll Component Master"
          action={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <ViewToggle value={componentsView} onChange={setComponentsView} scope="hr-payroll-components-view" />
              <button id="hr-payroll-component-new" data-testid="hr-payroll-component-new" className="btn btn-primary" onClick={() => openComponent()} style={primaryButton}><Plus size={16} /> New Component</button>
            </div>
          }
        >
          {components.loading ? <SkeletonTable rows={5} columns={6} /> : (
            componentsView === "table" ? (
              <DataTable
                data-testid="hr-payroll-components-table"
                data={components.data}
                columns={componentColumns}
                getRowId={(component) => component.id}
                loading={components.loading}
                className="rounded-none border-0 shadow-none"
                tableClassName="min-w-[980px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:min-h-[64px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
                emptyState={
                  <EmptyState
                    title="No payroll components"
                    description="Create payroll components to define earnings, deductions, and employer contribution lines."
                  />
                }
              />
            ) : (
              <CardCollection
                emptyTitle="No payroll components"
                emptyDescription="Create payroll components to define earnings, deductions, and employer contribution lines."
                items={componentCards}
              />
            )
          )}
        </Panel>
      )}

      {tab === "structures" && (
        routeState.isStructureBuilder ? (
          selectedStructure ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)] gap-6 items-start">
              <Panel
                title="Mapped Components"
                action={
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ViewToggle value={builderComponentsView} onChange={setBuilderComponentsView} scope="hr-payroll-builder-components-view" />
                    <Button
                      id="hr-payroll-structure-builder-back"
                      data-testid="hr-payroll-structure-builder-back"
                      variant="outline"
                      size="md"
                      icon={<ArrowLeft size={16} />}
                      onClick={() => navigate("/payroll/structures")}
                    >
                      Back
                    </Button>
                    <Button
                      id="hr-payroll-structure-builder-open-add"
                      data-testid="hr-payroll-structure-builder-open-add"
                      variant="primary"
                      size="md"
                      icon={<Plus size={16} />}
                      onClick={openAddComponentDialog}
                      disabled={components.data.length === 0}
                    >
                      Add Component
                    </Button>
                  </div>
                }
              >
                {builderComponentsView === "table" ? (
                  <DataTable
                    data-testid="hr-payroll-structure-components-table"
                    data={selectedStructure.components || []}
                    columns={structureComponentColumns}
                    getRowId={(mapping) => uidOf(mapping) || mapping.componentUid || mapping.payrollComponentUid || componentName(mapping)}
                    loading={structures.loading}
                    className="rounded-none border-0 shadow-none"
                    tableClassName="min-w-[760px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:min-h-[64px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
                    emptyState={
                      <EmptyState
                        title="No mapped components"
                        description="Add payroll components to this structure to define how salary lines are built."
                      />
                    }
                  />
                ) : (
                  <CardCollection
                    emptyTitle="No mapped components"
                    emptyDescription="Add payroll components to this structure to define how salary lines are built."
                    items={structureComponentCards}
                  />
                )}
              </Panel>

              <Panel title="Structure Details">
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: 14, background: "var(--app-bg)" }}>
                    <div style={sectionLabel}>Structure</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedStructure.structureName || "-"}</div>
                        <div style={{ color: "var(--light-text)", fontSize: 13 }}>{selectedStructure.structureCode || "-"}</div>
                      </div>
                      <div style={builderMetricRow}><span>Frequency</span><strong>{selectedStructure.payrollFrequency || "MONTHLY"}</strong></div>
                      <div style={builderMetricRow}><span>Currency</span><strong>{selectedStructure.currencyCode || "INR"}</strong></div>
                      <div style={builderMetricRow}><span>Mapped components</span><strong>{selectedStructure.components?.length ?? 0}</strong></div>
                      <div style={builderMetricRow}><span>Description</span><strong style={{ textAlign: "right" }}>{selectedStructure.description || "-"}</strong></div>
                    </div>
                  </div>
                  <Button
                    id="hr-payroll-structure-builder-edit"
                    data-testid="hr-payroll-structure-builder-edit"
                    variant="outline"
                    size="md"
                    icon={<Pencil size={16} />}
                    onClick={() => openStructure(selectedStructure)}
                  >
                    Edit Structure Details
                  </Button>
                  <Button
                    id="hr-payroll-structure-builder-open-add-secondary"
                    data-testid="hr-payroll-structure-builder-open-add-secondary"
                    variant="primary"
                    size="lg"
                    icon={<Plus size={16} />}
                    onClick={openAddComponentDialog}
                    disabled={components.data.length === 0}
                    fullWidth
                  >
                    Add Component
                  </Button>
                </div>
              </Panel>
            </div>
          ) : (
            <Panel title="Structure Builder">
              <EmptyState
                title="Structure not found"
                description="Return to the structures list and open a valid payroll structure builder."
              />
            </Panel>
          )
        ) : (
          <Panel
            title="Payroll Structures"
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ViewToggle value={structuresView} onChange={setStructuresView} scope="hr-payroll-structures-view" />
                <Button id="hr-payroll-structure-new" data-testid="hr-payroll-structure-new" variant="primary" size="md" icon={<Plus size={16} />} onClick={() => openStructure()}>New Structure</Button>
              </div>
            }
          >
            {structuresView === "table" ? (
              <DataTable
                data-testid="hr-payroll-structures-table"
                data={structures.data}
                columns={structureColumns}
                getRowId={(structure) => structure.id}
                loading={structures.loading}
                className="rounded-none border-0 shadow-none"
                tableClassName="min-w-[760px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:min-h-[64px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
                emptyState={
                  <EmptyState
                    title="No payroll structures"
                    description="Create a salary structure, then open its builder to map payroll components."
                  />
                }
              />
            ) : (
              <CardCollection
                emptyTitle="No payroll structures"
                emptyDescription="Create a salary structure, then open its builder to map payroll components."
                items={structureCards}
              />
            )}
          </Panel>
        )
      )}

      {tab === "employees" && (
        routeState.isEmployeeAssign ? (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
            <Panel
              title="Employee Salary Configuration"
              action={
                <Button
                  id="hr-payroll-employee-assign-back"
                  data-testid="hr-payroll-employee-assign-back"
                  variant="outline"
                  size="md"
                  icon={<ArrowLeft size={16} />}
                  onClick={() => navigate("/payroll/employees")}
                >
                  Back
                </Button>
              }
            >
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: 14, background: "var(--app-bg)" }}>
                  <div style={sectionLabel}>Employee</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{activeEmployeeRecord?.name || "-"}</div>
                  <div style={{ color: "var(--light-text)", fontSize: 13 }}>
                    {employees.find((employee) => employee.id === activeEmployeeUid)?.employeeId || "-"} · {employees.find((employee) => employee.id === activeEmployeeUid)?.department || "No department"}
                  </div>
                </div>
                <Select
                  label="Assign Structure"
                  value={assignmentForm.structureUid}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, structureUid: e.target.value }))}
                  options={structures.data.map((s) => ({ value: uidOf(s), label: `${s.structureName} (${s.structureCode})` }))}
                  placeholder="Select structure"
                />
                <DatePicker label="Effective From" value={assignmentForm.effectiveFrom} onChange={(e) => setAssignmentForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
                <DatePicker label="Effective To" value={assignmentForm.effectiveTo} onChange={(e) => setAssignmentForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
                <DynamicFields fields={employeeFields} values={employeeCustomValues} onChange={setEmployeeCustomValues} />
                <button id="hr-payroll-employee-assign" data-testid="hr-payroll-employee-assign" className="btn btn-primary" onClick={assignStructure} disabled={busy || !activeEmployeeUid} style={primaryButton}>Assign Structure</button>
              </div>
            </Panel>

            <Panel title="Active Assignment & Overrides">
              {employeePayroll.loading ? <SkeletonTable rows={4} columns={5} /> : !activeEmployeeUid ? (
                <div style={emptyText}>Select an employee to view payroll configuration.</div>
              ) : (
                <>
                  <div style={summaryBand}>
                    <div>
                      <div style={sectionLabel}>Active Structure</div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{activeStructure?.structureName || "-"}</div>
                      <div style={{ color: "var(--light-text)", fontSize: 13 }}>
                        {employeePayroll.assignment?.effectiveFrom || "-"} to {employeePayroll.assignment?.effectiveTo || "Open ended"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={sectionLabel}>Status</div>
                      <div style={{ fontWeight: 800 }}>{employeePayroll.assignment?.status || "Enabled"}</div>
                    </div>
                  </div>

                  <Table
                    headers={["Component", "Type", "Default", "Override", "Applicable"]}
                    empty={(activeStructure?.components || []).length === 0 ? "No components on the active structure." : null}
                  >
                    {(activeStructure?.components || []).map((mapping) => {
                      const key = uidOf(mapping);
                      const draft = overrideDrafts[key] || seedOverride(mapping);
                      const canOverride = !!mapping.allowEmployeeOverride;
                      return (
                        <tr key={key || mapping.componentUid}>
                          <td style={tdStrong}>{mapping.componentName || mapping.component?.componentName || mapping.componentCode || mapping.componentUid}</td>
                          <td style={tdStyle}>{labelize(mapping.calculationType)}</td>
                          <td style={tdStyle}>{mapping.defaultAmount != null ? money(mapping.defaultAmount) : mapping.defaultPercentage != null ? `${mapping.defaultPercentage}%` : mapping.formulaExpression || "-"}</td>
                          <td style={tdStyle}>
                            {canOverride ? (
                              <OverrideInput mapping={mapping} value={draft} onChange={(patch) => updateOverride(mapping, patch)} />
                            ) : (
                              <span style={{ color: "var(--light-text)" }}>Locked</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {mapping.isMandatory ? (
                              <span style={{ fontWeight: 700 }}>Mandatory</span>
                            ) : (
                              <input type="checkbox" checked={draft.isApplicable !== false} onChange={(e) => updateOverride(mapping, { isApplicable: e.target.checked })} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button id="hr-payroll-employee-overrides-save" data-testid="hr-payroll-employee-overrides-save" className="btn btn-primary" onClick={saveOverrides} disabled={busy || Object.keys(overrideDrafts).length === 0} style={primaryButton}>Save Overrides</button>
                  </div>
                </>
              )}
            </Panel>
          </div>
        ) : (
          <Panel title={`Employee Payroll List (${filteredEmployees.length})`}>
            <div style={{ display: "grid", gap: 16 }}>
              <DataTableToolbar
                query={employeeQuery}
                onQueryChange={setEmployeeQuery}
                searchPlaceholder="Search employee, email, ID, department"
              />
              <DataTable
                data-testid="hr-payroll-employees-table"
                data={filteredEmployees}
                columns={employeeColumns}
                getRowId={(employee) => employee.id}
                loading={employeesLoading}
                className="rounded-none border-0 shadow-none"
                tableClassName="min-w-[860px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:min-h-[64px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
                emptyState={
                  <EmptyState
                    title="No employees found"
                    description="Adjust the search or filters, or add employees for payroll assignment."
                  />
                }
              />
            </div>
          </Panel>
        )
      )}

      {tab === "runs" && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
          <Panel title="Payroll Run Dashboard">
            <div style={{ display: "grid", gap: 14 }}>
              <MonthPicker label="Run Month" value={runMonth} onChange={(e) => setRunMonth(e.target.value)} />
              <button id="hr-payroll-process" data-testid="hr-payroll-process" className="btn btn-primary" onClick={processRun} disabled={busy} style={primaryButton}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Process Payroll
              </button>
              <div style={noticeStyle}>409 conflicts are shown when a month is already processing or finalized. 422 validation errors should be resolved in the employee payroll setup before rerunning payroll.</div>
            </div>
            <div style={{ marginTop: 18 }}>
              <Table headers={["Month", "Status", "Employees"]} compact empty={runs.data.length === 0 ? "No payroll runs yet." : null}>
                {runs.data.slice(0, 8).map((run) => (
                  <tr key={run.id}>
                    <td style={tdStrong}>{run.monthStr || run.month || "-"}</td>
                    <td style={tdStyle}>{run.status || "-"}</td>
                    <td style={tdStyle}>{run.employeeCount ?? "-"}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </Panel>

          <Panel title="Generated Payslips">
            {payslips.loading ? <SkeletonTable rows={5} columns={6} /> : (
              <Table
                headers={["Employee", "Month", "Gross", "Deductions", "Net", "Status", "Action"]}
                empty={payslips.data.length === 0 ? "No generated payslips found." : null}
              >
                {payslips.data.map((payslip) => (
                  <tr key={payslip.id}>
                    <td style={tdStrong}>{payslip.employeeName || employeeName(payslip.employeeUid)}</td>
                    <td style={tdStyle}>{payslip.monthStr || payslip.month || "-"}</td>
                    <td style={tdStyle}>{money(payslip.grossPay)}</td>
                    <td style={tdStyle}>{money(payslip.totalDeductions)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{money(payslip.netPay)}</td>
                    <td style={tdStyle}>{payslip.status || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button id={`hr-payroll-payslip-view-${payslip.id}`} data-testid={`hr-payroll-payslip-view-${payslip.id}`} className="btn-grid-action" onClick={() => setViewSlip(payslip)} style={smallAction}>View</button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </div>
      )}

      {tab === "fields" && (
        <Panel
          title="Payroll Custom Fields"
          action={<button id="hr-payroll-custom-field-new" data-testid="hr-payroll-custom-field-new" className="btn btn-primary" onClick={() => setFieldOpen(true)} style={primaryButton}><Plus size={16} /> New Field</button>}
        >
          {customFields.loading ? <SkeletonTable rows={5} columns={5} /> : (
            <Table
              headers={["Target", "Key", "Label", "Data Type", "Required", "Default"]}
              empty={customFields.data.length === 0 ? "No custom fields configured." : null}
            >
              {customFields.data.map((field) => (
                <tr key={field.id}>
                  <td style={tdStyle}>{labelize(field.targetType)}</td>
                  <td style={tdStrong}>{field.fieldKey}</td>
                  <td style={tdStyle}>{field.fieldLabel}</td>
                  <td style={tdStyle}>{field.dataType}</td>
                  <td style={tdStyle}>{field.isRequired ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{field.defaultValue || "-"}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
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
        components={components.data}
        selectedStructure={selectedStructure || null}
        onClose={() => setBuilderDialogOpen(false)}
        onSave={addStructureComponent}
        onChange={setMappingForm}
      />
      <CustomFieldDialog
        open={fieldOpen}
        form={fieldForm}
        busy={busy}
        onClose={() => setFieldOpen(false)}
        onSave={saveCustomField}
        onChange={setFieldForm}
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

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="modal-card" style={panelStyle}>
      <div style={panelHeader}>
        <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
  scope,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  scope: string;
}) {
  return (
    <div style={viewToggleWrap}>
      <button
        id={`${scope}-table`}
        data-testid={`${scope}-table`}
        type="button"
        onClick={() => onChange("table")}
        style={viewToggleButton(value === "table")}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={16} />
      </button>
      <button
        id={`${scope}-cards`}
        data-testid={`${scope}-cards`}
        type="button"
        onClick={() => onChange("cards")}
        style={viewToggleButton(value === "cards")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function CardCollection({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: ReactNode[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={cardCollection}>{items}</div>;
}

function InfoCard({
  title,
  subtitle,
  rows,
  actions,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={infoCard}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--dark-text)" }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: "var(--light-text)" }}>{subtitle}</div> : null}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={builderMetricRow}>
            <span style={{ color: "var(--light-text)" }}>{row.label}</span>
            <strong style={{ textAlign: "right" }}>{row.value}</strong>
          </div>
        ))}
      </div>
      {footer ? <div style={{ display: "flex", justifyContent: "flex-start" }}>{footer}</div> : null}
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

function Table({
  headers,
  empty,
  children,
  compact,
}: {
  headers: string[];
  empty: string | null;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {empty ? (
            <tr><td colSpan={headers.length} style={{ ...tdStyle, textAlign: "center", padding: compact ? "22px 12px" : "44px 12px", color: "var(--light-text)" }}>{empty}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

function FlagList({ flags }: { flags: Array<string | false | undefined> }) {
  const visible = flags.filter(Boolean) as string[];
  if (visible.length === 0) return <span style={{ color: "var(--light-text)" }}>-</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {visible.map((flag) => <span key={flag} style={chipStyle}>{flag}</span>)}
    </div>
  );
}

function SlabBuilder({ value, onChange }: { value: SlabTier[]; onChange: (value: SlabTier[]) => void }) {
  const update = (index: number, patch: SlabTier) => onChange(value.map((tier, i) => i === index ? { ...tier, ...patch } : tier));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={sectionLabel}>Slab Tiers</div>
      {value.length === 0 ? <div style={emptyText}>No tiers. Add min/max slabs for this component.</div> : null}
      {value.map((tier, index) => (
        <div key={index} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input placeholder="Min" type="number" value={tier.min ?? ""} onChange={(e) => update(index, { min: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="Max" type="number" value={tier.max ?? ""} onChange={(e) => update(index, { max: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="Amount" type="number" value={tier.amount ?? ""} onChange={(e) => update(index, { amount: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="%" type="number" value={tier.percentage ?? ""} onChange={(e) => update(index, { percentage: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <button className="btn-grid-action" onClick={() => onChange(value.filter((_, i) => i !== index))} style={smallAction}>Remove</button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={() => onChange([...value, {}])} style={buttonStyle}>Add Tier</button>
    </div>
  );
}

function OverrideInput({
  mapping,
  value,
  onChange,
}: {
  mapping: StructureComponentMapping;
  value: EmployeeComponentValue;
  onChange: (patch: Partial<EmployeeComponentValue>) => void;
}) {
  if (mapping.calculationType === "FORMULA") {
    return <textarea value={value.formulaExpression ?? ""} onChange={(e) => onChange({ formulaExpression: e.target.value })} rows={2} style={{ ...fieldStyle, minWidth: 220 }} />;
  }
  if (mapping.calculationType === "PERCENTAGE") {
    return <input type="number" value={value.overridePercentage ?? ""} onChange={(e) => onChange({ overridePercentage: numericOrUndefined(e.target.value) })} style={{ ...fieldStyle, minWidth: 150 }} />;
  }
  return <input type="number" value={value.overrideAmount ?? ""} onChange={(e) => onChange({ overrideAmount: numericOrUndefined(e.target.value) })} style={{ ...fieldStyle, minWidth: 150 }} />;
}

function DynamicFields({
  fields,
  values,
  onChange,
}: {
  fields: PayrollCustomField[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={sectionLabel}>Custom Fields</div>
      {fields.map((field) => {
        const current = values[field.fieldKey] ?? field.defaultValue ?? "";
        const set = (value: unknown) => onChange({ ...values, [field.fieldKey]: value });
        if (field.dataType === "BOOLEAN") {
          return <ToggleRow key={field.id} label={field.fieldLabel} checked={Boolean(current)} onChange={set} />;
        }
        const isNumeric = field.dataType === "NUMBER" || field.dataType === "DECIMAL";
        return (
          <TextField
            key={field.id}
            label={field.fieldLabel}
            required={field.isRequired}
            type={isNumeric ? "number" : field.dataType === "DATE" ? "date" : "text"}
            value={String(current)}
            onChange={(value) => set(isNumeric ? numericOrUndefined(value) : value)}
          />
        );
      })}
    </div>
  );
}

function ComponentDialog({
  open,
  form,
  busy,
  onClose,
  onSave,
  onChange,
}: {
  open: boolean;
  form: Partial<PayrollComponent>;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: Partial<PayrollComponent>) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="max-w-[720px] p-0 overflow-hidden">
      <DialogHeader title="Payroll Component" onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Component Name" required value={form.componentName} onChange={(v) => onChange({ ...form, componentName: v })} />
          <TextField label="Component Code" required value={form.componentCode} onChange={(v) => onChange({ ...form, componentCode: normalizeCode(v) })} />
          <Select label="Type" value={form.componentType} onChange={(e) => onChange({ ...form, componentType: e.target.value as ComponentType })} options={COMPONENT_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
          <Select label="Category" value={form.componentCategory} onChange={(e) => onChange({ ...form, componentCategory: e.target.value as ComponentCategory })} options={CATEGORIES.map((v) => ({ value: v, label: labelize(v) }))} />
          <Select label="Calculation Type" value={form.calculationType} onChange={(e) => onChange({ ...form, calculationType: e.target.value as CalculationType })} options={CALC_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ marginTop: 18 }}>
          {(["isStatutory", "isTaxable", "affectsGrossPay", "affectsNetPay", "affectsCtc", "visibleInPayslip"] as const).map((key) => (
            <ToggleRow key={key} label={labelize(key)} checked={!!form[key]} onChange={(checked) => onChange({ ...form, [key]: checked })} />
          ))}
        </div>
      </div>
      <DialogActions busy={busy} onClose={onClose} onSave={onSave} />
    </Dialog>
  );
}

function StructureDialog({
  open,
  form,
  busy,
  onClose,
  onSave,
  onChange,
}: {
  open: boolean;
  form: Partial<PayrollStructure>;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: Partial<PayrollStructure>) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="max-w-[640px] p-0 overflow-hidden">
      <DialogHeader title="Payroll Structure" onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Structure Name" required value={form.structureName} onChange={(v) => onChange({ ...form, structureName: v })} />
          <TextField label="Structure Code" required value={form.structureCode} onChange={(v) => onChange({ ...form, structureCode: normalizeCode(v) })} />
          <Select label="Frequency" value={form.payrollFrequency || "MONTHLY"} onChange={(e) => onChange({ ...form, payrollFrequency: e.target.value as PayrollStructure["payrollFrequency"] })} options={["MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY"].map((v) => ({ value: v, label: labelize(v) }))} />
          <TextField label="Currency" value={form.currencyCode} onChange={(v) => onChange({ ...form, currencyCode: v.toUpperCase() })} />
        </div>
        <div style={{ marginTop: 14 }}>
          <TextAreaField label="Description" value={form.description} onChange={(v) => onChange({ ...form, description: v })} />
        </div>
      </div>
      <DialogActions busy={busy} onClose={onClose} onSave={onSave} />
    </Dialog>
  );
}

function StructureBuilderDialog({
  open,
  busy,
  form,
  components,
  selectedStructure,
  onClose,
  onSave,
  onChange,
}: {
  open: boolean;
  busy: boolean;
  form: Partial<StructureComponentMapping>;
  components: PayrollComponent[];
  selectedStructure: PayrollStructure | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: Partial<StructureComponentMapping>) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[760px] p-0 overflow-hidden">
      <DialogHeader title={`Add Component${selectedStructure?.structureName ? ` - ${selectedStructure.structureName}` : ""}`} onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="hr-payroll-structure-builder-component"
            testId="hr-payroll-structure-builder-component"
            label="Master Component"
            value={form.componentUid || uidOf(components[0])}
            onChange={(e) => onChange({ ...form, componentUid: e.target.value })}
            options={components.map((component) => ({ value: uidOf(component), label: `${component.componentName} (${component.componentCode})` }))}
          />
          <Select
            id="hr-payroll-structure-builder-calculation"
            testId="hr-payroll-structure-builder-calculation"
            label="Calculation Type"
            value={form.calculationType || "FIXED_AMOUNT"}
            onChange={(e) => onChange({ ...form, calculationType: e.target.value as CalculationType })}
            options={CALC_TYPES.map((value) => ({ value, label: labelize(value) }))}
          />
        </div>
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {form.calculationType === "FIXED_AMOUNT" && (
            <TextField
              label="Default Amount"
              type="number"
              value={form.defaultAmount ?? ""}
              onChange={(value) => onChange({ ...form, defaultAmount: numericOrUndefined(value) })}
            />
          )}
          {form.calculationType === "PERCENTAGE" && (
            <TextField
              label="Default Percentage"
              type="number"
              value={form.defaultPercentage ?? ""}
              onChange={(value) => onChange({ ...form, defaultPercentage: numericOrUndefined(value) })}
            />
          )}
          {form.calculationType === "FORMULA" && (
            <TextAreaField
              label="Formula Expression"
              value={form.formulaExpression}
              onChange={(value) => onChange({ ...form, formulaExpression: value })}
            />
          )}
          {form.calculationType === "SLAB_BASED" && (
            <SlabBuilder value={form.slabConfigJson || []} onChange={(slabs) => onChange({ ...form, slabConfigJson: slabs })} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow label="Mandatory" checked={form.isMandatory} onChange={(value) => onChange({ ...form, isMandatory: value })} />
            <ToggleRow label="Employee Override" checked={form.allowEmployeeOverride} onChange={(value) => onChange({ ...form, allowEmployeeOverride: value })} />
          </div>
        </div>
      </div>
      <div style={dialogActions}>
        <Button id="hr-payroll-structure-builder-cancel" data-testid="hr-payroll-structure-builder-cancel" variant="outline" size="md" onClick={onClose}>Cancel</Button>
        <Button id="hr-payroll-structure-add-component" data-testid="hr-payroll-structure-add-component" variant="primary" size="md" loading={busy} onClick={onSave}>Add Component</Button>
      </div>
    </Dialog>
  );
}

function CustomFieldDialog({
  open,
  form,
  busy,
  onClose,
  onSave,
  onChange,
}: {
  open: boolean;
  form: Partial<PayrollCustomField>;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: Partial<PayrollCustomField>) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="max-w-[560px] p-0 overflow-hidden">
      <DialogHeader title="Custom Field" onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Target Type" value={form.targetType} onChange={(e) => onChange({ ...form, targetType: e.target.value as CustomFieldTarget })} options={TARGET_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
          <Select label="Data Type" value={form.dataType} onChange={(e) => onChange({ ...form, dataType: e.target.value as CustomFieldDataType })} options={FIELD_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
          <TextField label="Field Key" required value={form.fieldKey} onChange={(v) => onChange({ ...form, fieldKey: normalizeCode(v).toLowerCase() })} />
          <TextField label="Field Label" required value={form.fieldLabel} onChange={(v) => onChange({ ...form, fieldLabel: v })} />
          <TextField label="Default Value" value={form.defaultValue} onChange={(v) => onChange({ ...form, defaultValue: v })} />
          <ToggleRow label="Required" checked={form.isRequired} onChange={(v) => onChange({ ...form, isRequired: v })} />
        </div>
      </div>
      <DialogActions busy={busy} onClose={onClose} onSave={onSave} />
    </Dialog>
  );
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={dialogHeader}>
      <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
      <button onClick={onClose} aria-label="Close" style={iconButton}><X size={20} /></button>
    </div>
  );
}

function DialogActions({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <div style={dialogActions}>
      <button className="btn btn-secondary" onClick={onClose} style={buttonStyle}>Cancel</button>
      <button className="btn btn-primary" onClick={onSave} disabled={busy} style={primaryButton}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Save"}</button>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "relative",
  transform: "none",
  left: 0,
  top: 0,
  minWidth: 0,
  width: "100%",
  maxWidth: "none",
  maxHeight: "none",
  boxShadow: "var(--shadow-sm)",
  borderRadius: 8,
};
const panelHeader: CSSProperties = {
  padding: "18px 20px",
  borderBottom: "1px solid var(--border-color)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};
const fieldWrap: CSSProperties = { display: "grid", gap: 6 };
const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--light-text)" };
const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--surface-bg)",
  color: "var(--dark-text)",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "var(--light-text)",
  borderBottom: "1px solid var(--border-color)",
};
const tdStyle: CSSProperties = { padding: "13px 14px", fontSize: 14, color: "var(--dark-text)", borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" };
const tdStrong: CSSProperties = { ...tdStyle, fontWeight: 800 };
const buttonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8 };
const primaryButton: CSSProperties = { ...buttonStyle, background: "var(--primary-color)", border: "none", color: "white" };
const smallAction: CSSProperties = { ...buttonStyle, padding: "7px 10px" };
const employeeActionButton: CSSProperties = { ...smallAction, minWidth: 132 };
const tabBar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, padding: 4, background: "var(--border-color)", borderRadius: 8, marginBottom: 18, width: "fit-content" };
const viewToggleWrap: CSSProperties = { display: "inline-flex", alignItems: "center", padding: 2, borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--app-bg)", gap: 2 };
const viewToggleButton = (active: boolean): CSSProperties => ({
  border: "none",
  borderRadius: 8,
  minWidth: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  background: active ? "var(--surface-bg)" : "transparent",
  color: active ? "var(--dark-text)" : "var(--light-text)",
  boxShadow: active ? "var(--shadow-sm)" : "none",
});
const tabButton = (active: boolean): CSSProperties => ({
  ...buttonStyle,
  border: "none",
  padding: "9px 13px",
  fontWeight: 800,
  fontSize: 13,
  background: active ? "var(--surface-bg)" : "transparent",
  color: active ? "var(--dark-text)" : "var(--light-text)",
  cursor: "pointer",
});
const statTile: CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 18,
  background: "var(--surface-bg)",
  display: "flex",
  alignItems: "center",
  gap: 14,
  boxShadow: "var(--shadow-sm)",
};
const statIcon: CSSProperties = { width: 38, height: 38, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--app-bg)", color: "var(--primary-color)" };
const chipStyle: CSSProperties = { borderRadius: 999, padding: "3px 8px", background: "var(--app-bg)", color: "var(--dark-text)", fontSize: 11, fontWeight: 800 };
const toggleStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 13, fontWeight: 700 };
const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--light-text)", marginBottom: 8 };
const emptyText: CSSProperties = { fontSize: 13, color: "var(--light-text)", padding: "10px 0" };
const cardCollection: CSSProperties = { display: "grid", gap: 14 };
const infoCard: CSSProperties = { display: "grid", gap: 14, padding: 16, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", boxShadow: "var(--shadow-sm)" };
const mappingCard: CSSProperties = { border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const builderMetricRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", fontSize: 13, color: "var(--dark-text)" };
const noticeStyle: CSSProperties = { fontSize: 12, lineHeight: 1.5, color: "var(--light-text)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, background: "var(--app-bg)" };
const summaryBand: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, padding: 16, borderRadius: 8, background: "var(--app-bg)", marginBottom: 16, flexWrap: "wrap" };
const dialogHeader: CSSProperties = { padding: "18px 22px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const dialogBody: CSSProperties = { padding: 22 };
const dialogActions: CSSProperties = { padding: "16px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 };
const iconButton: CSSProperties = { background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
