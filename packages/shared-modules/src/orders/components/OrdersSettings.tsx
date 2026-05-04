import { Badge, Button, DataTable, EmptyState, Icon, SectionCard } from "@jaldee/design-system";
import { useMemo } from "react";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersInvoiceTypesPage } from "../queries/orders";
import { SharedOrdersLayout } from "./shared";
import type { OrdersInvoiceTypeRow } from "../types";

export function OrdersSettings() {
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({ namespace: "ordersInvoiceTypes" });
  const invoiceTypesQuery = useOrdersInvoiceTypesPage(page, pageSize);
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const rows = invoiceTypesQuery.data?.rows ?? [];
  const total = invoiceTypesQuery.data?.total ?? 0;

  const columns = useMemo(
    () => [
      { key: "type", header: "Type", width: "25%", className: "py-5 text-slate-700 font-medium" },
      { key: "prefix", header: "Prefix", width: "15%", className: "py-5 text-slate-600" },
      { key: "suffix", header: "Suffix", width: "15%", className: "py-5 text-slate-600" },
      {
        key: "status",
        header: "Status",
        width: "15%",
        className: "py-5",
        render: (row: OrdersInvoiceTypeRow) => {
          const isActive =
            String(row.status).toLowerCase() === "active" ||
            String(row.status).toLowerCase() === "enabled" ||
            String(row.status).toLowerCase() === "enable";
          return (
            <Badge variant={isActive ? "success" : "danger"}>
              {isActive ? "Enable" : "Disable"}
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        width: "30%",
        align: "center" as const,
        className: "py-5",
        render: (row: OrdersInvoiceTypeRow) => (
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-indigo-200 text-indigo-700"
              onClick={() => navigate(`${basePath}/invoice-types/edit/${row.id}`)}
            >
              <Icon name="pencil" className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-indigo-200 text-indigo-700"
              onClick={() => navigate(`${basePath}/invoice-types/view/${row.id}`)}
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
              View
            </Button>
          </div>
        ),
      },
    ],
    [basePath, navigate]
  );

  return (
    <SharedOrdersLayout
      title={`Invoice Types (${total})`}
      subtitle="Manage your invoice type configurations"
      actions={
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="bg-indigo-700 hover:bg-indigo-800 border-none px-6"
          onClick={() => navigate(`${basePath}/invoice-types/create`)}
        >
          + Create Invoice Type
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 pb-4">
          <DataTable
            data={rows}
            columns={columns}
            loading={invoiceTypesQuery.isLoading}
            className="rounded-none border-0 bg-transparent shadow-none"
            pagination={{
              page,
              pageSize,
              total,
              mode: "server",
              onChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyState={<EmptyState title="No Invoice Types Found." description="" />}
          />
        </div>
      </SectionCard>
    </SharedOrdersLayout>
  );
}
