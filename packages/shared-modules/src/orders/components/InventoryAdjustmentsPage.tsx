import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useChangeInventoryAdjustmentStatus,
  useInventoryAdjustmentDetail,
  useInventoryAdjustmentFormOptions,
  useInventoryAdjustmentsPage,
  useInventoryCatalogItemsPage,
  useCreateInventoryAdjustmentRemark,
  useSaveInventoryAdjustment,
} from "../queries/orders";
import { appendReturnTo, getCurrentReturnTo, getOrdersStatusVariant, resolveInternalReturnToHref, resolveReturnToLabel } from "../services/orders";
import type { InventoryAdjustmentDetailItem, InventoryAdjustmentRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function InventoryAdjustmentsPage() {
  const { basePath, routeParams } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const action = routeParams?.tab ?? null;
  const uid = routeParams?.recordId ?? null;

  if (action === "create" || action === "update") {
    return <InventoryAdjustmentForm mode={action === "update" ? "update" : "create"} uid={uid} />;
  }

  return <InventoryAdjustmentsList basePath={basePath} onNavigate={navigate} />;
}

function InventoryAdjustmentsList({ basePath, onNavigate }: { basePath: string; onNavigate: (href: string) => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryAdjustments",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [statusFilter],
  });
  const filters = useMemo(
    () => ({
      ...(statusFilter !== "all" ? { "status-eq": statusFilter } : {}),
    }),
    [statusFilter]
  );
  const adjustmentsQuery = useInventoryAdjustmentsPage(page, pageSize, filters);
  const rows = adjustmentsQuery.data?.rows ?? [];
  const total = adjustmentsQuery.data?.total ?? 0;
  const backHref = `${basePath}/inventory`;
  const createHref = appendReturnTo(`${basePath}/inventory/adjust/create`, getCurrentReturnTo());

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total]);

  const columns = useMemo(
    () => [
      { key: "storeName", header: "Store", width: "24%" },
      { key: "remark", header: "Remark", width: "30%" },
      {
        key: "status",
        header: "Status",
        render: (row: InventoryAdjustmentRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{formatStatus(row.status)}</Badge>,
      },
      { key: "createdDate", header: "Date" },
      {
        key: "actions",
        header: "Actions",
        align: "right" as const,
        render: (row: InventoryAdjustmentRow) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate(appendReturnTo(`${basePath}/inventory/adjust/update/${encodeURIComponent(row.uid)}`, getCurrentReturnTo()))}
          >
            {row.status === "DRAFT" ? "Update" : "View"}
          </Button>
        ),
      },
    ],
    [basePath, onNavigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjustments"
        subtitle=""
        back={{ label: "Inventory", href: backHref }}
        onNavigate={onNavigate}
        actions={
          <Button type="button" variant="primary" onClick={() => onNavigate(createHref)}>
            <span className="mr-1 text-xl leading-none">+</span>
            Create
          </Button>
        }
      />

      <SectionCard className="rounded-none border-slate-200 shadow-sm" padding={false}>
        <div className="px-4 pb-5 pt-7">
          <div className="mb-20 flex items-start justify-between gap-4">
            <h2 className="m-0 text-lg font-semibold text-slate-900">
              Adjustments{total ? ` (${total})` : ""}
            </h2>
            <div className="relative">
              <button
                type="button"
                aria-label="Filter adjustments"
                title="Filter adjustments"
                onClick={() => setFiltersOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-indigo-800 transition hover:border-indigo-100 hover:bg-indigo-50"
              >
                <FilterIcon />
              </button>
              {filtersOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                    <Select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      options={[
                        { value: "all", label: "All Statuses" },
                        { value: "DRAFT", label: "Draft" },
                        { value: "SUBMITTED", label: "Submitted" },
                        { value: "PROCESSED", label: "Processed" },
                      ]}
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
          loading={adjustmentsQuery.isLoading}
          pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
          emptyState={<EmptyState title="No Adjustments Found" description="" />}
          className="rounded-none border-x-0 border-b-0 shadow-none"
          tableClassName="text-sm"
        />
      </SectionCard>
    </div>
  );
}

function InventoryAdjustmentForm({ mode, uid }: { mode: "create" | "update"; uid: string | null }) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const saveAdjustment = useSaveInventoryAdjustment();
  const changeStatus = useChangeInventoryAdjustmentStatus();
  const createRemark = useCreateInventoryAdjustmentRemark();
  const detailQuery = useInventoryAdjustmentDetail(mode === "update" ? uid : null);
  const [storeEncId, setStoreEncId] = useState("");
  const [catalogEncId, setCatalogEncId] = useState("");
  const [remarkEncId, setRemarkEncId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InventoryAdjustmentDetailItem[]>([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkName, setRemarkName] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [draftSelectedItemIds, setDraftSelectedItemIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const optionsQuery = useInventoryAdjustmentFormOptions(storeEncId, catalogEncId);
  const catalogItemsQuery = useInventoryCatalogItemsPage(catalogEncId, itemPage, 10, itemSearch);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const listHref = `${basePath}/inventory/adjust`;
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo) || listHref, [listHref, returnTo]);
  const backLabel = useMemo(() => resolveReturnToLabel(returnTo), [returnTo]);
  const status = detailQuery.data?.status ?? "DRAFT";
  const editable = mode === "create" || status === "DRAFT";
  const canSave = Boolean(storeEncId && catalogEncId && remarkEncId && items.length) && editable && !saveAdjustment.isPending;

  useEffect(() => {
    if (!detailQuery.data) return;
    setStoreEncId(detailQuery.data.storeEncId);
    setCatalogEncId(detailQuery.data.catalogEncId);
    setRemarkEncId(detailQuery.data.remarkEncId);
    setNotes(detailQuery.data.notes);
    setItems(detailQuery.data.items);
  }, [detailQuery.data]);

  function openItemDialog() {
    if (!catalogEncId) {
      setError("Please select inventory catalog to add items.");
      return;
    }
    setError("");
    setDraftSelectedItemIds(items.map((item) => item.inventoryCatalogEncId));
    setItemDialogOpen(true);
  }

  function toggleDraftItem(itemId: string) {
    setDraftSelectedItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  function applySelectedItems() {
    const existingById = new Map(items.map((item) => [item.inventoryCatalogEncId, item]));
    const visibleItems = catalogItemsQuery.data?.rows ?? [];
    const visibleById = new Map(visibleItems.map((item) => [item.id, item]));
    const nextItems = draftSelectedItemIds
      .map((id) => {
        const existing = existingById.get(id);
        if (existing) return existing;
        const option = visibleById.get(id);
        if (!option) return null;
        return {
          id: option.spCode || option.id,
          name: option.label,
          inventoryCatalogEncId: option.id,
          batch: "",
          quantity: 1,
          batchApplicable: option.batchApplicable,
        };
      })
      .filter((item): item is InventoryAdjustmentDetailItem => Boolean(item));
    setItems(nextItems);
    setItemDialogOpen(false);
  }

  function updateItemQuantity(inventoryCatalogEncId: string, value: string) {
    const quantity = Math.max(1, Number(value) || 1);
    setItems((current) => current.map((item) => item.inventoryCatalogEncId === inventoryCatalogEncId ? { ...item, quantity } : item));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const payload = buildAdjustmentPayload({
      uid: mode === "update" ? uid : null,
      storeEncId,
      catalogEncId,
      remarkEncId,
      notes,
      items,
    });

    try {
      await saveAdjustment.mutateAsync({ payload, mode });
      navigate(listHref);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Stock adjustment could not be saved.");
    }
  }

  async function handleStatus(status: string) {
    if (!uid) return;
    await changeStatus.mutateAsync({ uid, status });
    navigate(listHref);
  }

  if (mode === "update" && detailQuery.isLoading) {
    return <SectionCard className="border-slate-200 shadow-sm"><div className="text-sm text-slate-500">Loading adjustment...</div></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "update" ? "Inventory Adjustment" : "Create Inventory Adjustment"}
        subtitle={mode === "update" ? `Status: ${formatStatus(status)}` : "Create a stock adjustment against an inventory catalog."}
        back={{ label: backHref === listHref ? "Adjustments" : backLabel, href: backHref }}
        onNavigate={navigate}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectField label="Select Store" value={storeEncId} disabled={!editable || mode === "update"} onChange={(value) => { setStoreEncId(value); setCatalogEncId(""); setItems([]); }} options={toSelectOptions(optionsQuery.data?.stores, "Select Store")} />
            <SelectField label="Inventory Catalog" value={catalogEncId} disabled={!editable || !storeEncId || mode === "update"} onChange={(value) => { setCatalogEncId(value); setItems([]); }} options={toSelectOptions(optionsQuery.data?.catalogs, "Select Catalog")} />
            <RemarkField
              value={remarkEncId}
              disabled={!editable}
              onChange={setRemarkEncId}
              options={toSelectOptions(optionsQuery.data?.remarks, "Select Remark")}
              onCreate={() => setRemarkDialogOpen(true)}
            />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              value={notes}
              disabled={!editable}
              maxLength={500}
              rows={3}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Enter Notes (Max: 500 chars)"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
            />
          </label>
        </SectionCard>

        <SectionCard title="Add Items" className="border-slate-200 shadow-sm">
          {editable ? (
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                placeholder="Search items"
                disabled={!catalogEncId}
                onFocus={openItemDialog}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-50"
              />
              <Button type="button" variant="outline" onClick={openItemDialog} disabled={!catalogEncId}>
                Add Items
              </Button>
            </div>
          ) : null}
          <DataTable
            data={items}
            columns={[
              { key: "name", header: "Item Name & ID", render: (row: InventoryAdjustmentDetailItem) => <div><div className="font-semibold text-slate-900">{row.name}</div><div className="text-xs text-slate-500">{row.id}</div></div> },
              { key: "batch", header: "Batch", render: (row: InventoryAdjustmentDetailItem) => row.batch || "-" },
              { key: "stock", header: "Stock", render: (row: InventoryAdjustmentDetailItem) => row.stock ?? "-" },
              {
                key: "quantity",
                header: "Qty",
                render: (row: InventoryAdjustmentDetailItem) => (
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    disabled={!editable}
                    onChange={(event) => updateItemQuantity(row.inventoryCatalogEncId, event.target.value)}
                    className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-50"
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                align: "right" as const,
                render: (row: InventoryAdjustmentDetailItem) => editable ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setItems((current) => current.filter((item) => item.inventoryCatalogEncId !== row.inventoryCatalogEncId))}>
                    Remove
                  </Button>
                ) : null,
              },
            ]}
            emptyState={<EmptyState title="No items added" description="Select a catalog item and add it to the adjustment." />}
          />
          {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(backHref)}>Cancel</Button>
            {editable ? <Button type="submit" variant="primary" disabled={!canSave}>{saveAdjustment.isPending ? "Saving..." : mode === "update" ? "Update" : "Save"}</Button> : null}
            {mode === "update" && status === "DRAFT" ? <Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => handleStatus("SUBMITTED")}>Submit</Button> : null}
            {mode === "update" && status === "SUBMITTED" ? <Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => handleStatus("DRAFT")}>Make as Draft</Button> : null}
            {mode === "update" && status === "SUBMITTED" ? <Button type="button" variant="primary" disabled={changeStatus.isPending} onClick={() => handleStatus("PROCESSED")}>Approve</Button> : null}
          </div>
        </SectionCard>
      </form>
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        title="Select Items"
        size="fullscreen"
        contentClassName="h-auto max-h-[92vh] w-[min(98vw,1280px)] max-w-[98vw] overflow-y-auto rounded-none p-4"
        headerClassName="mb-6"
        closeIcon="x"
      >
        <div className="rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4">
            <div className="flex">
              <input
                value={itemSearch}
                onChange={(event) => {
                  setItemSearch(event.target.value);
                  setItemPage(1);
                }}
                placeholder="Search Items"
                className="h-10 w-48 rounded-l-md border border-slate-300 px-3 text-sm focus:border-[#33009C] focus:outline-none"
              />
              <button type="button" className="flex h-10 w-12 items-center justify-center rounded-r-md bg-[#33009C] text-white">
                <SearchIcon />
              </button>
            </div>
            <Button type="button" variant="primary" onClick={applySelectedItems}>
              Done
            </Button>
          </div>
          <DataTable
            data={catalogItemsQuery.data?.rows ?? []}
            loading={catalogItemsQuery.isLoading}
            columns={[
              {
                key: "select",
                header: "",
                width: 80,
                align: "center" as const,
                render: (row) => (
                  <input
                    type="checkbox"
                    checked={draftSelectedItemIds.includes(row.id)}
                    onChange={() => toggleDraftItem(row.id)}
                    className="h-4 w-4"
                  />
                ),
              },
              { key: "label", header: "Item Name", width: "43%" },
              { key: "description", header: "Description", render: (row) => row.description || "-" },
            ]}
            pagination={{
              page: itemPage,
              pageSize: 10,
              total: catalogItemsQuery.data?.total ?? 0,
              mode: "server",
              onChange: setItemPage,
            }}
            emptyState={<EmptyState title="No items found" description="" />}
            className="rounded-none border-0 shadow-none"
          />
        </div>
      </Dialog>
      <Dialog
        open={remarkDialogOpen}
        onClose={() => setRemarkDialogOpen(false)}
        title="Create Remark"
        size="md"
        closeIcon="x"
      >
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Remark Name<span className="text-red-600">*</span>
            </span>
            <input
              value={remarkName}
              onChange={(event) => setRemarkName(event.target.value)}
              placeholder="Enter Remark Name"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-[#33009C] focus:outline-none focus:ring-2 focus:ring-[#33009C]/15"
            />
          </label>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="primary"
              disabled={!remarkName.trim() || createRemark.isPending}
              onClick={async () => {
                const result = await createRemark.mutateAsync(remarkName.trim());
                const nextId = String(result?.encId ?? result?.uid ?? result?.id ?? result ?? "").trim();
                if (nextId) {
                  setRemarkEncId(nextId);
                }
                setRemarkName("");
                setRemarkDialogOpen(false);
              }}
            >
              {createRemark.isPending ? "Creating..." : "Create Remark"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SelectField({ label, value, options, disabled, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label} <span className="text-red-600">*</span></span>
      <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} options={options} className="w-full" />
    </label>
  );
}

