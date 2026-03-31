import { useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { EmptyStateBlock } from "./EmptyStateBlock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagsToPrint: any[];
}

export function PrintBarcodesModal({ open, onOpenChange, tagsToPrint }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 20px; }
            .barcode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .tag { border: 1px solid #000; padding: 10px; text-align: center; break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="barcode-grid">${printRef.current.innerHTML}</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Print Barcodes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/30 border border-border rounded-md mt-2">
          {tagsToPrint.length === 0 ? (
            <EmptyStateBlock
              title="No tags available for printing"
              description="Select tags from inventory to generate barcode print labels."
              className="mt-6"
            />
          ) : (
            <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tagsToPrint.map((tag) => (
                <div key={tag.tagUid} className="tag bg-background border border-foreground p-3 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="text-xs truncate w-full" title={tag.itemName}>{tag.itemName}</div>
                  <div className="text-lg font-bold tracking-widest my-2 uppercase">{tag.tagNumber}</div>
                  <div className="text-[10px] w-full flex justify-between border-t border-dashed border-foreground pt-1 mt-1">
                    <span>GW: <span className="font-semibold">{tag.grossWt}g</span></span>
                    <span>NW: <span className="font-semibold">{tag.netWt}g</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handlePrint} disabled={tagsToPrint.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print {tagsToPrint.length} Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
