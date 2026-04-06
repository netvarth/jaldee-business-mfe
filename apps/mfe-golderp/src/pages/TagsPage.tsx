import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  Drawer,
  EmptyState,
  PageHeader,
  SectionCard,
  Select,
  type ColumnDef,
} from "@jaldee/design-system";
import { inventoryService } from "@/services";
import { formatCurrency, formatWeight } from "@/lib/gold-erp-utils";
import type { JewelleryTag } from "@/lib/gold-erp-types";

function normalizeTag(tag: JewelleryTag): JewelleryTag {
  return {
    ...tag,
    tagUid: String(tag.tagUid ?? ""),
    tagNumber: String(tag.tagNumber ?? tag.barcode ?? tag.tagUid ?? "-"),
    itemUid: String(tag.itemUid ?? ""),
    itemCode: String(tag.itemCode ?? ""),
    itemName: String(tag.itemName ?? "Item"),
    status: tag.status ?? "DRAFT",
    grossWt: Number(tag.grossWt ?? tag.grossWeight ?? 0),
    netWt: Number(tag.netWt ?? tag.netWeight ?? 0),
    sellingPrice: Number(tag.sellingPrice ?? 0),
  };
}

function getStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "IN_STOCK") return "success";
  if (status === "RESERVED" || status === "RETURNED") return "warning";
  if (status === "SOLD") return "info";
  if (status === "TRANSFERRED") return "neutral";
  return "danger";
}

