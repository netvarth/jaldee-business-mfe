import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/appStore";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasHydrated, authResolved } = useAppStore();
  const location = useLocation();

  if (!hasHydrated || !authResolved) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading your employee session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
