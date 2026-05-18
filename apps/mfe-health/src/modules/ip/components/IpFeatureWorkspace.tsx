import { Button, DataTable, EmptyState, Input, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";

type WorkspaceStatus = "Live" | "Ready" | "Mapped";

type WorkspaceRow = {
  id: string;
  name: string;
  summary: string;
  status: WorkspaceStatus;
  href?: string;
};

function getStatusClasses(status: WorkspaceStatus) {
  if (status === "Live") {
    return "bg-teal-50 text-teal-700 ring-teal-200";
  }

  if (status === "Ready") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function IpFeatureWorkspace({
  title,
  subtitle,
  primaryAction,
  primaryHref,
  searchPlaceholder,
  filterLabel,
  emptyTitle,
  emptyDescription,
  featureLabel,
  backHref,
  rows,
}: {
  title: string;
  subtitle: string;
  primaryAction: string;
  primaryHref?: string;
  searchPlaceholder: string;
  filterLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  featureLabel: string;
  backHref?: string;
  rows: WorkspaceRow[];
}) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | WorkspaceStatus>("all");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.id.toLowerCase().includes(normalizedSearch) ||
        row.name.toLowerCase().includes(normalizedSearch) ||
        row.summary.toLowerCase().includes(normalizedSearch);

      const matchesScope = scope === "all" ? true : row.status === scope;
      return matchesSearch && matchesScope;
    });
  }, [rows, scope, search]);

  const summaryCounts = useMemo(
    () => ({
      total: rows.length,
      live: rows.filter((row) => row.status === "Live").length,
      ready: rows.filter((row) => row.status === "Ready").length,
      mapped: rows.filter((row) => row.status === "Mapped").length,
    }),
    [rows]
  );

  const columns = useMemo<ColumnDef<WorkspaceRow>[]>(
    () => [
      { key: "id", header: "Route" },
      { key: "name", header: featureLabel },
      { key: "summary", header: "Purpose" },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(row.status)}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) =>
          row.href ? (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={() => navigate(row.href!)}>
                Open
              </Button>
            </div>
          ) : null,
      },
    ],
    [featureLabel]
  );

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(backHref || `${basePath}/dashboard`)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <span aria-hidden="true">&larr;</span>
              <span>Back</span>
            </button>
            <div>
              <div className="text-xl font-semibold text-slate-900">{title}</div>
              <div className="text-sm text-slate-500">{subtitle}</div>
            </div>
          </div>
          <Button type="button" variant="primary" onClick={() => navigate(primaryHref || basePath)}>
            {primaryAction}
          </Button>
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Routes</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summaryCounts.total}</div>
        </SectionCard>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Live</div>
          <div className="mt-2 text-2xl font-semibold text-teal-700">{summaryCounts.live}</div>
        </SectionCard>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ready</div>
          <div className="mt-2 text-2xl font-semibold text-sky-700">{summaryCounts.ready}</div>
        </SectionCard>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Mapped</div>
          <div className="mt-2 text-2xl font-semibold text-amber-700">{summaryCounts.mapped}</div>
        </SectionCard>
      </div>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-lg font-semibold text-slate-900">
              {title} Routes {filteredRows.length ? <span className="text-slate-500">({filteredRows.length})</span> : null}
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr),200px] lg:max-w-[500px]">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
              <Select
                value={scope}
                onChange={(event) => setScope(event.target.value as "all" | WorkspaceStatus)}
                options={[
                  { value: "all", label: `All ${filterLabel}` },
                  { value: "Live", label: `Live ${filterLabel}` },
                  { value: "Ready", label: `Ready ${filterLabel}` },
                  { value: "Mapped", label: `Mapped ${filterLabel}` },
                ]}
              />
            </div>
          </div>

          <DataTable
            data={filteredRows}
            columns={columns}
            className="rounded-xl border-slate-200 shadow-none"
            tableClassName="[&_table]:table-fixed [&_thead_th]:bg-slate-50 [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:whitespace-normal [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:align-top [&_tbody_td]:whitespace-normal [&_tbody_td]:break-words"
            emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

