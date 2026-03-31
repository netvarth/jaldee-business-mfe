import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Maximize, Plus } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/usePurchase";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";
import { PurchaseOrder } from "@/lib/gold-erp-types";

export default function PurchasePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: serverPOs, isLoading } = usePurchaseOrders();
  const purchaseOrders = serverPOs || [];

  const filtered = purchaseOrders.filter((po: PurchaseOrder) => {
    const query = search.toLowerCase();
    const matchSearch = !query || po.poNumber?.toLowerCase().includes(query) || po.supplierName?.toLowerCase().includes(query);
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="erp-section-gap">
      <PageHeader title="Purchase Ordering & GRN" subtitle="Manage POs, receipts, and tag generation for inventory">
        <Button size="sm" onClick={() => navigate("/purchase/new")}>
          <Plus className="h-4 w-4 mr-1" />New Purchase Order
        </Button>
      </PageHeader>

      <SectionCard noPadding>
        <div className="p-[var(--card-padding)] pb-0">
          <FilterBar
            searchPlaceholder="Search by PO number or supplier..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[{
              key: "status", label: "Status",
              options: [
                { label: "Draft", value: "DRAFT" },
                { label: "Confirmed", value: "CONFIRMED" },
                { label: "Closed", value: "CLOSED" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            }]}
          />
        </div>
        <div className="overflow-x-auto mt-3">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading purchase orders...</div>}
          {filtered.length === 0 && !isLoading ? (
            <EmptyStateBlock title="No purchase orders found" description="Create a purchase order to start the inward and GRN workflow." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">PO Number</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Supplier</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Order / Delivery</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total Amount</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((po: PurchaseOrder) => (
                  <tr key={po.poUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs font-medium text-foreground">{po.poNumber}</td>
                    <td className="px-4 py-2 font-medium text-foreground">{po.supplierName}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      <div>{formatDate(po.orderDate)}</div>
                      <div className="text-xs">ETA {formatDate(po.expectedDeliveryDate)}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCurrency(po.totalAmount || 0)}</td>
                    <td className="px-4 py-2"><StatusBadge status={po.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/purchase/${po.poUid}`)}>
                         <Maximize className="h-3.5 w-3.5 mr-1" />
                        View / Process
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
