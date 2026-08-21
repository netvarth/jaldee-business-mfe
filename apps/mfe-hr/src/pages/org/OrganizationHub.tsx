import { Fragment, useId, useMemo, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  BadgeCheck,
  Layers,
  Users,
  Users2,
  MapPinned,
  ArrowLeftRight,
  Gauge,
  Plus,
  X,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Play,
  LayoutGrid,
  MoreVertical,
  MoreHorizontal,
  Table as Rows3,
  ChevronRight,
  ChevronDown,
  Home,
  type LucideIcon,
} from "lucide-react";
import { Button, Checkbox, Combobox, Input, Popover, Select, Textarea, DataTable, SectionCard, EmptyState, Dialog, DialogFooter } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { usePositions, useHierarchyLevels, useAreaManagers, useTransfers, type Transfer } from "../../services/useOrg";
import { useEmployees } from "../../services/useEmployees";
import { usePagedEmployeeOptions } from "../../services/usePagedEmployeeOptions";
import { useBranches } from "../../services/useBranches";
import { useDepartments, useDesignations, useBranchesAdmin, useShifts } from "../../services/useSettingsData";
import { useShellFeedback } from "../../services/useShellFeedback";
import { useDepartmentSearchSchema } from "../../services/useHrSearchSchema";
import { CrudPanel, PanelHeader } from "../../components/CrudPanel";
import OrgChartTab from "./OrgChartTab";
import HeadcountDashboardTab from "./HeadcountDashboardTab";

const TEAL = "var(--primary-color)";
const EMPTY_DEPARTMENT_FILTERS: [] = [];
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 220, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto" };

type Tab = "chart" | "headcount" | "departments" | "designations" | "branches" | "positions" | "levels" | "transfers";
type ViewMode = "table" | "cards";

const ORG_ROUTES: Array<{ key: Tab; route: string; label: string; Icon: LucideIcon }> = [
  { key: "chart", route: "chart", label: "Org Chart", Icon: MapPinned },
  { key: "headcount", route: "headcount", label: "Headcount & Norms", Icon: Gauge },
  { key: "departments", route: "departments", label: "Departments", Icon: Users2 },
  { key: "levels", route: "levels", label: "Seniority Bands", Icon: Layers },
  { key: "designations", route: "designations", label: "Job Roles", Icon: BadgeCheck },
  { key: "branches", route: "branches", label: "Branches", Icon: MapPinned },
  { key: "positions", route: "positions", label: "Headcount Planning", Icon: Briefcase },
  { key: "transfers", route: "transfers", label: "Transfers", Icon: ArrowLeftRight },
];

const MAIN_ORG_ROUTES = ORG_ROUTES.slice(0, 4);
const MORE_ORG_ROUTES = ORG_ROUTES.slice(4);

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function orgRouteState(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const orgIndex = segments.lastIndexOf("org");
  const orgSegments = orgIndex >= 0 ? segments.slice(orgIndex + 1) : segments;
  const tabSegment = orgSegments[0];
  if (tabSegment === "area-managers") {
    return { tab: "branches" as Tab };
  }
  const match = ORG_ROUTES.find((item) => item.route === tabSegment || item.key === tabSegment);
  return { tab: match?.key || "chart" };
}

function ErrBar({ text }: { text: string }) {
  return (
    <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
      <AlertCircle size={15} /> {text}
    </div>
  );
}

function Modal({ title, onClose, children, footer, fullScreen, testId }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; fullScreen?: boolean; testId?: string }) {
  const titleId = useId();
  const customBoxStyle: CSSProperties = fullScreen
    ? { ...modalBox, maxWidth: "96vw", width: "95vw", height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column" }
    : modalBox;

  return (
    <div style={overlay} onClick={onClose}>
      <div
        role="dialog"
        data-testid={testId}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={customBoxStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <h3 id={titleId} style={{ fontSize: 17, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{title}</h3>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>{children}</div>
        <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>{footer}</div>
      </div>
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
    <div data-view-toggle="table-card" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: 3, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)" }}>
      <button
        id={`${scope}-table`}
        data-testid={`${scope}-table`}
        data-active={value === "table"}
        type="button"
        onClick={() => onChange("table")}
        style={viewToggleButton(value === "table")}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={14} />
      </button>
      <button
        id={`${scope}-cards`}
        data-testid={`${scope}-cards`}
        data-active={value === "cards"}
        type="button"
        onClick={() => onChange("cards")}
        style={viewToggleButton(value === "cards")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}

function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: ReactNode;
}) {
  return (
    <div className="org-section-header">
      <span className="org-section-header__label">{label}</span>
      <div className="org-section-header__action">{action}</div>
    </div>
  );
}

function MobileCard({
  title,
  rows,
  footer,
}: {
  title: ReactNode;
  rows: Array<{ label: string; value: ReactNode }>;
  footer?: ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 18, padding: 16, background: "var(--surface-bg)", display: "grid", gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dark-text)" }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={String(row.label)} style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <span style={{ ...lbl, fontSize: 8.5 }}>{row.label}</span>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--dark-text)", textAlign: "right" }}>{row.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div> : null}
    </div>
  );
}

function OrgEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} className={className} />;
}

function EmptyTableRow({
  colSpan,
  icon,
  title,
  description,
}: {
  colSpan: number;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <OrgEmptyState icon={icon} title={title} description={description} />
      </td>
    </tr>
  );
}

function statusPill(status?: string) {
  const color = status === "Effected" ? "#059669" : status === "Cancelled" ? "#64748b" : "#d97706";
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", color, background: `${color}14`, border: `1px solid ${color}33` }}>
      {status || "-"}
    </span>
  );
}

