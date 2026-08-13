import { useEffect, useMemo, useState, lazy, Suspense, type CSSProperties } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));
import {
  ArrowLeft, Mail, Phone, Building2, ShieldCheck, CreditCard, Briefcase, UserCircle2,
  FileText, ScanFace, Loader2, AlertCircle, Save, X, Pencil, History, BarChart3, Clock,
  Download, Trash2, Plus, ChevronDown, MoreVertical, LayoutGrid, Table as Rows3, Filter,
  KeyRound, CalendarDays, Wallet, Home, MoreHorizontal,
} from "lucide-react";
import { Button, Combobox, Select, DatePicker, PhoneInput, Popover, Dialog, DialogFooter, Drawer, DataTablePagination, Input, FileUpload } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import type { PhoneInputValue } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { PayslipStatementDialog } from "../../components/PayslipStatementDialog";
import { useEmployee } from "../../services/useEmployee";
import { useEmployees } from "../../services/useEmployees";
import { usePagedDepartments, usePagedDesignations } from "../../services/usePagedSettingsOptions";
import { useHrApi } from "../../services/useHrApi";
import { useAttendance } from "../../services/useAttendanceData";
import { useLeaves } from "../../services/useLeaveData";
import { useEmployeePayroll, usePayrollStructures, usePayslips, type EmployeeComponentValue, type Payslip, type StructureComponentMapping } from "../../services/usePayrollData";
import { DOC_REQUEST_STATUSES, useDocumentRequests, type DocumentRequest } from "../../services/useDocumentRequests";
import { useDocumentRequestSearchSchema } from "../../services/useHrSearchSchema";
import { useTelemetry } from "../../services/useTelemetry";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { Employee } from "../../types";
import "./employees.css";

type Tab = "overview" | "attendance" | "leaves" | "payroll" | "documents";
type CollectionView = "table" | "cards";
const EMPLOYEE_TABS: Tab[] = ["overview", "attendance", "leaves", "payroll", "documents"];
const MAIN_EMPLOYEE_TABS: Tab[] = ["overview", "attendance", "leaves", "payroll"];
const EMPLOYEE_TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  attendance: "Attendance",
  leaves: "Leaves",
  payroll: "Payroll",
  documents: "Documents",
};

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, boxShadow: "var(--shadow-sm)" };
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)" };
const val: CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--dark-text)" };
const th: CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)" };
const td: CSSProperties = { padding: "12px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none";
const loginIdPattern = /^[A-Za-z0-9@_.]{5,45}$/;

function sanitizeLoginId(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return loginIdPattern.test(trimmed) ? trimmed : "";
}

function initial(n?: string) { return n?.charAt(0)?.toUpperCase() || "?"; }
function toPhoneInputValue(value?: string | null): PhoneInputValue {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^(\+\d{1,3})(\d+)$/);
  return match
    ? { countryCode: match[1], number: match[2], e164Number: normalized }
    : { countryCode: "+91", number: normalized.replace(/\D/g, ""), e164Number: "" };
}
function fmtTime(iso?: string) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

const DEDUCTION_COMPONENTS = new Set(["PF", "ESI", "TDS", "PROFESSIONAL_TAX", "LWF", "LOAN", "ADVANCE", "MEDICLAIM"]);
function isDeductionComponent(component: EmployeeComponentValue) {
  return DEDUCTION_COMPONENTS.has(String(component.componentCategory || component.componentCode || "").toUpperCase());
}
function componentValueKey(component: EmployeeComponentValue) {
  return component.uid || component.id || component.structureComponentUid || component.componentUid || component.componentCode || component.componentName;
}

function employeeTabFromPath(pathname: string): Tab {
  const segments = pathname.split("/").filter(Boolean);
  const employeesIndex = segments.lastIndexOf("employees");
  const candidate = employeesIndex >= 0 ? segments[employeesIndex + 2] : undefined;
  return EMPLOYEE_TABS.includes(candidate as Tab) ? candidate as Tab : "overview";
}

function employeeTabHref(id: string, tab: Tab, suffix = "") {
  return `/employees/${id}/${tab}${suffix}`;
}

function getPreferredCollectionView() {
  if (typeof window === "undefined") return "table" as CollectionView;
  return window.matchMedia("(max-width: 1024px)").matches ? "cards" : "table";
}

