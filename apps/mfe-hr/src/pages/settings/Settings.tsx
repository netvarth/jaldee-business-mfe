import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Users2, BadgeCheck, Clock, CalendarDays, Plane, Fingerprint, Wallet, MoreVertical, Layers } from "lucide-react";
import { Popover } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { TEAL, card } from "./SettingsComponents";
import {
  CompanySettingsPage,
  DepartmentsSettingsPage,
  DesignationsSettingsPage,
  ShiftsSettingsPage,
  LeavePolicySettingsPage,
  HolidaySettingsPage,
  AttendanceSettingsPage,
  PayrollSettingsPage,
  LevelsSettingsPage,
} from "./settingsPages";

const SECTIONS = [
  { key: "company", label: "Company Profile", icon: <Building2 size={18} /> },
  { key: "departments", label: "Departments", icon: <Users2 size={18} /> },
  { key: "levels", label: "Seniority Bands (Levels)", icon: <Layers size={18} /> },
  { key: "designations", label: "Roles & Designations", icon: <BadgeCheck size={18} /> },
  { key: "shifts", label: "Shifts", icon: <Clock size={18} /> },
  { key: "leavetypes", label: "Leave Policy", icon: <Plane size={18} /> },
  { key: "holidays", label: "Holiday Calendar", icon: <CalendarDays size={18} /> },
  { key: "attendance", label: "Attendance Rules", icon: <Fingerprint size={18} /> },
  { key: "payroll", label: "Payroll Settings", icon: <Wallet size={18} /> },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

const SECTION_CONTENT: Record<SectionKey, () => JSX.Element> = {
  company: CompanySettingsPage,
  departments: DepartmentsSettingsPage,
  levels: LevelsSettingsPage,
  designations: DesignationsSettingsPage,
  shifts: ShiftsSettingsPage,
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

  const navigateToSection = (nextSection: SectionKey) => {
    navigate(`/settings/${nextSection}`);
    setMenuOpen(false);
  };

  return (
    <section id="hr-settings-page" data-testid="hr-settings-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0, overflow: "visible" }}>
      <PageHeader
        title="Settings"
        subtitle="Organization configuration and HR policy control"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex md:hidden items-center">
              <Popover
                portal
                open={menuOpen}
                onOpenChange={setMenuOpen}
                placement="bottom"
                align="end"
                contentClassName="!w-56 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
                trigger={
                  <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer" }} className="p-2 hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-colors flex items-center justify-center text-[var(--light-text)]" aria-label="Toggle settings menu">
                    <MoreVertical size={20} />
                  </button>
                }
              >
                <div className="flex flex-col w-full">
                  {SECTIONS.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => navigateToSection(item.key)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[rgba(17,94,89,0.04)]"
                      style={{ color: section === item.key ? TEAL : "var(--dark-text)", background: section === item.key ? "rgba(17,94,89,0.04)" : "transparent", border: "none", cursor: "pointer" }}
                    >
                      <span style={{ color: section === item.key ? TEAL : "var(--light-text)" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </Popover>
            </div>
          </div>
        }
      />

      <div style={{ alignItems: "start" }} className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-7">
        <nav id="hr-settings-sections" data-testid="hr-settings-sections" style={{ ...card, padding: 8, position: "sticky", top: 0 }} className="hidden md:block">
          {SECTIONS.map((item) => (
            <button key={item.key} id={`hr-settings-section-${item.key}`} data-testid={`hr-settings-section-${item.key}`} data-active={section === item.key ? "true" : "false"} onClick={() => navigateToSection(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, background: section === item.key ? "rgba(17,94,89,0.08)" : "transparent", color: section === item.key ? TEAL : "var(--dark-text)", fontWeight: section === item.key ? 800 : 600, fontSize: 13.5 }}>
              <span style={{ color: section === item.key ? TEAL : "var(--light-text)" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ minWidth: 0 }}>
          <ActiveSection />
        </div>
      </div>
    </section>
  );
}
