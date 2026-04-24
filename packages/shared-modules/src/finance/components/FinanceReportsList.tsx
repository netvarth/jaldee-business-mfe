import { useMemo } from "react";
import { DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import type { FinanceReportRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinanceReportsList() {
  const datasetQuery = useFinanceDataset();
  const dataset = datasetQuery.data;

  const columns = useMemo<ColumnDef<FinanceReportRow>[]>(
    () => [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
      { key: "note", header: "Notes" },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset?.title ?? "Finance"} Reports`}
      subtitle="Operational finance indicators for the active product."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset?.reports ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No report data" description="Report metrics will appear here." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}
