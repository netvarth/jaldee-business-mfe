import { useEffect, useMemo, useState } from "react";
import { Filter, ShieldCheck } from "lucide-react";
import { Button, DataTable, Drawer, EmptyState, PageHeader, type ColumnDef } from "@jaldee/design-system";
import { SchemaFilterBuilder, buildDefaultSearchClauses, compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useBookingApi } from "../../services/useBookingApi";
import { useAuditLogSearchSchema } from "../../services/useAuditLogSearchSchema";

type AuditRecord = Record<string, unknown> & { id?: string; uid?: string };

function value(record: AuditRecord, keys: string[], fallback = "-") {
  for (const key of keys) {
    const candidate = record[key];
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) return String(candidate);
  }
  return fallback;
}

function dateLabel(record: AuditRecord) {
  const raw = value(record, ["updatedAt", "createdAt", "timestamp", "eventTime"], "");
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanize(raw: string) {
  return raw
    .replace(/Auditlog$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionStyle(action: string) {
  const normalized = action.toUpperCase();
  if (normalized === "DELETE") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "CREATE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function unwrapPage(response: unknown) {
  const envelope = (response as { data?: unknown })?.data ?? response;
  const body = (envelope as { data?: unknown })?.data ?? envelope;
  const candidate = body as { content?: unknown[]; items?: unknown[]; results?: unknown[]; totalElements?: number; total?: number; page?: { totalElements?: number } };
  const rows = Array.isArray(body) ? body : candidate.content ?? candidate.items ?? candidate.results ?? [];
  const total = candidate.page?.totalElements ?? candidate.totalElements ?? candidate.total ?? rows.length;
  return { rows: rows as AuditRecord[], total: Number(total) || 0 };
}

export default function AuditLogsPage() {
  const api = useBookingApi();
  const [rows, setRows] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const { schema, loading: schemaLoading, error: schemaError } = useAuditLogSearchSchema();
  const appliedFilterCount = useMemo(() => compactSearchClauses(filters, schema).length, [filters, schema]);

  useEffect(() => {
    if (schemaLoading) return;
    let active = true;
    setLoading(true);
    setError("");

    const conditions = compactSearchClauses(filters, schema).map((filter) => ({
      field: filter.field,
      operator: filter.operator,
      values: filter.values.filter((value) => value.trim().length > 0),
    }));

    const payload = {
      ...(schema?.defaultView ? { view: schema.defaultView } : {}),
      ...(conditions.length > 0
        ? {
            filters: {
              logic: "AND",
              conditions,
            },
          }
        : {}),
      page: page - 1,
      size: pageSize,
    };

    api.post("/audit-logs/search", payload)
      .then((res) => {
        if (!active) return;
        const pageData = unwrapPage(res);
        setRows(pageData.rows);
        setTotal(pageData.total);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [api, filters, page, pageSize, schema, schemaLoading]);

  const columns = useMemo<ColumnDef<AuditRecord>[]>(() => [
    { key: "timestamp", header: "Date & Time", width: "15%", render: (record) => <span className="text-sm font-medium text-slate-700">{dateLabel(record)}</span> },
    {
      key: "activity",
      header: "Activity",
      width: "35%",
      render: (record) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900">{value(record, ["message"], humanize(value(record, ["entityName", "event", "type"], "Activity")))}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{value(record, ["subject"], "Booking record")}</div>
        </div>
      ),
    },
    { key: "actor", header: "Performed By", width: "20%", render: (record) => <div><div className="font-semibold text-slate-700">{value(record, ["actorUserName", "actorName", "actorEmail", "createdBy"], "System")}</div><div className="mt-1 text-xs text-slate-400">{humanize(value(record, ["actorUserType"], "System"))}</div></div> },
    { key: "action", header: "Change", width: "15%", render: (record) => { const action = value(record, ["action"], "UNKNOWN"); return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${actionStyle(action)}`}>{humanize(action)}</span>; } },
  ], []);

  return (
    <div className="flex h-full flex-col p-4 md:p-6 gap-4">
      <PageHeader
        title="Audit Log"
        subtitle="Track all operational changes and activities across Bookings."
        icon={<ShieldCheck size={28} className="text-slate-700" />}
        actions={
          <Button
            variant={appliedFilterCount > 0 ? "primary" : "outline"}
            className="flex items-center gap-2"
            onClick={() => {
              setDraftFilters(filters.length > 0 ? filters : buildDefaultSearchClauses(schema));
              setFiltersOpen(true);
            }}
          >
            <Filter size={16} />
            <span>Filters</span>
            {appliedFilterCount > 0 ? (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-indigo-600">
                {appliedFilterCount}
              </span>
            ) : null}
          </Button>
        }
      />

      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {error || schemaError ? (
          <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || schemaError}</div>
        ) : null}
        
        <DataTable
          data={rows}
          columns={columns}
          loading={loading || schemaLoading}
          getRowId={(record, index) => value(record, ["id", "uid", "eventUuid"], String(index))}
          pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }}
          emptyState={
            <EmptyState
              title="No audit records"
              description="No audit activity matches the current filters."
            />
          }
        />
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter Audit Logs"
        size="md"
        contentClassName="flex flex-col p-0"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {schemaLoading && !schema ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Loading filter schema...
              </div>
            ) : schema ? (
              <SchemaFilterBuilder
                schema={schema}
                value={draftFilters}
                onChange={setDraftFilters}
                appliedCount={appliedFilterCount}
                onClearAll={() => setDraftFilters(buildDefaultSearchClauses(schema))}
                emptyStateMessage="No audit-log filters are available from the schema."
              />
            ) : (
              <EmptyState
                title="No filters available"
                description={schemaError || "Audit log filters are not available right now."}
              />
            )}
          </div>
          <div className="flex gap-3 border-t border-slate-200 p-4 sm:p-5">
            <Button
              variant="outline"
              className="flex-1"
              disabled={schemaLoading || !schema}
              onClick={() => {
                if (!schema) return;
                const reset = buildDefaultSearchClauses(schema);
                setDraftFilters(reset);
                setFilters(reset);
                setPage(1);
                setFiltersOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              className="flex-1"
              disabled={schemaLoading || !schema}
              onClick={() => {
                setFilters(draftFilters);
                setPage(1);
                setFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
