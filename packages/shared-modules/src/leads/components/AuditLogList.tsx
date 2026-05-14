import { DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useLeadLogs, useLeadLogsCount } from "../queries/leads";
import { unwrapCount, unwrapList } from "../utils";

type AuditRow = {
  uid: string;
  action: string;
  currentStatus: string;
  description: string;
  user: string;
};

function capitalize(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toRows(data: unknown): AuditRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    action: capitalize(item.auditContext),
    currentStatus: String(item.currentStatus ?? "-"),
    description: String(item.description ?? "-"),
    user: String(item.userId ?? "-"),
  }));
}

export function AuditLogList() {
  const { basePath } = useSharedModulesContext();
  const backHref = basePath.includes("/audit-log") ? basePath : `${basePath}/dashboard`;
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadAuditLog",
    resetDeps: [appliedQuery],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({
      ...(appliedQuery ? { search: appliedQuery } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, page, pageSize]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedQuery ? { search: appliedQuery } : {}),
    }),
    [appliedQuery]
  );

  const itemsQuery = useLeadLogs(filters);
  const countQuery = useLeadLogsCount(countFilters);
  const rows = useMemo(() => toRows(itemsQuery.data), [itemsQuery.data]);
  const total = unwrapCount(countQuery.data) || rows.length;

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      { key: "action", header: "Action", render: (row) => <span className="font-semibold text-slate-900">{row.action}</span> },
      { key: "currentStatus", header: "Current Status" },
      {
        key: "description",
        header: "Description",
        render: (row) => <span className="text-slate-800">{row.description}</span>,
      },
      { key: "user", header: "User" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Lead-manager activity stream from the CRM endpoints."
        back={{ label: "Back", href: backHref }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder="Search audit log..."
                recordCount={total}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-[38px] w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-[#4C1D95] shadow-sm"
                aria-label="Filters"
                title="Filters"
              >
                <FilterIcon />
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={itemsQuery.isLoading || countQuery.isLoading}
            pagination={{ page, pageSize, total, onChange: setPage, onPageSizeChange: setPageSize, mode: "server" }}
            emptyState={<EmptyState title="No audit log entries found" description="Lead activity will appear here when available from the API." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18l-7 8v5.5a1 1 0 0 1-1.5.86l-2-1.15a1 1 0 0 1-.5-.86V13L3 5z" />
    </svg>
  );
}
