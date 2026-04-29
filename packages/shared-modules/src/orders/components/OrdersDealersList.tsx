import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Icon,
  SectionCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersDealers, useOrdersDealersCount } from "../queries/orders";
import { SharedOrdersLayout } from "./shared";
import type { DealerRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function OrdersDealersList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "ordersDealers",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    legacyPageParam: "page",
    legacyPageSizeParam: "pageSize",
    resetDeps: [searchName, statusFilter],
  });

  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (searchName) {
      f["name-like"] = searchName;
    }
    if (statusFilter !== "all") {
      f["status-eq"] = statusFilter;
    }
    return f;
  }, [searchName, statusFilter]);

  const { data: dealers, isLoading } = useOrdersDealers(page, pageSize, filters);
  const { data: totalCount } = useOrdersDealersCount(filters);

  const columns = useMemo(
    () => [
      {
        key: "referenceNo",
        header: "Reference No",
        render: (row: DealerRow) => (
          <div className="text-sm font-medium text-slate-900">{row.referenceNo}</div>
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (row: DealerRow) => (
          <div className="text-sm font-medium text-indigo-600">{row.name}</div>
        ),
      },
      {
        key: "phone",
        header: "Phone",
        render: (row: DealerRow) => (
          <div className="text-sm text-slate-700">{row.phone}</div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: DealerRow) => (
          <Badge
            variant={
              row.status === "Approved"
                ? "success"
                : row.status === "Rejected"
                ? "danger"
                : "secondary"
            }
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "createdOn",
        header: "Created On",
        render: (row: DealerRow) => (
          <div className="text-sm text-slate-500">{row.createdOn}</div>
        ),
      },
      {
        key: "actions",
        header: "More Actions",
        render: (row: DealerRow) => (
          <div className="flex items-center gap-2">
             <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: View Dealer Details */}}
              >
                View
              </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* TODO: More Actions Menu */}}
            >
              <Icon name="moreHorizontal" className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <SharedOrdersLayout
      title={`Dealers ${totalCount ? `(${totalCount})` : ""}`}
      showBackButton
      onBack={() => navigate(`${basePath}/orders`)}
      actions={
        <Button variant="primary" onClick={() => {/* TODO: Create Dealer */}}>
          <Icon name="plus" className="mr-2 h-4 w-4" />
          Create
        </Button>
      }
    >
      <div className="space-y-6">
        <SectionCard>
          <div className="mb-4 flex items-center justify-between gap-4">
             <input
                type="text"
                placeholder="Search with name..."
                className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={searchName}
                onChange={(e) => {
                    setSearchName(e.target.value);
                    setPage(1);
                }}
             />
             <div className="flex items-center gap-2">
                <select 
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="New">New</option>
                </select>
                <Button variant="ghost" size="sm">
                    <Icon name="filter" className="h-5 w-5 text-indigo-700" />
                </Button>
             </div>
          </div>

          <DataTable
            columns={columns}
            data={dealers ?? []}
            isLoading={isLoading}
            pagination={{
              page,
              pageSize,
              total: totalCount ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
          />
        </SectionCard>
      </div>
    </SharedOrdersLayout>
  );
}
