import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Layers,
  MapPinned,
  ArrowLeftRight,
  Gauge,
  Plus,
  X,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  Play,
  LayoutGrid,
  MoreVertical,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, Button, Input, Popover, Select, Textarea } from "@jaldee/design-system";
import { usePositions, useHierarchyLevels, useAreaManagers, useTransfers } from "../../services/useOrg";
import { useEmployees } from "../../services/useEmployees";
import { useBranches } from "../../services/useBranches";
import { useDepartments, useDesignations, useBranchesAdmin, useShifts } from "../../services/useSettingsData";
import { CrudPanel } from "../../components/CrudPanel";
import OrgChartTab from "./OrgChartTab";
import HeadcountDashboardTab from "./HeadcountDashboardTab";

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", ...lbl, background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto" };

type Tab = "chart" | "headcount" | "departments" | "designations" | "branches" | "positions" | "levels" | "areamgr" | "transfers";
type ViewMode = "table" | "cards";

const ORG_ROUTES: Array<{ key: Tab; route: string; label: string; Icon: LucideIcon }> = [
  { key: "chart", route: "chart", label: "Org Chart", Icon: MapPinned },
  { key: "headcount", route: "headcount", label: "Headcount & Norms", Icon: Gauge },
  { key: "departments", route: "departments", label: "Departments", Icon: Briefcase },
  { key: "designations", route: "designations", label: "Job Roles (Designations)", Icon: Briefcase },
  { key: "branches", route: "branches", label: "Branches", Icon: MapPinned },
  { key: "positions", route: "positions", label: "Headcount Planning (Seats)", Icon: Briefcase },
  { key: "levels", route: "levels", label: "Seniority Bands (Levels)", Icon: Layers },
  { key: "areamgr", route: "area-managers", label: "Branch Assignments", Icon: MapPinned },
  { key: "transfers", route: "transfers", label: "Transfers", Icon: ArrowLeftRight },
];

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function orgRouteState(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const orgIndex = segments.lastIndexOf("org");
  const orgSegments = orgIndex >= 0 ? segments.slice(orgIndex + 1) : segments;
  const tabSegment = orgSegments[0];
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

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>{footer}</div>
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 999, border: "1px solid var(--border-color)", background: "var(--surface-bg)" }}>
      <button
        id={`${scope}-table`}
        data-testid={`${scope}-table`}
        type="button"
        onClick={() => onChange("table")}
        style={viewToggleButton(value === "table")}
      >
        <Rows3 size={14} /> Table
      </button>
      <button
        id={`${scope}-cards`}
        data-testid={`${scope}-cards`}
        type="button"
        onClick={() => onChange("cards")}
        style={viewToggleButton(value === "cards")}
      >
        <LayoutGrid size={14} /> Cards
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <span style={lbl}>{label}</span>
      {action}
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

function EmptyTableRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} style={{ ...td, textAlign: "center", ...lbl, padding: 32 }}>{text}</td></tr>;
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
  const routeState = useMemo(() => orgRouteState(location.pathname), [location.pathname]);
  const tab = routeState.tab;

  const positions = usePositions();
  const levels = useHierarchyLevels();
  const areaMgrs = useAreaManagers();
  const transfers = useTransfers();
  const departments = useDepartments();
  const designations = useDesignations();
  const branchesAdmin = useBranchesAdmin();
  const shifts = useShifts();
  const { data: employees } = useEmployees();
  const { data: branches } = useBranches();

  const [positionsView, setPositionsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [levelsView, setLevelsView] = useState<ViewMode>(() => getPreferredViewMode());
  const [areaManagersView, setAreaManagersView] = useState<ViewMode>(() => getPreferredViewMode());
  const [transfersView, setTransfersView] = useState<ViewMode>(() => getPreferredViewMode());
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false));
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => {
      setIsMobile(media.matches);
      const next = media.matches ? "cards" : "table";
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
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid.slice(0, 8) : "All branches");
  }, [branches]);

  const designationName = useMemo(() => {
    const m = new Map(designations.data.map((d) => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Unknown");
  }, [designations.data]);

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
  const [pos, setPos] = useState({ designationUid: "", departmentUid: "", shiftUid: "", locationUid: "", sanctionedCount: "" });

  const [lvlOpen, setLvlOpen] = useState(false);
  const [lvlEditing, setLvlEditing] = useState<string | null>(null);
  const [lvl, setLvl] = useState({ levelNo: "", label: "" });

  const [amOpen, setAmOpen] = useState(false);
  const [am, setAm] = useState({ managerEmployeeUid: "", locationUid: "" });

  const [trOpen, setTrOpen] = useState(false);
  const [tr, setTr] = useState({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" });

  const goToTab = (nextTab: Tab) => {
    const route = ORG_ROUTES.find((item) => item.key === nextTab)?.route || "chart";
    navigate(`/org/${route}`);
    setMsg(null);
  };

  return (
    <section className="page-section active hr-page-shell">
      <div style={{ marginBottom: 20 }}>
        <PageHeader title="Org Structure" subtitle="Positions, seniority levels, branch coverage, transfers, and workforce norms." />
      </div>

      <div className="attendance-tabs-mobile" style={{ alignItems: "center", gap: 12, padding: "6px 8px 6px 16px", marginBottom: 16 }}>
        <div
          className="attendance-tabs-mobile__active"
          onClick={() => setMobileTabsOpen(true)}
          style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
        >
          <span>{ORG_ROUTES.find((item) => item.key === tab)?.label || "Org Chart"}</span>
        </div>

        <Popover
          portal
          open={mobileTabsOpen}
          onOpenChange={setMobileTabsOpen}
          placement="bottom"
          align="end"
          contentClassName="!w-64 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
          trigger={
            <button
              type="button"
              className="attendance-tabs-mobile__trigger"
              onClick={() => setMobileTabsOpen((openState) => !openState)}
              aria-label="Open org structure tabs"
              style={{ margin: 0 }}
            >
              <MoreVertical size={18} />
            </button>
          }
        >
          <div className="attendance-tabs-mobile__menu">
            {ORG_ROUTES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className="attendance-tabs-mobile__menu-item"
                data-active={tab === key}
                onClick={() => {
                  goToTab(key);
                  setMobileTabsOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Popover>
      </div>

      <div className="attendance-tabs-desktop" style={{ overflowX: "auto", paddingBottom: 4, marginBottom: 24 }}>
        <div style={tabBar}>
          {ORG_ROUTES.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => goToTab(key)} data-active={tab === key ? "true" : "false"} style={tabButton(tab === key)}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && <ErrBar text={msg} />}

      {tab === "chart" && <OrgChartTab />}
      {tab === "headcount" && (
        <HeadcountDashboardTab
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
        <CrudPanel
          title="Departments"
          subtitle="Organizational units"
          icon={<Briefcase size={20} />}
          addLabel="Add Department"
          hook={departments}
          fields={[{ key: "name", label: "Department Name" }, { key: "code", label: "Code" }]}
          columns={[{ label: "Name", render: (r) => <b>{r.name as string}</b> }, { label: "Code", render: (r) => (r.code as string) || "-" }]}
        />
      )}

      {tab === "designations" && (
        <CrudPanel
          title="Roles & Designations"
          subtitle="Job roles, titles, bands, and owning department."
          icon={<Briefcase size={20} />}
          addLabel="Add Role / Designation"
          hook={designations}
          fields={[
            { key: "name", label: "Role / Designation" },
            { key: "code", label: "Code" },
            { key: "department", label: "Department", type: "select", options: departments.data.map((d) => (d.name as string)).filter(Boolean) },
            { key: "level", label: "Level / Band", type: "number" },
            { key: "description", label: "Description", type: "textarea", full: true },
          ]}
          columns={[
            { label: "Role / Designation", render: (r) => <b>{r.name as string}</b> },
            { label: "Code", render: (r) => (r.code as string) || "-" },
            { label: "Department", render: (r) => (r.department as string) || "-" },
            { label: "Level", render: (r) => (r.level != null ? `L${r.level}` : "-") },
          ]}
        />
      )}

      {tab === "branches" && (
        <CrudPanel
          title="Branches"
          subtitle="Office locations from the base organization setup."
          icon={<MapPinned size={20} />}
          addLabel="Add Branch"
          hook={branchesAdmin}
          readOnly={branchesAdmin.readOnlyNote}
          fields={[]}
          columns={[
            { label: "Name", render: (r) => <b>{r.name as string}</b> },
            { label: "Address", render: (r) => (r.address as string) || "-" },
            { label: "Coordinates", render: (r) => (r.latitude != null ? `${r.latitude}, ${r.longitude}` : "-") },
          ]}
        />
      )}

      {tab === "positions" && (
        <div>
          <SectionHeader
            label="Seats allocated per role across branches, departments, and shifts."
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!isMobile ? <ViewToggle value={positionsView} onChange={setPositionsView} scope="hr-org-positions-view" /> : null}
                <Button icon={<Plus size={15} />} onClick={() => { setPosEditing(null); setPos({ designationUid: "", departmentUid: "", shiftUid: "", locationUid: "", sanctionedCount: "" }); setPosOpen(true); }}>
                  Allocate Headcount
                </Button>
              </div>
            }
          />
          {positions.error && <ErrBar text={positions.error} />}
          <div style={card}>
            {positions.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : positionsView === "table" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Job Role</th><th style={th}>Branch</th><th style={th}>Department</th><th style={th}>Shift</th><th style={th}>Sanctioned</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {positions.data.length === 0 ? <EmptyTableRow colSpan={6} text="No headcount allocated." /> : positions.data.map((p) => (
                    <tr key={p.id}>
                      <td style={{ ...td, fontWeight: 800 }}>{designationName(p.designationUid)}</td>
                      <td style={td}>{branchName(p.locationUid)}</td>
                      <td style={td}>{departmentName(p.departmentUid)}</td>
                      <td style={td}>{shiftName(p.shiftUid)}</td>
                      <td style={{ ...td, fontWeight: 800, color: TEAL }}>{p.sanctionedCount ?? "-"}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <Button variant="ghost" size="icon" onClick={() => { setPosEditing(p.id); setPos({ designationUid: p.designationUid || "", departmentUid: p.departmentUid || "", shiftUid: p.shiftUid || "", locationUid: p.locationUid || "", sanctionedCount: p.sanctionedCount != null ? String(p.sanctionedCount) : "" }); setPosOpen(true); }}><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this allocated seat?")) void act(() => positions.remove(p.id)); }}><Trash2 size={15} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {positions.data.length === 0 ? <div style={{ ...lbl, textAlign: "center", padding: 18 }}>No headcount allocated.</div> : positions.data.map((p) => (
                  <MobileCard
                    key={p.id}
                    title={designationName(p.designationUid)}
                    rows={[
                      { label: "Branch", value: branchName(p.locationUid) },
                      { label: "Department", value: departmentName(p.departmentUid) },
                      { label: "Shift", value: shiftName(p.shiftUid) },
                      { label: "Sanctioned", value: <span style={{ color: TEAL }}>{p.sanctionedCount ?? "-"}</span> },
                    ]}
                    footer={
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setPosEditing(p.id); setPos({ designationUid: p.designationUid || "", departmentUid: p.departmentUid || "", shiftUid: p.shiftUid || "", locationUid: p.locationUid || "", sanctionedCount: p.sanctionedCount != null ? String(p.sanctionedCount) : "" }); setPosOpen(true); }}><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this allocated seat?")) void act(() => positions.remove(p.id)); }}><Trash2 size={15} /></Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "levels" && (
        <div>
          <SectionHeader
            label="Labels for hierarchy levels used in org chart and approvals."
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!isMobile ? <ViewToggle value={levelsView} onChange={setLevelsView} scope="hr-org-levels-view" /> : null}
                <Button icon={<Plus size={15} />} onClick={() => { setLvlEditing(null); setLvl({ levelNo: "", label: "" }); setLvlOpen(true); }}>
                  Add Level
                </Button>
              </div>
            }
          />
          {levels.error && <ErrBar text={levels.error} />}
          <div style={card}>
            {levels.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : levelsView === "table" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Level</th><th style={th}>Label</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {levels.data.length === 0 ? <EmptyTableRow colSpan={3} text="No levels defined." /> : levels.data.map((l) => (
                    <tr key={l.id}>
                      <td style={{ ...td, fontWeight: 900, color: TEAL }}>L{l.levelNo}</td>
                      <td style={{ ...td, fontWeight: 800 }}>{l.label}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <Button variant="ghost" size="icon" onClick={() => { setLvlEditing(l.id); setLvl({ levelNo: String(l.levelNo ?? ""), label: l.label || "" }); setLvlOpen(true); }}><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this level label?")) void act(() => levels.remove(l.id)); }}><Trash2 size={15} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {levels.data.length === 0 ? <div style={{ ...lbl, textAlign: "center", padding: 18 }}>No levels defined.</div> : levels.data.map((l) => (
                  <MobileCard
                    key={l.id}
                    title={<span style={{ color: TEAL }}>L{l.levelNo}</span>}
                    rows={[{ label: "Label", value: l.label || "-" }]}
                    footer={
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setLvlEditing(l.id); setLvl({ levelNo: String(l.levelNo ?? ""), label: l.label || "" }); setLvlOpen(true); }}><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Delete this level label?")) void act(() => levels.remove(l.id)); }}><Trash2 size={15} /></Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "areamgr" && (
        <div>
          <SectionHeader
            label="Map employees to branches for dashboards and routing."
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!isMobile ? <ViewToggle value={areaManagersView} onChange={setAreaManagersView} scope="hr-org-area-managers-view" /> : null}
                <Button icon={<Plus size={15} />} onClick={() => { setAm({ managerEmployeeUid: "", locationUid: "" }); setAmOpen(true); }}>
                  Map Employee
                </Button>
              </div>
            }
          />
          {areaMgrs.error && <ErrBar text={areaMgrs.error} />}
          <div style={card}>
            {areaMgrs.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : areaManagersView === "table" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Employee</th><th style={th}>Branch</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {areaMgrs.data.length === 0 ? <EmptyTableRow colSpan={3} text="No mappings yet." /> : areaMgrs.data.map((m) => (
                    <tr key={m.id}>
                      <td style={{ ...td, fontWeight: 800 }}>{m.managerName || m.managerEmployeeUid}</td>
                      <td style={td}>{branchName(m.locationUid)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Remove this mapping?")) void act(() => areaMgrs.remove(m.id)); }}><Trash2 size={15} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {areaMgrs.data.length === 0 ? <div style={{ ...lbl, textAlign: "center", padding: 18 }}>No mappings yet.</div> : areaMgrs.data.map((m) => (
                  <MobileCard
                    key={m.id}
                    title={m.managerName || m.managerEmployeeUid || "Employee"}
                    rows={[{ label: "Branch", value: branchName(m.locationUid) }]}
                    footer={<Button variant="ghost" size="icon" style={{ color: "#e11d48" }} onClick={() => { if (confirm("Remove this mapping?")) void act(() => areaMgrs.remove(m.id)); }}><Trash2 size={15} /></Button>}
                  />
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!isMobile ? <ViewToggle value={transfersView} onChange={setTransfersView} scope="hr-org-transfers-view" /> : null}
                <Button icon={<Plus size={15} />} onClick={() => { setTr({ employeeUid: "", toLocationUid: "", toDepartmentUid: "", toShiftUid: "", toManagerUid: "", effectiveDate: "", reason: "" }); setTrOpen(true); }}>
                  Schedule Transfer
                </Button>
              </div>
            }
          />
          {transfers.error && <ErrBar text={transfers.error} />}
          <div style={card}>
            {transfers.loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : transfersView === "table" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Employee</th><th style={th}>Changes</th><th style={th}>Effective</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {transfers.data.length === 0 ? <EmptyTableRow colSpan={5} text="No transfers." /> : transfers.data.map((t) => {
                    const changes = [];
                    if (t.toLocationUid) changes.push(`Branch -> ${branchName(t.toLocationUid)}`);
                    if (t.toDepartmentUid) changes.push(`Dept -> ${departmentName(t.toDepartmentUid)}`);
                    if (t.toShiftUid) changes.push(`Shift -> ${shiftName(t.toShiftUid)}`);
                    if (t.toManagerUid) changes.push(`Mgr -> ${t.toManagerName || t.toManagerUid}`);
                    return (
                      <tr key={t.id}>
                        <td style={{ ...td, fontWeight: 800 }}>{t.employeeName || t.employeeUid}</td>
                        <td style={td}>{changes.length > 0 ? changes.join(", ") : "-"}</td>
                        <td style={td}>{t.effectiveDate || "-"}</td>
                        <td style={td}>{statusPill(t.status)}</td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          {t.status === "Scheduled" ? (
                            <>
                              <Button variant="ghost" size="icon" title="Effect now" disabled={busy} onClick={() => act(() => transfers.effect(t.id))}><Play size={15} /></Button>
                              <Button variant="ghost" size="icon" title="Cancel" style={{ color: "#e11d48" }} disabled={busy} onClick={() => { if (confirm("Cancel this transfer?")) void act(() => transfers.cancel(t.id)); }}><X size={15} /></Button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "grid", gap: 12, padding: 14 }}>
                {transfers.data.length === 0 ? <div style={{ ...lbl, textAlign: "center", padding: 18 }}>No transfers.</div> : transfers.data.map((t) => {
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
                          <Button variant="ghost" size="icon" title="Effect now" disabled={busy} onClick={() => act(() => transfers.effect(t.id))}><Play size={15} /></Button>
                          <Button variant="ghost" size="icon" title="Cancel" style={{ color: "#e11d48" }} disabled={busy} onClick={() => { if (confirm("Cancel this transfer?")) void act(() => transfers.cancel(t.id)); }}><X size={15} /></Button>
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

      {posOpen && (
        <Modal
          title={posEditing ? "Edit Headcount Seat" : "Allocate Headcount Seat"}
          onClose={() => setPosOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPosOpen(false)}>Cancel</Button>
              <Button disabled={busy || !pos.designationUid || !pos.locationUid || !pos.sanctionedCount} loading={busy} onClick={() => act(async () => {
                const payload = { designationUid: pos.designationUid, departmentUid: pos.departmentUid || null, shiftUid: pos.shiftUid || null, locationUid: pos.locationUid, sanctionedCount: Number(pos.sanctionedCount) };
                if (posEditing) await positions.update(posEditing, payload);
                else await positions.create(payload);
                setPosOpen(false);
              })}>{posEditing ? "Save" : "Create"}</Button>
            </>
          }
        >
          <Select label="Job Role (Designation)" value={pos.designationUid} onChange={(e) => setPos({ ...pos, designationUid: e.target.value })} options={[{ value: "", label: "Select Job Role..." }, ...designations.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="Branch" value={pos.locationUid} onChange={(e) => setPos({ ...pos, locationUid: e.target.value })} options={[{ value: "", label: "Select Branch..." }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <Select label="Department (Optional)" value={pos.departmentUid} onChange={(e) => setPos({ ...pos, departmentUid: e.target.value })} options={[{ value: "", label: "Global / Multi-department" }, ...departments.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="Shift (Optional)" value={pos.shiftUid} onChange={(e) => setPos({ ...pos, shiftUid: e.target.value })} options={[{ value: "", label: "Any Shift" }, ...shifts.data.map((s) => ({ value: s.id, label: String(s.name) }))]} />
          <Input label="Sanctioned Count" type="number" value={pos.sanctionedCount} onChange={(e) => setPos({ ...pos, sanctionedCount: e.target.value })} />
        </Modal>
      )}

      {lvlOpen && (
        <Modal
          title={lvlEditing ? "Edit Level" : "Add Level"}
          onClose={() => setLvlOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setLvlOpen(false)}>Cancel</Button>
              <Button disabled={busy || !lvl.label.trim() || !lvl.levelNo} loading={busy} onClick={() => act(async () => {
                const payload = { levelNo: Number(lvl.levelNo), label: lvl.label.trim() };
                if (lvlEditing) await levels.update(lvlEditing, payload);
                else await levels.create(payload);
                setLvlOpen(false);
              })}>{lvlEditing ? "Save" : "Create"}</Button>
            </>
          }
        >
          <Input label="Level Number" type="number" value={lvl.levelNo} onChange={(e) => setLvl({ ...lvl, levelNo: e.target.value })} placeholder="matches employee hierarchyLevel" />
          <Input label="Label" value={lvl.label} onChange={(e) => setLvl({ ...lvl, label: e.target.value })} placeholder="e.g. Business Head" />
        </Modal>
      )}

      {amOpen && (
        <Modal
          title="Map Employee to Branch"
          onClose={() => setAmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAmOpen(false)}>Cancel</Button>
              <Button disabled={busy || !am.managerEmployeeUid || !am.locationUid} loading={busy} onClick={() => act(async () => {
                await areaMgrs.create({ managerEmployeeUid: am.managerEmployeeUid, locationUid: am.locationUid });
                setAmOpen(false);
              })}>Save</Button>
            </>
          }
        >
          <Select label="Employee" value={am.managerEmployeeUid} onChange={(e) => setAm({ ...am, managerEmployeeUid: e.target.value })} options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Select label="Branch" value={am.locationUid} onChange={(e) => setAm({ ...am, locationUid: e.target.value })} options={[{ value: "", label: "Select branch" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        </Modal>
      )}

      {trOpen && (
        <Modal
          title="Schedule Transfer"
          onClose={() => setTrOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setTrOpen(false)}>Cancel</Button>
              <Button disabled={busy || !tr.employeeUid || !tr.effectiveDate || (!tr.toLocationUid && !tr.toManagerUid && !tr.toDepartmentUid && !tr.toShiftUid)} loading={busy} onClick={() => act(async () => {
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
              })}>Schedule</Button>
            </>
          }
        >
          <Select label="Employee to Transfer" value={tr.employeeUid} onChange={(e) => setTr({ ...tr, employeeUid: e.target.value })} options={[{ value: "", label: "Select employee" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Select label="To Branch (optional)" value={tr.toLocationUid} onChange={(e) => setTr({ ...tr, toLocationUid: e.target.value })} options={[{ value: "", label: "No branch change" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <Select label="To Department (optional)" value={tr.toDepartmentUid} onChange={(e) => setTr({ ...tr, toDepartmentUid: e.target.value })} options={[{ value: "", label: "No department change" }, ...departments.data.map((d) => ({ value: d.id, label: String(d.name) }))]} />
          <Select label="To Shift (optional)" value={tr.toShiftUid} onChange={(e) => setTr({ ...tr, toShiftUid: e.target.value })} options={[{ value: "", label: "No shift change" }, ...shifts.data.map((s) => ({ value: s.id, label: String(s.name) }))]} />
          <Select label="To Manager (optional)" value={tr.toManagerUid} onChange={(e) => setTr({ ...tr, toManagerUid: e.target.value })} options={[{ value: "", label: "No manager change" }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
          <Input label="Effective Date" type="date" value={tr.effectiveDate} onChange={(e) => setTr({ ...tr, effectiveDate: e.target.value })} />
          <Textarea label="Reason" rows={3} value={tr.reason} onChange={(e) => setTr({ ...tr, reason: e.target.value })} />
        </Modal>
      )}
    </section>
  );
}

function viewToggleButton(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "var(--primary-color)" : "transparent",
    color: active ? "white" : "var(--light-text)",
  };
}

const tabBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--border-color)",
  minWidth: "max-content",
};

function tabButton(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
    padding: "12px 8px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 13,
    fontWeight: 800,
    background: "none",
    color: active ? "var(--primary-color)" : "var(--light-text)",
    borderBottom: active ? "2px solid var(--primary-color)" : "2px solid transparent",
    marginBottom: -1,
  };
}
