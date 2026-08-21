import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { cn } from "@jaldee/design-system";
import "./new-karty-src/src/index.css"; // karty design tokens + styles
import { KartySplashGate } from "./components/KartySplash";

import { KartyOverview } from "./new-karty-src/src/components/KartyOverview";
import { OrdersTable } from "./new-karty-src/src/components/OrdersTable";
import { InventoryCatalogs } from "./new-karty-src/src/components/InventoryCatalogs";
import { OrderCatalogs } from "./new-karty-src/src/components/OrderCatalogs";
import { PurchasesTable } from "./new-karty-src/src/components/PurchasesTable";
import { PurchasesWorkspace } from "./new-karty-src/src/components/PurchasesWorkspace";
import { PurchaseReturnsTable } from "./new-karty-src/src/components/PurchaseReturnsTable";
import { StockTransfer } from "./new-karty-src/src/components/StockTransfer";
import { StockAdjustment } from "./new-karty-src/src/components/StockAdjustment";
import { ItemsTable } from "./new-karty-src/src/components/ItemsTable";
import { StoresGrid } from "./new-karty-src/src/components/StoresGrid";
import { VendorsTable } from "./new-karty-src/src/components/VendorsTable";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/customerDetail/CustomerDetailPage";
import { UsersTable } from "./new-karty-src/src/components/UsersTable";
import { DrivePage } from "./new-karty-src/src/components/DrivePage";
import { SettingsPage } from "./new-karty-src/src/components/SettingsPage";
import { OrderDashboardPage } from "./pages/OrderDashboardPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { InventoryDashboardPage } from "./pages/InventoryDashboardPage";
import { RequestsPage } from "./pages/RequestsPage";
import { OrderRequestDetailPage } from "./pages/OrderRequestDetailPage";
import { SalesReturnsPage } from "./pages/SalesReturnsPage";
import { SalesReturnDetailPage } from "./pages/SalesReturnDetailPage";
import { RackManagementPage } from "./pages/RackManagementPage";
import { PartnersPage } from "./pages/PartnersPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { TaxInvoicePage } from "./pages/TaxInvoicePage";
import { OrderTaxInvoicePage } from "./pages/OrderTaxInvoicePage";
import { PriceListsPage } from "./pages/PriceListsPage";
import { SchemesPage } from "./pages/SchemesPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { ActiveCartsPage } from "./pages/ActiveCartsPage";
import { LogisticsPage } from "./pages/LogisticsPage";
import { DeliveryProfilesPage } from "./pages/DeliveryProfilesPage";
import { StocksPage } from "./pages/StocksPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import ReviewsPage from "./pages/ReviewsPage";
import { RxDispensePage } from "./pages/pharmacy/RxDispensePage";
import { DrugRegisterPage } from "./pages/pharmacy/DrugRegisterPage";
import { CompositionPage } from "./pages/pharmacy/CompositionPage";
import { ProductionOrdersPage as PharmacyProductionOrdersPage } from "./pages/pharmacy/ProductionOrdersPage";
import { ExpiryClaimsPage as PharmacyExpiryClaimsPage } from "./pages/pharmacy/ExpiryClaimsPage";
import { ReorderAlertsPage } from "./pages/inventory/ReorderAlertsPage";
import { SerialTrackingPage } from "./pages/inventory/SerialTrackingPage";
import { OpeningStockPage } from "./pages/inventory/OpeningStockPage";
import { ExpiryClaimsPage as InventoryExpiryClaimsPage } from "./pages/inventory/ExpiryClaimsPage";
import { ProductionOrdersPage as InventoryProductionOrdersPage } from "./pages/inventory/ProductionOrdersPage";
import { KartyMobileFooter } from "./components/KartyMobileFooter";

// Storefront
import { StorefrontCartProvider } from "./new-karty-src/src/components/storefront/StorefrontCartProvider";
import { StorefrontCheckout } from "./new-karty-src/src/components/storefront/StorefrontCheckout";
import { useStorefrontSettings } from "./services/useStorefrontSettings";
import { getTheme } from "./new-karty-src/src/components/storefront/themes/registry";
import { useSearchParams } from "react-router-dom";

// Dynamic Layout Wrapper
function DynamicStorefrontLayout() {
  const { data: settings } = useStorefrontSettings();
  const [searchParams] = useSearchParams();
  const previewThemeId = searchParams.get('previewTheme');

  const themeId = previewThemeId || settings?.themeId || null;
  const theme = getTheme(themeId);
  const SelectedLayout = theme.Layout;

  return <SelectedLayout />;
}

