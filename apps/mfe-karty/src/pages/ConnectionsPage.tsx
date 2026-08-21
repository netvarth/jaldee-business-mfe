/**
 * Distributor–Dealer Connections.
 *
 * A consented, revocable link between two separate Karty tenant accounts. The distributor
 * can read the dealer's in-scope stock / orders / demand trends; the dealer controls exactly
 * what is shared and can raise POs that land as order requests in the distributor's account.
 *
 * Backed by feature-commerce-service `/v1/api/tenant/connections`.
 * Route: /karty/connections
 */
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  Switch,
  Tabs,
  ConfirmDialog,
  MultiCombobox,
  type ColumnDef,
} from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import {
  useConnections,
  useRequestConnection,
  useConnectionAction,
  useUpdateScope,
  useConnectionAudit,
  useDealerStock,
  useDealerOrders,
  useDealerTrends,
  type PartnerConnection,
  type ConnectionStatus,
  type ConnectionInitiator,
  type ConnectionScope,
  type ConnectionScopeType,
} from "../services/useConnections";
import { useInventoryCatalogs } from "../services/useInventoryCatalogs";
import { useItems } from "../services/useItems";
import { ListScreen } from "./shared/ListScreen";

const STATUS_VARIANT: Record<ConnectionStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "info",
  REJECTED: "neutral",
  REVOKED: "danger",
};

const inr = (n?: number) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const shortUid = (u?: string) => (u ? `${u.slice(0, 8)}…${u.slice(-4)}` : "—");

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

/** Which role the calling tenant plays on a given connection, and whether it kicked it off. */
function roleOf(conn: PartnerConnection, myTenant?: string) {
  const isDistributor = !!myTenant && conn.distributorTenantUid === myTenant;
  const isDealer = !!myTenant && conn.dealerTenantUid === myTenant;
  const counterpartyUid = isDistributor ? conn.dealerTenantUid : conn.distributorTenantUid;
  const iAmInitiator =
    (conn.initiatedBy === "DISTRIBUTOR" && isDistributor) || (conn.initiatedBy === "DEALER" && isDealer);
  return { isDistributor, isDealer, counterpartyUid, iAmInitiator };
}

const DEFAULT_SCOPE: ConnectionScope = {
  scopeType: "FULL",
  scopedCatalogUids: [],
  scopedItemUids: [],
  capReadStock: true,
  capReadOrders: true,
  capReadTrends: true,
  capOrderCreate: true,
  capSsoDrilldown: false,
  includeSellout: false,
};

