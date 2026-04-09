import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import HealthCustomersPage from "./pages/customers/HealthCustomersPage";
import HealthCasePage from "./pages/cases/HealthCasePage";
import HealthPatientsPage from "./pages/patients/HealthPatientsPage";
import HealthMembershipsPage from "./pages/memberships/HealthMembershipsPage";

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
        path="customers/:recordId/case"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers/:recordId/case/:caseId"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers/:recordId/new-case"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="customers/:recordId/new-case/:caseId"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients"
        element={
          <PageErrorBoundary>
            <HealthPatientsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId"
        element={
          <PageErrorBoundary>
            <HealthPatientsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId/case"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId/case/:caseId"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId/new-case"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="patients/:recordId/new-case/:caseId"
        element={
          <PageErrorBoundary>
            <HealthCasePage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/members"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/members/:subview"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/members/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/dashboard"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/:view"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/:view/:subview"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route
        path="memberships/:view/:subview/:recordId"
        element={
          <PageErrorBoundary>
            <HealthMembershipsPage />
          </PageErrorBoundary>
        }
      />
      <Route path="medical-records" element={<Navigate to="patients" replace />} />
      <Route path="*" element={<Navigate to="customers" replace />} />
    </Routes>
  );
}
