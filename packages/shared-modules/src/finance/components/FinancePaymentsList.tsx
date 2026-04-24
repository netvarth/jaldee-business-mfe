import { useMemo } from "react";
import { Button, DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency } from "../services/finance";
import type { FinancePaymentRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinancePaymentsList() {
  const datasetQuery = useFinanceDataset();
  const dataset = datasetQuery.data;

  const columns = useMemo<ColumnDef<FinancePaymentRow>[]>(
    () => [
      { key: "id", header: "Payment" },
      { key: "source", header: "Source" },
      { key: "method", header: "Method" },
      { key: "receivedOn", header: "Received On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatFinanceCurrency(row.amount) },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset?.title ?? "Finance"} Payments`}
      subtitle="Recent collections and settlements for the active product."
      actions={<Button variant="outline" onClick={() => window.location.assign("/finance/payments")}>Open Standalone Payments</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset?.payments ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No payments found" description="Payment records will show here when available." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}
