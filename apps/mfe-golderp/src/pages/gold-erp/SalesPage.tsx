import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { FilterBar } from "@/components/gold-erp/FilterBar";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { StatCard } from "@/components/gold-erp/StatCard";
import { Button } from "@/components/ui/button";
import { FileText, Landmark, Maximize, Percent, Plus, Printer, ShoppingBag } from "lucide-react";
import { useSalesOrders } from "@/hooks/useSales";
import { SalesOrderDetailDrawer } from "@/components/gold-erp/SalesOrderDetailDrawer";
import { InvoicePrintModal } from "@/components/gold-erp/InvoicePrintModal";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { DataExportModal } from "@/components/gold-erp/DataExportModal";
import { calculateOrderTotals, formatCurrency, formatDate } from "@/lib/gold-erp-utils";

export default function SalesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<any | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { data: salesOrders = [], isLoading } = useSalesOrders();

  const filtered = useMemo(
    () =>
      salesOrders.filter((order: any) => {
        const query = search.toLowerCase();
        const matchSearch =
          !query ||
          order.orderNumber?.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.customerPhone?.includes(search);
        const matchStatus = statusFilter === "all" || order.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [salesOrders, search, statusFilter],
  );

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todaysOrders = salesOrders.filter((order: any) => formatDate(order.orderDate) === today);
    const todaysRevenue = todaysOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || calculateOrderTotals(order).lineTotal), 0);
    const todaysOldGold = salesOrders.reduce((sum: number, order: any) => sum + calculateOrderTotals(order).oldGoldTotal, 0);
    const draftCount = salesOrders.filter((order: any) => order.status === "DRAFT").length;

    return {
      todayCount: todaysOrders.length,
      todaysRevenue,
      todaysOldGold,
      draftCount,
    };
  }, [salesOrders]);

  const exportRows = useMemo(
    () =>
      filtered.map((order: any) => {
        const totals = calculateOrderTotals(order);
        return {
          OrderNumber: order.orderNumber,
          Customer: order.customerName,
          Phone: order.customerPhone || "",
          OrderDate: formatDate(order.orderDate),
          Status: order.status,
          TotalAmount: order.totalAmount || totals.lineTotal,
          BalanceDue: order.balanceDue ?? totals.payable,
        };
      }),
    [filtered],
  );

  return (
    <div className="erp-section-gap">
      <PageHeader title="Sales & Invoicing" subtitle="Manage retail sales, order confirmation, invoicing, and exchange adjustments">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}><FileText className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" onClick={() => navigate("/sales/new")}><Plus className="h-4 w-4 mr-1" />New Sale Order</Button>
        </div>
      </PageHeader>

      <DataExportModal open={isExportOpen} onOpenChange={setIsExportOpen} title="Sales Orders" rows={exportRows} />
      <SalesOrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onPrintInvoice={setPrintInvoiceOrder} />
      <InvoicePrintModal open={!!printInvoiceOrder} onOpenChange={(value) => !value && setPrintInvoiceOrder(null)} order={printInvoiceOrder} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={ShoppingBag} label="Today's Orders" value={stats.todayCount} iconBg="bg-primary-soft" iconColor="text-primary" />
        <StatCard icon={Landmark} label="Revenue (Today)" value={formatCurrency(stats.todaysRevenue)} iconBg="bg-success-soft" iconColor="text-success" />
        <StatCard icon={Percent} label="Old Gold Received" value={formatCurrency(stats.todaysOldGold)} iconBg="bg-warning-soft" iconColor="text-warning-foreground" />
        <StatCard icon={FileText} label="Draft Orders" value={stats.draftCount} iconBg="bg-muted" iconColor="text-muted-foreground" />
      </div>

      <SectionCard noPadding>
        <div className="p-[var(--card-padding)] pb-0">
          <FilterBar
            searchPlaceholder="Search by order number, phone or customer..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "Draft", value: "DRAFT" },
                  { label: "Confirmed", value: "CONFIRMED" },
                  { label: "Invoiced", value: "INVOICED" },
                  { label: "Cancelled", value: "CANCELLED" },
                ],
                value: statusFilter,
                onChange: setStatusFilter,
              },
            ]}
          />
        </div>
        <div className="overflow-x-auto mt-3">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading sales orders...</div>}
          {filtered.length === 0 && !isLoading ? (
            <EmptyStateBlock
              title="No sales orders found"
              description="Create a sales order or adjust the current search and status filters."
            />
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Order Number</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Phone</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Sales Value</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount Due</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order: any) => {
                const totals = calculateOrderTotals(order);
                return (
                  <tr key={order.orderUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{order.orderNumber}</td>
                    <td className="px-4 py-2 text-foreground">{formatDate(order.orderDate)}</td>
                    <td className="px-4 py-2 font-medium text-foreground">{order.customerName}</td>
                    <td className="px-4 py-2 text-muted-foreground font-mono">{order.customerPhone || "-"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCurrency(order.totalAmount || totals.lineTotal)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(order.balanceDue ?? totals.payable)}</td>
                    <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === "INVOICED" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setPrintInvoiceOrder(order)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order)}>
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
