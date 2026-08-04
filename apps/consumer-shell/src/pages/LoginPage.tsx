import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { accountPath, getResolvedAccountSlug } from "../utils/accountRoutes";
import { OtpInput, PhoneInput, phoneValueToE164 } from "@jaldee/design-system";
import type { PhoneInputValue } from "@jaldee/design-system";

type LoginStep = "phone" | "details" | "otp";

type GoogleCredentialApi = {
  accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void; prompt: () => void } };
};

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState<PhoneInputValue>({ countryCode: "+91", number: "", e164Number: "" });
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [consumerExists, setConsumerExists] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestInFlight = useRef(false);
  const { startPhoneOtp, startPhoneSignup, verifyPhoneOtp, signupWithPhone, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { accountSlug } = useParams();
  const resolvedAccountSlug = getResolvedAccountSlug(accountSlug);

  const returnPath = (location.state as { from?: string } | null)?.from || accountPath(accountSlug, "/account");
  const normalizedPhone = phoneValueToE164(phone);

  async function handleStartOtp(event: React.FormEvent) {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError("");
    setLoading(true);

    try {
      const response = await startPhoneOtp({
        phone: normalizedPhone,
        accountSlug: resolvedAccountSlug,
      });
      setOtpId(response.otpId);
      setOtpLength(response.otpLength ?? 6);
      setMaskedDestination(response.maskedDestination ?? normalizedPhone);
      setConsumerExists(response.consumerExists);
      setStep(response.consumerExists ? "otp" : "details");
    } catch (err) {
      if (isLoginUserNotFound(err)) {
        setConsumerExists(false);
        setStep("details");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (requestInFlight.current) return;
    setError("");
    if (!otpId) {
      setError("Request a new verification code before continuing.");
      return;
    }
    requestInFlight.current = true;
    setLoading(true);

    try {
      const verification = { otpId, phone: normalizedPhone, otp, accountSlug: resolvedAccountSlug };
      if (consumerExists) {
        await verifyPhoneOtp(verification);
      } else {
        await signupWithPhone({ ...verification, firstName: firstName.trim(), lastName: lastName.trim() });
      }
      navigate(returnPath, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError("");
    setLoading(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
      if (!clientId) throw new Error("Google login is not configured.");
      const google = await loadGoogleIdentity();
      const idToken = await new Promise<string>((resolve, reject) => {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => credential ? resolve(credential) : reject(new Error("Google did not return an ID token.")),
        });
        google.accounts.id.prompt();
      });
      await loginWithGoogle({ idToken, accountSlug: resolvedAccountSlug });
      navigate(returnPath, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("phone");
    setOtp("");
    setOtpId("");
    setError("");
  }

  function handleSignupPhoneChange(value: PhoneInputValue) {
    if (phoneValueToE164(value) === phoneValueToE164(phone)) return;
    setPhone(value);
    setFirstName("");
    setLastName("");
    setOtp("");
    setOtpId("");
    setError("");
    setStep("phone");
  }

  async function handleDetails(event: React.FormEvent) {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError("");
    setLoading(true);
    try {
      const response = await startPhoneSignup({
        phone: normalizedPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        accountSlug: resolvedAccountSlug,
      });
      setOtpId(response.otpId);
      setOtpLength(response.otpLength ?? 6);
      setMaskedDestination(response.maskedDestination ?? normalizedPhone);
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,_#7ddfcc_0,_#eaf8f5_38%,_#d7fff7_100%)] px-5 py-8 text-slate-900">
      <div className="grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-lg border border-white/70 bg-white/[0.9] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur md:p-8">
          {step !== "otp" ? <div className="mb-7">
            <div className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              {`${resolvedAccountSlug} customer login`}
            </div>
            <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              {step === "details" ? "Create your account" : "Sign in with phone OTP."}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              {step === "details"
                  ? "Enter your name to finish creating your customer account."
                  : "Continue with your phone number or Google. New customers can create an account in the next step."}
            </p>
          </div> : null}

          {step === "phone" ? (
            <form className="space-y-4" onSubmit={handleStartOtp}>
              <PhoneInput
                id="consumer-login-phone"
                testId="consumer-login-phone"
                value={phone}
                onChange={setPhone}
                className="consumer-login-phone-control"
                initialCountry="in"
                preferredCountries={["in", "us", "gb"]}
                numberPlaceholder="Enter phone number"
              />

              {error ? <ErrorMessage message={error} /> : null}

              <button
                type="submit"
                disabled={loading || phone.number.replace(/\D/g, "").length < 7}
                className="min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Continue with phone"}
              </button>

              <div className="relative py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                or
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Continue with Google
              </button>
            </form>
          ) : null}

          {step === "details" ? (
            <form className="space-y-4" onSubmit={handleDetails}>
              <PhoneInput
                id="consumer-signup-phone"
                testId="consumer-signup-phone"
                value={phone}
                onChange={handleSignupPhoneChange}
                className="consumer-login-phone-control"
                initialCountry="in"
                preferredCountries={["in", "us", "gb"]}
                numberPlaceholder="Enter phone number"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                  <input autoFocus value={firstName} onChange={(event) => setFirstName(event.target.value)} className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </label>
              </div>
              {error ? <ErrorMessage message={error} /> : null}
              <ActionRow loading={loading} disabled={phone.number.replace(/\D/g, "").length < 7 || !firstName.trim() || !lastName.trim()} submitLabel="Continue to OTP" loadingLabel="Sending OTP..." onBack={handleBack} />
            </form>
          ) : null}

          {step === "otp" ? (
            <div className="consumer-otp-shell">
              <button type="button" className="consumer-otp-back" onClick={handleBack} disabled={loading}>
                <span aria-hidden="true">←</span> Back to sign in
              </button>
              <div className="consumer-otp-card">
                <div className="consumer-otp-icon" aria-hidden="true">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h1 className="consumer-otp-title">Verify your identity</h1>
                <p className="consumer-otp-copy">We sent a {otpLength}-digit code to {maskedDestination || normalizedPhone}. Enter it below to continue.</p>
                <form className="consumer-otp-form" onSubmit={handleVerifyOtp}>
                  <OtpInput
                    id="consumer-login-otp"
                    testId="consumer-login-otp"
                    length={otpLength}
                    value={otp}
                    onChange={setOtp}
                    disabled={loading}
                    containerClassName="consumer-login-otp"
                  />
                  {error ? <ErrorMessage message={error} /> : null}
                  <button type="submit" disabled={loading || !otpId || otp.trim().length < otpLength} className="consumer-otp-submit">
                    {loading ? "Verifying..." : "Continue"}
                  </button>
                </form>
              </div>
            </div>
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

function isLoginUserNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const enriched = error as { apiCode?: unknown; status?: unknown; response?: { status?: unknown; data?: unknown } };
  const responseData = typeof enriched.response?.data === "object" && enriched.response.data !== null
    ? enriched.response.data as { code?: unknown; status?: unknown }
    : {};
  const code = String(enriched.apiCode ?? responseData.code ?? "").toUpperCase();
  const status = Number(enriched.status ?? enriched.response?.status ?? responseData.status);
  return status === 404 && code === "LOGIN_USER_NOT_FOUND";
}

async function loadGoogleIdentity(): Promise<GoogleCredentialApi> {
  const existing = (window as Window & { google?: GoogleCredentialApi }).google;
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    const priorScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = priorScript ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Google login.")), { once: true });
    if (!priorScript) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  const google = (window as Window & { google?: GoogleCredentialApi }).google;
  if (!google) throw new Error("Google login is unavailable.");
  return google;
}
