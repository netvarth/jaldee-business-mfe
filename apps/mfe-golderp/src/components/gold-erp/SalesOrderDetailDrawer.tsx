import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Banknote, CheckCircle, FileText, Percent, RefreshCcw } from "lucide-react";
import {
  useAddAdvance,
  useAddDiscount,
  useAddOldGold,
  useConfirmSalesOrder,
  useInvoiceSalesOrder,
  useSalesOrderDetails,
} from "@/hooks/useSales";
import { StatusBadge } from "./StatusBadge";
import { calculateOrderTotals, formatCurrency, formatDate } from "@/lib/gold-erp-utils";

interface Props {
  order: any | null;
  onClose: () => void;
  onPrintInvoice: (order: any) => void;
}

export function SalesOrderDetailDrawer({ order, onClose, onPrintInvoice }: Props) {
  const orderUid = order?.orderUid || null;
  const { data: liveOrder } = useSalesOrderDetails(orderUid);
  const resolvedOrder = liveOrder || order;

  const addAdvance = useAddAdvance();
  const addOldGold = useAddOldGold();
  const addDiscount = useAddDiscount();
  const confirmOrder = useConfirmSalesOrder();
  const invoiceOrder = useInvoiceSalesOrder();

  const [activeForm, setActiveForm] = useState<"none" | "advance" | "oldGold" | "discount">("none");
  const [advAmount, setAdvAmount] = useState("");
  const [advMode, setAdvMode] = useState("CASH");
  const [advReferenceNumber, setAdvReferenceNumber] = useState("");
  const [advPaymentDate, setAdvPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [advNotes, setAdvNotes] = useState("");
  const [ogMetalType, setOgMetalType] = useState("Gold");
  const [ogPurityLabel, setOgPurityLabel] = useState("22 Karat");
  const [ogGross, setOgGross] = useState("");
  const [ogNet, setOgNet] = useState("");
  const [ogRate, setOgRate] = useState("");
  const [ogValue, setOgValue] = useState("");
  const [discType, setDiscType] = useState("FLAT");
  const [discValue, setDiscValue] = useState("");
  const [discReason, setDiscReason] = useState("");

  if (!resolvedOrder) return null;

  const totals = calculateOrderTotals(resolvedOrder);
  const isEditable = resolvedOrder.status === "DRAFT";

  const handleConfirm = async () => {
    try {
      await confirmOrder.mutateAsync(resolvedOrder.orderUid);
      toast.success("Sales order confirmed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleInvoice = async () => {
    try {
      await invoiceOrder.mutateAsync(resolvedOrder.orderUid);
      toast.success("Invoice generated successfully");
      onPrintInvoice(resolvedOrder);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const submitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAdvance.mutateAsync({
        orderUid: resolvedOrder.orderUid,
        data: {
          amount: Number(advAmount),
          paymentMode: advMode,
          referenceNumber: advReferenceNumber || undefined,
          paymentDate: advPaymentDate || undefined,
          notes: advNotes || undefined,
        },
      });
      toast.success("Payment recorded");
      setActiveForm("none");
      setAdvAmount("");
      setAdvReferenceNumber("");
      setAdvPaymentDate(new Date().toISOString().split("T")[0]);
      setAdvNotes("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const submitOldGold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addOldGold.mutateAsync({
        orderUid: resolvedOrder.orderUid,
        data: {
          metalType: ogMetalType,
          purityLabel: ogPurityLabel,
          grossWt: Number(ogGross),
          netWt: Number(ogNet),
          rateApplied: Number(ogRate),
          exchangeValue: Number(ogValue),
        },
      });
      toast.success("Metal exchange recorded");
      setActiveForm("none");
      setOgGross("");
      setOgNet("");
      setOgRate("");
      setOgValue("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const submitDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numericValue = Number(discValue);
      const discountAmount = discType === "PERCENTAGE" ? (totals.lineTotal * numericValue) / 100 : numericValue;
      await addDiscount.mutateAsync({
        orderUid: resolvedOrder.orderUid,
        data: {
          discountType: discType as "PER_GRAM" | "FLAT" | "PERCENTAGE",
          discountValue: numericValue,
          discountAmount,
          reason: discReason || undefined,
        },
      });
      toast.success("Order discount applied");
      setActiveForm("none");
      setDiscValue("");
      setDiscReason("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-xl">Order: {resolvedOrder.orderNumber}</SheetTitle>
              <div className="text-sm text-muted-foreground mt-1">{resolvedOrder.customerName} • {resolvedOrder.customerPhone || "No phone"}</div>
            </div>
            <StatusBadge status={resolvedOrder.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/20 p-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Order Number</div>
              <div className="mt-1 font-semibold text-foreground">{resolvedOrder.orderNumber}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Order Date</div>
              <div className="mt-1 font-medium text-foreground">{formatDate(resolvedOrder.orderDate)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Order Type</div>
              <div className="mt-1 font-medium text-foreground">{resolvedOrder.orderType || "Walk-in"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Customer Phone</div>
              <div className="mt-1 font-medium text-foreground">{resolvedOrder.customerPhone || "Not provided"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
              <div className="mt-1 text-foreground">{resolvedOrder.notes || "No order notes added."}</div>
            </div>
          </div>

          {isEditable && activeForm === "none" && (
            <div className="bg-muted/30 p-3 rounded-md border border-border flex justify-between items-center">
              <span className="text-sm">This draft order already contains its reserved tags, payments, exchange entries, or discounts. Confirm it.</span>
              <Button size="sm" onClick={handleConfirm} disabled={confirmOrder.isPending || !resolvedOrder.lines?.length}>
                <CheckCircle className="w-4 h-4 mr-1" />Confirm Order
              </Button>
            </div>
          )}

          {resolvedOrder.status === "CONFIRMED" && (
            <div className="bg-primary/10 p-3 rounded-md border border-primary/20 flex justify-between items-center text-primary">
              <span className="text-sm font-medium">Order confirmed. Ready for invoicing.</span>
              <Button size="sm" onClick={handleInvoice} disabled={invoiceOrder.isPending}>
                <FileText className="w-4 h-4 mr-1" />Generate Invoice
              </Button>
            </div>
          )}

          {resolvedOrder.status === "INVOICED" && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onPrintInvoice(resolvedOrder)}>
              <FileText className="w-4 h-4 mr-2" />Print Invoice Copy
            </Button>
          )}

          {/* {isEditable && activeForm === "none" && (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-10 text-xs px-1" onClick={() => setActiveForm("oldGold")}><RefreshCcw className="w-3.5 h-3.5 mr-1" />Old Gold</Button>
              <Button variant="outline" size="sm" className="h-10 text-xs px-1" onClick={() => setActiveForm("discount")}><Percent className="w-3.5 h-3.5 mr-1" />Discount</Button>
              <Button variant="outline" size="sm" className="h-10 text-xs px-1" onClick={() => setActiveForm("advance")}><Banknote className="w-3.5 h-3.5 mr-1" />Payment</Button>
            </div>
          )} */}

          {activeForm === "advance" && (
            <form onSubmit={submitAdvance} className="bg-muted p-4 rounded-md border border-border space-y-3">
              <h4 className="font-semibold text-sm">Record Payment</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mode</Label>
                  <Select value={advMode} onValueChange={setAdvMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Reference Number</Label>
                  <Input value={advReferenceNumber} onChange={(e) => setAdvReferenceNumber(e.target.value)} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" value={advPaymentDate} onChange={(e) => setAdvPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Input value={advNotes} onChange={(e) => setAdvNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveForm("none")}>Cancel</Button>
                <Button type="submit" size="sm" disabled={addAdvance.isPending}>Record Payment</Button>
              </div>
            </form>
          )}

          {activeForm === "oldGold" && (
            <form onSubmit={submitOldGold} className="bg-muted p-4 rounded-md border border-border space-y-3">
              <h4 className="font-semibold text-sm">Metal Exchange</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Metal Type</Label>
                  <Input value={ogMetalType} onChange={(e) => setOgMetalType(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Purity Label</Label>
                  <Input value={ogPurityLabel} onChange={(e) => setOgPurityLabel(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gross Wt</Label>
                  <Input type="number" step="0.001" value={ogGross} onChange={(e) => setOgGross(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Net Wt</Label>
                  <Input type="number" step="0.001" value={ogNet} onChange={(e) => setOgNet(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rate Applied</Label>
                  <Input type="number" value={ogRate} onChange={(e) => setOgRate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Exchange Value</Label>
                  <Input type="number" value={ogValue} onChange={(e) => setOgValue(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveForm("none")}>Cancel</Button>
                <Button type="submit" size="sm" disabled={addOldGold.isPending}>Record Exchange</Button>
              </div>
            </form>
          )}

          {activeForm === "discount" && (
            <form onSubmit={submitDiscount} className="bg-muted p-4 rounded-md border border-border space-y-3">
              <h4 className="font-semibold text-sm">Order Discount</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={discType} onValueChange={setDiscType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input type="number" value={discValue} onChange={(e) => setDiscValue(e.target.value)} required />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Reason</Label>
                  <Input value={discReason} onChange={(e) => setDiscReason(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveForm("none")}>Cancel</Button>
                <Button type="submit" size="sm" disabled={addDiscount.isPending}>Apply Discount</Button>
              </div>
            </form>
          )}

          {resolvedOrder.lines?.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">Items ({resolvedOrder.lines.length})</div>
              {resolvedOrder.lines.map((line: any) => (
                <div key={line.lineUid || line.tagUid} className="border-b border-border last:border-0 bg-background px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-foreground">{line.tagNumber || line.itemName || line.tagUid}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {line.itemName || line.itemCode || "Unnamed item"} {line.itemCode ? `• ${line.itemCode}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(line.finalPrice || line.sellingPrice || line.lineTotal || 0)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Final line value</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Gross Weight:</span>{" "}
                      <span className="font-medium text-foreground">{line.grossWt ?? 0} g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Weight:</span>{" "}
                      <span className="font-medium text-foreground">{line.netWt ?? 0} g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rate / Gram:</span>{" "}
                      <span className="font-medium text-foreground">{formatCurrency(line.sellingRatePerGram ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Selling Price:</span>{" "}
                      <span className="font-medium text-foreground">{formatCurrency(line.sellingPrice || line.lineTotal || 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Line Discount:</span>{" "}
                      <span className="font-medium text-foreground">{formatCurrency(line.discountAmount ?? line.discountOnLine ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tag UID:</span>{" "}
                      <span className="font-mono text-foreground">{line.tagUid || "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedOrder.advances?.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">Payments Recorded ({resolvedOrder.advances.length})</div>
              <div className="divide-y divide-border">
                {resolvedOrder.advances.map((advance: any) => (
                  <div key={advance.advanceUid} className="bg-background px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{advance.paymentMode || "Payment"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {advance.paymentDate ? formatDate(advance.paymentDate) : "No payment date"}
                          {advance.referenceNumber ? ` • Ref: ${advance.referenceNumber}` : ""}
                        </div>
                        {advance.notes && <div className="mt-2 text-xs text-muted-foreground">{advance.notes}</div>}
                      </div>
                      <div className="font-semibold tabular-nums text-green-700">{formatCurrency(advance.amount || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedOrder.oldGoldEntries?.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">Metal Exchanges ({resolvedOrder.oldGoldEntries.length})</div>
              <div className="divide-y divide-border">
                {resolvedOrder.oldGoldEntries.map((entry: any) => (
                  <div key={entry.exchangeUid} className="bg-background px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{entry.metalType} • {entry.purityLabel}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Gross {entry.grossWt ?? 0} g • Net {entry.netWt ?? 0} g • Rate {formatCurrency(entry.rateApplied ?? 0)}
                        </div>
                        {entry.notes && <div className="mt-2 text-xs text-muted-foreground">{entry.notes}</div>}
                      </div>
                      <div className="font-semibold tabular-nums text-yellow-700">{formatCurrency(entry.exchangeValue || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedOrder.discounts?.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold border-b border-border">Discounts Applied ({resolvedOrder.discounts.length})</div>
              <div className="divide-y divide-border">
                {resolvedOrder.discounts.map((discount: any) => (
                  <div key={discount.discountUid} className="bg-background px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{discount.discountType}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Value {discount.discountValue ?? 0}
                          {discount.reason ? ` • ${discount.reason}` : ""}
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums text-red-500">{formatCurrency(discount.discountAmount || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-background rounded-md border border-border p-4 space-y-2 text-sm mt-6">
            <div className="flex justify-between text-muted-foreground"><span>Total Items Value:</span> <span>{formatCurrency(totals.lineTotal)}</span></div>
            {totals.discountTotal > 0 && <div className="flex justify-between text-red-500"><span>Order Discount:</span> <span>- {formatCurrency(totals.discountTotal)}</span></div>}
            {totals.oldGoldTotal > 0 && <div className="flex justify-between text-yellow-700"><span>Exchange Offset:</span> <span>- {formatCurrency(totals.oldGoldTotal)}</span></div>}
            {totals.advanceTotal > 0 && <div className="flex justify-between text-green-700"><span>Payments Recorded:</span> <span>- {formatCurrency(totals.advanceTotal)}</span></div>}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
              <span>Total Payable / Balance:</span>
              <span>{formatCurrency(resolvedOrder.balanceDue ?? totals.payable)}</span>
            </div>
            <div className="text-xs text-muted-foreground">Order date: {formatDate(resolvedOrder.orderDate)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
