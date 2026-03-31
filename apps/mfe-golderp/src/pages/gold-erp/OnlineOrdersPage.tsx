import { useMemo } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { StatCard } from "@/components/gold-erp/StatCard";
import { Button } from "@/components/ui/button";
import { Globe, Tag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";
import { useSalesOrders } from "@/hooks/useSales";
import { useNavigate } from "react-router-dom";

export default function OnlineOrdersPage() {
  const navigate = useNavigate();
  const { data: salesOrders = [] } = useSalesOrders();
  const onlineOrders = useMemo(() => salesOrders.filter((order: any) => order.orderType === "ONLINE"), [salesOrders]);
  const pending = onlineOrders.filter((order: any) => order.status === "DRAFT").length;
  const advanceCollected = onlineOrders.reduce((sum: number, order: any) => sum + (order.advancePaid || 0), 0);

  return (
    <div className="erp-section-gap">
      <PageHeader title="Online Orders" subtitle="Sales orders created with ONLINE order type">
        <Button size="sm" onClick={() => navigate("/sales")}>Open Sales Orders</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={Globe} label="Total Online Orders" value={onlineOrders.length} iconBg="bg-info-soft" iconColor="text-info" />
        <StatCard icon={Tag} label="Pending Processing" value={pending} iconBg="bg-warning-soft" iconColor="text-warning" />
        <StatCard icon={Globe} label="Advance Collected" value={formatCurrency(advanceCollected)} iconBg="bg-success-soft" iconColor="text-success" />
      </div>

      <SectionCard title="Online Order Queue" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50"><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Order #</th><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Customer</th><th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Advance</th><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th><th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th></tr></thead>
            <tbody>
              {onlineOrders.map((order: any) => (
                <tr key={order.orderUid} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/sales")}>
                  <td className="px-4 py-2 font-medium text-primary">{order.orderNumber}</td>
                  <td className="px-4 py-2 text-foreground">{order.customerName}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium text-foreground">{formatCurrency(order.advancePaid || 0)}</td>
                  <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(order.orderDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