function Panel({ icon, title, sub, action, children, full, actionBelow }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; full?: boolean; actionBelow?: boolean }) {
  return (
    <div className="employee-details-panel" style={{ ...card, padding: 24, gridColumn: full ? "1 / -1" : undefined }}>
      <div className={`employee-details-panel-header${actionBelow ? " employee-details-panel-header--action-below" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="employee-details-panel-heading" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--dark-text)" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, fontWeight: 500, color: "var(--light-text)" }}>{sub}</div>}
          </div>
        </div>
        {action && <div className="employee-details-panel-action">{action}</div>}
      </div>
      {children}
    </div>
  );
}
function Field({ k, v, mono }: { k: string; v?: React.ReactNode; mono?: boolean }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lbl}>{k}</span><span style={{ ...val, fontFamily: mono ? "monospace" : undefined }}>{v || "—"}</span></div>;
}
function InfoTile({ icon, k, v }: { icon: React.ReactNode; k: string; v?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(100,116,139,0.06)", minWidth: 0 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)", boxShadow: "var(--shadow-sm)", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}><div style={{ ...lbl, fontSize: 8 }}>{k}</div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v || "—"}</div></div>
    </div>
  );
}
function StatCard({ l, t, v, u, active }: { l: string; t: string; v: string; u: string; active?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 160, flex: 1, padding: 16, borderRadius: 16, background: active ? "var(--dark-bg)" : "var(--surface-bg)", border: active ? "none" : "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "rgba(255,255,255,0.5)" : "var(--light-text)" }}>{l}</span>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: active ? "rgba(255,255,255,0.6)" : "var(--light-text)", marginBottom: 6 }}>{t}</span>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: active ? "white" : "var(--dark-text)", marginBottom: 8 }}>{v}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 6, width: "fit-content", fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: active ? "rgba(255,255,255,0.1)" : "var(--primary-light)", color: active ? "white" : "var(--primary-color)" }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: "#3b82f6" }} />{u}</div>
    </div>
  );
}
function StatusPill({ s }: { s?: string }) {
  const k = (s || "").toLowerCase();
  const ok = k.includes("present") || k === "approved" || k === "paid";
  const warn = k.includes("pending");
  const bg = ok ? "var(--success-bg)" : warn ? "var(--warning-bg)" : "rgba(100,116,139,0.12)";
  const col = ok ? "var(--success-color)" : warn ? "var(--warning-color)" : "var(--light-text)";
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: bg, color: col }}>{s || "—"}</span>;
}

function CollectionViewToggle({ value, onChange }: { value: CollectionView; onChange: (value: CollectionView) => void }) {
  return (
    <div data-view-toggle="table-card" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, gap: 2, padding: 2, height: 40, boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <button
        type="button"
        data-active={value === "table"}
        onClick={() => onChange("table")}
        aria-label="Table view"
        style={{ width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: value === "table" ? "var(--color-primary)" : "transparent", color: value === "table" ? "#fff" : "var(--color-text-secondary)" }}
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        data-active={value === "cards"}
        onClick={() => onChange("cards")}
        aria-label="Card view"
        style={{ width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", background: value === "cards" ? "var(--color-primary)" : "transparent", color: value === "cards" ? "#fff" : "var(--color-text-secondary)" }}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function LegacyPayslipStatementDialog({ payslip, onClose }: { payslip: Payslip | null; onClose: () => void }) {
  const lines = payslip?.lines || payslip?.lineItems || [];
  return (
    <Dialog open={!!payslip} onClose={onClose} hideHeader contentClassName="max-w-[760px] p-0 overflow-hidden">
      {payslip ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border-color)" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dark-text)" }}>Payslip Statement</div>
              <div style={{ fontSize: 12, color: "var(--light-text)" }}>{payslip.monthStr || payslip.month || "-"}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ padding: 22, display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <div style={lbl}>Gross</div>
                <div style={{ ...val, fontSize: 16 }}>{formatCurrency(payslip.grossPay ?? 0)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <div style={lbl}>Deductions</div>
                <div style={{ ...val, fontSize: 16 }}>{formatCurrency(payslip.totalDeductions ?? 0)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <div style={lbl}>Net Pay</div>
                <div style={{ ...val, fontSize: 16 }}>{formatCurrency(payslip.netPay ?? 0)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <div style={lbl}>Generated</div>
                <div style={{ ...val, fontSize: 16 }}>{formatDate(payslip.generatedAt)}</div>
              </div>
            </div>
            <div>
              <div style={{ ...lbl, marginBottom: 10 }}>Line Items</div>
              {lines.length === 0 ? (
                <div style={{ padding: "18px 0", color: "var(--light-text)", textAlign: "center" }}>No detailed line items returned.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Component</th>
                      <th style={th}>Type</th>
                      <th style={th}>Calculation</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={line.uid || line.id || index}>
                        <td style={{ ...td, fontWeight: 700 }}>{line.componentName || line.componentCode || "—"}</td>
                        <td style={td}>{line.componentType || "—"}</td>
                        <td style={td}>{line.calculationType || "—"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{formatCurrency(line.amount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const profileNavigationState = routeLocation.state as {
    employeeProfileReturnTo?: string;
    employeeProfileReturnLabel?: string;
  } | null;
  const employeeProfileReturnTo = profileNavigationState?.employeeProfileReturnTo || "/employees";
  const employeeProfileReturnLabel = profileNavigationState?.employeeProfileReturnLabel || "Employees";
  const { location: activeLocation, eventBus } = useMFEProps();
  const api = useHrApi();
  const isEditing = new URLSearchParams(routeLocation.search).get("edit") === "true";
  const tab = useMemo(() => employeeTabFromPath(routeLocation.pathname), [routeLocation.pathname]);
  const { data: employee, loading, error, reload } = useEmployee(id);
  const { data: allEmployees } = useEmployees({ enabled: tab === "overview" || isEditing });
  const designationOptions = usePagedDesignations({ enabled: isEditing });
  const departmentOptions = usePagedDepartments({ enabled: isEditing });
  const designations = designationOptions.data;
  const departments = departmentOptions.data;
  const { trackEvent, captureError } = useTelemetry();
  console.log("[EmployeeDetails] designations data:", designations, "departments data:", departments);
  const { data: allAttendance } = useAttendance(undefined, null, { enabled: tab === "attendance" });
  const { data: allLeaves } = useLeaves({ enabled: tab === "leaves" });
  const { data: allPayslips } = usePayslips({ enabled: tab === "payroll" });
  const employeePayroll = useEmployeePayroll(employee?.uid || employee?.id || id || null, { enabled: tab === "payroll" });
  const payrollStructures = usePayrollStructures({ enabled: tab === "payroll" });
  const [editTab, setEditTab] = useState<"personal" | "employment" | "bank">("personal");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [credentials, setCredentials] = useState({
    loginId: "",
    password: "",
    confirmPassword: "",
  });
  const [contactNumber, setContactNumber] = useState<PhoneInputValue>({
    countryCode: "+91",
    number: "",
    e164Number: "",
  });
  const [viewPayslip, setViewPayslip] = useState<Payslip | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentStatusDialogOpen, setDocumentStatusDialogOpen] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedDocumentRequest, setSelectedDocumentRequest] = useState<DocumentRequest | null>(null);
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState<DocumentRequest | null>(null);
  const [documentForm, setDocumentForm] = useState({ documentType: "", status: "REQUESTED" });
  const [documentStatusForm, setDocumentStatusForm] = useState({ status: "REQUESTED" });
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentStatusFiles, setDocumentStatusFiles] = useState<File[]>([]);
  const [documentFilters, setDocumentFilters] = useState<SearchFilterClause[]>([]);
  const [documentDraftFilters, setDocumentDraftFilters] = useState<SearchFilterClause[]>([]);
  const [documentFiltersOpen, setDocumentFiltersOpen] = useState(false);
  const [documentPage, setDocumentPage] = useState(1);
  const [documentPageSize, setDocumentPageSize] = useState(20);
  const [attendanceViewMode, setAttendanceViewMode] = useState<CollectionView>(() => getPreferredCollectionView());
  const [leaveViewMode, setLeaveViewMode] = useState<CollectionView>(() => getPreferredCollectionView());
  const [payslipViewMode, setPayslipViewMode] = useState<CollectionView>(() => getPreferredCollectionView());
  const [documentViewMode, setDocumentViewMode] = useState<CollectionView>(() => getPreferredCollectionView());
  const [employeeMoreOpen, setEmployeeMoreOpen] = useState(false);
  const { schema: documentSearchSchema, loading: documentSchemaLoading } = useDocumentRequestSearchSchema(tab === "documents");
  const documents = useDocumentRequests(employee?.id, documentFilters, documentSearchSchema, { enabled: tab === "documents" && !documentSchemaLoading, page: documentPage - 1, pageSize: documentPageSize });
  const documentAppliedFilterCount = useMemo(
    () => compactSearchClauses(documentFilters, documentSearchSchema).length,
    [documentFilters, documentSearchSchema]
  );
  const openDocumentFilters = () => {
    setDocumentDraftFilters(documentFilters.length ? documentFilters : buildDefaultSearchClauses(documentSearchSchema));
    setDocumentFiltersOpen(true);
  };
  const clearDocumentFilters = () => {
    const reset = buildDefaultSearchClauses(documentSearchSchema);
    setDocumentDraftFilters(reset);
    setDocumentFilters(reset);
    setDocumentPage(1);
  };
  const applyDocumentFilters = () => {
    setDocumentFilters(documentDraftFilters);
    setDocumentPage(1);
    setDocumentFiltersOpen(false);
  };

  useEffect(() => {
    if (!id) return;
    const segments = routeLocation.pathname.split("/").filter(Boolean);
    const employeesIndex = segments.lastIndexOf("employees");
    const hasTabSegment = employeesIndex >= 0 && segments.length > employeesIndex + 2;
    if (!hasTabSegment) {
      navigate(`/employees/${id}/overview${routeLocation.search}`, {
        replace: true,
        state: routeLocation.state,
      });
    }
  }, [id, navigate, routeLocation.pathname, routeLocation.search, routeLocation.state]);

  useEffect(() => {
    if (employee) {
      setForm({
      name: employee.name, email: employee.email,
      gender: employee.gender, dob: employee.dob, doj: employee.doj, department: employee.department,
      designation: employee.designation, status: employee.status, employmentType: employee.employmentType,
      reportingManagerUid: employee.reportingManagerUid ?? undefined,
      pan: employee.pan ?? undefined,
      uan: employee.uan ?? undefined,
      esicNumber: employee.esicNumber ?? undefined,
      pfAccountNo: employee.pfAccountNo ?? undefined,
      aadhaarRef: employee.aadhaarRef ?? undefined,
      bankDetails: employee.bankDetails ?? { accountNumber: "", bankName: "", ifscCode: "" },
      salaryStructure: employee.salaryStructure ?? {},
      });
      setContactNumber(toPhoneInputValue(employee.contactNumber));
    }
  }, [employee]);

  useEffect(() => {
    if (!loginDialogOpen || !employee?.id) return;

    setCredentials({
      loginId: employee.employeeId,
      password: "",
      confirmPassword: "",
    });
    setLoginError(null);
  }, [employee, loginDialogOpen]);

  useEffect(() => {
    if (!documentDialogOpen) {
      setDocumentForm({ documentType: "", status: "REQUESTED" });
      setDocumentFiles([]);
      setDocumentError(null);
    }
  }, [documentDialogOpen]);

  useEffect(() => {
    if (!documentStatusDialogOpen) {
      setSelectedDocumentRequest(null);
      setDocumentStatusForm({ status: "REQUESTED" });
      setDocumentStatusFiles([]);
      setDocumentError(null);
    }
  }, [documentStatusDialogOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1024px)");
    const syncCollectionView = () => {
      const nextMode: CollectionView = media.matches ? "cards" : "table";
      setAttendanceViewMode(nextMode);
      setLeaveViewMode(nextMode);
      setPayslipViewMode(nextMode);
      setDocumentViewMode(nextMode);
    };
    syncCollectionView();
    media.addEventListener("change", syncCollectionView);
    return () => media.removeEventListener("change", syncCollectionView);
  }, []);

  const managerName = useMemo(() => allEmployees.find((e) => e.id === employee?.reportingManagerUid)?.name, [employee, allEmployees]);
  const myAttendance = useMemo(() => allAttendance.filter((a) => a.employeeUid === employee?.id), [allAttendance, employee]);
  const myLeaves = useMemo(() => allLeaves.filter((l) => l.employeeUid === employee?.id), [allLeaves, employee]);
  const myPayslips = useMemo(() => {
    const employeeKeys = new Set([employee?.id, employee?.uid].filter(Boolean));
    return allPayslips
      .filter((p) => !!p.employeeUid && employeeKeys.has(p.employeeUid))
      .sort((left, right) => String(right.generatedAt || right.monthStr || right.month || "").localeCompare(String(left.generatedAt || left.monthStr || left.month || "")));
  }, [allPayslips, employee?.id, employee?.uid]);
  const assignedStructureUid = employeePayroll.assignment?.structureUid || employeePayroll.assignment?.structure?.uid || employeePayroll.assignment?.structure?.id || "";
  const assignedStructure = payrollStructures.data.find((structure) => (structure.uid || structure.id) === assignedStructureUid) || employeePayroll.assignment?.structure;
  useEffect(() => {
    if (tab !== "payroll" || !assignedStructureUid) return;
    void payrollStructures.loadComponents(assignedStructureUid);
  }, [assignedStructureUid, payrollStructures.loadComponents, tab]);
  const assignedSalaryComponents = useMemo(() => {
    const values = employeePayroll.componentValues;
    const mappings = assignedStructure?.components || [];
    const mappingFor = (value: EmployeeComponentValue) => mappings.find((mapping) =>
      (value.structureComponentUid && value.structureComponentUid === (mapping.uid || mapping.id)) ||
      (value.componentUid && (value.componentUid === mapping.componentUid || value.componentUid === mapping.payrollComponentUid))
    );
    const toRow = (value: EmployeeComponentValue, mapping?: StructureComponentMapping) => {
      const assignedAmount = value.overrideAmount || value.previousAmount || mapping?.defaultAmount;
      const assignedPercentage = value.overridePercentage || value.previousPercentage || mapping?.defaultPercentage;
      const calculationType = value.calculationType || mapping?.calculationType;
      return {
        ...value,
        componentUid: value.componentUid || mapping?.componentUid || mapping?.payrollComponentUid,
        componentName: value.componentName || mapping?.componentName || mapping?.component?.componentName,
        componentCode: value.componentCode || mapping?.componentCode || mapping?.component?.componentCode,
        componentType: value.componentType || mapping?.component?.componentType,
        componentCategory: value.componentCategory || mapping?.component?.componentCategory,
        calculationType,
        amount: assignedAmount,
        displayValue: calculationType === "PERCENTAGE" && assignedPercentage != null
          ? `${assignedPercentage}%`
          : assignedAmount != null ? formatCurrency(assignedAmount) : "—",
      };
    };
    const rows = values.map((value) => toRow(value, mappingFor(value)));
    mappings.forEach((mapping) => {
      if (!rows.some((row) => row.componentUid === (mapping.componentUid || mapping.payrollComponentUid))) rows.push(toRow({}, mapping));
    });
    return rows;
  }, [assignedStructure?.components, employeePayroll.componentValues]);
  const assignedEarnings = useMemo(() => assignedSalaryComponents.filter((component) => component.componentType === "EARNING" || (!component.componentType && !isDeductionComponent(component))), [assignedSalaryComponents]);
  const assignedDeductions = useMemo(() => assignedSalaryComponents.filter((component) => component.componentType === "DEDUCTION" || (!component.componentType && isDeductionComponent(component))), [assignedSalaryComponents]);
  const documentRows = useMemo(() => [...documents.data].sort((a, b) => {
    const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return left - right;
  }), [documents.data]);
  const employeeTabHref = (employeeId: string, nextTab: Tab, search = "") => `/employees/${employeeId}/${nextTab}${search}`;

  // weekly attendance buckets (last 4 weeks) — must stay above any early return (Rules of Hooks)
  const weeks = useMemo(() => {
    const out: { label: string; range: string; days: number; hours: number }[] = [];
    for (let w = 0; w < 4; w++) {
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const inRange = myAttendance.filter((a) => { if (!a.dateStr) return false; const d = new Date(a.dateStr); return d >= start && d <= end; });
      out.push({
        label: `WEEK ${w + 1}`,
        range: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        days: inRange.filter((a) => a.clockIn).length,
        hours: Math.round(inRange.reduce((t, a) => t + (a.workedHours ?? 0), 0)),
      });
    }
    return out;
  }, [myAttendance]);

  const setF = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const saveDocument = async () => {
    if (!employee?.id) return;
    if (!documentForm.documentType.trim()) {
      setDocumentError("Document type is required.");
      return;
    }
    if (documentForm.status === "SUBMITTED" && !documentFiles[0]) {
      setDocumentError("Upload a file before marking the document as submitted.");
      return;
    }
    setDocumentSaving(true);
    setDocumentError(null);
    try {
      const attachment = documentForm.status === "SUBMITTED" && documentFiles[0]
        ? await documents.uploadFile(employee.id, documentFiles[0])
        : undefined;
      await documents.create({
        employeeUid: employee.id,
        documentType: documentForm.documentType.trim(),
        status: documentForm.status,
        attachment,
      });
      setDocumentDialogOpen(false);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Unable to save document.");
    } finally {
      setDocumentSaving(false);
    }
  };
  const removeDocument = async (doc: DocumentRequest) => {
    const uid = doc.uid ?? doc.id;
    if (!uid) return;
    setDocumentSaving(true);
    setDocumentError(null);
    try {
      await documents.remove(uid);
      setDocumentDeleteTarget(null);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Unable to delete document.");
    } finally {
      setDocumentSaving(false);
    }
  };
  const downloadDocument = async (doc: DocumentRequest) => {
    const filePath = doc.attachment?.filePath || doc.documentUrl;
    if (!filePath) return;
    setDocumentError(null);
    try {
      const downloadUrl = await documents.resolveDocumentUrl(filePath);
      if (!downloadUrl) throw new Error("Document download URL is unavailable.");
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Unable to download document.");
    }
  };
  const openDocumentStatusDialog = (doc: DocumentRequest) => {
    setSelectedDocumentRequest(doc);
    setDocumentStatusForm({ status: doc.status || "REQUESTED" });
    setDocumentError(null);
    setDocumentStatusDialogOpen(true);
  };
  const updateDocumentStatus = async () => {
    const uid = selectedDocumentRequest?.uid ?? selectedDocumentRequest?.id;
    if (!uid) return;
    if (!documentStatusForm.status) {
      setDocumentError("Status is required.");
      return;
    }
    if (documentStatusForm.status === "SUBMITTED" && !documentStatusFiles[0] && !selectedDocumentRequest?.attachment && !selectedDocumentRequest?.documentUrl) {
      setDocumentError("Upload a file before marking the document as submitted.");
      return;
    }
    setDocumentSaving(true);
    setDocumentError(null);
    try {
      const attachment = documentStatusForm.status === "SUBMITTED" && documentStatusFiles[0]
        ? await documents.uploadFile(employee?.id || selectedDocumentRequest?.employeeUid || "", documentStatusFiles[0])
        : selectedDocumentRequest?.attachment;
      await documents.update(uid, {
        documentType: selectedDocumentRequest?.documentType,
        attachment,
        status: documentStatusForm.status,
      });
      setDocumentStatusDialogOpen(false);
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Unable to update document status.");
    } finally {
      setDocumentSaving(false);
    }
  };
  const handleSave = async () => {
    if (!employee) return;
    if (!form.name || !form.email || !contactNumber.number) {
      const missing = [!form.name && "Name", !form.email && "Email", !contactNumber.number && "Contact number"].filter(Boolean);
      const message = `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`;
      setSaveError(message);
      setEditTab("personal");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const deptObj = departments.find((d) => d.name === form.department);
      const desigObj = designations.find((d) => d.name === form.designation);

      const payload: Record<string, unknown> = {
        employeeId: employee.employeeId, name: form.name, email: form.email,
        contactNumber: contactNumber.e164Number || `${contactNumber.countryCode}${contactNumber.number}`,
        gender: form.gender || null, dob: form.dob || null, doj: form.doj || null,
        hrDepartmentUid: deptObj?.id || null,
        designationUid: desigObj?.id || null,
        employmentType: form.employmentType || null, role: employee.role || "employee",
        // Editing unrelated profile fields must not silently move the employee
        // to the shell's currently selected branch. Preserve their assigned
        // primary location; branch changes belong to the assignment/transfer flow.
        status: form.status || "Active", locationUid: employee.locationUid ?? null,
        pan: form.pan || null, uan: form.uan || null,
        esicNumber: form.esicNumber || null, pfAccountNo: form.pfAccountNo || null,
        aadhaarRef: form.aadhaarRef || null,
        bankDetails: form.bankDetails, salaryStructure: form.salaryStructure,
      };
      if (form.reportingManagerUid) payload.reportingManagerUid = form.reportingManagerUid;
      const desigLevel = designations.find((d) => d.name === form.designation)?.level;
      if (desigLevel != null) payload.hierarchyLevel = desigLevel;
      await api.put(`/employees/${employee.id}`, payload);
      await reload();
      trackEvent("hr.employee.updated", {
        employeeId: employee.id,
        employeeRef: employee.employeeId,
        hrDepartmentUid: payload.hrDepartmentUid ?? null,
        designationUid: payload.designationUid ?? null,
        status: payload.status,
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Employee updated",
        message: `${form.name || employee.name} was updated successfully.`,
      });
      navigate(`/employees/${employee.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save.";
      captureError(e instanceof Error ? e : new Error(message), { employeeId: employee?.id });
      setSaveError(message);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Employee update failed",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const enrollFace = async (descriptor: number[]) => {
    if (!employee) return;
    setFaceBusy(true);
    try {
      await api.post(`/employees/${employee.id}/face-enrollment`, { faceDescriptor: JSON.stringify(descriptor) });
      await reload();
      setFaceOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to enroll face.");
    } finally { setFaceBusy(false); }
  };

  const handleSaveCredentials = async () => {
    if (!employee) return;
    if (!credentials.password) {
      setLoginError("Password is required.");
      return;
    }
    if (credentials.password !== credentials.confirmPassword) {
      setLoginError("Password and confirm password must match.");
      return;
    }

    setLoginSaving(true);
    setLoginError(null);
    try {
      if (employee.hasAuthUser) {
        await api.put(`/employees/${employee.id}/password/reset`, {
          password: credentials.password,
        });
      } else {
        await api.post(`/employees/${employee.id}/auth-user`, {
          password: credentials.password,
        });
      }
      await reload();
      setLoginDialogOpen(false);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Employee login updated",
        message: `${employee.name}'s login access was updated successfully.`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update employee login.";
      setLoginError(message);
      captureError(e instanceof Error ? e : new Error(message), { employeeId: employee.id });
    } finally {
      setLoginSaving(false);
    }
  };

  if (loading) return <div className="page-section active" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--light-text)" }}><Loader2 size={20} className="animate-spin" />&nbsp;Loading…</div>;
  if (error || !employee) return (
    <div className="page-section active" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "var(--light-text)", textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "var(--danger-color)" }} /><h3 style={{ color: "var(--dark-text)", fontWeight: 700, fontSize: 18 }}>Employee Not Found</h3>
        <button className="btn btn-secondary" onClick={() => navigate("/employees")} style={{ display: "flex", alignItems: "center", gap: 8 }}><ArrowLeft size={16} /> Back to Directory</button>
      </div>
    </div>
  );

  const emp = employee as Record<string, unknown>;
  const legacySalary = employee.salaryStructure ?? {};
  const latestPayslipNet = myPayslips.find((payslip) => payslip.netPay != null)?.netPay;
  const earnings = assignedEarnings.reduce((total, component) => total + (component.amount ?? 0), 0);
  const deductions = assignedDeductions.reduce((total, component) => total + (component.amount ?? 0), 0);
  const hasCompleteMonetaryValues = assignedSalaryComponents.length > 0 && assignedSalaryComponents.every((component) => component.amount != null);
  const net = latestPayslipNet ?? (hasCompleteMonetaryValues ? earnings - deductions : null);
  const tenure = employee.doj ? `${Math.max(0, (Date.now() - new Date(employee.doj).getTime()) / (365.25 * 864e5)).toFixed(1)} Yrs` : "—";
  const onTime = myAttendance.length ? `${Math.round((myAttendance.filter((a) => (a.status || "").toLowerCase().includes("present")).length / myAttendance.length) * 100)}%` : "—";

  if (isEditing) {
    const bank = (form.bankDetails ?? {}) as NonNullable<Employee["bankDetails"]>;
    const sal = (form.salaryStructure ?? {}) as NonNullable<Employee["salaryStructure"]>;
    const setBank = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, bankDetails: { ...(p.bankDetails ?? {}), [k]: e.target.value } }));
    const setSal = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, salaryStructure: { ...(p.salaryStructure ?? {}), [k]: Number(e.target.value) } }));
    return (
      <section id="hr-employee-edit-page" data-testid="hr-employee-edit-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
        <div style={{ width: "100%" }}>
          <PageHeader
            variant="navigation"
            title="Edit Employee Profile"
            subtitle="Update personal, employment, and payroll information."
            back={{ label: "Back to Profile", href: employeeTabHref(employee.id, tab) }}
            onNavigate={(href) => navigate(href)}
          />
          {saveError && <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", borderRadius: 8, fontSize: 14 }}>{saveError}</div>}
          {(() => {
            const groups: Record<string, React.ReactNode> = {
              personal: (<>
                <div className="form-group"><label>Full Name <span className="required">*</span></label><input required className={field} value={form.name ?? ""} onChange={setF("name")} /></div>
                <div className="employee-edit-email-contact-pair">
                  <div className="form-group"><label>Email <span className="required">*</span></label><input required type="email" className={field} value={form.email ?? ""} onChange={setF("email")} /></div>
                  <div className="form-group">
                    <PhoneInput
                      id="hr-edit-employee-contact-number"
                      testId="hr-edit-employee-contact-number"
                      label="Contact Number"
                      required
                      value={contactNumber}
                      onChange={setContactNumber}
                      preferredCountries={["in"]}
                    />
                  </div>
                </div>
                <div className="employee-edit-personal-pair">
                  <div className="form-group">
                    <Select
                    id="hr-employee-gender"
                    testId="hr-employee-gender"
                    label="Gender"
                    value={form.gender ?? ""}
                    onChange={setF("gender")}
                    options={[
                      { value: "", label: "—" },
                      { value: "OTHER", label: "Other" },
                      { value: "FEMALE", label: "Female" },
                      { value: "MALE", label: "Male" }
                    ]}
                    />
                  </div>
                  <div className="form-group">
                    <DatePicker
                    id="hr-employee-dob"
                    label="Date of Birth"
                    value={form.dob ?? ""}
                    onChange={setF("dob")}
                    />
                  </div>
                </div>
                <div className="employee-edit-field-pair">
                  <div className="form-group"><label>PAN</label><input className={field} value={form.pan ?? ""} onChange={setF("pan")} /></div>
                  <div className="form-group"><label>UAN</label><input className={field} value={form.uan ?? ""} onChange={setF("uan")} /></div>
                  <div className="form-group"><label>ESIC Number</label><input className={field} value={form.esicNumber ?? ""} onChange={setF("esicNumber")} /></div>
                  <div className="form-group"><label>PF Account Number</label><input className={field} value={form.pfAccountNo ?? ""} onChange={setF("pfAccountNo")} /></div>
                  <div className="form-group"><label>Aadhaar Reference</label><input className={field} value={form.aadhaarRef ?? ""} onChange={setF("aadhaarRef")} /></div>
                </div>
              </>),
              employment: (<>
                <div className="employee-edit-field-pair">
                  <div className="form-group">
                    <Combobox
                    id="hr-employee-designation"
                    data-testid="hr-employee-designation"
                    label="Role / Designation"
                    value={form.designation ?? ""}
                    onValueChange={(value) => setForm((current) => ({ ...current, designation: value }))}
                    placeholder="Select Role / Designation"
                    searchValue={designationOptions.searchValue}
                    onSearchChange={designationOptions.onSearchChange}
                    loading={designationOptions.loading}
                    hasMore={designationOptions.hasMore}
                    onEndReached={designationOptions.onLoadMore}
                    options={[
                      ...designations.map((d) => ({ value: d.name || d.id, label: `${d.name || d.id}${d.level != null ? ` · L${d.level}` : ""}` })),
                      ...(form.designation && !designations.some((d) => d.name === form.designation) ? [{ value: form.designation, label: form.designation }] : [])
                    ]}
                    />
                    {form.employmentType === "Intern" && <div style={{ marginTop: 6, fontSize: 12, color: "var(--light-text)" }}>Interns are excluded from PF deductions.</div>}
                  </div>
                  <div className="form-group">
                    <Combobox
                    id="hr-employee-department"
                    data-testid="hr-employee-department"
                    label="Department"
                    value={form.department ?? ""}
                    onValueChange={(value) => setForm((current) => ({ ...current, department: value }))}
                    placeholder="Select Department"
                    searchValue={departmentOptions.searchValue}
                    onSearchChange={departmentOptions.onSearchChange}
                    loading={departmentOptions.loading}
                    hasMore={departmentOptions.hasMore}
                    onEndReached={departmentOptions.onLoadMore}
                    options={[
                      ...departments.map((d) => ({ value: d.name || d.id, label: d.name || d.id })),
                      ...(form.department && !departments.some((d) => d.name === form.department) ? [{ value: form.department, label: form.department }] : [])
                    ]}
                    />
                  </div>
                </div>
                <div className="employee-edit-field-pair">
                  <div className="form-group">
                    <DatePicker
                    id="hr-employee-doj"
                    label="Date of Joining"
                    value={form.doj ?? ""}
                    onChange={setF("doj")}
                    />
                  </div>
                  <div className="form-group">
                    <Select
                    id="hr-employee-employment-type"
                    testId="hr-employee-employment-type"
                    label="Employment Type"
                    value={form.employmentType ?? ""}
                    onChange={setF("employmentType")}
                    options={[
                      { value: "", label: "—" },
                      { value: "FullTime", label: "Full-time" },
                      { value: "PartTime", label: "Part-time" },
                      { value: "Hourly", label: "Hourly" },
                      { value: "Intern", label: "Intern" },
                      { value: "Consultant", label: "Consultant" },
                      { value: "DailyWage", label: "Daily wage" },
                      { value: "Contract", label: "Contract" },
                    ]}
                    />
                  </div>
                </div>
                <div className="employee-edit-field-pair">
                  <div className="form-group">
                    <Select
                    id="hr-employee-status"
                    testId="hr-employee-status"
                    label="Status"
                    value={form.status ?? ""}
                    onChange={setF("status")}
                    options={[
                      { value: "", label: "—" },
                      { value: "Active", label: "Active" },
                      { value: "Onboarding", label: "Onboarding" },
                      { value: "Notice Period", label: "Notice Period" },
                      { value: "Inactive", label: "Inactive" },
                      { value: "Left", label: "Left" }
                    ]}
                    />
                  </div>
                  <div className="form-group">
                    <Select
                    id="hr-employee-manager"
                    testId="hr-employee-manager"
                    label="Reporting Manager"
                    value={form.reportingManagerUid ?? ""}
                    onChange={setF("reportingManagerUid")}
                    options={[
                      { value: "", label: "—" },
                      ...allEmployees.filter((e) => e.id !== employee.id).map((e) => ({ value: e.id, label: `${e.name}${e.designation ? ` (${e.designation})` : ""}` }))
                    ]}
                    />
                  </div>
                </div>
              </>),
              bank: (<>
                <div className="employee-edit-field-pair">
                  <div className="form-group"><label>Bank Name</label><input id="hr-employee-edit-bank-name" data-testid="hr-employee-edit-bank-name" className={field} value={bank.bankName ?? ""} onChange={setBank("bankName")} /></div>
                  <div className="form-group"><label>Account Number</label><input className={field} value={bank.accountNumber ?? ""} onChange={setBank("accountNumber")} /></div>
                </div>
                <div className="employee-edit-field-pair">
                  <div className="form-group"><label>IFSC Code</label><input className={field} value={bank.ifscCode ?? ""} onChange={setBank("ifscCode")} /></div>
                  <div className="form-group"><Input label="Basic" type="number" className={field} value={sal.basic ?? ""} onChange={setSal("basic")} /></div>
                </div>
                <div className="employee-edit-field-pair">
                  <div className="form-group"><Input label="HRA" type="number" className={field} value={sal.hra ?? ""} onChange={setSal("hra")} /></div>
                  <div className="form-group"><Input label="Allowance" type="number" className={field} value={sal.allowance ?? ""} onChange={setSal("allowance")} /></div>
                </div>
              </>),
            };
            const editSections: Array<{
              key: typeof editTab;
              title: string;
              description: string;
              icon: React.ReactNode;
              note: string;
            }> = [
              {
                key: "personal",
                title: "Personal Info",
                description: "Identity, contact, and statutory details.",
                icon: <UserCircle2 size={24} />,
                note: "Keep contact and statutory information current for employee communication and compliance.",
              },
              {
                key: "employment",
                title: "Employment Info",
                description: "Role, department, status, and reporting line.",
                icon: <Briefcase size={24} />,
                note: "Employment settings determine reporting structure, workforce status, and HR workflows.",
              },
              {
                key: "bank",
                title: "Bank Details",
                description: "Bank account and salary structure.",
                icon: <CreditCard size={24} />,
                note: "Verify banking and salary information carefully before the next payroll cycle.",
              },
            ];
            return (
              <div className="employee-edit-accordion">
                {editSections.map((section) => {
                  const isOpen = editTab === section.key;
                  return (
                    <div key={section.key} className={`employee-edit-accordion__item${isOpen ? " is-open" : ""}`}>
                      <button
                        type="button"
                        data-testid={`hr-employee-edit-section-${section.key}`}
                        className="employee-edit-accordion__trigger"
                        aria-expanded={isOpen}
                        onClick={() => setEditTab(section.key)}
                      >
                        <span>
                          <strong>{section.title}</strong>
                          <small>{section.description}</small>
                        </span>
                        <ChevronDown size={18} aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <div className={`employee-edit-form employee-edit-form--${section.key}`}>
                          <div className="employee-edit-form__fields">
                            {groups[section.key]}
                          </div>
                          <aside className="employee-edit-context">
                            <div className="employee-edit-context__icon">{section.icon}</div>
                            <p className="employee-edit-context__eyebrow">Profile guidance</p>
                            <h3>{section.title}</h3>
                            <p>{section.note}</p>
                            <span>Changes are applied when you save the employee profile.</span>
                          </aside>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button id="hr-employee-edit-cancel" data-testid="hr-employee-edit-cancel" variant="secondary" size="lg" icon={<X size={16} />} onClick={() => navigate(employeeTabHref(employee.id, tab))}>Cancel</Button>
            <Button
              id="hr-employee-edit-save"
              data-testid="hr-employee-edit-save"
              variant="primary"
              size="lg"
              icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const tabs = EMPLOYEE_TABS;
  return (
    <section id="hr-employee-details-page" data-testid="hr-employee-details-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
      {faceOpen && (
        <Suspense fallback={null}>
          <FaceCaptureModal title={employee.faceDescriptor ? "Update Face ID" : "Enroll Face ID"} subtitle={employee.name} busy={faceBusy} onCapture={enrollFace} onClose={() => setFaceOpen(false)} />
        </Suspense>
      )}
      <PageHeader
        variant="navigation"
        title="Employee Profile"
        subtitle={`Detailed view of ${employee.name}'s information`}
        back={{ label: employeeProfileReturnLabel, href: employeeProfileReturnTo }}
        onNavigate={(href) => navigate(href)}
      />

      <div
        className="employee-details-layout"
        style={{
          display: "grid",
          gridTemplateColumns: tab === "overview" ? "300px minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        {/* LEFT PROFILE (Shown only on Overview tab) */}
        {tab === "overview" && (
          <div className="employee-details-sidebar" style={{ ...card, overflow: "hidden", height: "fit-content" }}>
            <div className="employee-details-sidebar-banner" style={{ height: 110, background: "var(--primary-light)" }} />
            <div className="employee-details-sidebar-body" style={{ padding: "0 24px 28px", marginTop: -56, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
              <div className="employee-details-sidebar-top">
                <div className="employee-details-hero">
              {employee.photoUrl ? <img className="employee-details-avatar" src={employee.photoUrl} alt={employee.name} style={{ width: 112, height: 112, borderRadius: "50%", objectFit: "cover", border: "6px solid var(--surface-bg)", boxShadow: "var(--shadow-md)" }} />
                : <div className="employee-details-avatar" style={{ width: 112, height: 112, borderRadius: "50%", background: "var(--primary-color)", color: "white", fontSize: 42, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "6px solid var(--surface-bg)", boxShadow: "var(--shadow-md)" }}>{initial(employee.name)}</div>}
              <div className="employee-details-identity">
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--dark-text)", margin: 0 }}>{employee.name}</h2>
                <div className="employee-details-badges employee-details-badges--inline">
                  <span className="employee-details-status-pill" style={{ display: "inline-block", padding: "4px 14px", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", background: employee.status === "Active" ? "#10b981" : "#f59e0b" }}>{employee.status || "Active"}</span>
                  <div className="employee-details-face-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: employee.faceDescriptor ? "var(--success-bg)" : "rgba(100,116,139,0.1)", border: `1px solid ${employee.faceDescriptor ? "var(--success-color)" : "var(--border-color)"}` }}>
                    <ScanFace size={12} style={{ color: employee.faceDescriptor ? "var(--success-color)" : "var(--light-text)" }} />
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: employee.faceDescriptor ? "var(--success-color)" : "var(--light-text)" }}>{employee.faceDescriptor ? "Face Enrolled" : "No Face ID"}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--light-text)", margin: "4px 0 10px" }}>{employee.designation || "—"}</p>
              </div>
              </div>
              <div className="employee-details-sidebar-meta">
                <div className="employee-details-sidebar-actions">
                <Button
                  className="employee-details-sidebar-button !rounded-xl !border-2 !border-[#c7d2fe] !text-[#4f46e5] hover:!bg-[color:color-mix(in_srgb,#4f46e5_6%,white)]"
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<ScanFace size={15} />}
                  onClick={() => setFaceOpen(true)}
                >
                  <span className="hidden sm:inline">{employee.faceDescriptor ? "Edit Face ID" : "Enroll Face ID"}</span>
                  <span className="sm:hidden">{employee.faceDescriptor ? "Face ID" : "Face ID"}</span>
                </Button>
                {employee.hasAuthUser ? (
                  <Button
                    id="hr-employee-reset-password"
                    data-testid="hr-employee-reset-password"
                    className="employee-details-sidebar-button !rounded-xl"
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<KeyRound size={15} />}
                    onClick={() => setLoginDialogOpen(true)}
                  >
                    <span className="hidden sm:inline">Reset Password</span>
                    <span className="sm:hidden">Password</span>
                  </Button>
                ) : (
                  <Button
                    id="hr-employee-manage-login"
                    data-testid="hr-employee-manage-login"
                    className="employee-details-sidebar-button !rounded-xl"
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<ShieldCheck size={15} />}
                    onClick={() => setLoginDialogOpen(true)}
                  >
                    <span className="hidden sm:inline">Manage Login</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                )}
                <Button
                  id="hr-employee-edit-profile"
                  data-testid="hr-employee-edit-profile"
                  className="employee-details-sidebar-button !rounded-xl"
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<Pencil size={15} />}
                  onClick={() => navigate(employeeTabHref(employee.id, tab, "?edit=true"))}
                >
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
                </div>
              </div>
              </div>

              <div className="employee-details-info-list" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <InfoTile icon={<ShieldCheck size={16} />} k="ID" v={employee.employeeId} />
                <InfoTile icon={<Mail size={16} />} k="Email" v={employee.email} />
                <InfoTile icon={<Phone size={16} />} k="Phone" v={employee.contactNumber} />
                <InfoTile icon={<Building2 size={16} />} k="Department" v={employee.department} />
              </div>
            </div>
          </div>
        )}

        {/* RIGHT */}
        <div className="employee-details-main" style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, maxWidth: "100%" }}>
          <div className="employee-details-tabs" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
            {tabs.map((t) => (
              <button id={`hr-employee-details-tab-${t}`} data-testid={`hr-employee-details-tab-${t}`} className="employee-details-tab" key={t} onClick={() => navigate(employeeTabHref(employee.id, t), { state: routeLocation.state })} style={{ flex: 1, padding: "12px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: tab === t ? "var(--primary-color)" : "var(--light-text)", borderBottom: tab === t ? "2px solid var(--primary-color)" : "2px solid transparent", marginBottom: -1 }}>{EMPLOYEE_TAB_LABELS[t]}</button>
            ))}
          </div>

          {/* MOBILE FOOTER MENU NAVIGATION */}
          <nav
            id="hr-employee-details-tabs-mobile-footer"
            data-testid="hr-employee-details-tabs-mobile-footer"
            className="employee-details-bottom-nav"
            aria-label="Employee profile navigation"
          >
            {MAIN_EMPLOYEE_TABS.map((t) => (
              <button
                key={t}
                type="button"
                id={`hr-employee-details-tab-mobile-${t}`}
                data-testid={`hr-employee-details-tab-mobile-${t}`}
                className="employee-details-bottom-nav__item"
                data-active={tab === t}
                onClick={() => navigate(employeeTabHref(employee.id, t), { state: routeLocation.state })}
              >
                <span className="employee-details-bottom-nav__icon">
                  {t === "overview" && <UserCircle2 size={18} />}
                  {t === "attendance" && <Clock size={18} />}
                  {t === "leaves" && <CalendarDays size={18} />}
                  {t === "payroll" && <Wallet size={18} />}
                </span>
                <span className="employee-details-bottom-nav__label">{EMPLOYEE_TAB_LABELS[t]}</span>
              </button>
            ))}

            {/* 5th ITEM: MORE MENU POPOVER */}
            <Popover
              portal
              open={employeeMoreOpen}
              onOpenChange={setEmployeeMoreOpen}
              placement="top"
              align="end"
              contentClassName="!w-48 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
              trigger={
                <button
                  type="button"
                  id="hr-employee-details-tab-mobile-more"
                  data-testid="hr-employee-details-tab-mobile-more"
                  className="employee-details-bottom-nav__item"
                  data-active={tab === "documents"}
                  onClick={() => setEmployeeMoreOpen((open) => !open)}
                >
                  <span className="employee-details-bottom-nav__icon">
                    <MoreHorizontal size={18} />
                  </span>
                  <span className="employee-details-bottom-nav__label">
                    {tab === "documents" ? "Documents" : "More"}
                  </span>
                </button>
              }
            >
              <div className="flex flex-col w-full py-1">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)] border-b border-[var(--border-color)]">
                  More Sections
                </div>
                <button
                  type="button"
                  id="hr-employee-details-tab-mobile-documents"
                  data-testid="hr-employee-details-tab-mobile-documents"
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors"
                  style={{
                    color: tab === "documents" ? "var(--primary-color)" : "var(--dark-text)",
                    background: tab === "documents" ? "rgba(17,94,89,0.06)" : "transparent",
                  }}
                  onClick={() => {
                    navigate(employeeTabHref(employee.id, "documents"), { state: routeLocation.state });
                    setEmployeeMoreOpen(false);
                  }}
                >
                  <FileText size={16} />
                  <span>Documents</span>
                </button>
                <div className="pt-1 mt-1 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    id="hr-employee-details-tab-mobile-home"
                    data-testid="hr-employee-details-tab-mobile-home"
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 text-[var(--primary-color)] hover:bg-[var(--primary-light)] transition-colors"
                    onClick={() => {
                      navigate("/");
                      setEmployeeMoreOpen(false);
                    }}
                  >
                    <Home size={16} />
                    <span>Main Menu</span>
                  </button>
                </div>
              </div>
            </Popover>
          </nav>

          {tab === "overview" && (
            <>
              <div className="employee-details-stats" style={{ display: "flex", gap: 16 }}>
                <StatCard l="WORKFORCE" t="TENURE" v={tenure} u="SINCE JOINING" active />
                <StatCard l="ATTENDANCE" t="ON-TIME" v={onTime} u="THIS MONTH" />
                <StatCard l="LEAVES" t="AVAILABLE" v={myLeaves.length ? `${myLeaves.length}` : "—"} u="REQUESTS" />
                <StatCard l="PAYROLL" t="NET SALARY" v={formatCurrency(net)} u="CURRENT" />
              </div>
              <div className="employee-details-overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Panel icon={<UserCircle2 size={20} />} title="Personal Information" sub="Identity details and date of birth">
                  <div className="employee-details-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><Field k="Gender" v={employee.gender} /><Field k="Date of Birth" v={formatDate(employee.dob)} /></div>
                </Panel>
                <Panel icon={<Briefcase size={20} />} title="Employment Details" sub="Role level and system configuration">
                  <div className="employee-details-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field k="Joining Date" v={formatDate(employee.doj)} /><Field k="System Role" v={employee.role} />
                    <Field k="Employment Type" v={employee.employmentType || "Full-Time"} /><Field k="Reporting Manager" v={managerName || "No Manager Assigned"} />
                    <Field k="PAN" v={emp.pan as string} mono /><Field k="UAN" v={emp.uan as string} mono />
                    <Field k="ESIC Number" v={emp.esicNumber as string} mono /><Field k="PF Account Number" v={emp.pfAccountNo as string} mono />
                    <Field k="Aadhaar Reference" v={emp.aadhaarRef as string} mono />
                    <Field k="ESS Portal Login" v={employee.hasAuthUser ? "Enabled" : "Not Enabled"} />
                    <Field k="Login ID" v={employee.hasAuthUser ? employee.employeeId : undefined} mono />
                  </div>
                </Panel>
                <Panel icon={<CreditCard size={20} />} title="Bank & Salary Details" sub="Registered account and salary structure for monthly pay disbursements" full>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 24 }}>
                    <Field k="Bank Name" v={employee.bankDetails?.bankName} /><Field k="Account Number" v={employee.bankDetails?.accountNumber} mono />
                    <Field k="IFSC Code" v={employee.bankDetails?.ifscCode} mono />
                    <Field k="Basic Salary" v={legacySalary.basic != null ? formatCurrency(legacySalary.basic) : undefined} />
                    <Field k="HRA" v={legacySalary.hra != null ? formatCurrency(legacySalary.hra) : undefined} />
                    <Field k="Allowance" v={legacySalary.allowance != null ? formatCurrency(legacySalary.allowance) : undefined} />
                  </div>
                </Panel>
              </div>
            </>
          )}

          {tab === "attendance" && (
            <>
              <Panel icon={<BarChart3 size={20} />} title="Weekly Attendance Details (Last Month)" sub="Weekly aggregated work yields and days clocked" full>
                <div className="employee-details-week-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
                  {weeks.map((w) => (
                    <div className="employee-details-week-card" key={w.label} style={{ border: "1px solid var(--border-color)", borderRadius: 14, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ ...lbl, color: "var(--dark-text)" }}>{w.label}</span><span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--light-text)" }}>{w.range}</span></div>
                      <div style={{ fontSize: 12, color: "var(--light-text)", marginBottom: 4 }}>Days worked: <b style={{ color: "var(--dark-text)", float: "right" }}>{w.days} / 5 Days</b></div>
                      <div style={{ height: 6, borderRadius: 999, background: "var(--border-color)", margin: "6px 0 12px" }}><div style={{ height: "100%", width: `${Math.min(100, (w.days / 5) * 100)}%`, background: "var(--success-color)", borderRadius: 999 }} /></div>
                      <div style={{ fontSize: 12, color: "var(--light-text)" }}>Hours logged: <b style={{ color: "var(--dark-text)", float: "right" }}>{w.hours} Hrs</b></div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel icon={<Clock size={20} />} title="Attendance Logs (Last 30 Days)" sub="Check-in detail ledger history logs" full
                action={<CollectionViewToggle value={attendanceViewMode} onChange={setAttendanceViewMode} />}>
                {myAttendance.length === 0 ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--light-text)" }}>No attendance records.</div> : (
                  <>
                  <div className="employee-details-table-wrap" style={{ display: attendanceViewMode === "table" ? "block" : "none" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Date</th><th style={th}>Mode</th><th style={th}>Clock In</th><th style={th}>Clock Out</th><th style={th}>Hours</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
                    <tbody>{myAttendance.slice(0, 30).map((a) => (
                      <tr key={a.id}><td style={td}>{formatDate(a.dateStr)}</td><td style={{ ...td, textTransform: "uppercase", fontSize: 11, color: "var(--light-text)" }}>{a.clockInType || "—"}</td><td style={td}>{fmtTime(a.clockIn)}</td><td style={td}>{fmtTime(a.clockOut)}</td><td style={td}>{a.workedHours != null ? `${a.workedHours.toFixed(1)} Hrs` : "—"}</td><td style={{ ...td, textAlign: "right" }}><StatusPill s={a.status} /></td></tr>
                    ))}</tbody>
                  </table>
                  </div>
                  <div className="employee-details-mobile-list" style={{ display: attendanceViewMode === "cards" ? "grid" : "none" }}>
                    {myAttendance.slice(0, 30).map((a) => (
                      <div key={a.id} className="employee-details-mobile-card">
                        <div className="employee-details-mobile-card__row">
                          <div>
                            <div className="employee-details-mobile-card__label">Date</div>
                            <div className="employee-details-mobile-card__value">{formatDate(a.dateStr)}</div>
                          </div>
                          <StatusPill s={a.status} />
                        </div>
                        <div className="employee-details-mobile-card__grid">
                          <Field k="Mode" v={a.clockInType || "—"} />
                          <Field k="Hours" v={a.workedHours != null ? `${a.workedHours.toFixed(1)} Hrs` : "—"} />
                          <Field k="Clock In" v={fmtTime(a.clockIn)} />
                          <Field k="Clock Out" v={fmtTime(a.clockOut)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </Panel>
            </>
          )}

          {tab === "leaves" && (
            <Panel icon={<History size={20} />} title="Leave Applications" sub="History of requested absence records" full
              action={<CollectionViewToggle value={leaveViewMode} onChange={setLeaveViewMode} />}>
              {myLeaves.length === 0 ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--light-text)" }}>No leave applications.</div> : (
                <>
                <div className="employee-details-table-wrap" style={{ display: leaveViewMode === "table" ? "block" : "none" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Type</th><th style={th}>Duration</th><th style={th}>Applied At</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
                  <tbody>{myLeaves.map((l) => (
                    <tr key={l.id}><td style={{ ...td, fontWeight: 700 }}>{l.type || "—"}</td><td style={{ ...td, color: "var(--primary-color)", fontWeight: 600 }}>{formatDate(l.startDate)} — {formatDate(l.endDate)}</td><td style={{ ...td, color: "var(--light-text)" }}>{formatDate(l.appliedAt)}</td><td style={{ ...td, textAlign: "right" }}><StatusPill s={l.status} /></td></tr>
                  ))}</tbody>
                </table>
                </div>
                <div className="employee-details-mobile-list" style={{ display: leaveViewMode === "cards" ? "grid" : "none" }}>
                  {myLeaves.map((l) => (
                    <div key={l.id} className="employee-details-mobile-card">
                      <div className="employee-details-mobile-card__row">
                        <div>
                          <div className="employee-details-mobile-card__label">Type</div>
                          <div className="employee-details-mobile-card__value">{l.type || "—"}</div>
                        </div>
                        <StatusPill s={l.status} />
                      </div>
                      <div className="employee-details-mobile-card__grid">
                        <Field k="From" v={formatDate(l.startDate)} />
                        <Field k="To" v={formatDate(l.endDate)} />
                        <Field k="Applied" v={formatDate(l.appliedAt)} />
                        <Field k="Status" v={l.status || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </Panel>
          )}

          {tab === "payroll" && (
            <>
              <Panel icon={<CreditCard size={20} />} title="Salary Structure" sub="Component breakdown of earnings versus safety contributions" full>
                {employeePayroll.loading ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={20} className="animate-spin" />&nbsp;Loading salary structure…</div>
                ) : assignedSalaryComponents.length === 0 ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "var(--light-text)" }}>No assigned salary components found.</div>
                ) : (
                <div className="employee-details-payroll-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 24, alignItems: "stretch" }}>
                  <div>
                    <div style={{ ...lbl, marginBottom: 12 }}>Earnings</div>
                    {assignedEarnings.map((component) => (
                      <div key={componentValueKey(component)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}><span style={{ color: "var(--dark-text)", fontWeight: 600 }}>{component.componentName || component.componentCode || "Component"}</span><b>{component.displayValue}</b></div>
                    ))}
                  </div>
                  <div>
                    <div style={{ ...lbl, marginBottom: 12 }}>Deductions</div>
                    {assignedDeductions.map((component) => (
                      <div key={componentValueKey(component)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "var(--danger-color)" }}><span style={{ fontWeight: 600 }}>{component.componentName || component.componentCode || "Component"}</span><b>{component.displayValue}</b></div>
                    ))}
                  </div>
                  <div className="employee-details-takehome-card" style={{ background: "var(--dark-bg)", borderRadius: 16, padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 200 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Monthly Take-Home</span>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "white", marginTop: 8 }}>{net != null ? formatCurrency(net) : "—"}</div>
                  </div>
                </div>
                )}
              </Panel>
              <Panel icon={<FileText size={20} />} title="Payslip Archive" sub="Available monthly payment breakdowns and receipts" full
                action={<CollectionViewToggle value={payslipViewMode} onChange={setPayslipViewMode} />}>
                {myPayslips.length === 0 ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--light-text)" }}>No payslips generated.</div> : (
                  <>
                  <div className="employee-details-table-wrap" style={{ display: payslipViewMode === "table" ? "block" : "none" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Month</th><th style={th}>Net Pay</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Action</th></tr></thead>
                    <tbody>{myPayslips.map((p) => (
                      <tr key={p.id}><td style={{ ...td, fontWeight: 700 }}>{p.month || "—"}</td><td style={{ ...td, fontWeight: 700 }}>{p.netPay != null ? formatCurrency(p.netPay) : "—"}</td><td style={td}><StatusPill s={p.status} /></td><td style={{ ...td, textAlign: "right" }}><button className="btn-grid-action" onClick={() => setViewPayslip(p)}>View Statement</button></td></tr>
                    ))}</tbody>
                  </table>
                  </div>
                  <div className="employee-details-mobile-list" style={{ display: payslipViewMode === "cards" ? "grid" : "none" }}>
                    {myPayslips.map((p) => (
                      <div key={p.id} className="employee-details-mobile-card">
                        <div className="employee-details-mobile-card__row">
                          <div>
                            <div className="employee-details-mobile-card__label">Month</div>
                            <div className="employee-details-mobile-card__value">{p.month || "—"}</div>
                          </div>
                          <StatusPill s={p.status} />
                        </div>
                        <div className="employee-details-mobile-card__grid">
                          <Field k="Net Pay" v={p.netPay != null ? formatCurrency(p.netPay) : "—"} />
                        </div>
                        <div className="employee-details-mobile-card__actions">
                          <button className="btn-grid-action" onClick={() => setViewPayslip(p)}>View Statement</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </Panel>
            </>
          )}

          {tab === "documents" && (
            <Panel icon={<FileText size={20} />} title="Employee Documents" sub="Official letters, credentials, and verification sheets" full
              actionBelow
              action={<div className="employee-details-document-toolbar"><Button id="hr-employee-document-add" data-testid="hr-employee-document-add" type="button" variant="primary" icon={<Plus size={16} />} onClick={() => setDocumentDialogOpen(true)}>Add Doc</Button><Button type="button" data-testid="hr-employee-documents-filter-button" variant={documentAppliedFilterCount > 0 ? "primary" : "outline"} className={documentAppliedFilterCount === 0 ? "!border-[var(--color-primary)] !text-[var(--color-primary)] hover:!bg-[var(--color-primary-subtle)]" : ""} icon={<Filter size={16} />} aria-label="Open employee document filters" onClick={openDocumentFilters}>Filter{documentAppliedFilterCount > 0 ? ` (${documentAppliedFilterCount})` : ""}</Button><CollectionViewToggle value={documentViewMode} onChange={setDocumentViewMode} /></div>}>
              {documents.loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={48} className="animate-spin" style={{ opacity: 0.4, marginBottom: 12 }} /><p>Loading documents...</p></div>
              ) : documentRows.length > 0 ? (
                <>
                <div className="employee-details-table-wrap" style={{ display: documentViewMode === "table" ? "block" : "none" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Document</th><th style={th}>Status</th><th style={th}>Updated</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>{documentRows.map((d) => (
                      <tr key={d.id} data-testid={`hr-employee-document-row-${d.id}`}>
                        <td style={{ ...td, fontWeight: 700 }}>{d.documentType || "Document"}</td>
                        <td style={td}><StatusPill s={d.status} /></td>
                        <td style={{ ...td, color: "var(--light-text)" }}>{formatDate(d.updatedAt || d.createdAt)}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 10 }}>
                            <button
                              type="button"
                              data-testid={`hr-employee-document-edit-${d.id}`}
                              aria-label="Edit document request"
                              style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => openDocumentStatusDialog(d)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button type="button" data-testid={`hr-employee-document-download-${d.id}`} aria-label={`Download ${d.documentType || "document"}`} disabled={!d.attachment?.filePath && !d.documentUrl} onClick={() => void downloadDocument(d)} style={{ padding: 0, background: "none", border: "none", cursor: d.attachment?.filePath || d.documentUrl ? "pointer" : "not-allowed", color: d.attachment?.filePath || d.documentUrl ? "var(--light-text)" : "rgba(148,163,184,0.5)" }}><Download size={16} /></button>
                            <button data-testid={`hr-employee-document-delete-${d.id}`} style={{ background: "none", border: "none", color: "var(--danger-color)", cursor: "pointer" }} onClick={() => { setDocumentError(null); setDocumentDeleteTarget(d); }}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="employee-details-documents-grid" style={{ display: documentViewMode === "cards" ? "grid" : "none", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
                  {documentRows.map((d) => (
                    <div data-testid={`hr-employee-document-card-${d.id}`} className="employee-details-document-card" key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--border-color)", borderRadius: 12 }}>
                      <div className="employee-details-document-meta" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={20} /></div>
                        <div>
                          <div style={val}>{d.documentType || "Document"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <StatusPill s={d.status} />
                            <span style={{ ...lbl, fontSize: 9 }}>{formatDate(d.updatedAt || d.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="employee-details-document-actions" style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          data-testid={`hr-employee-document-edit-card-${d.id}`}
                          aria-label="Edit document request"
                          style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => openDocumentStatusDialog(d)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button type="button" data-testid={`hr-employee-document-download-card-${d.id}`} aria-label={`Download ${d.documentType || "document"}`} disabled={!d.attachment?.filePath && !d.documentUrl} onClick={() => void downloadDocument(d)} style={{ padding: 0, background: "none", border: "none", cursor: d.attachment?.filePath || d.documentUrl ? "pointer" : "not-allowed", color: d.attachment?.filePath || d.documentUrl ? "var(--light-text)" : "rgba(148,163,184,0.5)" }}><Download size={16} /></button>
                        <button data-testid={`hr-employee-document-delete-card-${d.id}`} style={{ background: "none", border: "none", color: "var(--danger-color)", cursor: "pointer" }} onClick={() => { setDocumentError(null); setDocumentDeleteTarget(d); }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              ) : <div style={{ padding: "40px 0", textAlign: "center", color: "var(--light-text)" }}><FileText size={48} style={{ opacity: 0.2, marginBottom: 12 }} /><p>No documents uploaded yet.</p></div>}
              <DataTablePagination
                testId="hr-employee-documents-pagination"
                page={documentPage}
                pageSize={documentPageSize}
                total={documents.totalElements}
                onChange={setDocumentPage}
                onPageSizeChange={(size) => {
                  setDocumentPageSize(size);
                  setDocumentPage(1);
                }}
              />
            </Panel>
          )}
        </div>
      </div>
      <PayslipStatementDialog
        payslip={viewPayslip}
        employee={employee || null}
        employeeName={employee?.name}
        onClose={() => setViewPayslip(null)}
      />
      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} testId="hr-employee-login-dialog" title={employee.hasAuthUser ? "Reset Employee Password" : "Employee Login Access"} size="md">
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {loginError ? (
            <div id="hr-employee-login-error" data-testid="hr-employee-login-error" style={{ padding: "12px 14px", borderRadius: 10, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", fontSize: 13 }}>
              {loginError}
            </div>
          ) : null}
          <div id="hr-employee-login-status" data-testid="hr-employee-login-status" style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.14)", color: "var(--dark-text)", fontSize: 13 }}>
            {employee.hasAuthUser
              ? "This employee already has login credentials. Saving here will update the password."
              : "This employee does not have login credentials yet. Saving here will create them."}
          </div>
          <div className="employee-edit-field-pair">
            <div className="form-group">
              <label>Login ID</label>
              <input
                id="hr-employee-login-id"
                data-testid="hr-employee-login-id"
                className={field}
                value={employee.employeeId}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>{employee.hasAuthUser ? "New Password" : "Password"}</label>
              <input
                id="hr-employee-login-password"
                data-testid="hr-employee-login-password"
                type="password"
                className={field}
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
          </div>
          <div className="employee-edit-field-pair">
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                id="hr-employee-login-confirm-password"
                data-testid="hr-employee-login-confirm-password"
                type="password"
                className={field}
                value={credentials.confirmPassword}
                onChange={(e) => setCredentials((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
              />
            </div>
            <div className="form-group" />
          </div>
        </div>
        <DialogFooter>
          <Button id="hr-employee-login-cancel" data-testid="hr-employee-login-cancel" variant="ghost" onClick={() => setLoginDialogOpen(false)}>Cancel</Button>
          <Button id="hr-employee-login-save" data-testid="hr-employee-login-save" variant="primary" onClick={handleSaveCredentials} loading={loginSaving} disabled={loginSaving}>
            {employee.hasAuthUser ? "Reset Password" : "Save Login"}
          </Button>
        </DialogFooter>
      </Dialog>
      <Dialog open={documentDialogOpen} onClose={() => setDocumentDialogOpen(false)} testId="hr-employee-document-dialog" title="Add Employee Document" size="md">
        <div style={{ display: "grid", gap: 16 }}>
          {documentError ? (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", fontSize: 13 }}>
              {documentError}
            </div>
          ) : null}
          <div className="form-group">
            <label>Document Type</label>
            <Input
              id="hr-employee-document-type"
              data-testid="hr-employee-document-type"
              value={documentForm.documentType}
              onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentType: e.target.value }))}
              placeholder="Passport, Offer Letter, PAN Card"
              className="rounded-xl !h-11"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <Select
              id="hr-employee-document-status"
              testId="hr-employee-document-status"
              value={documentForm.status}
              onChange={(e) => setDocumentForm((prev) => ({ ...prev, status: e.target.value }))}
              options={DOC_REQUEST_STATUSES.map((status) => ({ value: status, label: status }))}
            />
          </div>
          {documentForm.status === "SUBMITTED" ? (
            <FileUpload
              label="Document File"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              multiple={false}
              onUpload={setDocumentFiles}
              testId="hr-employee-document-file-upload"
              id="hr-employee-document-file-upload"
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button id="hr-employee-document-cancel" data-testid="hr-employee-document-cancel" variant="ghost" onClick={() => setDocumentDialogOpen(false)}>Cancel</Button>
          <Button id="hr-employee-document-save" data-testid="hr-employee-document-save" variant="primary" onClick={() => void saveDocument()} loading={documentSaving} disabled={documentSaving}>
            Save Document
          </Button>
        </DialogFooter>
      </Dialog>
      <Drawer
        open={documentFiltersOpen}
        onClose={() => setDocumentFiltersOpen(false)}
        title="Document Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-employee-documents-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={documentSearchSchema}
              value={documentDraftFilters}
              onChange={setDocumentDraftFilters}
              appliedCount={documentAppliedFilterCount}
              onClearAll={clearDocumentFilters}
              emptyStateMessage="No document request filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" data-testid="hr-employee-documents-filter-reset" onClick={() => { clearDocumentFilters(); setDocumentFiltersOpen(false); }}>Reset All</Button>
            <Button type="button" variant="primary" className="flex-1" data-testid="hr-employee-documents-filter-apply" onClick={applyDocumentFilters}>Apply Filters</Button>
          </div>
        </div>
      </Drawer>
      <Dialog open={documentStatusDialogOpen} onClose={() => setDocumentStatusDialogOpen(false)} testId="hr-employee-document-status-dialog" title="Update Document Status" size="md">
        <div style={{ display: "grid", gap: 16 }}>
          {documentError ? (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", fontSize: 13 }}>
              {documentError}
            </div>
          ) : null}
          <div className="form-group">
            <label>Document Type</label>
            <Input
              id="hr-employee-document-status-type"
              data-testid="hr-employee-document-status-type"
              value={selectedDocumentRequest?.documentType || ""}
              readOnly
              className="rounded-xl !h-11"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <Select
              id="hr-employee-document-status-select"
              testId="hr-employee-document-status-select"
              value={documentStatusForm.status}
              onChange={(e) => setDocumentStatusForm({ status: e.target.value })}
              options={DOC_REQUEST_STATUSES.map((status) => ({ value: status, label: status }))}
            />
          </div>
          {documentStatusForm.status === "SUBMITTED" ? (
            <FileUpload
              label="Document File"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              multiple={false}
              onUpload={setDocumentStatusFiles}
              testId="hr-employee-document-status-file-upload"
              id="hr-employee-document-status-file-upload"
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button id="hr-employee-document-status-cancel" data-testid="hr-employee-document-status-cancel" variant="ghost" onClick={() => setDocumentStatusDialogOpen(false)}>Cancel</Button>
          <Button id="hr-employee-document-status-save" data-testid="hr-employee-document-status-save" variant="primary" onClick={() => void updateDocumentStatus()} loading={documentSaving} disabled={documentSaving}>
            Update Status
          </Button>
        </DialogFooter>
      </Dialog>
      <Dialog
        open={!!documentDeleteTarget}
        onClose={() => { if (!documentSaving) setDocumentDeleteTarget(null); }}
        testId="hr-employee-document-delete-dialog"
        title="Delete Document Request"
        size="sm"
      >
        <div className="space-y-5">
          {documentError ? (
            <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-color)]">
              {documentError}
            </div>
          ) : null}
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Delete the <strong className="text-[var(--color-text-primary)]">{documentDeleteTarget?.documentType || "document"}</strong> request? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDocumentDeleteTarget(null)} disabled={documentSaving}>
              Keep Request
            </Button>
            <Button
              id="hr-employee-document-delete-confirm"
              data-testid="hr-employee-document-delete-confirm"
              variant="danger"
              type="button"
              loading={documentSaving}
              disabled={documentSaving}
              onClick={() => { if (documentDeleteTarget) void removeDocument(documentDeleteTarget); }}
            >
              Delete Request
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </section>
  );
}



