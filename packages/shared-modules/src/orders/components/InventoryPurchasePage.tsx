import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, Dialog, EmptyState, Popover, PopoverSection, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useCalculateInventoryPurchaseItem,
  useChangeInventoryPurchaseStatus,
  useInventoryCatalogItemsPage,
  useInventoryPurchaseDetail,
  useInventoryPurchaseFormOptions,
  useInventoryPurchaseItemsByUid,
  useInventoryPurchasePage,
  useInventoryPurchaseSalesOrderCatalogs,
  usePushInventoryPurchaseToFinance,
  useSaveInventoryPurchase,
  useSaveInventoryPurchasePrices,
} from "../queries/orders";
import { appendReturnTo, formatOrdersCurrency, getCurrentReturnTo, getOrdersStatusVariant, resolveInternalReturnToHref, resolveReturnToLabel } from "../services/orders";
import type { InventoryPurchaseItemDraft, InventoryPurchasePriceRow, InventoryPurchaseRow } from "../types";
import { SharedOrdersLayout } from "./shared";

const DEFAULT_PAGE_SIZE = 10;

type ItemEditorState = InventoryPurchaseItemDraft & {
  rowIndex: number | null;
};

export function InventoryPurchasePage() {
  const { routeParams } = useSharedModulesContext();
  const action = routeParams?.tab ?? null;
  const uid = routeParams?.recordId ?? null;

  if (action === "editprice") {
    return <InventoryPurchaseEditPricePage uid={uid} />;
  }

  if (action === "create" || action === "update") {
    return <InventoryPurchaseForm mode={action === "update" ? "update" : "create"} uid={uid} />;
  }

  return <InventoryPurchaseList />;
}

function InventoryPurchaseList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const pushToFinance = usePushInventoryPurchaseToFinance();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "inventoryPurchases",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [statusFilter, searchText],
  });
  const purchasesQuery = useInventoryPurchasePage(page, pageSize, {
    searchText,
    status: statusFilter !== "all" ? statusFilter : "",
  });
  const rows = purchasesQuery.data?.rows ?? [];
  const total = purchasesQuery.data?.total ?? 0;
  const createHref = appendReturnTo(`${basePath}/inventory/purchase/create`, getCurrentReturnTo());

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, setPage, total]);

  const columns = useMemo(
    () => [
      {
        key: "purchaseReferenceNo",
        header: "Purchase Reference No",
        width: "18%",
        render: (row: InventoryPurchaseRow) => <span className="font-medium text-slate-900">{row.purchaseReferenceNo}</span>,
      },
      { key: "vendorName", header: "Purchase From", width: "18%" },
      { key: "storeName", header: "Purchase To", width: "18%" },
      { key: "invoiceReferenceNo", header: "Purchase Bill #" },
      { key: "invoiceDate", header: "Purchase Bill Date" },
      {
        key: "purchaseStatus",
        header: "Status",
        render: (row: InventoryPurchaseRow) => <Badge variant={getOrdersStatusVariant(row.purchaseStatus)}>{formatStatus(row.purchaseStatus)}</Badge>,
      },
      {
        key: "totalQty",
        header: "Total Item Qty",
        render: (row: InventoryPurchaseRow) => row.totalQuantity + row.totalFreeQuantity,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right" as const,
        render: (row: InventoryPurchaseRow) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(appendReturnTo(`${basePath}/inventory/purchase/update/${encodeURIComponent(row.uid)}`, getCurrentReturnTo()))}
              className="min-w-[86px]"
            >
              {row.purchaseStatus === "APPROVED" ? "View" : row.purchaseStatus === "IN_REVIEW" ? "Approve" : "Edit"}
            </Button>
            <Popover
              align="end"
              trigger={
                <Button type="button" variant="primary" size="sm" className="min-w-[88px]">
                  Actions
                </Button>
              }
            >
              <PopoverSection className="space-y-1">
                {row.purchaseStatus === "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => navigate(appendReturnTo(`${basePath}/inventory/purchase/editprice/${encodeURIComponent(row.uid)}`, getCurrentReturnTo()))}
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Edit Price
                  </button>
                ) : null}
                {row.purchaseStatus === "APPROVED" && !row.pushedToFinance ? (
                  <button
                    type="button"
                    disabled={pushToFinance.isPending}
                    onClick={() => pushToFinance.mutate(row.uid)}
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Push To Expense
                  </button>
                ) : null}
                {row.purchaseStatus === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={() => navigate(appendReturnTo(`${basePath}/inventory/purchase/update/${encodeURIComponent(row.uid)}`, getCurrentReturnTo()))}
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                ) : null}
              </PopoverSection>
            </Popover>
          </div>
        ),
      },
    ],
    [basePath, navigate, pushToFinance]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[30px] font-semibold tracking-[-0.02em] text-slate-900">Purchases{total ? ` (${total})` : ""}</h2>
        <Button type="button" variant="primary" onClick={() => navigate(createHref)}>
          <span className="mr-1 text-xl leading-none">+</span>
          Create
        </Button>
      </div>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full max-w-[580px]">
            <input
              type="text"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search Purchase"
              className="h-11 flex-1 rounded-l-md border border-r-0 border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15"
            />
            <button
              type="button"
              onClick={() => setSearchText(draftSearch.trim())}
              className="flex h-11 w-14 items-center justify-center rounded-r-md bg-slate-400 text-white transition hover:bg-slate-500"
              aria-label="Search purchase"
              title="Search purchase"
            >
              <SearchIcon />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <div className="min-w-[280px]">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: "all", label: "All Purchases" },
                  { value: "DRAFT", label: "Draft" },
                  { value: "IN_REVIEW", label: "In Review" },
                  { value: "APPROVED", label: "Approved" },
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="flex h-11 w-11 items-center justify-center rounded-md text-[#4C1D95] transition hover:bg-[#4C1D95]/5"
              aria-label="Reset purchase filter"
              title="Reset purchase filter"
            >
              <FilterIcon />
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <DataTable
          data={rows}
          columns={columns}
          loading={purchasesQuery.isLoading}
          pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
          emptyState={<EmptyState title="No purchases found" description="Purchases will appear here when inventory purchases are created." />}
          tableClassName="text-sm"
        />
      </SectionCard>
    </div>
  );
}

