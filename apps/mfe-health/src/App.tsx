import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";

const HealthCustomersPage = lazy(() => import("./pages/customers/HealthCustomersPage"));
const HealthCasePage = lazy(() => import("./pages/cases/HealthCasePage"));
const HealthPatientsPage = lazy(() => import("./pages/patients/HealthPatientsPage"));
const HealthIpPage = lazy(() => import("./pages/ip/HealthIpPage"));
const HealthDrivePage = lazy(() => import("./pages/drive/HealthDrivePage"));
const HealthReportsPage = lazy(() => import("./pages/reports/HealthReportsPage"));
const HealthMembershipsPage = lazy(() => import("./pages/memberships/HealthMembershipsPage"));
const HealthLeadsPage = lazy(() => import("./pages/leads/HealthLeadsPage"));
const HealthFinancePage = lazy(() => import("./pages/finance/HealthFinancePage"));
const HealthPharmacyPage = lazy(() => import("./pages/pharmacy/HealthPharmacyPage"));
const HealthUsersPage = lazy(() => import("./pages/users/HealthUsersPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));

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
  const placeholderRoutes = [
    "",
    "op",
    "op/*",
    "medical-records",
    "medical-records/*",
    "consent-forms/*",
    "referrals/*",
    "triage/*",
    "diet-nutrition/*",
    "nursing-notes/*",
    "vaccinations/*",
    "allergies/*",
    "ot/*",
    "tasks/*",
    "analytics/*",
    "membership/*",
    "audit-log/*",
    "settings/*",
  ];

  return (
    <Routes>
      {placeholderRoutes.map((path) => (
        <Route key={path || "overview"} path={path} element={withBoundary(<PlaceholderPage />)} />
      ))}
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

      <Route path="ip" element={withBoundary(<HealthIpPage />)} />
      <Route path="ip/:view" element={withBoundary(<HealthIpPage />)} />
      <Route path="ip/:view/:subview" element={withBoundary(<HealthIpPage />)} />
      <Route path="ip/:view/:subview/:recordId" element={withBoundary(<HealthIpPage />)} />

      <Route path="drive" element={withBoundary(<HealthDrivePage />)} />
      <Route path="drive/:view" element={withBoundary(<HealthDrivePage />)} />
      <Route path="drive/:view/:subview" element={withBoundary(<HealthDrivePage />)} />
      <Route path="drive/:view/:subview/:recordId" element={withBoundary(<HealthDrivePage />)} />

      <Route path="reports" element={withBoundary(<HealthReportsPage />)} />
      <Route path="reports/:view" element={withBoundary(<HealthReportsPage />)} />
      <Route path="reports/:view/:subview" element={withBoundary(<HealthReportsPage />)} />
      <Route path="reports/:view/:subview/:recordId" element={withBoundary(<HealthReportsPage />)} />

      <Route path="pharmacy" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="pharmacy/:view" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="pharmacy/details/:recordId" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="pharmacy/:view/:subview" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="pharmacy/:view/:subview/:recordId" element={withBoundary(<HealthPharmacyPage />)} />

      <Route path="order" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="order/:view" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="order/details/:recordId" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="order/:view/:subview" element={withBoundary(<HealthPharmacyPage />)} />
      <Route path="order/:view/:subview/:recordId" element={withBoundary(<HealthPharmacyPage />)} />

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

      <Route path="users" element={withBoundary(<HealthUsersPage />)} />
      <Route path="users/:view" element={withBoundary(<HealthUsersPage />)} />
      <Route path="users/:view/:subview" element={withBoundary(<HealthUsersPage />)} />
      <Route path="users/:view/:subview/:recordId" element={withBoundary(<HealthUsersPage />)} />
      <Route path="users/:recordId" element={withBoundary(<HealthUsersPage />)} />

      <Route path="finance" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view/:subview" element={withBoundary(<HealthFinancePage />)} />
      <Route path="finance/:view/:subview/:recordId" element={withBoundary(<HealthFinancePage />)} />

      <Route path="*" element={<Navigate to="customers" replace />} />
    </Routes>
  );
}
