import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import LoginPage from "./pages/LoginPage";
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
  const hasStoredSession = hasStoredAuthSession();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          hasHydrated && (isAuthenticated || hasStoredSession) ? (
            <Navigate to="/base" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Routes>
                <Route path="/base" element={<BasePage />} />
                <Route path="/customers/*" element={<GlobalPlaceholderPage />} />
                <Route path="/users/*" element={<GlobalPlaceholderPage />} />
                <Route path="/reports/*" element={<GlobalPlaceholderPage />} />
                <Route path="/drive/*" element={<GlobalPlaceholderPage />} />
                <Route path="/tasks/*" element={<GlobalPlaceholderPage />} />
                <Route path="/membership/*" element={<GlobalPlaceholderPage />} />
                <Route path="/leads/*" element={<GlobalPlaceholderPage />} />
                <Route path="/audit-log/*" element={<GlobalPlaceholderPage />} />
                <Route path="/settings/*" element={<GlobalPlaceholderPage />} />
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