export function ConnectionsPage() {
  const { account } = useMFEProps();
  const myTenant = account?.tenantUid;

  const connsQ = useConnections();
  const request = useRequestConnection();
  const action = useConnectionAction();

  const [requestForm, setRequestForm] = useState<{ role: ConnectionInitiator; counterparty: string } | null>(null);
  const [scopeFor, setScopeFor] = useState<PartnerConnection | null>(null);
  const [dataFor, setDataFor] = useState<PartnerConnection | null>(null);
  const [auditFor, setAuditFor] = useState<PartnerConnection | null>(null);
  const [confirm, setConfirm] = useState<{ conn: PartnerConnection; act: "suspend" | "revoke" } | null>(null);

  const conns = connsQ.data ?? [];

  const columns: ColumnDef<PartnerConnection>[] = useMemo(
    () => [
      {
        key: "counterparty",
        header: "Counterparty",
        render: (c) => {
          const r = roleOf(c, myTenant);
          return (
            <div>
              <div className="font-mono text-[12.5px] font-medium text-slate-900">{shortUid(r.counterpartyUid)}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                {r.isDistributor ? "You are the Distributor" : r.isDealer ? "You are the Dealer" : "—"}
              </div>
            </div>
          );
        },
      },
      {
        key: "initiatedBy",
        header: "Initiated by",
        render: (c) => {
          const r = roleOf(c, myTenant);
          return <span className="text-sm text-slate-600">{r.iAmInitiator ? "You" : c.initiatedBy === "DISTRIBUTOR" ? "Distributor" : "Dealer"}</span>;
        },
      },
      {
        key: "scope",
        header: "Shares",
        render: (c) => {
          const s = c.scope;
          if (!s) return <span className="text-slate-400">—</span>;
          const caps = [
            s.capReadStock && "Stock",
            s.capReadOrders && "Orders",
            s.capReadTrends && "Trends",
            s.capOrderCreate && "PO",
          ].filter(Boolean) as string[];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral">{s.scopeType}</Badge>
              <span className="text-xs text-slate-500">{caps.length ? caps.join(" · ") : "Nothing"}</span>
            </div>
          );
        },
      },
      { key: "requestedAt", header: "Requested", render: (c) => <span className="text-sm text-slate-500">{fmtDate(c.requestedAt)}</span> },
      { key: "status", header: "Status", render: (c) => <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge> },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (c) => {
          const r = roleOf(c, myTenant);
          const busy = action.isPending;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              {c.status === "PENDING" && !r.iAmInitiator && (
                <>
                  <Button size="sm" disabled={busy} onClick={() => action.mutate({ uid: c.uid, action: "approve" })}>Approve</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => action.mutate({ uid: c.uid, action: "reject" })}>Reject</Button>
                </>
              )}
              {c.status === "PENDING" && r.iAmInitiator && <span className="self-center text-xs italic text-slate-400">Awaiting approval</span>}

              {c.status === "ACTIVE" && r.isDistributor && (
                <Button size="sm" onClick={() => setDataFor(c)}>View data</Button>
              )}
              {(c.status === "ACTIVE" || c.status === "SUSPENDED" || c.status === "PENDING") && r.isDealer && (
                <Button size="sm" variant="secondary" onClick={() => setScopeFor(c)}>Scope</Button>
              )}
              {c.status === "ACTIVE" && (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirm({ conn: c, act: "suspend" })}>Suspend</Button>
              )}
              {(c.status === "ACTIVE" || c.status === "SUSPENDED") && (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirm({ conn: c, act: "revoke" })}>Revoke</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setAuditFor(c)}>Audit</Button>
            </div>
          );
        },
      },
    ],
    [myTenant, action],
  );

  const submitRequest = () => {
    if (!requestForm || !myTenant) return;
    const cp = requestForm.counterparty.trim();
    if (!cp) return;
    const body =
      requestForm.role === "DISTRIBUTOR"
        ? { distributorTenantUid: myTenant, dealerTenantUid: cp, initiatedBy: "DISTRIBUTOR" as const }
        : { distributorTenantUid: cp, dealerTenantUid: myTenant, initiatedBy: "DEALER" as const };
    request.mutate(body, { onSuccess: () => setRequestForm(null) });
  };

  const noTenant = !myTenant;

  return (
    <>
      <ListScreen
        title="Connections"
        subtitle="Consented data sharing and order routing between your account and partner accounts."
        actions={<Button onClick={() => setRequestForm({ role: "DISTRIBUTOR", counterparty: "" })} disabled={noTenant}>New Connection</Button>}
        isLoading={connsQ.isLoading}
        error={connsQ.error}
        notice={
          noTenant ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
              Your account's tenant id isn't available yet, so new connections can't be created. Existing connections are still listed.
            </div>
          ) : null
        }
      >
        <DataTable
          data={conns}
          columns={columns}
          getRowId={(c) => c.uid}
          emptyState={
            <EmptyState
              title="No connections yet"
              description="Connect with a distributor or dealer to share stock, orders and demand — or to route purchase orders straight into their sales pipeline."
            />
          }
        />
      </ListScreen>

      <RequestDrawer
        form={requestForm}
        onClose={() => setRequestForm(null)}
        onChange={(patch) => setRequestForm((f) => (f ? { ...f, ...patch } : f))}
        onSubmit={submitRequest}
        saving={request.isPending}
        error={request.error}
        myTenant={myTenant}
      />

      {scopeFor && <ScopeDrawer conn={scopeFor} onClose={() => setScopeFor(null)} />}
      {dataFor && <DataDrawer conn={dataFor} onClose={() => setDataFor(null)} />}
      {auditFor && <AuditDrawer conn={auditFor} onClose={() => setAuditFor(null)} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          action.mutate({ uid: confirm.conn.uid, action: confirm.act }, { onSuccess: () => setConfirm(null) });
        }}
        title={confirm?.act === "revoke" ? "Revoke connection?" : "Suspend connection?"}
        description={
          confirm?.act === "revoke"
            ? "Revoking is permanent and effective immediately — all data sharing and order routing stops and cannot be resumed."
            : "Suspending pauses all data sharing and order routing. You can revoke it later, but it can't be reactivated from here."
        }
        confirmLabel={confirm?.act === "revoke" ? "Revoke" : "Suspend"}
        confirmVariant="danger"
        loading={action.isPending}
      />
    </>
  );
}

// ─── Request drawer ─────────────────────────────────────────────────────────

