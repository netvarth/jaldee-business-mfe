import { cn } from "@/lib/utils";

interface RateSummaryCardProps {
  metalName: string;
  rates: { purityName: string; rate: number; isBase?: boolean }[];
  className?: string;
}

export function RateSummaryCard({ metalName, rates, className }: RateSummaryCardProps) {
  const formatRate = (r: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(r);

  return (
    <div className={cn("erp-card", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">{metalName} Rates</h3>
      <div className="space-y-2">
        {rates.map((r) => (
          <div key={r.purityName} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{r.purityName}</span>
              {r.isBase && (
                <span className="text-[10px] bg-primary-soft text-primary px-1.5 py-0.5 rounded font-medium">BASE</span>
              )}
            </div>
            <span className="text-sm font-semibold text-foreground tabular-nums">{formatRate(r.rate)}/g</span>
          </div>
        ))}
      </div>
    </div>
  );
}
