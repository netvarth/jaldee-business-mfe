import { useMemo, useState } from "react";
import { Button, Dialog, EmptyState, Input, SkeletonTable } from "@jaldee/design-system";
import { useDeleteSavedReport, useSavedReportCount, useSavedReports } from "../queries/reports";
import type { ReportCatalogItem, SavedReportRow } from "../types";

export function SavedReportsDialog({
  report,
  open,
  onClose,
}: {
  report: ReportCatalogItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filter = useMemo(
    () => ({
      reportType: report?.reportType,
      search,
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [page, report?.reportType, search]
  );
  const reports = useSavedReports(filter);
  const count = useSavedReportCount(filter);
  const remove = useDeleteSavedReport();
  const rows = reports.data ?? [];
  const total = count.data ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (row: SavedReportRow) => {
    await remove.mutateAsync(row);
    await reports.refetch();
    await count.refetch();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={report ? `${report.reportName} Saved Reports` : "Saved Reports"}
      contentClassName="w-screen max-w-none rounded-none sm:w-[760px] sm:max-w-[760px] sm:rounded-md"
      bodyClassName="max-h-[75vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <Input
          placeholder="Search saved reports"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        {reports.isLoading && <SkeletonTable rows={5} columns={4} />}
        {reports.isError && (
          <EmptyState title="Saved reports could not load" description="The saved reports API returned an error." />
        )}
        {!reports.isLoading && !reports.isError && rows.length === 0 && (
          <EmptyState title="No saved reports" description="Saved report criteria will appear here." />
        )}

        {!reports.isLoading && !reports.isError && rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-950">
                <tr>
                  <th className="px-4 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-950">{row.reportName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.reportType || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.createdDate || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={remove.isPending && remove.variables?.id === row.id}
                        onClick={() => handleDelete(row)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{total} saved reports</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
