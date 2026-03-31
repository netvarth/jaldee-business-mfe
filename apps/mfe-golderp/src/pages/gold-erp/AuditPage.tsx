import { useMemo } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { useSalesOrders } from "@/hooks/useSales";
import { usePurchaseOrders } from "@/hooks/usePurchase";
import { useTags, useTransfers } from "@/hooks/useInventory";
import { RefreshCcw, ShoppingCart, Tag, TrendingUp, Warehouse } from "lucide-react";
import { formatDate } from "@/lib/gold-erp-utils";

export default function AuditPage() {
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: tags = [] } = useTags();
  const { data: transfers = [] } = useTransfers();

  const auditEntries = useMemo(
    () => [
      ...purchaseOrders.map((po: any) => ({ id: `po-${po.poUid}`, action: "Purchase Order", entity: "Purchase", detail: `${po.poNumber} for ${po.supplierName}`, timestamp: po.orderDate, icon: RefreshCcw })),
      ...salesOrders.map((order: any) => ({ id: `so-${order.orderUid}`, action: "Sales Order", entity: "Sales", detail: `${order.orderNumber} for ${order.customerName}`, timestamp: order.orderDate, icon: ShoppingCart })),
      ...tags.slice(0, 10).map((tag: any) => ({ id: `tag-${tag.tagUid}`, action: "Tag Status", entity: "Tag", detail: `${tag.tagNumber} is ${tag.status}`, timestamp: new Date().toISOString(), icon: Tag })),
      ...transfers.map((transfer: any) => ({ id: `tr-${transfer.transferUid}`, action: "Transfer", entity: "Transfer", detail: `${transfer.transferNumber} to ${transfer.toAccountName || transfer.toAccount || "-"}`, timestamp: transfer.transferDate, icon: Warehouse })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [purchaseOrders, salesOrders, tags, transfers],
  );

  return (
    <div className="erp-section-gap">
      <PageHeader title="Audit Log" subtitle="Derived transaction activity from current ERP records" />

      <SectionCard noPadding>
        <div className="divide-y divide-border">
          {auditEntries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-[var(--card-padding)] py-3 hover:bg-muted/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft mt-0.5">
                <entry.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{entry.action}</span>
                  <StatusBadge status={entry.entity} variant="info" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
