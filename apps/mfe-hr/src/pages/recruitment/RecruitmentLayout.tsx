import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Users,
  CalendarClock,
  Layers,
  Award,
  Globe,
  MoreHorizontal,
  Home,
} from "lucide-react";
import { Popover, Tabs } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { useTelemetry } from "../../services/useTelemetry";

interface RecruitmentLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const TABS = [
  { value: "dashboard", label: "Overview", path: "/recruitment", icon: BarChart3 },
  { value: "requisitions", label: "Requisitions", path: "/recruitment/requisitions", icon: Briefcase },
  { value: "candidates", label: "Candidates", path: "/recruitment/candidates", icon: Users },
  { value: "interviews", label: "Interviews", path: "/recruitment/interviews", icon: CalendarClock },
  { value: "applications", label: "Applications", path: "/recruitment/applications", icon: Layers },
  { value: "offers", label: "Offers", path: "/recruitment/offers", icon: Award },
  { value: "careers", label: "Careers", path: "/recruitment/careers", icon: Globe },
];

const MAIN_TABS = TABS.slice(0, 4);
const MORE_TABS = TABS.slice(4);

export default function RecruitmentLayout({ title, subtitle, children }: RecruitmentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackPageView } = useTelemetry();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const currentPath = location.pathname.replace(/\/+$/, "") || "/recruitment";
  const activeTab = TABS.find((tab) => currentPath === tab.path)?.value ?? "dashboard";
  const activeTabObj = TABS.find((tab) => tab.value === activeTab);
  const isMoreActive = MORE_TABS.some((tab) => tab.value === activeTab);

  useEffect(() => {
    trackPageView(`/hr${currentPath}`);
  }, [currentPath, trackPageView]);

  return (
    <section
      id="hr-recruitment-section"
      data-testid="hr-recruitment-section"
      className="page-section active hr-page-shell text-[var(--color-text-primary)]"
    >
      <PageHeader title={title} subtitle={subtitle} />

      <Tabs
        className="attendance-tabs-desktop mb-6"
        value={activeTab}
        items={TABS.map(({ value, label }) => ({ value, label }))}
        onValueChange={(value) => {
          const next = TABS.find((tab) => tab.value === value);
          if (next) navigate(next.path);
        }}
      />

      {/* MOBILE BOTTOM FOOTER NAV */}
      <nav
        id="hr-recruitment-tabs-mobile-footer"
        data-testid="hr-recruitment-tabs-mobile-footer"
        className="mobile-bottom-nav"
        aria-label="Recruitment mobile navigation"
      >
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              id={`hr-recruitment-tab-mobile-${tab.value}`}
              data-testid={`hr-recruitment-tab-mobile-${tab.value}`}
              className="mobile-bottom-nav__item"
              data-active={isActive}
              onClick={() => navigate(tab.path)}
            >
              <span className="mobile-bottom-nav__icon">
                <Icon size={18} />
              </span>
              <span className="mobile-bottom-nav__label">{tab.label}</span>
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
          contentClassName="!w-48 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
          trigger={
            <button
              type="button"
              id="hr-recruitment-tab-mobile-more"
              data-testid="hr-recruitment-tab-mobile-more"
              className="mobile-bottom-nav__item"
              data-active={isMoreActive}
              onClick={() => setMoreMenuOpen((open) => !open)}
            >
              <span className="mobile-bottom-nav__icon">
                <MoreHorizontal size={18} />
              </span>
              <span className="mobile-bottom-nav__label">
                {isMoreActive ? activeTabObj?.label || "More" : "More"}
              </span>
            </button>
          }
        >
          <div className="flex flex-col w-full py-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)] border-b border-[var(--border-color)]">
              More Sections
            </div>
            {MORE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  id={`hr-recruitment-tab-mobile-${tab.value}`}
                  data-testid={`hr-recruitment-tab-mobile-${tab.value}`}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors"
                  style={{
                    color: isActive ? "var(--primary-color)" : "var(--dark-text)",
                    background: isActive ? "rgba(17,94,89,0.06)" : "transparent",
                  }}
                  onClick={() => {
                    navigate(tab.path);
                    setMoreMenuOpen(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <div className="pt-1 mt-1 border-t border-[var(--border-color)]">
              <button
                type="button"
                id="hr-recruitment-tab-mobile-home"
                data-testid="hr-recruitment-tab-mobile-home"
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
