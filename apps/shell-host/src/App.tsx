import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import SignupPage from "./pages/SignupPage";
import SettingsPage from "./pages/SettingsPage";
import LeadsPage from "./pages/LeadsPage";
import {
  ShellAuditLogPage,
  ShellCustomersPage,
  ShellDrivePage,
  ShellMembershipPage,
  ShellReportsPage,
  ShellUsersPage,
} from "./pages/BaseCrmPages";
import ProtectedRoute from "./auth/ProtectedRoute";
import ShellLayout from "./layout/ShellLayout";
import { HealthMFE } from "./mfes/HealthMFE";
import { BookingsMFE } from "./mfes/BookingsMFE";
import { GoldErpMFE } from "./mfes/GoldErpMFE";
import { FinanceMFE } from "./mfes/FinanceMFE";
import { KartyMFE } from "./mfes/KartyMFE";
import { useShellStore } from "./store/shellStore";
import { hasStoredAuthSession } from "./services/authService";
import GlobalPlaceholderPage from "./pages/GlobalPlaceholderPage";
import IvrPage from "./pages/ivr/IvrPage";
import IvrCallLogs from "./pages/ivr/IvrCallLogs";
import IvrSchedules from "./pages/ivr/IvrSchedules";
import "./App.css";

function BasePage() {
  return (
    <div className="shell-home">
      <h2 className="shell-home-title">Base</h2>
      <p className="shell-home-copy">Welcome to Jaldee Business</p>
    </div>
  );
}


export default function App() {
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const onboardingStatus = useShellStore((s) => s.onboardingStatus);
  const hasStoredSession = hasStoredAuthSession();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          hasHydrated && (isAuthenticated || hasStoredSession) ? (
            <Navigate to={onboardingStatus === "pending" ? "/onboarding" : "/base"} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/signup"
        element={
          hasHydrated && (isAuthenticated || hasStoredSession) ? (
            <Navigate to={onboardingStatus === "pending" ? "/onboarding" : "/home"} replace />
          ) : (
            <SignupPage />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Routes>
                <Route path="/base" element={<BasePage />} />
                <Route path="/customers/*" element={<ShellCustomersPage />} />
                <Route path="/users/*" element={<ShellUsersPage />} />
                <Route path="/reports/*" element={<ShellReportsPage />} />
                <Route path="/drive/*" element={<ShellDrivePage />} />
                <Route path="/tasks/*" element={<GlobalPlaceholderPage />} />
                <Route path="/membership/*" element={<ShellMembershipPage />} />
                <Route path="/leads/*" element={<LeadsPage />} />
                <Route path="/audit-log/*" element={<ShellAuditLogPage />} />
                <Route path="/settings/*" element={<SettingsPage />} />
                <Route path="/ivr" element={<IvrPage />} />
                <Route path="/ivr/calllogs" element={<IvrCallLogs />} />
                <Route path="/ivr/schedules" element={<IvrSchedules />} />
                <Route path="/health/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Health...</div>
                  }>
                    <div className="mfe-wrapper">
                      <HealthMFE />
                    </div>
                  </Suspense>
                } />
                <Route path="/bookings/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Bookings...</div>
                  }>
                    <BookingsMFE />
                  </Suspense>
                } />
                <Route path="/golderp/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Gold ERP...</div>
                  }>
                    <GoldErpMFE />
                  </Suspense>
                } />
                <Route path="/karty/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Karty...</div>
                  }>
                    <div className="mfe-wrapper">
                      <KartyMFE />
                    </div>
                  </Suspense>
                } />
                <Route path="/finance/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Finance...</div>
                  }>
                    <FinanceMFE />
                  </Suspense>
                } />
                <Route path="/lending/*" element={<GlobalPlaceholderPage />} />
                <Route path="/hr/*" element={<GlobalPlaceholderPage />} />
                <Route path="/ai/*" element={<GlobalPlaceholderPage />} />
                <Route path="*" element={<Navigate to="/base" replace />} />
              </Routes>
            </ShellLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
