import { useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Button, Drawer, Input, PageErrorBoundary } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import {
  formatCurrency,
  oldGoldExchanges,
  purchaseOrders,
  saleOrders,
  stockTransfers,
  tags,
} from "./lib/mock-data";

type WorkspaceKey =
  | "overview"
  | "sales"
  | "purchases"
  | "inventory"
  | "customers"
  | "vendors"
  | "finance"
  | "reports"
  | "settings";

type SalesOrder = (typeof saleOrders)[number];
type PurchaseOrder = (typeof purchaseOrders)[number];
type InventoryTag = (typeof tags)[number];

const WORKSPACES: Array<{
  key: WorkspaceKey;
  path: string;
  label: string;
  summary: string;
}> = [
  { key: "overview", path: "/", label: "Overview", summary: "Business overview for Gold ERP." },
  { key: "sales", path: "/sales", label: "Sales", summary: "Orders, billing, and invoice flow." },
  { key: "purchases", path: "/purchases", label: "Purchases", summary: "Supplier-side purchase order tracking." },
  { key: "inventory", path: "/inventory", label: "Inventory", summary: "Stock valuation and item movement." },
  { key: "customers", path: "/customers", label: "Customers", summary: "Customer relationships and balances." },
  { key: "vendors", path: "/vendors", label: "Vendors", summary: "Vendor performance and procurement history." },
  { key: "finance", path: "/finance", label: "Finance", summary: "Financial totals from current ERP activity." },
  { key: "reports", path: "/reports", label: "Reports", summary: "Operational summaries by store and customer." },
  { key: "settings", path: "/settings", label: "Settings", summary: "Rollout and branch defaults for Gold ERP." },
];

function GoldErpLayout({
  activeKey,
  children,
}: {
  activeKey: WorkspaceKey;
  children?: React.ReactNode;
}) {
  const props = useMFEProps();
  const activeWorkspace = WORKSPACES.find((item) => item.key === activeKey) ?? WORKSPACES[0];

  return (
    <div className="min-h-screen bg-[var(--color-surface-alt)] p-6 text-[var(--color-text-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#78350f_0%,#b45309_45%,#f59e0b_100%)] px-8 py-10 text-white shadow-[0_24px_60px_rgba(180,83,9,0.28)]">
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
            Gold ERP
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            {activeWorkspace.label}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-white/85">
            {activeWorkspace.summary}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              Workspaces
            </p>
            <nav className="flex flex-col gap-2">
              {WORKSPACES.map((workspace) => (
                <NavLink
                  key={workspace.key}
                  to={workspace.path}
                  end={workspace.path === "/"}
                  className={({ isActive }) =>
                    [
                      "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-[var(--color-product-golderp)] bg-[var(--color-product-golderp-subtle)] text-[var(--color-product-golderp)]"
                        : "border-transparent bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]",
                    ].join(" ")
                  }
                >
                  {workspace.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="flex flex-col gap-6">
            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard title="Account" value={props.account.name} detail={`Domain: ${props.account.domain}`} />
              <SummaryCard title="User" value={props.user.name} detail={props.user.email} />
              <SummaryCard title="Location" value={props.location.name} detail={props.location.code} />
            </section>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
        {title}
      </p>
      <h2 className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
        {value}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {detail}
      </p>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
        {label}
      </p>
      <div className="mt-3 text-3xl font-bold text-[var(--color-text-primary)]">
        {value}
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-alt)] px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function OverviewWorkspace() {
  const totals = useMemo(() => {
    return {
      revenue: saleOrders.reduce((sum, order) => sum + order.grandTotal, 0),
      purchaseSpend: purchaseOrders.reduce((sum, order) => sum + order.totalCost, 0),
      inventoryValue: tags.reduce((sum, tag) => sum + tag.sellingPrice, 0),
      customerCount: new Set(saleOrders.map((order) => order.customerPhone)).size,
    };
  }, []);

  return (
    <GoldErpLayout activeKey="overview">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value={formatCurrency(totals.revenue)} />
        <MetricCard label="Purchases" value={formatCurrency(totals.purchaseSpend)} />
        <MetricCard label="Inventory Value" value={formatCurrency(totals.inventoryValue)} />
        <MetricCard label="Customers" value={String(totals.customerCount)} />
      </section>
    </GoldErpLayout>
  );
}

function SalesWorkspace() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SalesOrder | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return saleOrders.filter((order) => {
      return (
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query)
      );
    });
  }, [search]);

  return (
    <GoldErpLayout activeKey="sales">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Sales Orders</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Shared-component sales workspace.</p>
          </div>
          <Button type="button" variant="primary" size="md">New Sale Order</Button>
        </div>

        <div className="mt-6">
          <Input
            type="text"
            label="Search Orders"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order, customer, or phone"
            fullWidth
          />
        </div>

        <DataTable
          headings={["Order", "Customer", "Store", "Total", "Balance", "Status", "Action"]}
          rows={filtered.map((order) => [
            <span className="font-semibold text-[var(--color-product-golderp)]">{order.orderNumber}</span>,
            <div><div className="font-semibold">{order.customerName}</div><div className="text-xs text-[var(--color-text-secondary)]">{order.customerPhone}</div></div>,
            order.storeName,
            formatCurrency(order.grandTotal),
            formatCurrency(order.balanceDue),
            <StatusBadge
              label={order.orderStatus.replaceAll("_", " ")}
              tone={
                order.orderStatus === "FULLY_INVOICED"
                  ? "bg-emerald-500/12 text-emerald-700"
                  : order.orderStatus === "CONFIRMED"
                    ? "bg-blue-500/12 text-blue-700"
                    : "bg-amber-500/12 text-amber-700"
              }
            />,
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(order)}>View</Button>,
          ])}
          emptyMessage="No sales orders found."
        />
      </section>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} size="sm" title={selected?.orderNumber ?? "Order"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <DetailRow label="Customer" value={selected.customerName} />
            <DetailRow label="Phone" value={selected.customerPhone} />
            <DetailRow label="Store" value={selected.storeName} />
            <DetailRow label="Grand Total" value={formatCurrency(selected.grandTotal)} />
            <DetailRow label="Balance Due" value={formatCurrency(selected.balanceDue)} />
          </div>
        )}
      </Drawer>
    </GoldErpLayout>
  );
}

