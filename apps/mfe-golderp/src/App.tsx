import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import DashboardPage from "./pages/DashboardPage";


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
      {/* <Route
        path="masters"
        element={
          <PageErrorBoundary>
            <MasterDataPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="rates"
        element={
          <PageErrorBoundary>
            <MetalRatesPage />
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
        path="tags"
        element={
          <PageErrorBoundary>
            <TagsPage />
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
        path="purchase"
        element={
          <PageErrorBoundary>
            <PurchasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="purchase/new"
        element={
          <PageErrorBoundary>
            <PurchaseWorkspacePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="purchase/:poUid"
        element={
          <PageErrorBoundary>
            <PurchaseWorkspacePage />
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
        path="reports"
        element={
          <PageErrorBoundary>
            <ReportsPage />
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
      /> */}
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
