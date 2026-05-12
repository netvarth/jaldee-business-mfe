import { Navigate, Route, Routes } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import PlaceholderPage from "./pages/PlaceholderPage";
import CustomersPage from "./pages/CustomersPage";
import StoresPage from "./pages/StoresPage";
import DrivePage from "./pages/DrivePage";
import ReportsPage from "./pages/ReportsPage";
import OrdersPage from "./pages/OrdersPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  const placeholderRoutes = [
    "suppliers/*",
    "discounts/*",
    "price-lists/*",
    "barcode/*",
    "delivery/*",
    "commissions/*",
    "loyalty/*",
    "analytics/*",
    "settings/*",
  ];

  return (
    <Routes>
      <Route
        path=""
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/sales-returns"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/new"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/pending"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/completed"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders/returns"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="orders-grid"
        element={<Navigate to="/orders/orders-grid" replace />}
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
        path="order"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="order/:view"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="order/:view/:subview"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="order/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="order/:view/:recordId"
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
        path="inventory/:view/:subview"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="inventory/:view/:subview/:recordId"
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
        path="catalog/:view/:subview"
        element={
          <PageErrorBoundary>
            <OrdersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="catalog/:view/:subview/:recordId"
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
            <ReportsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="reports/:view"
        element={
          <PageErrorBoundary>
            <ReportsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="reports/:view/:subview"
        element={
          <PageErrorBoundary>
            <ReportsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="reports/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <ReportsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="users"
        element={
          <PageErrorBoundary>
            <UsersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="users/:view"
        element={
          <PageErrorBoundary>
            <UsersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="users/:view/:subview"
        element={
          <PageErrorBoundary>
            <UsersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="users/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <UsersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="users/:recordId"
        element={
          <PageErrorBoundary>
            <UsersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="finance"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="tasks"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="membership"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="leads"
        element={
          <PageErrorBoundary>
            <PlaceholderPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="audit-log"
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
      {placeholderRoutes.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <PageErrorBoundary>
              <PlaceholderPage />
            </PageErrorBoundary>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
