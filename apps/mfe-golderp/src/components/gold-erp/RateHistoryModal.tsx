import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyStateBlock } from "./EmptyStateBlock";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/gold-erp-utils";
import { usePuritiesByMetal } from "@/hooks/useMasterData";
import { useRateHistory } from "@/hooks/useRates";
import { Metal } from "@/lib/gold-erp-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metals: Metal[];
}

export function RateHistoryModal({ open, onOpenChange, metals }: Props) {
  const activeMetals = useMemo(
    () => metals.filter((metal) => metal.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)),
    [metals],
  );
  const [selectedMetalUid, setSelectedMetalUid] = useState("");
  const [selectedPurityUid, setSelectedPurityUid] = useState("");
  const { data: purities = [], isLoading: puritiesLoading } = usePuritiesByMetal(selectedMetalUid);
  const { data: rates = [], isLoading: historyLoading } = useRateHistory(selectedMetalUid, selectedPurityUid);

  const sortedPurities = useMemo(
    () => [...purities].sort((a, b) => Number(b.purityRatio || 0) - Number(a.purityRatio || 0)),
    [purities],
  );
  const sortedRates = [...rates].sort((a, b) => {
    const aTime = a?.effectiveFrom || a?.effectiveDate ? new Date(a.effectiveFrom || a.effectiveDate).getTime() : 0;
    const bTime = b?.effectiveFrom || b?.effectiveDate ? new Date(b.effectiveFrom || b.effectiveDate).getTime() : 0;
    return bTime - aTime;
  });

  useEffect(() => {
    if (!open) {
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] h-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Rate History</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
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

          {!selectedMetalUid ? (
            <EmptyStateBlock title="No metal selected" description="Select a metal to load available purity history." />
          ) : puritiesLoading ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              Loading purities...
            </div>
          ) : sortedPurities.length === 0 ? (
            <EmptyStateBlock
              title="No purities configured"
              description="Create purity master records for the selected metal before viewing rate history."
            />
          ) : !selectedPurityUid ? (
            <EmptyStateBlock title="No purity selected" description="Choose a purity to load its history." />
          ) : historyLoading ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              Loading rate history...
            </div>
          ) : sortedRates.length === 0 ? (
            <EmptyStateBlock
              title="No rate history available"
              description="No historical rates were returned for the selected metal and purity."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Rate / Gram</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Effective From</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRates.map((rate) => (
                    <tr key={rate.rateUid || `${rate.metalUid}-${rate.purityUid}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(rate.ratePerGram || 0)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateTime(rate.effectiveFrom || rate.effectiveDate)}</td>
                      <td className="px-4 py-2"><StatusBadge status={rate.status || "ACTIVE"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
