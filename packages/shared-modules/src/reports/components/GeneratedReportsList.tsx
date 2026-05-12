import { useMemo, useState } from "react";
import { Button, EmptyState, Input, Select, SkeletonTable } from "@jaldee/design-system";
import { useGeneratedReportCount, useGeneratedReports } from "../queries/reports";
import { useSharedNavigate } from "../../useSharedNavigate";
import { ReportsPageShell } from "./shared";

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "DONE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "INPROGRESS") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "SEEN") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function GeneratedReportsList({ backHref }: { backHref: string }) {
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filter = useMemo(
    () => ({
      search,
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [page, pageSize, search]
  );
  const reports = useGeneratedReports(filter);
  const count = useGeneratedReportCount(filter);
  const rows = reports.data ?? [];
  const total = count.data ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canView = (status: string) => ["DONE", "VIEWED", "SEEN"].includes(status.toUpperCase().replace(/\s+/g, ""));

  return (
    <ReportsPageShell
      title="Generated Reports"
      subtitle="Track reports generated from live report jobs."
      back={{ label: "Back", href: backHref }}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Input
            className="h-9"
            containerClassName="w-72 max-w-full"
            placeholder="Search reports"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Button onClick={() => reports.refetch()}>Refresh</Button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {reports.isLoading && (
          <div className="p-4">
            <SkeletonTable rows={5} columns={5} />
          </div>
        )}
        {reports.isError && <EmptyState title="Reports could not load" description="The reports API returned an error." />}
        {!reports.isLoading && !reports.isError && rows.length === 0 && (
          <EmptyState title="No generated reports" description="Generated reports will appear here." />
        )}
        {!reports.isLoading && !reports.isError && rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-950">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Report</th>
                    <th className="px-4 py-4 font-semibold">Type</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Created</th>
                    <th className="px-4 py-4 font-semibold">Requested By</th>
                    <th className="px-4 py-4 text-right font-semibold">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-950">{row.reportName}</td>
                      <td className="px-4 py-4 text-slate-600">{row.reportType || "-"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{row.createdDate || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{row.requestedBy}</td>
                      <td className="px-4 py-4 text-right">
                        {canView(row.status) ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`${backHref}/generated-report/${encodeURIComponent(row.reportToken)}`)}
                          >
                            View
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => reports.refetch()}>
                            Refresh
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
              <span>
                Showing {rows.length} of {total} reports
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <span>
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
                <Select
                  containerClassName="w-24"
                  value={String(pageSize)}
                  options={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                  ]}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ReportsPageShell>
  );
}
