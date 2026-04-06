import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  BarChart,
  Button,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  PieChart,
  SectionCard,
  StatCard,
  type ColumnDef,
  type IconName,
} from "@jaldee/design-system";
import {
  catalogueService,
  inventoryService,
  masterDataService,
  rateService,
  salesService,
} from "@/services";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type DashboardItem = {
  id: string;
  itemUid: string;
  name: string;
};

type DashboardRate = {
  id: string;
  metalName: string;
  purityName: string;
  ratePerGram: number;
};

type DashboardSaleOrder = {
  id: string;
  orderNumber: string;
  orderType: string;
  customerName: string;
  total: number;
  status: string;
  createdDate: string;
};

type DashboardTag = {
  id: string;
  itemUid: string;
  itemName: string;
  status: string;
  netWeight: number;
};

type DashboardTransfer = {
  id: string;
  status: string;
};

type DashboardOrderRow = {
  id: string;
  orderNumber: string;
  orderType: string;
  customerName: string;
  total: number;
  status: string;
  createdDate: string;
};

const quickActions = [
  { label: "Sales", path: "sales", icon: "cart" as IconName, tone: "emerald" },
  { label: "Tags", path: "tags", icon: "tag" as IconName, tone: "blue" },
  { label: "Purchases", path: "purchase", icon: "box" as IconName, tone: "amber" },
  { label: "GRN Entry", path: "grn", icon: "packagePlus" as IconName, tone: "violet" },
  { label: "Master Data", path: "masters", icon: "database" as IconName, tone: "indigo" },
  { label: "Items", path: "catalogue", icon: "list" as IconName, tone: "indigo" },
  { label: "Exchange", path: "old-gold", icon: "refresh" as IconName, tone: "rose" },
  { label: "Online Orders", path: "online-orders", icon: "globe" as IconName, tone: "blue" },
  { label: "Metal Rate", path: "rates", icon: "trend" as IconName, tone: "violet" },
  { label: "Stock", path: "inventory", icon: "warehouse" as IconName, tone: "amber" },
  { label: "Reports", path: "reports", icon: "chart" as IconName, tone: "emerald" },
  { label: "Audit Log", path: "audit", icon: "history" as IconName, tone: "slate" },
] as const;

const toneClasses = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  indigo: "bg-indigo-50 text-indigo-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

function getBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "ACTIVE" || status === "INVOICED" || status === "IN_STOCK") {
    return "success";
  }
  if (status === "ONLINE" || status === "CONFIRMED") {
    return "info";
  }
  if (status === "RESERVED" || status === "ADVANCE" || status === "PENDING_TAG_ASSIGNMENT" || status === "IN_TRANSIT") {
    return "warning";
  }
  if (status === "CANCELLED") {
    return "danger";
  }
  return "neutral";
}

function formatOrderType(value: string) {
  return value.replace(/_/g, " ");
}