function RequestDrawer({
  form,
  onClose,
  onChange,
  onSubmit,
  saving,
  error,
  myTenant,
}: {
  form: { role: ConnectionInitiator; counterparty: string } | null;
  onClose: () => void;
  onChange: (patch: Partial<{ role: ConnectionInitiator; counterparty: string }>) => void;
  onSubmit: () => void;
  saving: boolean;
  error: unknown;
  myTenant?: string;
}) {
  return (
    <Drawer open={!!form} onClose={onClose} title="New connection" size="md">
      {form ? (
        <div className="flex flex-col gap-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              {error instanceof Error ? error.message : "Couldn't send the request."}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[12.5px] text-slate-600">
            You'll send a request to the partner account. It becomes active only after they approve it, and the
            dealer side always controls what is shared.
          </div>

          <div>
            <label className={lbl}>Your role in this connection</label>
            <div className="grid grid-cols-2 gap-3">
              {(["DISTRIBUTOR", "DEALER"] as ConnectionInitiator[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onChange({ role })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    form.role === role ? "border-[#55349A] bg-[#55349A]/5 ring-2 ring-[#55349A]/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-800">{role === "DISTRIBUTOR" ? "Distributor" : "Dealer"}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {role === "DISTRIBUTOR" ? "You supply the partner and read their stock & demand." : "You buy from the partner and share your stock."}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>{form.role === "DISTRIBUTOR" ? "Dealer" : "Distributor"} account tenant id</label>
            <input
              className={input + " font-mono"}
              value={form.counterparty}
              placeholder="e.g. 019f4ba7-…"
              onChange={(e) => onChange({ counterparty: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Ask the partner for their account tenant id (found in their account settings).
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Your account (<span className="font-mono">{shortUid(myTenant)}</span>) will be the{" "}
            <b>{form.role === "DISTRIBUTOR" ? "distributor" : "dealer"}</b>.
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSubmit} disabled={saving || !form.counterparty.trim()}>{saving ? "Sending…" : "Send request"}</Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

// ─── Scope drawer (dealer) ──────────────────────────────────────────────────

function ScopeDrawer({ conn, onClose }: { conn: PartnerConnection; onClose: () => void }) {
  const update = useUpdateScope();
  const catalogsQ = useInventoryCatalogs();
  const itemsQ = useItems();
  const [scope, setScope] = useState<ConnectionScope>({ ...DEFAULT_SCOPE, ...(conn.scope ?? {}) });

  const set = (patch: Partial<ConnectionScope>) => setScope((s) => ({ ...s, ...patch }));

  const catalogOptions = (catalogsQ.data ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  const itemOptions = (itemsQ.data ?? []).map((i: any) => ({ value: i.uid, label: i.name }));

  const save = () => update.mutate({ uid: conn.uid, scope }, { onSuccess: onClose });

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <Drawer open onClose={onClose} title="Configure what you share" size="lg">
      <div className="flex flex-col gap-5">
        {update.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            {update.error instanceof Error ? update.error.message : "Couldn't save the scope."}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[12.5px] text-slate-600">
          As the dealer you decide exactly what this distributor can see. Changes take effect immediately and are audited.
        </div>

        <div>
          <label className={lbl}>Data scope</label>
          <div className="grid grid-cols-3 gap-3">
            {(["FULL", "CATALOG", "ITEM"] as ConnectionScopeType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set({ scopeType: t })}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  scope.scopeType === t ? "border-[#55349A] bg-[#55349A]/5 ring-2 ring-[#55349A]/10" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-800">{t === "FULL" ? "Full" : t === "CATALOG" ? "Catalogs" : "Items"}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {t === "FULL" ? "Everything in scope" : t === "CATALOG" ? "Only chosen catalogs" : "Only chosen items"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {scope.scopeType === "CATALOG" && (
          <MultiCombobox
            label="Shared catalogs"
            options={catalogOptions}
            value={scope.scopedCatalogUids ?? []}
            onValueChange={(v) => set({ scopedCatalogUids: v })}
            placeholder={catalogsQ.isLoading ? "Loading catalogs…" : "Select catalogs to share"}
          />
        )}
        {scope.scopeType === "ITEM" && (
          <MultiCombobox
            label="Shared items"
            options={itemOptions}
            value={scope.scopedItemUids ?? []}
            onValueChange={(v) => set({ scopedItemUids: v })}
            placeholder={itemsQ.isLoading ? "Loading items…" : "Select items to share"}
          />
        )}

        <div className="rounded-xl border border-slate-200 px-4 py-1">
          <Toggle label="Share stock levels" desc="Let the distributor see on-hand quantities." checked={scope.capReadStock} onChange={(v) => set({ capReadStock: v })} />
          <Toggle label="Share order book" desc="Let the distributor see your orders." checked={scope.capReadOrders} onChange={(v) => set({ capReadOrders: v })} />
          <Toggle label="Share demand trends" desc="Let the distributor see aggregate demand." checked={scope.capReadTrends} onChange={(v) => set({ capReadTrends: v })} />
          <Toggle label="Allow order routing" desc="Let your POs land as order requests in their account." checked={scope.capOrderCreate} onChange={(v) => set({ capOrderCreate: v })} />
          <Toggle label="Include sell-out data" desc="Share point-of-sale sell-out alongside stock." checked={scope.includeSellout} onChange={(v) => set({ includeSellout: v })} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save scope"}</Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Data visibility drawer (distributor) ───────────────────────────────────

function DataDrawer({ conn, onClose }: { conn: PartnerConnection; onClose: () => void }) {
  const [tab, setTab] = useState<"stock" | "orders" | "trends">("stock");
  const stockQ = useDealerStock(conn.uid, tab === "stock");
  const ordersQ = useDealerOrders(conn.uid, tab === "orders");
  const trendsQ = useDealerTrends(conn.uid, "30D", tab === "trends");

  const scope = conn.scope;
  const items: { value: string; label: string; disabled?: boolean }[] = [
    { value: "stock", label: "Stock" },
    { value: "orders", label: "Orders" },
    { value: "trends", label: "Trends" },
  ];

  const denied = (msg?: string) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {msg ?? "Not shared on this connection."}
    </div>
  );
  const loading = <p className="py-6 text-center text-sm text-slate-400">Loading…</p>;
  const errBox = (e: unknown) => (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
      {e instanceof Error ? e.message : "Couldn't load."}
    </div>
  );

  return (
    <Drawer open onClose={onClose} title={`Dealer data · ${shortUid(conn.dealerTenantUid)}`} size="lg">
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} items={items} />

        {tab === "stock" &&
          (!scope?.capReadStock ? denied("Stock isn't shared on this connection.") :
            stockQ.isLoading ? loading :
            stockQ.error ? errBox(stockQ.error) :
            (stockQ.data?.items ?? []).length === 0 ? denied("No in-scope stock to show.") : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2 text-right">On hand</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockQ.data!.items.map((s, i) => (
                    <tr key={s.itemUid ?? i}>
                      <td className="px-3 py-2 text-slate-800">{s.itemName ?? shortUid(s.itemUid)}</td>
                      <td className="px-3 py-2 text-slate-500">{s.itemSku ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.onHandQty ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

        {tab === "orders" &&
          (!scope?.capReadOrders ? denied("Orders aren't shared on this connection.") :
            ordersQ.isLoading ? loading :
            ordersQ.error ? errBox(ordersQ.error) :
            (ordersQ.data?.orders ?? []).length === 0 ? denied("No orders to show.") : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersQ.data!.orders.map((o, i) => (
                    <tr key={o.orderUid ?? i}>
                      <td className="px-3 py-2 font-medium text-slate-800">{o.orderNo ?? shortUid(o.orderUid)}</td>
                      <td className="px-3 py-2"><Badge variant="neutral">{o.status ?? "—"}</Badge></td>
                      <td className="px-3 py-2 text-slate-500">{fmtDate(o.orderDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{inr(o.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

        {tab === "trends" &&
          (!scope?.capReadTrends ? denied("Trends aren't shared on this connection.") :
            trendsQ.isLoading ? loading :
            trendsQ.error ? errBox(trendsQ.error) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Orders ({trendsQ.data?.period})</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{trendsQ.data?.totalOrdersCount ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Demand value</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{inr(trendsQ.data?.totalDemandAmount)}</div>
                  </div>
                </div>
                {(trendsQ.data?.topDemandedItems ?? []).length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trendsQ.data!.topDemandedItems.map((t, i) => (
                        <tr key={t.itemUid ?? i}>
                          <td className="px-3 py-2 text-slate-800">{t.itemName ?? shortUid(t.itemUid)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.totalQuantity ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{inr(t.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm italic text-slate-400">Item-level demand breakdown isn't available yet.</p>
                )}
              </div>
            ))}
      </div>
    </Drawer>
  );
}

// ─── Audit drawer ───────────────────────────────────────────────────────────

function AuditDrawer({ conn, onClose }: { conn: PartnerConnection; onClose: () => void }) {
  const auditQ = useConnectionAudit(conn.uid);
  const rows = auditQ.data ?? [];
  return (
    <Drawer open onClose={onClose} title="Audit trail" size="md">
      {auditQ.isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : auditQ.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
          {auditQ.error instanceof Error ? auditQ.error.message : "Couldn't load the audit trail."}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm italic text-slate-400">No audit entries yet.</p>
      ) : (
        <ol className="relative ml-2 border-l border-slate-200">
          {rows.map((r) => (
            <li key={r.uid} className="mb-4 ml-4">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#55349A]" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{r.action}</span>
                <span className="text-xs text-slate-400">{r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN") : "—"}</span>
              </div>
              {r.scopeSnapshot ? <div className="mt-0.5 break-words text-xs text-slate-500">{r.scopeSnapshot}</div> : null}
              <div className="mt-0.5 font-mono text-[11px] text-slate-400">actor {shortUid(r.actorTenantUid)}</div>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}

export default ConnectionsPage;
