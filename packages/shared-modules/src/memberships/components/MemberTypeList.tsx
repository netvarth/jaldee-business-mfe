import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useAddLabeltoTypes,
  useChangeMemberTypeStatus,
  useLabelList,
  useMemberTypeCount,
  useMemberTypes,
} from "../queries/memberships";

type MemberTypeRow = {
  uid: string;
  name: string;
  subscriptionType: string;
  subscriptionAmount: number;
  labels: string[];
  status: string;
};

type LabelOption = {
  key: string;
  label: string;
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

function getStatusLabel(status: string) {
  return String(status).toUpperCase() === "ENABLED" ? "Active" : "Inactive";
}

function getSubscriptionTypeLabel(value: string) {
  return String(value).toUpperCase() === "RECURRING" ? "Renewal" : "Onetime";
}

function toRow(item: any, index: number): MemberTypeRow {
  const labelsObject = item?.labels && typeof item.labels === "object" ? item.labels : {};
  const activeLabels = Object.keys(labelsObject)
    .filter((key) => String(labelsObject[key]).toLowerCase() === "true")
    .map((key) => key.replace(/_/g, " "));

  return {
    uid: String(item.uid ?? item.id ?? index),
    name: String(item.name ?? `Subscription Type ${index + 1}`),
    subscriptionType: String(item.subscriptionType ?? "ONETIME"),
    subscriptionAmount: Number(item.subscriptionAmount ?? 0),
    labels: activeLabels,
    status: String(item.subtypeStatus ?? item.status ?? "Disabled"),
  };
}

function toLabelOptions(data: unknown): LabelOption[] {
  return unwrapList(data)
    .filter((item: any) => String(item.status ?? "").toUpperCase() === "ENABLED")
    .map((item: any, index: number) => ({
      key: String(item.label ?? item.name ?? index),
      label: String(item.displayName ?? item.label ?? item.name ?? `Label ${index + 1}`),
    }));
}

export function MemberTypeList() {
  const { basePath } = useSharedModulesContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MemberTypeRow | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, boolean>>({});
  const [labelDialogError, setLabelDialogError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedSearchQuery(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearchQuery, statusFilter, subscriptionTypeFilter, pageSize]);

  const filters = useMemo(
    () => ({
      ...(appliedSearchQuery ? { "name-like": appliedSearchQuery } : {}),
      ...(subscriptionTypeFilter !== "all" ? { "subscriptionType-eq": subscriptionTypeFilter } : {}),
      ...(statusFilter !== "all" ? { "status-eq": statusFilter } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedSearchQuery, page, pageSize, statusFilter, subscriptionTypeFilter]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedSearchQuery ? { "name-like": appliedSearchQuery } : {}),
      ...(subscriptionTypeFilter !== "all" ? { "subscriptionType-eq": subscriptionTypeFilter } : {}),
      ...(statusFilter !== "all" ? { "status-eq": statusFilter } : {}),
    }),
    [appliedSearchQuery, statusFilter, subscriptionTypeFilter]
  );

  const memberTypesQuery = useMemberTypes(filters);
  const memberTypeCountQuery = useMemberTypeCount(countFilters);
  const labelsQuery = useLabelList();
  const changeStatusMutation = useChangeMemberTypeStatus();
  const addLabelsMutation = useAddLabeltoTypes();

  const rows = useMemo(
    () => unwrapList(memberTypesQuery.data).map(toRow),
    [memberTypesQuery.data]
  );
  const total = unwrapCount(memberTypeCountQuery.data) || rows.length;
  const labelOptions = useMemo(() => toLabelOptions(labelsQuery.data), [labelsQuery.data]);

  function openLabelDialog(row: MemberTypeRow) {
    const initialSelection = labelOptions.reduce<Record<string, boolean>>((acc, option) => {
      acc[option.key] = row.labels.some((label) => label.toLowerCase() === option.label.toLowerCase());
      return acc;
    }, {});

    setSelectedType(row);
    setSelectedLabels(initialSelection);
    setLabelDialogError(null);
    setLabelDialogOpen(true);
  }

  async function handleStatusChange(uid: string, statusId: string) {
    try {
      await changeStatusMutation.mutateAsync({ uid, statusId });
      await Promise.all([memberTypesQuery.refetch(), memberTypeCountQuery.refetch()]);
    } catch {
      // no-op; keep current page stable
    }
  }

  async function handleApplyLabels() {
    if (!selectedType) return;

    try {
      setLabelDialogError(null);
      const payload = Object.entries(selectedLabels).reduce<Record<string, string>>((acc, [key, checked]) => {
        acc[key] = checked ? "true" : "false";
        return acc;
      }, {});

      await addLabelsMutation.mutateAsync({
        uid: selectedType.uid,
        data: payload,
      });

      setLabelDialogOpen(false);
      await memberTypesQuery.refetch();
    } catch (error: any) {
      setLabelDialogError(
        typeof error?.message === "string" ? error.message : "Unable to apply labels right now."
      );
    }
  }

  const columns = useMemo<ColumnDef<MemberTypeRow>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
      },
      {
        key: "subscriptionType",
        header: "Type",
        render: (row) => getSubscriptionTypeLabel(row.subscriptionType),
      },
      {
        key: "subscriptionAmount",
        header: "Fee (₹)",
        align: "right",
        render: (row) => row.subscriptionAmount.toFixed(2),
      },
      {
        key: "labels",
        header: "Label",
        render: (row) => (
          <span className="text-sm text-slate-600">{row.labels.length ? row.labels.join(", ") : "-"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <select
            aria-label={`Change status for ${row.name}`}
            value=""
            disabled={changeStatusMutation.isPending}
            className={
              `rounded-md border px-3 py-2 text-sm font-medium outline-none ${
                getStatusLabel(row.status) === "Active"
                  ? "border-emerald-500 text-emerald-700"
                  : "border-rose-500 text-rose-600"
              }`
            }
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextStatus = event.target.value;
              if (!nextStatus) return;
              void handleStatusChange(row.uid, nextStatus);
            }}
          >
            <option value="" disabled>{getStatusLabel(row.status)}</option>
            {String(row.status).toUpperCase() !== "DISABLED" ? (
              <option value="Disabled">Inactive</option>
            ) : null}
            {String(row.status).toUpperCase() !== "ENABLED" ? (
              <option value="Enabled">Active</option>
            ) : null}
          </select>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          String(row.status).toUpperCase() === "ENABLED" ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.assign(`${basePath}/memberType/update/${row.uid}`);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  openLabelDialog(row);
                }}
              >
                Apply Label
              </Button>
            </div>
          ) : null
        ),
      },
    ],
    [basePath, changeStatusMutation.isPending, labelOptions]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Types"
        subtitle="Manage subscription types, fees, renewal settings, and label assignments."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={(
          <Button onClick={() => window.location.assign(`${basePath}/memberType/create`)}>
            Create
          </Button>
        )}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                searchPlaceholder="Search by subscription type name..."
                recordCount={total}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="member-type-subscription-filter" className="text-sm text-slate-500">
                  Type
                </label>
                <select
                  id="member-type-subscription-filter"
                  value={subscriptionTypeFilter}
                  onChange={(event) => setSubscriptionTypeFilter(event.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="all">All</option>
                  <option value="ONETIME">Onetime</option>
                  <option value="RECURRING">Renewal</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="member-type-status-filter" className="text-sm text-slate-500">
                  Status
                </label>
                <select
                  id="member-type-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="all">All</option>
                  <option value="Enabled">Active</option>
                  <option value="Disabled">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={memberTypesQuery.isLoading || memberTypeCountQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/memberType/update/${row.uid}`)}
            pagination={{
              page,
              pageSize,
              total,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={(
              <EmptyState
                title="No subscription types found"
                description="Create a subscription type or adjust the current filters."
              />
            )}
          />
        </div>
      </SectionCard>

      <Dialog
        open={labelDialogOpen}
        onClose={() => setLabelDialogOpen(false)}
        title="Apply Labels"
        description={selectedType ? `Select labels for ${selectedType.name}.` : "Select labels to apply."}
        size="md"
      >
        <div className="space-y-4">
          {labelDialogError ? <Alert variant="danger">{labelDialogError}</Alert> : null}

          {labelOptions.length ? (
            <div className="grid gap-3">
              {labelOptions.map((option) => (
                <Checkbox
                  key={option.key}
                  label={option.label}
                  checked={Boolean(selectedLabels[option.key])}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedLabels((current) => ({ ...current, [option.key]: checked }));
                    setLabelDialogError(null);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active labels found"
              description="Labels will appear here when enabled labels are available."
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setLabelDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyLabels} loading={addLabelsMutation.isPending} disabled={!selectedType}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
