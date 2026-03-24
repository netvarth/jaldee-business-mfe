import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useShellStore } from "../store/shellStore";
import { initApiClient } from "@jaldee/api-client";
import { authService } from "../services/authService";

// ─── Types ────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => void;
}

// ─── Context ──────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  const {
    setAuth,
    clearAuth,
    setAvailableLocations,
    setLocation,
    isAuthenticated,
  } = useShellStore();

  // Init api client once with base URL
  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
    initApiClient(baseURL);
  }, []);

  // Listen for session expired event from api-client interceptor
  useEffect(() => {
    const handler = () => clearAuth();
    window.addEventListener("jaldee:session:expired", handler);
    return () => window.removeEventListener("jaldee:session:expired", handler);
  }, [clearAuth]);

  // On boot — check if session is still valid
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setIsLoading(true);
    try {
      const { user, account, locations, token } =
        await authService.checkSession();

      setAuth(user, account, token ?? "");

      if (locations?.length) {
        setAvailableLocations(locations);
        setLocation(locations[0]);
      }
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { user, account, locations, token } =
      await authService.login(email, password);

    setAuth(user, account, token ?? "");

    if (locations?.length) {
      setAvailableLocations(locations);
      setLocation(locations[0]);
    }
  }

  function logout() {
    authService.logout();
    clearAuth();
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}