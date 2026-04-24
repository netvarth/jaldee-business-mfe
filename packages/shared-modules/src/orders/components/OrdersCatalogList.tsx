import { useMemo, useState } from "react";
import { Badge, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useOrdersCatalogs } from "../queries/orders";
import { formatOrdersCurrency, getOrdersStatusVariant } from "../services/orders";
import type { OrdersCatalogRow } from "../types";

export function OrdersCatalogList() {
  const { data } = useOrdersCatalogs();
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((row) =>
      [row.id, row.name, row.category, row.sku, row.status].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [data, query]);

  const columns = useMemo(
    () => [
      { key: "id", header: "Catalog ID", sortable: true },
      { key: "name", header: "Item", sortable: true },
      { key: "category", header: "Category" },
      { key: "sku", header: "SKU" },
      {
        key: "price",
        header: "Price",
        align: "right" as const,
        render: (row: OrdersCatalogRow) => formatOrdersCurrency(row.price),
      },
      {
        key: "status",
        header: "Status",
        render: (row: OrdersCatalogRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
      { key: "updatedOn", header: "Updated On" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Catalogs" subtitle="Sales-order and pharmacy catalog items adapted from the legacy order-catalog flow." />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <DataTableToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search catalog items, categories, or SKU"
            recordCount={filteredRows.length}
          />
        </div>
        <DataTable
          data={filteredRows}
          columns={columns}
          emptyState={<EmptyState title="No catalog items found" description="Catalog items will appear here when available." />}
        />
      </SectionCard>
    </div>
  );
}
