import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, PageErrorBoundary, PageHeader, SectionCard } from "@jaldee/design-system";
import AuditPage from "./pages/AuditPage";
import CataloguePage from "./pages/CataloguePage";
import DashboardPage from "./pages/DashboardPage";
import GrnPage from "./pages/GrnPage";
import InventoryPage from "./pages/InventoryPage";
import IndependentGrnPage from "./pages/IndependentGrnPage";
import MasterDataPage from "./pages/MasterDataPage";
import MetalRatesPage from "./pages/MetalRatesPage";
import OnlineOrdersPage from "./pages/OnlineOrdersPage";
import OldGoldPage from "./pages/OldGoldPage";
import PurchasePage from "./pages/PurchasePage";
import PurchaseWorkspacePage from "./pages/PurchaseWorkspacePage";
import ReportsPage from "./pages/ReportsPage";
import SalesPage from "./pages/SalesPage";
import SalesOrderCreatePage from "./pages/SalesOrderCreatePage";
import TagsPage from "./pages/TagsPage";
import DrivePage from "./pages/DrivePage";

const sectionLabels: Record<string, string> = {
  audit: "Audit Log",
  catalogue: "Items",
  customers: "Customers",
  finance: "Finance",
  grn: "GRN Entry",
  inventory: "Stock",
  masters: "Master Data",
  "old-gold": "Exchange",
  "online-orders": "Online Orders",
  purchase: "Purchases",
  purchases: "Purchases",
  rates: "Metal Rate",
  reports: "Reports",
  settings: "Settings",
  tags: "Tags",
  vendors: "Vendors",
};

function PlaceholderSectionPage() {
  const navigate = useNavigate();
  const { section = "" } = useParams();
  const title = sectionLabels[section] ?? "Section";

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title={title}
          subtitle="This section is not implemented yet in the Gold ERP microfrontend."
          actions={<Button onClick={() => navigate("/sales")}>Open Sales</Button>}
        />

        <SectionCard>
          <EmptyState
            title={`${title} is coming next`}
            description="The left navigation route now resolves correctly. Build this module here or update the shell menu to point only to implemented pages."
          />
        </SectionCard>
      </div>
    </div>
  );
}

function PurchaseAliasRedirect() {
  const { poUid = "" } = useParams();
  return <Navigate to={poUid ? `/purchases/${poUid}` : "/purchases"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path=""
        element={
          <PageErrorBoundary>
            <DashboardPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="sales"
        element={
          <PageErrorBoundary>
            <SalesPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="sales/new"
        element={
          <PageErrorBoundary>
            <SalesOrderCreatePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="catalogue"
        element={
          <PageErrorBoundary>
            <CataloguePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="audit"
        element={
          <PageErrorBoundary>
            <AuditPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="old-gold"
        element={
          <PageErrorBoundary>
            <OldGoldPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="online-orders"
        element={
          <PageErrorBoundary>
            <OnlineOrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="masters"
        element={
          <PageErrorBoundary>
            <MasterDataPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="grn"
        element={
          <PageErrorBoundary>
            <GrnPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="grn/new"
        element={
          <PageErrorBoundary>
            <IndependentGrnPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="inventory"
        element={
          <PageErrorBoundary>
            <InventoryPage />
          </PageErrorBoundary>
        }
      />
      <Route path="master-data" element={<Navigate to="/masters" replace />} />
      <Route
        path="rates"
        element={
          <PageErrorBoundary>
            <MetalRatesPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="reports"
        element={
          <PageErrorBoundary>
            <ReportsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="tags"
        element={
          <PageErrorBoundary>
            <TagsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="purchases"
        element={
          <PageErrorBoundary>
            <PurchasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="purchases/new"
        element={
          <PageErrorBoundary>
            <PurchaseWorkspacePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="purchases/:poUid"
        element={
          <PageErrorBoundary>
            <PurchaseWorkspacePage />
          </PageErrorBoundary>
        }
      />
      <Route path="purchase" element={<Navigate to="/purchases" replace />} />
      <Route path="purchase/new" element={<Navigate to="/purchases/new" replace />} />
      <Route path="purchase/:poUid" element={<PurchaseAliasRedirect />} />
      <Route
        path="drive"
        element={
          <PageErrorBoundary>
            <DrivePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="drive/:view"
        element={
          <PageErrorBoundary>
            <DrivePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="drive/:view/:subview"
        element={
          <PageErrorBoundary>
            <DrivePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="drive/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <DrivePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path=":section"
        element={
          <PageErrorBoundary>
            <PlaceholderSectionPage />
          </PageErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
