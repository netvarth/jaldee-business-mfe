import { useMemo, useState } from "react";
import { DataTable, EmptyState, Icon, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceActivityLogs, useFinanceActivityLogsCount } from "../queries/finance";
import type { FinanceActivityLogRow } from "../types";
import { SharedFinanceLayout } from "./shared";

const DEFAULT_PAGE_SIZE = 10;

export function FinanceActivityLogList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filters = useMemo(
    () => ({
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [page, pageSize]
  );
  const countFilters = useMemo(() => {
    const { from, count, ...rest } = filters;
    return rest;
  }, [filters]);

  const logsQuery = useFinanceActivityLogs(filters);
  const countQuery = useFinanceActivityLogsCount(countFilters);
  const totalCount = countQuery.data ?? 0;

  const columns = useMemo<ColumnDef<FinanceActivityLogRow>[]>(
    () => [
      {
        key: "dateTime",
        header: "Date & Time",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
      },
      {
        key: "action",
        header: "Action",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
      },
      {
        key: "description",
        header: "Description",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
      },
      {
        key: "userName",
        header: "User",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
      },
    ],
    []
  );

  return (
    <SharedFinanceLayout title="Activity Log" subtitle="Track finance changes and user activity.">
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Activity Log({totalCount})
          </h2>
          <button
            type="button"
            aria-label="Filter activity log"
            title="Filter activity log"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] border border-transparent text-[var(--color-primary)] hover:border-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
          >
            <Icon name="filter" className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {logsQuery.isError || countQuery.isError ? (
          <div className="p-6">
            <EmptyState title="Activity log unavailable" description="Finance activity logs could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={logsQuery.data ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={logsQuery.isLoading || countQuery.isLoading}
            className="rounded-none border-x-0 border-b-0 shadow-none"
            pagination={{
              page,
              pageSize,
              total: totalCount,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<div className="px-5 py-4 text-center text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">No Activity Log Found</div>}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
