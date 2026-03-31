import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { StatCard } from "@/components/gold-erp/StatCard";
import { QuickActionTile } from "@/components/gold-erp/QuickActionTile";
import { RateSummaryCard } from "@/components/gold-erp/RateSummaryCard";
import { StatusBadge } from "@/components/gold-erp/StatusBadge";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { Button } from "@/components/ui/button";
import { useCurrentRatesAll } from "@/hooks/useRates";
import { useSalesOrders } from "@/hooks/useSales";
import { useTags, useTransfers } from "@/hooks/useInventory";
import {
  Database,
  BarChart3,
  ListTodo,
  Globe,
  History,
  Layers,
  Package,
  PackagePlus,
  Plus,
  RefreshCcw,
  ShoppingCart,
  Tag,
  TrendingUp,
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import { calculateOrderTotals, formatCurrency } from "@/lib/gold-erp-utils";

const CHART_COLORS = ["hsl(243, 75%, 40%)", "hsl(142, 72%, 40%)", "hsl(38, 92%, 50%)", "hsl(210, 92%, 50%)"];

const truncateChartLabel = (value: string, maxLength = 12) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: rates = [] } = useCurrentRatesAll();
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: tags = [] } = useTags();
  const { data: transfers = [] } = useTransfers();

  const quickActions = [
    { icon: ShoppingCart, label: "Sales", iconBg: "bg-success-soft", iconColor: "text-success", path: "/sales" },
    { icon: Tag, label: "Tags", iconBg: "bg-info-soft", iconColor: "text-info", path: "/tags" },
    { icon: Package, label: "Purchases", iconBg: "bg-warning-soft", iconColor: "text-warning", path: "/purchase" },
    { icon: PackagePlus, label: "GRN Entry", iconBg: "bg-primary-soft", iconColor: "text-primary", path: "/grn" },
    { icon: Database, label: "Master Data", iconBg: "bg-primary-soft", iconColor: "text-primary", path: "/masters" },
    { icon: ListTodo, label: "Items", path: "/catalogue" },
    { icon: RefreshCcw, label: "Exchange", iconBg: "bg-danger-soft", iconColor: "text-danger", path: "/old-gold" },
    { icon: Globe, label: "Online Orders", iconBg: "bg-info-soft", iconColor: "text-info", path: "/online-orders" },
    { icon: TrendingUp, label: "Metal Rate", path: "/rates" },
    { icon: Warehouse, label: "Stock", iconBg: "bg-warning-soft", iconColor: "text-warning", path: "/inventory" },
    { icon: BarChart3, label: "Reports", iconBg: "bg-success-soft", iconColor: "text-success", path: "/reports" },
    { icon: History, label: "Audit Log", iconBg: "bg-muted", iconColor: "text-foreground", path: "/audit" },
  ] as const;

  const goldRates = rates.filter((rate: any) => rate.metalName?.toLowerCase() === "gold").map((rate: any) => ({ purityName: rate.purityLabel, rate: rate.ratePerGram }));
  const silverRates = rates.filter((rate: any) => rate.metalName?.toLowerCase() === "silver").map((rate: any) => ({ purityName: rate.purityLabel, rate: rate.ratePerGram }));

  const stats = useMemo(() => {
    const inStockTags = tags.filter((tag: any) => tag.status === "IN_STOCK");
    const reservedTags = tags.filter((tag: any) => tag.status === "RESERVED");
    const todayKey = new Date().toLocaleDateString();
    const todaysSales = salesOrders.filter((order: any) => new Date(order.orderDate).toLocaleDateString() === todayKey);

    return {
      totalTagsInStock: inStockTags.length,
      totalTagsReserved: reservedTags.length,
      todaySalesValue: todaysSales.reduce((sum: number, order: any) => sum + (order.totalAmount || calculateOrderTotals(order).lineTotal), 0),
      pendingOnlineOrders: salesOrders.filter((order: any) => order.orderType === "ONLINE" && order.status === "DRAFT").length,
      totalGoldWeightInStock: inStockTags.reduce((sum: number, tag: any) => sum + (tag.netWt || 0), 0),
      pendingTransfers: transfers.filter((transfer: any) => transfer.status === "IN_TRANSIT").length,
    };
  }, [salesOrders, tags, transfers]);

  const stockByType = useMemo(() => {
    const grouped = new Map<string, number>();
    tags.filter((tag: any) => tag.status === "IN_STOCK").forEach((tag: any) => {
      const key = tag.itemName || "Unknown";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).slice(0, 4).map(([type, count]) => ({ type, count }));
  }, [tags]);

  const salesData = useMemo(() => {
    const grouped = new Map<string, { sales: number; purchase: number }>();
    salesOrders.forEach((order: any) => {
      const label = new Date(order.orderDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const current = grouped.get(label) || { sales: 0, purchase: 0 };
      current.sales += order.totalAmount || calculateOrderTotals(order).lineTotal;
      grouped.set(label, current);
    });
    return Array.from(grouped.entries()).slice(-6).map(([day, values]) => ({ day, ...values }));
  }, [salesOrders]);

  return (
    <div className="erp-section-gap">
      <PageHeader title="Gold ERP Dashboard" subtitle="Overview of jewellery operations using live ERP data" />

      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-12">
          {quickActions.map((action) => (
            <QuickActionTile
              key={action.label}
              icon={action.icon}
              label={action.label}
              iconBg={action.iconBg}
              iconColor={action.iconColor}
              className="justify-center"
              onClick={() => navigate(action.path)}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard icon={Layers} label="Tags In Stock" value={stats.totalTagsInStock} iconBg="bg-success-soft" iconColor="text-success" />
        <StatCard icon={Tag} label="Tags Reserved" value={stats.totalTagsReserved} iconBg="bg-warning-soft" iconColor="text-warning" />
        <StatCard icon={ShoppingCart} label="Today's Sales" value={formatCurrency(stats.todaySalesValue)} iconBg="bg-primary-soft" iconColor="text-primary" />
        <StatCard icon={Globe} label="Pending Online" value={stats.pendingOnlineOrders} iconBg="bg-info-soft" iconColor="text-info" />
        <StatCard icon={Warehouse} label="Gold In Stock" value={`${stats.totalGoldWeightInStock.toFixed(1)}g`} iconBg="bg-warning-soft" iconColor="text-warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RateSummaryCard metalName="Gold" rates={goldRates} />
        <RateSummaryCard metalName="Silver" rates={silverRates} />
        <SectionCard title="Alerts">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning shrink-0" /><span className="text-foreground">{stats.pendingOnlineOrders} online orders pending processing</span></div>
            <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-info shrink-0" /><span className="text-foreground">{stats.pendingTransfers} transfers awaiting receipt</span></div>
            <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-success shrink-0" /><span className="text-foreground">{rates.length} active metal rates loaded</span></div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <SectionCard title="Sales Trend" subtitle="Recent sales activity" className="lg:col-span-2">
          {salesData.length === 0 ? (
            <EmptyStateBlock
              imageType="chart"
              title="No chart data for sales trend"
              description="Sales will appear here once order data is available."
              className="h-[220px] justify-center"
            />
          ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="sales" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </SectionCard>

        <SectionCard title="Stock by Type" subtitle="In-stock tag distribution">
          {stockByType.length === 0 ? (
            <EmptyStateBlock
              imageType="chart"
              title="No chart data for stock mix"
              description="Stock category distribution will appear once inventory tags are available."
              className="h-[220px] justify-center"
            />
          ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ type, count }) => `${truncateChartLabel(type)}: ${count}`}
                  labelLine={false}
                  style={{ fontSize: "12px" }}
                >
                  {stockByType.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent Sale Orders" noPadding headerAction={salesOrders.length === 0 ? null : (<Button variant="ghost" size="sm" onClick={() => navigate("/sales")} className="text-xs">View All</Button>)}>
        {salesOrders.length === 0 ? (
          <EmptyStateBlock
            title="No recent sale orders"
            description="Recent orders will appear here after sales are created."
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.slice(0, 6).map((order: any) => (
                <tr key={order.orderUid} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium text-foreground">{order.orderNumber}</td>
                  <td className="px-4 py-2"><StatusBadge status={order.orderType} /></td>
                  <td className="px-4 py-2 text-foreground">{order.customerName}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">{formatCurrency(order.totalAmount || calculateOrderTotals(order).lineTotal)}</td>
                  <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </SectionCard>
    </div>
  );
}
