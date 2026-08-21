/**
 * Logistics — delivery partners (carriers) and delivery agents (riders).
 *
 * Both APIs existed in commerce; the shell showed a "Partners" placeholder instead.
 * Two tabs rather than two routes, since they're the same operational concern.
 *
 * Route: /karty/orders/logistics
 */
import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Select, Tabs, type ColumnDef } from "@jaldee/design-system";
import {
  useDeliveryPartners,
  useDeliveryAgents,
  useDeleteDeliveryPartner,
  useDeleteDeliveryAgent,
  type DeliveryPartner,
  type DeliveryAgent,
} from "../services/useDelivery";
import { useStores } from "../services/useStores";
import { ListScreen } from "./shared/ListScreen";

type Tab = "partners" | "agents";

const activeBadge = (active?: boolean) => (
  <Badge variant={active === false ? "neutral" : "success"}>{active === false ? "Inactive" : "Active"}</Badge>
);

export function LogisticsPage() {
  const [tab, setTab] = useState<Tab>("partners");
  const [storeUid, setStoreUid] = useState("all");

  const partnersQ = useDeliveryPartners();
  const agentsQ = useDeliveryAgents(storeUid);
  const storesQ = useStores();

  const deletePartner = useDeleteDeliveryPartner();
  const deleteAgent = useDeleteDeliveryAgent();

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const partnerName = useMemo(() => {
    const m = new Map<string, string>();
    (partnersQ.data ?? []).forEach((p) => m.set(p.uid, p.name ?? "Unnamed partner"));
    return m;
  }, [partnersQ.data]);

  const partnerColumns: ColumnDef<DeliveryPartner>[] = [
    {
      key: "name",
      header: "Partner",
      render: (p) => <span className="font-medium text-slate-900">{p.name ?? "Unnamed partner"}</span>,
    },
    { key: "type", header: "Type", render: (p) => p.type || "—" },
    { key: "contact", header: "Contact", render: (p) => p.contact || "—" },
    {
      key: "apiConfig",
      header: "Integration",
      // apiConfig is a free-form map; showing whether it's configured is honest, dumping it isn't useful.
      render: (p) =>
        p.apiConfig && Object.keys(p.apiConfig).length > 0 ? (
          <Badge variant="info">Configured</Badge>
        ) : (
          <span className="text-slate-400">Manual</span>
        ),
    },
    { key: "active", header: "Status", render: (p) => activeBadge(p.active) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <Button
          size="sm"
          variant="ghost"
          disabled={deletePartner.isPending}
          onClick={() => deletePartner.mutate(p.uid)}
        >
          Remove
        </Button>
      ),
    },
  ];

  const agentColumns: ColumnDef<DeliveryAgent>[] = [
    {
      key: "name",
      header: "Agent",
      render: (a) => <span className="font-medium text-slate-900">{a.name ?? "Unnamed agent"}</span>,
    },
    { key: "phone", header: "Phone", render: (a) => a.phone || "—" },
    { key: "vehicleNo", header: "Vehicle", render: (a) => a.vehicleNo || "—" },
    {
      key: "partnerUid",
      header: "Partner",
      render: (a) => (a.partnerUid ? partnerName.get(a.partnerUid) ?? "Unknown partner" : "In-house"),
    },
    { key: "storeUid", header: "Store", render: (a) => (a.storeUid ? storeName.get(a.storeUid) ?? "—" : "—") },
    { key: "active", header: "Status", render: (a) => activeBadge(a.active) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <Button size="sm" variant="ghost" disabled={deleteAgent.isPending} onClick={() => deleteAgent.mutate(a.uid)}>
          Remove
        </Button>
      ),
    },
  ];

  const activeQ = tab === "partners" ? partnersQ : agentsQ;
  const mutationError = deletePartner.error ?? deleteAgent.error;

  return (
    <ListScreen
      title="Logistics"
      subtitle="Carriers you ship with, and the agents who deliver."
      isLoading={activeQ.isLoading}
      error={activeQ.error}
      notice={
        mutationError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            Couldn't remove that record:{" "}
            {mutationError instanceof Error ? mutationError.message : "the service rejected the change."}
          </div>
        ) : null
      }
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={[
              { value: "partners", label: "Partners", count: partnersQ.data?.length },
              { value: "agents", label: "Agents", count: agentsQ.data?.length },
            ]}
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
          />
          {tab === "agents" && (
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
          )}
        </div>
      }
    >
      {tab === "partners" ? (
        <DataTable
          data={partnersQ.data ?? []}
          columns={partnerColumns}
          getRowId={(p) => p.uid}
          emptyState={
            <EmptyState
              title="No delivery partners"
              description="Add a carrier to ship through it, or keep fulfilment in-house with agents."
            />
          }
        />
      ) : (
        <DataTable
          data={agentsQ.data ?? []}
          columns={agentColumns}
          getRowId={(a) => a.uid}
          emptyState={
            <EmptyState
              title="No delivery agents"
              description={
                storeUid === "all"
                  ? "No riders have been added yet."
                  : "No agents are assigned to this store."
              }
            />
          }
        />
      )}
    </ListScreen>
  );
}

export default LogisticsPage;
