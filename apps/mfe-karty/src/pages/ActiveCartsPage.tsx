/**
 * Active Carts — back-office console for live shopper sessions holding ≥1 item.
 *
 * Ported from the Claude Design reference "Active Carts.dc.html" (project "Karty MFE design
 * reference"). Cart state is derived client-side from idle age (the backend only stamps
 * updatedAt): active ≤ 30 min · idle 30 min–24 h · abandoned > 24 h. Value is summed from the
 * cart lines; a basket whose lines carry no price shows "Unpriced", never ₹0 (₹0 would imply a
 * free basket). Empty carts are excluded by the backend (getOrCreate makes one on open).
 *
 * Backed by GET /v1/api/tenant/carts/active. Recovery / convert / assign / attach-customer are
 * "Later" scope (P3 discovery) and are surfaced but not yet wired; Clear cart is live.
 *
 * Route: /karty/orders/active-carts
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveCarts, useActiveCartCount, useClearCart, type ActiveCart } from "../services/useActiveCarts";
import { useStores } from "../services/useStores";
import { useCustomers } from "../services/useCustomers";
import { useItems } from "../services/useItems";
import { useCreateOrder } from "../services/useOrders";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const inr2 = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const cartValue = (c: ActiveCart) => (c.items ?? []).reduce((s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0), 0);
const cartUnits = (c: ActiveCart) => (c.items ?? []).reduce((s, l) => s + (Number(l.qty) || 0), 0);
const isPriced = (c: ActiveCart) => (c.items ?? []).some((l) => Number(l.unitPrice) > 0);

const ageMinutes = (raw?: string) => {
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / 60000);
};
const ageLabel = (raw?: string) => {
  const m = ageMinutes(raw);
  if (!raw || m === 0) return "just now";
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
};

type CartState = "active" | "idle" | "abandoned";
const stateOf = (c: ActiveCart): CartState => {
  const m = ageMinutes(c.updatedAt);
  if (m > 24 * 60) return "abandoned";
  if (m > 30) return "idle";
  return "active";
};
const STATE_STYLE: Record<CartState, { label: string; dot: string; bg: string; fg: string; pulse: boolean }> = {
  active: { label: "Active", dot: "#059669", bg: "#d1fae5", fg: "#059669", pulse: true },
  idle: { label: "Idle", dot: "#d97706", bg: "#fef3c7", fg: "#b45309", pulse: false },
  abandoned: { label: "Abandoned", dot: "#dc2626", bg: "#fee2e2", fg: "#dc2626", pulse: false },
};

const STATE_FILTERS: { key: "all" | CartState; label: string }[] = [
  { key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "idle", label: "Idle" }, { key: "abandoned", label: "Abandoned" },
];

export function ActiveCartsPage() {
  const navigate = useNavigate();
  const [storeUid, setStoreUid] = useState("all");
  const [stateFilter, setStateFilter] = useState<"all" | CartState>("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [drawer, setDrawer] = useState<ActiveCart | null>(null);
  const [clearFor, setClearFor] = useState<ActiveCart | null>(null);
  const [soon, setSoon] = useState<string | null>(null);

  const cartsQ = useActiveCarts(storeUid);
  const countQ = useActiveCartCount(storeUid);
  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);
  const itemsQ = useItems();
  const clearCart = useClearCart();
  const createOrder = useCreateOrder();

  // Convert an active cart into a real order: the backend prices each line from the store's order
  // catalog and computes a server-authoritative total, so we only send the cart's identity + lines.
  // On success we clear the cart (so it leaves the active list) and open the new order.
  const convertCart = (c: ActiveCart) => {
    const lines = (c.items ?? []).filter((l) => l.itemUid);
    if (lines.length === 0) { flashSoon("This cart is empty — nothing to convert."); return; }
    const payload = {
      consumerUid: c.consumerUid || undefined,
      channel: "ONLINE",
      storeUid: c.storeUid,
      items: lines.map((l) => ({
        itemUid: l.itemUid,
        qty: Number(l.qty) || 1,
        sellQty: Number(l.sellQty ?? l.qty) || 1,
        unitUid: l.unitUid || null,
        unitPrice: l.unitPrice ?? undefined,
      })),
    };
    createOrder.mutate(payload, {
      onSuccess: (data: any) => {
        const orderNo = (data?.orderNo || data?.data?.orderNo || "").toString().replace(/^ORD-/, "");
        if (c.consumerUid) clearCart.mutate({ consumerUid: c.consumerUid, storeUid: c.storeUid });
        setDrawer(null);
        flashSoon(orderNo ? `Order #${orderNo} created from this cart.` : "Order created from this cart.");
        // Land on the orders list (the /orders/:uid detail page currently crashes — tracked separately).
        navigate("/orders");
      },
      onError: (e: any) => flashSoon(e?.message || "Couldn't convert this cart to an order."),
    });
  };

  const storeName = useMemo(() => { const m = new Map<string, string>(); (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name)); return m; }, [storesQ.data]);
  const customer = useMemo(() => { const m = new Map<string, any>(); (customersQ.data ?? []).forEach((c: any) => m.set(c.uid, c)); return m; }, [customersQ.data]);
  const itemName = useMemo(() => { const m = new Map<string, string>(); (itemsQ.data ?? []).forEach((i: any) => m.set(i.uid, i.name)); return m; }, [itemsQ.data]);

  const custLabel = (c: ActiveCart) => {
    if (!c.consumerUid) return "Guest";
    const cust = customer.get(c.consumerUid);
    return cust ? (cust.displayName || [cust.firstName, cust.lastName].filter(Boolean).join(" ") || cust.consumerNo || "Customer") : "Customer";
  };

  const all = cartsQ.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => (stateFilter === "all" || stateOf(c) === stateFilter) && (!q || custLabel(c).toLowerCase().includes(q) || (c.storeUid && (storeName.get(c.storeUid) ?? "").toLowerCase().includes(q))));
  }, [all, stateFilter, search, customer, storeName]);

  const kpi = useMemo(() => {
    let active = 0, idle = 0, abandoned = 0, value = 0;
    all.forEach((c) => { const s = stateOf(c); if (s === "active") active++; else if (s === "idle") idle++; else abandoned++; value += cartValue(c); });
    return { active, idle, abandoned, value };
  }, [all]);

  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const selCount = selIds.length;
  const allSel = rows.length > 0 && rows.every((c) => sel[c.uid]);
  const toggleAll = () => { const on = !allSel; setSel((s) => { const n = { ...s }; rows.forEach((c) => (n[c.uid] = on)); return n; }); };

  const flashSoon = (msg: string) => { setSoon(msg); setTimeout(() => setSoon(null), 2600); };

  const lbl = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
  const card = "rounded-xl border border-slate-200 bg-white";

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full bg-surface-50 text-surface-900">
      <div className="mx-auto max-w-[1560px] px-4 md:px-8 pb-14 pt-7">
        {/* header */}
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-600">Karty</span>
          <span className="text-xs text-surface-500">Commerce</span>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-surface-900">Active Carts</h1>
        <p className="mt-1 text-[13.5px] text-surface-500">Live shopper sessions holding at least one item. Empty carts are excluded.</p>

        {/* KPI strip */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {[
            { label: "Active carts", value: String(kpi.active), color: "#0f172a", border: "#e0e7ff" },
            { label: "Idle > 30 min", value: String(kpi.idle), color: "#d97706", border: "#fde68a" },
            { label: "Abandoned", value: String(kpi.abandoned), color: "#dc2626", border: "#fecaca" },
            { label: "Live basket value", value: kpi.value > 0 ? inr(kpi.value) : "—", color: "#0f172a", border: "#e2e8f0" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-white px-4 py-3.5" style={{ border: `1px solid ${k.border}` }}>
              <div className="text-[12px] font-medium text-slate-500">{k.label}</div>
              <div className="mt-1 text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* table card */}
        <div className="mt-4.5 mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <select value={storeUid} onChange={(e) => setStoreUid(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
              <option value="all">All stores</option>
              {(storesQ.data ?? []).map((s: any) => <option key={s.id ?? s.uid} value={String(s.id ?? s.uid)}>{s.name}</option>)}
            </select>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
              {STATE_FILTERS.map((f, i) => (
                <button key={f.key} onClick={() => setStateFilter(f.key)}
                  className="h-9 px-3.5 text-[12.5px] font-semibold transition-colors"
                  style={{ borderRight: i < STATE_FILTERS.length - 1 ? "1px solid #e2e8f0" : undefined, background: stateFilter === f.key ? "#55349A" : "#fff", color: stateFilter === f.key ? "#fff" : "#6B7280" }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[180px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search carts…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#55349A]" />
            </div>
          </div>

          {/* bulk bar */}
          {selCount > 0 && (
            <div className="mx-4 my-3 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5">
              <span className="text-sm font-bold text-indigo-700">{selCount} selected</span>
              <span className="h-4 w-px bg-indigo-200" />
              <button onClick={() => flashSoon("Recovery messaging is planned (P3) — not wired yet.")} className="h-7 rounded-md bg-[#55349A] px-3.5 text-[12.5px] font-bold text-white">Send recovery ({selCount})</button>
              <button onClick={() => setSel({})} className="ml-auto text-xs font-semibold text-indigo-500">Clear selection</button>
            </div>
          )}

          {/* body */}
          {cartsQ.isLoading ? (
            <div className="flex flex-col gap-2.5 px-5 py-4">
              {[1, 2, 3, 4, 5].map((k) => <div key={k} className="h-11 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : cartsQ.error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              {cartsQ.error instanceof Error ? cartsQ.error.message : "Couldn't load active carts."}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <div className="mb-2.5 text-4xl">🛒</div>
              <div className="text-[15px] font-bold text-slate-800">Nobody has items in a cart right now</div>
              <div className="mt-1.5 text-[13px] text-slate-500">Carts appear here as customers add items. Empty carts are excluded.</div>
            </div>
          ) : (
            <div>
              {/* head */}
              <div className="grid items-center gap-2 border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500" style={{ gridTemplateColumns: "34px 1.6fr 1.1fr 56px 56px 1fr 1fr 40px" }}>
                <div><input type="checkbox" checked={allSel} onChange={toggleAll} className="h-3.5 w-3.5 cursor-pointer" style={{ accentColor: "#55349A" }} /></div>
                <div>Customer</div><div>Store</div>
                <div className="text-right">Lines</div><div className="text-right">Units</div>
                <div className="text-right">Value</div><div className="text-right">Idle for</div><div />
              </div>
              {/* rows */}
              {rows.map((c) => {
                const st = STATE_STYLE[stateOf(c)];
                const guest = !c.consumerUid;
                const v = cartValue(c);
                const selected = !!sel[c.uid];
                return (
                  <div key={c.uid} onClick={() => setDrawer(c)}
                    className="grid cursor-pointer items-center gap-2 border-b border-slate-100 px-5 py-3 text-[12.5px] hover:bg-slate-50/70"
                    style={{ gridTemplateColumns: "34px 1.6fr 1.1fr 56px 56px 1fr 1fr 40px", background: selected ? "rgba(245,243,255,.7)" : undefined }}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected} onChange={() => setSel((s) => ({ ...s, [c.uid]: !s[c.uid] }))} className="h-3.5 w-3.5 cursor-pointer" style={{ accentColor: "#55349A" }} />
                    </div>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="relative h-2.5 w-2.5 flex-shrink-0">
                        <span className="absolute inset-0 rounded-full" style={{ background: st.dot }} />
                        {st.pulse && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: st.dot }} />}
                      </span>
                      <span className="truncate" style={{ fontWeight: guest ? 500 : 700, color: guest ? "#6B7280" : "#1E1B4B" }}>{custLabel(c)}</span>
                    </div>
                    <div className="truncate text-slate-500">{c.storeUid ? storeName.get(c.storeUid) ?? "—" : "—"}</div>
                    <div className="text-right text-slate-500">{c.items?.length ?? 0}</div>
                    <div className="text-right text-slate-500">{cartUnits(c)}</div>
                    <div className="text-right" style={{ fontWeight: isPriced(c) ? 700 : 400, color: isPriced(c) ? "#1E1B4B" : "#9ca3af" }}>{isPriced(c) ? inr(v) : "Unpriced"}</div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: st.bg, color: st.fg }}>{ageLabel(c.updatedAt)}</span>
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); setDrawer(c); }} className="text-right text-lg text-slate-400" title="Row actions">⋯</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-3 px-0.5 text-[11.5px] text-slate-500">
          A cart of unpriced lines shows <strong className="text-slate-700">"Unpriced"</strong>, not ₹0 — ₹0 would imply a free basket. Idle &amp; abandoned carts carry a coloured dot / badge.
          {typeof countQ.data === "number" && countQ.data > all.length ? <> Showing {all.length} of {countQ.data}.</> : null}
        </p>
      </div>

      {/* toast */}
      {soon && (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-[12.5px] font-medium text-white shadow-lg">{soon}</div>
      )}

      {/* drawer */}
      {drawer && (() => {
        const c = drawer; const st = STATE_STYLE[stateOf(c)]; const guest = !c.consumerUid; const cust = c.consumerUid ? customer.get(c.consumerUid) : null;
        return (
          <>
            <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setDrawer(null)} />
            <div className="fixed right-0 top-0 z-[201] flex h-full w-[440px] max-w-full flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Cart detail</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">{guest ? "Guest" : "Customer"}</span>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">Idle {ageLabel(c.updatedAt)}</span>
                  </div>
                </div>
                <button onClick={() => setDrawer(null)} className="h-7 w-7 rounded-md text-xl text-slate-400 hover:bg-slate-100">×</button>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                <div>
                  <div className={lbl + " mb-2"}>Basket · {c.items?.length ?? 0} lines · {cartUnits(c)} units</div>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    {(c.items ?? []).map((l, i) => {
                      const price = Number(l.unitPrice) || 0; const qty = Number(l.qty) || 0;
                      return (
                        <div key={l.uid ?? i} className="flex justify-between gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-[12.5px]">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800">{itemName.get(l.itemUid ?? "") ?? (l.itemUid ?? "").slice(0, 8)}</div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{qty} × {price > 0 ? inr2(price) : "—"}</div>
                          </div>
                          <div className="whitespace-nowrap font-bold text-slate-800">{price > 0 ? inr2(price * qty) : "—"}</div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between bg-slate-50 px-3.5 py-3 text-sm font-extrabold">
                      <span>Basket value</span><span>{isPriced(c) ? inr2(cartValue(c)) : "Unpriced"}</span>
                    </div>
                  </div>
                </div>

                {guest ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-[13px] font-bold text-slate-800">Guest session</div>
                    <div className="mt-1 text-[12px] leading-relaxed text-slate-500">No customer attached. Recovery needs a phone or email — attach a customer to enable messaging.</div>
                    <button onClick={() => flashSoon("Attach-customer to a guest cart is planned (P3).")} className="mt-2.5 h-8 rounded-lg border border-[#55349A] px-3.5 text-[12.5px] font-bold text-[#55349A]">＋ Attach customer</button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="text-[13px] font-bold text-slate-800">{custLabel(c)}</div>
                    <div className="mt-1 text-[12px] text-slate-500">{cust?.phoneE164 || cust?.primaryNumber || "—"}{cust?.state ? ` · ${cust.state}` : ""}</div>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 text-[12.5px]">
                  <div className="flex justify-between"><span className="text-slate-500">Store</span><span className="font-semibold">{c.storeUid ? storeName.get(c.storeUid) ?? "—" : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Last activity</span><span className="font-semibold">{c.updatedAt ? new Date(c.updatedAt).toLocaleString("en-IN") : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Idle for</span><span className="font-semibold">{ageLabel(c.updatedAt)}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-3.5">
                <div className="flex gap-2.5">
                  <button onClick={() => convertCart(c)} disabled={createOrder.isPending || (c.items?.length ?? 0) === 0} className="h-10 flex-1 rounded-lg bg-[#55349A] text-[13px] font-bold text-white disabled:opacity-50">{createOrder.isPending ? "Converting…" : "Convert to order"}</button>
                  <button onClick={() => flashSoon("Recovery messaging is planned (P3).")} className="h-10 flex-1 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700">Send recovery</button>
                </div>
                <div className="flex gap-2.5">
                  <button onClick={() => flashSoon("Assign-to-staff is planned (P3).")} className="h-9 flex-1 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-700">Assign to staff</button>
                  <button onClick={() => setClearFor(c)} disabled={!c.consumerUid} className="h-9 flex-1 rounded-lg border border-red-200 bg-white text-[12.5px] font-semibold text-red-600 disabled:opacity-40" title={!c.consumerUid ? "Guest carts can't be cleared from here yet" : ""}>Clear cart</button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* clear confirm */}
      {clearFor && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-6" onClick={() => setClearFor(null)}>
          <div className="w-[400px] max-w-full rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-xl font-extrabold text-red-600">!</div>
            <div className="mt-3 text-[17px] font-extrabold text-slate-900">Clear this cart?</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
              This empties the basket ({clearFor.items?.length ?? 0} lines{isPriced(clearFor) ? ` · ${inr(cartValue(clearFor))}` : ""}). It can't be undone, and the shopper will see an empty cart on their next visit.
            </div>
            {clearCart.error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">Couldn't clear the cart.</div> : null}
            <div className="mt-5 flex justify-end gap-2.5">
              <button onClick={() => setClearFor(null)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700">Cancel</button>
              <button
                onClick={() => clearCart.mutate({ consumerUid: clearFor.consumerUid!, storeUid: clearFor.storeUid }, { onSuccess: () => { setClearFor(null); setDrawer(null); } })}
                disabled={clearCart.isPending}
                className="h-9 rounded-lg bg-red-600 px-4.5 px-5 text-[13px] font-bold text-white disabled:opacity-50">
                {clearCart.isPending ? "Clearing…" : "Clear cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveCartsPage;
