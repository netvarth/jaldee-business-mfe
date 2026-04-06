import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { catalogueService, purchaseService } from "@/services";
import type { DraftTag, GoodsReceiptNote, JewelleryItem, PurchaseOrder, PurchaseOrderStatus } from "@/lib/gold-erp-types";
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";

type PurchaseLineDraft = {
  id: string;
  itemUid: string;
  quantityOrdered: string;
  unitPrice: string;
  notes: string;
};

type NoticeState = {
  variant: "success" | "warning" | "danger" | "info";
  title: string;
  message: string;
};

type CreateGrnDraft = {
  grnNumber: string;
  receivedDate: string;
  receivedBy: string;
  totalPieces: string;
  notes: string;
};

type DraftTagFormState = {
  itemUid: string;
  itemCode: string;
  tagNumber: string;
  grossWt: string;
  netWt: string;
  stoneWt: string;
  wastageWt: string;
  notes: string;
};

type GrnWithDraftTags = GoodsReceiptNote & {
  draftTags: DraftTag[];
};

const createPurchaseLine = (): PurchaseLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemUid: "",
  quantityOrdered: "1",
  unitPrice: "",
  notes: "",
});

function createGrnDraft(): CreateGrnDraft {
  return {
    grnNumber: "",
    receivedDate: new Date().toISOString().slice(0, 10),
    receivedBy: "",
    totalPieces: "",
    notes: "",
  };
}

function createDraftTagFormState(): DraftTagFormState {
  return {
    itemUid: "",
    itemCode: "",
    tagNumber: "",
    grossWt: "",
    netWt: "",
    stoneWt: "",
    wastageWt: "",
    notes: "",
  };
}

function getPurchaseStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "CLOSED") return "success";
  if (status === "CONFIRMED") return "info";
  if (status === "DRAFT") return "warning";
  return "neutral";
}

function getGrnStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "CONFIRMED") return "success";
  if (status === "DRAFT") return "warning";
  return "neutral";
}

