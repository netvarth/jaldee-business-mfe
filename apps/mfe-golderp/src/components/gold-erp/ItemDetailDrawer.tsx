import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAddStoneTemplate, useItemDetails } from "@/hooks/useCatalogue";
import { useStones } from "@/hooks/useMasterData";
import { StatusBadge } from "./StatusBadge";
import { EmptyStateBlock } from "./EmptyStateBlock";
import { Plus } from "lucide-react";

interface Props {
  item: any | null;
  onClose: () => void;
}

export function ItemDetailDrawer({ item, onClose }: Props) {
  const itemUid = item?.itemUid || null;
  const { data: itemDetails } = useItemDetails(itemUid);
  const { data: stones = [] } = useStones();
  const addStoneTemplate = useAddStoneTemplate();

  const [isAddingStone, setIsAddingStone] = useState(false);
  const [selectedStoneUid, setSelectedStoneUid] = useState("");
  const [expectedCount, setExpectedCount] = useState("1");

  const resolvedItem = itemDetails || item;
  if (!resolvedItem) return null;

  const handleAddStone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStoneTemplate.mutateAsync({
        itemUid: resolvedItem.itemUid,
        data: { stoneUid: selectedStoneUid, expectedCount: parseInt(expectedCount, 10) },
      });
      toast.success("Stone template added");
      setIsAddingStone(false);
      setSelectedStoneUid("");
      setExpectedCount("1");
    } catch (err: any) {
      toast.error("Failed to add stone template", { description: err.message });
    }
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">{resolvedItem.name}</SheetTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-mono">{resolvedItem.itemCode}</span>
            <span>&bull;</span>
            <StatusBadge status={resolvedItem.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-y-4 text-sm text-foreground">
            <div><span className="text-muted-foreground block text-xs">Item Type</span>{resolvedItem.itemType || "-"}</div>
            <div><span className="text-muted-foreground block text-xs">Metal</span>{resolvedItem.metalName || "-"}</div>
            <div><span className="text-muted-foreground block text-xs">Purity</span>{resolvedItem.purityLabel || "-"}</div>
            <div><span className="text-muted-foreground block text-xs">Weights (Gross/Net)</span>{resolvedItem.typicalGrossWt}g / {resolvedItem.typicalNetWt}g</div>
            <div><span className="text-muted-foreground block text-xs">HSN Code</span>{resolvedItem.hsnCode || "-"}</div>
            <div><span className="text-muted-foreground block text-xs">Tax Rate</span>{resolvedItem.taxRate ?? "-"}{resolvedItem.taxRate !== undefined ? "%" : ""}</div>
            <div><span className="text-muted-foreground block text-xs">Charge</span>{resolvedItem.chargeType || "-"} ({resolvedItem.chargeValue ?? "-"})</div>
            <div><span className="text-muted-foreground block text-xs">Available Online</span>{resolvedItem.availableOnline ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground block text-xs">Status</span><StatusBadge status={resolvedItem.status} /></div>
            <div className="col-span-2"><span className="text-muted-foreground block text-xs">Description</span>{resolvedItem.description || "-"}</div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm">Stone Templates</h3>
              {!isAddingStone && (
                <Button variant="outline" size="sm" onClick={() => setIsAddingStone(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>

            {isAddingStone && (
              <form onSubmit={handleAddStone} className="bg-muted/30 p-3 rounded-md space-y-3 border border-border mb-4">
                <div className="space-y-2">
                  <Label className="text-xs">Select Stone</Label>
                  <Select value={selectedStoneUid} onValueChange={setSelectedStoneUid}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stone mapping" /></SelectTrigger>
                    <SelectContent>
                      {stones.map((stone: any) => (
                        <SelectItem key={stone.stoneUid} value={stone.stoneUid}>{stone.name} ({stone.stoneCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs">Expected Count</Label>
                    <Input type="number" min="1" required value={expectedCount} onChange={(e) => setExpectedCount(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingStone(false)} className="h-8">Cancel</Button>
                  <Button type="submit" size="sm" className="h-8" disabled={addStoneTemplate.isPending}>Add</Button>
                </div>
              </form>
            )}

            <ul className="space-y-2">
              {resolvedItem.stoneTemplates?.length ? (
                resolvedItem.stoneTemplates.map((stoneTemplate: any) => (
                  <li key={stoneTemplate.templateUid} className="flex justify-between items-center p-2 rounded border border-border text-sm">
                    <span>{stoneTemplate.stoneName}</span>
                    <span className="text-muted-foreground font-medium">x{stoneTemplate.expectedCount}</span>
                  </li>
                ))
              ) : (
                <EmptyStateBlock title="No stone templates" description="Stone mappings for this item will appear here after they are added." className="py-6 border border-dashed rounded-md" />
              )}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
