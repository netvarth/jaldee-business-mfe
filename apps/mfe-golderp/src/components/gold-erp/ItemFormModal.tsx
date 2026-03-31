import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateItem, useTaxSettings, useUpdateItem } from "@/hooks/useCatalogue";
import { useMetals, usePurities } from "@/hooks/useMasterData";
import { JewelleryItem, TaxSetting } from "@/lib/gold-erp-types";
import { cn } from "@/lib/utils";
import { CheckSquare, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: JewelleryItem | null;
}

const getInitialFormData = () => ({
  itemCode: "",
  name: "",
  itemType: "RING",
  metalUid: "",
  purityUid: "",
  typicalGrossWt: "",
  typicalNetWt: "",
  hsnCode: "",
  taxRate: "3",
  description: "",
  availableOnline: false,
  chargeType: "PER_GRAM",
  chargeValue: "",
  status: "ACTIVE",
});

export function ItemFormModal({ open, onOpenChange, editItem }: Props) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { data: metals = [] } = useMetals();
  const { data: purities = [] } = usePurities();
  const { data: taxSettings = [], isLoading: taxSettingsLoading, isFetching: taxSettingsFetching } = useTaxSettings(open);
  const isEditMode = Boolean(editItem);
  const [formData, setFormData] = useState(getInitialFormData);
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  const [isTaxDropdownOpen, setIsTaxDropdownOpen] = useState(false);

  useEffect(() => {
    if (editItem) {
      setSelectedTaxIds([]);
      setFormData({
        itemCode: editItem.itemCode || "",
        name: editItem.name || "",
        itemType: editItem.itemType || "RING",
        metalUid: editItem.metalUid || "",
        purityUid: editItem.purityUid || "",
        typicalGrossWt: editItem.typicalGrossWt !== undefined ? String(editItem.typicalGrossWt) : "",
        typicalNetWt: editItem.typicalNetWt !== undefined ? String(editItem.typicalNetWt) : "",
        hsnCode: editItem.hsnCode || "",
        taxRate: editItem.taxRate !== undefined ? String(editItem.taxRate) : "3",
        description: editItem.description || "",
        availableOnline: Boolean(editItem.availableOnline),
        chargeType: editItem.chargeType || "PER_GRAM",
        chargeValue: editItem.chargeValue !== undefined ? String(editItem.chargeValue) : "",
        status: editItem.status || "ACTIVE",
      });
      return;
    }

    if (open) {
      setFormData(getInitialFormData());
      setSelectedTaxIds([]);
      setIsTaxDropdownOpen(false);
    }
  }, [editItem, open]);

  const filteredPurities = purities.filter((purity: any) => !formData.metalUid || purity.metalUid === formData.metalUid);

  const normalizedTaxSettings = useMemo(
    () =>
      taxSettings.map((tax) => ({
        ...tax,
        id: String(tax.id),
        taxPercentage: Number(tax.taxPercentage ?? 0),
      })),
    [taxSettings],
  );

  const selectedTaxOptions = useMemo(
    () => normalizedTaxSettings.filter((tax) => selectedTaxIds.includes(tax.id)),
    [normalizedTaxSettings, selectedTaxIds],
  );

  const selectedTaxRate = useMemo(
    () => selectedTaxOptions.reduce((total, tax) => total + Number(tax.taxPercentage || 0), 0),
    [selectedTaxOptions],
  );

  const selectedTaxLabel = useMemo(() => {
    if (taxSettingsLoading || taxSettingsFetching) {
      return "Loading tax settings...";
    }

    if (selectedTaxOptions.length === 0) {
      return "Select tax";
    }

    return selectedTaxOptions.map((tax) => tax.taxName).join(", ");
  }, [selectedTaxOptions, taxSettingsFetching, taxSettingsLoading]);

  useEffect(() => {
    if (!open || normalizedTaxSettings.length === 0) {
      return;
    }

    if (selectedTaxIds.length > 0) {
      return;
    }

    const currentTaxRate = Number(formData.taxRate);
    if (Number.isNaN(currentTaxRate) || currentTaxRate <= 0) {
      setSelectedTaxIds([]);
      return;
    }

    const exactMatch = normalizedTaxSettings.find(
      (tax) => Math.abs(Number(tax.taxPercentage || 0) - currentTaxRate) < 0.0001,
    );

    if (exactMatch) {
      setSelectedTaxIds([exactMatch.id]);
    }
  }, [open, normalizedTaxSettings, formData.taxRate, selectedTaxIds.length]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      taxRate: selectedTaxIds.length > 0 ? String(selectedTaxRate) : "",
    }));
  }, [selectedTaxIds, selectedTaxRate]);

  const handleChange = (field: string, value: string) => {
    setFormData((current) => {
      if (field === "metalUid") {
        return { ...current, metalUid: value, purityUid: "" };
      }
      return { ...current, [field]: value };
    });
  };

  const toggleTaxSelection = (taxId: string) => {
    setSelectedTaxIds((current) =>
      current.includes(taxId) ? current.filter((id) => id !== taxId) : [...current, taxId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaxIds.length === 0) {
      toast.error("Select at least one tax");
      return;
    }

    try {
      const payload = {
        itemCode: formData.itemCode,
        name: formData.name,
        itemType: formData.itemType as "RING" | "NECKLACE" | "BANGLE" | "EARRING",
        metalUid: formData.metalUid,
        purityUid: formData.purityUid,
        typicalGrossWt: formData.typicalGrossWt ? parseFloat(formData.typicalGrossWt) : undefined,
        typicalNetWt: formData.typicalNetWt ? parseFloat(formData.typicalNetWt) : undefined,
        hsnCode: formData.hsnCode,
        taxRate: selectedTaxRate,
        description: formData.description || undefined,
        availableOnline: formData.availableOnline,
        chargeType: formData.chargeType as "PER_GRAM" | "FLAT" | "PERCENTAGE",
        chargeValue: parseFloat(formData.chargeValue),
        status: formData.status as "ACTIVE" | "INACTIVE",
      };

      if (isEditMode && editItem) {
        await updateItem.mutateAsync({ itemUid: editItem.itemUid, data: payload });
        toast.success("Item updated successfully");
      } else {
        await createItem.mutateAsync(payload as {
          itemCode: string;
          name: string;
          itemType: "RING" | "NECKLACE" | "BANGLE" | "EARRING";
          metalUid: string;
          purityUid: string;
          typicalGrossWt: number;
          typicalNetWt: number;
          hsnCode: string;
          taxRate: number;
          description?: string;
          availableOnline: boolean;
          chargeType: "PER_GRAM" | "FLAT" | "PERCENTAGE";
          chargeValue: number;
          status: "ACTIVE" | "INACTIVE";
        });
        toast.success("Item created successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(isEditMode ? "Failed to update item" : "Failed to create item", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Jewellery Item" : "Create New Jewellery Item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Code / SKU</Label>
              <Input required value={formData.itemCode} onChange={(e) => handleChange("itemCode", e.target.value)} placeholder="RNG-22K-001" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input required value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Classic Solitaire Ring" />
            </div>
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={formData.itemType} onValueChange={(value) => handleChange("itemType", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RING">Ring</SelectItem>
                  <SelectItem value="NECKLACE">Necklace</SelectItem>
                  <SelectItem value="BANGLE">Bangle</SelectItem>
                  <SelectItem value="EARRING">Earring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metal</Label>
              <Select value={formData.metalUid} onValueChange={(value) => handleChange("metalUid", value)}>
                <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                <SelectContent>
                  {metals.map((metal: any) => <SelectItem key={metal.metalUid} value={metal.metalUid}>{metal.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purity</Label>
              <Select value={formData.purityUid} onValueChange={(value) => handleChange("purityUid", value)}>
                <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                <SelectContent>
                  {filteredPurities.map((purity: any) => <SelectItem key={purity.purityUid} value={purity.purityUid}>{purity.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <Label>Typical Gross Wt (g)</Label>
              <Input  type="number" step="0.01" value={formData.typicalGrossWt} onChange={(e) => handleChange("typicalGrossWt", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Typical Net Wt (g)</Label>
              <Input  type="number" step="0.01" value={formData.typicalNetWt} onChange={(e) => handleChange("typicalNetWt", e.target.value)} />
            </div> */}
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input required value={formData.hsnCode} onChange={(e) => handleChange("hsnCode", e.target.value)} placeholder="71131910" />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between font-normal",
                    selectedTaxIds.length === 0 && "text-muted-foreground",
                  )}
                  onClick={() => setIsTaxDropdownOpen((current) => !current)}
                >
                  <span className="truncate text-left">{selectedTaxLabel}</span>
                  {taxSettingsLoading || taxSettingsFetching ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckSquare className="ml-2 h-4 w-4" />
                  )}
                </Button>

                {isTaxDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-[70] mt-2 rounded-lg border bg-background shadow-lg">
                    <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Select Taxes
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {taxSettingsLoading || taxSettingsFetching ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading tax settings...
                        </div>
                      ) : normalizedTaxSettings.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">No enabled tax settings found.</div>
                      ) : (
                        normalizedTaxSettings.map((tax: TaxSetting & { id: string; taxPercentage: number }) => {
                          const checked = selectedTaxIds.includes(tax.id);

                          return (
                            <label
                              key={tax.id}
                              className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/40"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTaxSelection(tax.id)}
                                className="mt-0.5 h-4 w-4 rounded border border-primary accent-primary"
                              />
                              <div className="min-w-0 flex-1 text-sm">
                                <div className="font-medium text-foreground">{tax.taxName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {Number(tax.taxPercentage || 0).toFixed(2)}%
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedTaxIds.length > 0 ? `${selectedTaxIds.length} selected` : "No tax selected"}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIsTaxDropdownOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* <div className="text-xs text-muted-foreground">{selectedTaxLabel}</div> */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>{selectedTaxIds.length > 0 ? `Combined tax rate: ${selectedTaxRate.toFixed(2)}%` : "No tax selected"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Charge Type</Label>
              <Select value={formData.chargeType} onValueChange={(value) => handleChange("chargeType", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_GRAM">Per Gram</SelectItem>
                  <SelectItem value="FLAT">Flat Rate</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Charge Value</Label>
              <Input required type="number" step="0.01" value={formData.chargeValue} onChange={(e) => handleChange("chargeValue", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Available Online</Label>
              <Select
                value={formData.availableOnline ? "YES" : "NO"}
                onValueChange={(value) => setFormData((current) => ({ ...current, availableOnline: value === "YES" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Operations studio sample item" />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {isEditMode ? "Update Item" : "Save Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
