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
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/me" : "/login"} replace />} />
      <Route path="/attendance/*" element={<Navigate to="/me/attendance" replace />} />
      <Route path="/leave/*" element={<Navigate to="/me/leave" replace />} />
      <Route path="/announcements/*" element={<Navigate to="/me" replace />} />
      <Route path="/payroll/*" element={<Navigate to="/me/payslips" replace />} />
      <Route path="/expenses/*" element={<Navigate to="/me" replace />} />
      <Route path="/tickets/*" element={<Navigate to="/me" replace />} />
      <Route path="/employees/*" element={<Navigate to="/" replace />} />
      <Route path="/recruitment/*" element={<Navigate to="/" replace />} />
      <Route path="/reports/*" element={<Navigate to="/" replace />} />
      <Route path="/settings/*" element={<Navigate to="/" replace />} />
      <Route path="/hr" element={<Navigate to="/me" replace />} />
      <Route path="/hr/attendance/*" element={<Navigate to="/me/attendance" replace />} />
      <Route path="/hr/leave/*" element={<Navigate to="/me/leave" replace />} />
      <Route path="/hr/announcements/*" element={<Navigate to="/me" replace />} />
      <Route path="/hr/payroll/*" element={<Navigate to="/me/payslips" replace />} />
      <Route path="/hr/expenses/*" element={<Navigate to="/me" replace />} />
      <Route path="/hr/tickets/*" element={<Navigate to="/me" replace />} />
      <Route path="/hr/employees/*" element={<Navigate to="/" replace />} />
      <Route path="/hr/recruitment/*" element={<Navigate to="/" replace />} />
      <Route path="/hr/reports/*" element={<Navigate to="/" replace />} />
      <Route path="/hr/settings/*" element={<Navigate to="/" replace />} />
      <Route
        path="/*"
        element={(
          <ProtectedRoute>
            <EmployeeShellLayout>
              <HrMFE />
            </EmployeeShellLayout>
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
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
