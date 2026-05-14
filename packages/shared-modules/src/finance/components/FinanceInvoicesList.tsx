import { useMemo } from "react";
import { Badge, Button, DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency, getFinanceStatusVariant } from "../services/finance";
import type { FinanceInvoiceRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinanceInvoicesList() {
  const { data: dataset, isLoading, isError } = useFinanceDataset();

  const columns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(
    () => [
      { key: "id", header: "Invoice", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "customer", header: "Customer", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "category", header: "Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "dueDate", header: "Due Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row) => formatFinanceCurrency(row.amount),
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
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
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        {isError ? (
          <div className="p-6">
            <EmptyState title="Invoices unavailable" description="Invoice records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={dataset?.invoices ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            emptyState={<EmptyState title="No invoices found" description="Invoice records will show here when available." />}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
