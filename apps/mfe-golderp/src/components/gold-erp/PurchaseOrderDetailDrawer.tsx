import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirmGRN, useCreateDraftTag, useCreateGRN, useDraftTags, usePurchaseOrderDetails, usePurchaseOrderGrns, useUpdatePOStatus, useAddDraftTagStone } from "@/hooks/usePurchase";
import { useItems } from "@/hooks/useCatalogue";
import { useStones } from "@/hooks/useMasterData";
import { StatusBadge } from "./StatusBadge";
import { EmptyStateBlock } from "./EmptyStateBlock";
import { CheckCircle, PackagePlus, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/gold-erp-utils";
import { PurchaseOrder } from "@/lib/gold-erp-types";

interface Props {
  po: PurchaseOrder | null;
  onClose: () => void;
  embedded?: boolean;
}

interface DraftStoneFormLine {
  id: string;
  stoneUid: string;
  count: string;
}

const createStoneLine = (): DraftStoneFormLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  stoneUid: "",
  count: "1",
});

function DraftTagsSection({ grnUid }: { grnUid: string }) {
  const { data: tags = [], isLoading } = useDraftTags(grnUid);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading draft tags...</div>;
  }

  if (!tags.length) {
    return <EmptyStateBlock title="No draft tags" description="Add physical pieces under this GRN before confirmation." className="py-6 border border-dashed rounded-md" />;
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <div key={tag.draftTagUid} className="bg-background border border-border rounded p-3 text-xs shadow-sm flex justify-between gap-3">
          <div>
            <div className="font-semibold">{tag.tagNumber || tag.itemCode || tag.itemUid}</div>
            <div className="text-muted-foreground">{tag.itemName || tag.itemCode || tag.itemUid}</div>
            <div className="text-muted-foreground">{formatWeight(tag.grossWt || 0)} / {formatWeight(tag.netWt || 0)}</div>
          </div>
          <div className="text-right text-muted-foreground">
            <div>Stone {formatWeight(tag.stoneWt || 0)}</div>
            <div>Wastage {formatWeight(tag.wastageWt || 0)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GrnDraftActions({
  grnUid,
  grnStatus,
  onAddDraftTag,
  onFinalize,
  finalizePending,
}: {
  grnUid: string;
  grnStatus: string;
  onAddDraftTag: () => void;
  onFinalize: () => void;
  finalizePending: boolean;
}) {
  const { data: tags = [], isLoading } = useDraftTags(grnUid);
  const hasDraftTags = tags.length > 0;

  if (grnStatus !== "DRAFT") {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onAddDraftTag}>
        <Plus className="w-3.5 h-3.5 mr-1" />Add Draft Tag
      </Button>
      <Button size="sm" onClick={onFinalize} disabled={finalizePending || isLoading || !hasDraftTags}>
        Finalize GRN
      </Button>
    </>
  );
}

export function PurchaseOrderDetailDrawer({ po, onClose, embedded = false }: Props) {
  const updatePOStatus = useUpdatePOStatus();
  const createGRN = useCreateGRN();
  const confirmGRN = useConfirmGRN();
  const createDraftTag = useCreateDraftTag();
  const addDraftTagStone = useAddDraftTagStone();
  const { data: items = [] } = useItems();
  const { data: stones = [] } = useStones();
  const { data: poDetails } = usePurchaseOrderDetails(po?.poUid || null);
  const { data: grns = [] } = usePurchaseOrderGrns(po?.poUid || null);

  const [activeForm, setActiveForm] = useState<"none" | "grn" | "tag">("none");
  const [activeGrnUid, setActiveGrnUid] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedBy, setReceivedBy] = useState("");
  const [totalPieces, setTotalPieces] = useState("1");
  const [grnNotes, setGrnNotes] = useState("");
  const [tagItemUid, setTagItemUid] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [grossWt, setGrossWt] = useState("");
  const [netWt, setNetWt] = useState("");
  const [stoneWt, setStoneWt] = useState("");
  const [wastageWt, setWastageWt] = useState("");
  const [tagNotes, setTagNotes] = useState("");
  const [draftStoneLines, setDraftStoneLines] = useState<DraftStoneFormLine[]>([]);

  if (!po) return null;

  const resolvedPo = poDetails || po;
  const lineItemUids = new Set((resolvedPo.lines || []).map((line) => line.itemUid));
  const itemOptions = items.filter((item) => lineItemUids.has(item.itemUid));
  const selectedTagItem = itemOptions.find((item) => item.itemUid === tagItemUid);

  const resetDraftTagForm = () => {
    setTagItemUid("");
    setTagNumber("");
    setGrossWt("");
    setNetWt("");
    setStoneWt("");
    setWastageWt("");
    setTagNotes("");
    setDraftStoneLines([]);
  };

  const handleConfirmPO = async () => {
    try {
      await updatePOStatus.mutateAsync({ poUid: po.poUid, status: "CONFIRMED" });
      toast.success("Purchase order confirmed");
    } catch (err: any) {
      toast.error("Failed to confirm PO", { description: err.message });
    }
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGRN.mutateAsync({
        grnNumber,
        poUid: po.poUid,
        supplierName: resolvedPo.supplierName,
        receivedDate: grnDate,
        receivedBy: receivedBy || undefined,
        totalPieces: Number(totalPieces) || 0,
        status: "DRAFT",
        notes: grnNotes || undefined,
      });
      toast.success("GRN created successfully");
      setActiveForm("none");
      setGrnNumber("");
      setReceivedBy("");
      setTotalPieces("1");
      setGrnNotes("");
    } catch (err: any) {
      toast.error("Failed to create GRN", { description: err.message });
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const normalizedStoneLines = draftStoneLines
        .map((line) => ({
          stoneUid: line.stoneUid,
          count: Number(line.count) || 0,
        }))
        .filter((line) => line.stoneUid || line.count > 0);

      if (normalizedStoneLines.some((line) => !line.stoneUid || line.count <= 0)) {
        return toast.error("Complete all stone rows before saving the draft tag.");
      }

      const draftTag = await createDraftTag.mutateAsync({
        grnUid: activeGrnUid,
        data: {
          itemUid: tagItemUid,
          itemCode: selectedTagItem?.itemCode,
          tagNumber,
          grossWt: Number(grossWt),
          netWt: Number(netWt),
          stoneWt: stoneWt ? Number(stoneWt) : undefined,
          wastageWt: wastageWt ? Number(wastageWt) : undefined,
          notes: tagNotes || undefined,
        },
      });

      for (const stoneLine of normalizedStoneLines) {
        await addDraftTagStone.mutateAsync({
          draftTagUid: draftTag.draftTagUid,
          data: stoneLine,
        });
      }

      toast.success("Draft tag added");
      setActiveForm("none");
      resetDraftTagForm();
    } catch (err: any) {
      toast.error("Failed to add draft tag", { description: err.message });
    }
  };

  const addStoneLine = () => {
    setDraftStoneLines((current) => [...current, createStoneLine()]);
  };

  const updateStoneLine = (lineId: string, field: "stoneUid" | "count", value: string) => {
    setDraftStoneLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    );
  };

  const removeStoneLine = (lineId: string) => {
    setDraftStoneLines((current) => current.filter((line) => line.id !== lineId));
  };

  const handleConfirmDraftGrn = async (grnUid: string) => {
    try {
      await confirmGRN.mutateAsync(grnUid);
      toast.success("GRN confirmed successfully");
    } catch (err: any) {
      toast.error("Failed to confirm GRN", { description: err.message });
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xl font-semibold text-foreground">PO: {resolvedPo.poNumber}</div>
          <div className="text-sm text-muted-foreground mt-1">{resolvedPo.supplierName}</div>
        </div>
        <StatusBadge status={resolvedPo.status} />
      </div>

      {resolvedPo.status === "DRAFT" && (
        <div className="bg-muted/30 p-3 rounded-md border border-border flex justify-between items-center">
          <span className="text-sm">PO is in draft. Confirm it before receiving stock.</span>
          <Button size="sm" onClick={handleConfirmPO} disabled={updatePOStatus.isPending}>
            <CheckCircle className="w-4 h-4 mr-1" />Confirm PO
          </Button>
        </div>
      )}

      {resolvedPo.status === "CONFIRMED" && grns.length === 0 && (
        <div className="bg-muted/30 p-3 rounded-md border border-border flex justify-between items-center">
          <span className="text-sm">Create a GRN to receive goods against this PO.</span>
          <Button size="sm" onClick={() => setActiveForm("grn")}>
            <PackagePlus className="w-4 h-4 mr-1" />Create GRN
          </Button>
        </div>
      )}

      {activeForm === "grn" && (
        <form onSubmit={handleCreateGRN} className="bg-primary/5 p-4 rounded-md border border-border space-y-4">
          <h4 className="font-semibold text-sm">New Goods Receipt Note</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>GRN Number</Label>
              <Input required value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Received Date</Label>
              <Input type="date" required value={grnDate} onChange={(e) => setGrnDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Received By</Label>
              <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Pieces</Label>
              <Input type="number" min="1" step="1" required value={totalPieces} onChange={(e) => setTotalPieces(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={grnNotes} onChange={(e) => setGrnNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveForm("none")}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createGRN.isPending}>Create GRN</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div><span className="text-muted-foreground block text-xs">Order Date</span>{formatDate(resolvedPo.orderDate)}</div>
        <div><span className="text-muted-foreground block text-xs">Expected Delivery</span>{formatDate(resolvedPo.expectedDeliveryDate)}</div>
        <div><span className="text-muted-foreground block text-xs">Supplier Phone</span>{resolvedPo.supplierPhone || "-"}</div>
        <div><span className="text-muted-foreground block text-xs">Total Amount</span>{formatCurrency(resolvedPo.totalAmount || 0)}</div>
        <div className="md:col-span-2"><span className="text-muted-foreground block text-xs">Notes</span>{resolvedPo.notes || "-"}</div>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-semibold text-sm">PO Lines</h3>
        {resolvedPo.lines?.length ? (
          <div className="space-y-2">
            {resolvedPo.lines.map((line) => (
              <div key={line.lineUid} className="rounded-md border border-border bg-background p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{line.itemName || line.itemCode || line.itemUid}</div>
                  <div className="text-xs text-muted-foreground">Ordered {line.quantityOrdered} • Received {line.quantityReceived || 0}</div>
                  {line.notes && <div className="text-xs text-muted-foreground mt-1">{line.notes}</div>}
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">{formatCurrency(line.lineTotal || 0)}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice || 0)} / unit</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateBlock title="No PO lines" description="This purchase order does not contain any line details." className="py-6 border border-dashed rounded-md" />
        )}
      </div>

      {grns.length > 0 && (
        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="font-semibold text-sm">Receipts (GRNs)</h3>
          {grns.map((grn) => {
            return (
              <div key={grn.grnUid} className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/30 p-3 flex justify-between items-center border-b border-border">
                <div>
                  <span className="font-semibold text-sm mr-2">{grn.grnNumber}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(grn.receivedDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={grn.status} />
                  <GrnDraftActions
                    grnUid={grn.grnUid}
                    grnStatus={grn.status}
                    finalizePending={confirmGRN.isPending}
                    onAddDraftTag={() => {
                      resetDraftTagForm();
                      setActiveGrnUid(grn.grnUid);
                      setActiveForm("tag");
                    }}
                    onFinalize={() => handleConfirmDraftGrn(grn.grnUid)}
                  />
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                  <div><span className="text-muted-foreground block">Received By</span>{grn.receivedBy || "-"}</div>
                  <div><span className="text-muted-foreground block">Total Pieces</span>{grn.totalPieces || 0}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground block">Notes</span>{grn.notes || "-"}</div>
                </div>

                {activeForm === "tag" && activeGrnUid === grn.grnUid && (
                  <form onSubmit={handleCreateTag} className="bg-muted p-3 rounded-md border border-border space-y-3 mb-3">
                    <h4 className="font-semibold text-xs">New Draft Tag</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Item UID</Label>
                        <Input list={`purchase-items-${grn.grnUid}`} className="h-8 text-xs" value={tagItemUid} onChange={(e) => setTagItemUid(e.target.value)} placeholder="Select item UID" required />
                        <datalist id={`purchase-items-${grn.grnUid}`}>
                          {itemOptions.map((item) => (
                            <option key={item.itemUid} value={item.itemUid}>{item.itemCode} - {item.name}</option>
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Item Code</Label>
                        <Input className="h-8 text-xs" value={selectedTagItem?.itemCode || ""} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tag Number</Label>
                        <Input className="h-8 text-xs" value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Gross Weight (g)</Label>
                        <Input type="number" step="0.001" className="h-8 text-xs" value={grossWt} onChange={(e) => setGrossWt(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Net Weight (g)</Label>
                        <Input type="number" step="0.001" className="h-8 text-xs" value={netWt} onChange={(e) => setNetWt(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stone Weight (g)</Label>
                        <Input type="number" step="0.001" className="h-8 text-xs" value={stoneWt} onChange={(e) => setStoneWt(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Wastage Weight (g)</Label>
                        <Input type="number" step="0.001" className="h-8 text-xs" value={wastageWt} onChange={(e) => setWastageWt(e.target.value)} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Notes</Label>
                        <Textarea rows={2} className="text-xs" value={tagNotes} onChange={(e) => setTagNotes(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-3 rounded-md border border-border/70 bg-background/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-foreground">Stone Details</div>
                          <div className="text-[11px] text-muted-foreground">Add one or more stones for this draft tag if applicable.</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addStoneLine}>
                          <Plus className="mr-1 h-3.5 w-3.5" />Add Stone
                        </Button>
                      </div>

                      {draftStoneLines.length > 0 ? (
                        <div className="space-y-3">
                          {draftStoneLines.map((stoneLine, index) => (
                            <div key={stoneLine.id} className="rounded-md border border-border bg-background p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="text-xs font-medium text-foreground">Stone {index + 1}</div>
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => removeStoneLine(stoneLine.id)}>
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />Remove
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Stone UID</Label>
                                  <Input
                                    list={`purchase-stones-${grn.grnUid}`}
                                    className="h-8 text-xs"
                                    value={stoneLine.stoneUid}
                                    onChange={(e) => updateStoneLine(stoneLine.id, "stoneUid", e.target.value)}
                                    placeholder="Select stone UID"
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Count</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    className="h-8 text-xs"
                                    value={stoneLine.count}
                                    onChange={(e) => updateStoneLine(stoneLine.id, "count", e.target.value)}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <datalist id={`purchase-stones-${grn.grnUid}`}>
                            {stones.map((stone) => (
                              <option key={stone.stoneUid} value={stone.stoneUid}>{stone.stoneCode} - {stone.name}</option>
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground"></div>
                        )
                        }
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          resetDraftTagForm();
                          setActiveForm("none");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="h-7 text-xs" disabled={createDraftTag.isPending || addDraftTagStone.isPending}>Save Draft Tag</Button>
                    </div>
                  </form>
                )}

                <DraftTagsSection grnUid={grn.grnUid} />
              </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Sheet open={!!po} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-xl">PO: {resolvedPo.poNumber}</SheetTitle>
              <div className="text-sm text-muted-foreground mt-1">{resolvedPo.supplierName}</div>
            </div>
            <StatusBadge status={resolvedPo.status} />
          </div>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
