import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, FilterX, Link2, PackagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { StatCard } from "@/components/gold-erp/StatCard";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useConfirmGRN, useDraftTags, useGrnCount, useGrns } from "@/hooks/usePurchase";
import { GoodsReceiptNote } from "@/lib/gold-erp-types";
import { formatDate, formatWeight } from "@/lib/gold-erp-utils";

const PAGE_SIZE = 10;

function GrnDetailsDialog({
  grn,
  onOpenChange,
}: {
  grn: GoodsReceiptNote | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: draftTags = [], isLoading } = useDraftTags(grn?.grnUid ?? null);
  const confirmGrn = useConfirmGRN();

  const handleConfirm = async () => {
    if (!grn) {
      return;
    }

    if (!draftTags.length) {
      toast.error("GRN has no draft tags to confirm.");
      return;
    }

    try {
      await confirmGrn.mutateAsync(grn.grnUid);
      toast.success("GRN confirmed successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to confirm GRN", { description: error.message });
    }
  };

  return (
    <Dialog open={!!grn} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{grn?.status === "DRAFT" ? "Confirm GRN" : "GRN Details"}</DialogTitle>
          <DialogDescription>
            {grn?.status === "DRAFT"
              ? "Review the draft GRN and piece details before confirming. Confirmation creates the stock tags for these draft entries."
              : "Review the GRN header and its piece details."}
          </DialogDescription>
        </DialogHeader>

        {grn ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-md border border-border bg-muted/20 p-4 text-sm md:grid-cols-2">
              <div>
                <span className="block text-xs text-muted-foreground">GRN Number</span>
                {grn.grnNumber}
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Status</span>
                <StatusBadge status={grn.status} />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Supplier</span>
                {grn.supplierName || "-"}
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Received Date</span>
                {formatDate(grn.receivedDate)}
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Received By</span>
                {grn.receivedBy || "-"}
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Total Pieces</span>
                {grn.totalPieces || 0}
              </div>
              <div className="md:col-span-2">
                <span className="block text-xs text-muted-foreground">Notes</span>
                {grn.notes || "-"}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Draft Tags</div>
                  <div className="text-xs text-muted-foreground">
                    {grn.status === "DRAFT"
                      ? "Confirms only when at least one draft tag exists and required metal rates are available."
                      : "These are the piece-level details stored under this GRN."}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{isLoading ? "Loading..." : `${draftTags.length} piece(s)`}</div>
              </div>

              {isLoading ? (
                <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">Loading draft tags...</div>
              ) : draftTags.length ? (
                <div className="space-y-3">
                  {draftTags.map((tag) => (
                    <div key={tag.draftTagUid} className="rounded-md border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{tag.tagNumber || tag.itemCode || tag.itemUid}</div>
                          <div className="text-xs text-muted-foreground">{tag.itemName || tag.itemCode || tag.itemUid}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>Gross {formatWeight(tag.grossWt || 0)}</div>
                          <div>Net {formatWeight(tag.netWt || 0)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 text-xs md:grid-cols-3">
                        <div>
                          <span className="block text-muted-foreground">Stone Weight</span>
                          {formatWeight(tag.stoneWt || 0)}
                        </div>
                        {/* <div>
                          <span className="block text-muted-foreground">Wastage Weight</span>
                          {formatWeight(tag.wastageWt || 0)}
                        </div> */}
                        {/* <div>
                          <span className="block text-muted-foreground">Stone Rows</span>
                          {tag.stoneDetails?.length || 0}
                        </div> */}
                        <div className="md:col-span-3">
                          <span className="block text-muted-foreground">Notes</span>
                          {tag.notes || "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateBlock
                  title="No draft tags available"
                  description="This GRN cannot be confirmed until at least one draft tag exists."
                />
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {grn?.status === "DRAFT" ? "Cancel" : "Close"}
          </Button>
          {grn?.status === "DRAFT" ? (
            <Button type="button" onClick={handleConfirm} disabled={!grn || isLoading || !draftTags.length || confirmGrn.isPending}>
              Confirm GRN
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

    if (!value) {
      continue;
    }

    if (key === "po") {
      parsed.poNumber = value;
    } else if (key === "supplier") {
      parsed.supplierName = value;
    } else if (key === "uid" || key === "pouid") {
      parsed.poUid = value;
    } else if (key === "from") {
      parsed.receivedDateFrom = value;
    } else if (key === "to") {
      parsed.receivedDateTo = value;
    }
  }

  const remainingText = input
    .split("")
    .map((char, index) => {
      const isConsumed = consumedRanges.some(([start, end]) => index >= start && index < end);
      return isConsumed ? " " : char;
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
  const [grnToConfirm, setGrnToConfirm] = useState<GoodsReceiptNote | null>(null);

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
    [parsedSearch, statusFilter, from],
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

  const { data: grns = [], isLoading } = useGrns(filters);
  const { data: allMatchingGrns = [] } = useGrns(countFilters);
  const { data: totalCount = 0, isLoading: isCountLoading } = useGrnCount(countFilters);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const stats = useMemo(() => {
    const draftCount = allMatchingGrns.filter((grn) => grn.status === "DRAFT").length;
    const confirmedCount = allMatchingGrns.filter((grn) => grn.status === "CONFIRMED").length;
    const linkedPoCount = allMatchingGrns.filter((grn) => Boolean(grn.poUid)).length;

    return {
      draftCount,
      confirmedCount,
      linkedPoCount,
    };
  }, [allMatchingGrns]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="GRN Dashboard" subtitle="Track goods receipt notes, filter inward receipts, and open the GRN entry form when needed.">
        <Button size="sm" onClick={() => navigate("/grn/new")}>
          <Plus className="mr-1 h-4 w-4" />New GRN
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="GRNs"
          value={isCountLoading ? "..." : totalCount}
          iconBg="bg-primary-soft"
          iconColor="text-primary"
        />
        <StatCard
          icon={PackagePlus}
          label="Draft GRNs"
          value={stats.draftCount}
          iconBg="bg-muted"
          iconColor="text-muted-foreground"
        />
        <StatCard
          icon={CheckCircle2}
          label="Confirmed GRNs"
          value={stats.confirmedCount}
          iconBg="bg-success-soft"
          iconColor="text-success"
        />
        <StatCard
          icon={Link2}
          label="PO Linked GRNs"
          value={stats.linkedPoCount}
          iconBg="bg-warning-soft"
          iconColor="text-warning"
        />
      </div>

      <SectionCard noPadding>
        <div className="space-y-3 p-[var(--card-padding)] pb-0">
          <FilterBar
            searchPlaceholder="Search...."
            searchValue={searchQuery}
            onSearchChange={handleFilterChange(setSearchQuery)}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "Draft", value: "DRAFT" },
                  { label: "Confirmed", value: "CONFIRMED" },
                ],
                value: statusFilter,
                onChange: handleFilterChange(setStatusFilter),
              },
            ]}
          >
            {/* <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <FilterX className="mr-1 h-4 w-4" />
              Clear
            </Button> */}
          </FilterBar>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
         
            <span>
              Showing {grns.length ? from + 1 : 0}-{Math.min(from + grns.length, totalCount)} of {isCountLoading ? "..." : totalCount}
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading GRNs...</div>}
          {!isLoading && grns.length === 0 ? (
            <EmptyStateBlock
              title="No GRNs found"
              description="Adjust the current filters or create a new GRN to start the inward workflow."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">GRN Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">PO Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Received Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Pieces</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => (
                  <tr key={grn.grnUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">{grn.grnNumber}</td>
                    <td className="px-4 py-2 text-foreground">{grn.poNumber || "-"}</td>
                    <td className="px-4 py-2 font-medium text-foreground">{grn.supplierName || "-"}</td>
                    <td className="px-4 py-2 text-foreground">{formatDate(grn.receivedDate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{grn.totalPieces || 0}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={grn.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {grn.status === "DRAFT" && !grn.poUid ? (
                          <Button size="sm" className="min-w-24" onClick={() => setGrnToConfirm(grn)}>
                            Confirm
                          </Button>
                        ) : null}
                        {grn.status === "CONFIRMED" && !grn.poUid ? (
                          <Button variant="outline" size="sm" className="min-w-24" onClick={() => setGrnToConfirm(grn)}>
                            View
                          </Button>
                        ) : null}
                        {grn.poUid ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-24"
                            onClick={() => navigate(`/purchase/${grn.poUid}`, { state: { returnTo: "/grn" } })}
                          >
                            Open PO
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="border-t border-border px-[var(--card-padding)] py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (currentPage > 1) {
                        setPage(currentPage - 1);
                      }
                    }}
                    aria-disabled={currentPage <= 1}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((pageNumber) => Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages)
                  .filter((pageNumber, index, pages) => pages.indexOf(pageNumber) === index)
                  .map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === currentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (currentPage < totalPages) {
                        setPage(currentPage + 1);
                      }
                    }}
                    aria-disabled={currentPage >= totalPages}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </SectionCard>

      <GrnDetailsDialog grn={grnToConfirm} onOpenChange={(open) => !open && setGrnToConfirm(null)} />
    </div>
  );
}
