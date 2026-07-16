import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Package, Plus, X, AlertCircle, Loader2, History, Undo2, UserPlus, Pencil, Trash2, Eye, MoreVertical, LayoutGrid, Rows3 } from "lucide-react";
import { Badge, Button, DataTable, DataTableToolbar, Dialog, DialogFooter, Drawer, EmptyState, FileUpload, Input, PageHeader, Popover, PopoverSection, SectionCard, Select, Textarea, cn, type ColumnDef } from "@jaldee/design-system";
import { useAssets, type Asset, type AssetAllocation, type AssetAttachment, type AssetStatus } from "../../services/useAssets";
import { useEmployees } from "../../services/useEmployees";
import { useShellErrorToast } from "../../services/useShellFeedback";
import { useDepartments } from "../../services/useSettingsData";

/**
 * W9 / R9.1 - asset register: create/edit assets, allocate to an employee
 * (only when Available - double allocation is impossible), return/write-off,
 * and per-asset history. Unreturned assets block exit completion (R6.2).
 */

const TEAL = "var(--primary-color)";
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const ASSET_TYPES = ["Laptop", "Desktop", "Monitor", "Phone", "SIM", "ID Card", "Access Card", "Vehicle", "Furniture", "Other"];
const RETURN_STATUS_OPTIONS: AssetStatus[] = ["Available", "UnderRepair", "Lost", "Retired"];
const EMPTY_FORM = { assetType: "Laptop", name: "", tagNumber: "", serialNumber: "", assetValue: "", ownerDepartment: "", accountsRef: "", notes: "" };
type ViewMode = "table" | "cards";

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function getStatusBadgeVariant(status?: string) {
  if (status === "Available") return "success";
  if (status === "Allocated") return "info";
  if (status === "UnderRepair") return "warning";
  if (status === "Lost") return "danger";
  return "neutral";
}

function resolveAssetAttachmentUrl(attachment: AssetAttachment) {
  return attachment.filePath || attachment.shortUrl || null;
}

function openAssetAttachment(attachment: AssetAttachment) {
  const href = resolveAssetAttachmentUrl(attachment);
  if (!href || typeof window === "undefined") return;
  window.open(href, "_blank", "noopener,noreferrer");
}

