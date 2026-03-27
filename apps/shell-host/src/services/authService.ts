
import type { UserContext, AccountContext, BranchLocation } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";

export interface SessionResponse {
  user:      UserContext;
  account:   AccountContext;
  locations: BranchLocation[];
  token?:    string;
  multiFactorAuthenticationRequired?: boolean;
  otpLength?: number;
  maskedDestination?: string;
}

export interface LoginRequest {
  loginId: string;
  password: string;
  mUniqueId?: string;
  multiFactorAuthenticationLogin?: boolean;
  otp?: string;
}

const isMock = import.meta.env.VITE_USE_MOCK === "true";

export const authService = {

  async checkSession(): Promise<SessionResponse> {
  if (isMock) {
    const { mockUser, mockAccount, mockLocations, mockToken } = 
      await import("../mocks/mockAuth");
    
    console.log("[authService] mock locations:", mockLocations);
    
    return {
      user:      mockUser,
      account:   mockAccount,
      locations: mockLocations,
      token:     mockToken,
    };
  }
  const res = await apiClient.get<SessionResponse>("/auth/me");
  return res.data;
},

  async login(payload: LoginRequest): Promise<SessionResponse> {
    if (isMock) {
      const { mockLogin: doMockLogin } = await import("../mocks/mockAuth");
      return doMockLogin(payload.loginId, payload.password);
    }
    const res = await apiClient.post<SessionResponse>("/auth/login", payload);
    return res.data;
  },

  async logout(): Promise<void> {
    if (isMock) return;
    await apiClient.post("/auth/logout").catch(() => {});
  },
};
