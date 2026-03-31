import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateSalesOrder } from "@/hooks/useSales";
import { useTags } from "@/hooks/useInventory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatWeight } from "@/lib/gold-erp-utils";
import { JewelleryTag } from "@/lib/gold-erp-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesOrderFormModal({ open, onOpenChange }: Props) {
  const createOrder = useCreateSalesOrder();
  const { data: allTags = [] } = useTags();
  const [orderNumber, setOrderNumber] = useState("");
  const [orderType, setOrderType] = useState("WALK_IN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTagUid, setSelectedTagUid] = useState("");
  const [selectedTagUids, setSelectedTagUids] = useState<string[]>([]);

  const resetForm = () => {
    setOrderNumber("");
    setOrderType("WALK_IN");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setSelectedTagUid("");
    setSelectedTagUids([]);
  };

  const availableTags = useMemo(
    () => allTags.filter((tag: JewelleryTag) => tag.status === "IN_STOCK" && !selectedTagUids.includes(tag.tagUid)),
    [allTags, selectedTagUids],
  );
  const selectedTags = useMemo(
    () => selectedTagUids.map((tagUid) => allTags.find((tag: JewelleryTag) => tag.tagUid === tagUid)).filter(Boolean) as JewelleryTag[],
    [allTags, selectedTagUids],
  );
  const totalAmount = selectedTags.reduce((sum, tag) => sum + (tag.sellingPrice || 0), 0);

  const handleAddTag = () => {
    if (!selectedTagUid) {
      return;
    }
    setSelectedTagUids((current) => (current.includes(selectedTagUid) ? current : [...current, selectedTagUid]));
    setSelectedTagUid("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !customerName.trim() || selectedTags.length === 0) {
      toast.error("Order number, customer name, and at least one tag are required");
      return;
    }

    try {
      await createOrder.mutateAsync({
        orderNumber: orderNumber.trim(),
        orderType: orderType as "WALK_IN" | "ADVANCE" | "ONLINE",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        orderDate: new Date().toISOString().split("T")[0],
        totalAmount,
        discountAmount: 0,
        oldGoldDeduction: 0,
        advancePaid: 0,
        balanceDue: totalAmount,
        status: "DRAFT",
        notes: notes.trim() || undefined,
        lines: selectedTags.map((tag) => ({
          tagUid: tag.tagUid,
          grossWt: Number(tag.grossWt || tag.grossWeight || 0),
          netWt: Number(tag.netWt || tag.netWeight || 0),
          sellingPrice: Number(tag.sellingPrice || 0),
          discountOnLine: 0,
          finalPrice: Number(tag.sellingPrice || 0),
        })),
      });
      toast.success("Sales order created successfully");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Failed to create order", { description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) resetForm(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Sales Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="SO-2026-0001" />
            </div>

            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk In</SelectItem>
                  <SelectItem value="ADVANCE">Advance</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Customer Name</Label>
              <Input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full Name" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Customer Phone</Label>
              <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Order Tags</Label>
              <div className="flex gap-2">
                <Select value={selectedTagUid} onValueChange={setSelectedTagUid}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select in-stock tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag.tagUid} value={tag.tagUid}>
                        {(tag.tagNumber || tag.barcode || tag.tagUid)} - {tag.itemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={!selectedTagUid}>Add Tag</Button>
              </div>
            </div>

            <div className="col-span-2 rounded-md border border-border bg-muted/20 p-3 text-sm">
              {selectedTags.length === 0 ? (
                <div className="text-muted-foreground">No tags selected.</div>
              ) : (
                <div className="space-y-2">
                  {selectedTags.map((tag) => (
                    <div key={tag.tagUid} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{tag.tagNumber || tag.barcode || tag.tagUid}</div>
                        <div className="text-xs text-muted-foreground">{tag.itemName} • {formatWeight(Number(tag.netWt || tag.netWeight || 0))}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{formatCurrency(Number(tag.sellingPrice || 0))}</div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTagUids((current) => current.filter((uid) => uid !== tag.tagUid))}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createOrder.isPending}>Create Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
