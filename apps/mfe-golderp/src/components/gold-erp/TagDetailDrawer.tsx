import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTagDetails } from "@/hooks/useInventory";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency } from "@/lib/gold-erp-utils";
import { EmptyStateBlock } from "./EmptyStateBlock";

interface Props {
  tag: any | null;
  onClose: () => void;
}

export function TagDetailDrawer({ tag, onClose }: Props) {
  const tagUid = tag?.tagUid || null;
  const { data: tagDetails, isLoading } = useTagDetails(tagUid);
  const resolvedTag = tagDetails || tag;

  if (!resolvedTag) return null;

  return (
    <Sheet open={!!tag} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6 border-b border-border pb-4">
          <SheetTitle className="text-xl font-mono">{resolvedTag.tagNumber || resolvedTag.barcode || resolvedTag.tagUid}</SheetTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
            <span>{resolvedTag.itemName}</span>
            <span>&bull;</span>
            <StatusBadge status={resolvedTag.status} />
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Loading details...</div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">Specifications</h3>
              <div className="bg-muted/30 p-3 rounded-md border border-border grid grid-cols-2 gap-y-3 text-sm">
                <div><span className="text-muted-foreground block text-[10px] uppercase">Gross Weight</span><span className="font-medium">{resolvedTag.grossWt || resolvedTag.grossWeight || 0} g</span></div>
                <div><span className="text-muted-foreground block text-[10px] uppercase">Net Weight</span><span className="font-medium">{resolvedTag.netWt || resolvedTag.netWeight || 0} g</span></div>
                <div><span className="text-muted-foreground block text-[10px] uppercase">Item Code</span><span className="font-medium">{resolvedTag.itemCode || "-"}</span></div>
                <div><span className="text-muted-foreground block text-[10px] uppercase">Status</span><span className="font-medium">{resolvedTag.status}</span></div>
                <div><span className="text-muted-foreground block text-[10px] uppercase">Metal Cost</span><span className="font-medium">{formatCurrency(resolvedTag.metalCost || 0)}</span></div>
                <div><span className="text-muted-foreground block text-[10px] uppercase">Selling Price</span><span className="font-medium">{formatCurrency(resolvedTag.sellingPrice || 0)}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">Stone Details</h3>
              {resolvedTag.stoneDetails?.length ? (
                <div className="space-y-2">
                  {resolvedTag.stoneDetails.map((stone: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded-md border border-border text-sm">
                      <div>
                        <div className="font-medium">{stone.stoneName}</div>
                        <div className="text-[10px] text-muted-foreground">{stone.count || 1} pcs</div>
                      </div>
                      <div className="text-right font-medium">{formatCurrency(stone.stoneCostLine || 0)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateBlock title="No stone details" description="Stone information for this tag will appear here once stones are attached." className="py-6 border border-dashed rounded-md" />
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
