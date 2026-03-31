import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { ReportExportModal } from "@/components/gold-erp/ReportExportModal";
import { Button } from "@/components/ui/button";
import { Download, ShoppingCart, Package, Tag, Warehouse, RefreshCcw, Globe, TrendingUp, FileText } from "lucide-react";
import { useSalesOrders } from "@/hooks/useSales";
import { usePurchaseOrders } from "@/hooks/usePurchase";
import { useTags } from "@/hooks/useInventory";
import { useCurrentRatesAll } from "@/hooks/useRates";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<{ name: string; data: unknown } | null>(null);
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: tags = [] } = useTags();
  const { data: rates = [] } = useCurrentRatesAll();

  const reports = useMemo(
    () => [
      { name: "Sales Report", description: `${salesOrders.length} sales orders`, icon: ShoppingCart, data: salesOrders },
      { name: "Purchase Report", description: `${purchaseOrders.length} purchase orders`, icon: Package, data: purchaseOrders },
      { name: "Tag Movement Report", description: `${tags.length} tracked tags`, icon: Tag, data: tags },
      { name: "Stock by Status", description: `${tags.filter((tag: any) => tag.status === "IN_STOCK").length} tags in stock`, icon: Warehouse, data: tags },
      { name: "Metal Exchange Report", description: "Derived from sales orders", icon: RefreshCcw, data: salesOrders },
      { name: "Online Order Report", description: `${salesOrders.filter((order: any) => order.orderType === "ONLINE").length} online orders`, icon: Globe, data: salesOrders },
      { name: "Rate History Snapshot", description: `${rates.length} active rates`, icon: TrendingUp, data: rates },
      { name: "Invoice Summary", description: `${salesOrders.filter((order: any) => order.status === "INVOICED").length} invoiced orders`, icon: FileText, data: salesOrders },
    ],
    [purchaseOrders, rates, salesOrders, tags],
  );

  return (
    <div className="erp-section-gap">
      <PageHeader title="Reports & Analytics" subtitle="Operational report snapshots using live Gold ERP data" />
      <ReportExportModal open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)} report={selectedReport} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => (
          <SectionCard key={report.name} className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
              <report.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{report.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                  {Array.isArray(report.data) ? report.data.length : 0} rows
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedReport(report)}>
                  <Download className="h-3 w-3 mr-1" />Export
                </Button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
