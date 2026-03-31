import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useShellStore } from "../store/shellStore";
import { initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import { authService, clearStoredCredentials, setStoredCredentials } from "../services/authService";
import type { LoginRequest, SessionResponse } from "../services/authService";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<SessionResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    setAuth,
    clearAuth,
    setAvailableLocations,
    setLocation,
    isAuthenticated,
    accessToken,
    hasHydrated,
  } = useShellStore();

  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    initApiClient(baseURL);
    setApiClientAuthHandlers({
      onSessionExpired: () => {
        clearStoredCredentials();
        clearAuth();
      },
    });
  }, [clearAuth]);

  useEffect(() => {
    setApiClientContext({
      authMode: "session",
      authToken: accessToken ?? "",
    });
  }, [accessToken]);

  async function login(payload: LoginRequest) {
    setStoredCredentials(payload);
    const response = await authService.login(payload);

    if (response.multiFactorAuthenticationRequired) {
      return response;
    }

    const { user, account, locations, token } = response;

    setAuth(user, account, token ?? "");
    setAvailableLocations(locations ?? []);

    if (locations?.length) {
      setLocation(locations[0]);
    }

    return response;
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clearStoredCredentials();
      clearAuth();
    }
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading: !hasHydrated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
