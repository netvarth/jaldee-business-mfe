import { Button, Dialog, Select } from "@jaldee/design-system";
import {
  CALC_TYPES,
  CATEGORIES,
  COMPONENT_TYPES,
  labelize,
  type CalculationType,
  type ComponentCategory,
  type ComponentType,
  type PayrollCalculationBase,
  type PayrollComponent,
  type PayrollStructure,
  type SlabTier,
  type StructureComponentMapping,
} from "./payrollTypes";
import {
  DialogActions,
  DialogHeader,
  SlabBuilder,
  TextAreaField,
  TextField,
  ToggleRow,
  dialogBody,
} from "./PayrollComponents";

export function ComponentDialog({
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
  const normalizeCode = (val: string) => val.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="max-w-[720px] p-0 overflow-hidden" testId="hr-payroll-component-modal">
      <DialogHeader title="Payroll Component" onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField id="hr-payroll-component-name" data-testid="hr-payroll-component-name" label="Component Name" required value={form.componentName} onChange={(v) => onChange({ ...form, componentName: v })} />
          <TextField id="hr-payroll-component-code" data-testid="hr-payroll-component-code" label="Component Code" required value={form.componentCode} onChange={(v) => onChange({ ...form, componentCode: normalizeCode(v) })} />
          <Select id="hr-payroll-component-type" data-testid="hr-payroll-component-type" label="Type" value={form.componentType} onChange={(e) => onChange({ ...form, componentType: e.target.value as ComponentType })} options={COMPONENT_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
          <Select id="hr-payroll-component-category" data-testid="hr-payroll-component-category" label="Category" value={form.componentCategory} onChange={(e) => onChange({ ...form, componentCategory: e.target.value as ComponentCategory })} options={CATEGORIES.map((v) => ({ value: v, label: labelize(v) }))} />
          <Select id="hr-payroll-component-calc-type" data-testid="hr-payroll-component-calc-type" label="Calculation Type" value={form.calculationType} onChange={(e) => onChange({ ...form, calculationType: e.target.value as CalculationType })} options={CALC_TYPES.map((v) => ({ value: v, label: labelize(v) }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ marginTop: 18 }}>
          {(["isStatutory", "isTaxable", "affectsGrossPay", "affectsNetPay", "affectsCtc", "visibleInPayslip"] as const).map((key) => (
            <ToggleRow key={key} testId={`hr-payroll-component-flag-${key}`} label={labelize(key)} checked={!!form[key]} onChange={(checked) => onChange({ ...form, [key]: checked })} />
          ))}
        </div>
      </div>
      <DialogActions saveTestId="hr-payroll-component-save" busy={busy} onClose={onClose} onSave={onSave} />
    </Dialog>
  );
}

export function StructureDialog({
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
  const normalizeCode = (val: string) => val.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  return (
    <Dialog open={open} onClose={onClose} hideHeader contentClassName="max-w-[640px] p-0 overflow-hidden" testId="hr-payroll-structure-modal">
      <DialogHeader title="Payroll Structure" onClose={onClose} />
      <div style={dialogBody}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField id="hr-payroll-structure-name" testId="hr-payroll-structure-name" label="Structure Name" required value={form.structureName} onChange={(v) => onChange({ ...form, structureName: v })} />
          <TextField id="hr-payroll-structure-code" testId="hr-payroll-structure-code" label="Structure Code" required value={form.structureCode} onChange={(v) => onChange({ ...form, structureCode: normalizeCode(v) })} />
          <Select id="hr-payroll-structure-frequency" testId="hr-payroll-structure-frequency" label="Frequency" value={form.payrollFrequency || "MONTHLY"} onChange={(e) => onChange({ ...form, payrollFrequency: e.target.value as PayrollStructure["payrollFrequency"] })} options={["MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY"].map((v) => ({ value: v, label: labelize(v) }))} />
          <TextField id="hr-payroll-structure-currency" testId="hr-payroll-structure-currency" label="Currency" value={form.currencyCode} onChange={(v) => onChange({ ...form, currencyCode: v.toUpperCase() })} />
        </div>
        <div style={{ marginTop: 14 }}>
          <TextAreaField id="hr-payroll-structure-description" testId="hr-payroll-structure-description" label="Description" value={form.description} onChange={(v) => onChange({ ...form, description: v })} />
        </div>
      </div>
      <DialogActions saveTestId="hr-payroll-structure-save" busy={busy} onClose={onClose} onSave={onSave} />
    </Dialog>
  );
}

export function StructureBuilderDialog({
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
  const isEditing = Boolean(form.uid || form.id);
  const uidOf = (record: { uid?: string; id?: string }) => record?.uid || record?.id || "";
  const numericOrUndefined = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return isNaN(n) ? undefined : n;
  };

  return (
    <Dialog open={open} onClose={onClose} hideHeader testId="hr-payroll-structure-builder-modal" contentClassName="w-[calc(100vw-1.5rem)] max-w-[760px] p-0 overflow-hidden">
      <DialogHeader title={`${isEditing ? "Update Component" : "Add Component"}${selectedStructure?.structureName ? ` - ${selectedStructure.structureName}` : ""}`} onClose={onClose} />
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
              id="hr-payroll-structure-builder-default-amount"
              testId="hr-payroll-structure-builder-default-amount"
              label="Default Amount"
              type="number"
              value={form.defaultAmount ?? ""}
              onChange={(value) => onChange({ ...form, defaultAmount: numericOrUndefined(value) })}
            />
          )}
          {form.calculationType === "PERCENTAGE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Default Percentage"
                type="number"
                value={form.defaultPercentage ?? ""}
                onChange={(value) => onChange({ ...form, defaultPercentage: numericOrUndefined(value) })}
              />
              <Select
                id="hr-payroll-structure-builder-calculation-base"
                testId="hr-payroll-structure-builder-calculation-base"
                label="Calculation Base"
                value={form.calculationBase || "GROSS"}
                onChange={(e) => onChange({ ...form, calculationBase: e.target.value as PayrollCalculationBase })}
                options={[
                  { value: "GROSS", label: "Gross" },
                  { value: "BASIC", label: "Basic" },
                  { value: "COMPONENT", label: "Component" },
                ]}
              />
              {form.calculationBase === "COMPONENT" && (
                <Select
                  id="hr-payroll-structure-builder-base-component"
                  testId="hr-payroll-structure-builder-base-component"
                  label="Base Component"
                  value={form.baseComponentCode || ""}
                  onChange={(e) => onChange({ ...form, baseComponentCode: e.target.value })}
                  options={(selectedStructure?.components || [])
                    .filter((mapping) => (mapping.componentUid || mapping.payrollComponentUid) !== form.componentUid)
                    .map((mapping) => ({
                      value: mapping.componentCode || mapping.component?.componentCode || "",
                      label: mapping.componentName || mapping.component?.componentName || mapping.componentCode || "Component",
                    }))
                    .filter((option) => option.value)}
                />
              )}
            </div>
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
            <ToggleRow testId="hr-payroll-structure-builder-employee-override" label="Employee Override" checked={form.allowEmployeeOverride} onChange={(value) => onChange({ ...form, allowEmployeeOverride: value })} />
            <ToggleRow testId="hr-payroll-structure-builder-pf-eligible" label="Include in PF Base" checked={form.isPfEligible ?? true} onChange={(value) => onChange({ ...form, isPfEligible: value })} />
            <ToggleRow label="ESI Eligible" checked={form.isEsiEligible ?? true} onChange={(value) => onChange({ ...form, isEsiEligible: value })} />
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex justify-end gap-3 border-t border-[var(--color-border)]">
        <Button id="hr-payroll-structure-builder-cancel" data-testid="hr-payroll-structure-builder-cancel" variant="outline" size="md" onClick={onClose}>Cancel</Button>
        <Button id="hr-payroll-structure-add-component" data-testid="hr-payroll-structure-add-component" variant="primary" size="md" loading={busy} onClick={onSave}>{isEditing ? "Update Component" : "Add Component"}</Button>
      </div>
    </Dialog>
  );
}
