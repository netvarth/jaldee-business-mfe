/**
 * Sales Returns — customer returns against orders.
 *
 * SalesReturnController and the useSalesReturns hook already existed (the dashboards read
 * refund totals from them), but the only grid lived in src/inventorynew/, which is the dead
 * component set. This is the live replacement.
 *
 * The create flow (§3 of docs/karty-dead-code-audit.md) is ported from the unrouted
 * inventorynew/CreateSalesReturn.tsx — that was the only place `useCreateSalesReturn` was
 * ever called. Status values are also corrected here: the backend enum
 * (SalesReturnStatus, feature-commerce-service) only has DRAFT/PENDING/COMPLETED — the
 * previous Approve/Reject buttons sent APPROVED/REJECTED, which don't exist server-side.
 *
 * Route: /karty/orders/sales-returns
 */
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, DataTable, Drawer, EmptyState, Input, Select, type ColumnDef } from "@jaldee/design-system";
import {
  useSalesReturns,
  useCreateSalesReturn,
  useUpdateSalesReturnStatus,
  useReturnableByOrder,
  useRefundSalesReturn,
  useSalesReturn,
  type SalesReturn,
  type RefundStatus,
} from "../services/useSalesReturns";
import { useStores } from "../services/useStores";
import { useCustomers } from "../services/useCustomers";
import { useCustomerOrders } from "../services/useOrders";
import { useItems } from "../services/useItems";
import { useUnits } from "../services/useUnits";
import { useInventoryCatalogs, useInventoryCatalogItems } from "../services/useInventoryCatalogs";
import { ListScreen } from "./shared/ListScreen";
import { SalesReturnDetailPage } from "./SalesReturnDetailPage";

const STATUSES = ["DRAFT", "PENDING", "COMPLETED"] as const;

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  DRAFT: "neutral",
  PENDING: "warning",
  COMPLETED: "success",
};

const REFUND_VARIANT: Record<string, "success" | "warning" | "neutral"> = {
  NONE: "neutral",
  PENDING: "warning",
  REFUNDED: "success",
};

// Common India-retail return reasons, offered as one-tap chips over the free-text box.
const RETURN_REASONS = ["Damaged", "Wrong item", "Expired", "Short supply", "Quality issue", "Not required"] as const;

interface ReturnLine {
  itemUid: string;
  variantUid?: string;
  itemName: string;
  unitUid: string;
  qty: number;
  unitPrice: number;
  batchNumber: string;
}

function newReturnNo() {
  return "SRET-" + Math.floor(Math.random() * 100000);
}

