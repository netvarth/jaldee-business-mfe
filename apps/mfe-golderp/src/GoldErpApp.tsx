import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoldErpLayout } from "@/components/gold-erp/GoldErpLayout";
import DashboardPage from "@/pages/gold-erp/DashboardPage";
import MasterDataPage from "@/pages/gold-erp/MasterDataPage";
import MetalRatesPage from "@/pages/gold-erp/MetalRatesPage";
import CataloguePage from "@/pages/gold-erp/CataloguePage";
import TagsPage from "@/pages/gold-erp/TagsPage";
import SalesPage from "@/pages/gold-erp/SalesPage";
import SalesOrderCreatePage from "@/pages/gold-erp/SalesOrderCreatePage";
import PurchasePage from "@/pages/gold-erp/PurchasePage";
import PurchaseWorkspacePage from "@/pages/gold-erp/PurchaseWorkspacePage";
import GrnPage from "@/pages/gold-erp/GrnPage";
import IndependentGrnPage from "@/pages/gold-erp/IndependentGrnPage";
import InventoryPage from "@/pages/gold-erp/InventoryPage";
import OldGoldPage from "@/pages/gold-erp/OldGoldPage";
import OnlineOrdersPage from "@/pages/gold-erp/OnlineOrdersPage";
import ReportsPage from "@/pages/gold-erp/ReportsPage";
import AuditPage from "@/pages/gold-erp/AuditPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

export function GoldErpApp() {
  return (
    <div className="gold-erp-root">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <Routes>
            <Route path="/" element={<GoldErpLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="masters" element={<MasterDataPage />} />
              <Route path="rates" element={<MetalRatesPage />} />
              <Route path="catalogue" element={<CataloguePage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="sales/new" element={<SalesOrderCreatePage />} />
              <Route path="purchase" element={<PurchasePage />} />
              <Route path="purchase/new" element={<PurchaseWorkspacePage />} />
              <Route path="purchase/:poUid" element={<PurchaseWorkspacePage />} />
              <Route path="grn" element={<GrnPage />} />
              <Route path="grn/new" element={<IndependentGrnPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="old-gold" element={<OldGoldPage />} />
              <Route path="online-orders" element={<OnlineOrdersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}
