/**
 * Trade Partners — B2B business customers with credit + a wholesale price list.
 * Backed by feature-commerce-service /v1/api/tenant/trade-partners.
 * Route: /karty/partners
 */
import { useMemo, useState } from "react";
import { Badge, Button, DataTable, Drawer, EmptyState, Input, Select, type ColumnDef } from "@jaldee/design-system";
import {
  useTradePartners,
  useSaveTradePartner,
  useSetPartnerStatus,
  usePartnerLedger,
  type TradePartner,
  type PartnerStatus,
} from "../services/useTradePartners";
import { usePriceLists } from "../services/usePriceLists";
import { useStores } from "../services/useStores";
import { useVendors } from "../services/useVendors";
import { ListScreen } from "./shared/ListScreen";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  INACTIVE: "neutral",
};

const inr = (n?: number) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const emptyForm = (): Partial<TradePartner> => ({
  name: "",
  gstin: "",
  contactName: "",
  phone: "",
  email: "",
  billingAddress: "",
  creditEnabled: false,
  creditLimit: 0,
  paymentTermsDays: 0,
  discountPercent: 0,
  status: "ACTIVE",
});

export function PartnersPage() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<TradePartner> | null>(null);
  const [ledgerFor, setLedgerFor] = useState<TradePartner | null>(null);

  const partnersQ = useTradePartners(search);
  const priceListsQ = usePriceLists();
  const storesQ = useStores();
  const vendorsQ = useVendors();
  const save = useSaveTradePartner();
  const setStatus = useSetPartnerStatus();
  const ledgerQ = usePartnerLedger(ledgerFor?.uid);

  const priceListName = useMemo(() => {
    const m = new Map<string, string>();
    (priceListsQ.data ?? []).forEach((p) => m.set(p.uid, p.name));
    return m;
  }, [priceListsQ.data]);

  const set = (patch: Partial<TradePartner>) => setForm((f) => ({ ...(f ?? {}), ...patch }));

  const handleSave = () => {
    if (!form?.name?.trim()) return;
    save.mutate(form, { onSuccess: () => setForm(null) });
  };

  const input =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10";
  const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  const columns: ColumnDef<TradePartner>[] = [
    { key: "name", header: "Partner", render: (p) => (
      <div>
        <div className="font-medium text-slate-900 flex items-center gap-2">
          <span>{p.name}</span>
          {p.vendorUid && (
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              Finance Linked
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">{p.partnerNo ?? ""}{p.gstin ? ` · ${p.gstin}` : ""}</div>
      </div>
    ) },
    { key: "contact", header: "Contact", render: (p) => p.contactName || p.phone || p.email || "—" },
    { key: "priceListUid", header: "Price list", render: (p) => (p.priceListUid ? priceListName.get(p.priceListUid) ?? "—" : "Retail") },
    { key: "creditLimit", header: "Credit", align: "right", render: (p) =>
      p.creditEnabled ? <span className="tabular-nums">{inr(p.creditLimit)}</span> : <span className="text-slate-400">Prepaid</span> },
    { key: "outstandingBalance", header: "Outstanding", align: "right", render: (p) => <span className="tabular-nums">{inr(p.outstandingBalance)}</span> },
    { key: "status", header: "Status", render: (p) => <Badge variant={STATUS_VARIANT[p.status] ?? "neutral"}>{p.status}</Badge> },
    { key: "actions", header: "", align: "right", render: (p) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setLedgerFor(p)}>Ledger</Button>
        <Button size="sm" variant="secondary" onClick={() => setForm(p)}>Edit</Button>
        {p.status !== "ON_HOLD" ? (
          <Button size="sm" variant="secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ uid: p.uid, status: "ON_HOLD" })}>Hold</Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ uid: p.uid, status: "ACTIVE" })}>Activate</Button>
        )}
      </div>
    ) },
  ];

  return (
    <>
      <ListScreen
        title="Trade Partners"
        subtitle="B2B customers with wholesale pricing and credit."
        actions={<Button onClick={() => setForm(emptyForm())}>New Partner</Button>}
        isLoading={partnersQ.isLoading}
        error={partnersQ.error}
        toolbar={
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partners…" className="w-64" />
        }
      >
        <DataTable
          data={partnersQ.data ?? []}
          columns={columns}
          getRowId={(p) => p.uid}
          emptyState={<EmptyState title="No trade partners" description="Add a B2B customer to sell at wholesale prices on credit." />}
        />
      </ListScreen>

      {/* Create / edit */}
      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.uid ? "Edit partner" : "New partner"} size="lg">
        {form ? (
          <div className="flex flex-col gap-5">
            {save.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
                {save.error instanceof Error ? save.error.message : "Couldn't save the partner."}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55349A]">
                  Link to Finance Vendor / Ledger (Optional)
                </label>
                <select
                  className={input + " bg-white"}
                  value={form.vendorUid ?? ""}
                  onChange={(e) => {
                    const vUid = e.target.value;
                    const vMatch = (vendorsQ.data ?? []).find((v: any) => v.uid === vUid);
                    if (vMatch) {
                      set({
                        vendorUid: vUid,
                        name: form.name || vMatch.name,
                        gstin: form.gstin || vMatch.taxId || "",
                        phone: form.phone || vMatch.phone || "",
                        email: form.email || vMatch.email || "",
                        billingAddress: form.billingAddress || vMatch.address || "",
                      });
                    } else {
                      set({ vendorUid: undefined });
                    }
                  }}
                >
                  <option value="">— Select an existing Finance Vendor to link —</option>
                  {(vendorsQ.data ?? []).map((v: any) => (
                    <option key={v.uid} value={v.uid}>
                      {v.name} {v.taxId ? `(GSTIN: ${v.taxId})` : ""} {v.phone ? `· ${v.phone}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Linking directly connects this B2B trade partner with the Finance vendor ledger and bills.
                </p>
              </div>

              <div className="col-span-2">
                <label className={lbl}>Business name <span className="text-red-500">*</span></label>
                <input className={input} value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div><label className={lbl}>GSTIN</label><input className={input} value={form.gstin ?? ""} onChange={(e) => set({ gstin: e.target.value })} /></div>
              <div><label className={lbl}>PAN</label><input className={input} value={form.panNo ?? ""} onChange={(e) => set({ panNo: e.target.value })} /></div>
              <div><label className={lbl}>Contact name</label><input className={input} value={form.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} /></div>
              <div><label className={lbl}>Phone</label><input className={input} value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></div>
              <div><label className={lbl}>Email</label><input className={input} value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></div>
              <div>
                <label className={lbl}>Price list</label>
                <select className={input} value={form.priceListUid ?? ""} onChange={(e) => set({ priceListUid: e.target.value || undefined })}>
                  <option value="">Retail (no list)</option>
                  {(priceListsQ.data ?? []).map((p) => <option key={p.uid} value={p.uid}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Assigned store</label>
                <select className={input} value={form.assignedStoreUid ?? ""} onChange={(e) => set({ assignedStoreUid: e.target.value || undefined })}>
                  <option value="">None</option>
                  {(storesQ.data ?? []).map((s: any) => <option key={s.id ?? s.uid} value={s.id ?? s.uid}>{s.name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Fallback discount %</label><input type="number" className={input + " text-right"} value={form.discountPercent ?? 0} onChange={(e) => set({ discountPercent: parseFloat(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><label className={lbl}>Billing address</label><input className={input} value={form.billingAddress ?? ""} onChange={(e) => set({ billingAddress: e.target.value })} /></div>
            </div>

            {/* Credit */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input type="checkbox" checked={!!form.creditEnabled} onChange={(e) => set({ creditEnabled: e.target.checked })} />
                Offer credit
              </label>
              {form.creditEnabled ? (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Credit limit</label><input type="number" className={input + " text-right"} value={form.creditLimit ?? 0} onChange={(e) => set({ creditLimit: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label className={lbl}>Payment terms (days)</label><input type="number" className={input + " text-right"} value={form.paymentTermsDays ?? 0} onChange={(e) => set({ paymentTermsDays: parseInt(e.target.value) || 0 })} /></div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={save.isPending || !form.name?.trim()}>{save.isPending ? "Saving…" : "Save partner"}</Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Ledger / statement */}
      <Drawer open={!!ledgerFor} onClose={() => setLedgerFor(null)} title={`Ledger · ${ledgerFor?.name ?? ""}`} size="md">
        {ledgerFor ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Outstanding</span><span className="font-semibold tabular-nums">{inr(ledgerFor.outstandingBalance)}</span></div>
              {ledgerFor.creditEnabled ? (
                <div className="flex justify-between"><span className="text-slate-500">Available credit</span><span className="font-semibold tabular-nums">{inr(ledgerFor.availableCredit)}</span></div>
              ) : null}
            </div>
            {ledgerQ.isLoading ? (
              <p className="text-sm text-slate-400">Loading ledger…</p>
            ) : (ledgerQ.data ?? []).length === 0 ? (
              <p className="text-sm italic text-slate-400">No ledger entries yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(ledgerQ.data ?? []).map((e) => (
                    <tr key={e.uid}>
                      <td className="px-3 py-2">{e.entryType}</td>
                      <td className="px-3 py-2 text-slate-500">{e.refNo ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.debit ? inr(e.debit) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.credit ? inr(e.credit) : "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{inr(e.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

export default PartnersPage;
