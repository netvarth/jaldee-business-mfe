import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTags } from "@/hooks/useInventory";
import { useAddAdvance, useAddDiscount, useAddOldGold, useCreateSalesOrder } from "@/hooks/useSales";
import { useMetals, usePurities } from "@/hooks/useMasterData";
import { ChargeType, JewelleryTag, OrderType } from "@/lib/gold-erp-types";
import { formatCurrency } from "@/lib/gold-erp-utils";
import { useNavigate } from "react-router-dom";

interface SalesLineDraft {
  id: string;
  selectedTagInput: string;
  tagUid: string;
  tagNumber: string;
  itemCode: string;
  itemName: string;
  grossWt: string;
  netWt: string;
  sellingPrice: string;
  discountOnLine: string;
}

const createSalesLine = (): SalesLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  selectedTagInput: "",
  tagUid: "",
  tagNumber: "",
  itemCode: "",
  itemName: "",
  grossWt: "",
  netWt: "",
  sellingPrice: "",
  discountOnLine: "0",
});

const buildSalesLineFromTag = (tag: JewelleryTag): SalesLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  selectedTagInput: tag.tagUid,
  tagUid: tag.tagUid,
  tagNumber: tag.tagNumber || tag.barcode || "",
  itemCode: tag.itemCode || "",
  itemName: tag.itemName || "",
  grossWt: String(tag.grossWt || tag.grossWeight || ""),
  netWt: String(tag.netWt || tag.netWeight || ""),
  sellingPrice: String(tag.sellingPrice || ""),
  discountOnLine: "0",
});

