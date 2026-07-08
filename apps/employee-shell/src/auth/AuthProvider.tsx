import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "../store/appStore";
import { employeeAuthService } from "../services/authService";
import { clearTelemetryUser, identifyUser } from "../services/telemetry";
import type { LoginRequest, SessionResponse } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<SessionResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrapped = useRef(false);
  const {
    isAuthenticated,
    hasHydrated,
    setHasHydrated,
    setAuthResolved,
    setSession,
    clearSession,
  } = useAppStore();

  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);

  useLayoutEffect(() => {
    employeeAuthService.configureApiClient(() => {
      clearSession();
      setAuthResolved(true);
      clearTelemetryUser();
    });
  }, [clearSession, setAuthResolved]);

  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => setHasHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, [hasHydrated, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated || bootstrapped.current) return;
    bootstrapped.current = true;

    if (!employeeAuthService.hasStoredAuthSession()) {
      clearSession();
      setAuthResolved(true);
      return;
    }

    employeeAuthService.checkSession()
      .then((session) => {
        setSession(session.user, session.workspace, session.token);
        setAuthResolved(true);
      })
      .catch(() => {
        clearSession();
        setAuthResolved(true);
      });
  }, [clearSession, hasHydrated, setAuthResolved, setSession]);

  useEffect(() => {
    if (user && workspace) {
      identifyUser(user, workspace.id);
    }
  }, [user, workspace]);

  async function login(payload: LoginRequest) {
    const session = await employeeAuthService.login(payload);
    if (!session.multiFactorAuthenticationRequired) {
      setSession(session.user, session.workspace, session.token);
      setAuthResolved(true);
    }
    return session;
  }

  async function logout() {
    await employeeAuthService.logout();
    clearSession();
    setAuthResolved(true);
    clearTelemetryUser();
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: !hasHydrated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
