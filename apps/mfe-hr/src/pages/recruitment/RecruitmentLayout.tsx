import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { Popover, Tabs } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { useTelemetry } from "../../services/useTelemetry";

interface RecruitmentLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const TABS = [
  { value: "dashboard", label: "Overview", path: "/recruitment" },
  { value: "requisitions", label: "Requisitions", path: "/recruitment/requisitions" },
  { value: "candidates", label: "Candidates", path: "/recruitment/candidates" },
  { value: "applications", label: "Applications", path: "/recruitment/applications" },
  { value: "interviews", label: "Interviews", path: "/recruitment/interviews" },
  { value: "offers", label: "Offers", path: "/recruitment/offers" },
  { value: "careers", label: "Careers", path: "/recruitment/careers" },
];

export default function RecruitmentLayout({ title, subtitle, children }: RecruitmentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackPageView } = useTelemetry();
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const currentPath = location.pathname.replace(/\/+$/, "") || "/recruitment";
  const activeTab = TABS.find((tab) => currentPath === tab.path)?.value ?? "dashboard";

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
      <div className="attendance-tabs-mobile" style={{ alignItems: "center", gap: 12, padding: "6px 8px 6px 16px", marginBottom: 16 }}>
        <div
          className="attendance-tabs-mobile__active"
          onClick={() => setMobileTabsOpen(true)}
          style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
        >
          <span>{TABS.find((tab) => tab.value === activeTab)?.label || "Overview"}</span>
        </div>

        <Popover
          portal
          open={mobileTabsOpen}
          onOpenChange={setMobileTabsOpen}
          placement="bottom"
          align="end"
          contentClassName="!w-56 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
          trigger={
            <button
              type="button"
              className="attendance-tabs-mobile__trigger"
              onClick={() => setMobileTabsOpen((open) => !open)}
              aria-label="Open recruitment tabs"
              style={{ margin: 0 }}
            >
              <MoreVertical size={18} />
            </button>
          }
        >
          <div className="attendance-tabs-mobile__menu">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className="attendance-tabs-mobile__menu-item"
                data-active={activeTab === tab.value}
                onClick={() => {
                  navigate(tab.path);
                  setMobileTabsOpen(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Popover>
      </div>
      <Tabs
        className="attendance-tabs-desktop mb-6"
        value={activeTab}
        items={TABS.map(({ value, label }) => ({ value, label }))}
        onValueChange={(value) => {
          const next = TABS.find((tab) => tab.value === value);
          if (next) navigate(next.path);
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
