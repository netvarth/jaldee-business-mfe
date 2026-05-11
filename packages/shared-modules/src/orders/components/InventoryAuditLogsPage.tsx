import { useEffect, useMemo } from "react";
import { DataTable, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useInventoryAuditLogsPage } from "../queries/orders";
import type { InventoryAuditLogRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function InventoryAuditLogsPage() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryAuditLogs",
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const logsQuery = useInventoryAuditLogsPage(page, pageSize);
  const rows = logsQuery.data?.rows ?? [];
  const total = logsQuery.data?.total ?? 0;
  const backHref = `${basePath}/inventory`;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total]);

  const columns = useMemo(
    () => [
      {
        key: "date",
        header: "Date & Time",
        width: "20%",
        render: (row: InventoryAuditLogRow) => (
          <span className="font-medium text-slate-600">{row.date}</span>
        ),
      },
      {
        key: "action",
        header: "Action",
        width: "15%",
        render: (row: InventoryAuditLogRow) => (
          <span className="font-semibold text-slate-900">{row.action}</span>
        ),
      },
      {
        key: "type",
        header: "Type",
        width: "18%",
        render: (row: InventoryAuditLogRow) => (
          <span className="text-slate-700 font-medium">{row.type}</span>
        ),
      },
      {
        key: "description",
        header: "Description",
        width: "32%",
        render: (row: InventoryAuditLogRow) => (
          <span className="text-slate-600 break-words">{row.description}</span>
        ),
      },
      {
        key: "user",
        header: "User",
        width: "15%",
        render: (row: InventoryAuditLogRow) => (
          <span className="text-slate-800 font-medium">{row.user}</span>
        ),
      },
    ],
    []
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditlogs"
        subtitle=""
        back={{ label: "Inventory", href: backHref }}
        onNavigate={navigate}
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 pb-4 pt-5">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-lg font-semibold text-slate-900 m-0">Auditlogs({total})</h2>
            <button
              type="button"
              aria-label="Filter logs"
              title="Filter logs"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-indigo-700 hover:border-indigo-100 hover:bg-indigo-50 transition"
            >
              <FilterIcon />
            </button>
          </div>
        </div>

        <DataTable
          data={rows}
          columns={columns}
          loading={logsQuery.isLoading}
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No Audit Logs Found" description="Any inventory updates or modifications will be displayed here." />}
          className="rounded-none border-x-0 border-b-0 shadow-none"
          tableClassName="text-sm"
        />
      </SectionCard>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.25A1.25 1.25 0 0 1 4.25 4h15.5a1.25 1.25 0 0 1 .96 2.05L14.5 13.5v5.25a1.25 1.25 0 0 1-.68 1.11l-3 1.55A1.25 1.25 0 0 1 9 20.3v-6.8L3.29 6.05A1.25 1.25 0 0 1 3 5.25Z" />
    </svg>
  );
}