// Dynamic Home Wrapper
function DynamicStorefrontHome() {
  const { data: settings } = useStorefrontSettings();
  const [searchParams] = useSearchParams();
  const previewThemeId = searchParams.get('previewTheme');

  const themeId = previewThemeId || settings?.themeId || null;
  const theme = getTheme(themeId);
  const SelectedHome = theme.Home;

  return <SelectedHome />;
}

// The shell-host owns the chrome (product rail + karty sidebar in sidebarConfig.ts)
// and drives navigation. This MFE renders ONLY its routed screen content into the
// shell's content area — its route paths mirror the shell's karty paths exactly
// (basePath "/karty" is stripped by the BrowserRouter basename in mount.tsx).
// Screens keep their original styling; only the chrome moves to the shell.
// One client for the whole MFE. Screens used to each construct their own via a nested
// QueryClientProvider, which gave every page an isolated cache — so shared reference data
// (stores, items, customers) was refetched from scratch on every navigation. A single
// client plus a short staleTime means a page revisit is a cache hit, not a network call.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});


function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#FAFAFA]">
      <h2 className="text-lg font-extrabold text-surface-900 tracking-tight">{title}</h2>
      <p className="text-sm text-surface-400 font-medium mt-1 max-w-sm">
        This module is not available yet. It will be wired up in a future release.
      </p>
    </div>
  );
}

