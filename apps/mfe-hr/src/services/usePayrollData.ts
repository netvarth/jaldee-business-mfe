import { useCallback, useEffect, useState } from "react";
import { HR_SERVICE_API_ROOT, useHrApi } from "./useHrApi";

const PAYROLL_ROOT = `${HR_SERVICE_API_ROOT}/tenant/payroll`;

export type ComponentType = "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION" | "MEMO";
export type ComponentCategory =
  | "OVERTIME"
  | "ADVANCE"
  | "TDS"
  | "BASIC"
  | "LOAN"
  | "CUSTOM"
  | "PROFESSIONAL_TAX"
  | "PF"
  | "GRATUITY"
  | "ALLOWANCE"
  | "LWF"
  | "ARREARS"
  | "MEDICLAIM"
  | "HRA"
  | "REIMBURSEMENT"
  | "ESI"
  | "BONUS";
export type CalculationType = "FIXED_AMOUNT" | "PERCENTAGE" | "FORMULA" | "SLAB_BASED";
export type PayrollFrequency = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY";
export type CustomFieldTarget =
  | "PAYROLL_COMPONENT"
  | "PAYROLL_STRUCTURE"
  | "PAYROLL_STRUCTURE_COMPONENT"
  | "EMPLOYEE_PAYROLL_STRUCTURE"
  | "EMPLOYEE_PAYROLL_COMPONENT_VALUE"
  | "PAYSLIP"
  | "PAYSLIP_LINE";
export type CustomFieldDataType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "DROPDOWN" | "MULTI_SELECT" | "JSON" | "DECIMAL";

export const PAYROLL_CUSTOM_FIELD_TARGETS: CustomFieldTarget[] = [
  "PAYROLL_COMPONENT",
  "PAYROLL_STRUCTURE",
  "PAYROLL_STRUCTURE_COMPONENT",
  "EMPLOYEE_PAYROLL_STRUCTURE",
  "EMPLOYEE_PAYROLL_COMPONENT_VALUE",
  "PAYSLIP",
  "PAYSLIP_LINE",
];

export interface PayrollComponent {
  id: string;
  uid?: string;
  componentName: string;
  componentCode: string;
  componentType: ComponentType;
  componentCategory: ComponentCategory;
  calculationType: CalculationType;
  isStatutory?: boolean;
  isTaxable?: boolean;
  affectsGrossPay?: boolean;
  affectsNetPay?: boolean;
  affectsCtc?: boolean;
  visibleInPayslip?: boolean;
  displayOrder?: number;
  status?: string;
  customFields?: Record<string, unknown>;
  customFieldsJson?: Record<string, unknown>;
}

export interface StructureComponentMapping {
  id: string;
  uid?: string;
  structureUid?: string;
  componentUid?: string;
  payrollComponentUid?: string;
  component?: PayrollComponent;
  componentCode?: string;
  componentName?: string;
  calculationType: CalculationType;
  defaultAmount?: number;
  defaultPercentage?: number;
  formulaExpression?: string;
  slabConfigJson?: SlabTier[] | string;
  minimumAmount?: number;
  maximumAmount?: number;
  isMandatory?: boolean;
  allowEmployeeOverride?: boolean;
  displayOrder?: number;
  status?: string;
  customFields?: Record<string, unknown>;
}

export interface PayrollStructure {
  id: string;
  uid?: string;
  structureName: string;
  structureCode: string;
  description?: string;
  payrollFrequency?: PayrollFrequency;
  currencyCode?: string;
  components?: StructureComponentMapping[];
}

export interface EmployeeStructureAssignment {
  id?: string;
  uid?: string;
  employeeUid?: string;
  structureUid?: string;
  structure?: PayrollStructure;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  customFields?: Record<string, unknown>;
  customFieldsJson?: Record<string, unknown>;
}

