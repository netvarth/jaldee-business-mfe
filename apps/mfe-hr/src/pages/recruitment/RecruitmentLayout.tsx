import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader, Tabs } from "@jaldee/design-system";
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
  const currentPath = location.pathname.replace(/\/+$/, "") || "/recruitment";
  const activeTab = TABS.find((tab) => currentPath === tab.path)?.value ?? "dashboard";

  useEffect(() => {
    trackPageView(`/hr${currentPath}`);
  }, [currentPath, trackPageView]);

  return (
    <section
      id="hr-recruitment-section"
      data-testid="hr-recruitment-section"
      className="flex h-full min-h-0 flex-col bg-[var(--app-bg)] text-[var(--color-text-primary)]"
    >
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <PageHeader title={title} subtitle={subtitle} />
        <Tabs
          className="mt-5"
          value={activeTab}
          items={TABS.map(({ value, label }) => ({ value, label }))}
          onValueChange={(value) => {
            const next = TABS.find((tab) => tab.value === value);
            if (next) navigate(next.path);
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