// Thin wrappers so the screens' back-callbacks navigate via the router.
function UsersRoute() {
  const navigate = useNavigate();
  return <UsersTable onBack={() => navigate("/")} />;
}
function PurchaseReturnsRoute() {
  const navigate = useNavigate();
  return <PurchaseReturnsTable onBackToInventory={() => navigate("/inventory/inventory-catalogs")} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StorefrontCartProvider>
        {/* Definite height so screens' h-full resolves (shell content area is auto-height). */}
        <div className="flex flex-col h-full min-h-[calc(100vh-56px)] bg-[#FAFAFA] font-sans">
          <KartySplashGate>
          <Routes>
            {/* Storefront Routes */}
            <Route path="/store" element={<DynamicStorefrontLayout />}>
              <Route index element={<DynamicStorefrontHome />} />
              <Route path="checkout" element={<StorefrontCheckout />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/" element={<KartyOverview />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<KartyOverview />} />
            <Route path="/pharmacy/dashboard" element={<KartyOverview />} />

          {/* Shell landing for karty is /karty/orders (see shell landing.ts) */}
          <Route path="/orders" element={<OrdersTable />} />
          <Route path="/orders/dashboard" element={<OrderDashboardPage />} />
          <Route path="/orders/catalogs" element={<OrderCatalogs />} />
          <Route path="/orders/requests" element={<RequestsPage />} />
          <Route path="/orders/requests/:uid" element={<OrderRequestDetailPage />} />
          <Route path="/orders/sales-returns" element={<SalesReturnsPage />} />
          <Route path="/orders/sales-returns/:uid" element={<SalesReturnDetailPage />} />
          <Route path="/orders/active-carts" element={<ActiveCartsPage />} />
          <Route path="/orders/logistics" element={<LogisticsPage />} />
          <Route path="/orders/delivery-profiles" element={<DeliveryProfilesPage />} />
          <Route path="/orders/reviews" element={<ReviewsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          {/* Declared last among /orders/* so intent is obvious, though placement does not
              matter: react-router v6 ranks by specificity, so the static segments above always
              beat this dynamic one — /orders/dashboard will never be read as an order uid. */}
          <Route path="/orders/:uid" element={<OrderDetailPage />} />
          <Route path="/invoices/tax-invoice" element={<TaxInvoicePage />} />
          <Route path="/orders/:uid/tax-invoice" element={<OrderTaxInvoicePage />} />

          <Route path="/inventory" element={<Navigate to="/inventory/inventory-catalogs" replace />} />
          <Route path="/inventory/dashboard" element={<InventoryDashboardPage />} />
          <Route path="/inventory/inventory-catalogs" element={<InventoryCatalogs />} />
          {/* Order Catalogs moved under Orders. Kept as a redirect so old links/bookmarks work. */}
          <Route path="/inventory/order-catalogs" element={<Navigate to="/orders/catalogs" replace />} />
          <Route path="/inventory/purchases" element={<PurchasesWorkspace />} />
          <Route path="/inventory/purchase-returns" element={<PurchaseReturnsRoute />} />
          <Route path="/inventory/transfers" element={<StockTransfer />} />
          <Route path="/inventory/adjustments" element={<StockAdjustment />} />
          {/* Items/Products is a top-level section (see shell sidebarConfig). Old
              /inventory/items links redirect here so bookmarks keep working. */}
          <Route path="/inventory/items" element={<Navigate to="/items" replace />} />
          <Route path="/inventory/stores" element={<Navigate to="/stores" replace />} />
          <Route path="/stores" element={<StoresGrid />} />
          <Route path="/inventory/vendors" element={<VendorsTable />} />
          <Route path="/inventory/stocks" element={<StocksPage />} />
          <Route path="/inventory/racks" element={<RackManagementPage />} />
          <Route path="/inventory/audit-log" element={<AuditLogPage />} />

          <Route path="/items" element={<ItemsTable />} />

          <Route path="/customers" element={<CustomersPage />} />
          {/* The list is the shared CRM module; the record itself is Karty's own, because
              everything on it below the profile is commerce (orders, returns, cart). */}
          <Route path="/customers/:recordId" element={<CustomerDetailPage />} />
          <Route path="/users" element={<UsersRoute />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/price-lists" element={<PriceListsPage />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/drive/*" element={<DrivePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Pharmacy & Healthcare Vertical Modules */}
          <Route path="/pharmacy" element={<Navigate to="/pharmacy/dispense" replace />} />
          <Route path="/pharmacy/dispense" element={<RxDispensePage />} />
          <Route path="/dispense" element={<RxDispensePage />} />
          <Route path="/drug-register" element={<DrugRegisterPage />} />
          <Route path="/compositions" element={<CompositionPage />} />
          <Route path="/production" element={<PharmacyProductionOrdersPage />} />
          <Route path="/expiry-claims" element={<PharmacyExpiryClaimsPage />} />
          <Route path="/pharmacy/drug-register" element={<DrugRegisterPage />} />
          <Route path="/pharmacy/compositions" element={<CompositionPage />} />
          <Route path="/pharmacy/production" element={<PharmacyProductionOrdersPage />} />
          <Route path="/pharmacy/expiry-claims" element={<PharmacyExpiryClaimsPage />} />
          <Route path="/pharmacy/orders-grid" element={<OrdersTable />} />
          <Route path="/pharmacy/orders" element={<OrdersTable />} />
          <Route path="/pharmacy/items" element={<ItemsTable />} />
          <Route path="/pharmacy/inventory" element={<StocksPage />} />
          <Route path="/pharmacy/purchases" element={<PurchasesWorkspace />} />
          <Route path="/pharmacy/transfers" element={<StockTransfer />} />
          <Route path="/pharmacy/reorder-alerts" element={<ReorderAlertsPage />} />
          <Route path="/pharmacy/racks" element={<RackManagementPage />} />
          <Route path="/pharmacy/audit-log" element={<AuditLogPage />} />
          <Route path="/inventory/reorder-alerts" element={<ReorderAlertsPage />} />
          <Route path="/inventory/serials" element={<SerialTrackingPage />} />
          <Route path="/inventory/opening-stock" element={<OpeningStockPage />} />
          <Route path="/inventory/reservations" element={<ReservationsPage />} />
          <Route path="/pharmacy/reservations" element={<ReservationsPage />} />
          <Route path="/pharmacy/opening-stock" element={<OpeningStockPage />} />
          <Route path="/inventory/expiry-claims" element={<InventoryExpiryClaimsPage />} />
          <Route path="/inventory/production" element={<InventoryProductionOrdersPage />} />
          <Route path="/pharmacy/expiry-claims" element={<PharmacyExpiryClaimsPage />} />
          <Route path="/pharmacy/production" element={<PharmacyProductionOrdersPage />} />

          <Route path="/finance/*" element={<PlaceholderScreen title="Finance" />} />
          <Route path="/tasks" element={<PlaceholderScreen title="Tasks" />} />
          <Route path="/membership" element={<PlaceholderScreen title="Membership" />} />
          <Route path="/leads" element={<PlaceholderScreen title="Leads" />} />

          {/* Render the landing screen directly for unknown paths — never <Navigate>
              here, to avoid a redirect loop against the shell's landing redirect. */}
          <Route path="*" element={<OrdersTable />} />
        </Routes>
        <KartyMobileFooter />
        </KartySplashGate>
      </div>
      </StorefrontCartProvider>
    </QueryClientProvider>
  );
}
