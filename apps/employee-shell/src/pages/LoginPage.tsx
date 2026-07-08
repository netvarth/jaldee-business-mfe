import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(4);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function attemptLogin() {
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

    navigate((location.state as { from?: string } | null)?.from || "/hr", { replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await attemptLogin();
    } catch (err) {
      if (getErrorMessage(err) === "Session already exists.") {
        try {
          await logout();
          await attemptLogin();
          return;
        } catch (retryError) {
          setError(getErrorMessage(retryError));
          return;
        }
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

  async function handleManualLogout() {
    setError("");
    setLoggingOut(true);

    try {
      await logout();
      setRequiresMfa(false);
      setOtp("");
    } catch (logoutError) {
      setError(getErrorMessage(logoutError));
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,_#dce86c_0,_#f5f7f2_38%,_#e8efe8_100%)] px-5 py-8 text-slate-900">
      <div className="grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex rounded-lg bg-[#111815] p-6 text-white shadow-[0_24px_70px_rgba(17,24,21,0.24)] md:p-8">
          <div className="flex w-full flex-col justify-center">
          <div className="inline-flex w-fit rounded-md border border-[#e4f04b]/40 bg-[#e4f04b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#e4f04b]">
            HR Workspace
          </div>
          <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight md:text-4xl">
            Employee access for HR self-service.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Sign in to view attendance, leave, payroll, documents, and assigned HR tasks with a limited employee menu.
          </p>
          <div className="mt-9 grid gap-3">
            {[
              "Attendance and shifts",
              "Leave requests",
              "Payroll and documents",
              "Assigned HR tasks",
            ].map((item) => (
              <div key={item} className="rounded-md border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-slate-200">
                {item}
              </div>
            ))}
          </div>
          </div>
        </aside>

        <section className="rounded-lg border border-white/70 bg-white/[0.9] p-6 text-slate-900 shadow-[0_24px_70px_rgba(17,24,21,0.16)] backdrop-blur md:p-8">
          <div className="mb-7">
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              Tenant Login
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-slate-950">
              {requiresMfa ? "Verify your sign in" : "Sign in to HR"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              {requiresMfa
                ? `Enter the OTP${maskedDestination ? ` sent to ${maskedDestination}` : ""}.`
                : "For now, use a tenant/business login to inspect the employee HR workspace."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!requiresMfa ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Login ID</span>
                  <input
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2f6b55] focus:ring-2 focus:ring-[#dce86c]/40"
                    placeholder="Enter tenant login"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2f6b55] focus:ring-2 focus:ring-[#dce86c]/40"
                    placeholder="Enter password"
                  />
                </label>

                <button
                  type="button"
                  disabled={loading || loggingOut}
                  onClick={() => void handleManualLogout()}
                  className="min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Signing out..." : "Logout existing session"}
                </button>
              </>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">OTP</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, otpLength))}
                  className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2f6b55] focus:ring-2 focus:ring-[#dce86c]/40"
                  placeholder={`Enter ${otpLength}-digit OTP`}
                />
              </label>
            )}

            {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            {requiresMfa ? (
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleBackToLogin}
                  className="min-h-12 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.trim().length < otpLength}
                  className="min-h-12 rounded-md bg-[#245640] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4735] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-md bg-[#245640] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4735] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to HR workspace"}
              </button>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  function extractMessageFromPayload(payload: unknown): string {
    if (typeof payload === "string") {
      const trimmed = payload.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return extractMessageFromPayload(JSON.parse(trimmed));
        } catch {
          return payload;
        }
      }
      return payload;
    }

    if (typeof payload === "object" && payload !== null) {
      if ("message" in payload && typeof payload.message === "string") {
        return payload.message;
      }
    }

    return "";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const extractedMessage = extractMessageFromPayload((error.response as { data?: unknown }).data);
    if (extractedMessage) return extractedMessage;
  }

  if (error instanceof Error) {
    return extractMessageFromPayload(error.message) || error.message;
  }

  return "Unable to sign in.";
}
