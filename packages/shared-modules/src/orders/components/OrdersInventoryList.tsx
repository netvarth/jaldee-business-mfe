import { useMemo, useState } from "react";
import { Badge, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useOrdersInventory } from "../queries/orders";
import { getOrdersStatusVariant } from "../services/orders";
import type { OrdersInventoryRow } from "../types";

export function OrdersInventoryList() {
  const { data } = useOrdersInventory();
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((row) =>
      [row.id, row.item, row.batch, row.store, row.status].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [data, query]);

  const columns = useMemo(
    () => [
      { key: "id", header: "Stock ID", sortable: true },
      { key: "item", header: "Item", sortable: true },
      { key: "batch", header: "Batch" },
      { key: "store", header: "Store" },
      { key: "availableQty", header: "Available", align: "right" as const },
      { key: "reorderLevel", header: "Reorder Level", align: "right" as const },
      { key: "expiry", header: "Expiry" },
      {
        key: "status",
        header: "Status",
        render: (row: OrdersInventoryRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Inventory health, batch visibility, and reorder risk from the legacy inventory flow." />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <DataTableToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search inventory, batch, or store"
            recordCount={filteredRows.length}
          />
        </div>
        <DataTable
          data={filteredRows}
          columns={columns}
          emptyState={<EmptyState title="No inventory items found" description="Inventory records will appear here when available." />}
        />
      </SectionCard>
    </div>
  );
}
