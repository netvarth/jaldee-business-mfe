import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { accountPath, getResolvedAccountSlug } from "../utils/accountRoutes";

type LoginStep = "phone" | "otp" | "signup";

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { startPhoneOtp, verifyPhoneOtp, signupWithPhone, startGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { accountSlug } = useParams();
  const resolvedAccountSlug = getResolvedAccountSlug(accountSlug);

  const returnPath = (location.state as { from?: string } | null)?.from || accountPath(accountSlug, "/account");

  async function handleStartOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await startPhoneOtp({
        phone: phone.trim(),
        accountSlug: resolvedAccountSlug,
      });
      setOtpId(response.otpId);
      setOtpLength(response.otpLength ?? 6);
      setMaskedDestination(response.maskedDestination ?? phone.trim());
      setStep(response.consumerExists ? "otp" : "signup");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyPhoneOtp({
        otpId,
        phone: phone.trim(),
        otp,
        accountSlug: resolvedAccountSlug,
      });
      navigate(returnPath, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signupWithPhone({
        otpId,
        phone: phone.trim(),
        otp,
        firstName,
        lastName,
        accountSlug: resolvedAccountSlug,
      });
      navigate(returnPath, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("phone");
    setOtp("");
    setOtpId("");
    setError("");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,_#7ddfcc_0,_#eaf8f5_38%,_#d7fff7_100%)] px-5 py-8 text-slate-900">
      <div className="grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-lg border border-white/70 bg-white/[0.9] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur md:p-8">
          <div className="mb-7">
            <div className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              {`${resolvedAccountSlug} customer login`}
            </div>
            <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              Sign in with phone OTP.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Customers can continue with a phone number or Google. If the phone is new, we will create the account after collecting the name.
            </p>
          </div>

          {step === "phone" ? (
            <form className="space-y-4" onSubmit={handleStartOtp}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Phone number</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^\d+]/g, "").slice(0, 15))}
                  className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="Enter phone number"
                />
              </label>

              {error ? <ErrorMessage message={error} /> : null}

              <button
                type="submit"
                disabled={loading || phone.trim().length < 8}
                className="min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Continue with phone"}
              </button>

              <div className="relative py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                or
              </div>

              <button
                type="button"
                onClick={() => startGoogleLogin(resolvedAccountSlug)}
                className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Continue with Google
              </button>
            </form>
          ) : null}

          {step === "otp" ? (
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <OtpField
                otp={otp}
                otpLength={otpLength}
                maskedDestination={maskedDestination}
                onChange={setOtp}
              />
              {error ? <ErrorMessage message={error} /> : null}
              <ActionRow
                loading={loading}
                disabled={otp.trim().length < otpLength}
                submitLabel="Verify and sign in"
                loadingLabel="Verifying..."
                onBack={handleBack}
              />
            </form>
          ) : null}

          {step === "signup" ? (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This phone number is new. Enter your name and verify OTP to create your customer account.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="First name"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    placeholder="Last name"
                  />
                </label>
              </div>
              <OtpField
                otp={otp}
                otpLength={otpLength}
                maskedDestination={maskedDestination}
                onChange={setOtp}
              />
              {error ? <ErrorMessage message={error} /> : null}
              <ActionRow
                loading={loading}
                disabled={!firstName.trim() || !lastName.trim() || otp.trim().length < otpLength}
                submitLabel="Create account"
                loadingLabel="Creating..."
                onBack={handleBack}
              />
            </form>
          ) : null}
        </section>

        <aside className="flex rounded-lg bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:p-8">
          <div className="flex w-full flex-col justify-center">
            <h2 className="text-2xl font-semibold">Customer-first access</h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
              <p>Phone OTP is the primary login for customers.</p>
              <p>Google login remains available for faster access where configured.</p>
              <p>New phone numbers continue into a lightweight customer signup.</p>
            </div>
            <div className="mt-10 grid gap-4">
              {["Upcoming bookings", "Payments and invoices", "Profile and documents"].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OtpField({
  otp,
  otpLength,
  maskedDestination,
  onChange,
}: {
  otp: string;
  otpLength: number;
  maskedDestination: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        OTP {maskedDestination ? <span className="font-normal text-slate-500">sent to {maskedDestination}</span> : null}
      </span>
      <input
        value={otp}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, otpLength))}
        className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        placeholder={`Enter ${otpLength}-digit OTP`}
      />
    </label>
  );
}

function ActionRow({
  loading,
  disabled,
  submitLabel,
  loadingLabel,
  onBack,
}: {
  loading: boolean;
  disabled: boolean;
  submitLabel: string;
  loadingLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
      <button
        type="button"
        disabled={loading}
        onClick={onBack}
        className="min-h-12 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Back
      </button>
      <button
        type="submit"
        disabled={loading || disabled}
        className="min-h-12 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
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
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  return error instanceof Error ? error.message : "Unable to continue.";
}