function RemarkField({ value, options, disabled, onChange, onCreate }: { value: string; options: Array<{ value: string; label: string }>; disabled?: boolean; onChange: (value: string) => void; onCreate: () => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        Remark <span className="text-red-600">*</span>
      </span>
      <div className="flex">
        <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} options={options} className="w-full [&>select]:rounded-r-none" />
        <button
          type="button"
          disabled={disabled}
          onClick={onCreate}
          className="flex h-10 w-12 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[#33009C] bg-[#33009C] text-2xl leading-none text-white transition hover:bg-[#250075] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200"
          aria-label="Create remark"
          title="Create remark"
        >
          +
        </button>
      </div>
    </label>
  );
}

function toSelectOptions(options: Array<{ id: string; label: string }> | undefined, placeholder: string) {
  return [{ value: "", label: placeholder }, ...(options ?? []).map((option) => ({ value: option.id, label: option.label }))];
}

function buildAdjustmentPayload({
  uid,
  storeEncId,
  catalogEncId,
  remarkEncId,
  notes,
  items,
}: {
  uid: string | null;
  storeEncId: string;
  catalogEncId: string;
  remarkEncId: string;
  notes: string;
  items: InventoryAdjustmentDetailItem[];
}) {
  return {
    ...(uid ? { uid } : {}),
    description: notes,
    store: { encId: storeEncId },
    catalogDto: { encId: catalogEncId },
    inventoryRemarkDto: { encId: remarkEncId },
    stockAdjustDetailsDtos: items.map((item) => ({
      invCatalog: { encId: catalogEncId },
      invCatalogItem: { encId: item.inventoryCatalogEncId },
      qty: item.quantity,
      ...(item.batch ? { batch: item.batch } : {}),
    })),
  };
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function FilterIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.25A1.25 1.25 0 0 1 4.25 4h15.5a1.25 1.25 0 0 1 .96 2.05L14.5 13.5v5.25a1.25 1.25 0 0 1-.68 1.11l-3 1.55A1.25 1.25 0 0 1 9 20.3v-6.8L3.29 6.05A1.25 1.25 0 0 1 3 5.25Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
