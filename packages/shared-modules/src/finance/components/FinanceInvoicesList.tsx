import { useMemo } from "react";
import { Badge, Button, DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency, getFinanceStatusVariant } from "../services/finance";
import type { FinanceInvoiceRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinanceInvoicesList() {
  const datasetQuery = useFinanceDataset();
  const dataset = datasetQuery.data;

  const columns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(
    () => [
      { key: "id", header: "Invoice" },
      { key: "customer", header: "Customer" },
      { key: "category", header: "Category" },
      { key: "dueDate", header: "Due Date" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatFinanceCurrency(row.amount) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getFinanceStatusVariant(row.status)}>{row.status}</Badge>,
      },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset?.title ?? "Finance"} Invoices`}
      subtitle="Recent invoices relevant to the current product context."
      actions={<Button variant="outline" onClick={() => window.location.assign("/finance/invoices")}>Open Standalone Invoices</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <DataTable
          data={dataset?.invoices ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={<EmptyState title="No invoices found" description="Invoice records will show here when available." />}
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}
