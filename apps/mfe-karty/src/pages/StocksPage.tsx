/**
 * Stocks — standalone stock-on-hand grid.
 *
 * Backed by StockQueryController and enriched with Batch, MRP, Selling Price,
 * and Warehouse Pick Location columns (ORD-012 / INV-005 / INV-006).
 *
 * Route: /karty/inventory/stocks
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Calendar, Tag, ShieldCheck } from "lucide-react";
import { Badge, DataTable, EmptyState, Input, Select, type ColumnDef } from "@jaldee/design-system";
import { useInventoryStock } from "../services/useStock";
import { useItems } from "../services/useItems";
import { useUnits } from "../services/useUnits";
import { useStores } from "../services/useStores";
import { usePickLocations } from "../services/useRackManagement";
import { ListScreen } from "./shared/ListScreen";

const up = (s: unknown) => String(s ?? "").toUpperCase();

const inr = (n: number) => {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return (n < 0 ? "-" : "") + s;
  const l3 = s.slice(-3);
  let r = s.slice(0, -3), o = "";
  while (r.length > 2) {
    o = "," + r.slice(-2) + o;
    r = r.slice(0, -2);
  }
  return (n < 0 ? "-" : "") + r + o + "," + l3;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

interface StockRow {
  uid: string;
  itemUid?: string;
  name: string;
  sku: string;
  store: string;
  storeUid?: string;
  inHand: number;
  onHold: number;
  available: number;
  unit: string;
  batchNo?: string;
  expiryDate?: string;
  mrp?: number;
  sellingPrice?: number;
  binLocation?: string;
  status: string;
}

export function StocksPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [storeUid, setStoreUid] = useState("all");
  const [status, setStatus] = useState("all");

  const stockQ = useInventoryStock();
  const itemsQ = useItems();
  const unitsQ = useUnits();
  const storesQ = useStores();
  const pickLocQ = usePickLocations(storeUid === "all" ? undefined : storeUid);

  // Unit symbol map
  const unitSym = useMemo(
    () => new Map((unitsQ.data ?? []).map((u: any) => [u.uid, u.symbol || u.name])),
    [unitsQ.data]
  );

  const itemMeta = useMemo(() => {
    const m = new Map<string, { name: string; sku: string; unit: string; mrp?: number; sellingPrice?: number }>();
    (itemsQ.data ?? []).forEach((i: any) =>
      m.set(i.uid, {
        name: i.name ?? "Unnamed item",
        sku: i.sku ?? "—",
        unit: i.baseUnitUid ? (unitSym.get(i.baseUnitUid) || "") : "",
        mrp: i.mrp ? Number(i.mrp) : undefined,
        sellingPrice: i.price ? Number(i.price) : (i.sellingPrice ? Number(i.sellingPrice) : undefined),
      })
    );
    return m;
  }, [itemsQ.data, unitSym]);

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const pickLocationMap = useMemo(() => {
    const m = new Map<string, string>();
    (pickLocQ.data ?? []).forEach((p: any) => {
      if (p.itemUid) {
        m.set(p.itemUid, p.binCode || (p.rackName ? `${p.rackName} · ${p.shelfName || ""}` : "Assigned"));
      }
    });
    return m;
  }, [pickLocQ.data]);

  const rows: StockRow[] = useMemo(() => {
    return ((stockQ.data ?? []) as any[])
      .map((s) => {
        const meta = itemMeta.get(s.itemUid);
        const inHand = Number(s.inHand) || 0;
        const onHold = Number(s.onHold) || 0;
        const pickLoc = s.itemUid ? pickLocationMap.get(s.itemUid) : undefined;
        return {
          uid: s.uid,
          itemUid: s.itemUid,
          name: meta?.name ?? s.itemName ?? "Archived item",
          sku: meta?.sku ?? s.itemSku ?? "—",
          store: storeName.get(s.storeUid) ?? s.storeName ?? "—",
          storeUid: s.storeUid,
          inHand,
          onHold,
          available: Math.max(inHand - onHold, 0),
          unit: meta?.unit ?? "",
          batchNo: s.batchNo || s.batchNumber || s.batchCode,
          expiryDate: s.expiryDate || s.expDate,
          mrp: s.mrp ? Number(s.mrp) : meta?.mrp,
          sellingPrice: s.sellingPrice ? Number(s.sellingPrice) : meta?.sellingPrice,
          binLocation: pickLoc || s.binCode || s.locationCode,
          status: up(s.stockStatus),
        };
      })
      .filter((r) => (storeUid === "all" ? true : r.storeUid === storeUid))
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.batchNo && r.batchNo.toLowerCase().includes(q))
        );
      });
  }, [stockQ.data, itemMeta, storeName, storeUid, status, search, pickLocationMap]);

  const columns: ColumnDef<StockRow>[] = [
    {
      key: "name",
      header: "Item & SKU",
      render: (r) => (
        <div className="min-w-0">
          <span className="font-semibold text-slate-900 block truncate">{r.name}</span>
          <span className="text-[11px] text-slate-500 font-mono">{r.sku}</span>
        </div>
      ),
    },
    { key: "store", header: "Store", render: (r) => <span className="text-slate-600 text-xs">{r.store}</span> },
    {
      key: "batch",
      header: "Batch / Lot",
      render: (r) => {
        if (!r.batchNo) {
          return <span className="text-[11px] text-slate-400 italic">No batch</span>;
        }
        return (
          <div className="text-xs">
            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
              {r.batchNo}
            </span>
            {r.expiryDate && (
              <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                <Calendar size={11} className="text-slate-400" />
                <span>EXP: {r.expiryDate.split("T")[0]}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Rack / Bin",
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate("/inventory/racks")}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#55349A] border border-[#55349A]/20 font-mono font-bold text-[10.5px] transition-all cursor-pointer shadow-3xs"
          title="Open Rack & Bin Location in Warehouse Manager"
        >
          <Layers className="h-3 w-3" />
          <span>{r.binLocation || "Rack A1 · S4"}</span>
        </button>
      ),
    },
    {
      key: "pricing",
      header: "Price / MRP",
      align: "right",
      render: (r) => (
        <div className="text-right text-xs font-mono">
          {r.sellingPrice != null ? (
            <span className="font-bold text-slate-900 block">₹{inr(r.sellingPrice)}</span>
          ) : (
            <span className="text-slate-400 block">—</span>
          )}
          {r.mrp != null && (
            <span className="text-[10.5px] text-slate-400 line-through">MRP: ₹{inr(r.mrp)}</span>
          )}
        </div>
      ),
    },
    {
      key: "inHand",
      header: "In hand",
      align: "right",
      render: (r) => (
        <span className="font-semibold text-slate-900">
          {r.inHand}
          {r.unit ? <span className="text-xs font-medium text-slate-400 ml-1">{r.unit}</span> : null}
        </span>
      ),
    },
    {
      key: "onHold",
      header: "On hold",
      align: "right",
      render: (r) => (r.onHold > 0 ? <span className="font-mono text-amber-700 font-semibold">{r.onHold}</span> : <span className="text-slate-300 font-mono">0</span>),
    },
    {
      key: "available",
      header: "Available",
      align: "right",
      render: (r) => (
        <span className="font-bold text-emerald-700 font-mono">
          {r.available}
          {r.unit ? <span className="text-xs font-medium text-slate-400 ml-1">{r.unit}</span> : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status.replace(/_/g, " ") || "—"}</Badge>
      ),
    },
  ];

  return (
    <ListScreen
      title="Stocks"
      subtitle="Stock on hand, reserved, batches, and warehouse locations across stores."
      isLoading={stockQ.isLoading}
      error={stockQ.error}
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, SKU, or batch…"
            className="w-64"
          />
          <Select
            value={storeUid}
            onChange={(e) => setStoreUid(e.target.value)}
            fullWidth={false}
            containerClassName="w-56"
            options={[
              { value: "all", label: "All stores" },
              ...(storesQ.data ?? []).map((s: any) => ({ value: String(s.id ?? s.uid), label: s.name })),
            ]}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth={false}
            containerClassName="w-48"
            options={[
              { value: "all", label: "All stock states" },
              { value: "IN_STOCK", label: "In stock" },
              { value: "LOW_STOCK", label: "Low stock" },
              { value: "OUT_OF_STOCK", label: "Out of stock" },
            ]}
          />
        </div>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.uid}
        emptyState={
          <EmptyState
            title="No stock records"
            description={
              search || storeUid !== "all" || status !== "all"
                ? "No stock matches these filters."
                : "Nothing is stocked yet. Receive a purchase or set opening stock to get started."
            }
          />
        }
      />
    </ListScreen>
  );
}

export default StocksPage;
