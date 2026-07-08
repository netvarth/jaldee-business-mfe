import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "./store/appStore";
import { useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import BookingsPage from "./pages/BookingsPage";
import ProfilePage from "./pages/ProfilePage";
import PolicyPage from "./pages/PolicyPage";
import { telemetryService } from "./services/telemetry";
import { accountPath, isDomainScopedConsumerSite, isReservedRoute } from "./utils/accountRoutes";

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
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading consumer shell...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={isDomainScopedConsumerSite() ? <HomePage /> : <ConsumerSiteMissingPage />} />
      <Route path="/login" element={isDomainScopedConsumerSite() ? (isAuthenticated ? <Navigate to="/account" replace /> : <LoginPage />) : <ConsumerSiteMissingPage />} />
      <Route path="/bookings" element={isDomainScopedConsumerSite() ? <BookingsPage /> : <ConsumerSiteMissingPage />} />
      <Route path="/terms" element={isDomainScopedConsumerSite() ? <PolicyPage /> : <ConsumerSiteMissingPage />} />
      <Route path="/privacy" element={isDomainScopedConsumerSite() ? <PolicyPage /> : <ConsumerSiteMissingPage />} />
      <Route path="/refund" element={isDomainScopedConsumerSite() ? <PolicyPage /> : <ConsumerSiteMissingPage />} />
      <Route path="/shipping" element={isDomainScopedConsumerSite() ? <PolicyPage /> : <ConsumerSiteMissingPage />} />
      <Route
        path="/account"
        element={isDomainScopedConsumerSite() ? (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ) : <ConsumerSiteMissingPage />}
      />
      <Route
        path="/profile"
        element={isDomainScopedConsumerSite() ? (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ) : <ConsumerSiteMissingPage />}
      />
      <Route path="/:accountSlug" element={<AccountRouteBoundary><HomePage /></AccountRouteBoundary>} />
      <Route path="/:accountSlug/login" element={isAuthenticated ? <AccountRedirect to="/account" /> : <LoginPage />} />
      <Route path="/:accountSlug/bookings" element={<BookingsPage />} />
      <Route path="/:accountSlug/terms" element={<PolicyPage />} />
      <Route path="/:accountSlug/privacy" element={<PolicyPage />} />
      <Route path="/:accountSlug/refund" element={<PolicyPage />} />
      <Route path="/:accountSlug/shipping" element={<PolicyPage />} />
      <Route
        path="/:accountSlug/account"
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/:accountSlug/profile"
        element={(
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<ConsumerSiteMissingPage />} />
    </Routes>
  );
}

function AccountRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const accountSlug = location.pathname.split("/").filter(Boolean)[0];

  if (isReservedRoute(accountSlug)) {
    return <ConsumerSiteMissingPage />;
  }

  return <>{children}</>;
}

function AccountRedirect({ to }: { to: string }) {
  const location = useLocation();
  const accountSlug = location.pathname.split("/").filter(Boolean)[0];
  return <Navigate to={accountPath(accountSlug, to)} replace />;
}

function ConsumerSiteMissingPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7f2] px-5 text-slate-900">
      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#135c4c]">Consumer site</p>
        <h1 className="mt-3 text-2xl font-semibold">Open a provider-specific site URL.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Consumer pages are scoped per provider. Use <span className="font-semibold text-slate-900">/account1</span> on the shared host, or configure a provider domain to serve the same site at <span className="font-semibold text-slate-900">/</span>.
        </p>
        <a href="/account1" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-[#135c4c] px-4 text-sm font-semibold text-white">
          View account1 demo
        </a>
      </div>
    </div>
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