function openPendingFile(file: File) {
  if (typeof window === "undefined") return;
  const href = URL.createObjectURL(file);
  window.open(href, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export default function Assets() {
  const assets = useAssets();
  const { data: employees } = useEmployees();
  const departments = useDepartments();
  useShellErrorToast("hr.assets", "Assets", assets.error);

  const [filter, setFilter] = useState<"all" | AssetStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [draftTypeFilter, setDraftTypeFilter] = useState("all");
  const [draftDepartmentFilter, setDraftDepartmentFilter] = useState("all");
  const [draftFilter, setDraftFilter] = useState<"all" | AssetStatus>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [allocFor, setAllocFor] = useState<Asset | null>(null);
  const [allocEmp, setAllocEmp] = useState("");
  const [allocCond, setAllocCond] = useState("");
  const [returnFor, setReturnFor] = useState<Asset | null>(null);
  const [returnStatus, setReturnStatus] = useState<AssetStatus>("Available");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnFiles, setReturnFiles] = useState<File[]>([]);

  const [histFor, setHistFor] = useState<Asset | null>(null);
  const [hist, setHist] = useState<AssetAllocation[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [viewFor, setViewFor] = useState<Asset | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  const rows = useMemo(() => assets.data.filter((asset) => {
    if (filter !== "all" && asset.status !== filter) return false;
    if (typeFilter !== "all" && (asset.assetType || "Other") !== typeFilter) return false;
    if (departmentFilter !== "all" && (asset.ownerDepartment || "") !== departmentFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || [asset.name, asset.assetType, asset.tagNumber, asset.serialNumber, asset.holderEmployeeName]
      .some((value) => (value || "").toLowerCase().includes(q));
  }), [assets.data, departmentFilter, filter, search, typeFilter]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    assets.data.forEach((asset) => { next[asset.status || "?"] = (next[asset.status || "?"] || 0) + 1; });
    return next;
  }, [assets.data]);
  const appliedFilterCount = [typeFilter !== "all", departmentFilter !== "all"].filter(Boolean).length;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (error) { setMsg(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setMsg(null);
    setFormOpen(true);
  };

  const openFilters = () => {
    setDraftFilter(filter);
    setDraftTypeFilter(typeFilter);
    setDraftDepartmentFilter(departmentFilter);
    setFiltersOpen(true);
  };

  const resetFilters = () => {
    setDraftFilter("all");
    setDraftTypeFilter("all");
    setDraftDepartmentFilter("all");
    setFilter("all");
    setTypeFilter("all");
    setDepartmentFilter("all");
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setFilter(draftFilter);
    setTypeFilter(draftTypeFilter);
    setDepartmentFilter(draftDepartmentFilter);
    setFiltersOpen(false);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      assetType: asset.assetType || "Other",
      name: asset.name || "",
      tagNumber: asset.tagNumber || "",
      serialNumber: asset.serialNumber || "",
      assetValue: asset.assetValue != null ? String(asset.assetValue) : "",
      ownerDepartment: asset.ownerDepartment || "",
      accountsRef: asset.accountsRef || "",
      notes: asset.notes || "",
    });
    setMsg(null);
    setFormOpen(true);
  };

  const saveForm = () => act(async () => {
    if (!form.name.trim()) throw new Error("Asset name is required.");
    const payload = {
      assetType: form.assetType,
      name: form.name.trim(),
      tagNumber: form.tagNumber || null,
      serialNumber: form.serialNumber || null,
      assetValue: form.assetValue ? Number(form.assetValue) : null,
      ownerDepartment: form.ownerDepartment || null,
      accountsRef: form.accountsRef || null,
      notes: form.notes || null,
    };
    if (editing) await assets.update(editing.id, payload);
    else await assets.create(payload);
    setFormOpen(false);
  });

  const openHistory = async (asset: Asset) => {
    setHistFor(asset);
    setHist([]);
    setHistLoading(true);
    try { setHist(await assets.history(asset.id)); } catch { setHist([]); }
    finally { setHistLoading(false); }
  };

  const openView = async (asset: Asset) => {
    setViewFor(asset);
    setViewLoading(true);
    try { setViewFor(await assets.getOne(asset.id)); } catch { setViewFor(asset); }
    finally { setViewLoading(false); }
  };

  const openReturn = async (asset: Asset) => {
    setMsg(null);
    setReturnStatus("Available");
    setReturnRemarks("");
    setReturnFiles([]);
    try {
      const full = await assets.getOne(asset.id);
      setReturnFor(full);
      setReturnStatus(full.status === "Allocated" ? "Available" : (full.status || "Available"));
      setReturnRemarks(full.remarks || "");
    } catch {
      setReturnFor(asset);
    }
  };

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      key: "name",
      header: "Asset",
      width: "24%",
      render: (asset) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-[var(--color-text-primary)]">{asset.name || "-"}</div>
          <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
            {asset.assetType || "Other"}{asset.assetValue != null ? ` | Rs${asset.assetValue}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "tagNumber",
      header: "Tag / Serial",
      width: "18%",
      render: (asset) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--color-text-primary)]">{asset.tagNumber || "-"}</div>
          <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{asset.serialNumber || "-"}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "12%",
      render: (asset) => <Badge variant={getStatusBadgeVariant(asset.status)}>{asset.status || "-"}</Badge>,
    },
    {
      key: "holder",
      header: "Holder",
      width: "18%",
      render: (asset) => (
        asset.holderEmployeeName ? (
          <div className="min-w-0">
            <div className="truncate font-medium text-[var(--color-text-primary)]">{asset.holderEmployeeName}</div>
            <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">Since {asset.issuedOn || "-"}</div>
          </div>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">-</span>
        )
      ),
    },
    {
      key: "ownerDepartment",
      header: "Dept / Accounts Ref",
      width: "18%",
      render: (asset) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--color-text-primary)]">{asset.ownerDepartment || "-"}</div>
          <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{asset.accountsRef || "-"}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "10%",
      align: "right",
      render: (asset) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          {asset.status === "Available" && (
            <Button
              variant="outline"
              size="sm"
              title="Allocate"
              data-testid={`hr-assets-allocate-${asset.id}`}
              onClick={() => { setAllocFor(asset); setAllocEmp(""); setAllocCond(""); setMsg(null); }}
              className="gap-2"
            >
              <UserPlus size={15} />
              <span>Allocate</span>
            </Button>
          )}
          <AssetActions
            asset={asset}
            busy={busy}
            onReturn={() => void openReturn(asset)}
            onView={() => void openView(asset)}
            onHistory={() => void openHistory(asset)}
            onEdit={() => openEdit(asset)}
            onDelete={() => { if (confirm("Delete this asset?")) void act(() => assets.remove(asset.id)); }}
          />
        </div>
      ),
    },
  ], [assets, busy]);

  return (
    <section className="page-section active hr-page-shell">
      <PageHeader
        title="Assets"
        subtitle="Registry, allocation & returns - coordinated with Accounts"
        actions={<Button onClick={openAdd} icon={<Plus size={16} />}>Register Asset</Button>}
      />

      {(assets.error || msg) && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 14, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {msg || assets.error}
        </div>
      )}

      <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false} data-testid="hr-assets-section">
        <div className="border-b border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-[420px]">
              <DataTableToolbar
                query={search}
                onQueryChange={setSearch}
                searchPlaceholder="Search name, tag, serial, holder..."
              />
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { value: "all", label: `All (${assets.data.length})` },
                  { value: "Available", label: `Available (${counts.Available || 0})` },
                  { value: "Allocated", label: `Allocated (${counts.Allocated || 0})` },
                  { value: "UnderRepair", label: `UnderRepair (${counts.UnderRepair || 0})` },
                  { value: "Lost", label: `Lost (${counts.Lost || 0})` },
                  { value: "Retired", label: `Retired (${counts.Retired || 0})` },
                ] as Array<{ value: "all" | AssetStatus; label: string }>).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    id={`hr-assets-status-tab-${option.value}`}
                    data-testid={`hr-assets-status-tab-${option.value}`}
                    onClick={() => {
                      setFilter(option.value);
                      setDraftFilter(option.value);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                      filter === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                id="hr-assets-filter-indicator"
                data-testid="hr-assets-filter-indicator"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
                  appliedFilterCount > 0
                    ? ""
                    : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
                )}
                aria-label="Open asset filters"
                onClick={openFilters}
              >
                <FilterIcon />
                <span>Filter</span>
                {appliedFilterCount > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--color-primary)]">
                    {appliedFilterCount}
                  </span>
                ) : null}
              </Button>
              <AssetsViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
        {assets.loading && rows.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--light-text)" }}><Loader2 size={20} className="animate-spin" style={{ display: "inline" }} /></div>
        ) : viewMode === "table" ? (
          <DataTable
            data-testid="hr-assets-table"
            data={rows}
            columns={columns}
            getRowId={(asset) => asset.id}
            loading={assets.loading}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="min-w-[980px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
            emptyState={
              <EmptyState
                icon={<Package size={36} strokeWidth={1.5} />}
                title={filter !== "all" ? `No ${filter} assets` : "No assets registered"}
                description="Assets matching the current search and filter will appear here."
              />
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Package size={36} strokeWidth={1.5} />}
            title={filter !== "all" ? `No ${filter} assets` : "No assets registered"}
            description="Assets matching the current search and filter will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((asset) => (
              <article
                key={asset.id}
                data-testid={`hr-assets-card-${asset.id}`}
                className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_70%,white)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[var(--color-text-primary)]">{asset.name || "-"}</div>
                    <div className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                      {asset.assetType || "Other"}{asset.assetValue != null ? ` | Rs${asset.assetValue}` : ""}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant={getStatusBadgeVariant(asset.status)}>{asset.status || "-"}</Badge>
                    <AssetActions
                      asset={asset}
                      busy={busy}
                      onReturn={() => void openReturn(asset)}
                      onView={() => void openView(asset)}
                      onHistory={() => void openHistory(asset)}
                      onEdit={() => openEdit(asset)}
                      onDelete={() => { if (confirm("Delete this asset?")) void act(() => assets.remove(asset.id)); }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <CardDetail label="Tag Number" value={asset.tagNumber} />
                  <CardDetail label="Serial Number" value={asset.serialNumber} />
                  <CardDetail label="Holder" value={asset.holderEmployeeName} subValue={asset.holderEmployeeName ? `Since ${asset.issuedOn || "-"}` : undefined} />
                  <CardDetail label="Department" value={asset.ownerDepartment} />
                  <CardDetail label="Accounts Ref" value={asset.accountsRef} />
                </div>
                {asset.status === "Available" ? (
                  <div className="mt-5 border-t border-[color:color-mix(in_srgb,var(--color-border)_65%,white)] pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      title="Allocate"
                      data-testid={`hr-assets-allocate-${asset.id}`}
                      onClick={() => { setAllocFor(asset); setAllocEmp(""); setAllocCond(""); setMsg(null); }}
                      className="gap-2"
                    >
                      <UserPlus size={15} />
                      <span>Allocate</span>
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Asset Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-assets-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Select
              id="hr-assets-type-filter"
              testId="hr-assets-type-filter"
              label="Asset Type"
              value={draftTypeFilter}
              onChange={(event) => setDraftTypeFilter(event.target.value)}
              options={[
                { value: "all", label: "All Asset Types" },
                ...ASSET_TYPES.map((type) => ({ value: type, label: type })),
              ]}
            />
            <Select
              id="hr-assets-department-filter"
              testId="hr-assets-department-filter"
              label="Owner Department"
              value={draftDepartmentFilter}
              onChange={(event) => setDraftDepartmentFilter(event.target.value)}
              options={[
                { value: "all", label: "All Departments" },
                ...departments.data.map((department) => ({
                  value: department.name || department.id,
                  label: department.name || department.id,
                })),
              ]}
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="hr-assets-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="hr-assets-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>

      {viewFor && (
        <Dialog open={!!viewFor} onClose={() => setViewFor(null)} testId="hr-assets-view-modal" hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[640px] p-0 overflow-hidden">
          <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 24px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Asset Details</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{viewFor.name || "Asset"}</p></div>
            <button id="hr-assets-view-close" data-testid="hr-assets-view-close" onClick={() => setViewFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 24 }}>
            {viewLoading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--light-text)" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail label="Type" value={viewFor.assetType} />
                <Detail label="Status" value={viewFor.status} />
                <Detail label="Tag Number" value={viewFor.tagNumber} />
                <Detail label="Serial Number" value={viewFor.serialNumber} />
                <Detail label="Value" value={viewFor.assetValue != null ? `Rs${viewFor.assetValue}` : "-"} />
                <Detail label="Owner Department" value={viewFor.ownerDepartment} />
                <Detail label="Accounts Ref" value={viewFor.accountsRef} />
                <Detail label="Holder" value={viewFor.holderEmployeeName} />
                <Detail label="Remarks" value={viewFor.remarks} />
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={viewFor.notes} />
                </div>
                <div className="sm:col-span-2">
                  <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                    <div style={{ ...lbl, marginBottom: 10 }}>Attachments</div>
                    {!viewFor.attachment?.length ? (
                      <div style={{ fontSize: 13, color: "var(--light-text)" }}>No attachments.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {viewFor.attachment.map((attachment, index) => (
                          <div key={`${attachment.fileUid || attachment.driveId || attachment.fileName || index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{attachment.fileName || `Attachment ${index + 1}`}</div>
                              <div style={{ fontSize: 12, color: "var(--light-text)" }}>{attachment.fileType || "Unknown type"}</div>
                            </div>
                            <Button type="button" variant="outline" size="sm" disabled={!resolveAssetAttachmentUrl(attachment)} onClick={() => openAssetAttachment(attachment)}>
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {formOpen && (
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} testId="hr-assets-form-modal" hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[720px] p-0 overflow-visible">
          <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 24px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", color: TEAL, margin: 0 }}>{editing ? "Edit Asset" : "Register Asset"}</h3>
              <p style={{ fontSize: 13, fontWeight: 600, color: TEAL, opacity: 0.8, margin: "4px 0 0" }}>Capture registry, ownership, and accounts details.</p>
            </div>
            <button id="hr-assets-form-close" data-testid="hr-assets-form-close" onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 24 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="hr-assets-type" testId="hr-assets-type" label="Type" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })} options={ASSET_TYPES.map((t) => ({ value: t, label: t }))} />
            <Input id="hr-assets-name" data-testid="hr-assets-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. MacBook Pro 14" />
            <Input id="hr-assets-tag-number" data-testid="hr-assets-tag-number" label="Tag Number" value={form.tagNumber} onChange={(e) => setForm({ ...form, tagNumber: e.target.value })} />
            <Input id="hr-assets-serial-number" data-testid="hr-assets-serial-number" label="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            <Input id="hr-assets-value" data-testid="hr-assets-value" label="Value" type="number" value={form.assetValue} onChange={(e) => setForm({ ...form, assetValue: e.target.value })} />
            <Select
              id="hr-assets-owner-department"
              testId="hr-assets-owner-department"
              label="Owner Department"
              value={form.ownerDepartment}
              onChange={(e) => setForm({ ...form, ownerDepartment: e.target.value })}
              options={[
                { value: "", label: departments.loading ? "Loading departments..." : "Select department" },
                ...departments.data.map((department) => ({
                  value: department.name || department.id,
                  label: department.name || department.id,
                })),
              ]}
            />
            <Input id="hr-assets-accounts-ref" data-testid="hr-assets-accounts-ref" label="Accounts Ref" value={form.accountsRef} onChange={(e) => setForm({ ...form, accountsRef: e.target.value })} placeholder="External asset ID" />
            <div className="sm:col-span-2">
              <Textarea id="hr-assets-notes" data-testid="hr-assets-notes" label="Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {msg && <div className="sm:col-span-2" style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
          </div>
          <div style={{ padding: "0 24px 20px" }}>
            <DialogFooter>
              <Button id="hr-assets-form-cancel" data-testid="hr-assets-form-cancel" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button id="hr-assets-form-save" data-testid="hr-assets-form-save" onClick={saveForm} disabled={busy} loading={busy}>{editing ? "Save" : "Register"}</Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {allocFor && (
        <Dialog open={!!allocFor} onClose={() => setAllocFor(null)} testId="hr-assets-allocate-modal" hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[480px] p-0 overflow-hidden">
          <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 24px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Allocate Asset</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{allocFor.name}</p></div>
            <button id="hr-assets-allocate-close" data-testid="hr-assets-allocate-close" onClick={() => setAllocFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <Select id="hr-assets-allocate-employee" testId="hr-assets-allocate-employee" label="Employee" value={allocEmp} onChange={(e) => setAllocEmp(e.target.value)} options={[{ value: "", label: "Select employee" }, ...employees.map((employee) => ({ value: employee.id, label: employee.name }))]} />
            <Input id="hr-assets-allocate-condition" data-testid="hr-assets-allocate-condition" label="Condition at Issue" value={allocCond} onChange={(e) => setAllocCond(e.target.value)} placeholder="e.g. New, minor scratches..." />
            {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
          </div>
          <div style={{ padding: "0 24px 20px" }}>
            <DialogFooter>
              <Button id="hr-assets-allocate-cancel" data-testid="hr-assets-allocate-cancel" variant="secondary" onClick={() => setAllocFor(null)}>Cancel</Button>
              <Button id="hr-assets-allocate-save" data-testid="hr-assets-allocate-save" disabled={busy || !allocEmp} loading={busy} onClick={() => act(async () => { await assets.allocate(allocFor.id, allocEmp, allocCond); setAllocFor(null); })}>Allocate</Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {returnFor && (
        <Dialog open={!!returnFor} onClose={() => setReturnFor(null)} testId="hr-assets-return-modal" hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[480px] p-0 overflow-hidden">
          <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 24px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Update Asset Status</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{returnFor.name}</p></div>
            <button id="hr-assets-return-close" data-testid="hr-assets-return-close" onClick={() => setReturnFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <Select
              id="hr-assets-return-status"
              testId="hr-assets-return-status"
              label="Next Status"
              value={returnStatus}
              onChange={(e) => setReturnStatus(e.target.value as AssetStatus)}
              options={RETURN_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
            />
            <Textarea
              id="hr-assets-return-remarks"
              data-testid="hr-assets-return-remarks"
              label="Remarks"
              rows={3}
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              placeholder="Add return notes, repair details, or write-off reason"
            />
            <FileUpload
              label="Attachments"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onUpload={setReturnFiles}
            />
            {returnFor.attachment?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={lbl}>Uploaded Files</div>
                {returnFor.attachment.map((attachment, index) => (
                  <div key={`${attachment.fileUid || attachment.driveId || attachment.fileName || index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{attachment.fileName || `Attachment ${index + 1}`}</div>
                      <div style={{ fontSize: 12, color: "var(--light-text)" }}>{attachment.fileType || "Unknown type"}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={!resolveAssetAttachmentUrl(attachment)} onClick={() => openAssetAttachment(attachment)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {returnFiles.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={lbl}>Selected Files</div>
                {returnFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: "var(--light-text)" }}>{Math.round(file.size / 1024)} KB</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => openPendingFile(file)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
          </div>
          <div style={{ padding: "0 24px 20px" }}>
            <DialogFooter>
              <Button id="hr-assets-return-cancel" data-testid="hr-assets-return-cancel" variant="secondary" onClick={() => setReturnFor(null)}>Cancel</Button>
              <Button
                id="hr-assets-return-save"
                data-testid="hr-assets-return-save"
                disabled={busy}
                loading={busy}
                onClick={() => act(async () => {
                  const uploaded = await assets.uploadAttachments(returnFor.uid ?? returnFor.id, returnFiles);
                  await assets.returnAsset(returnFor.id, {
                    asset: returnFor,
                    status: returnStatus,
                    remarks: returnRemarks.trim(),
                    attachment: [...(returnFor.attachment || []), ...uploaded],
                  });
                  setReturnFor(null);
                  setReturnStatus("Available");
                  setReturnRemarks("");
                  setReturnFiles([]);
                })}
              >
                Save Status
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {histFor && (
        <Dialog open={!!histFor} onClose={() => setHistFor(null)} testId="hr-assets-history-modal" hideHeader contentClassName="w-[calc(100vw-1.5rem)] max-w-[560px] p-0 overflow-hidden">
          <div style={{ background: "rgba(17,94,89,0.05)", padding: "20px 24px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Asset History</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{histFor.name}</p></div>
            <button id="hr-assets-history-close" data-testid="hr-assets-history-close" onClick={() => setHistFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 24, maxHeight: "60vh", overflowY: "auto" }}>
            {histLoading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--light-text)" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>
            ) : hist.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--light-text)", fontSize: 13 }}>Never allocated.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hist.map((item) => (
                  <div key={item.id} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 13 }}>{item.employeeName || item.employeeUid}</b>
                      <span style={{ ...lbl }}>{item.issuedOn} -&gt; {item.returnedOn || "in use"}</span>
                    </div>
                    {(item.issueCondition || item.returnCondition) && (
                      <div style={{ ...lbl, fontSize: 9, marginTop: 4 }}>
                        {item.issueCondition ? `Issued: ${item.issueCondition}` : ""}{item.issueCondition && item.returnCondition ? " • " : ""}{item.returnCondition ? `Returned: ${item.returnCondition}` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
      <div style={{ ...lbl, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--dark-text)", wordBreak: "break-word" }}>{value || "-"}</div>
    </div>
  );
}

function CardDetail({ label, value, subValue }: { label: string; value?: string | number; subValue?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">{label}</span>
      <div className="min-w-0 text-right">
        <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{value || "-"}</div>
        {subValue ? <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{subValue}</div> : null}
      </div>
    </div>
  );
}

function AssetActions({
  asset,
  busy,
  onReturn,
  onView,
  onHistory,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  busy: boolean;
  onReturn: () => void;
  onView: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Popover
      align="end"
      portal
      data-testid={`hr-assets-actions-${asset.id}`}
      contentClassName="min-w-[170px] p-2"
      trigger={
        <button
          type="button"
          aria-label="More actions"
          style={{ background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4 }}
        >
          <MoreVertical size={18} />
        </button>
      }
    >
      <PopoverSection className="space-y-1">
        {asset.status === "Allocated" && (
          <button
            type="button"
            data-testid={`hr-assets-return-${asset.id}`}
            disabled={busy}
            onClick={onReturn}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 size={15} />
            Return / Write Off
          </button>
        )}
        <button
          type="button"
          data-testid={`hr-assets-view-${asset.id}`}
          onClick={onView}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <Eye size={15} />
          View
        </button>
        <button
          type="button"
          data-testid={`hr-assets-history-${asset.id}`}
          onClick={onHistory}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <History size={15} />
          History
        </button>
        <button
          type="button"
          data-testid={`hr-assets-edit-${asset.id}`}
          onClick={onEdit}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <Pencil size={15} />
          Edit
        </button>
        <button
          type="button"
          data-testid={`hr-assets-delete-${asset.id}`}
          onClick={onDelete}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </PopoverSection>
    </Popover>
  );
}

function AssetsViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      <button
        type="button"
        data-testid="hr-assets-view-table"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border-0",
          value === "table"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        data-testid="hr-assets-view-cards"
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border-0",
          value === "cards"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
