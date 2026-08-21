/**
 * Audit Log — replaces the PlaceholderScreen the shell used to render.
 *
 * Reads the shared-audit store via the new commerce AuditlogController.
 *
 * Honest-state note: shared-audit has been on commerce's classpath for a while but no
 * commerce operation is annotated with @AuditLog, because AuditlogContext (in the shared
 * library, used by several services) has no commerce entity values yet. So an empty
 * result here means "nothing is being recorded", not "nothing happened" — and this screen
 * says exactly that instead of showing a bare empty table, which would read as the latter.
 *
 * Route: /karty/inventory/audit-log
 */
import { useMemo, useState } from "react";
import { Badge, DataTable, Drawer, EmptyState, Input, type ColumnDef } from "@jaldee/design-system";
import { useAuditLogs, type AuditLog } from "../services/useAuditLogs";
import { ListScreen, Notice } from "./shared/ListScreen";

const ACTION_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "neutral",
};

const fmtWhen = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
};

const pretty = (v: unknown) => {
  if (v == null) return null;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

export function AuditLogPage() {
  const [entityName, setEntityName] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const query = useMemo(() => ({ size: 50, entityName: entityName.trim() || undefined }), [entityName]);
  const logsQ = useAuditLogs(query);

  const rows = logsQ.data?.rows ?? [];
  const total = logsQ.data?.total ?? 0;

  // Distinguish "no coverage yet" from "no matches for this filter" — different problems.
  const noCoverage = !logsQ.isLoading && !logsQ.error && total === 0 && !entityName.trim();

  const columns: ColumnDef<AuditLog>[] = [
    { key: "createdAt", header: "When", render: (r) => fmtWhen(r.createdAt) },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <Badge variant={ACTION_VARIANT[String(r.action ?? "").toUpperCase()] ?? "neutral"}>
          {r.action ?? "—"}
        </Badge>
      ),
    },
    {
      key: "entityName",
      header: "Entity",
      render: (r) => <span className="font-medium text-slate-900">{r.entityName ?? "—"}</span>,
    },
    { key: "subject", header: "Subject", render: (r) => r.subject || "—" },
    {
      key: "actorUserName",
      header: "Actor",
      render: (r) => r.actorUserName || r.actorUserId || "System",
    },
    { key: "message", header: "Detail", render: (r) => r.message || "—" },
  ];

  return (
    <ListScreen
      title="Audit Log"
      subtitle="Who changed what, and when."
      isLoading={logsQ.isLoading}
      error={logsQ.error}
      unavailable={
        noCoverage
          ? {
              title: "No audit coverage yet",
              description:
                "Activity across your pharmacy will appear here once change tracking is switched on for this workspace. Nothing has been recorded yet.",
            }
          : null
      }
      notice={
        !noCoverage && total > 0 && total > rows.length ? (
          <Notice>
            Showing the {rows.length} most recent of {total.toLocaleString("en-IN")} entries.
          </Notice>
        ) : null
      }
      toolbar={
        <Input
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          placeholder="Filter by entity (e.g. Order, Item)…"
          className="w-72"
        />
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => String(r.id)}
        onRowClick={(r) => setSelected(r)}
        emptyState={
          <EmptyState title="No matching entries" description="No audit entries match that entity name." />
        }
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Audit entry">
        {selected ? (
          <div className="flex flex-col gap-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="When" value={fmtWhen(selected.createdAt)} />
              <Field label="Action" value={selected.action ?? "—"} />
              <Field label="Entity" value={selected.entityName ?? "—"} />
              <Field label="Entity UID" value={selected.entityUid ?? "—"} />
              <Field label="Actor" value={selected.actorUserName || selected.actorUserId || "System"} />
              <Field label="Source IP" value={selected.sourceIp ?? "—"} />
            </div>
            {selected.message ? <Field label="Message" value={selected.message} /> : null}
            <StatePanel label="Before" json={pretty(selected.beforeState)} />
            <StatePanel label="After" json={pretty(selected.afterState)} />
          </div>
        ) : null}
      </Drawer>
    </ListScreen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-slate-800">{value}</div>
    </div>
  );
}

function StatePanel({ label, json }: { label: string; json: string | null }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {json ? (
        <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-[11.5px] leading-relaxed text-slate-700">
          {json}
        </pre>
      ) : (
        <div className="mt-0.5 text-slate-400">Not recorded</div>
      )}
    </div>
  );
}

export default AuditLogPage;
