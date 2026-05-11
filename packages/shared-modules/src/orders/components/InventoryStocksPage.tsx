import { useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useInventoryCatalogItemsPage, useInventoryStocksFormOptions, useInventoryStocksPage } from "../queries/orders";
import { getOrdersStatusVariant } from "../services/orders";
import type { InventoryAdjustmentItemOption, InventoryStockRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function InventoryStocksPage() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [storeEncId, setStoreEncId] = useState("");
  const [catalogEncId, setCatalogEncId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryAdjustmentItemOption | null>(null);
  const [showStock, setShowStock] = useState(false);
  const [batchItem, setBatchItem] = useState<InventoryStockRow | null>(null);
  const optionsQuery = useInventoryStocksFormOptions(storeEncId);
  const itemSuggestionsQuery = useInventoryCatalogItemsPage(catalogEncId, 1, 10, itemSearch);
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryStocks",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [storeEncId, catalogEncId, selectedItem?.spCode ?? "", showStock],
  });
  const stocksQuery = useInventoryStocksPage(page, pageSize, {
    storeEncId,
    catalogEncId,
    spItemCode: selectedItem?.spCode,
    enabled: showStock,
  });
  const rows = stocksQuery.data?.rows ?? [];
  const total = stocksQuery.data?.total ?? 0;

  useEffect(() => {
    if (!storeEncId && optionsQuery.data?.stores?.length) {
      setStoreEncId(optionsQuery.data.stores[0].id);
    }
  }, [optionsQuery.data?.stores, storeEncId]);

  useEffect(() => {
    if (!catalogEncId && optionsQuery.data?.catalogs?.length) {
      setCatalogEncId(optionsQuery.data.catalogs[0].id);
    }
  }, [catalogEncId, optionsQuery.data?.catalogs]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total]);

  const columns = useMemo(
    () => [
      {
        key: "itemName",
        header: "Item",
        width: "34%",
        render: (row: InventoryStockRow) => (
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-left font-semibold text-slate-900 hover:text-indigo-700"
            onClick={() => viewItem(row)}
          >
            {row.itemName}
          </button>
        ),
      },
      { key: "inhand", header: "Inhand", width: "22%" },
      { key: "onHoldQty", header: "On Hold Qty", width: "22%" },
      {
        key: "actions",
        header: "Actions",
        align: "right" as const,
        render: (row: InventoryStockRow) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => viewItem(row)}>
              View Item
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setBatchItem(row)}>
              Batch Wise Stock
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  function onStoreChange(nextStoreEncId: string) {
    setStoreEncId(nextStoreEncId);
    setCatalogEncId("");
    clearItem();
    setShowStock(false);
  }

  function onCatalogChange(nextCatalogEncId: string) {
    setCatalogEncId(nextCatalogEncId);
    clearItem();
    setShowStock(false);
  }

  function clearItem() {
    setSelectedItem(null);
    setItemSearch("");
    setSuggestionsOpen(false);
  }

  function selectItem(item: InventoryAdjustmentItemOption) {
    setSelectedItem(item);
    setItemSearch("");
    setSuggestionsOpen(false);
    setShowStock(false);
  }

  function checkStock() {
    if (!storeEncId || !catalogEncId) return;
    setPage(1);
    setShowStock(true);
  }

  function viewItem(item: InventoryStockRow) {
    if (!item.itemSpCode) return;
    navigate(`${basePath}/items/details/${encodeURIComponent(item.itemSpCode)}?source=stocks&p_source=stocks`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stocks"
        subtitle=""
        back={{ label: "Inventory", href: `${basePath}/inventory` }}
        onNavigate={navigate}
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-3 py-7 md:px-4">
          <div className="max-w-[900px] space-y-3">
            <SelectField
              label="Select Store"
              value={storeEncId}
              options={toSelectOptions(optionsQuery.data?.stores, "Select Store")}
              onChange={onStoreChange}
            />
            <SelectField
              label="Select Inventory Catalog"
              value={catalogEncId}
              disabled={!storeEncId}
              options={toSelectOptions(optionsQuery.data?.catalogs, "Select Inventory Catalog")}
              onChange={onCatalogChange}
            />
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Search Item</label>
              {selectedItem ? (
                <div className="flex h-14 items-center justify-between border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
                  <span>{selectedItem.label}</span>
                  <button type="button" className="border-0 bg-transparent text-xl leading-none text-slate-900 hover:text-indigo-700" onClick={clearItem}>
                    &times;
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={itemSearch}
                    disabled={!catalogEncId}
                    onFocus={() => setSuggestionsOpen(true)}
                    onChange={(event) => {
                      setItemSearch(event.target.value);
                      setSuggestionsOpen(true);
                    }}
                    placeholder="Search items"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
                  />
                  {suggestionsOpen && catalogEncId ? (
                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {(itemSuggestionsQuery.data?.rows ?? []).length ? (
                        itemSuggestionsQuery.data?.rows.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="block w-full border-0 border-b border-slate-100 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:bg-indigo-50"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectItem(item)}
                          >
                            <span className="font-semibold">{item.label}</span>
                            {item.spCode ? <span className="ml-2 text-xs text-slate-500">{item.spCode}</span> : null}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-slate-500">{itemSuggestionsQuery.isLoading ? "Loading..." : "No items found"}</div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div className="pt-3">
              <Button type="button" variant="primary" disabled={!storeEncId || !catalogEncId} onClick={checkStock}>
                Check Stock
              </Button>
            </div>
          </div>

          {showStock ? (
            <div className="mt-11">
              <DataTable
                data={rows}
                columns={columns}
                loading={stocksQuery.isLoading}
                pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
                emptyState={<EmptyState title="No Items found" description="" />}
                className="rounded-none border-x-0 border-b-0 shadow-none"
                tableClassName="text-sm"
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <BatchWiseStockDialog
        item={batchItem}
        storeEncId={storeEncId}
        catalogEncId={catalogEncId}
        onClose={() => setBatchItem(null)}
      />
    </div>
  );
}

function BatchWiseStockDialog({
  item,
  storeEncId,
  catalogEncId,
  onClose,
}: {
  item: InventoryStockRow | null;
  storeEncId: string;
  catalogEncId: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const batchQuery = useInventoryStocksPage(page, DEFAULT_PAGE_SIZE, {
    storeEncId,
    catalogEncId,
    spItemCode: item?.itemSpCode,
    enabled: Boolean(item),
  });
  const rows = batchQuery.data?.rows ?? [];

  useEffect(() => {
    if (item) setPage(1);
  }, [item]);

  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      title={item ? `Batch wise stock for ${item.itemName}` : "Batch Wise Stock"}
      size="lg"
      closeIcon="x"
      contentClassName="w-[min(94vw,760px)] max-w-[94vw] min-h-[360px] max-h-[86vh] overflow-y-auto rounded-md p-5"
      headerClassName="mb-5 border-b border-slate-200 pb-5"
      bodyClassName="min-h-[255px]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 pb-3 text-sm text-slate-900">
          <div className="font-semibold">
            Total Inhand : <span className="font-normal">{item?.inhand ?? 0}</span>
          </div>
          <div className="font-semibold">
            Total On hold : <span className="font-normal">{item?.onHoldQty ?? 0}</span>
          </div>
        </div>
        <DataTable
          data={rows}
          loading={batchQuery.isLoading}
          columns={[
            { key: "batch", header: "Batch", render: (row: InventoryStockRow) => row.batch || "-" },
            { key: "expiryDate", header: "Expiry Date", render: (row: InventoryStockRow) => row.expiryDate || "-" },
            { key: "inhand", header: "Inhand" },
            { key: "onHoldQty", header: "On Hold Qty" },
            {
              key: "status",
              header: "Status",
              align: "center" as const,
              render: (row: InventoryStockRow) => {
                const label = getStockStatus(row);
                return <Badge variant={getOrdersStatusVariant(label)}>{label}</Badge>;
              },
            },
          ]}
          pagination={{
            page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: batchQuery.data?.total ?? 0,
            mode: "server",
            onChange: setPage,
          }}
          emptyState={<EmptyState title="No Batch Wise Stock Found" description="" />}
          className="rounded-none border-0 shadow-none"
        />
      </div>
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label} <span className="text-red-600">*</span>
      </span>
      <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} options={options} className="w-full" />
    </label>
  );
}

function toSelectOptions(options: Array<{ id: string; label: string }> | undefined, placeholder: string) {
  return [{ value: "", label: placeholder }, ...(options ?? []).map((option) => ({ value: option.id, label: option.label }))];
}

function getStockStatus(row: InventoryStockRow) {
  if (row.expiryDate) {
    const expiry = new Date(row.expiryDate);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (expiry < today) return "Expired";
  }
  return row.inhand || row.onHoldQty ? "In Stock" : "Out of Stock";
}