export interface EmployeeComponentValue {
  id?: string;
  uid?: string;
  employeeUid?: string;
  employeePayrollStructureUid?: string;
  componentUid?: string;
  componentName?: string;
  componentCode?: string;
  structureComponentUid?: string;
  calculationType?: CalculationType;
  previousAmount?: number;
  previousPercentage?: number;
  overrideAmount?: number;
  overridePercentage?: number;
  formulaExpression?: string;
  slabConfigJson?: string;
  isApplicable?: boolean;
  status?: string;
  customFields?: Record<string, unknown>;
  customFieldsJson?: Record<string, unknown>;
}

export interface PayrollRun {
  id: string;
  uid?: string;
  month?: string;
  monthStr?: string;
  status?: string;
  totalPayout?: number;
  totalEmployerCost?: number;
  totalDeductions?: number;
  employeeCount?: number;
  processedAt?: string;
  customFieldsJson?: Record<string, unknown>;
}

export interface PayslipLine {
  id?: string;
  uid?: string;
  componentCode?: string;
  componentName?: string;
  componentType?: ComponentType;
  amount?: number;
  calculationType?: CalculationType;
  rate?: number;
  quantity?: number;
}

export interface Payslip {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  month?: string;
  monthStr?: string;
  netPay?: number;
  grossPay?: number;
  totalDeductions?: number;
  totalEmployerCost?: number;
  status?: string;
  generatedAt?: string;
  earnings?: Record<string, number>;
  deductions?: Record<string, number>;
  lines?: PayslipLine[];
  lineItems?: PayslipLine[];
  customFieldsJson?: Record<string, unknown>;
}

export interface PayrollCustomField {
  id: string;
  uid?: string;
  targetType: CustomFieldTarget;
  fieldKey: string;
  fieldLabel: string;
  dataType: CustomFieldDataType;
  isRequired?: boolean;
  defaultValue?: string;
}

