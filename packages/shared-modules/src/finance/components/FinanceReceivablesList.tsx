import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, Popover, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useFinancePaginatedRevenue, useFinanceRevenueCount } from "../queries/finance";
import type { FinanceRevenueRow } from "../types";
import { SharedFinanceLayout } from "./shared";

function formatRevenueAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinanceReceivablesList() {
  const { navigate } = useSharedModulesContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filters = useMemo(
    () => ({
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [page, pageSize]
  );

  const { data: revenue, isLoading, isError } = useFinancePaginatedRevenue(filters);
  const { data: totalCount = 0 } = useFinanceRevenueCount({});

  const openRevenue = (row: FinanceRevenueRow) => {
    navigate?.(`/finance/receivables/create/${row.uid}`);
  };

  const columns = useMemo<ColumnDef<FinanceRevenueRow>[]>(
    () => [
      { key: "receivedDate", header: "Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "amount",
        header: "Amount (₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatRevenueAmount(row.amount),
      },
      { key: "categoryName", header: "Revenue Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "invoiceCategoryName", header: "Invoice Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "invoiceId",
        header: "Invoice No.",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.invoiceId ? `#${row.invoiceId}` : "",
      },
      {
        key: "referenceNo",
        header: "Reference",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.referenceNo || "",
      },
      {
        key: "customerName",
        header: "Customer Name",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.customerName || "",
      },
      {
        key: "vendorName",
        header: "Vendor",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.vendorName || "",
      },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.locationName || "",
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.status ? <Badge className="bg-violet-100 text-violet-700">{row.status}</Badge> : "",
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4 text-right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[52px] px-3 text-[length:var(--text-xs)]"
              onClick={() => openRevenue(row)}
            >
              View
            </Button>
            {row.isEdit && (
              <Popover
                placement="bottom"
                align="end"
                portal
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`More actions for revenue ${row.id}`}
                    className="h-8 w-8 px-0"
                    icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                  />
                }
              >
                <div className="flex min-w-[160px] flex-col gap-1">
                  <Button variant="ghost" className="w-full justify-start">
                    Change Status
                  </Button>
                </div>
              </Popover>
            )}
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <SharedFinanceLayout title="Revenue" subtitle="Track incoming revenue and receivables.">
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Revenue({totalCount})
          </h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate?.("/finance/receivables/create")}>Create Revenue</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Filter revenue"
              className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
              icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
            />
          </div>
        </div>

        {isError ? (
          <div className="p-6">
            <EmptyState title="Revenue unavailable" description="Revenue records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={revenue ?? []}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={isLoading}
            className="rounded-none border-x-0 border-b-0 shadow-none"
            pagination={{
              page,
              pageSize,
              total: totalCount,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<div className="px-5 py-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)]">No Revenue Found.</div>}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
