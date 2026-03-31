import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { usePuritiesByMetal } from "@/hooks/useMasterData";
import { useSaveRate } from "@/hooks/useRates";
import { formatCurrency, toApiDateTime } from "@/lib/gold-erp-utils";
import { EntityStatus, Metal, MetalRate } from "@/lib/gold-erp-types";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface MetalRateUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metals: Metal[];
  currentRates: MetalRate[];
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function MetalRateUpdateDialog({ open, onOpenChange, metals, currentRates }: MetalRateUpdateDialogProps) {
  const activeMetals = useMemo(
    () => metals.filter((metal) => metal.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)),
    [metals],
  );
  const [selectedMetalUid, setSelectedMetalUid] = useState("");
  const [selectedPurityUid, setSelectedPurityUid] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [effectiveDateTime, setEffectiveDateTime] = useState(getCurrentDateTimeLocal());
  const [status, setStatus] = useState<EntityStatus>("ACTIVE");
  const { data: purities = [], isLoading: puritiesLoading } = usePuritiesByMetal(selectedMetalUid);
  const saveRate = useSaveRate();

  const selectedMetal = activeMetals.find((metal) => metal.metalUid === selectedMetalUid) || null;
  const sortedPurities = useMemo(
    () => [...purities].sort((a, b) => Number(b.purityRatio || 0) - Number(a.purityRatio || 0)),
    [purities],
  );
  const selectedPurity = sortedPurities.find((purity) => purity.purityUid === selectedPurityUid) || null;
  const currentRate = currentRates.find((rate) => rate.metalUid === selectedMetalUid && rate.purityUid === selectedPurityUid);

  useEffect(() => {
    if (!open) {
      return;
    }

    setEffectiveDateTime(getCurrentDateTimeLocal());
    setStatus("ACTIVE");
    setSelectedMetalUid((current) => {
      if (current && activeMetals.some((metal) => metal.metalUid === current)) {
        return current;
      }

      return activeMetals[0]?.metalUid || "";
    });
  }, [open, activeMetals]);

  useEffect(() => {
    if (!open || !selectedMetalUid) {
      setSelectedPurityUid("");
      return;
    }

    setSelectedPurityUid((current) => {
      if (current && sortedPurities.some((purity) => purity.purityUid === current)) {
        return current;
      }

      return sortedPurities[0]?.purityUid || "";
    });
  }, [open, selectedMetalUid, sortedPurities]);

  useEffect(() => {
    if (!open || !selectedPurityUid) {
      setRateValue("");
      return;
    }

    setRateValue(currentRate ? String(currentRate.ratePerGram ?? "") : "");
  }, [open, selectedPurityUid, currentRate]);

  const handleSave = async () => {
    if (!selectedMetalUid) {
      toast.error("Select a metal");
      return;
    }

    if (!selectedPurityUid) {
      toast.error("Select a purity");
      return;
    }

    const ratePerGram = Number(rateValue);
    if (Number.isNaN(ratePerGram) || ratePerGram <= 0) {
      toast.error("Enter a valid rate");
      return;
    }

    try {
      await saveRate.mutateAsync({
        metalUid: selectedMetalUid,
        purityUid: selectedPurityUid,
        ratePerGram,
        effectiveDate: toApiDateTime(effectiveDateTime),
        status,
      });
      toast.success("Rate updated successfully", {
        description: `${selectedMetal?.name || "Selected metal"} ${selectedPurity?.label || selectedPurity?.purityCode || "purity"} rate was saved.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to update rate", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Metal Rates</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Metal</Label>
            <Select value={selectedMetalUid} onValueChange={setSelectedMetalUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select metal" />
              </SelectTrigger>
              <SelectContent>
                {activeMetals.map((metal) => (
                  <SelectItem key={metal.metalUid} value={metal.metalUid}>
                    {metal.name} ({metal.metalCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Purity</Label>
            <Select
              value={selectedPurityUid}
              onValueChange={setSelectedPurityUid}
              disabled={!selectedMetalUid || puritiesLoading || sortedPurities.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={puritiesLoading ? "Loading purities..." : "Select purity"} />
              </SelectTrigger>
              <SelectContent>
                {sortedPurities.map((purity) => (
                  <SelectItem key={purity.purityUid} value={purity.purityUid}>
                    {purity.purityCode} ({purity.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedMetalUid ? (
            <EmptyStateBlock title="No metal selected" description="Select a metal to load its purity master records." />
          ) : puritiesLoading ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              Loading purities...
            </div>
          ) : sortedPurities.length === 0 ? (
            <EmptyStateBlock
              title="No purities configured"
              description="Create purity master records for the selected metal before setting rates."
            />
          ) : !selectedPurityUid ? (
            <EmptyStateBlock title="No purity selected" description="Choose a purity to enter the required rate fields." />
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Purity</div>
                    <div className="font-medium text-foreground">{selectedPurity?.purityCode}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Label</div>
                    <div className="font-medium text-foreground">{selectedPurity?.label}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Current Rate</div>
                    <div className="font-medium text-foreground">{currentRate ? `${formatCurrency(currentRate.ratePerGram)}/g` : "-"}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rate Per Gram</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    placeholder="Enter rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Effective Date &amp; Time</Label>
                  <Input type="datetime-local" value={effectiveDateTime} onChange={(e) => setEffectiveDateTime(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as EntityStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Save payload: <code>{`{ metalUid, purityUid, ratePerGram, effectiveDate, status }`}</code>
              </div> */}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveRate.isPending || !selectedMetalUid || !selectedPurityUid}>
            <Save className="h-4 w-4 mr-1" />
            Save Rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
