import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import { useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import EmployeeShellLayout from "./layout/EmployeeShellLayout";
import HrMFE from "./mfes/HrMFE";
import { telemetryService } from "./services/telemetry";

function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    telemetryService.trackPageView(`${location.pathname}${location.search}`);
  }, [location]);

  return null;
}

function AppRoutes() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading employee shell...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/ess" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/ess" : "/login"} replace />} />
      <Route path="/ess" element={<Navigate to="/ess/me" replace />} />
      <Route path="/ess/attendance/*" element={<Navigate to="/ess/me/attendance" replace />} />
      <Route path="/ess/leave/*" element={<Navigate to="/ess/me/leave" replace />} />
      <Route path="/ess/announcements/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/ess/payroll/*" element={<Navigate to="/ess/me/payslips" replace />} />
      <Route path="/ess/expenses/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/ess/tickets/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/ess/employees/*" element={<Navigate to="/ess" replace />} />
      <Route path="/ess/recruitment/*" element={<Navigate to="/ess" replace />} />
      <Route path="/ess/reports/*" element={<Navigate to="/ess" replace />} />
      <Route path="/ess/settings/*" element={<Navigate to="/ess" replace />} />
      <Route path="/hr" element={<Navigate to="/ess/me" replace />} />
      <Route path="/hr/attendance/*" element={<Navigate to="/ess/me/attendance" replace />} />
      <Route path="/hr/leave/*" element={<Navigate to="/ess/me/leave" replace />} />
      <Route path="/hr/announcements/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/hr/payroll/*" element={<Navigate to="/ess/me/payslips" replace />} />
      <Route path="/hr/expenses/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/hr/tickets/*" element={<Navigate to="/ess/me" replace />} />
      <Route path="/hr/employees/*" element={<Navigate to="/ess" replace />} />
      <Route path="/hr/recruitment/*" element={<Navigate to="/ess" replace />} />
      <Route path="/hr/reports/*" element={<Navigate to="/ess" replace />} />
      <Route path="/hr/settings/*" element={<Navigate to="/ess" replace />} />
      <Route
        path="/ess/*"
        element={(
          <ProtectedRoute>
            <EmployeeShellLayout>
              <HrMFE />
            </EmployeeShellLayout>
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/ess" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <PageTracker />
      <AppRoutes />
    </>
  );
}
