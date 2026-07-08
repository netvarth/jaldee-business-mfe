import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "../store/appStore";
import { consumerAuthService } from "../services/authService";
import { clearTelemetryUser, identifyUser } from "../services/telemetry";
import type { ConsumerSignupRequest, PhoneOtpStartRequest, PhoneOtpStartResponse, PhoneOtpVerifyRequest, SessionResponse } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  startPhoneOtp: (payload: PhoneOtpStartRequest) => Promise<PhoneOtpStartResponse>;
  verifyPhoneOtp: (payload: PhoneOtpVerifyRequest) => Promise<SessionResponse>;
  signupWithPhone: (payload: ConsumerSignupRequest) => Promise<SessionResponse>;
  startGoogleLogin: (accountSlug?: string) => void;
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
    consumerAuthService.configureApiClient(() => {
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

    if (!consumerAuthService.hasStoredAuthSession()) {
      clearSession();
      setAuthResolved(true);
      return;
    }

    consumerAuthService.checkSession()
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

  function applySession(session: SessionResponse) {
    setSession(session.user, session.workspace, session.token);
    setAuthResolved(true);
    return session;
  }

  async function verifyPhoneOtp(payload: PhoneOtpVerifyRequest) {
    return applySession(await consumerAuthService.verifyPhoneOtp(payload));
  }

  async function signupWithPhone(payload: ConsumerSignupRequest) {
    return applySession(await consumerAuthService.signupWithPhone(payload));
  }

  async function logout() {
    await consumerAuthService.logout();
    clearSession();
    setAuthResolved(true);
    clearTelemetryUser();
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: !hasHydrated,
        startPhoneOtp: consumerAuthService.startPhoneOtp,
        verifyPhoneOtp,
        signupWithPhone,
        startGoogleLogin: consumerAuthService.startGoogleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
