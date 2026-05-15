import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Icon, Popover, SectionCard, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceExpensesCount, useFinancePaginatedExpenses } from "../queries/finance";
import type { FinanceExpenseRow } from "../types";
import { SharedFinanceLayout } from "./shared";
import { useSharedModulesContext } from "../../context";

function formatExpenseAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const categoryOptions = [
  { value: "All", label: "All" },
  { value: "Travel", label: "Travel" },
  { value: "Food", label: "Food" },
  { value: "Miscellaneous", label: "Miscellaneous" },
];

export function FinanceExpensesList() {
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

  const { data: expenses, isLoading, isError } = useFinancePaginatedExpenses(filters);
  const { data: totalCount = 0 } = useFinanceExpensesCount(countFilters);

  const openExpense = (row: FinanceExpenseRow) => {
    const uid = row.expenseUid ?? row.id;
    navigate?.(`/expense/${uid}`);
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
        render: (row) => formatExpenseAmount(row.amount),
      },
      {
        key: "amountPaid",
        header: "Amount Paid(₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatExpenseAmount(row.amountPaid),
      },
      {
        key: "amountDue",
        header: "Amount Due(₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatExpenseAmount(row.amountDue),
      },
      { key: "category", header: "Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "id", header: "Expense ID", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
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
        render: (row) => row.payoutCreated ? "Converted" : row.status || "-",
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
              onClick={() => openExpense(row)}
            >
              View
            </Button>
            {(row.isEdit || row.amountDue > 0) && (
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
                    aria-label={`More actions for expense ${row.id}`}
                    className="h-8 w-8 px-0"
                    icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                  />
                }
              >
                <div className="flex min-w-[160px] flex-col gap-1">
                  {row.isEdit && (
                    <Button variant="ghost" className="justify-start w-full">
                      Change Status
                    </Button>
                  )}
                  {row.amountDue > 0 && (
                    <Button variant="ghost" className="justify-start w-full">
                      Convert to Payout
                    </Button>
                  )}
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
    <SharedFinanceLayout
      title="Expense"
      subtitle="Track expenses and payout conversion across your finance workflow."
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Expense({totalCount})
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
              aria-label="Expense category"
            />
            <Button onClick={() => navigate?.("/finance/expense/new")}>Create Expense</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Filter expenses"
              className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
              icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
            />
          </div>
        </div>

        {isError ? (
          <div className="p-6">
            <EmptyState title="Expenses unavailable" description="Expense records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={expenses ?? []}
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
            emptyState={<div className="px-5 py-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)]">No Expense Found.</div>}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
