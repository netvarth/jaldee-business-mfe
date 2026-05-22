import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Checkbox, Input, PhoneInput, Select, Textarea } from "@jaldee/design-system";
import type { PhoneInputValue } from "@jaldee/design-system";
import { useShellStore } from "../store/shellStore";
import { onboardingService } from "../services/onboardingService";
import { authService } from "../services/authService";
import { getPreferredLandingPath, getPreferredLandingPathFromProducts } from "../utils/landing";
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

const GOOGLE_MAPS_SCRIPT_ID = "jaldee-google-maps-script";

type GoogleMapsWindow = Window & {
  google?: any;
  __jaldeeGoogleMapsPromise?: Promise<void>;
};

function loadGoogleMapsScript(apiKey: string) {
  const mapsWindow = window as GoogleMapsWindow;
  if (mapsWindow.google?.maps) {
    return Promise.resolve();
  }
  if (mapsWindow.__jaldeeGoogleMapsPromise) {
    return mapsWindow.__jaldeeGoogleMapsPromise;
  }

  mapsWindow.__jaldeeGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Google Maps failed to load")), { once: true });
    document.head.appendChild(script);
  });

  return mapsWindow.__jaldeeGoogleMapsPromise;
}

function extractErrorMessage(error: unknown): string {
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
  return error instanceof Error ? error.message : "An error occurred";
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setOnboardingStatus = useShellStore((s) => s.setOnboardingStatus);
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const setAuth = useShellStore((s) => s.setAuth);
  const setAvailableLocations = useShellStore((s) => s.setAvailableLocations);
  const setLocation = useShellStore((s) => s.setLocation);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const selectedSolutions = useMemo(
    () => BUSINESS_TYPES.filter((item) => selectedBusinessTypes.includes(item.id)),
    [selectedBusinessTypes]
  );

  useEffect(() => {
    const tenantUid = account?.id;
    if (!tenantUid) return;

    let active = true;
    async function loadPrefillData() {
      setLoading(true);
      setError(null);
      try {
        const tenantRes = await onboardingService.getTenant(tenantUid);

        if (!active) return;

        // Prefill tenant
        const tenantData = tenantRes.data;
        if (tenantData) {
          if (tenantData.tenantProfile?.businessName) {
            setCompanyName(tenantData.tenantProfile.businessName);
          } else if (tenantData.tenantName) {
            setCompanyName(tenantData.tenantName);
          }

          if (tenantData.tenantProfile?.licenseName) {
            setGstin(tenantData.tenantProfile.licenseName);
          }

          const primaryNo = tenantData.tenantProfile?.primaryNumber;
          if (primaryNo && primaryNo.number) {
            const code = primaryNo.countryCode || "+91";
            const normalizedCode = code.startsWith("+") ? code : `+${code}`;
            setBusinessPhone({
              countryCode: normalizedCode,
              number: primaryNo.number,
              e164Number: `${normalizedCode}${primaryNo.number}`
            });
          }
        }

      } catch (err) {
        console.error("Failed to load prefill data", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPrefillData();

    return () => {
      active = false;
    };
  }, [account?.id]);

  const setMapLocation = useCallback((latValue: number, lngValue: number) => {
    const latText = latValue.toFixed(7);
    const lngText = lngValue.toFixed(7);
    const position = { lat: latValue, lng: lngValue };

    setLatitude(latText);
    setLongitude(lngText);
    setGoogleMapUrl(`https://www.google.com/maps?q=${latText},${lngText}`);

    markerRef.current?.setPosition(position);
    mapRef.current?.panTo(position);
  }, []);

  const applyGooglePlace = useCallback((place: any) => {
    const position = place?.geometry?.location;
    if (!position) {
      setError("Could not find that location");
      return;
    }

    setMapLocation(position.lat(), position.lng());

    if (place.formatted_address) {
      setFullAddress(place.formatted_address);
      setSearchLocation(place.formatted_address);
    }

    const postalCode = place.address_components?.find((component: any) =>
      component.types?.includes("postal_code")
    )?.long_name;
    if (postalCode) {
      setPincode(postalCode);
    }

    if (place.url) {
      setGoogleMapUrl(place.url);
    }

    setError(null);
  }, [setMapLocation]);

  useEffect(() => {
    if (step !== 2) return;
    if (!googleMapsApiKey) {
      setMapStatus("error");
      return;
    }

    let active = true;
    setMapStatus("loading");

    loadGoogleMapsScript(googleMapsApiKey)
      .then(() => {
        if (!active || !mapContainerRef.current) return;

        const mapsWindow = window as GoogleMapsWindow;
        const googleMaps = mapsWindow.google?.maps;
        if (!googleMaps) {
          throw new Error("Google Maps is unavailable");
        }

        const initialPosition = {
          lat: Number(latitude) || 10.4414775,
          lng: Number(longitude) || 76.2183557,
        };

        const map = new googleMaps.Map(mapContainerRef.current, {
          center: initialPosition,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const marker = new googleMaps.Marker({
          position: initialPosition,
          map,
          draggable: true,
        });

        map.addListener("click", (event: any) => {
          if (!event.latLng) return;
          setMapLocation(event.latLng.lat(), event.latLng.lng());
        });

        marker.addListener("dragend", (event: any) => {
          if (!event.latLng) return;
          setMapLocation(event.latLng.lat(), event.latLng.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new googleMaps.Geocoder();
        if (searchInputRef.current && googleMaps.places && !autocompleteRef.current) {
          const autocomplete = new googleMaps.places.Autocomplete(searchInputRef.current, {
            fields: ["address_components", "formatted_address", "geometry", "url"],
          });
          autocomplete.addListener("place_changed", () => {
            applyGooglePlace(autocomplete.getPlace());
          });
          autocompleteRef.current = autocomplete;
        }
        setMapStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load Google Maps", err);
        if (active) setMapStatus("error");
      });

    return () => {
      active = false;
    };
  }, [applyGooglePlace, googleMapsApiKey, setMapLocation, step]);

  async function handleLocationSearch() {
    if (!searchLocation.trim() || !geocoderRef.current) return;

    try {
      const response = await geocoderRef.current.geocode({ address: searchLocation.trim() });
      applyGooglePlace(response.results?.[0]);
    } catch (err) {
      console.error("Failed to search location", err);
      setError("Could not search location");
    }
  }

  function handleLocationSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleLocationSearch();
  }

  function handleAutoDetectLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser");
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapLocation(position.coords.latitude, position.coords.longitude);
        setLoading(false);
      },
      () => {
        setError("Could not detect your location");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function goNext() {
    setError(null);
    setStep((current) => (current < 3 ? ((current + 1) as StepIndex) : current));
  }

  function goBack() {
    setError(null);
    setStep((current) => (current > 0 ? ((current - 1) as StepIndex) : current));
  }

  async function handleBusinessSubmit() {
    if (!companyName.trim()) {
      setError("Company Name is required");
      return;
    }
    const tenantUid = account?.id;
    if (!tenantUid) {
      setError("No business context available");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onboardingService.updateTenant({
        tenantUid,
        tenantName: companyName,
        gstin,
        businessPhoneCountryCode: businessPhone.countryCode,
        businessPhoneNumber: businessPhone.number,
        email: user?.email,
      });
      const settingsRes = await onboardingService.getTenantSettings();
      const settingsData = settingsRes.data;
      if (settingsData) {
        const types: string[] = [];
        if (settingsData.health) types.push("health");
        if (settingsData.booking) types.push("bookings");
        if (settingsData.lending) types.push("lending");
        if (settingsData.ecommerce || settingsData.eCommerce) types.push("karty");

        if (types.length > 0) {
          setSelectedBusinessTypes(types);
        }
      }
      goNext();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSolutionsSubmit() {
    const tenantUid = account?.id;
    if (!tenantUid) {
      setError("No business context available");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onboardingService.updateTenantSettings({
        tenantUid,
        selectedProducts: selectedBusinessTypes,
      });
      goNext();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLocationSubmit() {
    if (!locationName.trim()) {
      setError("Location Name is required");
      return;
    }
    if (!pincode.trim()) {
      setError("Pincode is required");
      return;
    }
    if (!fullAddress.trim()) {
      setError("Full Address is required");
      return;
    }
    const tenantUid = account?.id;
    if (!tenantUid) {
      setError("No business context available");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onboardingService.createLocation({
        tenantUid,
        locationName,
        address: fullAddress,
        pincode,
        longitude,
        latitude,
        parking,
        alwaysOpen,
        googleMapUrl,
      });
      goNext();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.checkSession();
      setAuth(session.user, session.account, session.token ?? "");
      setAvailableLocations(session.locations ?? []);
      if (session.locations?.length) {
        setLocation(session.locations[0]);
      }
      setOnboardingStatus("complete");
      navigate(getPreferredLandingPath(session.account), { replace: true });
    } catch (err) {
      console.error("Session sync failed", err);
      setOnboardingStatus("complete");
      navigate(getPreferredLandingPathFromProducts(selectedBusinessTypes), { replace: true });
    } finally {
      setLoading(false);
    }
  }

  function handleSkipForNow() {
    setOnboardingStatus("complete");
    navigate("/settings", { replace: true });
  }

  function toggleBusinessType(id: string) {
    if (loading) return;
    setSelectedBusinessTypes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <div className="onboarding-page">
      <div className={`onboarding-card${step === 2 ? " onboarding-card--location" : ""}`}>
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

        <div className={`onboarding-body${step === 2 ? " onboarding-body--location" : ""}`}>
          {error ? <div className="onboarding-error">{error}</div> : null}

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
                  disabled={loading}
                />
                <div className="onboarding-grid onboarding-grid--compact">
                  <Select
                    label="Country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    options={COUNTRY_OPTIONS}
                    fullWidth
                    disabled={loading}
                  />
                  <Input
                    label="GSTIN"
                    value={gstin}
                    onChange={(event) => setGstin(event.target.value.toUpperCase())}
                    placeholder="e.g., 27AAAAA0000A1Z5"
                    hint="Optional. You can add this later when you're ready to invoice."
                    fullWidth
                    disabled={loading}
                  />
                </div>
                <PhoneInput
                  label="Business Phone"
                  value={businessPhone}
                  onChange={setBusinessPhone}
                  preferredCountries={["in"]}
                  numberPlaceholder="Enter business phone"
                  disabled={loading}
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
                      disabled={loading}
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
                  ref={searchInputRef}
                  value={searchLocation}
                  onChange={(event) => setSearchLocation(event.target.value)}
                  onKeyDown={handleLocationSearchKeyDown}
                  placeholder="Search for your location..."
                  fullWidth
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleLocationSearch}
                  disabled={loading || mapStatus !== "ready" || !searchLocation.trim()}
                >
                  Search
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={handleAutoDetectLocation} disabled={loading}>
                  Auto-detect
                </Button>
              </div>

              <div className="onboarding-map-placeholder">
                <div ref={mapContainerRef} className="onboarding-google-map" />
                {mapStatus === "loading" ? <p className="onboarding-map-message">Loading map...</p> : null}
                {mapStatus === "error" ? (
                  <p className="onboarding-map-message">Map could not be loaded. Check the Google Maps API key and domain restrictions.</p>
                ) : null}
              </div>

              <div className="onboarding-grid">
                <Input
                  label="Location Name"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  fullWidth
                  disabled={loading}
                />
                <Input
                  label="PinCode"
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value)}
                  fullWidth
                  disabled={loading}
                />
              </div>
              <div className="onboarding-grid">
                <Textarea
                  label="Full Address"
                  value={fullAddress}
                  onChange={(event) => setFullAddress(event.target.value)}
                  rows={4}
                  fullWidth
                  disabled={loading}
                />
                <div className="onboarding-stack">
                  <Input
                    label="Google Map URL"
                    value={googleMapUrl}
                    onChange={(event) => setGoogleMapUrl(event.target.value)}
                    fullWidth
                    disabled={loading}
                  />
                  <Select
                    label="Parking"
                    value={parking}
                    onChange={(event) => setParking(event.target.value)}
                    options={PARKING_OPTIONS}
                    fullWidth
                    disabled={loading}
                  />
                  <Checkbox
                    checked={alwaysOpen}
                    onChange={(event) => setAlwaysOpen(event.target.checked)}
                    label="24 hours open"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="onboarding-grid onboarding-grid--compact">
                <Input label="Latitude" value={latitude} onChange={(event) => setLatitude(event.target.value)} fullWidth disabled={loading} />
                <Input label="Longitude" value={longitude} onChange={(event) => setLongitude(event.target.value)} fullWidth disabled={loading} />
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

        <div className={`onboarding-footer${step === 2 ? " onboarding-footer--location" : ""}`}>
          {step < 3 ? (
            <>
              <button
                type="button"
                className="onboarding-link-button"
                onClick={step === 0 ? handleSkipForNow : goBack}
                disabled={loading}
              >
                {step === 0 ? "Skip for now" : "Back"}
              </button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={
                  step === 0
                    ? handleBusinessSubmit
                    : step === 1
                    ? handleSolutionsSubmit
                    : handleLocationSubmit
                }
                loading={loading}
                disabled={loading}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="onboarding-footer-copy">Takes about 3 minutes total</div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={completeOnboarding}
                loading={loading}
                disabled={loading}
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
