import { Navigate, useLocation } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { getAuthMode } from "../services/authService";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const authResolved = useShellStore((s) => s.authResolved);
  const onboardingStatus = useShellStore((s) => s.onboardingStatus);
  const location = useLocation();

  if (!hasHydrated || !authResolved) {
    return <div className="shell-loading">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signup" replace />;
  }

  const tokenOnboardingEnabled = getAuthMode() === "token";

  if (!tokenOnboardingEnabled && location.pathname === "/onboarding") {
    return <Navigate to="/home" replace />;
  }

  if (tokenOnboardingEnabled && isAuthenticated && onboardingStatus === "pending" && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (tokenOnboardingEnabled && isAuthenticated && onboardingStatus === "complete" && location.pathname === "/onboarding") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
