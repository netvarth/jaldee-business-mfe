import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Checkbox, Input, PhoneInput, Select, Textarea } from "@jaldee/design-system";
import type { PhoneInputValue } from "@jaldee/design-system";
import { useShellStore } from "../store/shellStore";
import "./OnboardingPage.css";

type StepIndex = 0 | 1 | 2 | 3;

type BusinessType = {
  id: string;
  name: string;
  category: string;
  blurb: string;
  bullets: string[];
};

const COUNTRY_OPTIONS = [{ value: "india", label: "India" }];
const PARKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "street", label: "Street Parking" },
  { value: "private", label: "Private Parking" },
  { value: "valet", label: "Valet" },
];

const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "health",
    name: "Jaldee Health",
    category: "Clinic & hospital OS",
    blurb: "Best for clinics, hospitals, labs",
    bullets: ["Appointments & EMR", "Pharmacy & lab management", "Patient follow-up"],
  },
  {
    id: "bookings",
    name: "Jaldee Booking",
    category: "Service business OS",
    blurb: "Best for salons, gyms, consultants",
    bullets: ["Online slot booking", "Catalog & pricing", "Membership programs"],
  },
  {
    id: "karty",
    name: "Karty",
    category: "Retail & e-commerce",
    blurb: "Best for stores, pharmacies, D2C",
    bullets: ["Inventory & POS", "Online storefront", "GST invoicing"],
  },
  {
    id: "lending",
    name: "Jaldee Lending",
    category: "Loan lifecycle mgmt",
    blurb: "Best for NBFCs, lenders, MFIs",
    bullets: ["Lead capture & KYC", "Loan origination", "Repayment tracking"],
  },
];

