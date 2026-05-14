import { useMemo } from "react";
import { DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import type { FinanceReportRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinanceReportsList() {
  const { data: dataset, isLoading, isError } = useFinanceDataset();

  const columns = useMemo<ColumnDef<FinanceReportRow>[]>(
    () => [
      { key: "metric", header: "Metric", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "value", header: "Value", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "note", header: "Notes", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset?.title ?? "Finance"} Reports`}
      subtitle="Operational finance indicators for the active product."
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        {isError ? (
          <div className="p-6">
            <EmptyState title="Reports unavailable" description="Finance report metrics could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={dataset?.reports ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            emptyState={<EmptyState title="No report data" description="Report metrics will appear here." />}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
