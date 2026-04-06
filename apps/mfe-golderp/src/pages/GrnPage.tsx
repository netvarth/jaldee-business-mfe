import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
  type ColumnDef,
} from "@jaldee/design-system";
import { purchaseService } from "@/services";
import type { DraftTag, GoodsReceiptNote } from "@/lib/gold-erp-types";
import { formatDate, formatWeight } from "@/lib/gold-erp-utils";

const PAGE_SIZE = 10;

type GrnRow = GoodsReceiptNote & { id: string };
type GrnWithDraftTags = GoodsReceiptNote & { draftTags: DraftTag[] };

function normalizeGrn(grn: GoodsReceiptNote): GrnRow {
  return {
    ...grn,
    id: String(grn.grnUid ?? grn.grnNumber ?? ""),
    grnUid: String(grn.grnUid ?? ""),
    grnNumber: String(grn.grnNumber ?? "-"),
    poUid: grn.poUid ? String(grn.poUid) : undefined,
    poNumber: grn.poNumber ? String(grn.poNumber) : undefined,
    supplierName: grn.supplierName ? String(grn.supplierName) : undefined,
    receivedDate: String(grn.receivedDate ?? ""),
    receivedBy: grn.receivedBy ? String(grn.receivedBy) : undefined,
    totalPieces: Number(grn.totalPieces ?? 0),
    status: grn.status ?? "DRAFT",
    notes: grn.notes ? String(grn.notes) : undefined,
  };
}

function getBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "CONFIRMED") return "success";
  if (status === "DRAFT") return "warning";
  return "neutral";
}

function parseSearchQuery(input: string) {
  const parsed: {
    poNumber?: string;
    supplierName?: string;
    poUid?: string;
    receivedDateFrom?: string;
    receivedDateTo?: string;
  } = {};

  const tokenRegex = /\b(po|supplier|uid|pouid|from|to):([^]+?)(?=\s+\b(?:po|supplier|uid|pouid|from|to):|$)/gi;
  const consumedRanges: Array<[number, number]> = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    consumedRanges.push([match.index, match.index + match[0].length]);

    if (!value) continue;
    if (key === "po") parsed.poNumber = value;
    if (key === "supplier") parsed.supplierName = value;
    if (key === "uid" || key === "pouid") parsed.poUid = value;
    if (key === "from") parsed.receivedDateFrom = value;
    if (key === "to") parsed.receivedDateTo = value;
  }

  const remainingText = input
    .split("")
    .map((char, index) => {
      const consumed = consumedRanges.some(([start, end]) => index >= start && index < end);
      return consumed ? " " : char;
    })
    .join("")
    .trim()
    .replace(/\s+/g, " ");

  if (remainingText && !parsed.poNumber && !parsed.supplierName && !parsed.poUid) {
    parsed.poNumber = remainingText;
  }

  return parsed;
}

