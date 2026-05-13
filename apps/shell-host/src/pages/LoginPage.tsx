import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Input } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import { setStoredMUniqueId } from "../services/authService";
import { useShellStore } from "../store/shellStore";
import "./LoginPage.css";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("manikandan.velayudhan@jaldee.com");
  const [password, setPassword] = useState("netvarth");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(4);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const isAuthenticated = useShellStore((s) => s.isAuthenticated);
  const hasHydrated = useShellStore((s) => s.hasHydrated);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const muid = params.get("muid");
    if (muid) {
      setStoredMUniqueId(muid);
    }
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login({
        loginId: loginId.trim(),
        password,
        multiFactorAuthenticationLogin: requiresMfa,
        otp: requiresMfa ? otp.trim() : undefined,
      });

      if (response.multiFactorAuthenticationRequired) {
        setRequiresMfa(true);
        setOtp("");
        setOtpLength(response.otpLength ?? 4);
        setMaskedDestination(response.maskedDestination ?? "");
        return;
      }

      navigate("/base");
    } catch (err: unknown) {
      if (isSessionAlreadyExistsError(err)) {
        navigate("/base", { replace: true });
        return;
      }

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setRequiresMfa(false);
    setOtp("");
    setError("");
  }

  if (hasHydrated && isAuthenticated) {
    return <Navigate to="/base" replace />;
  }

  return (
    <div className="login-page">
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="login-card auth-card-flat">
            <div className="login-header auth-header-left">
              <div className="login-badge auth-brand-badge">J</div>
              <h1 className="login-title">
                {requiresMfa ? "Verify your sign in" : "Welcome back to Jaldee"}
              </h1>
              <p className="login-subtitle">
                {requiresMfa
                  ? `Enter the OTP${maskedDestination ? ` sent to ${maskedDestination}` : ""}`
                  : "Sign in to manage bookings, billing, teams, and operations from one place."}
              </p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              {!requiresMfa ? (
                <>
                  <Input
                    type="text"
                    label="Login ID"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    fullWidth
                    containerClassName="login-field"
                    placeholder="Enter your login ID"
                  />

                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    fullWidth
                    containerClassName="login-field"
                    placeholder="Enter your password"
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
                </>
              ) : (
                <Input
                  type="text"
                  label="OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, otpLength))}
                  fullWidth
                  containerClassName="login-field"
                  placeholder={`Enter ${otpLength}-digit OTP`}
                />
              )}

              {error && <div className="login-error">{error}</div>}

              {requiresMfa ? (
                <div className="login-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={loading}
                    className="login-secondary-action"
                    onClick={handleBackToLogin}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={loading || otp.trim().length < otpLength}
                    fullWidth
                    className="login-submit"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={loading}
                    fullWidth
                    className="login-submit"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                  <div className="auth-inline-footer">
                    <span className="auth-inline-copy">New to Jaldee?</span>
                    <button type="button" className="auth-inline-link" onClick={() => navigate("/signup")}>
                      Create account
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </section>

      <aside className="auth-showcase">
        <div className="auth-showcase-content">
          <h2 className="auth-showcase-title">One platform for everything your business needs</h2>
          <p className="auth-showcase-copy">
            From bookings to billing, inventory to invoices, Jaldee gives Indian businesses the complete
            operating system they&apos;ve been missing.
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

function getErrorMessage(error: unknown): string {
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
      return data;
    }
    if (typeof data === "object" && data !== null) {
      const details = "details" in data && typeof data.details === "object" && data.details !== null
        ? (data.details as {
            fieldErrors?: Array<{ field?: string; message?: string }>;
            globalErrors?: Array<{ message?: string } | string>;
          })
        : null;

      const fieldMessages =
        details?.fieldErrors
          ?.map((entry) => {
            const message = typeof entry?.message === "string" ? entry.message : "";
            const field = typeof entry?.field === "string" ? entry.field : "";
            return field && message ? `${field}: ${message}` : message;
          })
          .filter(Boolean) ?? [];

      if (fieldMessages.length) {
        return fieldMessages.join("\n");
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
        return globalMessages.join("\n");
      }

      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }

  return error instanceof Error ? error.message : "Login failed";
}

function isSessionAlreadyExistsError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message === "Session already exists.";
}
