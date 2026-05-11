import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, Dialog, DialogFooter, EmptyState, Input, PageHeader, Popover, PopoverSection, SectionCard, Select, Switch } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useInventoryCatalogDetail,
  useInventoryCatalogDetailItemsPage,
  useInventoryCatalogsPage,
  useInventoryStocksFormOptions,
  useUpdateInventoryCatalog,
  useUpdateInventoryCatalogItem,
  useUpdateInventoryCatalogItemStatus,
  useUpdateInventoryCatalogStatus,
} from "../queries/orders";
import { getOrdersStatusVariant } from "../services/orders";
import type { InventoryCatalogItemRow, InventoryCatalogRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function InventoryCatalogsPage() {
  const { routeParams } = useSharedModulesContext();
  const action = routeParams?.tab ?? "";
  const encId = routeParams?.recordId ?? "";

  if (action === "details" && encId) {
    return <InventoryCatalogDetails encId={encId} />;
  }

  if (action === "update" && encId) {
    return <InventoryCatalogUpdate encId={encId} />;
  }

  return <InventoryCatalogList />;
}

function InventoryCatalogList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [storeEncId, setStoreEncId] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const optionsQuery = useInventoryStocksFormOptions(storeEncId);
  const updateStatus = useUpdateInventoryCatalogStatus();
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryCatalogs",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [storeEncId, submittedQuery, statusFilter],
  });
  const filters = useMemo(() => (statusFilter === "all" ? {} : { "status-eq": statusFilter }), [statusFilter]);
  const catalogsQuery = useInventoryCatalogsPage(page, pageSize, storeEncId, { searchText: submittedQuery, filters });
  const rows = catalogsQuery.data?.rows ?? [];
  const total = catalogsQuery.data?.total ?? 0;

  useEffect(() => {
    if (!storeEncId && optionsQuery.data?.stores?.length) {
      setStoreEncId(optionsQuery.data.stores[0].id);
    }
  }, [optionsQuery.data?.stores, storeEncId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total]);

  function searchCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setPage(1);
  }

  async function toggleCatalog(row: InventoryCatalogRow) {
    await updateStatus.mutateAsync({ encId: row.encId, status: row.active ? "Inactive" : "Active" });
  }

  const columns = useMemo(
    () => [
      {
        key: "catalog",
        header: "Inventory Catalog & Id",
        width: "34%",
        render: (row: InventoryCatalogRow) => (
          <button
            type="button"
            onClick={() => navigate(`${basePath}/inventory/catalogs/details/${encodeURIComponent(row.encId)}`)}
            className="flex items-center gap-3 border-0 bg-transparent p-0 text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-white text-indigo-700 shadow-[0_4px_14px_rgba(15,23,42,0.14)]">
              <CatalogIcon />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{row.name}</div>
              <div className="text-sm text-slate-600">{row.encId}</div>
            </div>
          </button>
        ),
      },
      { key: "storeName", header: "Store Name", width: "31%" },
      {
        key: "status",
        header: "Status",
        width: "15%",
        render: (row: InventoryCatalogRow) => (
          <Switch checked={row.active} onChange={() => toggleCatalog(row)} />
        ),
      },
      {
        key: "actions",
        header: "",
        align: "center" as const,
        render: (row: InventoryCatalogRow) => (
          <Popover
            align="end"
            portal
            contentClassName="min-w-[116px] rounded-md p-2"
            trigger={
              <Button type="button" variant="outline" size="sm">
                Actions
              </Button>
            }
          >
            <PopoverSection className="space-y-1">
              <button type="button" onClick={() => navigate(`${basePath}/inventory/catalogs/details/${encodeURIComponent(row.encId)}`)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50">
                View
              </button>
              <button type="button" onClick={() => navigate(`${basePath}/inventory/catalogs/update/${encodeURIComponent(row.encId)}`)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50">
                Edit
              </button>
            </PopoverSection>
          </Popover>
        ),
      },
    ],
    [basePath, navigate, updateStatus]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogs"
        subtitle=""
        back={{ label: "Inventory", href: `${basePath}/inventory` }}
        onNavigate={navigate}
        actions={
          <Button type="button" variant="primary" onClick={() => undefined}>
            <span className="mr-1 text-xl leading-none">+</span>
            Create
          </Button>
        }
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 pb-4 pt-5">
          <h2 className="mb-7 text-lg font-semibold text-slate-900">Inventory Catalog({total})</h2>
          <div className="flex items-center justify-between gap-4">
            <form onSubmit={searchCatalog} className="flex w-full max-w-[660px]">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value) setSubmittedQuery("");
                }}
                placeholder="Search catalog"
                className="h-10 flex-1 rounded-l-md border border-slate-300 px-3 text-sm focus:outline-none"
              />
              <button type="submit" disabled={!query.trim()} className="flex h-10 w-11 items-center justify-center rounded-r-md border-0 bg-slate-200 text-white disabled:opacity-70" aria-label="Search catalog">
                <SearchIcon />
              </button>
            </form>
            <div className="relative">
              <button type="button" aria-label="Filter catalogs" onClick={() => setFiltersOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center border-0 bg-transparent text-indigo-800">
                <FilterIcon />
              </button>
              {filtersOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                    <Select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value);
                        setPage(1);
                      }}
                      options={[
                        { value: "all", label: "All Statuses" },
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                      ]}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Store</span>
                    <Select
                      value={storeEncId}
                      onChange={(event) => {
                        setStoreEncId(event.target.value);
                        setPage(1);
                      }}
                      options={toSelectOptions(optionsQuery.data?.stores, "Select Store")}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          loading={catalogsQuery.isLoading}
          pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
          emptyState={<EmptyState title="No Catalogs found" description="" />}
          className="rounded-none border-x-0 border-b-0 shadow-none"
          tableClassName="text-sm"
        />
      </SectionCard>
    </div>
  );
}