function PurchasesWorkspace() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchaseOrders.filter((order) => {
      return (
        !query ||
        order.poNumber.toLowerCase().includes(query) ||
        order.dealerName.toLowerCase().includes(query) ||
        order.storeName.toLowerCase().includes(query)
      );
    });
  }, [search]);

  return (
    <GoldErpLayout activeKey="purchases">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Purchase Orders</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Shared-component purchase workspace.</p>
          </div>
          <Button type="button" variant="primary" size="md">New Purchase Order</Button>
        </div>

        <div className="mt-6">
          <Input
            type="text"
            label="Search Purchase Orders"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by PO, vendor, or store"
            fullWidth
          />
        </div>

        <DataTable
          headings={["PO Number", "Vendor", "Store", "Items", "Total", "Status", "Action"]}
          rows={filtered.map((order) => [
            <span className="font-semibold text-[var(--color-product-golderp)]">{order.poNumber}</span>,
            order.dealerName,
            order.storeName,
            String(order.itemCount),
            formatCurrency(order.totalCost),
            <StatusBadge
              label={order.status.replaceAll("_", " ")}
              tone={
                order.status === "COMPLETED"
                  ? "bg-emerald-500/12 text-emerald-700"
                  : order.status === "GRN_CREATED"
                    ? "bg-blue-500/12 text-blue-700"
                    : "bg-slate-500/12 text-slate-700"
              }
            />,
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(order)}>View</Button>,
          ])}
          emptyMessage="No purchase orders found."
        />
      </section>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} size="sm" title={selected?.poNumber ?? "Purchase Order"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <DetailRow label="Vendor" value={selected.dealerName} />
            <DetailRow label="Store" value={selected.storeName} />
            <DetailRow label="Item Count" value={String(selected.itemCount)} />
            <DetailRow label="Total Cost" value={formatCurrency(selected.totalCost)} />
            <DetailRow label="Status" value={selected.status.replaceAll("_", " ")} />
          </div>
        )}
      </Drawer>
    </GoldErpLayout>
  );
}

