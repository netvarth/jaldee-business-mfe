import { useEffect, useMemo, useState } from "react";
import { DataTable, DatePicker, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useInventorySummaryPage } from "../queries/orders";
import type { InventorySummaryRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

interface InventorySummaryPageProps {
  type: "OUTOFSTOCK" | "EXPIRED";
}

export function InventorySummaryPage({ type }: InventorySummaryPageProps) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const [selectedExpiryRange, setSelectedExpiryRange] = useState<
    "EXPIRED" | "EXPIRY_7_DAYS" | "EXPIRY_14_DAYS" | "EXPIRY_30_DAYS" | "DATE_RANGE"
  >("EXPIRED");

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const defaultEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(defaultEndStr);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const storeEncId = searchParams?.get("storeEncid") ?? searchParams?.get("storeEncId") ?? "";

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: `inventorySummary-${type.toLowerCase()}`,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [selectedExpiryRange, dateFrom, dateTo],
  });

  const queryType = type === "EXPIRED" ? selectedExpiryRange : "OUTOFSTOCK";
  const summaryQuery = useInventorySummaryPage(
    page,
    pageSize,
    queryType,
    storeEncId,
    queryType === "DATE_RANGE" ? dateFrom : undefined,
    queryType === "DATE_RANGE" ? dateTo : undefined
  );
  const rows = summaryQuery.data?.rows ?? [];
  const total = summaryQuery.data?.total ?? 0;
  const backHref = `${basePath}/inventory`;

  useEffect(() => {
    if (summaryQuery.isPending || summaryQuery.isFetching) return;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total, summaryQuery.isPending, summaryQuery.isFetching]);

  const title = type === "OUTOFSTOCK" ? "Out of Stock Items" : "Expired Items";

  const columns = useMemo(() => {
    if (type === "EXPIRED") {
      return [
        {
          key: "itemName",
          header: "Item",
          width: "40%",
          render: (row: InventorySummaryRow) => (
            <span className="font-medium text-slate-900">{row.itemName}</span>
          ),
        },
        {
          key: "expiryDate",
          header: "Expiry Date",
          width: "20%",
          render: (row: InventorySummaryRow) => (
            <span className="text-slate-600">{row.expiryDate || "-"}</span>
          ),
        },
        {
          key: "batch",
          header: "Batch",
          width: "20%",
          render: (row: InventorySummaryRow) => (
            <span className="text-slate-600">{row.batch || "-"}</span>
          ),
        },
        {
          key: "storeName",
          header: "Store",
          width: "20%",
          render: (row: InventorySummaryRow) => (
            <span className="text-slate-600">{row.storeName}</span>
          ),
        },
      ];
    }

    return [
      {
        key: "itemName",
        header: "Item",
        width: "60%",
        render: (row: InventorySummaryRow) => (
          <span className="font-medium text-slate-900">{row.itemName}</span>
        ),
      },
      {
        key: "storeName",
        header: "Store",
        width: "40%",
        render: (row: InventorySummaryRow) => (
          <span className="text-slate-600">{row.storeName}</span>
        ),
      },
    ];
  }, [type]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle=""
        back={{ label: "Inventory", href: backHref }}
        onNavigate={navigate}
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 pb-4 pt-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-900">
              {title}{total ? ` (${total})` : " (0)"}
            </h2>
            {type === "EXPIRED" && (
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white shadow-sm focus:outline-none cursor-pointer"
                  value={selectedExpiryRange}
                  onChange={(e) => {
                    setSelectedExpiryRange(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="EXPIRED">Expired</option>
                  <option value="EXPIRY_7_DAYS">Expiry in 7 Days</option>
                  <option value="EXPIRY_14_DAYS">Expiry in 14 Days</option>
                  <option value="EXPIRY_30_DAYS">Expiry in 30 Days</option>
                  <option value="DATE_RANGE">Date Range</option>
                </select>
                {selectedExpiryRange === "DATE_RANGE" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</span>
                      <div className="w-[220px]">
                        <DatePicker
                          value={dateFrom}
                          max={dateTo}
                          onChange={(e) => {
                            setDateFrom(e.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</span>
                      <div className="w-[220px]">
                        <DatePicker
                          value={dateTo}
                          min={dateFrom}
                          onChange={(e) => {
                            setDateTo(e.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DataTable
            columns={columns}
            data={rows}
            isLoading={summaryQuery.isPending}
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyState={
              <EmptyState
                title={`No ${title.toLowerCase()} found`}
                description={`There are currently no ${title.toLowerCase()} recorded in this view.`}
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
