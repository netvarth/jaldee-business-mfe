import { useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useOrdersOrdersPage } from "../queries/orders";
import { buildOrdersDetailHref, formatOrdersCurrency, getOrdersStatusVariant } from "../services/orders";
import type { OrdersOrderRow } from "../types";

export function OrdersList() {
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const ordersQuery = useOrdersOrdersPage(page, pageSize);
  const rows = ordersQuery.data?.rows ?? [];
  const total = ordersQuery.data?.total ?? 0;

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((row) =>
      [row.id, row.customer, row.source, row.channel, row.status].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [rows, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((query.trim() ? filteredRows.length : total) / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredRows.length, page, pageSize, query, total]);

  const columns = useMemo(
    () => [
      { key: "id", header: "Order ID", sortable: true },
      { key: "customer", header: "Customer", sortable: true },
      { key: "source", header: "Source" },
      { key: "channel", header: "Channel" },
      { key: "itemCount", header: "Items", align: "right" as const },
      {
        key: "totalAmount",
        header: "Amount",
        align: "right" as const,
        sortable: true,
        render: (row: OrdersOrderRow) => formatOrdersCurrency(row.totalAmount),
      },
      {
        key: "status",
        header: "Status",
        render: (row: OrdersOrderRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
      { key: "placedOn", header: "Placed On" },
      {
        key: "actions",
        header: "Actions",
        align: "center" as const,
        render: (row: OrdersOrderRow) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(buildOrdersDetailHref(basePath, row.id, product))}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath, navigate, product]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Generated from the legacy sales-order grid and adapted for the shared React module." />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <DataTableToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search orders, customers, or channels"
            recordCount={query.trim() ? filteredRows.length : total}
          />
        </div>
        <DataTable
          data={filteredRows}
          columns={columns}
          loading={ordersQuery.isLoading}
          pagination={{
            page,
            pageSize,
            total: query.trim() ? filteredRows.length : total,
            mode: query.trim() ? "client" : "server",
            onChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={<EmptyState title="No orders found" description="Orders matching the current filter will appear here." />}
        />
      </SectionCard>
    </div>
  );
}