export default function SalesOrderCreatePage() {
  const navigate = useNavigate();
  const createSalesOrder = useCreateSalesOrder();
  const addAdvance = useAddAdvance();
  const addOldGold = useAddOldGold();
  const addDiscount = useAddDiscount();
  const { data: allTags = [] } = useTags();
  const { data: metals = [] } = useMetals();
  const { data: purities = [] } = usePurities();

  const [orderNumber, setOrderNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("WALK_IN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [salesLines, setSalesLines] = useState<SalesLineDraft[]>([createSalesLine()]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("NONE");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedMetalUid, setSelectedMetalUid] = useState("");
  const [selectedPurityUid, setSelectedPurityUid] = useState("");
  const [oldGoldGrossWt, setOldGoldGrossWt] = useState("");
  const [oldGoldNetWt, setOldGoldNetWt] = useState("");
  const [rateApplied, setRateApplied] = useState("");
  const [exchangeValue, setExchangeValue] = useState("");
  const [discountType, setDiscountType] = useState<ChargeType | "NONE">("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [scannerStatus, setScannerStatus] = useState<"ready" | "capturing">("ready");
  const scanBufferRef = useRef("");
  const lastScanKeyAtRef = useRef(0);
  const scannerResetTimerRef = useRef<number | null>(null);

  const inStockTags = useMemo(
    () => allTags.filter((tag: JewelleryTag) => tag.status === "IN_STOCK"),
    [allTags],
  );
  const availablePurities = useMemo(
    () => purities.filter((purity) => !selectedMetalUid || purity.metalUid === selectedMetalUid),
    [purities, selectedMetalUid],
  );
  const selectedMetal = metals.find((metal) => metal.metalUid === selectedMetalUid);
  const selectedPurity = purities.find((purity) => purity.purityUid === selectedPurityUid);

  const selectedTagUids = salesLines.map((line) => line.tagUid).filter(Boolean);

  const findTagFromInput = (rawInput: string) => {
    const normalizedInput = rawInput.trim().toLowerCase();
    if (!normalizedInput) {
      return null;
    }

    return inStockTags.find((tag) =>
      [
        tag.tagUid,
        tag.tagNumber,
        tag.barcode,
        tag.itemCode,
      ]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === normalizedInput),
    ) || null;
  };

  const updateSalesLine = (lineId: string, field: keyof SalesLineDraft, value: string) => {
    setSalesLines((currentLines) =>
      currentLines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    );
  };

  const handleSelectTag = (lineId: string, tagInput: string) => {
    const selectedTag = findTagFromInput(tagInput);
    setSalesLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        if (!selectedTag) {
          return {
            ...line,
            selectedTagInput: tagInput,
            tagUid: "",
            tagNumber: "",
            itemCode: "",
            itemName: "",
            grossWt: "",
            netWt: "",
            sellingPrice: "",
            discountOnLine: "0",
          };
        }

        return {
          ...line,
          ...buildSalesLineFromTag(selectedTag),
          id: line.id,
        };
      }),
    );
  };

  const handleScannedTag = (rawInput: string) => {
    const selectedTag = findTagFromInput(rawInput);
    if (!selectedTag) {
      toast.error("Scanned tag was not found in available in-stock inventory.");
      return;
    }

    if (selectedTagUids.includes(selectedTag.tagUid)) {
      toast.error("This tag is already added to the sales order.");
      return;
    }

    setSalesLines((currentLines) => {
      const emptyLineIndex = currentLines.findIndex((line) => !line.tagUid && !line.selectedTagInput.trim());
      if (emptyLineIndex >= 0) {
        return currentLines.map((line, index) =>
          index === emptyLineIndex
            ? {
                ...line,
                ...buildSalesLineFromTag(selectedTag),
                id: line.id,
              }
            : line,
        );
      }

      return [...currentLines, buildSalesLineFromTag(selectedTag)];
    });
    toast.success(`Added tag ${selectedTag.tagNumber || selectedTag.barcode || selectedTag.tagUid}`);
  };

  useEffect(() => {
    const clearScannerTimer = () => {
      if (scannerResetTimerRef.current !== null) {
        window.clearTimeout(scannerResetTimerRef.current);
        scannerResetTimerRef.current = null;
      }
    };

    const scheduleScannerReady = () => {
      clearScannerTimer();
      scannerResetTimerRef.current = window.setTimeout(() => {
        setScannerStatus("ready");
      }, 250);
    };

    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextAreaTarget = Boolean(target && target instanceof HTMLTextAreaElement);
      const isSelectTarget = Boolean(target && target instanceof HTMLSelectElement);
      const isContentEditableTarget = Boolean(target?.isContentEditable);
      const isInputTarget = Boolean(target && target instanceof HTMLInputElement);
      const isEditableTarget = isInputTarget || isTextAreaTarget || isSelectTarget || isContentEditableTarget;

      if (event.key === "Escape") {
        scanBufferRef.current = "";
        setScannerStatus("ready");
        clearScannerTimer();
        return;
      }

      if (event.key === "Enter") {
        const scannedValue = scanBufferRef.current.trim();
        scanBufferRef.current = "";
        setScannerStatus("ready");
        clearScannerTimer();
        if (!scannedValue || isTextAreaTarget || isSelectTarget || isContentEditableTarget) {
          return;
        }
        event.preventDefault();
        handleScannedTag(scannedValue);
        return;
      }

      if (isTextAreaTarget || isSelectTarget || isContentEditableTarget || event.key.length !== 1) {
        return;
      }

      const now = Date.now();
      const delta = now - lastScanKeyAtRef.current;
      if (delta > 150) {
        scanBufferRef.current = "";
      }
      const isScannerLike = delta <= 60 || scanBufferRef.current.length > 0;
      lastScanKeyAtRef.current = now;

      if (!isScannerLike) {
        return;
      }

      if (isEditableTarget) {
        event.preventDefault();
      }

      setScannerStatus("capturing");
      scanBufferRef.current += event.key;
      scheduleScannerReady();
    };

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      clearScannerTimer();
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [handleScannedTag]);

  const addSalesLine = () => {
    setSalesLines((currentLines) => [...currentLines, createSalesLine()]);
  };

  const removeSalesLine = (lineId: string) => {
    setSalesLines((currentLines) => (currentLines.length === 1 ? currentLines : currentLines.filter((line) => line.id !== lineId)));
  };

  const lineTotals = useMemo(
    () =>
      salesLines.map((line) => {
        const sellingPrice = Number(line.sellingPrice) || 0;
        const discountOnLine = Number(line.discountOnLine) || 0;
        return Math.max(sellingPrice - discountOnLine, 0);
      }),
    [salesLines],
  );

  const totalAmount = lineTotals.reduce((sum, value) => sum + value, 0);
  const advancePaid = Number(advanceAmount) || 0;
  const oldGoldDeduction = Number(exchangeValue) || 0;
  const headerDiscountAmount = Number(discountAmount) || 0;
  const balanceDue = Math.max(totalAmount - advancePaid - oldGoldDeduction - headerDiscountAmount, 0);

  const resetForm = () => {
    setOrderNumber("");
    setOrderType("WALK_IN");
    setCustomerName("");
    setCustomerPhone("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setSalesLines([createSalesLine()]);
    setAdvanceAmount("");
    setPaymentMode("NONE");
    setReferenceNumber("");
    setSelectedMetalUid("");
    setSelectedPurityUid("");
    setOldGoldGrossWt("");
    setOldGoldNetWt("");
    setRateApplied("");
    setExchangeValue("");
    setDiscountType("NONE");
    setDiscountValue("");
    setDiscountAmount("");
    setDiscountReason("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!orderNumber.trim() || !customerName.trim() || !orderDate) {
      toast.error("Order number, customer name, and order date are required.");
      return;
    }

    const normalizedLines = salesLines.map((line, index) => ({
      tagUid: line.tagUid,
      grossWt: Number(line.grossWt) || 0,
      netWt: Number(line.netWt) || 0,
      sellingPrice: Number(line.sellingPrice) || 0,
      discountOnLine: Number(line.discountOnLine) || 0,
      finalPrice: lineTotals[index],
    }));

    const hasInvalidLine = normalizedLines.some((line) => !line.tagUid || line.sellingPrice <= 0);
    if (!normalizedLines.length || hasInvalidLine) {
      toast.error("Each sale line needs a selected tag and selling price.");
      return;
    }

    const hasAdvanceInput = Boolean(advanceAmount || paymentMode !== "NONE" || referenceNumber);
    if (hasAdvanceInput && (advancePaid <= 0 || paymentMode === "NONE")) {
      toast.error("Advance amount and payment mode are required when advance payment is used.");
      return;
    }
    if (advancePaid >= totalAmount && totalAmount > 0) {
      toast.error("Advance amount must be less than the total amount.");
      return;
    }

    const hasOldGoldInput = Boolean(selectedMetalUid || selectedPurityUid || oldGoldGrossWt || oldGoldNetWt || rateApplied || exchangeValue);
    if (
      hasOldGoldInput &&
      (!selectedMetal || !selectedPurity || Number(oldGoldGrossWt) <= 0 || Number(oldGoldNetWt) <= 0 || Number(rateApplied) <= 0 || Number(exchangeValue) <= 0)
    ) {
      toast.error("Complete all metal exchange fields when using that section.");
      return;
    }

    const hasDiscountInput = Boolean(discountType !== "NONE" || discountValue || discountAmount || discountReason);
    if (hasDiscountInput && (Number(discountValue) <= 0 || Number(discountAmount) <= 0)) {
      toast.error("Discount value and amount are required when using the discount section.");
      return;
    }
    if (hasDiscountInput && discountType === "NONE") {
      toast.error("Choose a discount type when using the discount section.");
      return;
    }

    try {
      const order = await createSalesOrder.mutateAsync({
        orderNumber: orderNumber.trim(),
        orderType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        orderDate,
        totalAmount,
        discountAmount: headerDiscountAmount || undefined,
        oldGoldDeduction: oldGoldDeduction || undefined,
        advancePaid: advancePaid || undefined,
        balanceDue,
        status: "DRAFT",
        notes: notes.trim() || undefined,
        lines: normalizedLines,
      });

      if (hasAdvanceInput) {
        await addAdvance.mutateAsync({
          orderUid: order.orderUid,
          data: {
            amount: advancePaid,
            paymentMode,
            referenceNumber: referenceNumber.trim() || undefined,
            paymentDate: orderDate,
          },
        });
      }

      if (hasOldGoldInput) {
        await addOldGold.mutateAsync({
          orderUid: order.orderUid,
          data: {
            metalType: selectedMetal!.name,
            purityLabel: selectedPurity!.label,
            grossWt: Number(oldGoldGrossWt),
            netWt: Number(oldGoldNetWt),
            rateApplied: Number(rateApplied),
            exchangeValue: Number(exchangeValue),
          },
        });
      }

      if (hasDiscountInput) {
        await addDiscount.mutateAsync({
            orderUid: order.orderUid,
            data: {
            discountType: discountType as ChargeType,
            discountValue: Number(discountValue),
            discountAmount: headerDiscountAmount,
            reason: discountReason.trim() || undefined,
          },
        });
      }

      toast.success("Sales order created successfully");
      resetForm();
      navigate("/sales");
    } catch (error: any) {
      toast.error("Failed to create sales order", { description: error.message });
    }
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="New Sales Order" subtitle="Create the order first, then attach optional advance, metal exchange, and discount." />

      <SectionCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(value) => setOrderType(value as OrderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk In</SelectItem>
                  <SelectItem value="ADVANCE">Advance</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">Sale Lines</div>
                <div className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Scanner {scannerStatus === "capturing" ? "capturing" : "ready"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Scan a tag while the page is focused, or add one manually from available in-stock tags.</div>
              <div className="text-xs text-muted-foreground">Fast scanner input followed by Enter will add the tag directly and show a toast.</div>
            </div>

            {salesLines.map((line, index) => {
              const availableTags = inStockTags.filter(
                (tag) => !selectedTagUids.includes(tag.tagUid) || tag.tagUid === line.tagUid,
              );
              const finalPrice = lineTotals[index];

              return (
                <div key={line.id} className="space-y-4 rounded-md border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">Tag Line {index + 1}</div>
                      <div className="text-xs text-muted-foreground">{line.itemName || "Select an inventory tag to populate the sale line."}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSalesLine(line.id)} disabled={salesLines.length === 1}>
                      <Trash2 className="mr-1 h-4 w-4" />Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-3">
                      <Label>Select Tag</Label>
                      <Input
                        list={`sales-tags-${line.id}`}
                        value={line.selectedTagInput}
                        onChange={(e) => handleSelectTag(line.id, e.target.value)}
                        placeholder="Search by tag UID, number, or item from available in-stock tags"
                      />
                      <datalist id={`sales-tags-${line.id}`}>
                        {availableTags.map((tag) => (
                          <option key={tag.tagUid} value={tag.tagUid}>
                            {(tag.tagNumber || tag.barcode || tag.tagUid)} - {tag.itemName}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label>Tag UID *</Label>
                      <Input value={line.tagUid} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag Number</Label>
                      <Input value={line.tagNumber} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Item Code</Label>
                      <Input value={line.itemCode} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input value={line.itemName} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Gross Wt (g)</Label>
                      <Input value={line.grossWt} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Net Wt (g)</Label>
                      <Input value={line.netWt} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price (Rs) *</Label>
                      <Input type="number" min="0" step="0.01" value={line.sellingPrice} onChange={(e) => updateSalesLine(line.id, "sellingPrice", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount on Line (Rs)</Label>
                      <Input type="number" min="0" step="0.01" value={line.discountOnLine} onChange={(e) => updateSalesLine(line.id, "discountOnLine", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Final Price (Rs)</Label>
                      <Input value={finalPrice ? finalPrice.toFixed(2) : "0.00"} readOnly />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-start">
              <Button type="button" variant="outline" size="sm" onClick={addSalesLine}>
                <Plus className="mr-1 h-4 w-4" />Add Tag
              </Button>
            </div>
          </div>

          <SectionCard title="Optional: Advance Payment" className="border border-border/70 shadow-none">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Advance Amount (Rs)</Label>
                <Input type="number" min="0" step="0.01" max={totalAmount > 0 ? Math.max(totalAmount - 0.01, 0) : undefined} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Optional: Metal Exchange" className="border border-border/70 shadow-none">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Metal Type</Label>
                <Select
                  value={selectedMetalUid}
                  onValueChange={(value) => {
                    setSelectedMetalUid(value);
                    setSelectedPurityUid("");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                  <SelectContent>
                    {metals.map((metal) => (
                      <SelectItem key={metal.metalUid} value={metal.metalUid}>
                        {metal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purity Label</Label>
                <Select value={selectedPurityUid} onValueChange={setSelectedPurityUid} disabled={!selectedMetalUid}>
                  <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                  <SelectContent>
                    {availablePurities.map((purity) => (
                      <SelectItem key={purity.purityUid} value={purity.purityUid}>
                        {purity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gross Wt (g)</Label>
                <Input type="number" min="0" step="0.001" value={oldGoldGrossWt} onChange={(e) => setOldGoldGrossWt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Net Wt (g)</Label>
                <Input type="number" min="0" step="0.001" value={oldGoldNetWt} onChange={(e) => setOldGoldNetWt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rate Applied (Rs/g)</Label>
                <Input type="number" min="0" step="0.01" value={rateApplied} onChange={(e) => setRateApplied(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Exchange Value (Rs)</Label>
                <Input type="number" min="0" step="0.01" value={exchangeValue} onChange={(e) => setExchangeValue(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Optional: Discount" className="border border-border/70 shadow-none">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(value) => setDiscountType(value as ChargeType | "NONE")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="FLAT">Flat</SelectItem>
                    <SelectItem value="PER_GRAM">Per Gram</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discount Amount (Rs)</Label>
                <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Order Summary" className="border border-border/70 shadow-none">
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div><span className="block text-xs text-muted-foreground">Line Total</span>{formatCurrency(totalAmount)}</div>
              <div><span className="block text-xs text-muted-foreground">Advance Paid</span>{formatCurrency(advancePaid)}</div>
              <div><span className="block text-xs text-muted-foreground">Exchange Deduction</span>{formatCurrency(oldGoldDeduction)}</div>
              <div><span className="block text-xs text-muted-foreground">Header Discount</span>{formatCurrency(headerDiscountAmount)}</div>
              <div className="md:col-span-3"><span className="block text-xs text-muted-foreground">Balance Due</span><span className="text-lg font-semibold text-foreground">{formatCurrency(balanceDue)}</span></div>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={resetForm}>Reset</Button>
            <Button
              type="submit"
              disabled={createSalesOrder.isPending || addAdvance.isPending || addOldGold.isPending || addDiscount.isPending}
            >
              Create Sales Order
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
