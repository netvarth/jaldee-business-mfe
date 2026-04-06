import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Input,
  PageHeader,
  SectionCard,
  Textarea,
} from "@jaldee/design-system";
import { catalogueService, masterDataService, purchaseService } from "@/services";
import type { GoodsReceiptNote, JewelleryItem, PurchaseOrder, Stone } from "@/lib/gold-erp-types";
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

function normalizeItem(item: JewelleryItem): JewelleryItem {
  return {
    ...item,
    itemUid: String(item.itemUid ?? ""),
    itemCode: String(item.itemCode ?? "-"),
    name: String(item.name ?? "Item"),
    status: item.status ?? "ACTIVE",
  };
}

function normalizeStone(stone: Stone): Stone {
  return {
    ...stone,
    stoneUid: String(stone.stoneUid ?? ""),
    stoneCode: String(stone.stoneCode ?? "-"),
    name: String(stone.name ?? "Stone"),
    status: stone.status ?? "ACTIVE",
  };
}

function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    poUid: String(po.poUid ?? ""),
    poNumber: String(po.poNumber ?? "-"),
    supplierName: String(po.supplierName ?? "-"),
    status: po.status ?? "DRAFT",
  };
}

export default function IndependentGrnPage() {
  const [items, setItems] = useState<JewelleryItem[]>([]);
  const [stones, setStones] = useState<Stone[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void Promise.all([
      catalogueService.getItems(),
      masterDataService.getStones(),
      purchaseService.getPurchaseOrders(),
    ])
      .then(([loadedItems, loadedStones, loadedPurchaseOrders]) => {
        if (cancelled) return;
        setItems(Array.isArray(loadedItems) ? loadedItems.map(normalizeItem) : []);
        setStones(Array.isArray(loadedStones) ? loadedStones.map(normalizeStone) : []);
        setPurchaseOrders(Array.isArray(loadedPurchaseOrders) ? loadedPurchaseOrders.map(normalizePurchaseOrder) : []);
      })
      .catch((loadError) => {
        console.error("[IndependentGrnPage] failed to load setup data", loadError);
        if (cancelled) return;
        setItems([]);
        setStones([]);
        setPurchaseOrders([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load GRN setup data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const availablePurchaseOrders = useMemo(
    () => purchaseOrders.filter((purchaseOrder) => purchaseOrder.status !== "CLOSED").sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || "")),
    [purchaseOrders],
  );

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

  function resetForm() {
    setGrnNumber("");
    setSupplierName("");
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setReceivedBy("");
    setIsPurchaseLinked(false);
    setPoUid("");
    setTotalPieces("1");
    setNotes("");
    setDraftTags([createDraftTagLine()]);
  }

  function updateDraftTag(tagId: string, field: Exclude<keyof DraftTagLine, "id" | "stoneDetails">, value: string) {
    setDraftTags((currentTags) => currentTags.map((tag) => (tag.id === tagId ? { ...tag, [field]: value } : tag)));
  }

  function addDraftTag() {
    setDraftTags((currentTags) => [...currentTags, createDraftTagLine()]);
  }

  function removeDraftTag(tagId: string) {
    setDraftTags((currentTags) => (currentTags.length === 1 ? currentTags : currentTags.filter((tag) => tag.id !== tagId)));
  }

  function addStoneToTag(tagId: string) {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => (tag.id === tagId ? { ...tag, stoneDetails: [...tag.stoneDetails, createStoneLine()] } : tag)),
    );
  }

  function updateStoneLine(tagId: string, stoneId: string, field: keyof Omit<DraftStoneLine, "id">, value: string) {
    setDraftTags((currentTags) =>
      currentTags.map((tag) => {
        if (tag.id !== tagId) return tag;
        return {
          ...tag,
          stoneDetails: tag.stoneDetails.map((stoneLine) => (stoneLine.id === stoneId ? { ...stoneLine, [field]: value } : stoneLine)),
        };
      }),
    );
  }

  function removeStoneLine(tagId: string, stoneId: string) {
    setDraftTags((currentTags) =>
      currentTags.map((tag) =>
        tag.id === tagId ? { ...tag, stoneDetails: tag.stoneDetails.filter((stoneLine) => stoneLine.id !== stoneId) } : tag,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!grnNumber || !supplierName || !receivedDate) {
      setError("Complete the GRN header details.");
      return;
    }

    const totalPiecesValue = Number(totalPieces) || 0;
    if (totalPiecesValue <= 0) {
      setError("Total pieces must be greater than zero.");
      return;
    }

    if (isPurchaseLinked && !poUid) {
      setError("PO UID is required when purchase order is selected.");
      return;
    }

    const hasInvalidTag = normalizedDraftTags.some((tag) => !tag.itemUid || !tag.tagNumber || tag.grossWt <= 0 || tag.netWt <= 0);
    if (hasInvalidTag) {
      setError("Complete the required draft-tag fields.");
      return;
    }

    const hasInvalidStone = normalizedDraftTags.some((tag) => tag.stoneDetails.some((stoneLine) => !stoneLine.stoneUid || stoneLine.count <= 0));
    if (hasInvalidStone) {
      setError("Complete all stone rows with a valid stone UID and count.");
      return;
    }

    setIsSubmitting(true);
    try {
      const savedGrn = await purchaseService.createCompositeGRN({
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
      setSuccessMessage("Independent GRN created successfully.");
      resetForm();
    } catch (submitError) {
      console.error("[IndependentGrnPage] failed to create GRN", submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to create GRN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title="New GRN" subtitle="Create a GRN with multiple draft tags and stones." />

        {error ? <Alert variant="danger" title="GRN creation failed">{error}</Alert> : null}
        {successMessage ? <Alert variant="success" title="GRN created">{successMessage}</Alert> : null}

        <SectionCard>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="GRN Number" required value={grnNumber} onChange={(event) => setGrnNumber(event.target.value)} />
              <Input label="Received Date" required type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} />
              <Input label="Supplier Name" required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
              <Input label="Received By" value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
              <div className="space-y-2">
                <div className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">Purchase Order</div>
                <div className="flex min-h-10 items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <Checkbox checked={isPurchaseLinked} onChange={(event) => { const enabled = event.target.checked; setIsPurchaseLinked(enabled); if (!enabled) setPoUid(""); }} label="Link this GRN to a purchase order" />
                </div>
              </div>
              <Input label="Total Pieces" type="number" min="1" step="1" value={totalPieces} onChange={(event) => setTotalPieces(event.target.value)} />
              {isPurchaseLinked ? (
                <div className="space-y-2">
                  <div className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">Purchase Order</div>
                  <input
                    list="independent-grn-po-options"
                    value={poUid}
                    onChange={(event) => setPoUid(event.target.value)}
                    placeholder="Select purchase order UID"
                    className="block w-full min-h-[38px] rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] px-4 py-2 text-[var(--text-sm)] text-[var(--color-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                  />
                  <datalist id="independent-grn-po-options">
                    {availablePurchaseOrders.map((purchaseOrder) => (
                      <option key={purchaseOrder.poUid} value={purchaseOrder.poUid}>
                        {purchaseOrder.poNumber} - {purchaseOrder.supplierName}
                      </option>
                    ))}
                  </datalist>
                </div>
              ) : null}
              <div className="md:col-span-2"><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">Draft Tags</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">Add one or more draft tags to this GRN.</div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDraftTag}>Add Draft Tag</Button>
              </div>

              {draftTags.map((tag, index) => {
                const selectedItem = items.find((item) => item.itemUid === tag.itemUid);
                return (
                  <div key={tag.id} className="space-y-4 rounded-md border border-[var(--color-border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">Draft Tag {index + 1}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{selectedItem?.name || "Select an item for this piece."}</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDraftTag(tag.id)} disabled={draftTags.length === 1}>Remove</Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">Item UID</div>
                        <input
                          list={`grn-items-${tag.id}`}
                          value={tag.itemUid}
                          onChange={(event) => updateDraftTag(tag.id, "itemUid", event.target.value)}
                          placeholder="Select item UID"
                          className="block w-full min-h-[38px] rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] px-4 py-2 text-[var(--text-sm)] text-[var(--color-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                        />
                        <datalist id={`grn-items-${tag.id}`}>
                          {items.map((item) => (
                            <option key={item.itemUid} value={item.itemUid}>{item.itemCode} - {item.name}</option>
                          ))}
                        </datalist>
                      </div>
                      <Input label="Item Code" value={selectedItem?.itemCode || ""} readOnly />
                      <Input label="Tag Number" required value={tag.tagNumber} onChange={(event) => updateDraftTag(tag.id, "tagNumber", event.target.value)} />
                      <Input label="Gross Weight (g)" required type="number" min="0.001" step="0.001" value={tag.grossWt} onChange={(event) => updateDraftTag(tag.id, "grossWt", event.target.value)} />
                      <Input label="Net Weight (g)" required type="number" min="0.001" step="0.001" value={tag.netWt} onChange={(event) => updateDraftTag(tag.id, "netWt", event.target.value)} />
                      <Input label="Stone Weight (g)" type="number" min="0" step="0.001" value={tag.stoneWt} onChange={(event) => updateDraftTag(tag.id, "stoneWt", event.target.value)} />
                      <div className="md:col-span-2"><Textarea label="Notes" rows={2} value={tag.notes} onChange={(event) => updateDraftTag(tag.id, "notes", event.target.value)} /></div>
                    </div>

                    <div className="space-y-3 rounded-md border border-[color:color-mix(in_srgb,var(--color-border)_80%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-[var(--color-text-primary)]">Stone Details</div>
                          <div className="text-[11px] text-[var(--color-text-secondary)]">Add stones only when the piece contains them.</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => addStoneToTag(tag.id)}>Add Stone</Button>
                      </div>

                      {tag.stoneDetails.length > 0 ? (
                        <div className="space-y-3">
                          {tag.stoneDetails.map((stoneLine, stoneIndex) => (
                            <div key={stoneLine.id} className="rounded-md border border-[var(--color-border)] bg-white p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="text-xs font-medium text-[var(--color-text-primary)]">Stone {stoneIndex + 1}</div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeStoneLine(tag.id, stoneLine.id)}>Remove</Button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                  <div className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">Stone UID</div>
                                  <input
                                    list={`grn-stones-${tag.id}`}
                                    value={stoneLine.stoneUid}
                                    onChange={(event) => updateStoneLine(tag.id, stoneLine.id, "stoneUid", event.target.value)}
                                    placeholder="Select stone UID"
                                    className="block w-full min-h-[38px] rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] px-4 py-2 text-[var(--text-sm)] text-[var(--color-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                                  />
                                </div>
                                <Input label="Count" type="number" min="1" step="1" value={stoneLine.count} onChange={(event) => updateStoneLine(tag.id, stoneLine.id, "count", event.target.value)} />
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
                        <div className="text-xs text-[var(--color-text-secondary)]">No stones added for this draft tag.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>Reset</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create GRN"}</Button>
            </div>
          </form>
        </SectionCard>

        {createdGrn ? (
          <SectionCard title={`Created GRN: ${createdGrn.grnNumber}`} subtitle="Independent GRNs are not shown in the purchase-order workspace. This panel shows the GRN and draft tags returned by the composite create response.">
            <div className="space-y-6">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <DetailField label="Supplier" value={createdGrn.supplierName || "-"} />
                <DetailField label="Received Date" value={formatDate(createdGrn.receivedDate)} />
                <DetailField label="Received By" value={createdGrn.receivedBy || "-"} />
                <DetailField label="Total Pieces" value={String(createdGrn.totalPieces || 0)} />
                <DetailField label="Status" value={createdGrn.status} />
                <DetailField label="PO UID" value={createdGrn.poUid || "-"} />
                <div className="md:col-span-2"><DetailField label="Notes" value={createdGrn.notes || "-"} /></div>
              </div>

              <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">Draft Tags</div>
                {createdGrn.draftTags?.length ? (
                  <div className="space-y-3">
                    {createdGrn.draftTags.map((tag) => (
                      <div key={tag.draftTagUid} className="rounded-md border border-[var(--color-border)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">{tag.tagNumber || tag.itemCode || tag.itemUid}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{tag.itemName || tag.itemCode || tag.itemUid}</div>
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">Gross {formatWeight(tag.grossWt || 0)} | Net {formatWeight(tag.netWt || 0)}</div>
                        </div>
                        <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                          <div><span className="block text-[var(--color-text-secondary)]">Stone Weight</span>{formatWeight(tag.stoneWt || 0)}</div>
                          <div><span className="block text-[var(--color-text-secondary)]">Wastage Weight</span>{formatWeight(tag.wastageWt || 0)}</div>
                          <div className="md:col-span-2"><span className="block text-[var(--color-text-secondary)]">Notes</span>{tag.notes || "-"}</div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-[var(--color-text-primary)]">Stone Rows</div>
                          {tag.stoneDetails?.length ? (
                            <div className="space-y-2">
                              {tag.stoneDetails.map((stone) => (
                                <div key={stone.dsdUid} className="rounded border border-[color:color-mix(in_srgb,var(--color-border)_80%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)] px-3 py-2 text-xs">
                                  {stone.stoneName || stone.stoneUid} | Count {stone.count}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--color-text-secondary)]">No stones added for this draft tag.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--color-text-secondary)]">No draft tags were returned by the create response.</div>
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
