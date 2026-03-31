import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Plus, Printer } from "lucide-react";
import { useTags } from "@/hooks/useInventory";
import { TagDetailDrawer } from "@/components/gold-erp/TagDetailDrawer";
import { PrintBarcodesModal } from "@/components/gold-erp/PrintBarcodesModal";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { formatCurrency } from "@/lib/gold-erp-utils";

export default function TagsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [tagsForPrint, setTagsForPrint] = useState<any[]>([]);
  const [selectedTagUids, setSelectedTagUids] = useState<string[]>([]);
  const [selectedTagForDetail, setSelectedTagForDetail] = useState<any | null>(null);

  const { data: trackingTags = [], isLoading } = useTags();

  const filtered = useMemo(
    () =>
      trackingTags.filter((tag: any) => {
        const query = search.toLowerCase();
        const matchSearch =
          !query ||
          tag.tagNumber?.toLowerCase().includes(query) ||
          tag.itemName?.toLowerCase().includes(query) ||
          tag.itemCode?.toLowerCase().includes(query);
        const matchStatus = statusFilter === "all" || tag.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [trackingTags, search, statusFilter],
  );

  const selectedTags = useMemo(
    () => filtered.filter((tag: any) => selectedTagUids.includes(tag.tagUid)),
    [filtered, selectedTagUids],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((tag: any) => selectedTagUids.includes(tag.tagUid));

  const toggleTagSelection = (tagUid: string, checked: boolean) => {
    setSelectedTagUids((current) =>
      checked ? Array.from(new Set([...current, tagUid])) : current.filter((currentTagUid) => currentTagUid !== tagUid),
    );
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedTagUids((current) => {
      if (!checked) {
        return current.filter((tagUid) => !filtered.some((tag: any) => tag.tagUid === tagUid));
      }

      return Array.from(new Set([...current, ...filtered.map((tag: any) => tag.tagUid)]));
    });
  };

  const openPrintModal = (tags: any[]) => {
    setTagsForPrint(tags);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="Inventory Tags" subtitle="Manage unique tracking tags across stock, reservation, sale, and transfer states">
        <div className="flex gap-2">
          {selectedTags.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => openPrintModal(selectedTags)}>
              <Printer className="h-4 w-4 mr-1" />Print Selected ({selectedTags.length})
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => openPrintModal(filtered.slice(0, 50))}>
              <Printer className="h-4 w-4 mr-1" />Print Tags
            </Button>
          )}
          <Link to="/purchase" tabIndex={-1}>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create from GRN</Button>
          </Link>
        </div>
      </PageHeader>

      <TagDetailDrawer tag={selectedTagForDetail} onClose={() => setSelectedTagForDetail(null)} />
      <PrintBarcodesModal open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen} tagsToPrint={tagsForPrint} />

      <SectionCard noPadding>
        <div className="p-[var(--card-padding)] pb-0">
          <FilterBar
            searchPlaceholder="Search by tag or item..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "In Stock", value: "IN_STOCK" },
                  { label: "Reserved", value: "RESERVED" },
                  { label: "Sold", value: "SOLD" },
                  { label: "Returned", value: "RETURNED" },
                  { label: "Transferred", value: "TRANSFERRED" },
                ],
                value: statusFilter,
                onChange: setStatusFilter,
              },
            ]}
          />
        </div>
        <div className="overflow-x-auto mt-3">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading tags...</div>}
          {filtered.length === 0 && !isLoading ? (
            <EmptyStateBlock
              title="No tags found"
              description="Complete a GRN and tag confirmation flow or clear the filters."
            />
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
                    aria-label="Select all filtered tags"
                  />
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tag Number</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item Name</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">G.Wt (g)</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">N.Wt (g)</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Selling Price</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag: any) => (
                <tr key={tag.tagUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selectedTagUids.includes(tag.tagUid)}
                      onCheckedChange={(checked) => toggleTagSelection(tag.tagUid, checked === true)}
                      aria-label={`Select ${tag.tagNumber || tag.tagUid}`}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{tag.tagNumber}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{tag.itemName}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{tag.grossWt}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{tag.netWt}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCurrency(tag.sellingPrice || 0)}</td>
                  <td className="px-4 py-2"><StatusBadge status={tag.status} /></td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPrintModal([tag])}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedTagForDetail(tag)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
