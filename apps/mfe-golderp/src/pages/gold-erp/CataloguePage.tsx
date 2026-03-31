import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Plus } from "lucide-react";
import { useItems } from "@/hooks/useCatalogue";
import { ItemDetailDrawer } from "@/components/gold-erp/ItemDetailDrawer";
import { ItemFormModal } from "@/components/gold-erp/ItemFormModal";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { formatWeight, getPurityDisplayName } from "@/lib/gold-erp-utils";
import { JewelleryItem } from "@/lib/gold-erp-types";

const itemTypeVariantMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  RING: "warning",
  NECKLACE: "info",
  BANGLE: "success",
  EARRING: "danger",
};

const itemTypeClassMap: Record<string, string> = {
  RING: "bg-amber-50 text-amber-700 border border-amber-200",
  NECKLACE: "bg-sky-50 text-sky-700 border border-sky-200",
  BANGLE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EARRING: "bg-rose-50 text-rose-700 border border-rose-200",
};

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<JewelleryItem | null>(null);
  const [editItem, setEditItem] = useState<JewelleryItem | null>(null);

  const { data: items = [], isLoading } = useItems();

  const filtered = useMemo(
    () =>
      items.filter((item: JewelleryItem) => {
        const query = search.toLowerCase();
        const matchSearch = !query || item.name?.toLowerCase().includes(query) || item.itemCode?.toLowerCase().includes(query);
        const matchType = typeFilter === "all" || item.itemType === typeFilter;
        return matchSearch && matchType;
      }),
    [items, search, typeFilter],
  );

  const handleCreateItem = () => {
    setEditItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: JewelleryItem) => {
    setSelectedItemForDetail(null);
    setEditItem(item);
    setIsItemModalOpen(true);
  };

  const handleItemModalOpenChange = (open: boolean) => {
    setIsItemModalOpen(open);
    if (!open) {
      setEditItem(null);
    }
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="Jewellery Items" subtitle="Jewellery templates used during purchase receipt and tag generation">
        <Button size="sm" onClick={handleCreateItem}><Plus className="h-4 w-4 mr-1" />Create Item</Button>
      </PageHeader>

      <ItemFormModal open={isItemModalOpen} onOpenChange={handleItemModalOpenChange} editItem={editItem} />
      <ItemDetailDrawer item={selectedItemForDetail} onClose={() => setSelectedItemForDetail(null)} />

      <SectionCard noPadding>
        <div className="p-[var(--card-padding)] pb-0">
          <FilterBar
            searchPlaceholder="Search by name or item code..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                key: "type",
                label: "Item Type",
                options: [
                  { label: "Ring", value: "RING" },
                  { label: "Necklace", value: "NECKLACE" },
                  { label: "Bangle", value: "BANGLE" },
                  { label: "Earring", value: "EARRING" },
                ],
                value: typeFilter,
                onChange: setTypeFilter,
              },
            ]}
          />
        </div>
        <div className="overflow-x-auto mt-3">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading items...</div>}
          {filtered.length === 0 && !isLoading ? (
            <EmptyStateBlock
              title="No catalogue items found"
              description="Create a jewellery item or change the search and filter inputs."
            />
          ) : (
            <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item Code</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metal</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purity</th>
                  {/* <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Typical Wt</th> */}
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                </tr></thead>
              <tbody>
                {filtered.map((item: JewelleryItem) => (
                  <tr key={item.itemUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs font-medium text-foreground">{item.itemCode}</td>
                    <td className="px-4 py-2 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={item.itemType}
                        variant={itemTypeVariantMap[item.itemType || ""] || "info"}
                        className={itemTypeClassMap[item.itemType || ""]}
                      />
                    </td>
                    <td className="px-4 py-2 text-foreground">{item.metalName || "-"}</td>
                    <td className="px-4 py-2 text-foreground">{getPurityDisplayName(item)}</td>
                    {/* <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatWeight(item.typicalGrossWt)} / {formatWeight(item.typicalNetWt)}</td> */}
                    <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItemForDetail(item)} title="View">
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