function InventoryCatalogDetails({ encId }: { encId: string }) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const detailQuery = useInventoryCatalogDetail(encId);
  const updateCatalogStatus = useUpdateInventoryCatalogStatus();
  const updateItemStatus = useUpdateInventoryCatalogItemStatus(encId);
  const updateCatalogItem = useUpdateInventoryCatalogItem(encId);

  // States for threshold edit dialog
  const [selectedRow, setSelectedRow] = useState<InventoryCatalogItemRow | null>(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryCatalogItems",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [encId, submittedQuery, statusFilter],
  });
  const filters = useMemo(() => (statusFilter === "all" ? {} : { "status-eq": statusFilter }), [statusFilter]);
  const itemsQuery = useInventoryCatalogDetailItemsPage(encId, page, pageSize, { searchText: submittedQuery, filters });
  const catalog = detailQuery.data;
  const rows = itemsQuery.data?.rows ?? [];
  const total = itemsQuery.data?.total ?? 0;

  function searchItems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setPage(1);
  }

  const handleEditThreshold = useCallback((row: InventoryCatalogItemRow) => {
    setSelectedRow(row);
    setThresholdValue(row.reorderQuantity == null ? "0" : String(row.reorderQuantity));
    setIsThresholdDialogOpen(true);
  }, []);

  async function handleSaveThreshold() {
    if (!selectedRow) return;
    try {
      const payload = {
        item: {
          spCode: selectedRow.spCode ?? "",
          reorderQuantity: Number(thresholdValue) || 0,
        },
      };
      await updateCatalogItem.mutateAsync({
        encId: selectedRow.encId,
        payload,
      });
      setIsThresholdDialogOpen(false);
      setSelectedRow(null);
    } catch (err) {
      console.error("Failed to update item threshold:", err);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "item",
        header: "Item & Id",
        width: "28%",
        render: (row: InventoryCatalogItemRow) => (
          <div>
            <div className="font-semibold text-slate-900">{row.itemName}</div>
            <div className="text-xs text-slate-500">Id : {row.spCode || row.encId}</div>
          </div>
        ),
      },
      {
        key: "reorderQuantity",
        header: "Item Threshold",
        render: (row: InventoryCatalogItemRow) => {
          if (row.hasAttributes) {
            return "-";
          }
          return (
            <div className="flex items-center gap-1.5">
              <span>{row.reorderQuantity ?? 0}</span>
              <button
                type="button"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-indigo-600 transition-colors hover:bg-slate-100"
                onClick={() => handleEditThreshold(row)}
                aria-label="Edit item threshold"
              >
                <PencilIcon />
              </button>
            </div>
          );
        },
      },
      { key: "hasAttributes", header: "Attributes", render: (row: InventoryCatalogItemRow) => row.hasAttributes ? "YES" : "No" },
      {
        key: "status",
        header: "Actions",
        render: (row: InventoryCatalogItemRow) => row.spCode ? (
          <Switch checked={row.active} onChange={() => updateItemStatus.mutate({ encId: row.encId, status: row.active ? "Inactive" : "Active" })} />
        ) : null,
      },
      {
        key: "details",
        header: "",
        align: "right" as const,
        render: (row: InventoryCatalogItemRow) => row.hasAttributes ? (
          <Button type="button" variant="outline" size="sm" disabled={!row.active}>
            View Details
          </Button>
        ) : null,
      },
    ],
    [updateItemStatus, handleEditThreshold]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Details"
        subtitle=""
        back={{ label: "Catalogs", href: `${basePath}/inventory/catalogs` }}
        onNavigate={navigate}
        actions={
          catalog ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/inventory/catalogs/update/${encodeURIComponent(catalog.encId)}?source=inventory-catalog-details`)}>
                Edit
              </Button>
              <Button type="button" variant="primary" onClick={() => updateCatalogStatus.mutate({ encId: catalog.encId, status: catalog.active ? "Inactive" : "Active" })}>
                {catalog.active ? "Disable" : "Enable"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 py-5">
          {catalog ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center bg-white text-indigo-700 shadow-[0_4px_14px_rgba(15,23,42,0.14)]">
                  <CatalogIcon />
                </div>
                <div>
                  <h2 className="m-0 text-xl font-semibold text-slate-900">{catalog.name}</h2>
                  <div className="text-sm text-slate-600">Id : {catalog.encId}</div>
                </div>
              </div>
              <div className="mb-2 grid rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-slate-500">Status</div>
                  <Badge variant={getOrdersStatusVariant(catalog.status)}>{catalog.status}</Badge>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Store Name</div>
                  <div className="text-sm font-medium text-slate-900">{catalog.storeName}</div>
                </div>
              </div>
            </>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-4">
            <form onSubmit={searchItems} className="flex w-full max-w-[460px]">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value) setSubmittedQuery("");
                }}
                placeholder="Search Item with name"
                className="h-10 flex-1 rounded-l-md border border-slate-300 px-3 text-sm focus:outline-none"
              />
              <button type="submit" disabled={!query.trim()} className="flex h-10 w-11 items-center justify-center rounded-r-md border-0 bg-slate-200 text-white disabled:opacity-70" aria-label="Search items">
                <SearchIcon />
              </button>
            </form>
            <div className="flex items-center gap-4">
              <Button type="button" variant="primary" size="sm">+ Add Items</Button>
              <div className="relative">
                <button type="button" aria-label="Filter items" onClick={() => setFiltersOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center border-0 bg-transparent text-indigo-800">
                  <FilterIcon />
                </button>
                {filtersOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                      <Select
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPage(1);
                        }}
                        options={[
                          { value: "all", label: "All Statuses" },
                          { value: "Active", label: "Enabled" },
                          { value: "Inactive", label: "Disabled" },
                        ]}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          loading={detailQuery.isLoading || itemsQuery.isLoading}
          pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
          emptyState={<EmptyState title="No Items found" description="" />}
          className="rounded-none border-x-0 border-b-0 shadow-none"
          tableClassName="text-sm"
        />
      </SectionCard>

      <Dialog
        open={isThresholdDialogOpen}
        onClose={() => {
          setIsThresholdDialogOpen(false);
          setSelectedRow(null);
        }}
        title="Edit Item threshold"
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            id="edit-item-threshold-input"
            label="Item threshold"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsThresholdDialogOpen(false);
                setSelectedRow(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveThreshold}
              disabled={updateCatalogItem.isPending}
            >
              {updateCatalogItem.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}

function InventoryCatalogUpdate({ encId }: { encId: string }) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const detailQuery = useInventoryCatalogDetail(encId);
  const updateCatalog = useUpdateInventoryCatalog();
  const [catalogName, setCatalogName] = useState("");
  const [storeEncId, setStoreEncId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!detailQuery.data) return;
    setCatalogName(detailQuery.data.name);
    setStoreEncId(detailQuery.data.storeEncId);
  }, [detailQuery.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalogName.trim()) {
      setError("Catalog name is required.");
      return;
    }
    try {
      await updateCatalog.mutateAsync({
        encId,
        payload: {
          catalogName: catalogName.trim(),
          storeEncId,
        },
      });
      navigate(`${basePath}/inventory/catalogs/details/${encodeURIComponent(encId)}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Catalog could not be updated.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Update Catalog"
        subtitle=""
        back={{ label: "Catalogs", href: `${basePath}/inventory/catalogs` }}
        onNavigate={navigate}
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm">
        <form onSubmit={submit} className="max-w-[680px] space-y-4 pt-10">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Catalog Name <span className="text-red-600">*</span>
            </span>
            <input
              value={catalogName}
              onChange={(event) => setCatalogName(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Store Name <span className="text-red-600">*</span>
            </span>
            <input value={detailQuery.data?.storeName ?? ""} disabled className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500" />
          </label>
          {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="flex justify-center gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/inventory/catalogs`)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={updateCatalog.isPending || !catalogName.trim()}>
              {updateCatalog.isPending ? "Updating..." : "Update Catalog"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function toSelectOptions(options: Array<{ id: string; label: string }> | undefined, placeholder: string) {
  return [{ value: "", label: placeholder }, ...(options ?? []).map((option) => ({ value: option.id, label: option.label }))];
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.25A1.25 1.25 0 0 1 4.25 4h15.5a1.25 1.25 0 0 1 .96 2.05L14.5 13.5v5.25a1.25 1.25 0 0 1-.68 1.11l-3 1.55A1.25 1.25 0 0 1 9 20.3v-6.8L3.29 6.05A1.25 1.25 0 0 1 3 5.25Z" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 8h14l-1.4 7.2a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.7L5.1 4.8H2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 20.2h.1M17 20.2h.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M10.5 6.5 12 4l1.5 2.5M15.8 6.5 17.2 4l1.5 2.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6.5 7.2 4.4" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-indigo-600">
      <path d="M11.85 3.15L14.85 6.15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 15L6.45 14.25L14.1 6.6C14.55 6.15 14.55 5.4 14.1 4.95L13.05 3.9C12.6 3.45 11.85 3.45 11.4 3.9L3.75 11.55L3 15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
