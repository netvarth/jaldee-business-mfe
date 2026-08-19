import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  Drawer,
  Icon,
  Input,
  SectionCard,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, FinanceFilterButton } from "../../components/FinancePageLayout";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { buildFinanceSearchBody, useHsnSearchSchema } from "../../lib/financeSearch";

type HsnRow = {
  id: string;
  code: string;
  description: string;
  createdBy: string;
  status: string;
  active: boolean;
  raw: any;
};

function extractRecords(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function mapHsnRows(payload: any): HsnRow[] {
  return extractRecords(payload).map((item: any, index: number) => {
    const status = String(item?.status ?? item?.statusValue ?? (item?.active === false ? "Disabled" : "Enabled"));
    return {
      id: String(item?.uid ?? item?.id ?? item?.hsnId ?? item?.code ?? item?.hsnCode ?? item?.hsncode ?? `hsn-${index}`),
      code: String(item?.hsncode ?? item?.hsnCode ?? item?.code ?? item?.name ?? "").trim(),
      description: String(item?.description ?? item?.desc ?? item?.hsnDescription ?? "").trim(),
      createdBy: String(item?.createdByName ?? item?.createdBy ?? item?.ownerName ?? "-").trim() || "-",
      status,
      active: !["disabled", "inactive"].includes(status.toLowerCase()),
      raw: item,
    };
  });
}

function readHsnId(row: HsnRow) {
  return String(row.raw?.uid ?? row.raw?.id ?? row.raw?.hsnId ?? row.id).trim();
}

export function HsnCodesPage() {
  const [rows, setRows] = useState<HsnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<HsnRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hsnCode, setHsnCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const { schema } = useHsnSearchSchema();

  async function loadHsnCodes() {
    setLoading(true);
    try {
      const response = await financeApi.hsn.list<any>(buildFinanceSearchBody(advancedFilters, schema, 0, 200));
      setRows(mapHsnRows(response.data));
    } catch (error) {
      console.error("[mfe-finance] Failed to load HSN codes", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHsnCodes();
  }, [advancedFilters, schema]);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, schema).length,
    [advancedFilters, schema]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter((row) =>
      `${row.code} ${row.description} ${row.createdBy} ${row.status}`.toLowerCase().includes(normalizedQuery)
    );
  }, [rows, query]);

  function openFilters() {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(schema)
    );
    setFiltersOpen(true);
  }

  function clearFilters() {
    const reset = buildDefaultSearchClauses(schema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
  }

  function resetFilters() {
    clearFilters();
    setFiltersOpen(false);
  }

  function applyFilters() {
    setAdvancedFilters(draftFilters);
    setFiltersOpen(false);
  }

  function openCreateDialog() {
    setEditingRow(null);
    setHsnCode("");
    setDescription("");
    setDialogError("");
    setDialogOpen(true);
  }

  function openEditDialog(row: HsnRow) {
    setEditingRow(row);
    setHsnCode(row.code);
    setDescription(row.description);
    setDialogError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) {
      return;
    }
    setDialogOpen(false);
    setEditingRow(null);
    setHsnCode("");
    setDescription("");
    setDialogError("");
  }

  async function handleSave() {
    const trimmedCode = hsnCode.trim();
    if (!trimmedCode) {
      setDialogError("HSN code is required.");
      return;
    }

    setSaving(true);
    setDialogError("");
    try {
      const payload = sanitizeFinancePayload({
        uid: editingRow ? readHsnId(editingRow) : undefined,
        tenantUid: String(editingRow?.raw?.tenantUid ?? "").trim() || undefined,
        hsncode: trimmedCode,
        description: description.trim(),
        status: String(editingRow?.status ?? "Enabled"),
      });

      if (editingRow) {
        await financeApi.hsn.update(readHsnId(editingRow), payload);
      } else {
        await financeApi.hsn.create(payload);
      }

      closeDialog();
      await loadHsnCodes();
    } catch (error) {
      console.error("[mfe-finance] Failed to save HSN code", error);
      setDialogError(error instanceof Error ? error.message : "Could not save HSN code.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle(row: HsnRow, checked: boolean) {
    setUpdatingStatusId(row.id);
    try {
      const rowUid = readHsnId(row);
      await financeApi.hsn.update(
        rowUid,
        sanitizeFinancePayload({
          uid: rowUid,
          tenantUid: String(row.raw?.tenantUid ?? "").trim() || undefined,
          hsncode: row.code,
          description: row.description,
          status: checked ? "Enabled" : "Disabled",
        }),
      );
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, active: checked, status: checked ? "Enabled" : "Disabled" }
            : item,
        ),
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to update HSN status", error);
    } finally {
      setUpdatingStatusId("");
    }
  }

  const columns = useMemo<ColumnDef<HsnRow>[]>(
    () => [
      {
        key: "code",
        header: "HSN Code",
        render: (row) => <div className="font-semibold text-slate-900">{row.code || "-"}</div>,
      },
      {
        key: "description",
        header: "Description",
        render: (row) => <div className="text-slate-600">{row.description || "-"}</div>,
      },
      {
        key: "createdBy",
        header: "Created By",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Badge variant={row.active ? "success" : "neutral"}>{row.active ? "Enabled" : "Disabled"}</Badge>
            <Switch
              checked={row.active}
              disabled={updatingStatusId === row.id}
              onChange={(checked) => void handleStatusToggle(row, checked)}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(row)}>
            Edit
          </Button>
        ),
      },
    ],
    [updatingStatusId],
  );

  return (
    <>
      <FinanceFeatureLayout
        title="HSN Codes"
        subtitle="Manage HSN codes used across finance item and tax workflows."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={openCreateDialog}>Create HSN</Button>
            <FinanceFilterButton
              testId="finance-hsn-filter"
              label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
              active={appliedFilterCount > 0}
              onClick={openFilters}
            />
          </div>
        }
        main={
          <SectionCard className="border-slate-200 shadow-sm" padding={false}>
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">HSN Code List</div>
                  <div className="mt-1 text-sm text-slate-500">Create, edit, and manage HSN status.</div>
                </div>
                <div className="relative w-full md:max-w-[320px]">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search HSN"
                    containerClassName="mb-0"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="search" className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <DataTableCard
              bare
              title=""
              subtitle=""
              data={filteredRows}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loading}
              emptyTitle="No HSN codes found"
              emptyDescription="HSN codes will appear here once they are created."
            />
          </SectionCard>
        }
      />
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-hsn-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No HSN filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={resetFilters}>
              Reset All
            </Button>
            <Button type="button" variant="primary" className="flex-1" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingRow ? "Edit HSN" : "Create HSN"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="HSN Code *"
            value={hsnCode}
            onChange={(event) => setHsnCode(event.target.value)}
            placeholder="9983"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Consultation services"
          />
          {dialogError ? <div className="text-sm text-rose-600">{dialogError}</div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !hsnCode.trim()}>
              {saving ? "Saving..." : editingRow ? "Update HSN" : "Create HSN"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