export interface SlabTier {
  min?: number;
  max?: number;
  amount?: number;
  percentage?: number;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function asList<T extends { uid?: string; id?: string }>(res: unknown): T[] {
  if (Array.isArray(res)) return res.map((r) => withId<T>(r as Record<string, unknown>));
  const data = res && typeof res === "object" && "content" in res ? (res as { content?: unknown }).content : null;
  return Array.isArray(data) ? data.map((r) => withId<T>(r as Record<string, unknown>)) : [];
}

function asStructureComponentList(value: unknown): StructureComponentMapping[] {
  return Array.isArray(value)
    ? value.map((item) => withId<StructureComponentMapping>(item as Record<string, unknown>))
    : [];
}

function normalizePayrollStructure(value: Record<string, unknown>): PayrollStructure {
  const normalized = withId<PayrollStructure>(value);
  const rawComponents =
    value.components ??
    value.structureComponents ??
    value.payrollStructureComponents ??
    value.componentMappings ??
    value.mappings;
  return {
    ...normalized,
    components: asStructureComponentList(rawComponents),
  };
}

function uidOf(value?: { uid?: string; id?: string } | null) {
  return value?.uid || value?.id || "";
}

function normalizeEmployeeComponentValue(value: Record<string, unknown>): EmployeeComponentValue {
  const normalized = withId<EmployeeComponentValue>(value);
  return {
    ...normalized,
    employeePayrollStructureUid: (value.employeePayrollStructureUid ?? normalized.employeePayrollStructureUid) as string | undefined,
    componentUid: (value.componentUid ?? normalized.componentUid) as string | undefined,
    componentName: (value.componentName ?? normalized.componentName) as string | undefined,
    componentCode: (value.componentCode ?? normalized.componentCode) as string | undefined,
    structureComponentUid: (value.structureComponentUid ?? normalized.structureComponentUid) as string | undefined,
    calculationType: (value.calculationType ?? normalized.calculationType) as CalculationType | undefined,
    previousAmount: (value.previousAmount ?? value.defaultAmount) as number | undefined,
    previousPercentage: (value.previousPercentage ?? value.defaultPercentage) as number | undefined,
    overrideAmount: (value.overrideAmount ?? value.amount ?? normalized.overrideAmount) as number | undefined,
    overridePercentage: (value.overridePercentage ?? value.percentage ?? normalized.overridePercentage) as number | undefined,
    formulaExpression: (value.formulaExpression ?? normalized.formulaExpression) as string | undefined,
    slabConfigJson: (value.slabConfigJson ?? normalized.slabConfigJson) as string | undefined,
    isApplicable: (value.isApplicable ?? normalized.isApplicable) as boolean | undefined,
    status: (value.status ?? normalized.status) as string | undefined,
    customFields: (value.customFields ?? normalized.customFields) as Record<string, unknown> | undefined,
    customFieldsJson: (value.customFieldsJson ?? normalized.customFieldsJson) as Record<string, unknown> | undefined,
  };
}

function employeeComponentsEndpoint(employeeUid: string, structureUid: string) {
  return `${PAYROLL_ROOT}/employees/${employeeUid}/components?structureUid=${encodeURIComponent(structureUid)}`;
}

function employeeAssignmentEndpoint(employeeUid: string, assignmentUid: string) {
  return `${PAYROLL_ROOT}/employees/${employeeUid}/structures/${assignmentUid}`;
}

interface PayrollLoadOptions {
  enabled?: boolean;
}

interface PayrollCustomFieldLoadOptions extends PayrollLoadOptions {
  targetTypes?: CustomFieldTarget[];
}

function usePayrollList<T extends { uid?: string; id?: string }>(endpoint: string, options: PayrollLoadOptions = {}) {
  const enabled = options.enabled ?? true;
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<unknown>(`${PAYROLL_ROOT}${endpoint}`);
      setData(asList<T>(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, endpoint]);
  useEffect(() => { void load(); }, [load]);
  return { api, data, loading, error, reload: load, setData };
}

export function usePayrollComponents(options?: PayrollLoadOptions) {
  const { api, data, loading, error, reload } = usePayrollList<PayrollComponent>("/components", options);
  const save = useCallback(async (payload: Partial<PayrollComponent>, uid?: string) => {
    if (uid) await api.put(`${PAYROLL_ROOT}/components/${uid}`, payload);
    else await api.post(`${PAYROLL_ROOT}/components`, payload);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, save };
}

export function usePayrollStructures(options?: PayrollLoadOptions) {
  const { api, data, loading, error, reload, setData } = usePayrollList<PayrollStructure>("/structures", options);
  const loadComponents = useCallback(async (structureUid: string) => {
    if (!structureUid) return [];
    const res = await api.get<unknown>(`${PAYROLL_ROOT}/structures/${structureUid}/components`);
    const mapped = asStructureComponentList(res);
    setData((current) => current.map((structure) => (
      (structure.uid || structure.id) === structureUid
        ? { ...structure, components: mapped }
        : structure
    )));
    return mapped;
  }, [api, setData]);
  const load = useCallback(async () => {
    if (options?.enabled === false) return;
    try {
      const res = await api.get<unknown>(`${PAYROLL_ROOT}/structures`);
      setData(asList<Record<string, unknown> & { uid?: string; id?: string }>(res).map(normalizePayrollStructure));
    } catch {
      await reload();
    }
  }, [api, options?.enabled, reload, setData]);
  const save = useCallback(async (payload: Partial<PayrollStructure>, uid?: string) => {
    if (uid) await api.put(`${PAYROLL_ROOT}/structures/${uid}`, payload);
    else await api.post(`${PAYROLL_ROOT}/structures`, payload);
    await load();
  }, [api, load]);
  const addComponent = useCallback(async (structureUid: string, payload: Partial<StructureComponentMapping>) => {
    const slabConfig = payload.slabConfigJson;
    const requestBody = {
      uid: payload.uid,
      structureUid,
      componentUid: payload.componentUid || payload.payrollComponentUid,
      calculationType: payload.calculationType || "FIXED_AMOUNT",
      defaultAmount: payload.defaultAmount ?? 0,
      defaultPercentage: payload.defaultPercentage ?? 0,
      formulaExpression: payload.formulaExpression || "",
      slabConfigJson: typeof slabConfig === "string" ? slabConfig : JSON.stringify(slabConfig ?? []),
      minimumAmount: payload.minimumAmount ?? 0,
      maximumAmount: payload.maximumAmount ?? 0,
      isMandatory: payload.isMandatory ?? true,
      allowEmployeeOverride: payload.allowEmployeeOverride ?? false,
      displayOrder: payload.displayOrder ?? 0,
      status: payload.status || "Enabled",
      customFields: payload.customFields || {},
    };
    const created = await api.post<unknown>(`${PAYROLL_ROOT}/structures/${structureUid}/components`, requestBody);
    await loadComponents(structureUid);
    const optimistic = created && typeof created === "object"
      ? withId<StructureComponentMapping>(created as Record<string, unknown>)
      : withId<StructureComponentMapping>(requestBody as Record<string, unknown>);
    setData((current) => current.map((structure) => {
      if ((structure.uid || structure.id) !== structureUid) return structure;
      const existing = structure.components || [];
      const optimisticKey = optimistic.uid || optimistic.id || optimistic.componentUid;
      const alreadyPresent = optimisticKey
        ? existing.some((item) => (item.uid || item.id || item.componentUid) === optimisticKey)
        : false;
      return {
        ...structure,
        components: alreadyPresent ? existing : [...existing, optimistic],
      };
    }));
  }, [api, loadComponents, setData]);
  return { data, loading, error, reload: load, loadComponents, save, addComponent };
}

export function useEmployeePayroll(empUid: string | null, options: PayrollLoadOptions = {}) {
  const enabled = options.enabled ?? true;
  const api = useHrApi();
  const [assignment, setAssignment] = useState<EmployeeStructureAssignment | null>(null);
  const [componentValues, setComponentValues] = useState<EmployeeComponentValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setAssignment(null);
      setComponentValues([]);
      setLoading(false);
      return;
    }
    if (!empUid) {
      setAssignment(null);
      setComponentValues([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const active = await api.get<EmployeeStructureAssignment | null>(`${PAYROLL_ROOT}/employees/${empUid}/structures/active`);
      setAssignment(active);
      try {
        const structureUid = active?.structureUid || uidOf(active?.structure);
        if (!structureUid) {
          setComponentValues([]);
          return;
        }
        const values = await api.get<unknown>(employeeComponentsEndpoint(empUid, structureUid));
        setComponentValues(
          Array.isArray(values)
            ? values.map((item) => normalizeEmployeeComponentValue(item as Record<string, unknown>))
            : []
        );
      } catch {
        setComponentValues([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employee payroll");
      setAssignment(null);
      setComponentValues([]);
    } finally {
      setLoading(false);
    }
  }, [api, empUid, enabled]);

  useEffect(() => { void load(); }, [load]);

  const assignStructure = useCallback(async (payload: Partial<EmployeeStructureAssignment>) => {
    if (!empUid) return;
    const assignmentUid = payload.uid || assignment?.uid || assignment?.id;
    const requestBody = {
      uid: assignmentUid || payload.uid,
      employeeUid: empUid,
      structureUid: payload.structureUid,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo || null,
      status: payload.status || "Enabled",
      customFields: payload.customFields || payload.customFieldsJson || {},
    };
    if (assignmentUid) {
      await api.put(employeeAssignmentEndpoint(empUid, assignmentUid), requestBody);
    } else {
      await api.post(`${PAYROLL_ROOT}/employees/${empUid}/structures`, requestBody);
    }
    await load();
  }, [api, assignment, empUid, load]);

  const saveComponentValues = useCallback(async (payload: EmployeeComponentValue[]) => {
    if (!empUid) return;
    const structureUid = assignment?.structureUid || uidOf(assignment?.structure);
    if (!structureUid) throw new Error("Assign an active payroll structure before saving component overrides.");
    const assignmentUid = assignment?.uid || assignment?.id;
    const currentValues = componentValues.reduce<Record<string, EmployeeComponentValue>>((acc, item) => {
      const key = item.structureComponentUid || item.componentUid || item.uid || item.id;
      if (key) acc[key] = item;
      return acc;
    }, {});
    const nextValues = payload.reduce<Record<string, EmployeeComponentValue>>((acc, item) => {
      const key = item.structureComponentUid || item.componentUid || item.uid || item.id;
      if (!key) return acc;
      acc[key] = { ...(acc[key] || {}), ...item };
      return acc;
    }, { ...currentValues });
    const componentsPayload = Object.values(nextValues).map((item) => ({
      uid: item.uid || item.id || item.structureComponentUid || item.componentUid,
      employeePayrollStructureUid: item.employeePayrollStructureUid || assignmentUid,
      employeeUid: empUid,
      structureComponentUid: item.structureComponentUid,
      componentUid: item.componentUid,
      componentName: item.componentName,
      componentCode: item.componentCode,
      calculationType: item.calculationType,
      amount: item.overrideAmount ?? 0,
      percentage: item.overridePercentage ?? 0,
      formulaExpression: item.formulaExpression || "",
      slabConfigJson: item.slabConfigJson || "[]",
      isApplicable: item.isApplicable ?? true,
      status: item.status || "Enabled",
      customFields: item.customFields || item.customFieldsJson || {},
    }));
    if (assignmentUid) {
      await api.put(employeeAssignmentEndpoint(empUid, assignmentUid), {
        uid: assignmentUid,
        employeeUid: empUid,
        structureUid,
        effectiveFrom: assignment?.effectiveFrom,
        effectiveTo: assignment?.effectiveTo || null,
        status: assignment?.status || "Enabled",
        customFields: assignment?.customFields || assignment?.customFieldsJson || {},
        components: componentsPayload,
      });
    } else {
      await api.post(employeeComponentsEndpoint(empUid, structureUid), componentsPayload);
    }
    await load();
  }, [api, assignment, componentValues, empUid, load]);

  return { assignment, componentValues, loading, error, reload: load, assignStructure, saveComponentValues };
}

export function usePayslips(options?: PayrollLoadOptions) {
  const { data, loading, error, reload } = usePayrollList<Payslip>("/payslips/all", options);
  return { data, loading, error, reload };
}

export function usePayrollRuns(options?: PayrollLoadOptions) {
  const { api, data, loading, error, reload } = usePayrollList<PayrollRun>("/runs/all", options);
  const processRun = useCallback(async (month: string, recompute = false) => {
    try {
      const params = new URLSearchParams({
        month,
        recompute: String(recompute),
      });
      const run = await api.post<PayrollRun>(`${PAYROLL_ROOT}/runs/process?${params.toString()}`);
      await reload();
      return run;
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (err.status === 409) throw new Error("This payroll month is already processing or finalized.");
      if (err.status === 422 || err.code === "PAYROLL_RATE_MISSING") {
        throw new Error("Payroll cannot run because a daily wage or hourly employee is missing a daily or hourly rate.");
      }
      throw e;
    }
  }, [api, reload]);
  return { data, loading, error, reload, processRun };
}

export function usePayrollCustomFields(options: PayrollCustomFieldLoadOptions = {}) {
  const enabled = options.enabled ?? true;
  const targetTypes = options.targetTypes ?? PAYROLL_CUSTOM_FIELD_TARGETS;
  const api = useHrApi();
  const [data, setData] = useState<PayrollCustomField[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const grouped: PayrollCustomField[][] = [];
      for (const targetType of targetTypes) {
        const res = await api.get<unknown>(`${PAYROLL_ROOT}/custom-fields?targetType=${encodeURIComponent(targetType)}`);
        grouped.push(asList<PayrollCustomField>(res));
      }
      setData(grouped.flat());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load custom fields");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, targetTypes]);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(async (payload: Partial<PayrollCustomField>) => {
    const targetType = payload.targetType || "EMPLOYEE_PAYROLL_STRUCTURE";
    await api.post(`${PAYROLL_ROOT}/custom-fields?targetType=${encodeURIComponent(targetType)}`, {
      ...payload,
      targetType,
    });
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, save };
}
