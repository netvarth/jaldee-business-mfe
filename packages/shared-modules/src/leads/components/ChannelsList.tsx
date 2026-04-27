import { Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard, Switch } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useChangeChannelStatus, useChannels, useChannelsCount } from "../queries/leads";
import { CHANNEL_TYPE_OPTIONS, unwrapCount, unwrapList } from "../utils";

type ChannelRow = {
  uid: string;
  name: string;
  encId: string;
  channelType: string;
  product: string;
  locations: string;
  status: string;
};

function toRows(data: unknown): ChannelRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    name: String(item.name ?? `Channel ${index + 1}`),
    encId: String(item.encId ?? item.channelEncId ?? item.channelId ?? item.uid ?? "-"),
    channelType: String(item.channelType ?? ""),
    product: String(item.crmLeadProductTypeDto?.typeName ?? "-"),
    locations: Array.isArray(item.locationDtos) && item.locationDtos.length > 0
      ? item.locationDtos.map((location: any) => location.place ?? location.name ?? "-").join(", ")
      : "-",
    status: String(item.crmStatus ?? item.status ?? "INACTIVE"),
  }));
}

function getChannelTypeLabel(value: string) {
  return CHANNEL_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function ChannelsList() {
  const { basePath } = useSharedModulesContext();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadChannels",
    resetDeps: [appliedQuery],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({
      ...(appliedQuery ? { "name-like": appliedQuery } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, page, pageSize]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "name-like": appliedQuery } : {}),
    }),
    [appliedQuery]
  );

  const itemsQuery = useChannels(filters);
  const countQuery = useChannelsCount(countFilters);
  const changeStatusMutation = useChangeChannelStatus();
  const rows = useMemo(() => toRows(itemsQuery.data), [itemsQuery.data]);
  const total = unwrapCount(countQuery.data) || rows.length;

  async function handleStatusToggle(row: ChannelRow, checked: boolean) {
    try {
      await changeStatusMutation.mutateAsync({
        uid: row.uid,
        status: checked ? "ACTIVE" : "INACTIVE",
      });
      await Promise.all([itemsQuery.refetch(), countQuery.refetch()]);
    } catch {
      // no-op
    }
  }

  const columns = useMemo<ColumnDef<ChannelRow>[]>(
    () => [
      {
        key: "name",
        header: "Channel Name & EncId",
        render: (row) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-sm text-slate-700">{row.encId}</div>
          </div>
        ),
      },
      { key: "channelType", header: "Channel Type", render: (row) => getChannelTypeLabel(row.channelType) },
      { key: "product", header: "Product / Service" },
      { key: "locations", header: "Locations" },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={String(row.status).toUpperCase() === "ACTIVE"}
              onChange={(checked) => void handleStatusToggle(row, checked)}
              disabled={changeStatusMutation.isPending}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/channels/details/${row.uid}`);
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/channels/update/${row.uid}`);
              }}
            >
              Update
            </Button>
          </div>
        ),
      },
    ],
    [basePath, changeStatusMutation.isPending]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels"
        subtitle="Configure capture channels, linked products, and location mapping."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={<Button onClick={() => window.location.assign(`${basePath}/channels/create`)}>Create</Button>}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search with Channel" recordCount={total} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-[38px] w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-[#4C1D95] shadow-sm"
                aria-label="Filters"
                title="Filters"
              >
                <FilterIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={itemsQuery.isLoading || countQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/channels/details/${row.uid}`)}
            pagination={{ page, pageSize, total, onChange: setPage, onPageSizeChange: setPageSize, mode: "server" }}
            emptyState={<EmptyState title="No channels found" description="Create a channel to generate lead capture links." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18l-7 8v5.5a1 1 0 0 1-1.5.86l-2-1.15a1 1 0 0 1-.5-.86V13L3 5z" />
    </svg>
  );
}
