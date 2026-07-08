export interface AppUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AppWorkspace {
  id: string;
  name: string;
  kind: string;
  themeColor?: string;
}

export interface SessionResponse {
  user: AppUser;
  workspace: AppWorkspace;
  token?: string;
  refreshToken?: string;
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
