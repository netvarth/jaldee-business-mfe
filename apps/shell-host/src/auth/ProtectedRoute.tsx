import { Navigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { hasStoredAuthSession } from "../services/authService";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const hasStoredSession = hasStoredAuthSession();

  if (!hasHydrated) {
    return <div className="shell-loading">Loading session...</div>;
  }

  if (!isAuthenticated && hasStoredSession) {
    return <div className="shell-loading">Restoring session...</div>;
  }

  if (!isAuthenticated && !hasStoredSession) {
    return <Navigate to="/signup" replace />;
  }

  return <>{children}</>;
}