export default function GrnPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [allMatchingGrns, setAllMatchingGrns] = useState<GrnRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCountLoading, setIsCountLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGrn, setSelectedGrn] = useState<GrnWithDraftTags | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const from = (page - 1) * PAGE_SIZE;
  const parsedSearch = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

  const filters = useMemo(
    () => ({
      poNumber: parsedSearch.poNumber,
      supplierName: parsedSearch.supplierName,
      status: statusFilter,
      receivedDateFrom: parsedSearch.receivedDateFrom,
      receivedDateTo: parsedSearch.receivedDateTo,
      poUid: parsedSearch.poUid,
      from,
      count: PAGE_SIZE,
    }),
    [from, parsedSearch, statusFilter],
  );

  const countFilters = useMemo(
    () => ({
      poNumber: parsedSearch.poNumber,
      supplierName: parsedSearch.supplierName,
      status: statusFilter,
      receivedDateFrom: parsedSearch.receivedDateFrom,
      receivedDateTo: parsedSearch.receivedDateTo,
      poUid: parsedSearch.poUid,
    }),
    [parsedSearch, statusFilter],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    void purchaseService.getGrns(filters)
      .then((rows) => {
        if (cancelled) return;
        setGrns(Array.isArray(rows) ? rows.map(normalizeGrn) : []);
      })
      .catch((loadError: unknown) => {
        console.error("[GrnPage] failed to load GRNs", loadError);
        if (cancelled) return;
        setGrns([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load GRNs.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setIsCountLoading(true);

    void Promise.all([purchaseService.getGrns(countFilters), purchaseService.getGrnCount(countFilters)])
      .then(([rows, count]) => {
        if (cancelled) return;
        setAllMatchingGrns(Array.isArray(rows) ? rows.map(normalizeGrn) : []);
        setTotalCount(Number(count ?? 0));
      })
      .catch((loadError: unknown) => {
        console.error("[GrnPage] failed to load GRN counts", loadError);
        if (cancelled) return;
        setAllMatchingGrns([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (!cancelled) setIsCountLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countFilters]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const stats = useMemo(() => {
    const draftCount = allMatchingGrns.filter((grn) => grn.status === "DRAFT").length;
    const confirmedCount = allMatchingGrns.filter((grn) => grn.status === "CONFIRMED").length;
    const linkedPoCount = allMatchingGrns.filter((grn) => Boolean(grn.poUid)).length;
    return { draftCount, confirmedCount, linkedPoCount };
  }, [allMatchingGrns]);

  async function openGrnDetails(grn: GrnRow) {
    setSelectedGrn({ ...grn, draftTags: [] });
    setIsDetailLoading(true);

    try {
      const draftTags = await purchaseService.getDraftTags(grn.grnUid);
      setSelectedGrn({ ...grn, draftTags: Array.isArray(draftTags) ? draftTags : [] });
    } catch (loadError) {
      console.error("[GrnPage] failed to load draft tags", loadError);
      setSelectedGrn({ ...grn, draftTags: [] });
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleConfirmSelectedGrn() {
    if (!selectedGrn) return;
    if (!selectedGrn.draftTags.length) {
      setError("GRN has no draft tags to confirm.");
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      await purchaseService.confirmGRN(selectedGrn.grnUid);
      setSelectedGrn(null);
      setPage(1);
    } catch (confirmError) {
      console.error("[GrnPage] failed to confirm GRN", confirmError);
      setError(confirmError instanceof Error ? confirmError.message : "Failed to confirm GRN.");
    } finally {
      setIsConfirming(false);
    }
  }

  const columns = useMemo<ColumnDef<GrnRow>[]>(
    () => [
      { key: "grnNumber", header: "GRN Number", render: (row) => <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">{row.grnNumber}</span> },
      { key: "poNumber", header: "PO Number", render: (row) => row.poNumber || "-" },
      { key: "supplierName", header: "Supplier", render: (row) => <span className="font-medium">{row.supplierName || "-"}</span> },
      { key: "receivedDate", header: "Received Date", render: (row) => formatDate(row.receivedDate) },
      { key: "totalPieces", header: "Pieces", align: "right", render: (row) => <span className="tabular-nums">{row.totalPieces || 0}</span> },
      { key: "status", header: "Status", render: (row) => <Badge variant={getBadgeVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            {row.poUid ? (
              <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/${row.poUid}`, { state: { returnTo: "/grn" } })}>Open PO</Button>
            ) : (
              <Button variant={row.status === "DRAFT" ? "primary" : "outline"} size="sm" onClick={() => void openGrnDetails(row)}>
                {row.status === "DRAFT" ? "Confirm" : "View"}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title="GRN Dashboard" subtitle="Track goods receipt notes, filter inward receipts, and open the GRN entry form when needed." actions={<Button size="sm" onClick={() => navigate("/grn/new")}>New GRN</Button>} />
        {error ? <Alert variant="danger" title="GRN error">{error}</Alert> : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard layout="compact" accent="indigo" icon={<Icon name="list" />} label="GRNs" value={isCountLoading ? "..." : totalCount} />
          <StatCard layout="compact" accent="slate" icon={<Icon name="box" />} label="Draft GRNs" value={stats.draftCount} />
          <StatCard layout="compact" accent="emerald" icon={<Icon name="packagePlus" />} label="Confirmed GRNs" value={stats.confirmedCount} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="refresh" />} label="PO Linked GRNs" value={stats.linkedPoCount} />
        </div>

        <SectionCard>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <DataTableToolbar query={searchQuery} onQueryChange={(value) => { setSearchQuery(value); setPage(1); }} searchPlaceholder="Search by PO, supplier, or tokens like po:, supplier:, from:, to:" recordCount={totalCount} />
              <div className="w-full md:max-w-[220px]">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                  options={[{ label: "All", value: "all" }, { label: "Draft", value: "DRAFT" }, { label: "Confirmed", value: "CONFIRMED" }]}
                />
              </div>
            </div>

            <div className="text-xs text-[var(--color-text-secondary)]">Showing {grns.length ? from + 1 : 0}-{Math.min(from + grns.length, totalCount)} of {isCountLoading ? "..." : totalCount}</div>

            <DataTable data={grns} columns={columns} getRowId={(row) => row.id} loading={isLoading} emptyState={<EmptyState title="No GRNs found" description="Adjust the current filters or create a new GRN to start the inward workflow." />} className="border-0 shadow-none" />

            {totalCount > PAGE_SIZE ? (
              <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
                <span className="text-sm text-[var(--color-text-secondary)]">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <Dialog open={Boolean(selectedGrn)} onClose={() => setSelectedGrn(null)} title={selectedGrn?.status === "DRAFT" ? "Confirm GRN" : "GRN Details"} description={selectedGrn?.status === "DRAFT" ? "Review the draft GRN and piece details before confirming." : "Review the GRN header and its piece details."} size="lg">
          {selectedGrn ? (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-md border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_20%,white)] p-4 text-sm md:grid-cols-2">
                <DetailField label="GRN Number" value={selectedGrn.grnNumber} />
                <div><div className="text-xs text-[var(--color-text-secondary)]">Status</div><div className="mt-1"><Badge variant={getBadgeVariant(selectedGrn.status)}>{selectedGrn.status}</Badge></div></div>
                <DetailField label="Supplier" value={selectedGrn.supplierName || "-"} />
                <DetailField label="Received Date" value={formatDate(selectedGrn.receivedDate)} />
                <DetailField label="Received By" value={selectedGrn.receivedBy || "-"} />
                <DetailField label="Total Pieces" value={String(selectedGrn.totalPieces || 0)} />
                <div className="md:col-span-2"><DetailField label="Notes" value={selectedGrn.notes || "-"} /></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">Draft Tags</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{selectedGrn.status === "DRAFT" ? "Confirms only when at least one draft tag exists." : "These are the piece-level details stored under this GRN."}</div>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{isDetailLoading ? "Loading..." : `${selectedGrn.draftTags.length} piece(s)`}</div>
                </div>

                {isDetailLoading ? (
                  <div className="rounded-md border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]">Loading draft tags...</div>
                ) : selectedGrn.draftTags.length ? (
                  <div className="space-y-3">
                    {selectedGrn.draftTags.map((tag) => (
                      <div key={tag.draftTagUid} className="rounded-md border border-[var(--color-border)] bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">{tag.tagNumber || tag.itemCode || tag.itemUid}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{tag.itemName || tag.itemCode || tag.itemUid}</div>
                          </div>
                          <div className="text-right text-xs text-[var(--color-text-secondary)]"><div>Gross {formatWeight(tag.grossWt || 0)}</div><div>Net {formatWeight(tag.netWt || 0)}</div></div>
                        </div>
                        <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                          <div><span className="block text-[var(--color-text-secondary)]">Stone Weight</span>{formatWeight(tag.stoneWt || 0)}</div>
                          <div className="md:col-span-2"><span className="block text-[var(--color-text-secondary)]">Notes</span>{tag.notes || "-"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No draft tags available" description="This GRN cannot be confirmed until at least one draft tag exists." />
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedGrn(null)} disabled={isConfirming}>{selectedGrn?.status === "DRAFT" ? "Cancel" : "Close"}</Button>
            {selectedGrn?.status === "DRAFT" ? <Button onClick={() => void handleConfirmSelectedGrn()} disabled={isDetailLoading || !selectedGrn.draftTags.length || isConfirming}>Confirm GRN</Button> : null}
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
