import type { LucideIcon } from "lucide-react";
import { Settings2, Layers3, UserCog, ReceiptText } from "lucide-react";
import type {
  CalculationType,
  ComponentCategory,
  ComponentType,
  EmployeeComponentValue,
  PayrollComponent,
  PayrollCalculationBase,
  PayrollStructure,
  Payslip,
  SlabTier,
  StructureComponentMapping,
} from "../../services/usePayrollData";
import { formatCurrency } from "../../lib/utils";

export type Tab = "components" | "structures" | "employees" | "payslips";
export type ViewMode = "table" | "cards";

export const PAYROLL_ROUTES: Array<{ key: Tab; route: string; label: string; Icon: LucideIcon }> = [
  { key: "components", route: "components", label: "Components", Icon: Settings2 },
  { key: "structures", route: "structures", label: "Structures", Icon: Layers3 },
  { key: "employees", route: "employees", label: "Employees", Icon: UserCog },
  { key: "payslips", route: "payslips", label: "Payslips", Icon: ReceiptText },
];

export const COMPONENT_TYPES: ComponentType[] = ["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION"];
export const CATEGORIES: ComponentCategory[] = [
  "BASIC",
  "HRA",
  "ALLOWANCE",
  "BONUS",
  "OVERTIME",
  "ARREARS",
  "REIMBURSEMENT",
  "PF",
  "ESI",
  "LOP",
  "TDS",
  "PROFESSIONAL_TAX",
  "LWF",
  "GRATUITY",
  "LOAN",
  "ADVANCE",
  "MEDICLAIM",
  "CUSTOM",
];
export const CALC_TYPES: CalculationType[] = ["FIXED_AMOUNT", "PERCENTAGE", "FORMULA", "SLAB_BASED"];

export const emptyComponent: Partial<PayrollComponent> = {
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

export const emptyStructure: Partial<PayrollStructure> = {
  structureName: "",
  structureCode: "",
  description: "",
  payrollFrequency: "MONTHLY",
  currencyCode: "INR",
};

export const emptyMapping: Partial<StructureComponentMapping> = {
  componentUid: "",
  calculationType: "FIXED_AMOUNT",
  defaultAmount: undefined,
  defaultPercentage: undefined,
  calculationBase: "GROSS",
  baseComponentCode: "",
  formulaExpression: "",
  slabConfigJson: [],
  isMandatory: true,
  allowEmployeeOverride: false,
  isEsiEligible: true,
  isPfEligible: true,
};

export const money = (value?: number) => formatCurrency(value ?? 0);
export const labelize = (value?: string) => (value ? value.replaceAll("_", " ") : "-");

export type {
  CalculationType,
  ComponentCategory,
  ComponentType,
  EmployeeComponentValue,
  PayrollComponent,
  PayrollCalculationBase,
  PayrollStructure,
  Payslip,
  SlabTier,
  StructureComponentMapping,
};