function InventoryWorkspace() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryTag | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tags.filter((tag) => {
      return (
        !query ||
        tag.barcode.toLowerCase().includes(query) ||
        tag.itemName.toLowerCase().includes(query) ||
        tag.storeName.toLowerCase().includes(query)
      );
    });
  }, [search]);

  return (
    <GoldErpLayout activeKey="inventory">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Inventory</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Current stock and transfer visibility.</p>
          </div>
        </div>

        <div className="mt-6">
          <Input
            type="text"
            label="Search Inventory"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by barcode, item, or store"
            fullWidth
          />
        </div>

        <DataTable
          headings={["Barcode", "Item", "Store", "Gross", "Value", "Status", "Action"]}
          rows={filtered.map((tag) => [
            <span className="font-semibold text-[var(--color-product-golderp)]">{tag.barcode}</span>,
            <div><div className="font-semibold">{tag.itemName}</div><div className="text-xs text-[var(--color-text-secondary)]">{tag.itemType}</div></div>,
            tag.storeName,
            `${tag.grossWeight.toFixed(2)}g`,
            formatCurrency(tag.sellingPrice),
            <StatusBadge
              label={tag.tagStatus.replaceAll("_", " ")}
              tone={
                tag.tagStatus === "IN_STOCK"
                  ? "bg-emerald-500/12 text-emerald-700"
                  : tag.tagStatus === "RESERVED"
                    ? "bg-amber-500/12 text-amber-700"
                    : "bg-slate-500/12 text-slate-700"
              }
            />,
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(tag)}>View</Button>,
          ])}
          emptyMessage="No inventory items found."
        />
      </section>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} size="sm" title={selected?.barcode ?? "Inventory Item"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <DetailRow label="Item" value={selected.itemName} />
            <DetailRow label="Store" value={selected.storeName} />
            <DetailRow label="Gross Weight" value={`${selected.grossWeight.toFixed(2)}g`} />
            <DetailRow label="Selling Price" value={formatCurrency(selected.sellingPrice)} />
            <DetailRow label="Status" value={selected.tagStatus.replaceAll("_", " ")} />
          </div>
        )}
      </Drawer>
    </GoldErpLayout>
  );
}

function CustomersWorkspace() {
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; store: string; orders: number; spend: number; balance: number }>();
    saleOrders.forEach((order) => {
      const existing = map.get(order.customerPhone) ?? {
        name: order.customerName,
        phone: order.customerPhone,
        store: order.storeName,
        orders: 0,
        spend: 0,
        balance: 0,
      };
      existing.orders += 1;
      existing.spend += order.grandTotal;
      existing.balance += order.balanceDue;
      map.set(order.customerPhone, existing);
    });
    return Array.from(map.values());
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      return (
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.store.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  const selected = filtered.find((customer) => customer.phone === selectedPhone) ?? null;

  return (
    <GoldErpLayout activeKey="customers">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Customers</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Customer snapshot from current order data.</p>
          </div>
        </div>

        <div className="mt-6">
          <Input
            type="text"
            label="Search Customers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, or store"
            fullWidth
          />
        </div>

        <DataTable
          headings={["Customer", "Phone", "Store", "Orders", "Spend", "Balance", "Action"]}
          rows={filtered.map((customer) => [
            customer.name,
            customer.phone,
            customer.store,
            String(customer.orders),
            formatCurrency(customer.spend),
            formatCurrency(customer.balance),
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhone(customer.phone)}>View</Button>,
          ])}
          emptyMessage="No customers found."
        />
      </section>

      <Drawer open={Boolean(selected)} onClose={() => setSelectedPhone(null)} size="sm" title={selected?.name ?? "Customer"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Store" value={selected.store} />
            <DetailRow label="Orders" value={String(selected.orders)} />
            <DetailRow label="Spend" value={formatCurrency(selected.spend)} />
            <DetailRow label="Balance" value={formatCurrency(selected.balance)} />
          </div>
        )}
      </Drawer>
    </GoldErpLayout>
  );
}

