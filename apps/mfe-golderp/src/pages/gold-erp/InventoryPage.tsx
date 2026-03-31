import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/gold-erp/StatCard";
import { TransferFormModal } from "@/components/gold-erp/TransferFormModal";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { useConfirmTransferReceived, useMarkTransferInTransit, useTags, useTransfers } from "@/hooks/useInventory";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Layers, Package, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, summarizeInventory } from "@/lib/gold-erp-utils";
import { useItems } from "@/hooks/useCatalogue";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { data: tags = [] } = useTags();
  const { data: items = [] } = useItems();
  const { data: transfers = [], isLoading } = useTransfers();
  const markTransit = useMarkTransferInTransit();
  const confirmReceived = useConfirmTransferReceived();

  const stockSummary = useMemo(() => summarizeInventory(tags, items), [tags, items]);
  const totalStockValue = tags.filter((tag: any) => tag.status === "IN_STOCK").reduce((sum: number, tag: any) => sum + (tag.sellingPrice || 0), 0);
  const itemsInStock = tags.filter((tag: any) => tag.status === "IN_STOCK").length;
  const valueAtRisk = transfers.filter((transfer: any) => transfer.status === "IN_TRANSIT").length;

  const handleTransit = async (transferUid: string) => {
    try {
      await markTransit.mutateAsync({ transferUid });
      toast.success("Transfer marked as in-transit");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReceived = async (transferUid: string) => {
    try {
      await confirmReceived.mutateAsync(transferUid);
      toast.success("Transfer confirmed as received");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="erp-section-gap">
      <PageHeader title="Store Inventory" subtitle="Live stock summary">
        {/* <Button size="sm" onClick={() => setIsTransferModalOpen(true)}><ArrowRightLeft className="h-4 w-4 mr-1" />New Transfer</Button> */}
      </PageHeader>

      <TransferFormModal open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Layers} label="Total Stock Value" value={formatCurrency(totalStockValue)} iconBg="bg-primary-soft" iconColor="text-primary" />
        <StatCard icon={Package} label="Items in Stock" value={itemsInStock} iconBg="bg-success-soft" iconColor="text-success" />
        <StatCard icon={AlertTriangle} label="Categories in Stock" value={stockSummary.length} iconBg="bg-destructive-soft" iconColor="text-destructive" />
        {/* <StatCard icon={ShieldCheck} label="Transfers In Transit" value={valueAtRisk} iconBg="bg-warning-soft" iconColor="text-warning" /> */}
      </div>

      <Tabs defaultValue="stock" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock by Category</TabsTrigger>
          {/* <TabsTrigger value="transfers">Transfer History</TabsTrigger> */}
        </TabsList>

        <TabsContent value="stock">
          <SectionCard title="Current Valuation Summary" noPadding>
            {stockSummary.length === 0 ? (
              <EmptyStateBlock title="No stock data available" description="Confirmed GRNs will populate inventory valuation by category." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Category</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Items</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total Mass</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Estimated Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockSummary.map((category) => (
                      <tr key={category.category} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium text-foreground">{category.category}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">{category.count}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">{category.mass}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(category.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="transfers">
          <SectionCard title="Inter-Branch Movements" noPadding>
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading transfers...</div>}
            {transfers.length === 0 && !isLoading ? (
              <EmptyStateBlock title="No transfers available" description="Create a stock transfer when you need to move tags between locations." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Transfer</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Destination</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Transfer Date</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Items</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((transfer: any) => (
                      <tr key={transfer.transferUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs font-medium text-foreground">{transfer.transferNumber}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{transfer.toAccountName || transfer.toAccount || "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(transfer.transferDate || transfer.receivedDate || undefined)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground">{transfer.totalTags ?? transfer.lines?.length ?? 0}</td>
                        <td className="px-4 py-2"><StatusBadge status={transfer.status} /></td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {transfer.status === "PENDING" && (
                              <Button variant="outline" size="sm" onClick={() => handleTransit(transfer.transferUid)} disabled={markTransit.isPending}>
                                <Truck className="h-3.5 w-3.5 mr-1" />Dispatch
                              </Button>
                            )}
                            {transfer.status === "IN_TRANSIT" && (
                              <Button variant="default" size="sm" onClick={() => handleReceived(transfer.transferUid)} disabled={confirmReceived.isPending}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Receive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
