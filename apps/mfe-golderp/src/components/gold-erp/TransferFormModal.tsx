import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyStateBlock } from "./EmptyStateBlock";
import { toast } from "sonner";
import { useCreateTransfer, useTags } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferFormModal({ open, onOpenChange }: Props) {
  const createTransfer = useCreateTransfer();
  const { data: availableTags = [] } = useTags();

  const [transferNumber, setTransferNumber] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [dispatchReference, setDispatchReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedTagUids, setSelectedTagUids] = useState<string[]>([]);

  const inStockTags = useMemo(() => availableTags.filter((tag: any) => tag.status === "IN_STOCK"), [availableTags]);

  const toggleTag = (uid: string) => {
    setSelectedTagUids((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]));
  };

  const resetForm = () => {
    setTransferNumber("");
    setDestinationAccount("");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setDispatchReference("");
    setRemarks("");
    setSelectedTagUids([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferNumber.trim() || !destinationAccount.trim() || !selectedTagUids.length) {
      toast.error("Enter transfer number, destination account, and select at least one tag.");
      return;
    }

    try {
      await createTransfer.mutateAsync({
        transferNumber: transferNumber.trim(),
        toAccount: Number(destinationAccount),
        transferDate,
        totalTags: selectedTagUids.length,
        status: "PENDING",
        dispatchReference: dispatchReference.trim() || undefined,
        notes: remarks || undefined,
        lines: selectedTagUids.map((tagUid) => ({ tagUid })),
      });
      toast.success(`Transfer initiated for ${selectedTagUids.length} tags`);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to create transfer", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) resetForm(); }}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Initiate Stock Transfer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transfer Number</Label>
              <Input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} placeholder="TRN-2026-0001" required />
            </div>
            <div className="space-y-2">
              <Label>Destination Account</Label>
              <Input type="number" value={destinationAccount} onChange={(e) => setDestinationAccount(e.target.value)} placeholder="20001" required />
            </div>
            <div className="space-y-2">
              <Label>Transfer Date</Label>
              <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Dispatch Reference</Label>
              <Input value={dispatchReference} onChange={(e) => setDispatchReference(e.target.value)} placeholder="HAND-CARRY" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for transfer" />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="font-semibold text-sm mb-3">Select Tags to Transfer ({selectedTagUids.length} selected)</h3>
            <div className="border border-border rounded-md max-h-[40vh] overflow-y-auto bg-muted/10">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="p-2 w-10 text-center">Sel</th>
                    <th className="p-2">Tag Number</th>
                    <th className="p-2">Item</th>
                    <th className="p-2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {inStockTags.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <EmptyStateBlock title="No transferable tags available" description="Only in-stock tags can be transferred to another location." className="py-8" />
                      </td>
                    </tr>
                  ) : (
                    inStockTags.map((tag: any) => (
                      <tr key={tag.tagUid} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => toggleTag(tag.tagUid)}>
                        <td className="p-2 text-center"><input type="checkbox" checked={selectedTagUids.includes(tag.tagUid)} readOnly className="cursor-pointer" /></td>
                        <td className="p-2 font-mono">{tag.tagNumber || tag.barcode || tag.tagUid}</td>
                        <td className="p-2">{tag.itemName}</td>
                        <td className="p-2">{tag.grossWt || tag.grossWeight || 0}g</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createTransfer.isPending || selectedTagUids.length === 0}>Submit Transfer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
