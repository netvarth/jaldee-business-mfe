import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Icon, Popover, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useFinancePaginatedVendors, useFinanceVendorStatuses, useFinanceVendorsCount } from "../queries/finance";
import type { FinanceVendorRow } from "../types";
import { SharedFinanceLayout } from "./shared";

export function FinanceVendorsList() {
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

  const { data: vendors, isLoading, isError } = useFinancePaginatedVendors(filters);
  const { data: totalCount = 0 } = useFinanceVendorsCount(filters);
  const { data: vendorStatuses = [] } = useFinanceVendorStatuses();

  const openVendor = (row: FinanceVendorRow) => {
    navigate?.(`/finance/vendors/view/${row.encId}`);
  };

  const editVendor = (row: FinanceVendorRow) => {
    navigate?.(`/finance/vendors/edit/${row.encId}`);
  };

  const columns = useMemo<ColumnDef<FinanceVendorRow>[]>(
    () => [
      { key: "createdDate", header: "Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "name", header: "Name", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "category", header: "Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "status",
        header: "Status",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => (
          <Badge variant={row.status === "Disable" ? "neutral" : "info"} className={row.vendorStatusName ? "bg-violet-100 text-violet-700" : undefined}>
            {row.vendorStatusName || row.status}
          </Badge>
        ),
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
              disabled={row.status === "Disable"}
              onClick={() => openVendor(row)}
            >
              View
            </Button>
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
                  aria-label={`More actions for vendor ${row.name}`}
                  className="h-8 w-8 px-0"
                  icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                />
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1">
                {row.status !== "Disable" && (
                  <>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => editVendor(row)}>
                      Edit
                    </Button>
                    {vendorStatuses.length > 1 && row.vendorStatusId && (
                      <Button variant="ghost" className="w-full justify-start">
                        Change Status
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" className="w-full justify-start">
                  {row.status === "Disable" ? "Enable" : "Disable"}
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <SharedFinanceLayout title="Vendors" subtitle="Manage finance vendors for expenses and payouts.">
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Vendors({totalCount})
          </h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate?.("/finance/vendors/create")}>Create Vendor</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Filter vendors"
              className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
              icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
            />
          </div>
        </div>

        {isError ? (
          <div className="p-6">
            <EmptyState title="Vendors unavailable" description="Vendor records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={vendors ?? []}
            columns={columns}
            getRowId={(row) => row.encId}
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
            emptyState={<div className="px-5 py-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)]">No Vendors Found.</div>}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
