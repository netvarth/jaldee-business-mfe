import { useMemo } from "react";
import { Button, DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency } from "../services/finance";
import type { FinancePaymentRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinancePaymentsList() {
  const { data: dataset, isLoading, isError } = useFinanceDataset();

  const columns = useMemo<ColumnDef<FinancePaymentRow>[]>(
    () => [
      { key: "id", header: "Payment", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "source", header: "Source", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "payer", header: "Payer", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "method", header: "Method", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      { key: "receivedOn", header: "Received On", headerClassName: "text-sm font-semibold text-slate-900", className: "py-5" },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row) => formatFinanceCurrency(row.amount),
      },
    ],
    []
  );

  return (
    <SharedFinanceLayout
      title={`${dataset?.title ?? "Finance"} Payments`}
      subtitle="Recent collections and settlements for the active product."
      actions={<Button variant="outline" onClick={() => window.location.assign("/finance/payments")}>Open Standalone Payments</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        {isError ? (
          <div className="p-6">
            <EmptyState title="Payments unavailable" description="Payment records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={dataset?.payments ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            emptyState={<EmptyState title="No payments found" description="Payment records will show here when available." />}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