function VendorsWorkspace() {
  const vendors = useMemo(() => {
    const map = new Map<string, { name: string; store: string; count: number; total: number }>();
    purchaseOrders.forEach((order) => {
      const existing = map.get(order.dealerName) ?? {
        name: order.dealerName,
        store: order.storeName,
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += order.totalCost;
      map.set(order.dealerName, existing);
    });
    return Array.from(map.values());
  }, []);

  return (
    <GoldErpLayout activeKey="vendors">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Vendors</h2>
        <DataTable
          headings={["Vendor", "Store", "PO Count", "Procurement"]}
          rows={vendors.map((vendor) => [
            vendor.name,
            vendor.store,
            String(vendor.count),
            formatCurrency(vendor.total),
          ])}
          emptyMessage="No vendors found."
        />
      </section>
    </GoldErpLayout>
  );
}

function FinanceWorkspace() {
  const metrics = useMemo(() => {
    return {
      revenue: saleOrders.reduce((sum, order) => sum + order.grandTotal, 0),
      purchases: purchaseOrders.reduce((sum, order) => sum + order.totalCost, 0),
      advances: saleOrders.reduce((sum, order) => sum + order.advancePaid, 0),
      outstanding: saleOrders.reduce((sum, order) => sum + order.balanceDue, 0),
    };
  }, []);

  return (
    <GoldErpLayout activeKey="finance">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value={formatCurrency(metrics.revenue)} />
        <MetricCard label="Purchase Spend" value={formatCurrency(metrics.purchases)} />
        <MetricCard label="Advance Collected" value={formatCurrency(metrics.advances)} />
        <MetricCard label="Outstanding" value={formatCurrency(metrics.outstanding)} />
      </section>
    </GoldErpLayout>
  );
}

function ReportsWorkspace() {
  const stores = useMemo(() => {
    const map = new Map<string, { store: string; sales: number; purchases: number; inventory: number }>();
    saleOrders.forEach((order) => {
      const entry = map.get(order.storeName) ?? { store: order.storeName, sales: 0, purchases: 0, inventory: 0 };
      entry.sales += order.grandTotal;
      map.set(order.storeName, entry);
    });
    purchaseOrders.forEach((order) => {
      const entry = map.get(order.storeName) ?? { store: order.storeName, sales: 0, purchases: 0, inventory: 0 };
      entry.purchases += order.totalCost;
      map.set(order.storeName, entry);
    });
    tags.forEach((tag) => {
      const entry = map.get(tag.storeName) ?? { store: tag.storeName, sales: 0, purchases: 0, inventory: 0 };
      entry.inventory += tag.sellingPrice;
      map.set(tag.storeName, entry);
    });
    return Array.from(map.values());
  }, []);

  return (
    <GoldErpLayout activeKey="reports">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="m-0 text-3xl font-bold text-[var(--color-text-primary)]">Reports</h2>
        <DataTable
          headings={["Store", "Sales", "Purchases", "Inventory"]}
          rows={stores.map((entry) => [
            entry.store,
            formatCurrency(entry.sales),
            formatCurrency(entry.purchases),
            formatCurrency(entry.inventory),
          ])}
          emptyMessage="No report data found."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {oldGoldExchanges.map((entry) => (
            <article key={entry.uid} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
              <h3 className="m-0 text-lg font-semibold text-[var(--color-text-primary)]">{entry.customerName}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {entry.metalName} {entry.purityName} · {entry.weight}g · {formatCurrency(entry.creditAmount)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </GoldErpLayout>
  );
}

function SettingsWorkspace() {
  const props = useMFEProps();

  return (
    <GoldErpLayout activeKey="settings">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Default Branch" value={props.location.name} detail={props.location.code} />
        <SummaryCard title="Account" value={props.account.name} detail={props.account.domain} />
        <SummaryCard title="Operator" value={props.user.name} detail={props.user.email} />
      </section>
    </GoldErpLayout>
  );
}

function DataTable({
  headings,
  rows,
  emptyMessage,
}: {
  headings: string[];
  rows: React.ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                className="border-b border-[var(--color-border)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-[var(--color-surface)]">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[var(--color-border)] px-4 py-4 text-sm text-[var(--color-text-primary)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-surface-alt)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PageErrorBoundary>
            <OverviewWorkspace />
          </PageErrorBoundary>
        }
      />
      <Route path="/sales" element={<SalesWorkspace />} />
      <Route path="/purchases" element={<PurchasesWorkspace />} />
      <Route path="/inventory" element={<InventoryWorkspace />} />
      <Route path="/customers" element={<CustomersWorkspace />} />
      <Route path="/vendors" element={<VendorsWorkspace />} />
      <Route path="/finance" element={<FinanceWorkspace />} />
      <Route path="/reports" element={<ReportsWorkspace />} />
      <Route path="/settings" element={<SettingsWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
