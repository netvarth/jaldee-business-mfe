import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useItems } from "@/hooks/useCatalogue";
import { useStones } from "@/hooks/useMasterData";
import { useCreateCompositeGRN, usePurchaseOrders } from "@/hooks/usePurchase";
import { GoodsReceiptNote } from "@/lib/gold-erp-types";
import { formatDate, formatWeight } from "@/lib/gold-erp-utils";

interface DraftStoneLine {
  id: string;
  stoneUid: string;
  count: string;
}

interface DraftTagLine {
  id: string;
  itemUid: string;
  tagNumber: string;
  grossWt: string;
  netWt: string;
  stoneWt: string;
  wastageWt: string;
  notes: string;
  stoneDetails: DraftStoneLine[];
}

const createStoneLine = (): DraftStoneLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  stoneUid: "",
  count: "1",
});

const createDraftTagLine = (): DraftTagLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemUid: "",
  tagNumber: "",
  grossWt: "",
  netWt: "",
  stoneWt: "",
  wastageWt: "",
  notes: "",
  stoneDetails: [],
});

export default function IndependentGrnPage() {
  const createCompositeGRN = useCreateCompositeGRN();
  const { data: items = [] } = useItems();
  const { data: stones = [] } = useStones();
  const { data: purchaseOrders = [] } = usePurchaseOrders();

  const [grnNumber, setGrnNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedBy, setReceivedBy] = useState("");
  const [isPurchaseLinked, setIsPurchaseLinked] = useState(false);
  const [poUid, setPoUid] = useState("");
  const [totalPieces, setTotalPieces] = useState("1");
  const [notes, setNotes] = useState("");
  const [draftTags, setDraftTags] = useState<DraftTagLine[]>([createDraftTagLine()]);
  const [createdGrn, setCreatedGrn] = useState<GoodsReceiptNote | null>(null);

  const resetForm = () => {
    setGrnNumber("");
    setSupplierName("");
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setReceivedBy("");
    setIsPurchaseLinked(false);
    setPoUid("");
    setTotalPieces("1");
    setNotes("");
    setDraftTags([createDraftTagLine()]);
  };

  const updateDraftTag = (tagId: string, field: Exclude<keyof DraftTagLine, "id" | "stoneDetails">, value: string) => {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => (tag.id === tagId ? { ...tag, [field]: value } : tag)),
    );
  };

  const addDraftTag = () => {
    setDraftTags((currentTags) => [...currentTags, createDraftTagLine()]);
  };

  const removeDraftTag = (tagId: string) => {
    setDraftTags((currentTags) => (currentTags.length === 1 ? currentTags : currentTags.filter((tag) => tag.id !== tagId)));
  };

  const addStoneToTag = (tagId: string) => {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => (
        tag.id === tagId ? { ...tag, stoneDetails: [...tag.stoneDetails, createStoneLine()] } : tag
      )),
    );
  };

  const updateStoneLine = (tagId: string, stoneId: string, field: keyof Omit<DraftStoneLine, "id">, value: string) => {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => {
        if (tag.id !== tagId) {
          return tag;
        }
        return {
          ...tag,
          stoneDetails: tag.stoneDetails.map((stoneLine) => (
            stoneLine.id === stoneId ? { ...stoneLine, [field]: value } : stoneLine
          )),
        };
      }),
    );
  };

  const removeStoneLine = (tagId: string, stoneId: string) => {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => (
        tag.id === tagId
          ? { ...tag, stoneDetails: tag.stoneDetails.filter((stoneLine) => stoneLine.id !== stoneId) }
          : tag
      )),
    );
  };

  const normalizedDraftTags = useMemo(
    () =>
      draftTags.map((tag) => {
        const selectedItem = items.find((item) => item.itemUid === tag.itemUid);
        return {
          itemUid: tag.itemUid,
          itemCode: selectedItem?.itemCode,
          tagNumber: tag.tagNumber,
          grossWt: Number(tag.grossWt) || 0,
          netWt: Number(tag.netWt) || 0,
          stoneWt: tag.stoneWt ? Number(tag.stoneWt) : undefined,
          wastageWt: tag.wastageWt ? Number(tag.wastageWt) : undefined,
          notes: tag.notes || undefined,
          stoneDetails: tag.stoneDetails.map((stoneLine) => ({
            stoneUid: stoneLine.stoneUid,
            count: Number(stoneLine.count) || 0,
          })),
        };
      }),
    [draftTags, items],
  );

  const availablePurchaseOrders = useMemo(
    () =>
      purchaseOrders
        .filter((purchaseOrder) => purchaseOrder.status !== "CLOSED")
        .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || "")),
    [purchaseOrders],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!grnNumber || !supplierName || !receivedDate) {
      toast.error("Complete the GRN header details.");
      return;
    }

    const totalPiecesValue = Number(totalPieces) || 0;
    if (totalPiecesValue <= 0) {
      toast.error("Total pieces must be greater than zero.");
      return;
    }

    if (isPurchaseLinked && !poUid) {
      toast.error("PO UID is required when purchase order is selected.");
      return;
    }

    if (!normalizedDraftTags.length) {
      toast.error("Add at least one draft tag.");
      return;
    }

    const hasInvalidTag = normalizedDraftTags.some((tag) => !tag.itemUid || !tag.tagNumber || tag.grossWt <= 0 || tag.netWt <= 0);
    if (hasInvalidTag) {
      toast.error("Complete the required draft-tag fields.");
      return;
    }

    const hasInvalidStone = normalizedDraftTags.some((tag) => tag.stoneDetails.some((stoneLine) => !stoneLine.stoneUid || stoneLine.count <= 0));
    if (hasInvalidStone) {
      toast.error("Complete all stone rows with a valid stone UID and count.");
      return;
    }

    try {
      const savedGrn = await createCompositeGRN.mutateAsync({
        grnNumber,
        poUid: isPurchaseLinked ? poUid : undefined,
        supplierName,
        receivedDate,
        receivedBy: receivedBy || undefined,
        totalPieces: totalPiecesValue,
        status: "DRAFT",
        notes: notes || undefined,
        draftTags: normalizedDraftTags,
      });
      setCreatedGrn(savedGrn);
      toast.success("Independent GRN created successfully");
      resetForm();
    } catch (error: any) {
      toast.error("Failed to create GRN", { description: error.message });
    }
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="New GRN" subtitle="Create a GRN with multiple draft tags and stones." />

      <SectionCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>GRN Number</Label>
              <Input required value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Received Date</Label>
              <Input required type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Received By</Label>
              <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Order</Label>
              <div className="flex min-h-10 items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                <Checkbox
                  id="grn-purchase-order"
                  checked={isPurchaseLinked}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setIsPurchaseLinked(enabled);
                    if (!enabled) {
                      setPoUid("");
                    }
                  }}
                />
                <Label htmlFor="grn-purchase-order" className="text-sm font-normal">
                  Link this GRN to a purchase order
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Pieces</Label>
              <Input type="number" min="1" step="1" value={totalPieces} onChange={(e) => setTotalPieces(e.target.value)} />
            </div>
            {isPurchaseLinked && (
              <div className="space-y-2">
                <Label>Purchase Order</Label>
                <Input
                  required
                  list="independent-grn-po-options"
                  value={poUid}
                  onChange={(e) => setPoUid(e.target.value)}
                  placeholder="Select purchase order UID"
                />
                <datalist id="independent-grn-po-options">
                  {availablePurchaseOrders.map((purchaseOrder) => (
                    <option key={purchaseOrder.poUid} value={purchaseOrder.poUid}>
                      {purchaseOrder.poNumber} - {purchaseOrder.supplierName}
                    </option>
                  ))}
                </datalist>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Draft Tags</div>
                <div className="text-xs text-muted-foreground">
                  Add one or more draft tags to this GRN.
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDraftTag}>
                <Plus className="mr-1 h-4 w-4" />Add Draft Tag
              </Button>
            </div>

            {draftTags.map((tag, index) => {
              const selectedItem = items.find((item) => item.itemUid === tag.itemUid);

              return (
                <div key={tag.id} className="space-y-4 rounded-md border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">Draft Tag {index + 1}</div>
                      <div className="text-xs text-muted-foreground">{selectedItem?.name || "Select an item for this piece."}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDraftTag(tag.id)} disabled={draftTags.length === 1}>
                      <Trash2 className="mr-1 h-4 w-4" />Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Item UID</Label>
                      <Input
                        list={`grn-items-${tag.id}`}
                        value={tag.itemUid}
                        onChange={(e) => updateDraftTag(tag.id, "itemUid", e.target.value)}
                        placeholder="Select item UID"
                        required
                      />
                      <datalist id={`grn-items-${tag.id}`}>
                        {items.map((item) => (
                          <option key={item.itemUid} value={item.itemUid}>{item.itemCode} - {item.name}</option>
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label>Item Code</Label>
                      <Input value={selectedItem?.itemCode || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag Number</Label>
                      <Input required value={tag.tagNumber} onChange={(e) => updateDraftTag(tag.id, "tagNumber", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gross Weight (g)</Label>
                      <Input required type="number" min="0.001" step="0.001" value={tag.grossWt} onChange={(e) => updateDraftTag(tag.id, "grossWt", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Net Weight (g)</Label>
                      <Input required type="number" min="0.001" step="0.001" value={tag.netWt} onChange={(e) => updateDraftTag(tag.id, "netWt", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Stone Weight (g)</Label>
                      <Input type="number" min="0" step="0.001" value={tag.stoneWt} onChange={(e) => updateDraftTag(tag.id, "stoneWt", e.target.value)} />
                    </div>
                    {/* <div className="space-y-2">
                      <Label>Wastage Weight (g)</Label>
                      <Input type="number" min="0" step="0.001" value={tag.wastageWt} onChange={(e) => updateDraftTag(tag.id, "wastageWt", e.target.value)} />
                    </div> */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea rows={2} value={tag.notes} onChange={(e) => updateDraftTag(tag.id, "notes", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-foreground">Stone Details</div>
                        <div className="text-[11px] text-muted-foreground">Add stones only when the piece contains them.</div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addStoneToTag(tag.id)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />Add Stone
                      </Button>
                    </div>

                    {tag.stoneDetails.length > 0 ? (
                      <div className="space-y-3">
                        {tag.stoneDetails.map((stoneLine, stoneIndex) => (
                          <div key={stoneLine.id} className="rounded-md border border-border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="text-xs font-medium text-foreground">Stone {stoneIndex + 1}</div>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => removeStoneLine(tag.id, stoneLine.id)}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" />Remove
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Stone UID</Label>
                                <Input
                                  list={`grn-stones-${tag.id}`}
                                  className="h-8 text-xs"
                                  value={stoneLine.stoneUid}
                                  onChange={(e) => updateStoneLine(tag.id, stoneLine.id, "stoneUid", e.target.value)}
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
                                  onChange={(e) => updateStoneLine(tag.id, stoneLine.id, "count", e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <datalist id={`grn-stones-${tag.id}`}>
                          {stones.map((stone) => (
                            <option key={stone.stoneUid} value={stone.stoneUid}>{stone.stoneCode} - {stone.name}</option>
                          ))}
                        </datalist>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={resetForm}>Reset</Button>
            <Button type="submit" disabled={createCompositeGRN.isPending}>Create GRN</Button>
          </div>
        </form>
      </SectionCard>

      {createdGrn && (
        <SectionCard
          title={`Created GRN: ${createdGrn.grnNumber}`}
          subtitle="Independent GRNs are not shown in the purchase-order workspace. This panel shows the GRN and draft tags returned by the composite create response."
        >
          <div className="space-y-6">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div><span className="block text-xs text-muted-foreground">Supplier</span>{createdGrn.supplierName || "-"}</div>
              <div><span className="block text-xs text-muted-foreground">Received Date</span>{formatDate(createdGrn.receivedDate)}</div>
              <div><span className="block text-xs text-muted-foreground">Received By</span>{createdGrn.receivedBy || "-"}</div>
              <div><span className="block text-xs text-muted-foreground">Total Pieces</span>{createdGrn.totalPieces || 0}</div>
              <div><span className="block text-xs text-muted-foreground">Status</span>{createdGrn.status}</div>
              <div><span className="block text-xs text-muted-foreground">PO UID</span>{createdGrn.poUid || "-"}</div>
              <div className="md:col-span-2"><span className="block text-xs text-muted-foreground">Notes</span>{createdGrn.notes || "-"}</div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="text-sm font-semibold text-foreground">Draft Tags</div>
              {createdGrn.draftTags?.length ? (
                <div className="space-y-3">
                  {createdGrn.draftTags.map((tag) => (
                    <div key={tag.draftTagUid} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{tag.tagNumber || tag.itemCode || tag.itemUid}</div>
                          <div className="text-xs text-muted-foreground">{tag.itemName || tag.itemCode || tag.itemUid}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gross {formatWeight(tag.grossWt || 0)} | Net {formatWeight(tag.netWt || 0)}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                        <div><span className="block text-muted-foreground">Stone Weight</span>{formatWeight(tag.stoneWt || 0)}</div>
                        <div><span className="block text-muted-foreground">Wastage Weight</span>{formatWeight(tag.wastageWt || 0)}</div>
                        <div className="md:col-span-2"><span className="block text-muted-foreground">Notes</span>{tag.notes || "-"}</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-foreground">Stone Rows</div>
                        {tag.stoneDetails?.length ? (
                          <div className="space-y-2">
                            {tag.stoneDetails.map((stone) => (
                              <div key={stone.dsdUid} className="rounded border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                                {stone.stoneName || stone.stoneUid} | Count {stone.count}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No stones added for this draft tag.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No draft tags were returned by the create response.</div>
              )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