export default function TagsPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<JewelleryTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTagUids, setSelectedTagUids] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<JewelleryTag | null>(null);
  const [printTags, setPrintTags] = useState<JewelleryTag[]>([]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      setIsLoading(true);
      setError("");

      try {
        const loadedTags = await inventoryService.getTags();
        if (cancelled) return;
        setTags(Array.isArray(loadedTags) ? loadedTags.map(normalizeTag) : []);
      } catch (loadError) {
        console.error("[TagsPage] failed to load tags", loadError);
        if (cancelled) return;
        setTags([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load tags.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      tags.filter((tag) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          tag.tagNumber?.toLowerCase().includes(query) ||
          tag.itemName?.toLowerCase().includes(query) ||
          tag.itemCode?.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "all" || tag.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [tags, search, statusFilter],
  );

  const selectedTags = useMemo(
    () => filtered.filter((tag) => selectedTagUids.includes(tag.tagUid)),
    [filtered, selectedTagUids],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((tag) => selectedTagUids.includes(tag.tagUid));

  function toggleTagSelection(tagUid: string, checked: boolean) {
    setSelectedTagUids((current) =>
      checked ? Array.from(new Set([...current, tagUid])) : current.filter((currentTagUid) => currentTagUid !== tagUid),
    );
  }

  function toggleSelectAllFiltered(checked: boolean) {
    setSelectedTagUids((current) => {
      if (!checked) {
        return current.filter((tagUid) => !filtered.some((tag) => tag.tagUid === tagUid));
      }

      return Array.from(new Set([...current, ...filtered.map((tag) => tag.tagUid)]));
    });
  }

  function openPrintDialog(nextTags: JewelleryTag[]) {
    setPrintTags(nextTags);
    setIsPrintDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<JewelleryTag>[]>(
    () => [
      {
        key: "select",
        header: "",
        width: 48,
        render: (tag) => (
          <Checkbox
            checked={selectedTagUids.includes(tag.tagUid)}
            onChange={(event) => toggleTagSelection(tag.tagUid, event.target.checked)}
            aria-label={`Select ${tag.tagNumber || tag.tagUid}`}
          />
        ),
      },
      {
        key: "tagNumber",
        header: "Tag Number",
        render: (tag) => <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{tag.tagNumber}</span>,
      },
      {
        key: "itemName",
        header: "Item Name",
        render: (tag) => <span className="font-medium">{tag.itemName}</span>,
      },
      {
        key: "grossWt",
        header: "G.Wt (g)",
        align: "right",
        render: (tag) => <span className="tabular-nums">{Number(tag.grossWt ?? 0).toFixed(3).replace(/\.?0+$/, "")}</span>,
      },
      {
        key: "netWt",
        header: "N.Wt (g)",
        align: "right",
        render: (tag) => <span className="tabular-nums">{Number(tag.netWt ?? 0).toFixed(3).replace(/\.?0+$/, "")}</span>,
      },
      {
        key: "sellingPrice",
        header: "Selling Price",
        align: "right",
        render: (tag) => <span className="tabular-nums">{formatCurrency(tag.sellingPrice || 0)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (tag) => <Badge variant={getStatusVariant(tag.status)}>{tag.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (tag) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => openPrintDialog([tag])}>
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTag(tag)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [selectedTagUids],
  );

  function printBarcodes() {
    const win = window.open("", "_blank", "width=960,height=720");
    if (!win) return;

    const cards = printTags
      .map(
        (tag) => `
          <div style="border:1px solid #d4d4d8;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:12px;color:#64748b;">${tag.itemName}</div>
            <div style="font-family:monospace;font-size:18px;font-weight:700;">${tag.tagNumber || tag.tagUid}</div>
            <div style="font-size:12px;color:#334155;">${tag.itemCode || "-"}</div>
            <div style="font-size:12px;color:#475569;">Status: ${tag.status}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;">
              <span>G.Wt ${formatWeight(Number(tag.grossWt ?? 0))}</span>
              <span>N.Wt ${formatWeight(Number(tag.netWt ?? 0))}</span>
            </div>
            <div style="font-size:14px;font-weight:600;">${formatCurrency(tag.sellingPrice || 0)}</div>
          </div>
        `,
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Print Tags</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
          </style>
        </head>
        <body>
          <h2 style="margin:0 0 16px;">Inventory Tags</h2>
          <div class="grid">${cards}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    setIsPrintDialogOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Inventory Tags"
          subtitle="Manage unique tracking tags across stock, reservation, sale, and transfer states"
          actions={
            <div className="flex gap-2">
              {selectedTags.length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => openPrintDialog(selectedTags)}>
                  Print Selected ({selectedTags.length})
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openPrintDialog(filtered.slice(0, 50))} disabled={!filtered.length}>
                  Print Tags
                </Button>
              )}
              <Button size="sm" onClick={() => navigate("/purchases")}>
                Create from GRN
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="danger" title="Could not load tags">
            {error}
          </Alert>
        ) : null}

        <SectionCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allFilteredSelected}
                onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                label="Select all filtered"
              />
            </div>
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-end md:justify-end">
              <div className="w-full md:max-w-md">
                <DataTableToolbar
                  query={search}
                  onQueryChange={setSearch}
                  searchPlaceholder="Search by tag or item..."
                  recordCount={filtered.length}
                />
              </div>
              <div className="w-full md:max-w-[220px]">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={[
                    { label: "All", value: "all" },
                    { label: "In Stock", value: "IN_STOCK" },
                    { label: "Reserved", value: "RESERVED" },
                    { label: "Sold", value: "SOLD" },
                    { label: "Returned", value: "RETURNED" },
                    { label: "Transferred", value: "TRANSFERRED" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(tag) => tag.tagUid}
              loading={isLoading}
              emptyState={<EmptyState title="No tags found" description="Complete a GRN and tag confirmation flow or clear the current filters." />}
              className="border-0 shadow-none"
            />
          </div>
        </SectionCard>

        <Drawer open={Boolean(selectedTag)} onClose={() => setSelectedTag(null)} title={selectedTag ? `Tag ${selectedTag.tagNumber}` : "Tag Details"} size="md">
          {selectedTag ? (
            <div className="space-y-5">
              <SectionCard title="Tag Details">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Tag Number" value={selectedTag.tagNumber || "-"} />
                  <DetailField label="Barcode" value={selectedTag.barcode || "-"} />
                  <DetailField label="Item Name" value={selectedTag.itemName || "-"} />
                  <DetailField label="Item Code" value={selectedTag.itemCode || "-"} />
                  <DetailField label="Gross Weight" value={formatWeight(Number(selectedTag.grossWt ?? 0))} />
                  <DetailField label="Net Weight" value={formatWeight(Number(selectedTag.netWt ?? 0))} />
                  <DetailField label="Stone Weight" value={formatWeight(Number(selectedTag.stoneWt ?? 0))} />
                  <DetailField label="Wastage Weight" value={formatWeight(Number(selectedTag.wastageWt ?? 0))} />
                  <DetailField label="Selling Price" value={formatCurrency(selectedTag.sellingPrice || 0)} />
                  <DetailField label="Status" value={selectedTag.status} />
                </div>
              </SectionCard>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => openPrintDialog([selectedTag])}>
                  Print Tag
                </Button>
                <Button variant="ghost" onClick={() => setSelectedTag(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer>

        <Dialog
          open={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          title="Print Tags"
          description="Preview the selected tags and continue to browser print."
          size="sm"
        >
          <div className="space-y-2">
            {printTags.length === 0 ? (
              <p className="m-0 text-sm text-[var(--color-text-secondary)]">No tags selected.</p>
            ) : (
              printTags.slice(0, 8).map((tag) => (
                <div key={tag.tagUid} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <div className="font-mono text-xs font-semibold text-[var(--color-primary)]">{tag.tagNumber || tag.tagUid}</div>
                  <div className="mt-1 font-medium text-[var(--color-text-primary)]">{tag.itemName}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {tag.itemCode || "-"} | {formatCurrency(tag.sellingPrice || 0)}
                  </div>
                </div>
              ))
            )}
            {printTags.length > 8 ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Showing 8 of {printTags.length} selected tags in preview.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={printBarcodes} disabled={!printTags.length}>
              Print
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
