/**
 * Delivery Profiles — zone and fee rules applied at checkout.
 *
 * DeliveryProfileController existed; the shell rendered a "Delivery Profiles" placeholder.
 *
 * `zones` and `feeRules` are free-form `jsonb` on the backend (`List<Map>` and `Map`). This
 * screen used to summarise them read-only, because inventing an editor for a shape nobody had
 * defined would have been guesswork. That shape now exists — see `DeliveryProfileForm` for the
 * document layout and `DeliveryProfileType` (commerce-service) for the server-side contract —
 * so create and edit are wired here.
 *
 * The columns stay deliberately summary-level: a rate table with five possible shapes does not
 * fit a list row, so the list reports how many bands a profile has and the form owns the detail.
 *
 * Route: /karty/orders/delivery-profiles
 */
import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Select, type ColumnDef } from "@jaldee/design-system";
import { useDeliveryProfiles, useDeleteDeliveryProfile, type DeliveryProfile } from "../services/useDelivery";
import { useStores } from "../services/useStores";
import { ListScreen } from "./shared/ListScreen";
import { DeliveryProfileForm } from "./DeliveryProfileForm";

export function DeliveryProfilesPage() {
  const [storeUid, setStoreUid] = useState("all");
  const [editing, setEditing] = useState<DeliveryProfile | null>(null);
  const [creating, setCreating] = useState(false);

  const profilesQ = useDeliveryProfiles(storeUid);
  const storesQ = useStores();
  const deleteProfile = useDeleteDeliveryProfile();

  const mode = creating ? "create" : editing ? "edit" : null;

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const columns: ColumnDef<DeliveryProfile>[] = [
    {
      key: "name",
      header: "Profile",
      render: (p) => <span className="font-medium text-slate-900">{p.name ?? "Unnamed profile"}</span>,
    },
    {
      key: "storeUid",
      header: "Store",
      render: (p) => (p.storeUid ? storeName.get(p.storeUid) ?? "—" : "All stores"),
    },
    {
      key: "zones",
      header: "Zones",
      align: "right",
      render: (p) => {
        const n = p.zones?.length ?? 0;
        return n === 0 ? <span className="text-slate-400">None</span> : `${n} zone${n === 1 ? "" : "s"}`;
      },
    },
    {
      key: "feeRules",
      header: "Fee rules",
      render: (p) =>
        p.feeRules && Object.keys(p.feeRules).length > 0 ? (
          <Badge variant="info">{Object.keys(p.feeRules).length} rule(s)</Badge>
        ) : (
          <span className="text-slate-400">No rules</span>
        ),
    },
    {
      key: "active",
      header: "Status",
      render: (p) => (
        <Badge variant={p.active === false ? "neutral" : "success"}>
          {p.active === false ? "Inactive" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={deleteProfile.isPending}
            onClick={() => deleteProfile.mutate(p.uid)}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  const rows = profilesQ.data ?? [];

  // The form owns the whole screen while open — a rate table is too wide to sit in a drawer
  // beside the list, and editing one profile at a time is the only sensible interaction.
  if (mode) {
    return (
      <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
        <DeliveryProfileForm
          existing={mode === "edit" ? editing! : undefined}
          onDone={() => { setEditing(null); setCreating(false); }}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      </div>
    );
  }

  return (
    <ListScreen
      title="Delivery Profiles"
      subtitle="Zone and fee rules applied when a customer checks out."
      isLoading={profilesQ.isLoading}
      error={profilesQ.error}
      actions={<Button size="sm" onClick={() => setCreating(true)}>New profile</Button>}
      notice={
        <>
          {deleteProfile.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              Couldn't remove that profile:{" "}
              {deleteProfile.error instanceof Error
                ? deleteProfile.error.message
                : "the service rejected the change."}
            </div>
          ) : null}
        </>
      }
      toolbar={
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
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(p) => p.uid}
        emptyState={
          <EmptyState
            title="No delivery profiles"
            description="Without a profile, checkout has no delivery zones or fees to apply."
          />
        }
      />
    </ListScreen>
  );
}

export default DeliveryProfilesPage;