const EMPTY_PHONE: PhoneInputValue = {
  countryCode: "+91",
  number: "",
  e164Number: "",
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setOnboardingStatus = useShellStore((s) => s.setOnboardingStatus);
  const user = useShellStore((s) => s.user);
  const [step, setStep] = useState<StepIndex>(0);
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("india");
  const [gstin, setGstin] = useState("");
  const [businessPhone, setBusinessPhone] = useState<PhoneInputValue>(EMPTY_PHONE);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>(["health", "bookings"]);
  const [searchLocation, setSearchLocation] = useState("");
  const [locationName, setLocationName] = useState("Main");
  const [pincode, setPincode] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [latitude, setLatitude] = useState("10.4414775");
  const [longitude, setLongitude] = useState("76.2183557");
  const [parking, setParking] = useState("none");
  const [alwaysOpen, setAlwaysOpen] = useState(false);

  const selectedSolutions = useMemo(
    () => BUSINESS_TYPES.filter((item) => selectedBusinessTypes.includes(item.id)),
    [selectedBusinessTypes]
  );

  function goNext() {
    setStep((current) => (current < 3 ? ((current + 1) as StepIndex) : current));
  }

  function goBack() {
    setStep((current) => (current > 0 ? ((current - 1) as StepIndex) : current));
  }

  function completeOnboarding() {
    setOnboardingStatus("complete");
    navigate("/base", { replace: true });
  }

  function toggleBusinessType(id: string) {
    setSelectedBusinessTypes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="onboarding-progress-step">
              <span
                className={`onboarding-progress-dot${
                  step === index ? " is-current" : step > index ? " is-complete" : ""
                }`}
              />
              {index < 3 ? <span className={`onboarding-progress-line${step > index ? " is-complete" : ""}`} /> : null}
            </div>
          ))}
        </div>

        <div className="onboarding-body">
          {step === 0 ? (
            <>
              <p className="onboarding-step-label">Step 1 of 4</p>
              <h1 className="onboarding-title">Tell us about your business</h1>
              <p className="onboarding-subtitle">We&apos;ll use this to set up your defaults. You can change anything later in Settings.</p>

              <div className="onboarding-form">
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="e.g., Acme Healthcare Pvt Ltd"
                  fullWidth
                />
                <div className="onboarding-grid onboarding-grid--compact">
                  <Select
                    label="Country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    options={COUNTRY_OPTIONS}
                    fullWidth
                  />
                  <Input
                    label="GSTIN"
                    value={gstin}
                    onChange={(event) => setGstin(event.target.value.toUpperCase())}
                    placeholder="e.g., 27AAAAA0000A1Z5"
                    hint="Optional. You can add this later when you're ready to invoice."
                    fullWidth
                  />
                </div>
                <PhoneInput
                  label="Business Phone"
                  value={businessPhone}
                  onChange={setBusinessPhone}
                  preferredCountries={["in"]}
                  numberPlaceholder="Enter business phone"
                />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <p className="onboarding-step-label">Step 2 of 4</p>
              <h1 className="onboarding-title">What kind of business are you?</h1>
              <p className="onboarding-subtitle">Select all the solutions that match your business needs. You can always refine these later in settings.</p>

              <div className="onboarding-solution-grid">
                {BUSINESS_TYPES.map((item) => {
                  const selected = selectedBusinessTypes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`onboarding-solution-card${selected ? " is-selected" : ""}`}
                      onClick={() => toggleBusinessType(item.id)}
                    >
                      <div className="onboarding-solution-thumb" />
                      <div className="onboarding-solution-content">
                        <div className="onboarding-solution-head">
                          <div>
                            <h2>{item.name}</h2>
                            <p>{item.category}</p>
                          </div>
                          <span className="onboarding-solution-check" />
                        </div>
                        <ul className="onboarding-solution-list">
                          {item.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                        <span className="onboarding-solution-foot">{item.blurb}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="onboarding-callout">
                Every plan includes <strong>Finance</strong> for invoicing and payments and <strong>Core Platform</strong> services.
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="onboarding-step-label">Step 3 of 4</p>
              <h1 className="onboarding-title">Where is your business located?</h1>
              <p className="onboarding-subtitle">Pin your location on the map to help customers find you easily. You can also fetch details via search.</p>

              <div className="onboarding-location-toolbar">
                <Input
                  value={searchLocation}
                  onChange={(event) => setSearchLocation(event.target.value)}
                  placeholder="Search for your location..."
                  fullWidth
                />
                <Button type="button" variant="secondary" size="md">
                  Auto-detect
                </Button>
              </div>

              <div className="onboarding-map-placeholder">
                <div className="onboarding-map-placeholder__pin" />
                <p>Map integration will be wired here. For now, continue with your primary branch details.</p>
              </div>

              <div className="onboarding-grid">
                <Input
                  label="Location Name"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  fullWidth
                />
                <Input
                  label="PinCode"
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value)}
                  fullWidth
                />
              </div>
              <div className="onboarding-grid">
                <Textarea
                  label="Full Address"
                  value={fullAddress}
                  onChange={(event) => setFullAddress(event.target.value)}
                  rows={4}
                  fullWidth
                />
                <div className="onboarding-stack">
                  <Input
                    label="Google Map URL"
                    value={googleMapUrl}
                    onChange={(event) => setGoogleMapUrl(event.target.value)}
                    fullWidth
                  />
                  <Select
                    label="Parking"
                    value={parking}
                    onChange={(event) => setParking(event.target.value)}
                    options={PARKING_OPTIONS}
                    fullWidth
                  />
                  <Checkbox
                    checked={alwaysOpen}
                    onChange={(event) => setAlwaysOpen(event.target.checked)}
                    label="24 hours open"
                  />
                </div>
              </div>
              <div className="onboarding-grid onboarding-grid--compact">
                <Input label="Latitude" value={latitude} onChange={(event) => setLatitude(event.target.value)} fullWidth />
                <Input label="Longitude" value={longitude} onChange={(event) => setLongitude(event.target.value)} fullWidth />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div className="onboarding-complete">
              <p className="onboarding-step-label">Step 4 of 4</p>
              <div className="onboarding-complete-hero">
                <div className="onboarding-complete-badge">✓</div>
              </div>
              <h1 className="onboarding-title">You&apos;re all set!</h1>
              <p className="onboarding-subtitle">
                We&apos;ve customized your experience with{" "}
                <strong>{selectedSolutions.map((item) => item.name).join(" & ") || "Jaldee"}</strong>. Your digital transformation begins today, {user?.name?.split(" ")[0] ?? "there"}.
              </p>

              <div className="onboarding-benefits">
                <div className="onboarding-benefit-card">
                  <h2>Quick Setup</h2>
                  <p>We&apos;ve pre-loaded your core services and starter settings.</p>
                </div>
                <div className="onboarding-benefit-card">
                  <h2>Priority Support</h2>
                  <p>Need help? Our team is available throughout your trial.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="onboarding-footer">
          {step < 3 ? (
            <>
              <button type="button" className="onboarding-link-button" onClick={step === 0 ? completeOnboarding : goBack}>
                {step === 0 ? "Skip for now" : "Back"}
              </button>
              <Button type="button" variant="primary" size="lg" onClick={goNext}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="onboarding-footer-copy">Takes about 3 minutes total</div>
              <Button type="button" variant="primary" size="lg" onClick={completeOnboarding}>
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
