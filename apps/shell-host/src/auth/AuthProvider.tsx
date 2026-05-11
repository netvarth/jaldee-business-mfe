import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useShellStore } from "../store/shellStore";
import { initApiClient, setApiClientAuthHandlers, setApiClientContext } from "@jaldee/api-client";
import { authService, clearStoredCredentials, getAuthMode, getStoredAccessToken, getStoredCredentials, setStoredCredentials } from "../services/authService";
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
  const hasBootstrappedSessionRef = useRef(false);
  const hasFetchedLocationsRef = useRef(false);
  const locationsRequestInFlightRef = useRef(false);
  const {
    setAuth,
    clearAuth,
    setAvailableLocations,
    setLocation,
    isAuthenticated,
    accessToken,
    hasHydrated,
    activeLocation,
    availableLocations,
  } = useShellStore();

  useLayoutEffect(() => {
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    initApiClient(baseURL);
    setApiClientAuthHandlers({
      refreshSession: async () => {
        const response = await authService.refreshSession();
        const { user, account, locations, token } = response;
        setAuth(user, account, token ?? "");
        setAvailableLocations(locations ?? []);
        if ((locations ?? []).length) {
          setLocation(locations[0]);
        }
        return getAuthMode() === "token" ? { authToken: token ?? "" } : undefined;
      },
      onSessionExpired: () => {
        clearStoredCredentials();
        clearAuth();
      },
    });
  }, [clearAuth]);

  useLayoutEffect(() => {
    setApiClientContext({
      authMode: getAuthMode(),
      authToken: accessToken ?? "",
    });
  }, [accessToken]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (isAuthenticated) {
      hasBootstrappedSessionRef.current = true;
      return;
    }

    if (!hasHydrated || isAuthenticated) {
      return;
    }

    if (hasBootstrappedSessionRef.current) {
      return;
    }

    const storedCredentials = getStoredCredentials();
    if (getAuthMode() === "session" && !storedCredentials) {
      return;
    }
    const storedAccessToken = getStoredAccessToken();
    if (getAuthMode() === "token" && !accessToken && !storedAccessToken) {
      return;
    }

    hasBootstrappedSessionRef.current = true;
    let cancelled = false;

    const bootstrapSession =
      getAuthMode() === "session" && storedCredentials
        ? authService.login(storedCredentials)
        : authService.checkSession();

    bootstrapSession
      .then((response) => {
        if (cancelled || response.multiFactorAuthenticationRequired) {
          return;
        }

        const { user, account, locations, token } = response;
        setAuth(user, account, token ?? "");
        setAvailableLocations(locations ?? []);
        if ((locations ?? []).length) {
          setLocation(locations[0]);
        }
        hasFetchedLocationsRef.current = false;
      })
      .catch(() => {
        if (!cancelled) {
          hasBootstrappedSessionRef.current = false;
          hasFetchedLocationsRef.current = false;
          clearStoredCredentials();
          clearAuth();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearAuth, hasHydrated, isAuthenticated, setAuth, setAvailableLocations, setLocation]);

  async function login(payload: LoginRequest) {
    if (getAuthMode() === "session") {
      setStoredCredentials(payload);
    }
    const response = await authService.login(payload);

    if (response.multiFactorAuthenticationRequired) {
      return response;
    }

    const { user, account, locations, token } = response;

    setAuth(user, account, token ?? "");
    setAvailableLocations(locations ?? []);

    if ((locations ?? []).length) {
      setLocation(locations[0]);
    }
    hasBootstrappedSessionRef.current = true;
    hasFetchedLocationsRef.current = false;

    return response;
  }

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }

    if (hasFetchedLocationsRef.current || locationsRequestInFlightRef.current) {
      return;
    }

    locationsRequestInFlightRef.current = true;
    let cancelled = false;

    authService.getProviderLocations()
      .then((locations) => {
        if (cancelled || !locations.length) {
          hasFetchedLocationsRef.current = true;
          return;
        }

        setAvailableLocations(locations);

        const nextActiveLocation =
          activeLocation
            ? locations.find((location) => location.id === activeLocation.id) ?? locations[0]
            : locations[0];

        if (!activeLocation || activeLocation.id !== nextActiveLocation.id) {
          setLocation(nextActiveLocation);
        }
        hasFetchedLocationsRef.current = true;
      })
      .catch(() => {
        hasFetchedLocationsRef.current = false;
        // Keep the current fallback locations if the live fetch fails.
      })
      .finally(() => {
        locationsRequestInFlightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [activeLocation, availableLocations.length, hasHydrated, isAuthenticated, setAvailableLocations, setLocation]);

  async function logout() {
    try {
      await authService.logout();
    } finally {
      hasBootstrappedSessionRef.current = false;
      hasFetchedLocationsRef.current = false;
      locationsRequestInFlightRef.current = false;
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
