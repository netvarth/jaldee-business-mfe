import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreatePO } from "@/hooks/usePurchase";
import { useItems } from "@/hooks/useCatalogue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/gold-erp-utils";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

interface PurchaseLineDraft {
  id: string;
  itemUid: string;
  quantityOrdered: string;
  unitPrice: string;
  lineNotes: string;
}

const createEmptyLine = (): PurchaseLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemUid: "",
  quantityOrdered: "1",
  unitPrice: "",
  lineNotes: "",
});

export function PurchaseOrderFormModal({ open = true, onOpenChange, embedded = false }: Props) {
  const createPO = useCreatePO();
  const { data: items = [] } = useItems();

  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([createEmptyLine()]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPoNumber(`PO-${new Date().toISOString().slice(0, 10)}`);
    setOrderDate(new Date().toISOString().split("T")[0]);
  }, [open]);

  const totalAmount = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const quantityValue = Number(line.quantityOrdered) || 0;
        const unitPriceValue = Number(line.unitPrice) || 0;
        return sum + quantityValue * unitPriceValue;
      }, 0),
    [lines],
  );

  const resetForm = () => {
    setPoNumber(`PO-${new Date().toISOString().slice(0, 10)}`);
    setSupplierName("");
    setSupplierPhone("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setExpectedDeliveryDate("");
    setNotes("");
    setLines([createEmptyLine()]);
  };

  const updateLine = (lineId: string, field: keyof Omit<PurchaseLineDraft, "id">, value: string) => {
    setLines((currentLines) =>
      currentLines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    );
  };

  const addLine = () => {
    setLines((currentLines) => [...currentLines, createEmptyLine()]);
  };

  const removeLine = (lineId: string) => {
    setLines((currentLines) => {
      if (currentLines.length === 1) {
        return currentLines;
      }
      return currentLines.filter((line) => line.id !== lineId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const normalizedLines = lines.map((line) => {
        const quantityValue = Number(line.quantityOrdered) || 0;
        const unitPriceValue = Number(line.unitPrice) || 0;
        return {
          itemUid: line.itemUid,
          quantityOrdered: quantityValue,
          unitPrice: unitPriceValue,
          lineTotal: quantityValue * unitPriceValue,
          notes: line.lineNotes || undefined,
        };
      });

      const hasInvalidLine = normalizedLines.some(
        (line) => !line.itemUid || line.quantityOrdered <= 0 || line.unitPrice <= 0,
      );

      if (!poNumber || !supplierName || !orderDate || !normalizedLines.length || hasInvalidLine) {
        return toast.error("Please complete the PO header and line details.");
      }

      await createPO.mutateAsync({
        poNumber,
        supplierName,
        supplierPhone: supplierPhone || undefined,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        totalAmount,
        status: "DRAFT",
        notes: notes || undefined,
        lines: normalizedLines,
      });
      toast.success("Purchase order created successfully");
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to create PO", { description: err.message });
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-5" : "space-y-4 py-4"}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>PO Number</Label>
          <Input required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Order Date</Label>
          <Input required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Supplier Name</Label>
          <Input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Supplier Phone</Label>
          <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Expected Delivery Date</Label>
          <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
        </div>
        <div className="space-y-4 md:col-span-3">
          <Label>PO Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border border-border p-4 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold">PO Lines</h4>
          <div className="text-sm font-medium text-foreground">Total: {formatCurrency(totalAmount)}</div>
        </div>
        <div className="space-y-4">
          {lines.map((line, index) => {
            const selectedItem = items.find((item) => item.itemUid === line.itemUid);
            const quantityValue = Number(line.quantityOrdered) || 0;
            const unitPriceValue = Number(line.unitPrice) || 0;
            const lineTotal = quantityValue * unitPriceValue;

            return (
              <div key={line.id} className="rounded-md border border-border/70 bg-muted/20 p-4 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Line {index + 1}</div>
                    <div className="text-xs text-muted-foreground">Total {formatCurrency(lineTotal)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    className="self-start text-muted-foreground"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />Remove
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Catalogue Item</Label>
                    <Select value={line.itemUid} onValueChange={(value) => updateLine(line.id, "itemUid", value)}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.itemUid} value={item.itemUid}>
                            {item.itemCode} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Ordered</Label>
                    <Input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantityOrdered}
                      onChange={(e) => updateLine(line.id, "quantityOrdered", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line Total</Label>
                    <Input value={lineTotal ? lineTotal.toFixed(2) : ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Item Details</Label>
                    <Input
                      value={selectedItem ? `${selectedItem.metalName || ""} ${selectedItem.purityLabel || ""}`.trim() || selectedItem.name : ""}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Line Notes</Label>
                    <Textarea rows={2} value={line.lineNotes} onChange={(e) => updateLine(line.id, "lineNotes", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 h-4 w-4" />Add Line Item
          </Button>
        </div>
      </div>

      <DialogFooter className={embedded ? "border-t border-border pt-4" : "mt-6"}>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={createPO.isPending}>Create PO</Button>
      </DialogFooter>
    </form>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
