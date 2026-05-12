import { Button, EmptyState, SkeletonTable } from "@jaldee/design-system";
import { useGeneratedReportDetail } from "../queries/reports";
import { ReportsPageShell } from "./shared";

export function GeneratedReportDetail({ token, backHref }: { token: string; backHref: string }) {
  const report = useGeneratedReportDetail(token);
  const detail = report.data;

  return (
    <ReportsPageShell
      title="Report"
      subtitle={detail?.reportName ?? "Generated report"}
      back={{ label: "Back", href: backHref }}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" disabled={!detail}>
            Save this report
          </Button>
          <Button disabled={!detail} onClick={() => exportTable(detail?.reportName ?? "report")}>
            Export to XLS(Excel)
          </Button>
        </div>
      }
    >
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        {report.isLoading && <SkeletonTable rows={6} columns={5} />}
        {report.isError && <EmptyState title="Report could not load" description="The report detail API returned an error." />}
        {detail && (
          <div id="report-generated-table" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="m-0 text-lg font-semibold text-slate-950">{detail.reportName}</h2>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{detail.reportType}</span>
            </div>

            {Object.keys(detail.reportHeader).length > 0 && (
              <div className="grid gap-3 border-b border-slate-100 pb-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(detail.reportHeader).map(([key, value]) => (
                  <InfoLine key={key} label={key} value={value} />
                ))}
              </div>
            )}

            {Object.keys(detail.dataHeader).length > 0 && (
              <div className="grid gap-3 border-b border-slate-100 pb-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(detail.dataHeader).map(([key, value]) => (
                  <InfoLine key={key} label={key} value={value} />
                ))}
              </div>
            )}

            {detail.rows.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-700">No Records Found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-950">
                    <tr>
                      {detail.columns.map((column) => (
                        <th key={column.key} className="border-b border-slate-200 px-4 py-3 font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rows.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        {detail.columns.map((column) => (
                          <td key={column.key} className="px-4 py-3 text-slate-700">
                            {formatCell(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ReportsPageShell>
  );
}

function InfoLine({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="text-sm">
      <span className="font-semibold text-slate-900">{label}: </span>
      <span className="text-slate-600">{formatCell(value)}</span>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function exportTable(reportName: string) {
  if (typeof window === "undefined") return;
  const table = document.querySelector("#report-generated-table table");
  if (!table) return;
  const html = `\uFEFF${table.outerHTML}`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportName.replace(/[^\w-]+/g, "_") || "report"}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
