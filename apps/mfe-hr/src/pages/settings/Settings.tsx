import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, FolderTree, TrendingUp, BadgeCheck, Sliders, Clock, GitBranch, Palmtree, CalendarDays, Fingerprint, Banknote, MoreHorizontal, LayoutDashboard, UserCheck } from "lucide-react";
import { Popover } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { TEAL, card } from "./SettingsComponents";
import {
  CompanySettingsPage,
  DepartmentsSettingsPage,
  DesignationsSettingsPage,
  LeavePolicySettingsPage,
  HolidaySettingsPage,
  AttendanceSettingsPage,
  PayrollSettingsPage,
  LevelsSettingsPage,
} from "./settingsPages";
import ApprovalsPanel from "./ApprovalsPanel";
import PolicyRules from "./PolicyRules";
import ShiftsManager from "./ShiftsManager";

const SECTIONS = [
  { key: "company", label: "Company Profile", icon: <Building2 size={18} /> },
  { key: "departments", label: "Departments", icon: <FolderTree size={18} /> },
  { key: "levels", label: "Seniority Bands (Levels)", icon: <TrendingUp size={18} /> },
  { key: "designations", label: "Roles & Designations", icon: <BadgeCheck size={18} /> },
  { key: "policyrules", label: "Policy Rules", icon: <Sliders size={18} /> },
  { key: "shifts", label: "Shifts & Rotations", icon: <Clock size={18} /> },
  { key: "approvals", label: "Approval Chains", icon: <GitBranch size={18} /> },
  { key: "leavetypes", label: "Leave Policy", icon: <Palmtree size={18} /> },
  { key: "holidays", label: "Holiday Calendar", icon: <CalendarDays size={18} /> },
  { key: "attendance", label: "Attendance Rules", icon: <Fingerprint size={18} /> },
  { key: "payroll", label: "Payroll Settings", icon: <Banknote size={18} /> },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];
const MAIN_MOBILE_SECTION_KEYS: SectionKey[] = ["company", "departments", "attendance", "payroll"];
const SETTINGS_ICON_COLORS: Record<SectionKey, string> = {
  company: "#0f766e",
  departments: "#2563eb",
  levels: "#7c3aed",
  designations: "#db2777",
  policyrules: "#ea580c",
  shifts: "#0891b2",
  approvals: "#4f46e5",
  leavetypes: "#16a34a",
  holidays: "#dc2626",
  attendance: "#9333ea",
  payroll: "#ca8a04",
};

const SECTION_CONTENT: Record<SectionKey, () => JSX.Element> = {
  company: CompanySettingsPage,
  departments: DepartmentsSettingsPage,
  levels: LevelsSettingsPage,
  designations: DesignationsSettingsPage,
  policyrules: PolicyRules,
  shifts: ShiftsManager,
  approvals: ApprovalsPanel,
  leavetypes: LeavePolicySettingsPage,
  holidays: HolidaySettingsPage,
  attendance: AttendanceSettingsPage,
  payroll: PayrollSettingsPage,
};

export default function Settings() {
  const { section: routeSection } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const section = SECTIONS.some(({ key }) => key === routeSection) ? routeSection as SectionKey : "company";
  const [menuOpen, setMenuOpen] = useState(false);
  const ActiveSection = SECTION_CONTENT[section];
  const activeSectionItem = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];
  const mainMobileSections = SECTIONS.filter((item) => MAIN_MOBILE_SECTION_KEYS.includes(item.key));
  const moreMobileSections = SECTIONS.filter((item) => !MAIN_MOBILE_SECTION_KEYS.includes(item.key));
  const isMoreSectionActive = moreMobileSections.some((item) => item.key === section);

  const navigateToSection = (nextSection: SectionKey) => {
    navigate(`/settings/${nextSection}`);
    setMenuOpen(false);
  };

  return (
    <section id="hr-settings-page" data-testid="hr-settings-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0, overflow: "visible" }}>
      <div className="hidden md:block">
        <PageHeader
          title="Settings"
          subtitle="Organization configuration and HR policy control"
        />
      </div>

      <div style={{ alignItems: "start" }} className="grid grid-cols-1 md:grid-cols-[215px_1fr] gap-5">
        <nav id="hr-settings-sections" data-testid="hr-settings-sections" style={{ ...card, padding: 6, position: "sticky", top: 0 }} className="hidden md:block">
          {SECTIONS.map((item) => (
            <button key={item.key} id={`hr-settings-section-${item.key}`} data-testid={`hr-settings-section-${item.key}`} data-active={section === item.key ? "true" : "false"} onClick={() => navigateToSection(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, background: section === item.key ? "rgba(17,94,89,0.08)" : "transparent", color: section === item.key ? TEAL : "var(--dark-text)", fontWeight: section === item.key ? 700 : 500, fontSize: 13 }}>
              <span style={{ color: section === item.key ? TEAL : "var(--light-text)" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ minWidth: 0 }}>
          <ActiveSection />
        </div>
      </div>

      <nav className="mobile-bottom-nav settings-mobile-bottom-nav" aria-label="Settings mobile navigation" data-testid="hr-settings-mobile-footer">
        {mainMobileSections.map((item) => (
          <button key={item.key} type="button" className="mobile-bottom-nav__item" data-active={section === item.key} onClick={() => navigateToSection(item.key)}>
            <span className="mobile-bottom-nav__icon" style={{ color: SETTINGS_ICON_COLORS[item.key] }}>{item.icon}</span>
            <span className="mobile-bottom-nav__label">{item.label.replace(" Profile", "")}</span>
          </button>
        ))}
        <Popover
          portal
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="top"
          align="end"
          contentClassName="!w-60 !max-h-[70vh] !overflow-y-auto !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 !z-[9999]"
          trigger={
            <button type="button" className="mobile-bottom-nav__item" data-active={isMoreSectionActive} aria-label="More settings sections">
              <span className="mobile-bottom-nav__icon" style={{ color: "#64748b" }}><MoreHorizontal size={18} /></span>
              <span className="mobile-bottom-nav__label">{isMoreSectionActive ? activeSectionItem.label : "More"}</span>
            </button>
          }
        >
          <div className="flex w-full flex-col py-1">
            <div className="border-b border-[var(--border-color)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)]">More Settings</div>
            {moreMobileSections.map((item) => (
              <button key={item.key} type="button" onClick={() => navigateToSection(item.key)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-xs font-bold hover:bg-[var(--primary-light)]" style={{ color: section === item.key ? TEAL : "var(--dark-text)", background: section === item.key ? "rgba(17,94,89,0.06)" : "transparent", border: "none" }}>
                <span style={{ color: SETTINGS_ICON_COLORS[item.key] }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div className="mt-1 border-t border-[var(--border-color)] pt-1">
              <button type="button" id="hr-settings-mobile-back-dashboard" data-testid="hr-settings-mobile-back-dashboard" onClick={() => { navigate("/"); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-xs font-bold text-[var(--primary-color)] hover:bg-[var(--primary-light)]" style={{ border: "none", background: "transparent" }}>
                <LayoutDashboard size={18} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </Popover>
      </nav>
    </section>
  );
}