export default function PurchaseWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { poUid } = useParams<{ poUid: string }>();
  const isCreateMode = !poUid;

  const [items, setItems] = useState<JewelleryItem[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [grns, setGrns] = useState<GrnWithDraftTags[]>([]);
  const [isLoading, setIsLoading] = useState(!isCreateMode);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [activeGrn, setActiveGrn] = useState<GrnWithDraftTags | null>(null);
  const [grnDraft, setGrnDraft] = useState<CreateGrnDraft>(createGrnDraft());
  const [draftTagForm, setDraftTagForm] = useState<DraftTagFormState>(createDraftTagFormState());

  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([createPurchaseLine()]);

  const returnTo = useMemo(
    () => ((location.state as { returnTo?: string } | null)?.returnTo || "/purchases"),
    [location.state],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadingItems(true);

    void catalogueService.getItems()
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setItems([]);
          setNotice({
            variant: "warning",
            title: "Could not load items",
            message: error instanceof Error ? error.message : "Item master data is unavailable.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isCreateMode || !poUid) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void loadWorkspace(poUid)
      .then((data) => {
        if (cancelled) return;
        setSelectedPo(data.purchaseOrder);
        setGrns(data.grns);
        setNotice(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSelectedPo(null);
        setGrns([]);
        setNotice({
          variant: "danger",
          title: "Could not load purchase workspace",
          message: error instanceof Error ? error.message : "The requested purchase order is unavailable.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCreateMode, poUid]);

  const lineTotals = useMemo(
    () => lines.map((line) => (Number(line.quantityOrdered) || 0) * (Number(line.unitPrice) || 0)),
    [lines],
  );

  const totalAmount = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals],
  );

  const itemOptions = useMemo(
    () => [
      { label: "Select item", value: "" },
      ...items.map((item) => ({
        label: `${item.itemCode || item.itemUid} - ${item.name}`,
        value: item.itemUid,
      })),
    ],
    [items],
  );

  const poItemOptions = useMemo(
    () =>
      (selectedPo?.lines || []).map((line) => ({
        label: `${line.itemCode || line.itemUid} - ${line.itemName || "Item"}`,
        value: line.itemUid,
      })),
    [selectedPo?.lines],
  );

  const receivedCountByItem = useMemo(() => {
    const counts = new Map<string, number>();
    grns.forEach((grn) => {
      grn.draftTags.forEach((tag) => {
        counts.set(tag.itemUid, (counts.get(tag.itemUid) || 0) + 1);
      });
    });
    return counts;
  }, [grns]);

  const draftGrn = useMemo(
    () => grns.find((grn) => grn.status === "DRAFT") || null,
    [grns],
  );

  const updateLine = (lineId: string, field: keyof PurchaseLineDraft, value: string) => {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)));
  };

  const addLine = () => {
    setLines((current) => [...current, createPurchaseLine()]);
  };

  const removeLine = (lineId: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));
  };

  const refreshWorkspace = async () => {
    if (!poUid) return;
    const data = await loadWorkspace(poUid);
    setSelectedPo(data.purchaseOrder);
    setGrns(data.grns);
  };

  const handleStatusUpdate = async (status: PurchaseOrderStatus) => {
    if (!selectedPo?.poUid) return;
    setIsSubmitting(true);
    try {
      const updated = await purchaseService.updatePOStatus(selectedPo.poUid, status);
      setSelectedPo(updated);
      setNotice({
        variant: "success",
        title: "Purchase order updated",
        message: `Status changed to ${status}.`,
      });
    } catch (error: unknown) {
      setNotice({
        variant: "danger",
        title: "Status update failed",
        message: error instanceof Error ? error.message : "Could not update purchase order status.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!poNumber.trim() || !supplierName.trim() || !orderDate) {
      setNotice({
        variant: "danger",
        title: "Missing required fields",
        message: "PO number, supplier name, and order date are required.",
      });
      return;
    }

    const normalizedLines = lines.map((line, index) => ({
      itemUid: line.itemUid,
      quantityOrdered: Number(line.quantityOrdered) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      lineTotal: lineTotals[index],
      notes: line.notes.trim() || undefined,
    }));

    const hasInvalidLine = normalizedLines.some((line) => !line.itemUid || line.quantityOrdered <= 0 || line.unitPrice <= 0);
    if (hasInvalidLine) {
      setNotice({
        variant: "danger",
        title: "Invalid order lines",
        message: "Each line needs an item, quantity greater than zero, and unit price greater than zero.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await purchaseService.createPO({
        poNumber: poNumber.trim(),
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || undefined,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        totalAmount,
        status: "DRAFT",
        notes: notes.trim() || undefined,
        lines: normalizedLines,
      });
      navigate(`../${created.poUid}`, {
        relative: "path",
        replace: true,
        state: { returnTo },
      });
    } catch (error: unknown) {
      setNotice({
        variant: "danger",
        title: "Failed to create purchase order",
        message: error instanceof Error ? error.message : "The purchase order could not be created.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGrn = async () => {
    if (!selectedPo?.poUid) return;
    if (draftGrn) {
      setNotice({
        variant: "warning",
        title: "Draft GRN already exists",
        message: `Complete or finalize ${draftGrn.grnNumber} before creating another GRN for this purchase order.`,
      });
      setIsCreateGrnOpen(false);
      return;
    }

    if (!grnDraft.grnNumber.trim() || !grnDraft.receivedDate || Number(grnDraft.totalPieces) <= 0) {
      setNotice({
        variant: "danger",
        title: "Incomplete GRN details",
        message: "GRN number, received date, and total pieces are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await purchaseService.createGRN({
        grnNumber: grnDraft.grnNumber.trim(),
        poUid: selectedPo.poUid,
        supplierName: selectedPo.supplierName,
        receivedDate: grnDraft.receivedDate,
        receivedBy: grnDraft.receivedBy.trim() || undefined,
        totalPieces: Number(grnDraft.totalPieces),
        status: "DRAFT",
        notes: grnDraft.notes.trim() || undefined,
      });
      await refreshWorkspace();
      setIsCreateGrnOpen(false);
      setGrnDraft(createGrnDraft());
      setNotice({
        variant: "success",
        title: "GRN created",
        message: "Receipt created successfully. You can now add draft tags.",
      });
    } catch (error: unknown) {
      setNotice({
        variant: "danger",
        title: "Failed to create GRN",
        message: error instanceof Error ? error.message : "The receipt could not be created.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDraftTagForm = (grn: GrnWithDraftTags) => {
    setActiveGrn(grn);
    setDraftTagForm(createDraftTagFormState());
  };

  const closeDraftTagForm = () => {
    setActiveGrn(null);
    setDraftTagForm(createDraftTagFormState());
  };

  const handleCreateDraftTag = async () => {
    if (!activeGrn) return;

    if (!draftTagForm.itemUid || !draftTagForm.tagNumber.trim() || Number(draftTagForm.grossWt) <= 0 || Number(draftTagForm.netWt) <= 0) {
      setNotice({
        variant: "danger",
        title: "Incomplete draft tag",
        message: "Item, tag number, gross weight, and net weight are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await purchaseService.createDraftTag(activeGrn.grnUid, {
        itemUid: draftTagForm.itemUid,
        itemCode: draftTagForm.itemCode.trim() || undefined,
        tagNumber: draftTagForm.tagNumber.trim(),
        grossWt: Number(draftTagForm.grossWt),
        netWt: Number(draftTagForm.netWt),
        stoneWt: Number(draftTagForm.stoneWt) || undefined,
        wastageWt: Number(draftTagForm.wastageWt) || undefined,
        notes: draftTagForm.notes.trim() || undefined,
      });
      await refreshWorkspace();
      closeDraftTagForm();
      setNotice({
        variant: "success",
        title: "Draft tag added",
        message: "The draft tag was added to the GRN.",
      });
    } catch (error: unknown) {
      setNotice({
        variant: "danger",
        title: "Failed to add draft tag",
        message: error instanceof Error ? error.message : "The draft tag could not be created.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeGrn = async (grnUid: string) => {
    setIsSubmitting(true);
    try {
      await purchaseService.confirmGRN(grnUid);
      await refreshWorkspace();
      setNotice({
        variant: "success",
        title: "GRN finalized",
        message: "The receipt was confirmed successfully.",
      });
    } catch (error: unknown) {
      setNotice({
        variant: "danger",
        title: "Failed to finalize GRN",
        message: error instanceof Error ? error.message : "The receipt could not be finalized.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title={isCreateMode ? "Create Purchase Order" : "Purchase Order Workspace"}
          subtitle={
            isCreateMode
              ? "Fill in the details to create a new purchase order. After creation, you can review and manage it in the workspace."
              : "Review the PO, receive GRNs, and manage draft tags."
          }
          back={{ label: isCreateMode ? "Back to Purchases" : "Back to Purchase Orders", href: returnTo }}
          onNavigate={(href) => navigate(href)}
        />

        {notice ? (
          <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
            {notice.message}
          </Alert>
        ) : null}

        {isCreateMode ? (
          <SectionCard>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Input label="PO Number *" required value={poNumber} onChange={(event) => setPoNumber(event.target.value)} />
                <Input label="Supplier Name *" required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
                <Input label="Supplier Phone" value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} />
                <Input label="Order Date *" type="date" required value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
                <Input label="Expected Delivery" type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} />
                <div className="md:col-span-2 xl:col-span-3">
                  <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
              </div>

              <SectionCard title="Purchase Lines">
                <div className="space-y-3">
                  {isLoadingItems ? (
                    <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]">
                      Loading catalogue items...
                    </div>
                  ) : (
                    lines.map((line, index) => (
                      <div key={line.id} className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[var(--color-text-primary)]">Line {index + 1}</div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                            Remove
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <Select label="Item *" value={line.itemUid} onChange={(event) => updateLine(line.id, "itemUid", event.target.value)} options={itemOptions} />
                          <Input label="Quantity *" type="number" min="1" step="1" value={line.quantityOrdered} onChange={(event) => updateLine(line.id, "quantityOrdered", event.target.value)} />
                          <Input label="Unit Price *" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, "unitPrice", event.target.value)} />
                          <Input label="Line Total" value={formatCurrency(lineTotals[index] || 0)} readOnly />
                          <div className="md:col-span-2 xl:col-span-4">
                            <Input label="Line Notes" value={line.notes} onChange={(event) => updateLine(line.id, "notes", event.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={isLoadingItems}>Add Line</Button>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">Order Total: {formatCurrency(totalAmount)}</div>
                  </div>
                </div>
              </SectionCard>

              <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
                <Button type="button" variant="outline" onClick={() => navigate(returnTo)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || isLoadingItems}>{isSubmitting ? "Creating..." : "Create Purchase Order"}</Button>
              </div>
            </form>
          </SectionCard>
        ) : isLoading ? (
          <SectionCard>
            <div className="py-8 text-sm text-[var(--color-text-secondary)]">Loading purchase workspace...</div>
          </SectionCard>
        ) : selectedPo ? (
          <>
            <SectionCard title={`PO ${selectedPo.poNumber}`} actions={<Badge variant={getPurchaseStatusVariant(selectedPo.status)}>{selectedPo.status}</Badge>}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Supplier" value={selectedPo.supplierName} />
                <DetailField label="Supplier Phone" value={selectedPo.supplierPhone || "-"} />
                <DetailField label="Order Date" value={formatDate(selectedPo.orderDate)} />
                <DetailField label="Expected Delivery" value={formatDate(selectedPo.expectedDeliveryDate)} />
                <DetailField label="Total Amount" value={formatCurrency(selectedPo.totalAmount || 0)} />
                <div className="md:col-span-2 xl:col-span-4">
                  <DetailField label="Notes" value={selectedPo.notes || "-"} />
                </div>
              </div>
            </SectionCard>
            <SectionCard title="PO Lines">
              {selectedPo.lines?.length ? (
                <div className="space-y-3">
                  {selectedPo.lines.map((line, index) => {
                    const receivedCount = receivedCountByItem.get(line.itemUid) || 0;
                    return (
                      <div key={line.lineUid || `${line.itemUid}-${index}`} className="rounded-lg border border-[var(--color-border)] bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-[var(--color-text-primary)]">{line.itemName || line.itemCode || line.itemUid}</div>
                            <div className="mt-1 text-[var(--color-text-secondary)]">Ordered {line.quantityOrdered} • Received {receivedCount}</div>
                            {line.notes ? <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{line.notes}</div> : null}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(line.lineTotal)}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(line.unitPrice)} / unit</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No line details" description="This purchase order has no loaded line items." />
              )}
            </SectionCard>

            <SectionCard
              title="Receipts (GRNs)"
              actions={
                draftGrn ? null : (
                  <Button size="sm" onClick={() => setIsCreateGrnOpen(true)} disabled={isSubmitting}>
                    Create GRN
                  </Button>
                )
              }
            >
              {grns.length ? (
                <div className="space-y-4">
                  {grns.map((grn) => (
                    <div key={grn.grnUid} className="rounded-xl border border-[var(--color-border)] bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{grn.grnNumber}</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(grn.receivedDate)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getGrnStatusVariant(grn.status)}>{grn.status}</Badge>
                          {grn.status === "DRAFT" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDraftTagForm(grn)}
                                disabled={isSubmitting}
                              >
                                Add Draft Tag
                              </Button>
                              <Button size="sm" onClick={() => void handleFinalizeGrn(grn.grnUid)} disabled={isSubmitting}>Finalize GRN</Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                        <DetailField label="Received By" value={grn.receivedBy || "-"} />
                        <DetailField label="Total Pieces" value={String(grn.totalPieces ?? 0)} />
                        <div className="md:col-span-2 xl:col-span-4">
                          <DetailField label="Notes" value={grn.notes || "-"} />
                        </div>
                      </div>

                      <div className="border-t border-[var(--color-border)] px-4 py-4">
                        {activeGrn?.grnUid === grn.grnUid ? (
                          <div className="mb-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-slate-50/70 px-4 py-3">
                              <div>
                                <div className="text-sm font-semibold text-[var(--color-text-primary)]">Add Draft Tag</div>
                                <div className="text-xs text-[var(--color-text-secondary)]">
                                  Enter tag details for {grn.grnNumber} before finalizing this GRN.
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={closeDraftTagForm} disabled={isSubmitting}>Close</Button>
                            </div>
                            <div className="space-y-4 px-4 py-4">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                <div className="xl:col-span-2">
                                  <Select
                                    label="Item *"
                                    value={draftTagForm.itemUid}
                                    onChange={(event) => setDraftTagForm({ ...draftTagForm, itemUid: event.target.value })}
                                    options={[{ label: "Select item", value: "" }, ...poItemOptions]}
                                  />
                                </div>
                                <div className="xl:col-span-2">
                                  <Input label="Item Code" value={draftTagForm.itemCode} onChange={(event) => setDraftTagForm({ ...draftTagForm, itemCode: event.target.value })} />
                                </div>
                                <div className="xl:col-span-2">
                                  <Input label="Tag Number *" value={draftTagForm.tagNumber} onChange={(event) => setDraftTagForm({ ...draftTagForm, tagNumber: event.target.value })} />
                                </div>
                                <Input label="Gross Wt (g) *" type="number" min="0" step="0.001" value={draftTagForm.grossWt} onChange={(event) => setDraftTagForm({ ...draftTagForm, grossWt: event.target.value })} />
                                <Input label="Net Wt (g) *" type="number" min="0" step="0.001" value={draftTagForm.netWt} onChange={(event) => setDraftTagForm({ ...draftTagForm, netWt: event.target.value })} />
                                <Input label="Stone Wt (g)" type="number" min="0" step="0.001" value={draftTagForm.stoneWt} onChange={(event) => setDraftTagForm({ ...draftTagForm, stoneWt: event.target.value })} />
                                <Input label="Wastage Wt (g)" type="number" min="0" step="0.001" value={draftTagForm.wastageWt} onChange={(event) => setDraftTagForm({ ...draftTagForm, wastageWt: event.target.value })} />
                              </div>
                              <div>
                                <Textarea label="Notes" rows={2} value={draftTagForm.notes} onChange={(event) => setDraftTagForm({ ...draftTagForm, notes: event.target.value })} />
                              </div>
                              <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
                                <Button variant="outline" onClick={closeDraftTagForm} disabled={isSubmitting}>Cancel</Button>
                                <Button onClick={() => void handleCreateDraftTag()} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Draft Tag"}</Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {grn.draftTags.length ? (
                          <div className="space-y-3">
                            {grn.draftTags.map((tag) => (
                              <div key={tag.draftTagUid} className="rounded-lg border border-[var(--color-border)] bg-slate-50/40 p-3 text-sm">
                                <div className="font-medium text-[var(--color-text-primary)]">{tag.tagNumber || tag.draftTagUid}</div>
                                <div className="mt-1 text-[var(--color-text-secondary)]">
                                  {tag.itemName || tag.itemCode || tag.itemUid} • Gross {tag.grossWt ?? 0}g • Net {tag.netWt ?? 0}g
                                </div>
                                {tag.notes ? <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{tag.notes}</div> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState title="No draft tags" description="Add draft tags before finalizing this GRN." />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No receipts found" description="Create a GRN to start receiving stock for this purchase order." />
              )}
            </SectionCard>

            <SectionCard title="Actions">
              <div className="flex flex-wrap justify-end gap-2">
                {selectedPo.status === "DRAFT" ? <Button onClick={() => void handleStatusUpdate("CONFIRMED")} disabled={isSubmitting}>Confirm PO</Button> : null}
                {selectedPo.status === "CONFIRMED" ? <Button onClick={() => void handleStatusUpdate("CLOSED")} disabled={isSubmitting}>Close PO</Button> : null}
                <Button variant="outline" onClick={() => navigate(returnTo)}>Back to Purchases</Button>
              </div>
            </SectionCard>
          </>
        ) : (
          <SectionCard>
            <EmptyState title="Purchase order not found" description="The requested purchase order is unavailable or was removed." />
          </SectionCard>
        )}
      </div>

      <CreateGrnDialog
        open={isCreateGrnOpen}
        value={grnDraft}
        onChange={setGrnDraft}
        onClose={() => {
          setIsCreateGrnOpen(false);
          setGrnDraft(createGrnDraft());
        }}
        onSubmit={() => void handleCreateGrn()}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

async function loadWorkspace(poUid: string) {
  const [purchaseOrder, grns] = await Promise.all([
    purchaseService.getPurchaseOrderDetails(poUid),
    purchaseService.getPurchaseOrderGrns(poUid),
  ]);

  const grnsWithDraftTags = await Promise.all(
    (Array.isArray(grns) ? grns : []).map(async (grn) => {
      try {
        const draftTags = await purchaseService.getDraftTags(grn.grnUid);
        return { ...grn, draftTags: Array.isArray(draftTags) ? draftTags : [] };
      } catch {
        return { ...grn, draftTags: [] };
      }
    }),
  );

  return { purchaseOrder, grns: grnsWithDraftTags };
}

function CreateGrnDialog({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  value: CreateGrnDraft;
  onChange: (value: CreateGrnDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Create GRN" description="Create a goods receipt note for this purchase order." size="md">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="GRN Number *" value={value.grnNumber} onChange={(event) => onChange({ ...value, grnNumber: event.target.value })} />
        <Input label="Received Date *" type="date" value={value.receivedDate} onChange={(event) => onChange({ ...value, receivedDate: event.target.value })} />
        <Input label="Received By" value={value.receivedBy} onChange={(event) => onChange({ ...value, receivedBy: event.target.value })} />
        <Input label="Total Pieces *" type="number" min="1" step="1" value={value.totalPieces} onChange={(event) => onChange({ ...value, totalPieces: event.target.value })} />
        <div className="md:col-span-2">
          <Textarea label="Notes" rows={2} value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create GRN"}</Button>
      </DialogFooter>
    </Dialog>
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
