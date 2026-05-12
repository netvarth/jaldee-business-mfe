import { useMemo, useState } from "react";
import { Button, EmptyState, Input, SkeletonCard } from "@jaldee/design-system";
import { useReportCatalog } from "../queries/reports";
import type { ReportCatalogItem } from "../types";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { ReportIcon, ReportsPageShell } from "./shared";
import { SavedReportsDialog } from "./SavedReportsDialog";

const GROUPS = ["General", "Finance", "CRM", "Sales", "GST", "Inventory", "Lending", "IVR"] as const;

export function ReportsCatalog({ onViewGenerated }: { onViewGenerated: () => void }) {
  const catalog = useReportCatalog();
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number] | "All">("All");
  const [search, setSearch] = useState("");
  const [savedReport, setSavedReport] = useState<ReportCatalogItem | null>(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (catalog.data ?? []).filter((row) => {
      const groupMatch = activeGroup === "All" || row.group === activeGroup;
      const searchMatch = !query || [row.reportName, row.reportType ?? "", row.group].some((value) => value.toLowerCase().includes(query));
      return groupMatch && searchMatch;
    });
  }, [activeGroup, catalog.data, search]);

  const handleGenerate = (report: ReportCatalogItem) => {
    if (!report.reportType) return;
    navigate(`${basePath}/create/${encodeURIComponent(report.reportType)}/${encodeURIComponent(report.reportName)}`);
  };

  const handleRoute = (report: ReportCatalogItem) => {
    if (!report.routeTo) return;
    window.location.assign(`/${report.routeTo}`);
  };

  return (
    <ReportsPageShell
      title="Reports"
      subtitle="Generate reports and manage saved report criteria."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Input
            className="h-9"
            containerClassName="w-72 max-w-full"
            placeholder="Search report"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button onClick={onViewGenerated}>View All Reports</Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", ...GROUPS] as const).map((group) => (
          <Button key={group} variant={activeGroup === group ? undefined : "outline"} size="sm" onClick={() => setActiveGroup(group)}>
            {group}
          </Button>
        ))}
      </div>

      {catalog.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!catalog.isLoading && rows.length === 0 && (
        <EmptyState title="No reports found" description="Try another report name, type, or group." />
      )}

      {!catalog.isLoading && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((report) => (
            <div key={report.reportType} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ReportIcon />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{report.reportName}</div>
                    <div className="mt-1 text-xs text-slate-500">{report.group}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {report.showSavedReports && report.reportType && (
                  <Button variant="outline" size="sm" onClick={() => setSavedReport(report)}>
                    Saved
                  </Button>
                )}
                {report.routeTo ? (
                  <Button size="sm" onClick={() => handleRoute(report)}>
                    View
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!report.reportType}
                    onClick={() => handleGenerate(report)}
                  >
                    Create
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SavedReportsDialog report={savedReport} open={Boolean(savedReport)} onClose={() => setSavedReport(null)} />
    </ReportsPageShell>
  );
}
