import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Checkbox, Icon, Input, OtpInput, PhoneInput } from "@jaldee/design-system";
import type { PhoneInputValue } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import { useShellStore } from "../store/shellStore";
import "./LoginPage.css";

type SignupFormState = {
  loginId: string;
  firstName: string;
  lastName: string;
  mobile: PhoneInputValue;
  email: string;
  password: string;
};

type SignupFieldKey = keyof SignupFormState | "otp";

type ParsedAuthError = {
  message: string;
  fieldErrors: Partial<Record<SignupFieldKey, string>>;
};

const EMPTY_SIGNUP_FORM: SignupFormState = {
  loginId: "",
  firstName: "",
  lastName: "",
  mobile: {
    countryCode: "+91",
    number: "",
    e164Number: "",
  },
  email: "",
  password: "",
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { issueTenantSignupOtp, verifyTenantSignupOtp } = useAuth();
  const setOnboardingStatus = useShellStore((s) => s.setOnboardingStatus);
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const [form, setForm] = useState<SignupFormState>(EMPTY_SIGNUP_FORM);
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otpTargetType, setOtpTargetType] = useState<"EMAIL" | "MOBILE" | "">("");
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState<number | null>(null);
  const [nextResendInSeconds, setNextResendInSeconds] = useState<number | null>(null);
  const [step, setStep] = useState<"details" | "verify">("details");
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignupFieldKey, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const canSubmitDetails = useMemo(() => {
    return (
      form.loginId.trim().length > 0 &&
      form.firstName.trim().length > 0 &&
      form.password.length > 0 &&
      (form.mobile.number.trim().length > 0 || form.email.trim().length > 0) &&
      agreedToTerms
    );
  }, [agreedToTerms, form]);

  useEffect(() => {
    if (step !== "verify") {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpExpiresInSeconds((current) => (current && current > 0 ? current - 1 : current));
      setNextResendInSeconds((current) => (current && current > 0 ? current - 1 : current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  if (hasHydrated && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  async function handleIssueOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await issueTenantSignupOtp({
        loginId: form.loginId,
        mobile: form.mobile.e164Number || undefined,
        email: form.email || undefined,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        password: form.password,
      });

      setOtpId(response.otpId);
      setMaskedTarget(response.maskedTarget ?? "");
      setOtpTargetType(response.targetType === "EMAIL" ? "EMAIL" : response.targetType === "MOBILE" ? "MOBILE" : "");
      setOtpExpiresInSeconds(response.expiresInSeconds ?? null);
      setNextResendInSeconds(response.nextResendInSeconds ?? null);
      setOtp("");
      setStep("verify");
    } catch (err) {
      const parsed = getAuthErrorDetails(err);
      setError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await verifyTenantSignupOtp({
        otpId,
        otp,
        purpose: otpTargetType === "EMAIL" ? "TENANT_SIGNUP_VERIFY_EMAIL" : "TENANT_SIGNUP_VERIFY_MOBILE",
      });
      setOnboardingStatus("pending");
      navigate("/onboarding");
    } catch (err) {
      const parsed = getAuthErrorDetails(err);
      setError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setFieldErrors({});
    setResendingOtp(true);

    try {
      const response = await issueTenantSignupOtp({
        loginId: form.loginId,
        mobile: form.mobile.e164Number || undefined,
        email: form.email || undefined,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        password: form.password,
      });

      setOtpId(response.otpId);
      setMaskedTarget(response.maskedTarget ?? "");
      setOtpTargetType(response.targetType === "EMAIL" ? "EMAIL" : response.targetType === "MOBILE" ? "MOBILE" : "");
      setOtpExpiresInSeconds(response.expiresInSeconds ?? null);
      setNextResendInSeconds(response.nextResendInSeconds ?? null);
      setOtp("");
    } catch (err) {
      const parsed = getAuthErrorDetails(err);
      setError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setResendingOtp(false);
    }
  }

  function handleBack() {
    setStep("details");
    setOtp("");
    setError("");
    setFieldErrors({});
    setOtpTargetType("");
  }

  return (
    <div className="login-page">
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="login-card auth-card-flat">
            {step === "details" ? (
              <>
                <div className="login-header auth-header-left">
                  <div className="login-badge auth-brand-badge">J</div>
                  <h1 className="login-title">Create your Jaldee account</h1>
                  <p className="login-subtitle">Start your trial and verify with email or phone OTP.</p>
                </div>
                <form className="login-form" onSubmit={handleIssueOtp}>
                  <Input
                    type="text"
                    label="Login ID"
                    value={form.loginId}
                    onChange={(event) => setForm((current) => ({ ...current, loginId: event.target.value }))}
                    fullWidth
                    containerClassName="login-field"
                    placeholder="Choose a login ID"
                    error={fieldErrors.loginId}
                  />
                  <div className="auth-name-grid">
                    <Input
                      type="text"
                      label="First Name"
                      value={form.firstName}
                      onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                      fullWidth
                      containerClassName="login-field"
                      placeholder="Enter your first name"
                      error={fieldErrors.firstName}
                    />
                    <Input
                      type="text"
                      label="Last Name"
                      value={form.lastName}
                      onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                      fullWidth
                      containerClassName="login-field"
                      placeholder="Enter your last name"
                      error={fieldErrors.lastName}
                    />
                  </div>
                  <Input
                    type="email"
                    label="Work Email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    fullWidth
                    containerClassName="login-field"
                    placeholder="you@example.com"
                    hint="We'll send a verification code here if email is used."
                    error={fieldErrors.email}
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    fullWidth
                    containerClassName="login-field"
                    placeholder="Create a password"
                    hint="8-30 characters with uppercase, lowercase, number, and special character."
                    error={fieldErrors.password}
                    suffix={
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    }
                  />
                  <PhoneInput
                    label="WhatsApp / Mobile Number"
                    value={form.mobile}
                    onChange={(value) => setForm((current) => ({ ...current, mobile: value }))}
                    containerClassName="login-field"
                    numberPlaceholder="Enter phone number"
                    hint="Use either email or phone. You'll receive an OTP on the selected channel."
                    error={fieldErrors.mobile}
                    preferredCountries={["in"]}
                  />
                  <Checkbox
                    checked={agreedToTerms}
                    onChange={(event) => setAgreedToTerms(event.target.checked)}
                    containerClassName="auth-consent"
                    label={(
                      <span className="auth-consent-copy">
                        I agree to the{" "}
                        <button type="button" className="auth-inline-link auth-consent-link">
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button type="button" className="auth-inline-link auth-consent-link">
                          Privacy Policy
                        </button>
                      </span>
                    )}
                  />
                  {error ? <div className="login-error">{error}</div> : null}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={loading || !canSubmitDetails}
                    fullWidth
                    className="login-submit"
                  >
                    {loading ? "Sending OTP..." : "Create account"}
                  </Button>
                  <div className="auth-inline-footer">
                    <span className="auth-inline-copy">Already have an account?</span>
                    <button type="button" className="auth-inline-link" onClick={() => navigate("/login")}>
                      Sign in
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="signup-otp-shell">
                <button type="button" className="signup-otp-back-link" onClick={handleBack}>
                  <span aria-hidden="true" className="signup-otp-back-arrow">←</span>
                  <span>Back to Sign Up</span>
                </button>

                <div className="signup-otp-card">
                  <div className="signup-otp-icon">
                    <Icon name="globe" className="signup-otp-icon-svg" />
                  </div>
                  <h1 className="signup-otp-title">Verify your identity</h1>
                  <p className="signup-otp-copy">
                    {maskedTarget
                      ? `We've sent a 6-digit code to ${maskedTarget}. Please enter it below to continue.`
                      : "We've sent a 6-digit code. Please enter it below to continue."}
                  </p>

                  <form className="login-form signup-otp-form" onSubmit={handleVerifyOtp}>
                    <OtpInput
                      value={otp}
                      onChange={(value) => setOtp(value.slice(0, 6))}
                      length={6}
                      error={fieldErrors.otp}
                      containerClassName="signup-otp-field"
                    />

                    {error ? <div className="login-error">{error}</div> : null}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      disabled={loading || otp.trim().length < 6 || !otpId}
                      fullWidth
                      className="signup-otp-submit"
                    >
                      {loading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <div className="signup-otp-status-row">
                      {otpExpiresInSeconds ? (
                        <div className="signup-otp-status-pill">
                          <span className="signup-otp-status-label">Expires in</span>
                          <span className="signup-otp-status-value">{formatSeconds(otpExpiresInSeconds)}</span>
                        </div>
                      ) : null}
                      {nextResendInSeconds && nextResendInSeconds > 0 ? (
                        <div className="signup-otp-status-pill">
                          <span className="signup-otp-status-label">Resend in</span>
                          <span className="signup-otp-status-value">{formatSeconds(nextResendInSeconds)}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="signup-otp-resend-block">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={loading || resendingOtp || Boolean(nextResendInSeconds && nextResendInSeconds > 0)}
                        className="login-resend-button signup-otp-resend-button"
                        onClick={() => void handleResendOtp()}
                      >
                        {resendingOtp ? "Resending..." : "Resend OTP"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="auth-showcase">
        <div className="auth-showcase-content">
          <h2 className="auth-showcase-title">One platform for everything your business needs</h2>
          <p className="auth-showcase-copy">
            From bookings to billing, inventory to invoices, Jaldee gives Indian businesses the complete
            operating system they've been missing.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">◫</div>
              <div>
                <div className="auth-feature-title">Bookings & scheduling</div>
                <div className="auth-feature-copy">Let customers book online, 24/7</div>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">₹</div>
              <div>
                <div className="auth-feature-title">GST-compliant invoicing</div>
                <div className="auth-feature-copy">Built for Indian businesses</div>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">↗</div>
              <div>
                <div className="auth-feature-title">Grow with insights</div>
                <div className="auth-feature-copy">Reports and analytics included</div>
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            <div className="auth-showcase-trust">TRUSTED BY 2,500+ INDIAN BUSINESSES</div>
            <div className="auth-showcase-brands">Acme Healthcare · Karty Stores · Lino Lending · Prasis Clinic</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatSeconds(totalSeconds: number) {
  const safeValue = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeFieldKey(field: string): SignupFieldKey | null {
  const normalized = field.trim();
  if (
    normalized === "loginId" ||
    normalized === "firstName" ||
    normalized === "lastName" ||
    normalized === "mobile" ||
    normalized === "email" ||
    normalized === "password" ||
    normalized === "otp"
  ) {
    return normalized;
  }

  return null;
}

function getAuthErrorDetails(error: unknown): ParsedAuthError {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = (error.response as { data?: unknown }).data;
    if (typeof data === "string") {
      return { message: data, fieldErrors: {} };
    }
    if (typeof data === "object" && data !== null) {
      const details = "details" in data && typeof data.details === "object" && data.details !== null
        ? (data.details as {
            fieldErrors?: Array<{ field?: string; message?: string }>;
            globalErrors?: Array<{ message?: string } | string>;
          })
        : null;
      const mappedFieldErrors: Partial<Record<SignupFieldKey, string>> = {};
      const unmatchedFieldMessages: string[] = [];

      const fieldMessages = details?.fieldErrors?.map((entry) => {
        const message = typeof entry?.message === "string" ? entry.message : "";
        const field = typeof entry?.field === "string" ? entry.field : "";
        const normalizedField = field ? normalizeFieldKey(field) : null;

        if (normalizedField && message) {
          mappedFieldErrors[normalizedField] = mappedFieldErrors[normalizedField]
            ? `${mappedFieldErrors[normalizedField]}\n${message}`
            : message;
        } else if (message) {
          unmatchedFieldMessages.push(field && message ? `${field}: ${message}` : message);
        }

        return field && message ? `${field}: ${message}` : message;
      }).filter(Boolean) ?? [];

      if (fieldMessages.length) {
        return {
          message: unmatchedFieldMessages.join("\n"),
          fieldErrors: mappedFieldErrors,
        };
      }

      const globalMessages =
        details?.globalErrors
          ?.map((entry) =>
            typeof entry === "string"
              ? entry
              : typeof entry?.message === "string"
                ? entry.message
                : ""
          )
          .filter(Boolean) ?? [];

      if (globalMessages.length) {
        return { message: globalMessages.join("\n"), fieldErrors: {} };
      }

      if ("message" in data && typeof data.message === "string") {
        return { message: data.message, fieldErrors: {} };
      }
    }
  }

  return {
    message: error instanceof Error ? error.message : "Signup failed",
    fieldErrors: {},
  };
}
