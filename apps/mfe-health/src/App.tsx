import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";

const HealthCustomersPage = lazy(() => import("./pages/customers/HealthCustomersPage"));
const HealthCasePage = lazy(() => import("./pages/cases/HealthCasePage"));
const HealthPatientsPage = lazy(() => import("./pages/patients/HealthPatientsPage"));
const HealthMembershipsPage = lazy(() => import("./pages/memberships/HealthMembershipsPage"));
const HealthLeadsPage = lazy(() => import("./pages/leads/HealthLeadsPage"));
const HealthFinancePage = lazy(() => import("./pages/finance/HealthFinancePage"));

function RouteLoader() {
  return <div className="p-6 text-sm text-slate-500">Loading...</div>;
}

function withBoundary(element: ReactNode) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        {element}
      </Suspense>
    </PageErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="customers" element={withBoundary(<HealthCustomersPage />)} />
      <Route path="customers/:recordId" element={withBoundary(<HealthCustomersPage />)} />
      <Route path="customers/:recordId/case" element={withBoundary(<HealthCasePage />)} />
      <Route path="customers/:recordId/case/:caseId" element={withBoundary(<HealthCasePage />)} />
      <Route path="customers/:recordId/new-case" element={withBoundary(<HealthCasePage />)} />
      <Route path="customers/:recordId/new-case/:caseId" element={withBoundary(<HealthCasePage />)} />

      <Route path="patients" element={withBoundary(<HealthPatientsPage />)} />
      <Route path="patients/:recordId" element={withBoundary(<HealthPatientsPage />)} />
      <Route path="patients/:recordId/case" element={withBoundary(<HealthCasePage />)} />
      <Route path="patients/:recordId/case/:caseId" element={withBoundary(<HealthCasePage />)} />
      <Route path="patients/:recordId/new-case" element={withBoundary(<HealthCasePage />)} />
      <Route path="patients/:recordId/new-case/:caseId" element={withBoundary(<HealthCasePage />)} />

      <Route path="memberships" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/:subview" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/create" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/update/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/details/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/paymentdetails/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/memberdetails/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/groupdetails/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/members/:subview/:recordId" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/dashboard" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/:view" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/:view/:subview" element={withBoundary(<HealthMembershipsPage />)} />
      <Route path="memberships/:view/:subview/:recordId" element={withBoundary(<HealthMembershipsPage />)} />

      <Route path="leads" element={withBoundary(<HealthLeadsPage />)} />
      <Route path="leads/:view" element={withBoundary(<HealthLeadsPage />)} />
      <Route path="leads/:view/:subview" element={withBoundary(<HealthLeadsPage />)} />
      <Route path="leads/:view/:subview/:recordId" element={withBoundary(<HealthLeadsPage />)} />

      <Route path="finance" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view/:subview" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view/:subview/:recordId" element={withBoundary(<HealthFinancePage />)} />

      <Route path="medical-records" element={<Navigate to="patients" replace />} />
      <Route path="*" element={<Navigate to="customers" replace />} />
    </Routes>
  );
}
