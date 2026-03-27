import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useShellStore } from "../store/shellStore";
import { initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import { authService } from "../services/authService";
import type { LoginRequest, SessionResponse } from "../services/authService";

// ─── Types ────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (payload: LoginRequest) => Promise<SessionResponse>;
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
    accessToken,
  } = useShellStore();

  // Init api client once with base URL
  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
    initApiClient(baseURL);
    setApiClientAuthHandlers({
      onSessionExpired: () => clearAuth(),
    });
  }, [clearAuth]);

  useEffect(() => {
    setApiClientContext({
      authMode: "session",
      authToken: accessToken ?? "",
    });
  }, [accessToken]);

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

  async function login(payload: LoginRequest) {
    const response = await authService.login(payload);

    if (response.multiFactorAuthenticationRequired) {
      return response;
    }

    const { user, account, locations, token } = response;

    setAuth(user, account, token ?? "");

    if (locations?.length) {
      setAvailableLocations(locations);
      setLocation(locations[0]);
    }

    return response;
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
