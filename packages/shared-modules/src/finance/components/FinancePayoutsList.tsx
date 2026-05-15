import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Icon, SectionCard, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinancePayoutsCount, useFinancePaginatedPayouts } from "../queries/finance";
import type { FinanceExpenseRow } from "../types";
import { SharedFinanceLayout } from "./shared";
import { useSharedModulesContext } from "../../context";

function formatPayoutAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const categoryOptions = [
  { value: "All", label: "All" },
  { value: "Vendor", label: "Vendor" },
  { value: "Salary", label: "Salary" },
  { value: "Refund", label: "Refund" },
];

export function FinancePayoutsList() {
  const { navigate } = useSharedModulesContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filters = useMemo(() => {
    const nextFilters: Record<string, unknown> = {
      from: (page - 1) * pageSize,
      count: pageSize,
    };

    if (categoryFilter !== "All") {
      nextFilters["categoryName-eq"] = categoryFilter;
    }

    return nextFilters;
  }, [categoryFilter, page, pageSize]);

  const countFilters = useMemo(() => {
    const { from, count, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: payouts, isLoading, isError } = useFinancePaginatedPayouts(filters);
  const { data: totalCount = 0 } = useFinancePayoutsCount(countFilters);

  const openPayout = (row: FinanceExpenseRow) => {
    const uid = row.expenseUid ?? row.id;
    navigate?.(`/payout/${uid}`);
  };

  const columns = useMemo<ColumnDef<FinanceExpenseRow>[]>(
    () => [
      { key: "bookedOn", header: "Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "amount",
        header: "Amount (₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatPayoutAmount(row.amount),
      },
      {
        key: "amountPaid",
        header: "Amount Paid(₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatPayoutAmount(row.amountPaid),
      },
      {
        key: "amountDue",
        header: "Amount Due(₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatPayoutAmount(row.amountDue),
      },
      { key: "category", header: "Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "id", header: "Payout ID", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.locationName || "-",
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.status || "-",
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
              onClick={() => openPayout(row)}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <SharedFinanceLayout
      title="Payout"
      subtitle="Track payouts and vendor settlements across your organization."
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Payout({totalCount})
          </h2>
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              options={categoryOptions}
              containerClassName="w-[132px]"
              fullWidth={false}
              aria-label="Payout category"
            />
            <Button onClick={() => navigate?.("/finance/payout/create")}>Create Payout</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Filter payouts"
              className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
              icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
            />
          </div>
        </div>

        {isError ? (
          <div className="p-6">
            <EmptyState title="Payouts unavailable" description="Payout records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={payouts ?? []}
            columns={columns}
            getRowId={(row) => row.id}
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
            emptyState={<div className="px-5 py-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)]">No Payout Found.</div>}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
