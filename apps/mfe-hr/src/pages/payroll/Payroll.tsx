import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
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
import { DatePicker, Dialog, MonthPicker, PageHeader, Select, SkeletonTable } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
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

function tabFromPath(pathname: string): Tab {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  const match = PAYROLL_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "components";
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
  const tab = tabFromPath(location.pathname);
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
  const { data: employees } = useEmployees({ enabled: needsEmployees });

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const employeePayroll = useEmployeePayroll(selectedEmployee || null, { enabled: tab === "employees" });
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);

  const [componentOpen, setComponentOpen] = useState(false);
  const [editingComponentUid, setEditingComponentUid] = useState<string | null>(null);
  const [componentForm, setComponentForm] = useState<Partial<PayrollComponent>>(emptyComponent);

  const [structureOpen, setStructureOpen] = useState(false);
  const [editingStructureUid, setEditingStructureUid] = useState<string | null>(null);
  const [structureForm, setStructureForm] = useState<Partial<PayrollStructure>>(emptyStructure);
  const [builderStructureUid, setBuilderStructureUid] = useState("");
  const [mappingForm, setMappingForm] = useState<Partial<StructureComponentMapping>>(emptyMapping);

  const [assignmentForm, setAssignmentForm] = useState({
    structureUid: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  });
  const [employeeCustomValues, setEmployeeCustomValues] = useState<Record<string, unknown>>({});
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, EmployeeComponentValue>>({});

  const [fieldOpen, setFieldOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<Partial<PayrollCustomField>>(emptyField);

  const selectedStructure = useMemo(
    () => structures.data.find((s) => uidOf(s) === builderStructureUid) ?? structures.data[0],
    [builderStructureUid, structures.data]
  );
  const effectiveBuilderUid = uidOf(selectedStructure);
  const effectiveComponentUid = mappingForm.componentUid || uidOf(components.data[0]);
  const activeStructureUid = employeePayroll.assignment?.structureUid || uidOf(employeePayroll.assignment?.structure);
  const activeStructure = structures.data.find((s) => uidOf(s) === activeStructureUid) || employeePayroll.assignment?.structure;
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
    if (tab !== "structures" || !effectiveBuilderUid) return;
    void structures.loadComponents(effectiveBuilderUid).catch((e) => {
      setMessage(getErrorMessage(e));
    });
  }, [effectiveBuilderUid, structures.loadComponents, tab]);

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
      setMessage("Component added to structure.");
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const assignStructure = async () => {
    if (!selectedEmployee || !assignmentForm.structureUid || !assignmentForm.effectiveFrom) {
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
    if (!selectedEmployee || payload.length === 0) {
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
          action={<button id="hr-payroll-component-new" data-testid="hr-payroll-component-new" className="btn btn-primary" onClick={() => openComponent()} style={primaryButton}><Plus size={16} /> New Component</button>}
        >
          {components.loading ? <SkeletonTable rows={5} columns={6} /> : (
            <Table
              headers={["Code", "Name", "Type", "Category", "Calculation", "Flags", "Action"]}
              empty={components.data.length === 0 ? "No payroll components configured." : null}
            >
              {components.data.map((component) => (
                <tr key={component.id}>
                  <td style={tdStrong}>{component.componentCode}</td>
                  <td style={tdStyle}>{component.componentName}</td>
                  <td style={tdStyle}>{labelize(component.componentType)}</td>
                  <td style={tdStyle}>{labelize(component.componentCategory)}</td>
                  <td style={tdStyle}>{labelize(component.calculationType)}</td>
                  <td style={tdStyle}>
                    <FlagList flags={[
                      component.isStatutory && "Statutory",
                      component.isTaxable && "Taxable",
                      component.visibleInPayslip && "Payslip",
                    ]} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button id={`hr-payroll-component-edit-${component.id}`} data-testid={`hr-payroll-component-edit-${component.id}`} className="btn-grid-action" onClick={() => openComponent(component)} style={smallAction}><Pencil size={14} /> Edit</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      )}

      {tab === "structures" && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(360px,3fr)] gap-6 items-start">
          <Panel
            title="Payroll Structures"
            action={<button id="hr-payroll-structure-new" data-testid="hr-payroll-structure-new" className="btn btn-primary" onClick={() => openStructure()} style={primaryButton}><Plus size={16} /> New Structure</button>}
          >
            {structures.loading ? <SkeletonTable rows={5} columns={6} /> : (
              <Table
                headers={["Code", "Name", "Frequency", "Currency", "Components", "Action"]}
                empty={structures.data.length === 0 ? "No payroll structures configured." : null}
              >
                {structures.data.map((structure) => (
                  <tr key={structure.id}>
                    <td style={tdStrong}>{structure.structureCode}</td>
                    <td style={tdStyle}>{structure.structureName}</td>
                    <td style={tdStyle}>{structure.payrollFrequency || "MONTHLY"}</td>
                    <td style={tdStyle}>{structure.currencyCode || "INR"}</td>
                    <td style={tdStyle}>{structure.components?.length ?? 0}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button id={`hr-payroll-structure-build-${structure.id}`} data-testid={`hr-payroll-structure-build-${structure.id}`} className="btn-grid-action" onClick={() => { setBuilderStructureUid(uidOf(structure)); }} style={smallAction}>Build</button>
                        <button id={`hr-payroll-structure-edit-${structure.id}`} data-testid={`hr-payroll-structure-edit-${structure.id}`} className="btn-grid-action" onClick={() => openStructure(structure)} style={smallAction}><Pencil size={14} /> Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="Structure Builder">
            <div style={{ display: "grid", gap: 14 }}>
              <Select
                label="Structure"
                value={effectiveBuilderUid}
                onChange={(e) => setBuilderStructureUid(e.target.value)}
                options={structures.data.map((s) => ({ value: uidOf(s), label: `${s.structureName} (${s.structureCode})` }))}
              />
              <Select
                label="Master Component"
                value={effectiveComponentUid}
                onChange={(e) => setMappingForm((f) => ({ ...f, componentUid: e.target.value }))}
                options={components.data.map((c) => ({ value: uidOf(c), label: `${c.componentName} (${c.componentCode})` }))}
              />
              <Select
                label="Calculation Type"
                value={mappingForm.calculationType || "FIXED_AMOUNT"}
                onChange={(e) => setMappingForm((f) => ({ ...f, calculationType: e.target.value as CalculationType }))}
                options={CALC_TYPES.map((v) => ({ value: v, label: labelize(v) }))}
              />
              {mappingForm.calculationType === "FIXED_AMOUNT" && (
                <TextField label="Default Amount" type="number" value={mappingForm.defaultAmount ?? ""} onChange={(v) => setMappingForm((f) => ({ ...f, defaultAmount: numericOrUndefined(v) }))} />
              )}
              {mappingForm.calculationType === "PERCENTAGE" && (
                <TextField label="Default Percentage" type="number" value={mappingForm.defaultPercentage ?? ""} onChange={(v) => setMappingForm((f) => ({ ...f, defaultPercentage: numericOrUndefined(v) }))} />
              )}
              {mappingForm.calculationType === "FORMULA" && (
                <TextAreaField label="Formula Expression" value={mappingForm.formulaExpression} onChange={(v) => setMappingForm((f) => ({ ...f, formulaExpression: v }))} />
              )}
              {mappingForm.calculationType === "SLAB_BASED" && (
                <SlabBuilder value={mappingForm.slabConfigJson || []} onChange={(slabs) => setMappingForm((f) => ({ ...f, slabConfigJson: slabs }))} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Mandatory" checked={mappingForm.isMandatory} onChange={(v) => setMappingForm((f) => ({ ...f, isMandatory: v }))} />
                <ToggleRow label="Employee Override" checked={mappingForm.allowEmployeeOverride} onChange={(v) => setMappingForm((f) => ({ ...f, allowEmployeeOverride: v }))} />
              </div>
              <button id="hr-payroll-structure-add-component" data-testid="hr-payroll-structure-add-component" className="btn btn-primary" onClick={addStructureComponent} disabled={busy} style={primaryButton}>Add Component</button>
            </div>
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
              <div style={sectionLabel}>Mapped Components</div>
              <div style={{ display: "grid", gap: 10 }}>
                {(selectedStructure?.components || []).length === 0 ? (
                  <div style={emptyText}>No components mapped to this structure.</div>
                ) : selectedStructure?.components?.map((mapping) => (
                  <div key={uidOf(mapping) || mapping.componentUid} style={mappingCard}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{componentName(mapping)}</div>
                      <div style={{ fontSize: 12, color: "var(--light-text)" }}>{labelize(mapping.calculationType)}</div>
                    </div>
                    <FlagList flags={[mapping.isMandatory && "Mandatory", mapping.allowEmployeeOverride && "Override"]} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "employees" && (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
          <Panel title="Employee Salary Configuration">
            <div style={{ display: "grid", gap: 14 }}>
              <Select
                label="Employee"
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setOverrideDrafts({});
                }}
                options={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employeeId})` }))}
                placeholder="Select employee"
              />
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
              <button id="hr-payroll-employee-assign" data-testid="hr-payroll-employee-assign" className="btn btn-primary" onClick={assignStructure} disabled={busy || !selectedEmployee} style={primaryButton}>Assign Structure</button>
            </div>
          </Panel>

          <Panel title="Active Assignment & Overrides">
            {employeePayroll.loading ? <SkeletonTable rows={4} columns={5} /> : !selectedEmployee ? (
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
      <CustomFieldDialog
        open={fieldOpen}
        form={fieldForm}
        busy={busy}
        onClose={() => setFieldOpen(false)}
        onSave={saveCustomField}
        onChange={setFieldForm}
      />
      <PayslipDialog
        payslip={viewSlip}
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

function PayslipDialog({
  payslip,
  fields,
  employeeName,
  onClose,
}: {
  payslip: Payslip | null;
  fields: PayrollCustomField[];
  employeeName: string;
  onClose: () => void;
}) {
  const lines = payslip?.lines || payslip?.lineItems || [];
  return (
    <Dialog open={!!payslip} onClose={onClose} hideHeader contentClassName="max-w-[760px] p-0 overflow-hidden">
      {payslip && (
        <>
          <DialogHeader title={`Payslip - ${payslip.employeeName || employeeName}`} onClose={onClose} />
          <div style={dialogBody}>
            <div style={summaryBand}>
              <div><div style={sectionLabel}>Month</div><div style={{ fontWeight: 800 }}>{payslip.monthStr || payslip.month || "-"}</div></div>
              <div><div style={sectionLabel}>Generated</div><div style={{ fontWeight: 800 }}>{formatDate(payslip.generatedAt)}</div></div>
              <div><div style={sectionLabel}>Net Pay</div><div style={{ fontWeight: 800 }}>{money(payslip.netPay)}</div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: 16 }}>
              <PayBucket title="Earnings" values={payslip.earnings || {}} />
              <PayBucket title="Deductions" values={payslip.deductions || {}} />
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={sectionLabel}>Detailed Line Snapshots</div>
              <Table headers={["Component", "Type", "Calculation", "Amount"]} compact empty={lines.length === 0 ? "No detailed line items returned." : null}>
                {lines.map((line, index) => (
                  <tr key={line.uid || line.id || index}>
                    <td style={tdStrong}>{line.componentName || line.componentCode || "-"}</td>
                    <td style={tdStyle}>{labelize(line.componentType)}</td>
                    <td style={tdStyle}>{labelize(line.calculationType)}</td>
                    <td style={tdStyle}>{money(line.amount)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            {fields.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={sectionLabel}>Custom Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <div key={field.id} style={mappingCard}>
                      <span style={{ color: "var(--light-text)" }}>{field.fieldLabel}</span>
                      <strong>{String(payslip.customFieldsJson?.[field.fieldKey] ?? field.defaultValue ?? "-")}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}

function PayBucket({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values || {});
  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: 14 }}>
      <div style={sectionLabel}>{title}</div>
      {entries.length === 0 ? <div style={emptyText}>No {title.toLowerCase()} returned.</div> : entries.map(([key, value]) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-color)" }}>
          <span>{labelize(key)}</span>
          <strong>{money(value)}</strong>
        </div>
      ))}
    </div>
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
const tabBar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, padding: 4, background: "var(--border-color)", borderRadius: 8, marginBottom: 18, width: "fit-content" };
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
const mappingCard: CSSProperties = { border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const noticeStyle: CSSProperties = { fontSize: 12, lineHeight: 1.5, color: "var(--light-text)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, background: "var(--app-bg)" };
const summaryBand: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, padding: 16, borderRadius: 8, background: "var(--app-bg)", marginBottom: 16, flexWrap: "wrap" };
const dialogHeader: CSSProperties = { padding: "18px 22px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const dialogBody: CSSProperties = { padding: 22 };
const dialogActions: CSSProperties = { padding: "16px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 };
const iconButton: CSSProperties = { background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
