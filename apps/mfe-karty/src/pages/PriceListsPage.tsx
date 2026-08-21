/**
 * Price Lists — B2B wholesale price lists assigned to trade partners.
 * Backed by feature-commerce-service /v1/api/tenant/price-lists.
 * Route: /karty/price-lists
 */
import { useEffect, useState } from "react";
import { Badge, Button, DataTable, Drawer, EmptyState, Input, type ColumnDef } from "@jaldee/design-system";
import {
  usePriceLists,
  usePriceList,
  useSavePriceList,
  useDeletePriceList,
  type PriceList,
  type PriceListItem,
} from "../services/usePriceLists";
import { useItems } from "../services/useItems";
import { useUnits } from "../services/useUnits";

const inr = (n?: number) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export function PriceListsPage() {
  const [editUid, setEditUid] = useState<string | null | undefined>(undefined); // undefined = closed, null = new
  const listsQ = usePriceLists();
  const del = useDeletePriceList();

  const columns: ColumnDef<PriceList>[] = [
    { key: "name", header: "Price list", render: (p) => (
      <div><div className="font-medium text-slate-900">{p.name}</div><div className="text-xs text-slate-400">{p.code ?? ""}</div></div>
    ) },
    { key: "currency", header: "Currency", render: (p) => p.currency || "INR" },
    { key: "isDefault", header: "Default", render: (p) => (p.isDefault ? <Badge variant="info">Default</Badge> : "—") },
    { key: "status", header: "Status", render: (p) => <Badge variant={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status}</Badge> },
    { key: "actions", header: "", align: "right", render: (p) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditUid(p.uid)}>Edit</Button>
        <Button size="sm" variant="secondary" disabled={del.isPending} onClick={() => { if (confirm(`Delete "${p.name}"?`)) del.mutate(p.uid); }}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Price Lists</h1>
          <p className="text-sm text-slate-500">Wholesale prices assigned to trade partners.</p>
        </div>
        <Button onClick={() => setEditUid(null)}>New Price List</Button>
      </div>

      {listsQ.isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <DataTable
          data={listsQ.data ?? []}
          columns={columns}
          getRowId={(p) => p.uid}
          emptyState={<EmptyState title="No price lists" description="Create a wholesale list, then assign it to partners." />}
        />
      )}

      {editUid !== undefined ? (
        <PriceListEditor uid={editUid} onClose={() => setEditUid(undefined)} />
      ) : null}
    </div>
  );
}

function PriceListEditor({ uid, onClose }: { uid: string | null; onClose: () => void }) {
  const detailQ = usePriceList(uid ?? undefined);
  const itemsQ = useItems();
  const unitsQ = useUnits();
  const save = useSavePriceList();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<PriceListItem[]>([]);

  useEffect(() => {
    if (uid && detailQ.data) {
      setName(detailQ.data.name);
      setCode(detailQ.data.code ?? "");
      setRows(detailQ.data.items ?? []);
    }
  }, [uid, detailQ.data]);

  const itemName = (u: string) => (itemsQ.data ?? []).find((i) => i.uid === u)?.name ?? u?.slice(0, 8);

  const addRow = () => setRows((r) => [...r, { itemUid: "", price: 0 }]);
  const setRow = (i: number, patch: Partial<PriceListItem>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return;
    const items = rows.filter((r) => r.itemUid && r.price > 0);
    save.mutate({ uid: uid ?? undefined, name, code, status: "ACTIVE", items } as any, { onSuccess: onClose });
  };

  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#55349A]";
  const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <Drawer open onClose={onClose} title={uid ? "Edit price list" : "New price list"} size="lg">
      <div className="flex flex-col gap-5">
        {save.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            {save.error instanceof Error ? save.error.message : "Couldn't save."}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Name <span className="text-red-500">*</span></label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className={lbl}>Code</label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Lines</h3>
            <Button size="sm" variant="secondary" onClick={addRow}>+ Add line</Button>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No lines yet.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Min qty</th><th className="w-8" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select className={input} value={row.itemUid} onChange={(e) => setRow(i, { itemUid: e.target.value })}>
                          <option value="">Select item</option>
                          {(itemsQ.data ?? []).map((it) => <option key={it.uid} value={it.uid}>{it.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className={input} value={row.unitUid ?? ""} onChange={(e) => setRow(i, { unitUid: e.target.value || null })}>
                          <option value="">Base</option>
                          {(unitsQ.data ?? []).map((u: any) => <option key={u.uid} value={u.uid}>{u.symbol ? `${u.name} (${u.symbol})` : u.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" className={input + " text-right"} value={row.price} onChange={(e) => setRow(i, { price: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="px-3 py-2"><input type="number" className={input + " text-right"} value={row.minQty ?? 0} onChange={(e) => setRow(i, { minQty: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="px-3 py-2 text-right"><button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={save.isPending || !name.trim()}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Drawer>
  );
}

export default PriceListsPage;
