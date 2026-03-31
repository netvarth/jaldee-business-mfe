import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatCard } from "@/components/gold-erp/StatCard";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/gold-erp-utils";
import { useSalesOrdersWithDetails } from "@/hooks/useSales";
import { useNavigate } from "react-router-dom";

export default function OldGoldPage() {
  const navigate = useNavigate();
  const { data: salesOrders = [] } = useSalesOrdersWithDetails();
  const exchangeEntries = useMemo(() => salesOrders.flatMap((order: any) => order.oldGoldEntries || []), [salesOrders]);
  const totalCredit = exchangeEntries.reduce((sum: number, entry: any) => sum + (entry.exchangeValue || 0), 0);
  const totalWeight = exchangeEntries.reduce((sum: number, entry: any) => sum + (entry.netWt || 0), 0);

  return (
    <div className="erp-section-gap">
      <PageHeader title="Metal Exchange" subtitle="Exchange entries recorded inside sales workflows, including gold and other metals.">
        <Button size="sm" onClick={() => navigate("/sales")}><RefreshCcw className="h-4 w-4 mr-1" />Open Sales Workflow</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={RefreshCcw} label="Total Exchanges" value={exchangeEntries.length} iconBg="bg-primary-soft" iconColor="text-primary" />
        <StatCard icon={RefreshCcw} label="Total Net Weight" value={formatWeight(totalWeight)} iconBg="bg-warning-soft" iconColor="text-warning" />
        <StatCard icon={RefreshCcw} label="Total Credit Given" value={formatCurrency(totalCredit)} iconBg="bg-success-soft" iconColor="text-success" />
      </div>

      <SectionCard title="Exchange History" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50"><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metal</th><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Purity</th><th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Weight</th><th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Rate/g</th><th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Credit</th></tr></thead>
            <tbody>
              {exchangeEntries.map((entry: any, index: number) => (
                <tr key={entry.exchangeUid || index} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-foreground">{entry.metalType}</td>
                  <td className="px-4 py-2 text-foreground">{entry.purityLabel}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatWeight(entry.netWt)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCurrency(entry.rateApplied)}/g</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(entry.exchangeValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
