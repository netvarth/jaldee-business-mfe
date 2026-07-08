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
}

export interface PhoneOtpStartRequest {
  phone: string;
  accountSlug?: string;
}

export interface PhoneOtpStartResponse {
  otpId: string;
  phone: string;
  consumerExists: boolean;
  otpLength?: number;
  maskedDestination?: string;
  expiresInSeconds?: number;
  nextResendInSeconds?: number;
}

export interface PhoneOtpVerifyRequest {
  otpId: string;
  phone: string;
  otp: string;
  accountSlug?: string;
}

export interface ConsumerSignupRequest extends PhoneOtpVerifyRequest {
  firstName: string;
  lastName: string;
}
