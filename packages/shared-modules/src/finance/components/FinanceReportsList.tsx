import { useMemo, useState } from "react";
import { Button, EmptyState, Input, SkeletonCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { ReportIcon } from "../../reports/components/shared";
import { SavedReportsDialog } from "../../reports/components/SavedReportsDialog";
import { useReportCatalog } from "../../reports/queries/reports";
import type { ReportCatalogItem } from "../../reports/types";
import { SharedFinanceLayout } from "./shared";

export function FinanceReportsList() {
  const catalog = useReportCatalog();
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [savedReport, setSavedReport] = useState<ReportCatalogItem | null>(null);

  const reportsBasePath = useMemo(() => basePath.replace(/\/finance\/?$/, "/reports"), [basePath]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (catalog.data ?? []).filter((report) => {
      if (report.group !== "Finance") return false;
      if (!query) return true;

      return [report.reportName, report.reportType ?? ""].some((value) => value.toLowerCase().includes(query));
    });
  }, [catalog.data, search]);

  const handleCreate = (report: ReportCatalogItem) => {
    if (!report.reportType) return;
    navigate(`${reportsBasePath}/create/${encodeURIComponent(report.reportType)}/${encodeURIComponent(report.reportName)}`);
  };

  return (
    <SharedFinanceLayout
      title="Finance Reports"
      subtitle="Generate invoice, expense, revenue, payout, customer due, and payment reports."
      actions={
        <Input
          className="h-9"
          containerClassName="w-72 max-w-full"
          placeholder="Search report"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    >
      {catalog.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {catalog.isError && !catalog.isLoading && (
        <EmptyState title="Reports unavailable" description="Finance reports could not be loaded right now." />
      )}

      {!catalog.isLoading && !catalog.isError && rows.length === 0 && (
        <EmptyState title="No finance reports found" description="Try another finance report name or type." />
      )}

      {!catalog.isLoading && !catalog.isError && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((report) => (
            <div key={`${report.reportType ?? report.reportName}-${report.reportName}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ReportIcon />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{report.reportName}</div>
                    <div className="mt-1 text-xs text-slate-500">{report.reportType}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {report.showSavedReports && report.reportType && (
                  <Button variant="outline" size="sm" onClick={() => setSavedReport(report)}>
                    Saved
                  </Button>
                )}
                <Button size="sm" disabled={!report.reportType} onClick={() => handleCreate(report)}>
                  Create
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SavedReportsDialog report={savedReport} open={Boolean(savedReport)} onClose={() => setSavedReport(null)} />
    </SharedFinanceLayout>
  );
}