const up = (s: unknown) => String(s ?? "").toUpperCase();

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export function SalesReturnsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [viewReturnUid, setViewReturnUid] = useState<string | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);

  const returnsQ = useSalesReturns(search);
  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);
  const updateStatus = useUpdateSalesReturnStatus();
  const createReturn = useCreateSalesReturn();
  const refundReturn = useRefundSalesReturn();

  // Refund drawer state
  const [refundFor, setRefundFor] = useState<SalesReturn | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundStatus, setRefundStatus] = useState<RefundStatus>("REFUNDED");

  // Create-form state
  const [returnNo, setReturnNo] = useState(newReturnNo);
  const [consumerUid, setConsumerUid] = useState("");
  const [storeUid, setStoreUid] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [selectedOrderUid, setSelectedOrderUid] = useState("");
  const [reason, setReason] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [pick, setPick] = useState({ catalogItemId: "", unitUid: "", qty: 1, unitPrice: 0, batchNumber: "" });

  const [searchParams] = useSearchParams();
  const paramOrderUid = searchParams.get("orderUid");
  const paramOrderNo = searchParams.get("orderNo");
  const paramStoreUid = searchParams.get("storeUid");
  const paramConsumerUid = searchParams.get("consumerUid");

  useEffect(() => {
    if (paramOrderUid) {
      setShowCreate(true);
      setSelectedOrderUid(paramOrderUid);
      if (paramStoreUid) setStoreUid(paramStoreUid);
      if (paramConsumerUid) setConsumerUid(paramConsumerUid);
      if (paramOrderNo) setInvoiceNo(paramOrderNo);
    }
  }, [paramOrderUid, paramStoreUid, paramConsumerUid, paramOrderNo]);

  const itemsQ = useItems();
  const unitsQ = useUnits();
  const catalogsQ = useInventoryCatalogs();
  const catalogItemsQ = useInventoryCatalogItems(selectedCatalog);
  const customerOrdersQ = useCustomerOrders(consumerUid);
  // Filter inventory catalogs store-wise: show only catalogs that belong to the active store.
  const storeCatalogs = useMemo(() => {
    const all = catalogsQ.data ?? [];
    if (!storeUid) return all;
    const filtered = all.filter((c: any) => (c.storeUid || c.storeId) === storeUid);
    return filtered.length > 0 ? filtered : all;
  }, [catalogsQ.data, storeUid]);
  // Returnable lines for the chosen order (sold minus already returned) — drives the prefill.
  const returnableQ = useReturnableByOrder(selectedOrderUid || undefined);

  const prefillFromOrder = () => {
    const eligible = returnableQ.data ?? [];
    if (eligible.length === 0) return;
    setLines(
      eligible.map((e) => ({
        itemUid: e.itemUid,
        variantUid: e.variantUid || undefined,
        itemName: e.itemName ?? "Item",
        unitUid: e.unitUid ?? "",
        qty: Number(e.returnableBaseQty) || 0,
        unitPrice: Number(e.unitPrice) || 0,
        batchNumber: e.batchNumber ?? "",
      }))
    );
  };

  // Reset the invoice/order picker whenever the chosen customer changes.
  const onCustomerChange = (uid: string) => {
    setConsumerUid(uid);
    setSelectedOrderUid("");
    setInvoiceNo("");
  };

  // Selecting one of the customer's orders sets the invoice reference and, if no store is
  // chosen yet, adopts the order's store so the two stay consistent.
  const onOrderChange = (uid: string) => {
    setSelectedOrderUid(uid);
    const ord = (customerOrdersQ.data ?? []).find((o) => o.uid === uid);
    setInvoiceNo(ord?.orderNo ?? "");
    if (ord?.storeUid && !storeUid) setStoreUid(ord.storeUid);
  };

  const unitName = (uid: string) => {
    const u = (unitsQ.data ?? []).find((x) => x.uid === uid);
    if (!u) return uid ? `${uid.substring(0, 8)}…` : "Base unit";
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  const pickedCatalogItem = (catalogItemsQ.data ?? []).find((c: any) => c.id === pick.catalogItemId);
  const pickedItem: any = pickedCatalogItem
    ? (itemsQ.data ?? []).find((i) => i.uid === (pickedCatalogItem as any).itemUid)
    : null;
  const pickedUnits: any[] = ((pickedItem?.units as any[]) || []).filter((u) => u.selling);

  const openCreate = () => {
    setReturnNo(newReturnNo());
    setConsumerUid("");
    setStoreUid("");
    setInvoiceNo("");
    setSelectedOrderUid("");
    setReason("");
    setSelectedCatalog("");
    setLines([]);
    setPick({ catalogItemId: "", unitUid: "", qty: 1, unitPrice: 0, batchNumber: "" });
    setShowCreate(true);
  };

  const addLine = () => {
    if (!pickedCatalogItem || !pickedItem || pick.qty <= 0) return;
    const catalogUnit = ((pickedCatalogItem as any).units ?? []).find((u: any) => u.unitUid === pick.unitUid);
    setLines((prev) => [
      ...prev,
      {
        itemUid: (pickedCatalogItem as any).itemUid,
        itemName: pickedItem.name ?? "Item",
        unitUid: pick.unitUid,
        qty: pick.qty,
        unitPrice: pick.unitPrice || catalogUnit?.sellingPrice || 0,
        batchNumber: pick.batchNumber,
      },
    ]);
    setPick({ catalogItemId: "", unitUid: "", qty: 1, unitPrice: 0, batchNumber: "" });
  };

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const openRefund = (r: SalesReturn) => {
    setRefundFor(r);
    setRefundAmount(Number(r.refundAmount) || 0);
    setRefundStatus("REFUNDED");
  };

  const submitRefund = () => {
    if (!refundFor) return;
    refundReturn.mutate(
      { uid: refundFor.uid, amount: refundAmount, status: refundStatus },
      { onSuccess: () => setRefundFor(null) }
    );
  };

  const handleSave = () => {
    // RET-002: when the return is filed against an order, the server derives store,
    // invoiceNo/date and per-line unit + price from the source order — send only the
    // orderUid + items, not store/unit/price.
    if (selectedOrderUid) {
      createReturn.mutate(
        {
          returnNo,
          orderUid: selectedOrderUid,
          consumerUid: consumerUid || null,
          reason: reason || null,
          status: "DRAFT",
          items: lines.map((l) => ({
            itemUid: l.itemUid,
            variantUid: l.variantUid || null,
            qty: Math.round(l.qty),
          })),
        },
        { onSuccess: () => setShowCreate(false) }
      );
      return;
    }

    // Manual / ad-hoc return (no invoice) — a store is required and the client supplies
    // unit + price per line.
    const effectiveStoreUid = storeUid || (storesQ.data?.[0]?.id ?? storesQ.data?.[0]?.uid ?? null);
    if (!effectiveStoreUid) {
      alert("Please select a store for the sales return.");
      return;
    }
    createReturn.mutate(
      {
        returnNo,
        consumerUid: consumerUid || null,
        storeUid: effectiveStoreUid,
        invoiceNo: invoiceNo || null,
        reason: reason || null,
        status: "DRAFT",
        items: lines.map((l) => ({
          itemUid: l.itemUid,
          variantUid: l.variantUid || null,
          qty: Math.round(l.qty),
          sellQty: l.qty,
          unitUid: l.unitUid || null,
          unitPrice: l.unitPrice,
          batchNumber: l.batchNumber || null,
        })),
      },
      { onSuccess: () => setShowCreate(false) }
    );
  };

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    (customersQ.data ?? []).forEach((c: any) => {
      const n = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.consumerNo;
      if (n) m.set(c.uid, n);
    });
    return m;
  }, [customersQ.data]);

  // Status is filtered client-side: the list endpoint takes only `search`, so filtering here
  // is honest about scope — it narrows what was already fetched rather than implying a query.
  const rows = useMemo(() => {
    const all = returnsQ.data ?? [];
    return status === "all" ? all : all.filter((r) => up(r.status) === status);
  }, [returnsQ.data, status]);

  const refundTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0),
    [rows]
  );

  // Live totals for the create drawer.
  const lineTotal = (l: ReturnLine) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);


  const formTotal = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);
  const pickSubtotal = (Number(pick.qty) || 0) * (Number(pick.unitPrice) || 0);

  // Render full Details Page when a return is selected (placed after all hooks)
  if (selectedReturn) {
    return (
      <SalesReturnDetailPage
        initialReturn={selectedReturn}
        onBack={() => setSelectedReturn(null)}
      />
    );
  }

  const columns: ColumnDef<SalesReturn>[] = [
    {
      key: "returnNo",
      header: "Return",
      render: (r) => <button type="button" onClick={() => setSelectedReturn(r)} className="font-extrabold text-[#55349A] hover:underline cursor-pointer text-left">{r.returnNo ?? (r.uid ? `SRET-${r.uid.slice(0, 6).toUpperCase()}` : "—")}</button>,
    },
    {
      key: "returnDate",
      header: "Date",
      render: (r) => <span className="text-xs font-semibold text-surface-500">{fmtDate((r as any).returnDate || (r as any).createdAt)}</span>
    },
    {
      key: "consumerUid",
      header: "Customer",
      render: (r) => <span className="font-semibold text-surface-700 text-xs">{r.consumerUid ? customerName.get(r.consumerUid) ?? "Unknown customer" : "—"}</span>,
    },
    {
      key: "storeUid",
      header: "Store",
      render: (r) => <span className="font-semibold text-surface-500 text-xs">{r.storeUid ? storeName.get(r.storeUid) ?? "—" : "—"}</span>
    },
    {
      key: "invoiceNo",
      header: "Invoice",
      render: (r) => <span className="font-mono font-semibold text-surface-600 text-[11px] uppercase">{r.invoiceNo ?? "—"}</span>
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <span className="text-xs text-surface-500 italic">{r.reason || "—"}</span>
    },
    {
      key: "refundAmount",
      header: "Refund",
      align: "right",
      render: (r) => <span className="font-black text-emerald-600 font-mono text-[13px]">{typeof r.refundAmount === "number" ? inr(r.refundAmount) : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const s = up(r.status);
        let colorClass = "bg-surface-100 text-surface-700 border-surface-200";
        if (s === "COMPLETED" || s === "DELIVERED") colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (s === "PENDING" || s === "PROCESSING") colorClass = "bg-amber-50 text-amber-700 border-amber-200";

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${colorClass}`}>
            {s || "—"}
          </span>
        );
      }
    },
    {
      key: "refundStatus",
      header: "Refund",
      render: (r) => {
        const rs = up(r.refundStatus) || "NONE";
        let colorClass = "bg-surface-100 text-surface-700 border-surface-200";
        if (rs === "REFUNDED") colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (rs === "PENDING") colorClass = "bg-amber-50 text-amber-700 border-amber-200";

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${colorClass}`}>
            {rs}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) =>
        up(r.status) !== "COMPLETED" ? (
          <div className="flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedReturn(r)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Details
            </button>
            {up(r.status) === "DRAFT" ? (
              <button
                className="px-3.5 py-1.5 border border-surface-200 text-surface-600 rounded-xl text-xs font-bold hover:bg-surface-50 transition-colors cursor-pointer"
                disabled={updateStatus.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ uid: r.uid, status: "PENDING" });
                }}
              >
                Send for approval
              </button>
            ) : null}
            <button
              className="px-3.5 py-1.5 bg-white border border-surface-200 text-surface-700 rounded-xl text-xs font-bold hover:bg-surface-50 hover:text-surface-900 transition-all cursor-pointer shadow-xs active:scale-95"
              disabled={updateStatus.isPending}
              onClick={(e) => {
                e.stopPropagation();
                updateStatus.mutate({ uid: r.uid, status: "COMPLETED" });
              }}
            >
              Complete
            </button>
          </div>
        ) : up(r.refundStatus) !== "REFUNDED" ? (
          <div className="flex justify-end pr-4">
            <button
              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openRefund(r);
              }}
            >
              Record refund
            </button>
          </div>
        ) : null,
    },
  ];

  const input =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10";
  const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
  // RET-002: an invoice-driven return needs an order (store derived); a manual return needs a store.
  const canSave = (!!selectedOrderUid || !!storeUid) && lines.length > 0 && !createReturn.isPending;

  return (
    <>
    <ListScreen
      title="Sales Returns"
      subtitle={
        rows.length > 0
          ? `${rows.length} return${rows.length === 1 ? "" : "s"} · ${inr(refundTotal)} refunded`
          : "Customer returns raised against orders."
      }
      actions={<Button onClick={openCreate}>New Return</Button>}
      isLoading={returnsQ.isLoading}
      error={returnsQ.error}
      notice={
        updateStatus.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            Couldn't update that return:{" "}
            {updateStatus.error instanceof Error ? updateStatus.error.message : "the service rejected the change."}
          </div>
        ) : null
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search returns…"
            className="w-64"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth={false}
            containerClassName="w-44"
            options={[
              { value: "all", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      }
    >
      <DataTable
        tableClassName="min-w-[1000px]"
        data={rows}
        columns={columns}
        getRowId={(r) => r.uid}
        onRowClick={(r) => setSelectedReturn(r)}
        emptyState={
          <EmptyState
            title="No sales returns"
            description={
              search || status !== "all"
                ? "No returns match these filters."
                : "Nothing has been returned yet. Returns raised against orders appear here."
            }
          />
        }
      />
    </ListScreen>

    <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Sales Return" size="lg">
      <div className="flex flex-col gap-6">
        {createReturn.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            Couldn't create that return:{" "}
            {createReturn.error instanceof Error ? createReturn.error.message : "the service rejected the request."}
          </div>
        ) : null}

        {/* ── Return details ─────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Return details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Return No</label>
              <input value={returnNo} disabled className={input + " bg-slate-50 font-medium text-slate-500"} />
            </div>
            <div>
              <label className={lbl}>Customer</label>
              <select value={consumerUid} onChange={(e) => onCustomerChange(e.target.value)} className={input}>
                <option value="">Select customer</option>
                {(customersQ.data ?? []).map((c: any) => (
                  <option key={c.uid} value={c.uid}>
                    {c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.consumerNo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Invoice / order</label>
              <select
                value={selectedOrderUid}
                disabled={!consumerUid || customerOrdersQ.isLoading}
                onChange={(e) => onOrderChange(e.target.value)}
                className={input + " disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"}
              >
                <option value="">
                  {!consumerUid
                    ? "Select a customer first"
                    : customerOrdersQ.isLoading
                      ? "Loading orders…"
                      : (customerOrdersQ.data ?? []).length === 0
                        ? "No orders for this customer"
                        : "Select order / invoice"}
                </option>
                {(customerOrdersQ.data ?? []).map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {(o.orderNo ?? o.uid.slice(0, 8)) +
                      " · " +
                      fmtDate(o.date || o.createdAt) +
                      (typeof o.totalAmount === "number" ? " · " + inr(o.totalAmount) : "")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>
                Store {selectedOrderUid ? <span className="text-slate-400 normal-case">(from order)</span> : <span className="text-red-500">*</span>}
              </label>
              {selectedOrderUid ? (
                <div className={input + " bg-slate-50 font-medium text-slate-500"}>
                  {storeUid ? storeName.get(storeUid) ?? "—" : "Derived on save"}
                </div>
              ) : (
                <select
                  value={storeUid}
                  onChange={(e) => setStoreUid(e.target.value)}
                  className={input + (!storeUid ? " border-slate-200" : "")}
                >
                  <option value="">Select store</option>
                  {(storesQ.data ?? []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-span-2">
              <label className={lbl}>Reason</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={input}
                placeholder="e.g. Damaged / wrong item"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RETURN_REASONS.map((r) => {
                  const active = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(active ? "" : r)}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                        (active
                          ? "border-[#55349A] bg-[#55349A]/10 text-[#55349A]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700")
                      }
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Items ──────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Items</h3>
            <div className="flex items-center gap-3">
              {selectedOrderUid ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={returnableQ.isLoading || (returnableQ.data ?? []).length === 0}
                  onClick={prefillFromOrder}
                >
                  {returnableQ.isLoading
                    ? "Checking…"
                    : (returnableQ.data ?? []).length === 0
                      ? "Nothing returnable"
                      : `Prefill ${(returnableQ.data ?? []).length} returnable`}
                </Button>
              ) : null}
              <span className="text-xs font-medium text-slate-400">
                {lines.length} {lines.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>

          {/* Add-item card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <label className={lbl}>Catalog</label>
                <select
                  value={selectedCatalog}
                  onChange={(e) => {
                    setSelectedCatalog(e.target.value);
                    setPick({ catalogItemId: "", unitUid: "", qty: 1, unitPrice: 0, batchNumber: "" });
                  }}
                  className={input}
                >
                  <option value="">Select catalog</option>
                  {storeCatalogs.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6">
                <label className={lbl}>Item</label>
                <select
                  value={pick.catalogItemId}
                  disabled={!selectedCatalog}
                  onChange={(e) => setPick({ ...pick, catalogItemId: e.target.value, unitUid: "", unitPrice: 0 })}
                  className={input + " disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"}
                >
                  <option value="">{selectedCatalog ? "Select item" : "Pick a catalog first"}</option>
                  {(catalogItemsQ.data ?? []).map((ci: any) => {
                    const it = (itemsQ.data ?? []).find((i) => i.uid === ci.itemUid);
                    return (
                      <option key={ci.id} value={ci.id}>
                        {it?.name ?? ci.itemAliasName ?? "Item"}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="col-span-3">
                <label className={lbl}>Unit</label>
                <select
                  value={pick.unitUid}
                  disabled={!pick.catalogItemId}
                  onChange={(e) => {
                    const unitUid = e.target.value;
                    const catalogUnit = ((pickedCatalogItem as any)?.units ?? []).find(
                      (u: any) => u.unitUid === unitUid
                    );
                    const price = catalogUnit?.sellingPrice ?? (pickedCatalogItem as any)?.sellingPrice ?? pick.unitPrice;
                    setPick({ ...pick, unitUid, unitPrice: price || 0 });
                  }}
                  className={input + " disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"}
                >
                  <option value="">Base unit</option>
                  {pickedUnits.map((u: any) => (
                    <option key={u.unitUid} value={u.unitUid}>
                      {unitName(u.unitUid)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Qty</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={pick.qty}
                  onChange={(e) => setPick({ ...pick, qty: parseFloat(e.target.value) || 0 })}
                  className={input + " text-right"}
                />
              </div>
              <div className="col-span-3">
                <label className={lbl}>Unit price</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={pick.unitPrice}
                  onChange={(e) => setPick({ ...pick, unitPrice: parseFloat(e.target.value) || 0 })}
                  className={input + " text-right"}
                />
              </div>
              <div className="col-span-4 flex flex-col justify-end">
                <label className={lbl}>Line total</label>
                <div className="flex h-[38px] items-center justify-end rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                  {inr(pickSubtotal)}
                </div>
              </div>
              <div className="col-span-12 flex justify-end">
                <Button
                  size="md"
                  variant="secondary"
                  onClick={addLine}
                  disabled={!pick.catalogItemId || pick.qty <= 0}
                >
                  + Add item
                </Button>
              </div>
            </div>
          </div>

          {/* Lines table / empty hint */}
          {lines.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Item</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Unit</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Qty</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Price</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Total</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{l.itemName}</td>
                      <td className="px-4 py-2.5 text-slate-500">{l.unitUid ? unitName(l.unitUid) : "Base unit"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{l.qty}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{inr(l.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{inr(lineTotal(l))}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          aria-label="Remove item"
                          onClick={() => removeLine(i)}
                          className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total refund
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-slate-900">{inr(formTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">No items added yet</p>
              <p className="mt-0.5 text-xs text-slate-400">Pick a catalog and item above, then choose “Add item”.</p>
            </div>
          )}
        </section>

        {/* ── Sticky summary + actions ───────────────────────────────── */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-4 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <div className="text-lg font-bold tabular-nums text-slate-900">{inr(formTotal)}</div>
            <div className="truncate text-xs text-slate-400">
              {!storeUid
                ? "Select a store to continue"
                : lines.length === 0
                  ? "Add at least one item"
                  : `${lines.length} ${lines.length === 1 ? "item" : "items"} · ready to save`}
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {createReturn.isPending ? "Saving…" : "Save return"}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>

    <Drawer open={!!refundFor} onClose={() => setRefundFor(null)} title="Record refund" size="sm">
      {refundFor ? (
        <div className="flex flex-col gap-5">
          {refundReturn.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              Couldn't record the refund:{" "}
              {refundReturn.error instanceof Error ? refundReturn.error.message : "the service rejected the request."}
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
            <div className="font-semibold text-slate-900">{refundFor.returnNo}</div>
            <div className="text-xs text-slate-500">
              {refundFor.consumerUid ? customerName.get(refundFor.consumerUid) ?? "Customer" : "Walk-in"} ·{" "}
              {refundFor.storeUid ? storeName.get(refundFor.storeUid) ?? "—" : "—"}
            </div>
          </div>
          <div>
            <label className={lbl}>Refund amount</label>
            <input
              type="number"
              min={0}
              step="any"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
              className={input + " text-right"}
            />
          </div>
          <div>
            <label className={lbl}>Settlement</label>
            <select
              value={refundStatus}
              onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
              className={input}
            >
              <option value="REFUNDED">Refunded</option>
              <option value="PENDING">Refund pending</option>
              <option value="NONE">Not refunded</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRefundFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitRefund} disabled={refundReturn.isPending}>
              {refundReturn.isPending ? "Saving…" : "Save refund"}
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>

      <ViewReturnDrawer
        uid={viewReturnUid}
        onClose={() => setViewReturnUid(null)}
        itemsQ={itemsQ}
        unitsQ={unitsQ}
        updateStatus={updateStatus}
        openRefund={(r) => {
          setViewReturnUid(null);
          openRefund(r);
        }}
      />
    </>
  );
}

function ViewReturnDrawer({
  uid,
  onClose,
  itemsQ,
  unitsQ,
  updateStatus,
  openRefund,
}: {
  uid: string | null;
  onClose: () => void;
  itemsQ: any;
  unitsQ: any;
  updateStatus: any;
  openRefund: (r: any) => void;
}) {
  const returnQ = useSalesReturn(uid || undefined);

  if (!uid) return null;

  const ret = returnQ.data;
  const isLoading = returnQ.isLoading;
  const isError = returnQ.isError;

  const unitName = (uUid: string) => {
    const u = (unitsQ.data ?? []).find((x: any) => x.uid === uUid);
    if (!u) return uUid ? `${uUid.substring(0, 8)}…` : "Base unit";
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  const itemName = (itemUid: string) => {
    const it = (itemsQ.data ?? []).find((x: any) => x.uid === itemUid);
    return it?.name || "Unknown item";
  };

  return (
    <Drawer open={!!uid} onClose={onClose} title="Sales Return Details" size="lg">
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex justify-center p-8 text-surface-400">Loading details...</div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            Couldn't load details. The service might be unreachable.
          </div>
        ) : !ret ? (
          <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-[12.5px] text-surface-700">
            Return not found.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 rounded-xl border border-surface-200 bg-surface-50 p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Return No</p>
                <p className="mt-1 font-bold text-surface-900">{ret.returnNo}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Date</p>
                <p className="mt-1 font-medium text-surface-900">{fmtDate(ret.returnDate)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Status</p>
                <p className="mt-1 font-medium text-surface-900">{up(ret.status)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Refund Amount</p>
                <p className="mt-1 font-black text-emerald-600">{typeof ret.refundAmount === "number" ? inr(ret.refundAmount) : "—"}</p>
              </div>
              {ret.invoiceNo && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Invoice No</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-surface-700">{ret.invoiceNo}</p>
                </div>
              )}
              {ret.reason && (
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500">Reason</p>
                  <p className="mt-1 font-medium italic text-surface-700">{ret.reason}</p>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-surface-400">Returned Items</h3>

              {!ret.items || ret.items.length === 0 ? (
                <div className="rounded-xl border border-surface-200 bg-white p-8 text-center text-sm text-surface-500">
                  No items recorded for this return.
                </div>
              ) : (
                <div className="rounded-xl border border-surface-200 bg-white overflow-hidden shadow-3xs">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="border-b border-surface-100 bg-surface-50">
                      <tr>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-surface-400 text-[10px]">Item</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-surface-400 text-[10px] text-right">Qty</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-surface-400 text-[10px]">Unit</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-surface-400 text-[10px] text-right">Price</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-surface-400 text-[10px] text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {ret.items.map((line: any, idx: number) => {
                        const qty = Number(line.qty) || 0;
                        const price = Number(line.unitPrice) || 0;
                        return (
                          <tr key={idx} className="hover:bg-surface-50/50">
                            <td className="px-4 py-3 font-semibold text-surface-900">
                              {itemName(line.itemUid)}
                              {line.batchNumber && (
                                <div className="mt-0.5 font-mono text-[10px] text-surface-400">Batch: {line.batchNumber}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-surface-700">{qty}</td>
                            <td className="px-4 py-3 font-medium text-surface-500">{unitName(line.unitUid)}</td>
                            <td className="px-4 py-3 text-right font-medium text-surface-700">{inr(price)}</td>
                            <td className="px-4 py-3 text-right font-bold text-surface-900">{inr(qty * price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {ret && (
        <div className="mt-8 flex justify-end gap-3 border-t border-surface-200 pt-5">
          {up(ret.status) === "DRAFT" && (
            <Button
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: ret.uid, status: "PENDING" })}
            >
              Send for approval
            </Button>
          )}
          {up(ret.status) === "PENDING" && (
            <Button
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: ret.uid, status: "COMPLETED" })}
            >
              Complete Return
            </Button>
          )}
          {up(ret.status) === "COMPLETED" && up(ret.refundStatus) !== "REFUNDED" && (
            <Button
              variant="primary"
              onClick={() => openRefund(ret)}
            >
              Record refund
            </Button>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default SalesReturnsPage;
