import { Navigate, Route, Routes } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import OverviewPage from "./pages/OverviewPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import CustomersPage from "./pages/CustomersPage";
import StoresPage from "./pages/StoresPage";
import DrivePage from "./pages/DrivePage";
import OrdersPage from "./pages/OrdersPage";

export default function App() {
  return (
    <Routes>
      <Route
        path=""
        element={<Navigate to="orders/dashboard" replace />}
      />
      <Route
        path="orders"
        element={<Navigate to="orders-grid" replace />}
      />
      <Route
        path="orders/active-cart"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/:view"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/items/create"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/items/update/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/items/details/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/details/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/:view/:subview"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/:view/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="inventory"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="inventory/:view"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="catalog"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="catalog/:view"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers"
        element={
          <PageErrorBoundary>
            <CustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers/:recordId"
        element={
          <PageErrorBoundary>
            <CustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="stores"
        element={
          <PageErrorBoundary>
            <StoresPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="stores/:recordId"
        element={
          <PageErrorBoundary>
            <StoresPage />
          </PageErrorBoundary>
        }
      />
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
        path="reports"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="settings"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
