import { Badge, Button, DataTable, EmptyState, SectionCard } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useOrdersInvoiceTypesPage } from "../queries/orders";
import { SharedOrdersLayout } from "./shared";
import type { OrdersInvoiceTypeRow } from "../types";

export function OrdersSettings() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const invoiceTypesQuery = useOrdersInvoiceTypesPage(page, pageSize);
  const rows = invoiceTypesQuery.data?.rows ?? [];
  const total = invoiceTypesQuery.data?.total ?? 0;

  const columns = useMemo(
    () => [
      { key: "type", header: "Type", width: "28%", className: "py-5" },
      { key: "prefix", header: "Prefix", width: "20%", className: "py-5" },
      { key: "suffix", header: "Suffix", width: "20%", className: "py-5" },
      {
        key: "status",
        header: "Status",
        width: "18%",
        className: "py-5",
        render: (row: OrdersInvoiceTypeRow) => (
          row.status === "Active" ? <Badge variant="success">{row.status}</Badge> : row.status === "Inactive" ? <Badge variant="neutral">{row.status}</Badge> : <span>{row.status}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "14%",
        align: "center" as const,
        className: "py-5",
        render: () => (
          <Button type="button" variant="outline" size="sm" disabled>
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <SharedOrdersLayout
      title="Invoice Types"
      subtitle=""
      actions={
        <Button type="button" variant="primary" size="sm">
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 py-4 text-2xl font-semibold text-slate-900">
          Invoice Types({total})
        </div>
        <div className="px-4 pb-4">
          <DataTable
            data={rows}
            columns={columns}
            loading={invoiceTypesQuery.isLoading}
            className="rounded-none border-0 bg-transparent shadow-none"
            pagination={{
              page,
              pageSize,
              total,
              mode: "server",
              onChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyState={<EmptyState title="No Invoice Types Found." description="" />}
          />
        </div>
      </SectionCard>
    </SharedOrdersLayout>
  );
}