function normalizeDate(date: string) {
  if (!date) return "-";
  const normalized = new Date(date);
  if (Number.isNaN(normalized.getTime())) return date;
  return normalized.toLocaleDateString("en-GB");
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrencyWithDecimals(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeItem(item: any): DashboardItem {
  const itemUid = String(item.itemUid ?? item.uid ?? item.id ?? "");
  return {
    id: itemUid,
    itemUid,
    name: String(item.name ?? item.itemName ?? "Item"),
  };
}

function normalizeRate(rate: any): DashboardRate {
  return {
    id: String(rate.rateUid ?? rate.uid ?? `${rate.metalUid}-${rate.purityUid}`),
    metalName: String(rate.metalName ?? "Metal"),
    purityName: String(rate.purityLabel ?? rate.purityName ?? "Purity"),
    ratePerGram: Number(rate.ratePerGram ?? 0),
  };
}

function normalizeSalesOrder(order: any): DashboardSaleOrder {
  return {
    id: String(order.orderUid ?? order.uid ?? order.id ?? ""),
    orderNumber: String(order.orderNumber ?? "-"),
    orderType: String(order.orderType ?? "WALK_IN"),
    customerName: String(order.customerName ?? "-"),
    total: Number(order.totalAmount ?? order.grandTotal ?? 0),
    status: String(order.status ?? order.orderStatus ?? "DRAFT"),
    createdDate: String(order.orderDate ?? order.createdDate ?? ""),
  };
}

function normalizeTag(tag: any): DashboardTag {
  return {
    id: String(tag.tagUid ?? tag.uid ?? tag.id ?? ""),
    itemUid: String(tag.itemUid ?? ""),
    itemName: String(tag.itemName ?? "Item"),
    status: String(tag.status ?? tag.tagStatus ?? "DRAFT"),
    netWeight: Number(tag.netWt ?? tag.netWeight ?? 0),
  };
}

function normalizeTransfer(transfer: any): DashboardTransfer {
  return {
    id: String(transfer.transferUid ?? transfer.uid ?? transfer.id ?? ""),
    status: String(transfer.status ?? "PENDING"),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [rates, setRates] = useState<DashboardRate[]>([]);
  const [salesOrders, setSalesOrders] = useState<DashboardSaleOrder[]>([]);
  const [tags, setTags] = useState<DashboardTag[]>([]);
  const [transfers, setTransfers] = useState<DashboardTransfer[]>([]);

  useEffect(() => {
    let cancelled = false;

    console.log("[Dashboard] loading catalogue items");
    void catalogueService.getItems()
      .then((data) => {
        console.log("[Dashboard] fetched items:", data);
        if (!cancelled) setItems(Array.isArray(data) ? data.map(normalizeItem) : []);
      })
      .catch((error) => {
        console.error("[Dashboard] failed to load items", error);
        if (!cancelled) setItems([]);
      });

    console.log("[Dashboard] loading rates via purities");
    void masterDataService.getPurities()
      .then(async (purities) => {
        const rateResults = await Promise.all(
          purities.map(async (purity) => {
            try {
              return await rateService.getCurrentRate(purity.metalUid, purity.purityUid);
            } catch {
              return null;
            }
          }),
        );

        const data = rateResults.filter(Boolean);
        console.log("[Dashboard] fetched rates:", data);
        if (!cancelled) setRates(data.map(normalizeRate));
      })
      .catch((error) => {
        console.error("[Dashboard] failed to load rates", error);
        if (!cancelled) setRates([]);
      });

    console.log("[Dashboard] loading sales orders");
    void salesService.getSalesOrderHeaders()
      .then((data) => {
        console.log("[Dashboard] fetched sales orders:", data);
        if (!cancelled) setSalesOrders(Array.isArray(data) ? data.map(normalizeSalesOrder) : []);
      })
      .catch((error) => {
        console.error("[Dashboard] failed to load sales orders", error);
        if (!cancelled) setSalesOrders([]);
      });

    console.log("[Dashboard] loading tags");
    void inventoryService.getTags()
      .then((data) => {
        console.log("[Dashboard] fetched tags:", data);
        if (!cancelled) setTags(Array.isArray(data) ? data.map(normalizeTag) : []);
      })
      .catch((error) => {
        console.error("[Dashboard] failed to load tags", error);
        if (!cancelled) setTags([]);
      });

    console.log("[Dashboard] loading transfers");
    void inventoryService.getTransfers()
      .then((data) => {
        console.log("[Dashboard] fetched transfers:", data);
        if (!cancelled) setTransfers(Array.isArray(data) ? data.map(normalizeTransfer) : []);
      })
      .catch((error) => {
        console.error("[Dashboard] failed to load transfers", error);
        if (!cancelled) setTransfers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const inStockTags = tags.filter((tag) => tag.status === "IN_STOCK");
    const reservedTags = tags.filter((tag) => tag.status === "RESERVED");
    const todaySales = salesOrders.filter((order) => order.createdDate.startsWith(getTodayKey()));

    return {
      tagsInStock: inStockTags.length,
      tagsReserved: reservedTags.length,
      todaySalesValue: todaySales.reduce((sum, order) => sum + order.total, 0),
      pendingOnline: salesOrders.filter(
        (order) => order.orderType === "ONLINE" && order.status !== "INVOICED" && order.status !== "CANCELLED",
      ).length,
      goldInStock: inStockTags.reduce((sum, tag) => sum + tag.netWeight, 0),
      pendingTransfers: transfers.filter(
        (transfer) => transfer.status === "DISPATCHED" || transfer.status === "IN_TRANSIT" || transfer.status === "PENDING",
      ).length,
    };
  }, [salesOrders, tags, transfers]);

  const goldRates = useMemo(
    () =>
      rates
        .filter((rate) => rate.metalName.toLowerCase() === "gold")
        .sort((a, b) => b.ratePerGram - a.ratePerGram)
        .map((rate) => ({ label: rate.purityName, value: `${formatCurrency(rate.ratePerGram)}/g` })),
    [rates],
  );

  const silverRates = useMemo(
    () =>
      rates
        .filter((rate) => rate.metalName.toLowerCase() === "silver")
        .sort((a, b) => b.ratePerGram - a.ratePerGram)
        .map((rate) => ({ label: rate.purityName, value: `${formatCurrency(rate.ratePerGram)}/g` })),
    [rates],
  );

  const salesTrendData = useMemo(() => {
    const grouped = salesOrders.reduce<Record<string, number>>((acc, order) => {
      const key = order.createdDate ? normalizeDate(order.createdDate) : "Unknown";
      acc[key] = (acc[key] || 0) + order.total;
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
      .slice(-7)
      .map(([label, value]) => ({
        label,
        value,
      }));
  }, [salesOrders]);

  const chartMax = Math.max(...salesTrendData.map((item) => item.value), 0);
  const salesTrendTicks = useMemo(() => {
    if (chartMax <= 0) {
      return [0];
    }

    const step = Math.ceil(chartMax / 4 / 1000) * 1000;
    return [0, step, step * 2, step * 3, step * 4];
  }, [chartMax]);

  const stockByType = useMemo(() => {
    const itemNameByUid = new Map(items.map((item) => [item.itemUid, item.name]));
    const counts = tags.reduce<Record<string, number>>((acc, tag) => {
      if (tag.status !== "IN_STOCK") {
        return acc;
      }

      const label = itemNameByUid.get(tag.itemUid) ?? tag.itemName ?? "Unknown";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(counts).slice(0, 3);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    const colors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"];

    return entries.map(([label, count], index) => ({
      label,
      count,
      color: colors[index % colors.length],
      percentage: (count / total) * 100,
    }));
  }, [items, tags]);

  const orderRows = useMemo<DashboardOrderRow[]>(
    () =>
      salesOrders
        .slice()
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
        .slice(0, 6)
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          customerName: order.customerName,
          total: order.total,
          status: order.status,
          createdDate: order.createdDate,
        })),
    [salesOrders],
  );

  const orderColumns = useMemo<ColumnDef<DashboardOrderRow>[]>(
    () => [
      { key: "orderNumber", header: "Order #" },
      {
        key: "orderType",
        header: "Type",
        render: (row) => <Badge variant={getBadgeVariant(row.orderType)}>{formatOrderType(row.orderType)}</Badge>,
      },
      { key: "customerName", header: "Customer" },
      {
        key: "total",
        header: "Total",
        align: "right",
        render: (row) => <span className="font-semibold tabular-nums">{formatCurrencyWithDecimals(row.total)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getBadgeVariant(row.status)}>{formatOrderType(row.status)}</Badge>,
      },
      {
        key: "createdDate",
        header: "Date",
        render: (row) => <span className="text-slate-500">{normalizeDate(row.createdDate)}</span>,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Gold ERP Dashboard"
          subtitle="Overview of jewellery operations using live ERP data"
        />

        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center transition-colors hover:bg-slate-50"
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClasses[action.tone])}>
                  <Icon name={action.icon} />
                </span>
                <span className="text-xs font-semibold text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard layout="compact" accent="emerald" icon={<Icon name="layers" />} label="Tags In Stock" value={stats.tagsInStock} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="tag" />} label="Tags Reserved" value={stats.tagsReserved} />
          <StatCard layout="compact" accent="indigo" icon={<Icon name="cart" />} label="Today's Sales" value={formatCurrencyWithDecimals(stats.todaySalesValue)} />
          <StatCard layout="compact" accent="indigo" icon={<Icon name="globe" />} label="Pending Online" value={stats.pendingOnline} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="warehouse" />} label="Gold In Stock" value={`${stats.goldInStock.toFixed(1)}g`} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <RateCard title="Gold Rates" rows={goldRates} />
          <RateCard title="Silver Rates" rows={silverRates} />
          <SectionCard title="Alerts">
            <div className="space-y-3">
              <AlertRow color="text-amber-500" text={`${stats.pendingOnline} online orders pending processing`} />
              <AlertRow color="text-blue-500" text={`${stats.pendingTransfers} transfers awaiting receipt`} />
              <AlertRow color="text-emerald-500" text={`${rates.length} active metal rates loaded`} />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-[2fr,1fr]">
          <SectionCard title="Sales Trend" actions={<span className="text-xs text-slate-500">Recent sales activity</span>}>
            {salesTrendData.length === 0 ? (
              <EmptyState title="No chart data" description="Sales will appear here once order data is available." />
            ) : (
              <BarChart
                data={salesTrendData}
                yTicks={salesTrendTicks}
                className="rounded-xl border border-slate-200 bg-white p-2"
              />
            )}
          </SectionCard>

          <SectionCard title="Stock by Type" actions={<span className="text-xs text-slate-500">In-stock tag distribution</span>}>
            {stockByType.length === 0 ? (
              <EmptyState title="No stock data" description="Stock distribution will appear once in-stock items are available." />
            ) : (
              <PieChart
                data={stockByType.map((item) => ({
                  label: item.label,
                  value: item.count,
                  color: item.color,
                }))}
              />
            )}
          </SectionCard>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-900">Recent Sale Orders</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("sales")}>
              View All
            </Button>
          </div>

          <DataTable
            data={orderRows}
            columns={orderColumns}
            getRowId={(row) => row.id}
            emptyState={<EmptyState title="No recent sale orders" description="Recent orders will appear here after sales are created." />}
            className="border-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}

function RateCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <EmptyState title="No active rates" description="Rates will appear here once configured." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">{row.label}</span>
              <span className="font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AlertRow({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Icon name="alert" className={cn("h-4 w-4 shrink-0", color)} />
      <span>{text}</span>
    </div>
  );
}
