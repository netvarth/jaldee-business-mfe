import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Popover, PopoverSection, SectionCard, Switch } from "@jaldee/design-system";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersCatalogsPage } from "../queries/orders";
import type { OrdersCatalogRow } from "../types";
import { SharedOrdersLayout } from "./shared";

export function OrdersCatalogList() {
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({ namespace: "ordersCatalogs" });
  const [query, setQuery] = useState("");
  const catalogsQuery = useOrdersCatalogsPage(page, pageSize);
  const rows = catalogsQuery.data?.rows ?? [];
  const total = catalogsQuery.data?.total ?? 0;

  const columns = useMemo(
    () => [
      {
        key: "catalog",
        header: "Order Catalog & Id",
        width: "38%",
        className: "py-4",
        render: (row: OrdersCatalogRow) => (
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-white shadow-[0_4px_14px_rgba(15,23,42,0.12)]">
              <span className="text-[28px]" aria-hidden="true">🛒</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">{row.name}</div>
              <div className="text-sm text-slate-600">{row.id}</div>
            </div>
          </div>
        ),
      },
      { key: "storeName", header: "Store Name", width: "30%", className: "py-4" },
      {
        key: "status",
        header: "Status",
        width: "16%",
        className: "py-4",
        render: (row: OrdersCatalogRow) => (
          <div className="flex items-center">
            <Switch checked={row.active} onChange={() => undefined} />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "16%",
        align: "center" as const,
        className: "py-4",
        render: () => (
          <Popover
            align="end"
            contentClassName="min-w-[140px] rounded-lg p-2"
            trigger={
              <Button type="button" variant="outline" size="sm">
                Actions
              </Button>
            }
          >
            <PopoverSection className="space-y-1">
              <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <span aria-hidden="true">👁</span>
                <span>View</span>
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <span aria-hidden="true">✎</span>
                <span>Edit</span>
              </button>
            </PopoverSection>
          </Popover>
        ),
      },
    ],
    []
  );

  return (
    <SharedOrdersLayout
      title={`Order Catalogs (${total})`}
      subtitle=""
      actions={
        <Button type="button" variant="primary" size="sm">
          + Create
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-[420px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Catalog"
                className="h-[40px] w-full rounded-[6px] border border-slate-300 bg-white pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-0 top-0 flex h-[40px] w-12 items-center justify-center rounded-r-[6px] bg-slate-100 text-slate-400"
                aria-label="Search catalog"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center self-end text-indigo-700" aria-label="Filter catalogs">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                <path d="M2.25 3.75A.75.75 0 0 1 3 3h12a.75.75 0 0 1 .58 1.226L11.25 9.52v4.23a.75.75 0 0 1-.44.682l-3 1.385A.75.75 0 0 1 6.75 15V9.52L2.42 4.226A.75.75 0 0 1 2.25 3.75Z" />
              </svg>
            </button>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          loading={catalogsQuery.isLoading}
          className="rounded-none border-0 bg-transparent shadow-none"
          tableClassName="text-base"
          pagination={{
            page,
            pageSize,
            total,
            mode: "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No catalog items found" description="" />}
        />
      </SectionCard>
    </SharedOrdersLayout>
  );
}
