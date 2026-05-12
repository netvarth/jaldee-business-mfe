import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useSharedNavigate } from "../useSharedNavigate";
import { GeneratedReportsList } from "./components/GeneratedReportsList";
import { GeneratedReportDetail } from "./components/GeneratedReportDetail";
import { ReportCreate } from "./components/ReportCreate";
import { ReportsCatalog } from "./components/ReportsCatalog";
import type { ReportsViewKey } from "./types";

export function ReportsModule() {
  const { routeParams, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const view = (routeParams?.view ?? "catalog") as ReportsViewKey;

  if (view === "generated" || view === "report-list") {
    return <GeneratedReportsList backHref={basePath} />;
  }

  if (view === "generated-report" && routeParams?.subview) {
    return <GeneratedReportDetail token={decodeURIComponent(routeParams.subview)} backHref={`${basePath}/generated`} />;
  }

  if (view === "create" && routeParams?.subview) {
    return (
      <ReportCreate
        reportType={decodeURIComponent(routeParams.subview)}
        reportName={routeParams.recordId ? decodeURIComponent(routeParams.recordId) : undefined}
        backHref={basePath}
      />
    );
  }

  if (view === "catalog" || view === "list") {
    return <ReportsCatalog onViewGenerated={() => navigate(`${basePath}/generated`)} />;
  }

  return (
    <div className="p-6">
      <SectionCard>
        <EmptyState title="Reports view not found" description="Choose a valid reports section." />
      </SectionCard>
    </div>
  );
}
