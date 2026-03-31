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

      navigate("/home");
    } catch (err: unknown) {
      if (isSessionAlreadyExistsError(err)) {
        navigate("/home", { replace: true });
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
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">✦</div>
          <h1 className="login-title">Jaldee Business</h1>
          <p className="login-subtitle">
            {requiresMfa
              ? `Enter the OTP${maskedDestination ? ` sent to ${maskedDestination}` : ""}`
              : "Sign in to your account"}
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
                type="password"
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                containerClassName="login-field"
                placeholder="Enter your password"
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
          )}
        </form>
      </div>
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
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return error instanceof Error ? error.message : "Login failed";
}

function isSessionAlreadyExistsError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message === "Session already exists.";
}