function InventoryPurchaseForm({ mode, uid }: { mode: "create" | "update"; uid: string | null }) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const detailQuery = useInventoryPurchaseDetail(mode === "update" ? uid : null);
  const savePurchase = useSaveInventoryPurchase();
  const changeStatus = useChangeInventoryPurchaseStatus();
  const calculateItem = useCalculateInventoryPurchaseItem();
  const [storeEncId, setStoreEncId] = useState("");
  const [vendorEncId, setVendorEncId] = useState("");
  const [catalogEncId, setCatalogEncId] = useState("");
  const [invoiceReferenceNo, setInvoiceReferenceNo] = useState("");
  const [purchaseBillDate, setPurchaseBillDate] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");
  const [roundOff, setRoundOff] = useState(0);
  const [items, setItems] = useState<InventoryPurchaseItemDraft[]>([]);
  const [error, setError] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [editorState, setEditorState] = useState<ItemEditorState | null>(null);
  const optionsQuery = useInventoryPurchaseFormOptions(storeEncId);
  const catalogItemsQuery = useInventoryCatalogItemsPage(catalogEncId || null, itemPage, 10, itemSearch);
  const status = detailQuery.data?.purchaseStatus ?? "DRAFT";
  const editable = mode === "create" || status === "DRAFT";
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const listHref = `${basePath}/inventory/purchase`;
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo) || listHref, [listHref, returnTo]);
  const backLabel = useMemo(() => (backHref === listHref ? "Purchases" : resolveReturnToLabel(returnTo)), [backHref, listHref, returnTo]);

  useEffect(() => {
    if (!detailQuery.data) return;
    setStoreEncId(detailQuery.data.storeEncId);
    setVendorEncId(detailQuery.data.vendorEncId);
    setCatalogEncId(detailQuery.data.inventoryCatalogEncId);
    setInvoiceReferenceNo(detailQuery.data.invoiceReferenceNo);
    setPurchaseBillDate(normalizeDateInput(detailQuery.data.invoiceDate));
    setPurchaseNote(detailQuery.data.purchaseNote);
    setRoundOff(detailQuery.data.roundOff);
    setItems(detailQuery.data.items);
  }, [detailQuery.data]);

  const canSubmit =
    Boolean(storeEncId && vendorEncId && catalogEncId && invoiceReferenceNo.trim() && purchaseBillDate && items.length) &&
    editable &&
    !savePurchase.isPending;

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.quantity += item.quantity + item.freeQuantity;
        acc.gross += item.totalPrice;
        acc.discount += item.discountAmount;
        acc.taxable += item.taxableAmt;
        acc.tax += item.taxAmount;
        acc.cess += item.cessAmt;
        acc.bill += item.netTotalPrice;
        return acc;
      },
      { quantity: 0, gross: 0, discount: 0, taxable: 0, tax: 0, cess: 0, bill: 0 }
    );
  }, [items]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = {
      store: { encId: storeEncId },
      invoiceReferenceNo: invoiceReferenceNo.trim(),
      invoiceDate: purchaseBillDate,
      vendor: { encId: vendorEncId },
      inventoryCatalog: { encId: catalogEncId },
      purchaseNote: purchaseNote.trim(),
      roundOff,
      purchaseItemDtoList: items.map((item) => {
        const row: Record<string, unknown> = {
          inventoryCatalogItem: { encId: item.inventoryCatalogEncId },
          quantity: item.quantity,
          freeQuantity: item.freeQuantity,
          amount: item.price,
          discountAmount: item.discountAmount,
          taxableAmount: item.taxableAmt,
          taxAmount: item.taxAmount,
          netAmount: item.netTotalPrice,
          mrp: item.mrp,
          salesRate: item.price,
          batchNo: item.batchValue || undefined,
          cgst: item.cgst,
          sgst: item.sgst,
          unitCode: item.unitValue,
          ...(item.expDate ? { expiryDate: item.expDate } : {}),
          ...(item.discountType === "percentage"
            ? { discountPercentage: item.discount, fixedDiscount: 0 }
            : { discountPercentage: 0, fixedDiscount: item.discount }),
        };

        if (item.orderCatalog) {
          row.invSOrderCatalog = { encId: item.orderCatalog };
        }
        if (item.encId) {
          row.encId = item.encId;
        }
        return row;
      }),
    };

    try {
      const result = await savePurchase.mutateAsync({ payload, mode, uid });
      const nextUid = readPurchaseUid(result) || uid;
      if (mode === "create" && nextUid) {
        navigate(`${basePath}/inventory/purchase/update/${encodeURIComponent(nextUid)}`);
        return;
      }
      navigate(listHref);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Purchase could not be saved.");
    }
  }

  async function handleStatus(nextStatus: string) {
    if (!uid) return;
    try {
      await changeStatus.mutateAsync({ uid, status: nextStatus });
      navigate(listHref);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Purchase status could not be changed.");
    }
  }

  function openItemPicker() {
    if (!catalogEncId) {
      setError("Please select inventory catalog before adding items.");
      return;
    }
    if (!vendorEncId) {
      setError("Please select vendor before adding items.");
      return;
    }
    setError("");
    setItemDialogOpen(true);
  }

  function startAddItem(option: { id: string; spCode: string; label: string; batchApplicable?: boolean }) {
    setEditorState({
      rowIndex: null,
      id: option.spCode || option.id,
      name: option.label,
      spCode: option.spCode || "",
      inventoryCatalogEncId: option.id,
      quantity: 1,
      freeQuantity: 0,
      price: 0,
      mrp: 0,
      discount: 0,
      discountType: "fixed",
      discountAmount: 0,
      taxableAmt: 0,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      cessAmt: 0,
      taxPercentage: 0,
      batchApplicable: Boolean(option.batchApplicable),
      batchValue: "",
      unitValue: "",
      expDate: undefined,
      totalPrice: 0,
      netTotalPrice: 0,
    });
    setItemDialogOpen(false);
  }

  function startEditItem(item: InventoryPurchaseItemDraft, rowIndex: number) {
    setEditorState({ ...item, rowIndex });
  }

  async function saveItemDraft() {
    if (!editorState) return;
    if (!editorState.unitValue) {
      setError("Please select unit for the purchase item.");
      return;
    }
    if (editorState.batchApplicable && (!editorState.batchValue || !editorState.expDate)) {
      setError("Batch and expiry date are required for batch-applicable items.");
      return;
    }
    if (!editorState.inventoryCatalogEncId || editorState.price <= 0 || editorState.mrp <= 0 || editorState.quantity <= 0) {
      setError("Please complete the required item fields before adding.");
      return;
    }

    const payload: Record<string, unknown> = {
      storeEncId,
      vendorEncId,
      inventoryCatalogItem: { encId: editorState.inventoryCatalogEncId },
      quantity: editorState.quantity,
      freeQuantity: editorState.freeQuantity,
      amount: editorState.price,
      mrp: editorState.mrp,
      ...(editorState.discountType === "percentage"
        ? { discountPercentage: editorState.discount, fixedDiscount: 0 }
        : { discountPercentage: 0, fixedDiscount: editorState.discount }),
    };

    try {
      const calculation = await calculateItem.mutateAsync(payload);
      const quantity = Math.max(1, Number(editorState.quantity) || 1);
      const price = Number(editorState.price) || 0;
      const totalPrice = quantity * price;
      const discountAmount = toNumber(calculation?.discountAmount, editorState.discountType === "fixed" ? editorState.discount : 0);
      const taxableAmt = toNumber(calculation?.taxableAmount, totalPrice - discountAmount);
      const taxAmount = toNumber(calculation?.taxAmount);
      const cessAmt = toNumber(calculation?.cess);
      const nextItem: InventoryPurchaseItemDraft = {
        ...editorState,
        quantity,
        freeQuantity: Math.max(0, Number(editorState.freeQuantity) || 0),
        price,
        mrp: Number(editorState.mrp) || 0,
        discount: editorState.discountType === "percentage" ? toNumber(calculation?.discountPercentage, editorState.discount) : discountAmount,
        discountAmount,
        taxableAmt,
        taxAmount,
        cgst: toNumber(calculation?.cgstPercentage),
        sgst: toNumber(calculation?.sgstPercentage),
        cess: toNumber(calculation?.cessPercentage),
        cessAmt,
        taxPercentage: toNumber(calculation?.taxPercentage),
        totalPrice,
        netTotalPrice: taxableAmt + taxAmount + cessAmt,
      };

      setItems((current) => {
        if (editorState.rowIndex !== null) {
          return current.map((item, index) => (index === editorState.rowIndex ? nextItem : item));
        }
        if (current.some((item) => item.inventoryCatalogEncId === nextItem.inventoryCatalogEncId && item.batchValue === nextItem.batchValue)) {
          setError("Item already added to this purchase.");
          return current;
        }
        return [...current, nextItem];
      });
      setEditorState(null);
      setError("");
    } catch (calculationError) {
      setError(calculationError instanceof Error ? calculationError.message : "Purchase item calculation failed.");
    }
  }

  const itemColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Item",
        width: "22%",
        render: (row: InventoryPurchaseItemDraft) => (
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.spCode || row.id}</div>
          </div>
        ),
      },
      { key: "batchValue", header: "Batch", render: (row: InventoryPurchaseItemDraft) => row.batchValue || "-" },
      { key: "unitValue", header: "Unit" },
      { key: "expDate", header: "Exp Date", render: (row: InventoryPurchaseItemDraft) => row.expDate || "-" },
      { key: "quantity", header: "Qty" },
      { key: "freeQuantity", header: "Free Qty" },
      { key: "mrp", header: "MRP", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.mrp) },
      { key: "price", header: "Purchase Price", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.price) },
      { key: "totalPrice", header: "Amount", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.totalPrice) },
      {
        key: "discount",
        header: "Discount",
        render: (row: InventoryPurchaseItemDraft) =>
          row.discount ? `${row.discountType === "fixed" ? formatOrdersCurrency(row.discount) : `${row.discount}%`}` : "-",
      },
      { key: "taxableAmt", header: "Taxable Amount", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.taxableAmt) },
      { key: "taxPercentage", header: "Tax %" },
      { key: "cgst", header: "CGST %" },
      { key: "sgst", header: "SGST %" },
      { key: "cess", header: "CESS %" },
      { key: "taxAmount", header: "Tax Amount", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.taxAmount) },
      { key: "netTotalPrice", header: "Net Amount", render: (row: InventoryPurchaseItemDraft) => formatOrdersCurrency(row.netTotalPrice) },
      {
        key: "actions",
        header: "",
        align: "right" as const,
        render: (row: InventoryPurchaseItemDraft) => {
          const rowIndex = items.findIndex((item) => item.inventoryCatalogEncId === row.inventoryCatalogEncId && item.batchValue === row.batchValue);
          if (!editable || rowIndex < 0) return null;
          return (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => startEditItem(items[rowIndex], rowIndex)}>
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems((current) => current.filter((_, index) => index !== rowIndex))}>
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [editable, items]
  );

  if (mode === "update" && detailQuery.isLoading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading purchase...</div>
      </SectionCard>
    );
  }

  return (
    <SharedOrdersLayout
      title={mode === "update" ? (editable ? "Update Purchase" : "View Purchase") : "Create Purchase"}
      subtitle={mode === "update" ? `Status: ${formatStatus(status)}` : "Create a new inventory purchase order."}
      backHref={backHref}
      backLabel={backLabel}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectField
              label="Store"
              required
              value={storeEncId}
              disabled={!editable || mode === "update"}
              options={toSelectOptions(optionsQuery.data?.stores, "Select Store")}
              onChange={(value) => {
                setStoreEncId(value);
                setCatalogEncId("");
                setItems([]);
              }}
            />
            <SelectField
              label="Vendor"
              required
              value={vendorEncId}
              disabled={!editable}
              options={toSelectOptions(optionsQuery.data?.vendors, "Select Vendor")}
              onChange={setVendorEncId}
            />
            <SelectField
              label="Inventory Catalog"
              required
              value={catalogEncId}
              disabled={!editable || !storeEncId || mode === "update"}
              options={toSelectOptions(optionsQuery.data?.catalogs, "Select Inventory Catalog")}
              onChange={(value) => {
                setCatalogEncId(value);
                setItems([]);
              }}
            />
            <TextField label="Purchase Bill #" required value={invoiceReferenceNo} disabled={!editable} onChange={setInvoiceReferenceNo} placeholder="Enter purchase bill reference" />
            <DateField label="Purchase Bill Date" required value={purchaseBillDate} disabled={!editable} onChange={setPurchaseBillDate} />
            <NumberField label="Round Off" value={roundOff} disabled={!editable} onChange={setRoundOff} min={-1} step={0.01} />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              rows={4}
              value={purchaseNote}
              disabled={!editable}
              onChange={(event) => setPurchaseNote(event.target.value)}
              placeholder="Notes to vendor"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
            />
          </label>
        </SectionCard>

        <SectionCard title="Items" className="border-slate-200 shadow-sm">
          {editable ? (
            <div className="mb-4 flex justify-end">
              <Button type="button" variant="outline" onClick={openItemPicker}>
                Add Items
              </Button>
            </div>
          ) : null}
          <DataTable
            data={items}
            columns={itemColumns}
            emptyState={<EmptyState title="No items added" description="Select inventory items to build this purchase." />}
            tableClassName="text-sm"
          />
        </SectionCard>

        {items.length ? (
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                {detailQuery.data?.totalNetRateInWords ? <p className="text-sm text-slate-600">Amount in words: <span className="font-semibold text-slate-900">{detailQuery.data.totalNetRateInWords}</span></p> : null}
              </div>
              <div className="space-y-2 text-sm">
                <SummaryRow label="Total Quantity" value={String(totals.quantity)} />
                <SummaryRow label="Gross Amount" value={formatOrdersCurrency(totals.gross)} />
                <SummaryRow label="Discount Amount" value={formatOrdersCurrency(totals.discount)} accent />
                <SummaryRow label="Taxable Amount" value={formatOrdersCurrency(totals.taxable)} accent />
                <SummaryRow label="Tax Amount" value={formatOrdersCurrency(totals.tax)} accent />
                <SummaryRow label="CESS Amount" value={formatOrdersCurrency(totals.cess)} accent />
                <SummaryRow label="Bill Amount" value={formatOrdersCurrency(totals.bill + roundOff)} strong />
              </div>
            </div>
          </SectionCard>
        ) : null}

        {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(backHref)}>
            Go Back
          </Button>
          {editable ? (
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {savePurchase.isPending ? "Saving..." : mode === "update" ? "Update Purchase" : "Create Purchase"}
            </Button>
          ) : null}
          {mode === "update" && status === "DRAFT" && editable ? (
            <Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => handleStatus("IN_REVIEW")}>
              Send to Review
            </Button>
          ) : null}
          {mode === "update" && status === "IN_REVIEW" ? (
            <>
              <Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => handleStatus("DRAFT")}>
                Make as Draft
              </Button>
              <Button type="button" variant="primary" disabled={changeStatus.isPending} onClick={() => handleStatus("APPROVED")}>
                Approve
              </Button>
            </>
          ) : null}
        </div>
      </form>

      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        title="Select Items"
        size="lg"
        closeIcon="x"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={itemSearch}
            onChange={(event) => {
              setItemSearch(event.target.value);
              setItemPage(1);
            }}
            placeholder="Search items"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15"
          />
          <DataTable
            data={catalogItemsQuery.data?.rows ?? []}
            loading={catalogItemsQuery.isLoading}
            columns={[
              { key: "label", header: "Item Name", width: "40%" },
              { key: "description", header: "Description", render: (row: { description?: string }) => row.description || "-" },
              {
                key: "actions",
                header: "",
                align: "right" as const,
                render: (row: { id: string; spCode: string; label: string; batchApplicable?: boolean }) => (
                  <Button type="button" variant="outline" size="sm" onClick={() => startAddItem(row)}>
                    Add
                  </Button>
                ),
              },
            ]}
            pagination={{
              page: itemPage,
              pageSize: 10,
              total: catalogItemsQuery.data?.total ?? 0,
              mode: "server",
              onChange: setItemPage,
            }}
            emptyState={<EmptyState title="No items found" description="" />}
          />
        </div>
      </Dialog>

      <Dialog
        open={Boolean(editorState)}
        onClose={() => setEditorState(null)}
        title={editorState?.rowIndex !== null ? "Update Item" : "Add Item"}
        size="lg"
        closeIcon="x"
      >
        {editorState ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Item Name" value={editorState.name} disabled onChange={() => {}} />
              <TextField label="Batch" value={editorState.batchValue} disabled={!editorState.batchApplicable} onChange={(value) => setEditorState((current) => current ? { ...current, batchValue: value } : current)} />
              <SelectField label="Unit" required value={editorState.unitValue} options={toSelectOptions(optionsQuery.data?.units, "Select Unit")} onChange={(value) => setEditorState((current) => current ? { ...current, unitValue: value } : current)} />
              <DateField label="Exp Date" value={editorState.expDate ?? ""} disabled={!editorState.batchApplicable} onChange={(value) => setEditorState((current) => current ? { ...current, expDate: value } : current)} />
              <NumberField label="Qty" required value={editorState.quantity} min={1} onChange={(value) => setEditorState((current) => current ? { ...current, quantity: value } : current)} />
              <NumberField label="Free Qty" value={editorState.freeQuantity} min={0} onChange={(value) => setEditorState((current) => current ? { ...current, freeQuantity: value } : current)} />
              <NumberField label="MRP" required value={editorState.mrp} min={0} step={0.01} onChange={(value) => setEditorState((current) => current ? { ...current, mrp: value } : current)} />
              <NumberField label="Purchase Price" required value={editorState.price} min={0} step={0.01} onChange={(value) => setEditorState((current) => current ? { ...current, price: value } : current)} />
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <NumberField label="Discount" value={editorState.discount} min={0} step={0.01} onChange={(value) => setEditorState((current) => current ? { ...current, discount: value } : current)} />
              <SelectField
                label="Discount Type"
                value={editorState.discountType}
                options={[
                  { value: "fixed", label: "INR" },
                  { value: "percentage", label: "%" },
                ]}
                onChange={(value) => setEditorState((current) => current ? { ...current, discountType: value as "fixed" | "percentage" } : current)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditorState(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" disabled={calculateItem.isPending} onClick={saveItemDraft}>
                {calculateItem.isPending ? "Calculating..." : editorState.rowIndex !== null ? "Update Item" : "Add Item"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </SharedOrdersLayout>
  );
}

function InventoryPurchaseEditPricePage({ uid }: { uid: string | null }) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const detailQuery = useInventoryPurchaseDetail(uid);
  const purchaseItemsQuery = useInventoryPurchaseItemsByUid(uid);
  const catalogsQuery = useInventoryPurchaseSalesOrderCatalogs(detailQuery.data?.inventoryCatalogEncId);
  const savePrices = useSaveInventoryPurchasePrices();
  const [rowsByPurchaseItem, setRowsByPurchaseItem] = useState<Record<string, InventoryPurchasePriceRow[]>>({});
  const listHref = `${basePath}/inventory/purchase`;

  useEffect(() => {
    if (!detailQuery.data) return;
    const purchaseRows = purchaseItemsQuery.data ?? [];
    const next: Record<string, InventoryPurchasePriceRow[]> = {};

    detailQuery.data.items.forEach((item, index) => {
      const purchaseItemEncId = item.encId || "";
      const linkedRows = purchaseRows.filter((row) => row.purchaseItemEncId === purchaseItemEncId);
      next[purchaseItemEncId || `item-${index}`] =
        linkedRows.length > 0
          ? linkedRows
          : [{ id: "", purchaseItemEncId, orderCatalog: "", salesPrice: "" }];
    });

    setRowsByPurchaseItem(next);
  }, [detailQuery.data, purchaseItemsQuery.data]);

  const saveDisabled = useMemo(() => {
    if (!detailQuery.data?.items.length) return true;
    return detailQuery.data.items.some((item, index) => {
      const key = item.encId || `item-${index}`;
      const rows = rowsByPurchaseItem[key] ?? [];
      if (!rows.length) return true;
      return rows.some((row) => !row.orderCatalog || row.salesPrice === "" || Number(row.salesPrice) <= 0);
    });
  }, [detailQuery.data, rowsByPurchaseItem]);

  function addRow(key: string, purchaseItemEncId: string) {
    setRowsByPurchaseItem((current) => ({
      ...current,
      [key]: [...(current[key] ?? []), { id: "", purchaseItemEncId, orderCatalog: "", salesPrice: "" }],
    }));
  }

  function updateRow(key: string, rowIndex: number, patch: Partial<InventoryPurchasePriceRow>) {
    setRowsByPurchaseItem((current) => ({
      ...current,
      [key]: (current[key] ?? []).map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)),
    }));
  }

  function deleteRow(key: string, rowIndex: number) {
    setRowsByPurchaseItem((current) => ({
      ...current,
      [key]: (current[key] ?? []).filter((_, index) => index !== rowIndex),
    }));
  }

  async function savePriceData() {
    if (!uid || !detailQuery.data) return;
    const payload: Record<string, unknown>[] = [];

    detailQuery.data.items.forEach((item, index) => {
      const key = item.encId || `item-${index}`;
      const rows = rowsByPurchaseItem[key] ?? [];
      rows.forEach((row) => {
        if (!row.orderCatalog || row.salesPrice === "") return;
        const entry: Record<string, unknown> = {
          purchaseItemEncId: item.encId,
          sOrderCatalog: { encId: row.orderCatalog },
          salesRate: Number(row.salesPrice),
        };
        if (row.id) {
          entry.id = row.id;
        }
        payload.push(entry);
      });
    });

    const mode = (purchaseItemsQuery.data?.length ?? 0) > 0 ? "update" : "create";
    await savePrices.mutateAsync({ uid, payload, mode });
    navigate(listHref);
  }

  if (detailQuery.isLoading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading purchase price details...</div>
      </SectionCard>
    );
  }

  const purchase = detailQuery.data;
  if (!purchase) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Purchase not found" description="This approved purchase could not be loaded." />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(listHref)} className="inline-flex items-center gap-2 text-[30px] font-semibold tracking-[-0.02em] text-slate-900">
          <span className="text-2xl leading-none">←</span>
          Edit Price
        </button>
        <Button type="button" variant="primary" onClick={() => navigate(`${basePath}/inventory/purchase/update/${encodeURIComponent(uid ?? "")}?source=purchase-price-edit`)}>
          View Purchase
        </Button>
      </div>

      <div className="space-y-4">
        {purchase.items.map((item, itemIndex) => {
          const key = item.encId || `item-${itemIndex}`;
          const rows = rowsByPurchaseItem[key] ?? [];
          return (
            <SectionCard key={key} className="border-slate-200 shadow-sm" padding={false}>
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                    {item.batchValue ? <div className="text-sm text-slate-500">Batch: {item.batchValue}</div> : null}
                  </div>
                  <Button type="button" variant="primary" size="sm" onClick={() => addRow(key, item.encId ?? "")}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="px-4 py-4">
                {rows.length ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_180px_48px] gap-4 text-sm font-medium text-slate-700">
                      <div>Order Catalog</div>
                      <div>Sales Price</div>
                      <div />
                    </div>
                    {rows.map((row, rowIndex) => (
                      <div key={`${key}-${row.id || rowIndex}`} className="grid grid-cols-[minmax(0,1fr)_180px_48px] gap-4">
                        <Select
                          value={row.orderCatalog}
                          disabled={Boolean(row.id)}
                          onChange={(event) => updateRow(key, rowIndex, { orderCatalog: event.target.value })}
                          options={toSelectOptions(catalogsQuery.data, "Order Catalog")}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.salesPrice}
                          onChange={(event) => updateRow(key, rowIndex, { salesPrice: event.target.value === "" ? "" : Number(event.target.value) })}
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15"
                        />
                        <div className="flex items-center justify-center">
                          {rows.length > 1 && !row.id ? (
                            <button type="button" onClick={() => deleteRow(key, rowIndex)} className="text-red-600 transition hover:text-red-700" aria-label="Delete price row" title="Delete price row">
                              <TrashIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm font-medium text-slate-500">No Price Data Found</div>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>

      <div>
        <Button type="button" variant="primary" disabled={saveDisabled || savePrices.isPending} onClick={savePriceData}>
          {savePrices.isPending ? "Saving..." : "Save Prices"}
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  required,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} options={options} className="w-full" />
    </label>
  );
}

function TextField({
  label,
  value,
  disabled,
  required,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  disabled,
  required,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  disabled,
  required,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        min={min}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15 disabled:bg-slate-50"
      />
    </label>
  );
}

function SummaryRow({ label, value, accent, strong }: { label: string; value: string; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-semibold text-slate-900" : accent ? "text-[#33009C]" : "text-slate-700"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function toSelectOptions(options: Array<{ id: string; label: string }> | undefined, placeholder: string) {
  return [{ value: "", label: placeholder }, ...(options ?? []).map((option) => ({ value: option.id, label: option.label }))];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDateInput(value: string | undefined) {
  if (!value) return "";
  const text = String(value).trim();
  const isoDate = text.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return "";
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function readPurchaseUid(payload: unknown) {
  if (typeof payload === "string") {
    return payload.trim() || null;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = (payload as Record<string, unknown>).uid ?? (payload as Record<string, unknown>).encId ?? (payload as Record<string, unknown>).id;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 4.75C3 4.34 3.34 4 3.75 4h16.5c.41 0 .75.34.75.75 0 .17-.06.33-.17.47l-6.58 8.22v5.31c0 .28-.16.54-.41.67l-3 1.5A.75.75 0 0 1 10 20.25v-6.81L3.17 5.22A.75.75 0 0 1 3 4.75Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5.75C9 5.34 9.34 5 9.75 5H14.25C14.66 5 15 5.34 15 5.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 7L8.25 18.25C8.28 18.66 8.62 19 9.03 19H14.97C15.38 19 15.72 18.66 15.75 18.25L16.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 10.5V15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10.5V15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