export default function OrgStructure() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useShellFeedback("organization");
  const routeState = useMemo(() => orgRouteState(location.pathname), [location.pathname]);
  const tab = routeState.tab;
  const [designationDepartmentPage, setDesignationDepartmentPage] = useState(0);
  const [designationDepartmentOptions, setDesignationDepartmentOptions] = useState<Array<{ id: string; name?: string }>>([]);
  const [designationDepartmentTotal, setDesignationDepartmentTotal] = useState(0);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [debouncedDepartmentSearch, setDebouncedDepartmentSearch] = useState("");
  const { schema: departmentSearchSchema } = useDepartmentSearchSchema(tab === "designations");

  const positions = usePositions(tab === "positions" || tab === "headcount");
  const levels = useHierarchyLevels(tab === "levels" || tab === "designations");
  const areaMgrs = useAreaManagers(tab === "branches");
  const transfers = useTransfers(tab === "transfers");
  const normalizedDepartmentSearch = debouncedDepartmentSearch.trim();
  const useDepartmentServerSearch =
    designationDepartmentTotal > 100 && normalizedDepartmentSearch.length >= 3;
  const departmentFilters = useMemo(() => tab === "designations" && useDepartmentServerSearch
    ? [{
        id: "designation-department-search",
        field: "name",
        operator: "CONTAINS",
        values: [normalizedDepartmentSearch],
      }]
    : EMPTY_DEPARTMENT_FILTERS, [normalizedDepartmentSearch, tab, useDepartmentServerSearch]);
  const departments = useDepartments(departmentFilters, departmentSearchSchema, {
    enabled: tab === "departments" || tab === "positions" || tab === "transfers" || tab === "designations",
    page: tab === "designations" ? designationDepartmentPage : 0,
    pageSize: 100,
  });
  const designations = useDesignations(undefined, undefined, {
    enabled: tab === "designations" || tab === "positions"
  });
  useEffect(() => {
    if (departmentSearch === debouncedDepartmentSearch) return;
    const timeout = window.setTimeout(() => {
      setDesignationDepartmentPage(0);
      setDesignationDepartmentOptions([]);
      setDebouncedDepartmentSearch(departmentSearch);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [departmentSearch]);
  useEffect(() => {
    if (tab !== "designations") {
      setDesignationDepartmentPage(0);
      setDesignationDepartmentOptions([]);
      setDesignationDepartmentTotal(0);
      setDepartmentSearch("");
      setDebouncedDepartmentSearch("");
      return;
    }
    if (designationDepartmentPage === 0 && !normalizedDepartmentSearch) {
      setDesignationDepartmentTotal(departments.totalElements);
    }
    setDesignationDepartmentOptions((current) => {
      const loaded = designationDepartmentPage === 0 ? [] : current;
      const merged = new Map(loaded.map((department) => [department.id, department]));
      departments.data.forEach((department) => merged.set(department.id, department));
      return Array.from(merged.values());
    });
  }, [departments.data, departments.totalElements, designationDepartmentPage, normalizedDepartmentSearch, tab]);
  const wrappedDesignations = useMemo(() => {
    return {
      ...designations,
      create: async (payload: Record<string, unknown>) => {
        const levelUid = payload.orgLevelUid as string;
        const matchingLevel = levels.data.find(l => l.id === levelUid);
        const finalPayload = {
          ...payload,
          level: matchingLevel ? Number(matchingLevel.levelNo) : null,
          orgLevelUid: levelUid || null
        };
        return designations.create(finalPayload);
      },
      update: async (uid: string, payload: Record<string, unknown>) => {
        const levelUid = payload.orgLevelUid as string;
        const matchingLevel = levels.data.find(l => l.id === levelUid);
        const finalPayload = {
          ...payload,
          level: matchingLevel ? Number(matchingLevel.levelNo) : null,
          orgLevelUid: levelUid || null
        };
        return designations.update(uid, finalPayload);
      }
    };
  }, [designations, levels.data]);
  const branchesAdmin = useBranchesAdmin({
    enabled: tab === "branches" || tab === "positions" || tab === "transfers"
  });
  const shifts = useShifts({
    enabled: tab === "transfers"
  });
  const { data: employees } = useEmployees(undefined, undefined, {
    enabled: tab === "transfers" || tab === "branches"
  });
  const { data: branches } = useBranches({
    enabled: tab === "branches" || tab === "positions" || tab === "transfers"
  });

  const [positionsView, setPositionsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [departmentsView, setDepartmentsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [designationsView, setDesignationsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [levelsView, setLevelsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [areaManagersView, setAreaManagersView] = useState<ViewMode>(() => getPreferredViewMode());
  const [transfersView, setTransfersView] = useState<ViewMode>(() => getPreferredViewMode());
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false));
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => {
      setIsMobile(media.matches);
      const next = media.matches ? "cards" : "table";
      setDepartmentsView(next);
      setDesignationsView(next);
      setPositionsView(next);
      setLevelsView(next);
      setAreaManagersView(next);
      setTransfersView(next);
    };
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const transferEmp = params.get("transferEmp");
    if (!transferEmp) return;
    if (tab !== "transfers") {
      navigate(`/org/transfers?${params.toString()}`, { replace: true });
      return;
    }
    setTr({
      employeeUid: transferEmp,
      toLocationUid: params.get("toLocation") || "",
      toDepartmentUid: params.get("toDepartment") || "",
      toShiftUid: params.get("toShift") || "",
      toManagerUid: "",
      effectiveDate: "",
      reason: "",
    });
    setTrOpen(true);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate, tab]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const act = async (fn: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      toast("success", "Organization updated", successMessage);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed.";
      setMsg(message);
      toast("error", "Organization update failed", message);
    } finally {
      setBusy(false);
    }
  };

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid.slice(0, 8) : "All branches");
  }, [branches]);
  const employeeName = useMemo(() => {
    const m = new Map(employees.map((employee) => [employee.id, employee.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "-");
  }, [employees]);
  const employeeCode = useMemo(() => {
    const codes = new Map(employees.map((employee) => [employee.id, employee.employeeId] as const));
    return (uid?: string | null) => (uid ? codes.get(uid) || "-" : "-");
  }, [employees]);
  const branchAssignments = useMemo(() => {
    const grouped = new Map<string, typeof areaMgrs.data>();
    areaMgrs.data.forEach((assignment) => {
      if (!assignment.locationUid) return;
      const current = grouped.get(assignment.locationUid) ?? [];
      current.push(assignment);
      grouped.set(assignment.locationUid, current);
    });
    return grouped;
  }, [areaMgrs.data]);
  const isBranchExpanded = (branchId: string) => Boolean(expandedBranches[branchId]);
  const toggleBranchExpanded = (branchId: string) => {
    setExpandedBranches((current) => ({ ...current, [branchId]: !current[branchId] }));
  };

  const designationName = useMemo(() => {
    const m = new Map(designations.data.map((d) => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Unknown");
  }, [designations.data]);

  const employeesLoaded = tab !== "departments";
  const designationsLoaded = tab !== "departments";

  const departmentInsights = useMemo(() => {
    const employeeCounts = new Map<string, number>();
    const roleCounts = new Map<string, number>();

    if (employeesLoaded) {
      employees.forEach((employee) => {
        const key = String(employee.department || "").trim().toLowerCase();
        if (!key) return;
        employeeCounts.set(key, (employeeCounts.get(key) ?? 0) + 1);
      });
    }

    if (designationsLoaded) {
      designations.data.forEach((designation) => {
        const key = String(designation.department || "").trim().toLowerCase();
        if (!key) return;
        roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
      });
    }

    return (departmentName: string | null | undefined) => {
      const key = String(departmentName || "").trim().toLowerCase();
      return {
        employees: employeesLoaded ? (employeeCounts.get(key) ?? 0) : null,
        roles: designationsLoaded ? (roleCounts.get(key) ?? 0) : null,
      };
    };
  }, [designations.data, employees, employeesLoaded, designationsLoaded]);

  const departmentName = useMemo(() => {
    const m = new Map(departments.data.map((d) => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Any / Global");
  }, [departments.data]);

  const shiftName = useMemo(() => {
    const m = new Map(shifts.data.map((s) => [s.id, s.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Any Shift");
  }, [shifts.data]);

  const [posOpen, setPosOpen] = useState(false);
  const [posEditing, setPosEditing] = useState<string | null>(null);
  const [pos, setPos] = useState({ designationUid: "", departmentUid: "", locationUid: "", sanctionedCount: "" });

  const [depOpen, setDepOpen] = useState(false);
  const [depEditing, setDepEditing] = useState<string | null>(null);
  const [depStatusTarget, setDepStatusTarget] = useState<(typeof departments.data)[number] | null>(null);
  const [dep, setDep] = useState({ name: "", code: "" });

  const [lvlOpen, setLvlOpen] = useState(false);
  const [lvlEditing, setLvlEditing] = useState<string | null>(null);
  const [lvl, setLvl] = useState({ levelNo: "", label: "" });

  const [amOpen, setAmOpen] = useState(false);
  const [am, setAm] = useState({ managerEmployeeUids: [] as string[], locationUid: "" });
  const assignEmployeeOptions = usePagedEmployeeOptions({ enabled: amOpen });

  const [trOpen, setTrOpen] = useState(false);
  const [tr, setTr] = useState({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" });
  const transferEmployeeOptions = usePagedEmployeeOptions({ enabled: trOpen });
  const [transferToEffect, setTransferToEffect] = useState<Transfer | null>(null);
  const [transferToCancel, setTransferToCancel] = useState<Transfer | null>(null);

  const openDepartmentEditor = (department: (typeof departments.data)[number]) => {
    setDepEditing(department.id);
    setDep({ name: String(department.name ?? ""), code: String(department.code ?? "") });
    setDepOpen(true);
  };

  const isDepartmentEnabled = (department: (typeof departments.data)[number]) =>
    String(department.status || "Enabled").toLowerCase() !== "disabled";

  const confirmDepartmentStatusChange = () => {
    if (!depStatusTarget) return;
    const nextStatus = isDepartmentEnabled(depStatusTarget) ? "Disabled" : "Enabled";
    void act(async () => {
      await departments.setStatus(depStatusTarget.id, nextStatus);
      setDepStatusTarget(null);
    }, `Department ${nextStatus.toLowerCase()} successfully.`);
  };

  const assignableEmployees = assignEmployeeOptions.data;

  const positionColumns = useMemo<ColumnDef<(typeof positions.data)[number]>[]>(() => [
    {
      key: "designationName",
      header: "Designation",
      render: (row) => <b>{row.designationName || designationName(row.designationUid) || "-"}</b>,
    },
    {
      key: "departmentName",
      header: "Department",
      render: (row) => row.departmentName || departmentName(row.departmentUid),
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => row.locationName || branchName(row.locationUid),
    },
    {
      key: "sanctionedCount",
      header: "Sanctioned",
      render: (row) => <span style={{ fontWeight: 800, color: TEAL }}>{row.sanctionedCount ?? "-"}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      width: 116,
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            id={`hr-org-position-edit-${row.id}`}
            data-testid={`hr-org-position-edit-${row.id}`}
            variant="ghost"
            size="icon"
            onClick={() => {
              setPosEditing(row.id);
              setPos({
                designationUid: row.designationUid || "",
                departmentUid: row.departmentUid || "",
                locationUid: row.locationUid || "",
                sanctionedCount: row.sanctionedCount != null ? String(row.sanctionedCount) : "",
              });
              setPosOpen(true);
            }}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            style={{ color: "#e11d48" }}
            onClick={() => { if (confirm("Delete this allocated seat?")) void act(() => positions.remove(row.id)); }}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [positions, branchName, act]);

  const levelColumns = useMemo<ColumnDef<(typeof levels.data)[number]>[]>(() => [
    {
      key: "levelNo",
      header: "Level",
      render: (row) => <span style={{ fontWeight: 900, color: TEAL }}>{`L${row.levelNo}`}</span>,
    },
    {
      key: "label",
      header: "Label",
      render: (row) => <b>{row.label || "-"}</b>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      width: 116,
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            id={`hr-org-level-edit-${row.id}`}
            data-testid={`hr-org-level-edit-${row.id}`}
            variant="ghost"
            size="icon"
            onClick={() => {
              setLvlEditing(row.id);
              setLvl({ levelNo: String(row.levelNo ?? ""), label: row.label || "" });
              setLvlOpen(true);
            }}
          >
            <Pencil size={15} />
          </Button>
        </div>
      ),
    },
  ], []);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const activeOrgTabObj = ORG_ROUTES.find((item) => item.key === tab);
  const isMoreOrgActive = MORE_ORG_ROUTES.some((item) => item.key === tab);

  const goToTab = (nextTab: Tab) => {
    const route = ORG_ROUTES.find((item) => item.key === nextTab)?.route || "chart";
    navigate(`/org/${route}`);
    setMsg(null);
  };

  return (
    <section className="page-section active hr-page-shell">
      <div className="org-page-header">
        <PageHeader title="Org Structure" subtitle="Positions, seniority levels, branch coverage, transfers, and workforce norms." />
      </div>

      {/* MOBILE BOTTOM FOOTER NAV */}
      <nav
        id="hr-org-tabs-mobile-footer"
        data-testid="hr-org-tabs-mobile-footer"
        className="mobile-bottom-nav"
        aria-label="Organization mobile navigation"
      >
        {MAIN_ORG_ROUTES.map(({ key, label, Icon }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              id={`hr-org-tab-mobile-${key}`}
              data-testid={`hr-org-tab-mobile-${key}`}
              className="mobile-bottom-nav__item"
              data-active={isActive}
              onClick={() => goToTab(key)}
            >
              <span className="mobile-bottom-nav__icon">
                <Icon size={18} />
              </span>
              <span className="mobile-bottom-nav__label">{label}</span>
            </button>
          );
        })}

        {/* 5th ITEM: MORE MENU POPOVER */}
        <Popover
          portal
          open={moreMenuOpen}
          onOpenChange={setMoreMenuOpen}
          placement="top"
          align="end"
          contentClassName="!w-52 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
          trigger={
            <button
              type="button"
              id="hr-org-tab-mobile-more"
              data-testid="hr-org-tab-mobile-more"
              className="mobile-bottom-nav__item"
              data-active={isMoreOrgActive}
              onClick={() => setMoreMenuOpen((open) => !open)}
            >
              <span className="mobile-bottom-nav__icon">
                <MoreHorizontal size={18} />
              </span>
              <span className="mobile-bottom-nav__label">
                {isMoreOrgActive ? activeOrgTabObj?.label || "More" : "More"}
              </span>
            </button>
          }
        >
          <div className="flex flex-col w-full py-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)] border-b border-[var(--border-color)]">
              More Sections
            </div>
            {MORE_ORG_ROUTES.map(({ key, label, Icon }) => {
              const isActive = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  id={`hr-org-tab-mobile-${key}`}
                  data-testid={`hr-org-tab-mobile-${key}`}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors"
                  style={{
                    color: isActive ? "var(--primary-color)" : "var(--dark-text)",
                    background: isActive ? "rgba(17,94,89,0.06)" : "transparent",
                  }}
                  onClick={() => {
                    goToTab(key);
                    setMoreMenuOpen(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
            <div className="pt-1 mt-1 border-t border-[var(--border-color)]">
              <button
                type="button"
                id="hr-org-tab-mobile-home"
                data-testid="hr-org-tab-mobile-home"
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 text-[var(--primary-color)] hover:bg-[var(--primary-light)] transition-colors"
                onClick={() => {
                  navigate("/");
                  setMoreMenuOpen(false);
                }}
              >
                <Home size={16} />
                <span>Main Menu</span>
              </button>
            </div>
          </div>
        </Popover>
      </nav>

      {/* DESKTOP PILL TABS */}
      <div
        className="hidden md:inline-flex flex-nowrap max-w-full overflow-x-auto gap-0.5 mb-6 scrollbar-none"
        style={{
          background: "rgba(100,116,139,0.08)",
          padding: 4,
          borderRadius: 12,
        }}
      >
        {ORG_ROUTES.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              id={`hr-org-tab-${key}`}
              data-testid={`hr-org-tab-${key}`}
              data-active={isActive ? "true" : "false"}
              onClick={() => goToTab(key)}
              className="min-w-0 px-2.5 py-2 md:px-3.5 transition-all flex-shrink-0"
              style={{
                minHeight: 42,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "0.04em",
                textAlign: "center",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                background: isActive ? "white" : "transparent",
                color: isActive ? "var(--dark-text)" : "var(--light-text)",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="org-content-shell">
        {msg && <ErrBar text={msg} />}

        {tab === "chart" && <OrgChartTab />}
        {tab === "headcount" && (
          <HeadcountDashboardTab
            positions={positions.data}
            onRequestTransfer={(loc, dept, shift) => {
              const params = new URLSearchParams();
              if (loc !== "global_branch") params.set("toLocation", loc);
              if (dept !== "global_dept") params.set("toDepartment", dept);
              if (shift !== "global_shift") params.set("toShift", shift);
              navigate(`/org/transfers${params.toString() ? `?${params.toString()}` : ""}`);
              setTr({ employeeUid: "", toLocationUid: loc === "global_branch" ? "" : loc, toDepartmentUid: dept === "global_dept" ? "" : dept, toShiftUid: shift === "global_shift" ? "" : shift, toManagerUid: "", effectiveDate: "", reason: "" });
              setTrOpen(true);
            }}
          />
        )}

        {tab === "departments" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
              <div style={{ height: 44, width: 44, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users2 size={20} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.4px", color: "var(--dark-text)", margin: 0 }}>
                  Departments ({departments.data.length})
                </h2>
                <p style={{ ...lbl, marginTop: 2 }}>Organizational units</p>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-3 flex-wrap sm:w-auto sm:justify-end" style={{ minHeight: 44 }}>
              <Button id="hr-org-department-add" data-testid="hr-org-department-add" icon={<Plus size={15} />} onClick={() => { setDepEditing(null); setDep({ name: "", code: "" }); setDepOpen(true); }}>
                Add Department
              </Button>
              <div className="ml-auto shrink-0">
                <ViewToggle value={departmentsView} onChange={setDepartmentsView} scope="hr-org-departments-view" />
              </div>
            </div>
          </div>
          {departments.error && <ErrBar text={departments.error} />}
          <SectionCard className="overflow-hidden border-0 shadow-none" padding={false}>
            {departments.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : departmentsView === "table" ? (
              <div className="overflow-hidden rounded-[12px] border border-[#d7e3f1] bg-white">
                {departments.data.length === 0 ? (
                  <OrgEmptyState
                    icon={<Briefcase size={34} strokeWidth={1.5} />}
                    title="No departments yet"
                    description="Departments added for your organization will appear here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[880px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[#d7e3f1]">
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#587398]">Department</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#587398]">Code</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#587398]">Employees</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#587398]">Roles</th>
                          <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#587398]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.data.map((department) => {
                          const insights = departmentInsights(String(department.name));
                          const hasCode = Boolean(department.code);
                          const enabled = isDepartmentEnabled(department);
                          return (
                            <tr
                              key={department.id}
                              data-testid={`hr-org-department-row-${department.id}`}
                              className="border-b border-[#d7e3f1] last:border-b-0"
                            >
                              <td className="px-4 py-4 align-middle">
                                <div className="min-w-0">
                                  <div className="truncate text-[15px] font-bold text-slate-900">{department.name || "-"}</div>
                                  {insights.employees !== null && (
                                    <div className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-amber-700">
                                      {insights.employees > 0 ? `${insights.employees} employee${insights.employees === 1 ? "" : "s"} mapped` : "Awaiting employee mapping"}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm font-semibold text-slate-700">{department.code || "-"}</td>
                              <td className="px-4 py-4 text-sm font-semibold text-slate-900">{insights.employees !== null ? insights.employees : "—"}</td>
                              <td className="px-4 py-4 text-sm font-semibold text-slate-900">{insights.roles !== null ? insights.roles : "—"}</td>
                               <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    id={`hr-org-department-edit-${department.id}`}
                                    data-testid={`hr-org-department-edit-${department.id}`}
                                    variant="ghost"
                                    size="icon"
                                    disabled={busy}
                                    onClick={() => openDepartmentEditor(department)}
                                  >
                                    <Pencil size={15} />
                                  </Button>
                                  <Button
                                    id={`hr-org-department-${enabled ? "disable" : "enable"}-${department.id}`}
                                    data-testid={`hr-org-department-${enabled ? "disable" : "enable"}-${department.id}`}
                                    variant="ghost"
                                    size="icon"
                                    title={enabled ? "Disable record" : "Enable record"}
                                    aria-label={`${enabled ? "Disable" : "Enable"} department`}
                                    disabled={busy}
                                    style={{
                                      color: enabled ? "#059669" : "#64748b",
                                      background: enabled ? "rgba(5,150,105,0.07)" : "rgba(100,116,139,0.07)",
                                    }}
                                    onClick={() => setDepStatusTarget(department)}
                                  >
                                    {enabled ? <ToggleRight size={22} strokeWidth={2.2} /> : <ToggleLeft size={22} strokeWidth={2.2} />}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {departments.data.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <OrgEmptyState
                      icon={<Briefcase size={34} strokeWidth={1.5} />}
                      title="No departments yet"
                      description="Departments added for your organization will appear here."
                    />
                  </div>
                ) : departments.data.map((department) => {
                  const insights = departmentInsights(String(department.name));
                  const enabled = isDepartmentEnabled(department);
                  return (
                    <article
                      key={department.id}
                      data-testid={`hr-org-department-card-${department.id}`}
                      className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_70%,white)] bg-[var(--color-surface)] p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-semibold text-[var(--color-text-primary)]">{department.name || "-"}</div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                            Department
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            className="!h-8 !w-8 !px-0 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                            aria-label={`Edit ${department.name || "department"}`}
                            disabled={busy}
                            onClick={() => openDepartmentEditor(department)}
                            icon={<Pencil size={14} />}
                          />
                          <Button
                            id={`hr-org-department-card-${enabled ? "disable" : "enable"}-${department.id}`}
                            data-testid={`hr-org-department-card-${enabled ? "disable" : "enable"}-${department.id}`}
                            size="sm"
                            variant="ghost"
                            iconOnly
                            className="!h-8 !w-8 !px-0"
                            style={{
                              color: enabled ? "#059669" : "#64748b",
                              background: enabled ? "rgba(5,150,105,0.07)" : "rgba(100,116,139,0.07)",
                            }}
                            title={enabled ? "Disable record" : "Enable record"}
                            aria-label={`${enabled ? "Disable" : "Enable"} ${department.name || "department"}`}
                            disabled={busy}
                            onClick={() => setDepStatusTarget(department)}
                            icon={enabled ? <ToggleRight size={20} strokeWidth={2.2} /> : <ToggleLeft size={20} strokeWidth={2.2} />}
                          />
                        </div>
                      </div>
                      <div className="mt-5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_35%,white)] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Code</span>
                          <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{department.code || "-"}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-1">
                          <Users size={12} />
                          {insights.employees !== null ? `${insights.employees} Employee${insights.employees === 1 ? "" : "s"}` : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                          <Briefcase size={12} />
                          {insights.roles !== null ? `${insights.roles} Role${insights.roles === 1 ? "" : "s"}` : "—"}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="!h-9 !px-3 text-xs"
                          disabled={busy}
                          onClick={() => openDepartmentEditor(department)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="!h-9 !px-3 text-xs"
                          disabled={busy}
                          onClick={() => setDepStatusTarget(department)}
                        >
                          {enabled ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
        )}

        {tab === "designations" && (
        <CrudPanel
          title={`Roles & Designations (${designations.data.length})`}
          subtitle="Job roles, titles, bands, and owning department."
          icon={<BadgeCheck size={20} />}
          addLabel="Add Role / Designation"
          hook={wrappedDesignations}
          hideDelete
          automationScope="hr-org-designation"
          statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: designations.setStatus }}
          fields={[
            { key: "name", label: "Role / Designation" },
            { key: "code", label: "Code" },
            {
              key: "hrDepartmentUid",
              label: "Department",
              type: "async-select",
              placeholder: "Select department",
              options: designationDepartmentOptions.map((department) => ({
                value: department.id,
                label: department.name || "",
              })).filter((option) => option.label),
              loading: departments.loading,
              hasMore: designationDepartmentPage + 1 < departments.totalPages,
              onLoadMore: () => setDesignationDepartmentPage((page) =>
                page + 1 < departments.totalPages ? page + 1 : page
              ),
              searchValue: departmentSearch,
              onSearchChange: setDepartmentSearch,
            },
            { key: "orgLevelUid", label: "Level / Band", type: "select", options: levels.data.map((l) => ({ value: l.id, label: l.label ? `L${l.levelNo} - ${l.label}` : `L${l.levelNo}` })) },
            { key: "description", label: "Description", type: "textarea", full: true },
          ]}
          columns={[
            { label: "Role / Designation", render: (r) => <b>{r.name as string}</b> },
            { label: "Code", render: (r) => (r.code as string) || "-" },
            { label: "Department", render: (r) => designationDepartmentOptions.find((d) => d.id === r.hrDepartmentUid)?.name || (r.hrDepartment as string) || (r.department as string) || "-" },
            { label: "Level", render: (r) => {
              const byUid = levels.data.find((l) => l.id === r.orgLevelUid);
              const byNo = !byUid && r.level != null ? levels.data.find((l) => l.levelNo === r.level) : null;
              const found = byUid || byNo;
              return found ? (found.label ? `L${found.levelNo} - ${found.label}` : `L${found.levelNo}`) : (r.level != null ? `L${r.level}` : "-");
            } },
          ]}
          viewMode={designationsView}
          onViewModeChange={setDesignationsView}
          viewScope="hr-org-designations-view"
          tableContainerClassName="overflow-hidden rounded-[12px] border border-[#d7e3f1] bg-white shadow-none"
          tableClassName="min-w-[720px] [&_thead_tr]:border-[#d7e3f1] [&_tbody_tr]:border-[#d7e3f1] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.08em] [&_thead_th]:text-[#587398] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-4 [&_tbody_td]:text-sm [&_tbody_td]:font-medium"
          cardGridClassName="grid gap-3 p-[14px] md:grid-cols-2 xl:grid-cols-3"
          cardTitle={(row) => row.name as ReactNode}
          cardRows={(row) => [
            { label: "Code", value: (row.code as string) || "-" },
            { label: "Department", value: designationDepartmentOptions.find((d) => d.id === row.hrDepartmentUid)?.name || (row.hrDepartment as string) || (row.department as string) || "-" },
            { label: "Level", value: row.level != null ? `L${row.level}` : "-" },
          ]}
          emptyText="No designations yet."
        />
        )}

        {tab === "branches" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
              <div style={{ height: 44, width: 44, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPinned size={20} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.4px", color: "var(--dark-text)", margin: 0 }}>
                  Branches ({branches.length})
                </h2>
                <p style={{ ...lbl, marginTop: 2 }}>Office locations from the base organization setup</p>
              </div>
            </div>
            {!isMobile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", minHeight: 44 }}>
                <ViewToggle value={areaManagersView} onChange={setAreaManagersView} scope="hr-org-branches-view" />
              </div>
            ) : null}
          </div>
          {branchesAdmin.readOnlyNote ? (
            <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 12, background: "rgba(17,94,89,0.06)", border: "1px solid rgba(17,94,89,0.14)", color: TEAL, fontSize: 12.5 }}>
              {branchesAdmin.readOnlyNote}
            </div>
          ) : null}
          {branchesAdmin.error && <ErrBar text={branchesAdmin.error} />}
          {areaMgrs.error && <ErrBar text={areaMgrs.error} />}
          <SectionCard className={isMobile && areaManagersView === "cards" ? "overflow-visible border-0 bg-transparent shadow-none" : "overflow-hidden border-slate-200 shadow-sm"} padding={false}>
            {branchesAdmin.loading || areaMgrs.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : areaManagersView === "table" ? (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                  <thead>
                    <tr>
                      <th style={th}>Location</th>
                      <th style={th}>Address</th>
                      <th style={th}>Coordinates</th>
                      <th style={th}>Assigned</th>
                      <th style={{ ...th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.length === 0 ? <EmptyTableRow colSpan={5} icon={<MapPinned size={34} strokeWidth={1.5} />} title="No branches available" description="Base organization locations will appear here once they are configured." /> : branches.map((branch) => {
                      const assignments = branchAssignments.get(branch.id) ?? [];
                      const coordinates = branch.latitude != null && branch.longitude != null ? `${branch.latitude}, ${branch.longitude}` : "-";
                      const expanded = isBranchExpanded(branch.id);
                      return (
                        <Fragment key={branch.id}>
                          <tr
                            onClick={() => toggleBranchExpanded(branch.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <td style={{ ...td, fontWeight: 800 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button
                                  type="button"
                                  aria-label={expanded ? `Collapse ${branch.name}` : `Expand ${branch.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleBranchExpanded(branch.id);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    border: "1px solid rgba(148,163,184,0.22)",
                                    background: "var(--surface-bg)",
                                    color: "var(--light-text)",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                  }}
                                >
                                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                <div style={{ display: "grid", gap: 4 }}>
                                  <span>{branch.name}</span>
                                  <span style={{ ...lbl, fontSize: 8.5 }}>{branch.code || "Location"}</span>
                                </div>
                              </div>
                            </td>
                            <td style={td}>{branch.address || "-"}</td>
                            <td style={td}>{coordinates}</td>
                            <td style={td}>
                              <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: TEAL, background: "rgba(17,94,89,0.08)" }}>
                                {assignments.length} assigned
                              </span>
                            </td>
                            <td style={{ ...td, textAlign: "right" }}>
                              <Button id={`hr-org-branch-assign-${branch.id}`} data-testid={`hr-org-branch-assign-${branch.id}`} size="sm" onClick={(event) => {
                                event.stopPropagation();
                                setAm({ managerEmployeeUids: [], locationUid: branch.id });
                                assignEmployeeOptions.onSearchChange("");
                                setAmOpen(true);
                              }}>
                                Assign Employee
                              </Button>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={5} style={{ ...td, paddingTop: expanded ? 0 : 0, paddingBottom: expanded ? 13 : 0, background: "rgba(148,163,184,0.03)", borderTop: "none" }}>
                              {!expanded ? null : (
                              <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 16, overflow: "hidden", background: "var(--surface-bg)" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr) auto", gap: 16, padding: "12px 16px", background: "rgba(148,163,184,0.05)", ...lbl }}>
                                  <span>Assigned Employees</span>
                                  <span>Employee ID</span>
                                  <span style={{ textAlign: "right" }}>Actions</span>
                                </div>
                                {assignments.length === 0 ? (
                                  <OrgEmptyState
                                    icon={<MapPinned size={28} strokeWidth={1.5} />}
                                    title="No employees assigned"
                                    description="Assigned employees for this branch will appear here."
                                  />
                                ) : assignments.map((assignment, index) => (
                                  <div
                                    key={assignment.id}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr) auto",
                                      gap: 16,
                                      alignItems: "center",
                                      padding: "14px 16px",
                                      borderTop: index === 0 ? "1px solid rgba(148,163,184,0.12)" : "1px solid rgba(148,163,184,0.12)",
                                    }}
                                  >
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>{assignment.managerName || employeeName(assignment.managerEmployeeUid)}</div>
                                    <div style={{ fontSize: 12.5, color: "var(--light-text)" }}>{employeeCode(assignment.managerEmployeeUid)}</div>
                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                      <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Remove this assignment?")) void act(() => areaMgrs.remove(assignment.id)); }}>
                                        <Trash2 size={15} />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              )}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 max-[767px]:p-0 xl:grid-cols-2">
                {branches.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <OrgEmptyState
                      icon={<MapPinned size={34} strokeWidth={1.5} />}
                      title="No branches available"
                      description="Base organization locations will appear here once they are configured."
                    />
                  </div>
                ) : branches.map((branch) => {
                  const assignments = branchAssignments.get(branch.id) ?? [];
                  const coordinates = branch.latitude != null && branch.longitude != null ? `${branch.latitude}, ${branch.longitude}` : "-";
                  const expanded = isBranchExpanded(branch.id);
                  return (
                    <article
                      key={branch.id}
                      className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_70%,white)] bg-[var(--color-surface)] p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <button
                            type="button"
                            aria-label={expanded ? `Collapse ${branch.name}` : `Expand ${branch.name}`}
                            onClick={() => toggleBranchExpanded(branch.id)}
                            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                          >
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-semibold text-[var(--color-text-primary)]">{branch.name}</div>
                            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                              {branch.code || "Location"}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => {
                          setAm({ managerEmployeeUids: [], locationUid: branch.id });
                          assignEmployeeOptions.onSearchChange("");
                          setAmOpen(true);
                        }}>
                          Assign Employee
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_35%,white)] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Address</div>
                          <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{branch.address || "-"}</div>
                        </div>
                        <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_35%,white)] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Coordinates</div>
                          <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{coordinates}</div>
                        </div>
                      </div>
                      {!expanded ? null : <div className="mt-4 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Assigned Employees</div>
                          <span className="rounded-full bg-[rgba(17,94,89,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]">
                            {assignments.length}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {assignments.length === 0 ? (
                            <OrgEmptyState
                              icon={<MapPinned size={28} strokeWidth={1.5} />}
                              title="No employees assigned"
                              description="Assigned employees for this branch will appear here."
                            />
                          ) : assignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_60%,white)] bg-[var(--color-surface)] px-3 py-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                                  {assignment.managerName || employeeName(assignment.managerEmployeeUid)}
                                </div>
                                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                                  {employeeCode(assignment.managerEmployeeUid)}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Remove this assignment?")) void act(() => areaMgrs.remove(assignment.id)); }}>
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>}
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
        )}

        {tab === "positions" && (
        <div>
          <SectionHeader
            label="Seats allocated per role across branches, departments, and shifts."
            action={
              <div className="flex w-full items-center justify-between gap-3 flex-wrap sm:w-auto sm:justify-end" style={{ minHeight: 44 }}>
                <Button id="hr-org-position-add" data-testid="hr-org-position-add" icon={<Plus size={15} />} onClick={() => { setPosEditing(null); setPos({ designationUid: "", departmentUid: "", locationUid: "", sanctionedCount: "" }); setPosOpen(true); }}>
                  Allocate Headcount
                </Button>
                <div className="ml-auto shrink-0">
                  <ViewToggle value={positionsView} onChange={setPositionsView} scope="hr-org-positions-view" />
                </div>
              </div>
            }
          />
          {positions.error && <ErrBar text={positions.error} />}
          <div>
            {positions.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : positionsView === "table" ? (
              <DataTable
                data={positions.data}
                columns={positionColumns}
                getRowId={(row) => row.id}
                className="border border-slate-200 rounded-[12px] shadow-sm bg-white overflow-hidden"
                emptyState={
                  <OrgEmptyState
                    icon={<Briefcase size={34} strokeWidth={1.5} />}
                    title="No positions found"
                    description="Configured positions for each branch will appear here."
                    className="py-10"
                  />
                }
              />
            ) : (
              <div className="grid gap-3 p-[14px] md:grid-cols-2 xl:grid-cols-3">
                {positions.data.length === 0 ? (
                  <OrgEmptyState
                    icon={<Briefcase size={34} strokeWidth={1.5} />}
                    title="No positions found"
                    description="Configured positions for each branch will appear here."
                  />
                ) : positions.data.map((p) => (
                  <div
                    key={p.id}
                    className="grid gap-4 rounded-[18px] border border-[#d7e3f1] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-extrabold text-[var(--dark-text)]">
                          {p.designationName || designationName(p.designationUid) || "Headcount"}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587398]">
                          Seat Allocation
                        </div>
                      </div>
                      <div className="rounded-full border border-[rgba(17,94,89,0.14)] bg-[rgba(17,94,89,0.06)] px-3 py-1 text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#587398]">Sanctioned</div>
                        <div className="text-sm font-black text-[var(--primary-color)]">{p.sanctionedCount ?? "-"}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[14px] border border-[#e5edf6] bg-[#f8fbff] px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#587398]">Department</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--dark-text)]">
                          {p.departmentName || departmentName(p.departmentUid)}
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[#e5edf6] bg-[#f8fbff] px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#587398]">Branch</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--dark-text)]">
                          {p.locationName || branchName(p.locationUid)}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#e5edf6] pt-3">
                      <Button variant="ghost" size="icon" onClick={() => { setPosEditing(p.id); setPos({ designationUid: p.designationUid || "", departmentUid: p.departmentUid || "", locationUid: p.locationUid || "", sanctionedCount: p.sanctionedCount != null ? String(p.sanctionedCount) : "" }); setPosOpen(true); }}><Pencil size={15} /></Button>
                      <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this allocated seat?")) void act(() => positions.remove(p.id)); }}><Trash2 size={15} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {tab === "levels" && (
        <div>
          <PanelHeader
            title={`Seniority Bands (Levels) (${levels.data.length})`}
            subtitle="Labels for hierarchy levels used in org chart and approvals."
            icon={<Layers size={20} />}
            action={
              <div className="flex w-full items-center justify-between gap-3 flex-wrap sm:w-auto sm:justify-end" style={{ minHeight: 44 }}>
                <Button id="hr-org-levels-add" data-testid="hr-org-levels-add" icon={<Plus size={15} />} onClick={() => { setLvlEditing(null); setLvl({ levelNo: "", label: "" }); setLvlOpen(true); }}>
                  Add Level
                </Button>
                <div className="ml-auto shrink-0">
                  <ViewToggle value={levelsView} onChange={setLevelsView} scope="hr-org-levels-view" />
                </div>
              </div>
            }
          />
          {levels.error && <ErrBar text={levels.error} />}
          <div>
            {levels.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : levelsView === "table" ? (
              <DataTable
                data-testid="hr-org-level"
                data={levels.data}
                columns={levelColumns}
                getRowId={(row) => row.id}
                className="border border-slate-200 rounded-[12px] shadow-sm bg-white overflow-hidden"
                emptyState={
                  <OrgEmptyState
                    icon={<Layers size={34} strokeWidth={1.5} />}
                    title="No levels defined"
                    description="Hierarchy level labels will appear here once they are configured."
                    className="py-10"
                  />
                }
              />
            ) : (
              <div className="grid gap-3 p-[14px] md:grid-cols-2 xl:grid-cols-3">
                {levels.data.length === 0 ? (
                  <OrgEmptyState
                    icon={<Layers size={34} strokeWidth={1.5} />}
                    title="No levels defined"
                    description="Hierarchy level labels will appear here once they are configured."
                  />
                ) : levels.data.map((l) => (
                  <div key={l.id} data-testid={`hr-org-level-card-${l.id}`}>
                  <MobileCard
                    title={<span style={{ color: TEAL }}>L{l.levelNo}</span>}
                    rows={[{ label: "Label", value: l.label || "-" }]}
                    footer={
                      <>
                        <Button id={`hr-org-level-card-edit-${l.id}`} data-testid={`hr-org-level-card-edit-${l.id}`} variant="ghost" size="icon" disabled={busy} onClick={() => { setLvlEditing(l.id); setLvl({ levelNo: String(l.levelNo ?? ""), label: l.label || "" }); setLvlOpen(true); }}><Pencil size={15} /></Button>
                      </>
                    }
                  />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {tab === "transfers" && (
        <div>
          <SectionHeader
            label="Schedule branch, department, shift, and reporting changes."
            action={
              <div className="flex w-full items-center justify-between gap-3 flex-wrap sm:w-auto sm:justify-end">
                <Button id="hr-org-transfer-open" data-testid="hr-org-transfer-open" icon={<Plus size={15} />} onClick={() => { setTr({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" }); setTrOpen(true); }}>
                  Schedule Transfer
                </Button>
                <div className="ml-auto shrink-0">
                  <ViewToggle value={transfersView} onChange={setTransfersView} scope="hr-org-transfers-view" />
                </div>
              </div>
            }
          />
          {transfers.error && <ErrBar text={transfers.error} />}
          <div style={{ ...card, border: "1px solid #d7e3f1", borderRadius: 12, background: "#fff" }}>
            {transfers.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : transfersView === "table" ? (
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead><tr><th style={{ ...th, color: "#587398", borderBottom: "1px solid #d7e3f1", background: "#fff", borderTopLeftRadius: 12 }}>Employee</th><th style={{ ...th, color: "#587398", borderBottom: "1px solid #d7e3f1", background: "#fff" }}>Changes</th><th style={{ ...th, color: "#587398", borderBottom: "1px solid #d7e3f1", background: "#fff" }}>Effective</th><th style={{ ...th, color: "#587398", borderBottom: "1px solid #d7e3f1", background: "#fff" }}>Status</th><th style={{ ...th, textAlign: "right", color: "#587398", borderBottom: "1px solid #d7e3f1", background: "#fff", borderTopRightRadius: 12 }}>Actions</th></tr></thead>
                <tbody>
                  {transfers.data.length === 0 ? <EmptyTableRow colSpan={5} icon={<ArrowLeftRight size={34} strokeWidth={1.5} />} title="No transfers found" description="Scheduled branch, department, shift, and reporting changes will appear here." /> : transfers.data.map((t) => {
                    const changes = [];
                    if (t.toLocationUid) changes.push(`Branch -> ${branchName(t.toLocationUid)}`);
                    if (t.toDepartmentUid) changes.push(`Dept -> ${departmentName(t.toDepartmentUid)}`);
                    if (t.toShiftUid) changes.push(`Shift -> ${shiftName(t.toShiftUid)}`);
                    if (t.toManagerUid) changes.push(`Mgr -> ${t.toManagerName || t.toManagerUid}`);
                    const isLastRow = transfers.data[transfers.data.length - 1]?.id === t.id;
                    return (
                      <tr key={t.id}>
                        <td style={{ ...td, fontWeight: 800, borderTop: "1px solid #d7e3f1", borderBottom: isLastRow ? "none" : undefined, borderBottomLeftRadius: isLastRow ? 12 : undefined }}>{t.employeeName || t.employeeUid}</td>
                        <td style={{ ...td, borderTop: "1px solid #d7e3f1", borderBottom: isLastRow ? "none" : undefined }}>{changes.length > 0 ? changes.join(", ") : "-"}</td>
                        <td style={{ ...td, borderTop: "1px solid #d7e3f1", borderBottom: isLastRow ? "none" : undefined }}>{t.effectiveDate || "-"}</td>
                        <td style={{ ...td, borderTop: "1px solid #d7e3f1", borderBottom: isLastRow ? "none" : undefined }}>{statusPill(t.status)}</td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", borderTop: "1px solid #d7e3f1", borderBottom: isLastRow ? "none" : undefined, borderBottomRightRadius: isLastRow ? 12 : undefined }}>
                          {t.status === "Scheduled" ? (
                            <>
                              <Button id={`hr-org-transfer-effect-${t.id}`} data-testid={`hr-org-transfer-effect-${t.id}`} variant="ghost" size="icon" title="Effect now" disabled={busy} onClick={() => setTransferToEffect(t)}><Play size={15} /></Button>
                              <Button id={`hr-org-transfer-cancel-${t.id}`} data-testid={`hr-org-transfer-cancel-${t.id}`} variant="ghost" size="icon" title="Cancel" style={{ color: "#e11d48" }} disabled={busy} onClick={() => setTransferToCancel(t)}><X size={15} /></Button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="grid gap-3 p-[14px] md:grid-cols-2 xl:grid-cols-3">
                {transfers.data.length === 0 ? (
                  <OrgEmptyState
                    icon={<ArrowLeftRight size={34} strokeWidth={1.5} />}
                    title="No transfers found"
                    description="Scheduled branch, department, shift, and reporting changes will appear here."
                  />
                ) : transfers.data.map((t) => {
                  const changes = [];
                  if (t.toLocationUid) changes.push(`Branch -> ${branchName(t.toLocationUid)}`);
                  if (t.toDepartmentUid) changes.push(`Dept -> ${departmentName(t.toDepartmentUid)}`);
                  if (t.toShiftUid) changes.push(`Shift -> ${shiftName(t.toShiftUid)}`);
                  if (t.toManagerUid) changes.push(`Mgr -> ${t.toManagerName || t.toManagerUid}`);
                  return (
                    <MobileCard
                      key={t.id}
                      title={t.employeeName || t.employeeUid || "Transfer"}
                      rows={[
                        { label: "Changes", value: changes.length > 0 ? changes.join(", ") : "-" },
                        { label: "Effective", value: t.effectiveDate || "-" },
                        { label: "Status", value: statusPill(t.status) },
                      ]}
                      footer={t.status === "Scheduled" ? (
                        <>
                          <Button id={`hr-org-transfer-effect-card-${t.id}`} data-testid={`hr-org-transfer-effect-card-${t.id}`} variant="ghost" size="icon" title="Effect now" disabled={busy} onClick={() => setTransferToEffect(t)}><Play size={15} /></Button>
                          <Button id={`hr-org-transfer-cancel-card-${t.id}`} data-testid={`hr-org-transfer-cancel-card-${t.id}`} variant="ghost" size="icon" title="Cancel" style={{ color: "#e11d48" }} disabled={busy} onClick={() => setTransferToCancel(t)}><X size={15} /></Button>
                        </>
                      ) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <Dialog
        open={posOpen}
        onClose={() => setPosOpen(false)}
        title={posEditing ? "Edit Headcount" : "Add Headcount"}
        size="md"
        testId="hr-org-headcount-modal"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const selectedDesignation = designations.data.find((item) => item.id === pos.designationUid);
              const selectedDepartment = departments.data.find((item) => item.id === pos.departmentUid);
              const selectedBranch = branches.find((item) => item.id === pos.locationUid);
              const payload = {
                designationUid: pos.designationUid,
                designationName: selectedDesignation?.name || "",
                departmentUid: pos.departmentUid,
                departmentName: selectedDepartment?.name || "",
                locationUid: pos.locationUid,
                locationName: selectedBranch?.name || "",
                sanctionedCount: Number(pos.sanctionedCount),
              };
              if (posEditing) await positions.update(posEditing, payload);
              else await positions.create(payload);
              setPosOpen(false);
            }, `Position ${posEditing ? "updated" : "created"} successfully.`);
          }}
          className="space-y-4"
          data-testid="hr-org-headcount-form"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="hr-org-position-designation"
              testId="hr-org-position-designation"
              label="Designation"
              required
              value={pos.designationUid}
              onChange={(e) => setPos({ ...pos, designationUid: e.target.value })}
              options={[{ value: "", label: "Select Designation..." }, ...designations.data.map((d) => ({ value: d.id, label: d.name }))]}
            />
            <Select
              id="hr-org-position-department"
              testId="hr-org-position-department"
              label="Department"
              required
              value={pos.departmentUid}
              onChange={(e) => setPos({ ...pos, departmentUid: e.target.value })}
              options={[{ value: "", label: "Select Department..." }, ...departments.data.map((d) => ({ value: d.id, label: d.name }))]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="hr-org-position-branch"
              testId="hr-org-position-branch"
              label="Branch"
              required
              value={pos.locationUid}
              onChange={(e) => setPos({ ...pos, locationUid: e.target.value })}
              options={[{ value: "", label: "Select Branch..." }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            />
            <Input
              id="hr-org-position-count"
              data-testid="hr-org-position-count"
              label="Sanctioned Count"
              type="number"
              min={1}
              required
              value={pos.sanctionedCount}
              onChange={(e) => setPos({ ...pos, sanctionedCount: e.target.value })}
              placeholder="e.g. 5"
            />
          </div>

          <DialogFooter>
            <Button
              id="hr-org-position-modal-cancel"
              data-testid="hr-org-position-modal-cancel"
              variant="outline"
              type="button"
              onClick={() => setPosOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              id="hr-org-position-modal-submit"
              data-testid="hr-org-position-modal-submit"
              variant="primary"
              type="submit"
              disabled={busy || !pos.designationUid || !pos.departmentUid || !pos.locationUid || !pos.sanctionedCount}
              loading={busy}
            >
              {posEditing ? "Save Changes" : "Add Headcount"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {depOpen && (
        <Modal
          testId="hr-org-department-modal"
          title={depEditing ? "Edit Department" : "Add Department"}
          onClose={() => setDepOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDepOpen(false)}>Cancel</Button>
              <Button
                id="hr-org-department-save"
                data-testid="hr-org-department-save"
                disabled={busy || !dep.name.trim()}
                loading={busy}
                onClick={() => act(async () => {
                  const payload = { name: dep.name.trim(), code: dep.code.trim() || null };
                  if (depEditing) await departments.update(depEditing, payload);
                  else await departments.create(payload);
                  setDepOpen(false);
                }, `Department ${depEditing ? "updated" : "created"} successfully.`)}
              >
                {depEditing ? "Save" : "Create"}
              </Button>
            </>
          }
        >
          <Input id="hr-org-department-name" data-testid="hr-org-department-name" label="Department Name" value={dep.name} onChange={(e) => setDep({ ...dep, name: e.target.value })} />
          <Input id="hr-org-department-code" data-testid="hr-org-department-code" label="Code" value={dep.code} onChange={(e) => setDep({ ...dep, code: e.target.value })} />
        </Modal>
      )}

      {depStatusTarget && (
        <Modal
          title={`${isDepartmentEnabled(depStatusTarget) ? "Disable" : "Enable"} Department`}
          onClose={() => {
            if (!busy) setDepStatusTarget(null);
          }}
          footer={
            <>
              <Button
                id="hr-org-department-status-cancel"
                data-testid="hr-org-department-status-cancel"
                variant="secondary"
                disabled={busy}
                onClick={() => setDepStatusTarget(null)}
              >
                Cancel
              </Button>
              <Button
                id="hr-org-department-status-confirm"
                data-testid="hr-org-department-status-confirm"
                loading={busy}
                onClick={confirmDepartmentStatusChange}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p
            id="hr-org-department-status-message"
            data-testid="hr-org-department-status-message"
            style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--dark-text)" }}
          >
            Are you sure you want to {isDepartmentEnabled(depStatusTarget) ? "disable" : "enable"} this department?
          </p>
        </Modal>
      )}

      {lvlOpen && (
        <Modal
          testId="hr-org-level-modal"
          title={lvlEditing ? "Edit Level" : "Add Level"}
          onClose={() => setLvlOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setLvlOpen(false)}>Cancel</Button>
              <Button id="hr-org-level-save" data-testid="hr-org-level-save" disabled={busy || !lvl.label.trim() || !lvl.levelNo} loading={busy} onClick={() => act(async () => {
                const payload = { levelNo: Number(lvl.levelNo), label: lvl.label.trim() };
                if (lvlEditing) await levels.update(lvlEditing, payload);
                else await levels.create(payload);
                setLvlOpen(false);
              }, `Seniority level ${lvlEditing ? "updated" : "created"} successfully.`)}>{lvlEditing ? "Save" : "Create"}</Button>
            </>
          }
        >
          <Input id="hr-org-level-number" data-testid="hr-org-level-number" label="Level Number" type="number" value={lvl.levelNo} onChange={(e) => setLvl({ ...lvl, levelNo: e.target.value })} placeholder="matches employee hierarchyLevel" />
          <Input id="hr-org-level-label" data-testid="hr-org-level-label" label="Label" value={lvl.label} onChange={(e) => setLvl({ ...lvl, label: e.target.value })} placeholder="e.g. Business Head" />
        </Modal>
      )}

      {amOpen && (
        <Modal
          title="Assign Employees to Branch"
          testId="hr-org-assign-modal"
          onClose={() => !busy && setAmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAmOpen(false)} disabled={busy}>Cancel</Button>
              <Button
                id="hr-org-assign-submit"
                data-testid="hr-org-assign-submit"
                disabled={busy || am.managerEmployeeUids.length === 0 || !am.locationUid}
                loading={busy}
                onClick={() => act(async () => {
                  await areaMgrs.createMany(am.managerEmployeeUids, am.locationUid);
                  setAmOpen(false);
                }, `${am.managerEmployeeUids.length} employee${am.managerEmployeeUids.length === 1 ? "" : "s"} assigned to branch successfully.`)}
              >
                Assign {am.managerEmployeeUids.length || ""}
              </Button>
            </>
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">Select Employees</div>
              <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {am.managerEmployeeUids.length} selected
              </div>
            </div>
            {am.managerEmployeeUids.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setAm({ ...am, managerEmployeeUids: [] })}>
                Clear
              </Button>
            )}
          </div>
          <Input
            id="hr-org-assign-search"
            data-testid="hr-org-assign-search"
            value={assignEmployeeOptions.searchValue}
            onChange={(event) => assignEmployeeOptions.onSearchChange(event.target.value)}
            placeholder="Search by name, ID or email"
          />
          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            {assignEmployeeOptions.loading && assignableEmployees.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                Loading employees...
              </div>
            ) : assignableEmployees.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                No employees found.
              </div>
            ) : assignableEmployees.map((employee) => {
              const selected = am.managerEmployeeUids.includes(employee.id);
              return (
                <label
                  key={employee.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--color-surface-secondary)]"
                >
                  <Checkbox
                    id={`hr-org-assign-employee-${employee.id}`}
                    data-testid={`hr-org-assign-employee-${employee.id}`}
                    checked={selected}
                    aria-label={`Select ${employee.name}`}
                    onChange={() => setAm({
                      ...am,
                      managerEmployeeUids: selected
                        ? am.managerEmployeeUids.filter((uid) => uid !== employee.id)
                        : [...am.managerEmployeeUids, employee.id],
                    })}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {employee.name || "Unnamed employee"}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                      {[employee.employeeId, employee.email].filter(Boolean).join(" · ") || "No employee ID"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Modal>
      )}

      <Dialog
        open={trOpen}
        onClose={() => setTrOpen(false)}
        title="Schedule Transfer"
        size="lg"
        testId="hr-org-transfer-modal"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await transfers.create({
                employeeUid: tr.employeeUid,
                toLocationUid: tr.toLocationUid || null,
                toDepartmentUid: tr.toDepartmentUid || null,
                toShiftUid: tr.toShiftUid || null,
                toManagerUid: tr.toManagerUid || null,
                effectiveDate: tr.effectiveDate,
                reason: tr.reason || null,
              });
              setTrOpen(false);
            }, "Employee transfer scheduled successfully.");
          }}
          className="space-y-4"
          data-testid="hr-org-transfer-form"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox
              id="hr-org-transfer-employee"
              data-testid="hr-org-transfer-employee"
              label="Employee to Transfer"
              value={tr.employeeUid}
              onValueChange={(employeeUid) => setTr({ ...tr, employeeUid })}
              placeholder="Select employee"
              searchPlaceholder="Search employees..."
              searchValue={transferEmployeeOptions.searchValue}
              onSearchChange={transferEmployeeOptions.onSearchChange}
              loading={transferEmployeeOptions.loading}
              hasMore={transferEmployeeOptions.hasMore}
              onEndReached={transferEmployeeOptions.onLoadMore}
              options={transferEmployeeOptions.data.map((employee) => ({
                value: employee.id,
                label: employee.name,
                description: [employee.employeeId, employee.department].filter(Boolean).join(" · ") || undefined,
              }))}
            />
            <Input
              id="hr-org-transfer-effective-date"
              data-testid="hr-org-transfer-effective-date"
              label="Effective Date"
              type="date"
              required
              value={tr.effectiveDate}
              onChange={(e) => setTr({ ...tr, effectiveDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="hr-org-transfer-branch"
              testId="hr-org-transfer-branch"
              label="To Branch (optional)"
              value={tr.toLocationUid}
              onChange={(e) => setTr({ ...tr, toLocationUid: e.target.value })}
              options={[{ value: "", label: "No branch change" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            />
            <Select
              id="hr-org-transfer-department"
              testId="hr-org-transfer-department"
              label="To Department (optional)"
              value={tr.toDepartmentUid}
              onChange={(e) => setTr({ ...tr, toDepartmentUid: e.target.value })}
              options={[{ value: "", label: "No department change" }, ...departments.data.map((d) => ({ value: d.id, label: String(d.name) }))]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="hr-org-transfer-shift"
              testId="hr-org-transfer-shift"
              label="To Shift (optional)"
              value={tr.toShiftUid}
              onChange={(e) => setTr({ ...tr, toShiftUid: e.target.value })}
              options={[{ value: "", label: "No shift change" }, ...shifts.data.map((s) => ({ value: s.id, label: String(s.name) }))]}
            />
            <Select
              id="hr-org-transfer-manager"
              testId="hr-org-transfer-manager"
              label="To Manager (optional)"
              value={tr.toManagerUid}
              onChange={(e) => setTr({ ...tr, toManagerUid: e.target.value })}
              options={[{ value: "", label: "No manager change" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]}
            />
          </div>

          <Textarea
            id="hr-org-transfer-reason"
            data-testid="hr-org-transfer-reason"
            label="Reason"
            rows={3}
            value={tr.reason}
            onChange={(e) => setTr({ ...tr, reason: e.target.value })}
            placeholder="Reason for transfer..."
          />

          <DialogFooter>
            <Button
              id="hr-org-transfer-modal-cancel"
              data-testid="hr-org-transfer-modal-cancel"
              variant="outline"
              type="button"
              onClick={() => setTrOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              id="hr-org-transfer-schedule"
              data-testid="hr-org-transfer-schedule"
              variant="primary"
              type="submit"
              disabled={busy || !tr.employeeUid || !tr.effectiveDate || (!tr.toLocationUid && !tr.toManagerUid && !tr.toDepartmentUid && !tr.toShiftUid)}
              loading={busy}
            >
              Schedule Transfer
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog
        open={!!transferToEffect}
        onClose={() => { if (!busy) setTransferToEffect(null); }}
        closeOnOutsideClick={false}
        title="Confirm Employee Transfer"
        size="sm"
        testId="hr-org-transfer-effect-dialog"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Apply the scheduled transfer for <strong className="text-[var(--color-text-primary)]">{transferToEffect?.employeeName || transferToEffect?.employeeUid || "this employee"}</strong> now? The employee’s assigned organization details will be updated immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setTransferToEffect(null)} disabled={busy}>
              Go Back
            </Button>
            <Button
              data-testid="hr-org-transfer-effect-confirm"
              variant="primary"
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => {
                if (!transferToEffect) return;
                const transferUid = transferToEffect.id;
                void act(() => transfers.effect(transferUid), "Transfer applied successfully.").then(() => setTransferToEffect(null));
              }}
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog
        open={!!transferToCancel}
        onClose={() => { if (!busy) setTransferToCancel(null); }}
        title="Cancel Scheduled Transfer"
        size="sm"
        testId="hr-org-transfer-cancel-dialog"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Cancel the scheduled transfer for <strong className="text-[var(--color-text-primary)]">{transferToCancel?.employeeName || transferToCancel?.employeeUid || "this employee"}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setTransferToCancel(null)} disabled={busy}>
              Keep Transfer
            </Button>
            <Button
              id="hr-org-transfer-cancel-confirm"
              data-testid="hr-org-transfer-cancel-confirm"
              variant="danger"
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => {
                if (!transferToCancel) return;
                const transferUid = transferToCancel.id;
                void act(() => transfers.cancel(transferUid), "Transfer cancelled.").then(() => setTransferToCancel(null));
              }}
            >
              Cancel Transfer
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </section>
  );
}

function viewToggleButton(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    border: "none",
    justifyContent: "center",
    height: 32,
    width: 32,
    borderRadius: 7,
    cursor: "pointer",
    background: active ? "var(--primary-color)" : "transparent",
    color: active ? "white" : "var(--light-text)",
  };
}

const tabBar: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  minWidth: "max-content",
  borderBottom: "1px solid #e2e8f0",
};

function tabButton(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0.625rem 1rem",
    border: "none",
    borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    background: "transparent",
    color: active ? "#4f46e5" : "rgb(107 114 128 / 1)",
    marginBottom: -1,
    transitionProperty: "color, background-color, border-color, text-decoration-color, fill, stroke",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDuration: "150ms",
  };
}
