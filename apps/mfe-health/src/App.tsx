import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import HealthCustomersPage from "./pages/customers/HealthCustomersPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="customers"
        element={
          <PageErrorBoundary>
            <HealthCustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers/:recordId"
        element={
          <PageErrorBoundary>
            <HealthCustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients"
        element={
          <PageErrorBoundary>
            <HealthCustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId"
        element={
          <PageErrorBoundary>
            <HealthCustomersPage />
          </PageErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="customers" replace />} />
    </Routes>
  );
}
