import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { RateHistoryModal } from "@/components/gold-erp/RateHistoryModal";
import { MetalRateUpdateDialog } from "@/components/gold-erp/MetalRateUpdateDialog";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/gold-erp-utils";
import { History, Save } from "lucide-react";
import { useCurrentRatesAll } from "@/hooks/useRates";
import { useMetals, usePurities } from "@/hooks/useMasterData";

export default function MetalRatesPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  const { data: metals = [] } = useMetals();
  const { data: purities = [] } = usePurities();
  const { data: currentRates = [], isLoading } = useCurrentRatesAll();

  const activeMetals = useMemo(
    () => metals.filter((metal) => metal.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)),
    [metals],
  );

  const purityRowsByMetal = useMemo(
    () =>
      activeMetals.map((metal) => ({
        metal,
        purities: purities
          .filter((purity) => purity.metalUid === metal.metalUid && purity.status === "ACTIVE")
          .sort((a, b) => Number(b.purityRatio || 0) - Number(a.purityRatio || 0))
          .map((purity) => {
            const matchingRate = currentRates.find(
              (rate) => rate.metalUid === metal.metalUid && rate.purityUid === purity.purityUid,
            );

            return {
              purity,
              rate: matchingRate,
            };
          }),
      })),
    [activeMetals, currentRates, purities],
  );

  return (
    <div className="erp-section-gap">
      <PageHeader title="Metal Rate Engine" subtitle="Manage rates by metal master and review live active rates by section">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsUpdateOpen(true)}>
            <Save className="h-4 w-4 mr-1" />Update Rates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
            <History className="h-4 w-4 mr-1" />Rate History
          </Button>
        </div>
      </PageHeader>

      <MetalRateUpdateDialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen} metals={metals} currentRates={currentRates} />
      <RateHistoryModal open={isHistoryOpen} onOpenChange={setIsHistoryOpen} metals={metals} />

      {activeMetals.length === 0 ? (
        <SectionCard title="Current Active Rates">
          <EmptyStateBlock title="No metals configured" description="Create metal master records before managing rates." />
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {purityRowsByMetal.map(({ metal, purities: purityRows }) => (
            <SectionCard
              key={metal.metalUid}
              title={metal.name}
              subtitle={`Metal Code: ${metal.metalCode}`}
              noPadding
            >
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading active rates...</div>
              ) : purityRows.length === 0 ? (
                <EmptyStateBlock
                  title={`No purities configured for ${metal.name}`}
                  description="Create active purity master records for this metal before managing rates."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purity</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Rate / Gram</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Effective From</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purityRows.map(({ purity, rate }) => (
                        <tr key={rate?.rateUid || `${metal.metalUid}-${purity.purityUid}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium text-foreground">{purity.label || purity.purityCode || "-"}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">
                            {rate ? `${formatCurrency(rate.ratePerGram)}/g` : "Not set"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {rate ? formatDateTime(rate.effectiveFrom || rate.effectiveDate) : "Not set"}
                          </td>
                          <td className="px-4 py-2">
                            {rate ? <StatusBadge status={rate.status || "ACTIVE"} /> : <span className="text-sm text-muted-foreground">Not set</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
