import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const GlobalPlaceholderPage = lazy(() => import("./pages/GlobalPlaceholderPage"));
const IvrPage = lazy(() => import("./pages/ivr/IvrPage"));
const IvrCallLogs = lazy(() => import("./pages/ivr/IvrCallLogs"));
const IvrSchedules = lazy(() => import("./pages/ivr/IvrSchedules"));
const ShellCustomersPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellCustomersPage })));
const ShellUsersPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellUsersPage })));
const ShellDrivePage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellDrivePage })));
const ShellTasksPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellTasksPage })));
const ShellMembershipPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellMembershipPage })));
const ShellReportsPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellReportsPage })));
const ShellAuditLogPage = lazy(() => import("./pages/BaseCrmPages").then(m => ({ default: m.ShellAuditLogPage })));
const HealthMFE = lazy(() => import("./mfes/HealthMFE").then(m => ({ default: m.HealthMFE })));
const BookingsMFE = lazy(() => import("./mfes/BookingsMFE").then(m => ({ default: m.BookingsMFE })));
const GoldErpMFE = lazy(() => import("./mfes/GoldErpMFE").then(m => ({ default: m.GoldErpMFE })));
const FinanceMFE = lazy(() => import("./mfes/FinanceMFE").then(m => ({ default: m.FinanceMFE })));
const KartyMFE = lazy(() => import("./mfes/KartyMFE").then(m => ({ default: m.KartyMFE })));
const LendingMFE = lazy(() => import("./mfes/LendingMFE").then(m => ({ default: m.LendingMFE })));
const HrMFE = lazy(() => import("./mfes/HrMFE").then(m => ({ default: m.HrMFE })));
const PublicCareersMFE = lazy(() => import("./mfes/PublicCareersMFE").then(m => ({ default: m.PublicCareersMFE })));
import ProtectedRoute from "./auth/ProtectedRoute";
import ShellLayout from "./layout/ShellLayout";
import { useShellStore } from "./store/shellStore";
import { getAuthMode, hasStoredAuthSession } from "./services/authService";
import { getPreferredLandingPath } from "./utils/landing";
import PageLoadingSkeleton from "./layout/PageLoadingSkeleton";
import "./App.css";

function HomePage() {
  const account = useShellStore((s) => s.account);
  return <Navigate to={getPreferredLandingPath(account)} replace />;
}


export default function App() {
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const onboardingStatus = useShellStore((s) => s.onboardingStatus);
  const account = useShellStore((s) => s.account);
  const hasStoredSession = hasStoredAuthSession();
  const landingPath = getPreferredLandingPath(account);
  const tokenOnboardingEnabled = getAuthMode() === "token";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          hasHydrated && isAuthenticated ? (
            <Navigate to={tokenOnboardingEnabled && onboardingStatus === "pending" ? "/onboarding" : landingPath} replace />
          ) : (
            <Suspense fallback={<PageLoadingSkeleton />}>
              <LoginPage />
            </Suspense>
          )
        }
      />
      <Route
        path="/signup"
        element={
          hasHydrated && (isAuthenticated || hasStoredSession) ? (
            <Navigate to={tokenOnboardingEnabled && onboardingStatus === "pending" ? "/onboarding" : landingPath} replace />
          ) : (
            <Suspense fallback={<PageLoadingSkeleton />}>
              <SignupPage />
            </Suspense>
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          tokenOnboardingEnabled ? (
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingSkeleton />}>
                <OnboardingPage />
              </Suspense>
            </ProtectedRoute>
          ) : (
            <Navigate to={landingPath} replace />
          )
        }
      />
      <Route
        path="/careers/*"
        element={
          <Suspense fallback={<PageLoadingSkeleton />}>
            <PublicCareersMFE />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Suspense fallback={<PageLoadingSkeleton />}>
                <Routes>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/base" element={<Navigate to="/home" replace />} />
                  <Route path="/customers/*" element={<ShellCustomersPage />} />
                  <Route path="/users/*" element={<ShellUsersPage />} />
                  <Route path="/reports/*" element={<ShellReportsPage />} />
                  <Route path="/drive/*" element={<ShellDrivePage />} />
                  <Route path="/tasks/*" element={<ShellTasksPage />} />
                  <Route path="/membership/*" element={<ShellMembershipPage />} />
                  <Route path="/leads/*" element={<LeadsPage />} />
                  <Route path="/audit-log/*" element={<ShellAuditLogPage />} />
                  <Route path="/settings/*" element={<SettingsPage />} />
                  <Route path="/ivr" element={<IvrPage />} />
                  <Route path="/ivr/calllogs" element={<IvrCallLogs />} />
                  <Route path="/ivr/schedules" element={<IvrSchedules />} />
                  <Route path="/health/*" element={
                    <div className="mfe-wrapper">
                      <HealthMFE />
                    </div>
                  } />
                  <Route path="/bookings/*" element={
                    <BookingsMFE />
                  } />
                  <Route path="/golderp/*" element={
                    <GoldErpMFE />
                  } />
                  <Route path="/karty/*" element={
                    <div className="mfe-wrapper">
                      <KartyMFE />
                    </div>
                  } />
                  <Route path="/finance/*" element={
                    <FinanceMFE />
                  } />
                  <Route path="/lending/*" element={
                    <div className="mfe-wrapper">
                      <LendingMFE />
                    </div>
                  } />
                  <Route path="/hr/*" element={
                    <div className="mfe-wrapper">
                      <HrMFE />
                    </div>
                  } />
                  <Route path="/ai/*" element={<GlobalPlaceholderPage />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Suspense>
            </ShellLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
