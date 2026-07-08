import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { accountPath, isReservedRoute } from "../utils/accountRoutes";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasHydrated, authResolved } = useAppStore();
  const location = useLocation();

  if (!hasHydrated || !authResolved) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading your consumer session...</div>;
  }

  if (!isAuthenticated) {
    const firstSegment = location.pathname.split("/").filter(Boolean)[0];
    const accountSlug = isReservedRoute(firstSegment) ? undefined : firstSegment;
    return <Navigate to={accountPath(accountSlug, "/login")} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
