import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Badge, Button, Checkbox, Dialog, DialogFooter, EmptyState, Input, PageHeader, SectionCard, Select, Switch, Textarea } from "@jaldee/design-system";
import { apiClient } from "@jaldee/api-client";
import { useLocation, useNavigate } from "react-router-dom";
import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../services/serviceUrls";
import { getTenantSettingsForShell, updateTenantSettingsForShell } from "../services/authService";
import { useShellStore } from "../store/shellStore";
import { hexToHSL } from "../theme/colorUtils";
import "./SettingsPage.css";

type SettingsNavItem = {
  key: string;
  label: string;
  icon: string;
  group: "GENERAL" | "BUSINESS" | "ADVANCED";
};

const NAV_ITEMS: SettingsNavItem[] = [
  { key: "company", label: "Company", icon: "building", group: "GENERAL" },
  { key: "branding", label: "Branding", icon: "palette", group: "GENERAL" },
  { key: "locations", label: "Branches & Locations", icon: "mapPin", group: "GENERAL" },
  { key: "subscriptions", label: "Subscription & Products", icon: "box", group: "GENERAL" },
  { key: "billing-tax", label: "Billing & Tax", icon: "creditCard", group: "BUSINESS" },
  { key: "communications", label: "Communications", icon: "messageSquare", group: "BUSINESS" },
  { key: "team-access", label: "Team & Access", icon: "users", group: "BUSINESS" },
  { key: "integrations", label: "Integrations", icon: "share2", group: "BUSINESS" },
  { key: "data-privacy", label: "Data & Privacy", icon: "shield", group: "ADVANCED" },
  { key: "developer", label: "Developer", icon: "code2", group: "ADVANCED" },
];

type ProductCardItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  enabled: boolean;
  statusLabel: string;
  statusMeta: string;
  actionLabel?: string;
  locked?: boolean;
};

type UsageItem = {
  id: string;
  label: string;
  value: string;
  total: string;
  progress: number;
};

type TenantSettingsRecord = Record<string, unknown>;

type LocationRow = {
  id: string;
  name: string;
  code: string;
  address: string;
  status: string;
  timezone: string;
  isBase: boolean;
};

type LocationFormState = {
  locationName: string;
  address: string;
  pincode: string;
  longitude: string;
  latitude: string;
  parking: string;
  alwaysOpen: boolean;
  googleMapUrl: string;
};

const EMPTY_LOCATION_FORM: LocationFormState = {
  locationName: "",
  address: "",
  pincode: "",
  longitude: "76.2183557",
  latitude: "10.4414775",
  parking: "none",
  alwaysOpen: true,
  googleMapUrl: "https://www.google.com/maps?q=10.4414775,76.2183557",
};

const INDIA_COUNTRY = {
  countryCode: "IN",
  name: "India",
  status: "Enabled",
  currency: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "INR",
    status: "Enabled",
  },
} as const;

const PARKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "street", label: "Street Parking" },
  { value: "private", label: "Private Parking" },
  { value: "valet", label: "Valet" },
];

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

const CORE_PRODUCTS: ProductCardItem[] = [
  {
    id: "booking",
    name: "Jaldee Booking",
    description: "Online slot booking and slot management system",
    icon: "calendar",
    accent: "blue",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "health",
    name: "Jaldee Health",
    description: "EMR, Pharmacy, Lab, and Patient Management",
    icon: "stethoscope",
    accent: "green",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Enabled since undefined",
    actionLabel: "Configure",
  },
  {
    id: "karty",
    name: "Karty",
    description: "Retail POS, Inventory, and Omnichannel Commerce",
    icon: "bag",
    accent: "orange",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "lending",
    name: "Jaldee Lending",
    description: "Loan Origination and Lifecycle Management (LoM)",
    icon: "wallet",
    accent: "violet",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
];

const ADD_ON_MODULES: ProductCardItem[] = [
  {
    id: "membership",
    name: "Membership & Loyalty",
    description: "Subscription plans, point systems, and rewards",
    icon: "crown",
    accent: "amber",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "leads",
    name: "Lead Suite",
    description: "Sales pipeline and lead conversion tracking",
    icon: "target",
    accent: "pink",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "tasks",
    name: "Task Manager",
    description: "Workflow automation and staff assignments",
    icon: "checkSquare",
    accent: "indigo",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
  {
    id: "donations",
    name: "Donation Manager",
    description: "Donation tracking and 80G receipting",
    icon: "heart",
    accent: "rose",
    enabled: false,
    statusLabel: "Available",
    statusMeta: "Click to enable",
  },
];

const PLATFORM_SERVICES: ProductCardItem[] = [
  {
    id: "finance",
    name: "Jaldee Pay & Finance",
    description: "GST Invoicing, Payments, and Billing",
    icon: "currency",
    accent: "slate",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "comms",
    name: "Smart Comms",
    description: "WhatsApp, SMS, and Email delivery engine",
    icon: "bell",
    accent: "blue",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "insights",
    name: "Jaldee Insights",
    description: "Unified cross-product data and analytics",
    icon: "chartBars",
    accent: "violet",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
  {
    id: "drive",
    name: "Jaldee Drive",
    description: "Secure cloud storage for all documents",
    icon: "folder",
    accent: "amber",
    enabled: true,
    statusLabel: "Active",
    statusMeta: "Included in plan",
    actionLabel: "Configure",
    locked: true,
  },
];

const USAGE_ITEMS: UsageItem[] = [
  { id: "bookings", label: "Bookings", value: "247", total: "500", progress: 49 },
  { id: "sms", label: "SMS Sent", value: "1832", total: "5000", progress: 37 },
  { id: "storage", label: "Storage", value: "2.1", total: "10GB", progress: 21 },
];

const SETTINGS_ROUTE_ALIASES: Record<string, string> = {
  "branches-locations": "locations",
  "subscription-products": "subscriptions",
};

function toRecord(value: unknown): TenantSettingsRecord {
  return typeof value === "object" && value !== null ? (value as TenantSettingsRecord) : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "enabled", "active", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "disabled", "inactive", "no"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function readProductFlag(settings: TenantSettingsRecord, id: string, fallback: boolean) {
  const keyMap: Record<string, string[]> = {
    booking: ["booking", "bookingEnabled", "bookingStatus"],
    health: ["health", "healthCrm", "healthCrmEnabled", "healthCrmStatus"],
    karty: ["karty", "eCommerce", "ecommerce", "kartyEnabled", "kartyStatus"],
    lending: ["lending", "lendingCrm", "lendingCrmEnabled", "lendingCrmStatus"],
    membership: ["membership"],
    leads: ["lead"],
    tasks: ["task"],
    donations: ["donation"],
  };

  const keys = keyMap[id] ?? [id];
  for (const key of keys) {
    if (key in settings) {
      return readBoolean(settings[key], fallback);
    }
  }

  return fallback;
}

function normalizeParkingType(value: string) {
  switch (value) {
    case "street":
      return "STREET";
    case "private":
      return "PRIVATE";
    case "valet":
      return "VALET";
    default:
      return "NONE";
  }
}

function readGoogleAddressComponent(place: any, ...types: string[]) {
  const component = place?.address_components?.find((item: any) =>
    types.some((type) => item.types?.includes(type)),
  );
  return typeof component?.long_name === "string" ? component.long_name : "";
}

function deriveLocationName(place: any) {
  if (typeof place?.name === "string" && place.name.trim()) {
    return place.name.trim();
  }

  const componentName = readGoogleAddressComponent(
    place,
    "premise",
    "establishment",
    "point_of_interest",
    "route",
    "sublocality",
    "locality",
  );
  if (componentName) {
    return componentName;
  }

  if (typeof place?.formatted_address === "string") {
    return place.formatted_address.split(",")[0]?.trim() ?? "";
  }

  return "";
}

function applyProductSetting(item: ProductCardItem, settings: TenantSettingsRecord): ProductCardItem {
  const enabled = readProductFlag(settings, item.id, item.enabled);
  return {
    ...item,
    enabled,
    statusLabel: enabled ? "Active" : "Available",
    statusMeta: enabled ? (item.locked ? "Included in plan" : "Enabled for this workspace") : "Click to enable",
    actionLabel: enabled ? item.actionLabel ?? "Configure" : undefined,
  };
}

function extractCollection(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  const record = toRecord(input);
  if (Array.isArray(record.content)) {
    return record.content;
  }
  if (Array.isArray(record.data)) {
    return record.data;
  }
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.locations)) {
    return record.locations;
  }

  const embedded = toRecord(record._embedded);
  const embeddedList = Object.values(embedded).find(Array.isArray);
  return Array.isArray(embeddedList) ? embeddedList : [];
}

function normalizeLocations(input: unknown): LocationRow[] {
  return extractCollection(input).map((value, index) => {
    if (typeof value === "string") {
      return {
        id: value,
        name: value,
        code: value,
        address: "",
        status: "Enabled",
        timezone: "",
        isBase: index === 0,
      };
    }

    const record = toRecord(value);
    const id = readString(record.uid, record.locationUid, record.id, record.locationId) || `loc-${index + 1}`;
    return {
      id,
      name: readString(record.place, record.name, record.locationName, record.branchName, record.displayName) || `Location ${index + 1}`,
      code: readString(record.code, record.locationCode, record.branchCode, record.shortName) || `LOC${index + 1}`,
      address: readString(record.address, record.displayAddress, record.formattedAddress),
      status: readString(record.status, record.locationStatus) || "Enabled",
      timezone: readString(record.timezone, record.defaultTimezone),
      isBase: readBoolean(record.baseLocation, false) || readBoolean(record.isBase, false),
    };
  });
}

function formatPlanName(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildLicensedProductsFromSelection(selectedCoreProducts: Record<string, boolean>) {
  const products: Array<"health" | "bookings" | "karty" | "finance" | "lending"> = [];

  if (selectedCoreProducts.health) {
    products.push("health");
  }
  if (selectedCoreProducts.booking) {
    products.push("bookings");
  }
  products.push("finance");
  if (selectedCoreProducts.karty) {
    products.push("karty");
  }
  if (selectedCoreProducts.lending) {
    products.push("lending");
  }

  return products;
}

function buildEnabledModulesFromSelection(currentModules: string[] | undefined, selectedAddOns: Record<string, boolean>) {
  const modules = new Set(currentModules ?? []);
  modules.add("customers");
  modules.add("drive");
  modules.add("users");
  modules.add("reports");
  modules.add("settings");
  modules.add("finance");

  for (const moduleKey of ["membership", "leads", "tasks"] as const) {
    if (selectedAddOns[moduleKey]) {
      modules.add(moduleKey);
    } else {
      modules.delete(moduleKey);
    }
  }

  return Array.from(modules);
}

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const account = useShellStore((state) => state.account);
  const setAccount = useShellStore((state) => state.setAccount);
  const setAvailableLocations = useShellStore((state) => state.setAvailableLocations);
  const setActiveLocation = useShellStore((state) => state.setLocation);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const [tenantSettings, setTenantSettings] = useState<TenantSettingsRecord | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [createLocationOpen, setCreateLocationOpen] = useState(false);
  const [locationForm, setLocationForm] = useState<LocationFormState>(EMPTY_LOCATION_FORM);
  const [searchLocation, setSearchLocation] = useState("");
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [companyName, setCompanyName] = useState(account?.name ?? "Jaldee Business");
  const [displayName, setDisplayName] = useState(account?.name ?? "Jaldee Business");
  const [industry, setIndustry] = useState(account?.domain ?? "healthcare");
  const [legalEntityName, setLegalEntityName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [fiscalYearStart, setFiscalYearStart] = useState("April");
  const [autoLockTransactions, setAutoLockTransactions] = useState(false);
  const [coreProducts, setCoreProducts] = useState(CORE_PRODUCTS);
  const [addOnModules, setAddOnModules] = useState(ADD_ON_MODULES);

  // Theme & Branding
  const [brandColor, setBrandColor] = useState(account?.theme?.primaryColor ?? "#5B21D1");
  const [logoUrl, setLogoUrl] = useState(account?.theme?.logoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(account?.theme?.faviconUrl ?? "");

  // Personal Preferences
  const userPreferences = useShellStore((state) => state.userPreferences);
  const setUserPreferences = useShellStore((state) => state.setUserPreferences);
  const [prefTheme, setPrefTheme] = useState(userPreferences?.theme ?? "light");
  const [prefFontSize, setPrefFontSize] = useState(userPreferences?.fontSize ?? "md");

  // White Label (Enterprise only)
  const [platformName, setPlatformName] = useState(account?.whiteLabel?.platformName ?? "");
  const [customDomain, setCustomDomain] = useState(account?.whiteLabel?.customDomain ?? "");
  const [hideBranding, setHideBranding] = useState(account?.whiteLabel?.hideJaldeeBranding ?? false);
  const [customCss, setCustomCss] = useState(account?.whiteLabel?.customCss ?? "");

  useEffect(() => {
    if (account) {
      setBrandColor(account.theme?.primaryColor ?? "#5B21D1");
      setLogoUrl(account.theme?.logoUrl ?? "");
      setFaviconUrl(account.theme?.faviconUrl ?? "");
      setPlatformName(account.whiteLabel?.platformName ?? "");
      setCustomDomain(account.whiteLabel?.customDomain ?? "");
      setHideBranding(account.whiteLabel?.hideJaldeeBranding ?? false);
      setCustomCss(account.whiteLabel?.customCss ?? "");
    }
  }, [account]);

  useEffect(() => {
    if (userPreferences) {
      setPrefTheme(userPreferences.theme);
      setPrefFontSize(userPreferences.fontSize);
    }
  }, [userPreferences]);

  const activeKey = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const routeKey = parts[1] ?? "company";
    return SETTINGS_ROUTE_ALIASES[routeKey] ?? routeKey;
  }, [location.pathname]);

  const activeItem = NAV_ITEMS.find((item) => item.key === activeKey) ?? NAV_ITEMS[0];
  const grouped = useMemo(() => {
    return {
      GENERAL: NAV_ITEMS.filter((item) => item.group === "GENERAL"),
      BUSINESS: NAV_ITEMS.filter((item) => item.group === "BUSINESS"),
      ADVANCED: NAV_ITEMS.filter((item) => item.group === "ADVANCED"),
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/settings" || location.pathname === "/settings/") {
      navigate("/settings/company", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    let alive = true;

    async function loadTenantSettings() {
      setSettingsLoading(true);
      setSettingsError(null);

      try {
        const response = await getTenantSettingsForShell();
        if (!alive) {
          return;
        }

        const data = toRecord(response);
        const profile = toRecord(data.tenantProfile);
        setTenantSettings(data);
        setCompanyName(readString(data.tenantName, data.businessName, profile.businessName, account?.name) || "Jaldee Business");
        setDisplayName(readString(data.brandName, data.displayName, data.tenantName, account?.name) || "Jaldee Business");
        setIndustry(readString(data.industry, data.domain, account?.domain) || "healthcare");
        setLegalEntityName(readString(data.legalEntityName, profile.legalEntityName, profile.licenseName) || "");
        setGstin(readString(data.gstin, data.gstIn, profile.gstin, profile.licenseName) || "");
        setPan(readString(data.pan, profile.pan) || "");
        setRegisteredAddress(readString(data.registeredAddress, data.address, profile.address) || "");
        setCurrency(readString(data.currency, data.defaultCurrency, data.locationCurrency) || "INR");
        setTimezone(readString(data.timezone, data.defaultTimezone) || "Asia/Kolkata");
        setDateFormat(readString(data.dateFormat) || "DD/MM/YYYY");
        setFiscalYearStart(readString(data.fiscalYearStart) || "April");
        setAutoLockTransactions(readBoolean(data.autoLockTransactions, false));
        setCoreProducts((current) =>
          current.map((item) => applyProductSetting(item, data)),
        );
        setAddOnModules((current) =>
          current.map((item) => applyProductSetting(item, data)),
        );
      } catch {
        if (alive) {
          setSettingsError("Unable to load tenant settings.");
        }
      } finally {
        if (alive) {
          setSettingsLoading(false);
        }
      }
    }

    void loadTenantSettings();

    return () => {
      alive = false;
    };
  }, [account?.domain, account?.name]);

  useEffect(() => {
    if (activeKey !== "locations") {
      return;
    }

    void loadLocations();
  }, [activeKey]);

  const setMapLocation = useCallback((latValue: number, lngValue: number) => {
    const latText = latValue.toFixed(7);
    const lngText = lngValue.toFixed(7);
    const position = { lat: latValue, lng: lngValue };

    setLocationForm((current) => ({
      ...current,
      latitude: latText,
      longitude: lngText,
      googleMapUrl: `https://www.google.com/maps?q=${latText},${lngText}`,
    }));

    markerRef.current?.setPosition(position);
    mapRef.current?.setCenter(position);
    mapRef.current?.setZoom(16);
  }, []);

  const applyGooglePlace = useCallback((place: any) => {
    const position = place?.geometry?.location;
    if (!position) {
      setLocationsError("Could not find that location.");
      return;
    }

    const latValue = typeof position.lat === "function" ? position.lat() : Number(position.lat);
    const lngValue = typeof position.lng === "function" ? position.lng() : Number(position.lng);
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      setLocationsError("Could not read that location's map coordinates.");
      return;
    }

    setMapLocation(latValue, lngValue);

    setLocationForm((current) => {
      const postalCode = place.address_components?.find((component: any) =>
        component.types?.includes("postal_code"),
      )?.long_name;
      const nextLocationName = deriveLocationName(place);

      return {
        ...current,
        locationName: nextLocationName || current.locationName,
        address: place.formatted_address || current.address,
        pincode: postalCode || current.pincode,
        googleMapUrl: place.url || `https://www.google.com/maps?q=${latValue.toFixed(7)},${lngValue.toFixed(7)}`,
        latitude: latValue.toFixed(7),
        longitude: lngValue.toFixed(7),
      };
    });

    if (place.formatted_address) {
      setSearchLocation(place.formatted_address);
    }

    setLocationsError(null);
  }, [setMapLocation]);

  const selectMapPosition = useCallback((latValue: number, lngValue: number) => {
    setMapLocation(latValue, lngValue);

    const geocoder = geocoderRef.current;
    if (!geocoder) {
      return;
    }

    geocoder.geocode({ location: { lat: latValue, lng: lngValue } }, (results: any[] | null, status: string) => {
      if (status === "OK" && results?.[0]) {
        applyGooglePlace(results[0]);
      }
    });
  }, [applyGooglePlace, setMapLocation]);

  useEffect(() => {
    if (!createLocationOpen) {
      return;
    }
    if (!googleMapsApiKey) {
      setMapStatus("error");
      return;
    }

    let active = true;
    setMapStatus("loading");

    loadGoogleMapsScript(googleMapsApiKey)
      .then(() => {
        if (!active || !mapContainerRef.current) {
          return;
        }

        const mapsWindow = window as GoogleMapsWindow;
        const googleMaps = mapsWindow.google?.maps;
        if (!googleMaps) {
          throw new Error("Google Maps is unavailable");
        }

        const initialPosition = {
          lat: Number(locationForm.latitude) || 10.4414775,
          lng: Number(locationForm.longitude) || 76.2183557,
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
          if (!event.latLng) {
            return;
          }
          selectMapPosition(event.latLng.lat(), event.latLng.lng());
        });

        marker.addListener("dragend", (event: any) => {
          if (!event.latLng) {
            return;
          }
          selectMapPosition(event.latLng.lat(), event.latLng.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new googleMaps.Geocoder();
        window.requestAnimationFrame(() => {
          googleMaps.event.trigger(map, "resize");
          map.setCenter(initialPosition);
        });
        if (searchInputRef.current && googleMaps.places && !autocompleteRef.current) {
          const autocomplete = new googleMaps.places.Autocomplete(searchInputRef.current, {
            fields: ["address_components", "formatted_address", "geometry", "name", "url"],
          });
          autocomplete.addListener("place_changed", () => {
            applyGooglePlace(autocomplete.getPlace());
          });
          autocompleteRef.current = autocomplete;
        }
        setMapStatus("ready");
      })
      .catch(() => {
        if (active) {
          setMapStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [applyGooglePlace, createLocationOpen, googleMapsApiKey, selectMapPosition, setMapLocation]);

  function goTo(key: string) {
    navigate(`/settings/${key}`);
  }

  function openCreateLocationDialog() {
    setLocationsError(null);
    setLocationForm(EMPTY_LOCATION_FORM);
    setSearchLocation("");
    setMapStatus("idle");
    mapRef.current = null;
    markerRef.current = null;
    geocoderRef.current = null;
    autocompleteRef.current = null;
    setCreateLocationOpen(true);
  }

  function closeCreateLocationDialog() {
    if (locationSaving) {
      return;
    }
    setCreateLocationOpen(false);
  }

  function updateLocationForm<K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) {
    setLocationForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLocationSearch() {
    const query = searchLocation.trim();
    if (!query) {
      return;
    }

    try {
      if (!googleMapsApiKey) {
        setLocationsError("Google Maps API key is not configured.");
        return;
      }

      await loadGoogleMapsScript(googleMapsApiKey);
      const mapsWindow = window as GoogleMapsWindow;
      const googleMaps = mapsWindow.google?.maps;
      if (!googleMaps) {
        throw new Error("Google Maps is unavailable");
      }

      const geocoder = geocoderRef.current ?? new googleMaps.Geocoder();
      geocoderRef.current = geocoder;
      const place = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ address: query }, (results: any[] | null, status: string) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0]);
            return;
          }
          reject(new Error(status || "ZERO_RESULTS"));
        });
      });
      applyGooglePlace(place);
    } catch {
      setLocationsError("Could not search location.");
    }
  }

  function handleLocationSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    void handleLocationSearch();
  }

  function handleAutoDetectLocation() {
    if (!navigator.geolocation) {
      setLocationsError("Location access is not available in this browser.");
      return;
    }

    setLocationDetecting(true);
    setLocationsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapLocation(position.coords.latitude, position.coords.longitude);
        setLocationDetecting(false);
      },
      () => {
        setLocationsError("Could not detect your location.");
        setLocationDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function loadLocations() {
    setLocationsLoading(true);
    setLocationsError(null);

    try {
      const response = await apiClient.get<unknown>(
        buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.search),
        { params: { page: 0, size: 100 } },
      );
      const nextLocations = normalizeLocations(response.data);
      setLocations(nextLocations);
      setAvailableLocations(
        nextLocations.map((item) => ({
          id: item.id,
          uid: item.id,
          name: item.name,
          code: item.code,
        })),
      );
      const baseLocation = nextLocations.find((item) => item.isBase) ?? nextLocations[0];
      if (baseLocation) {
        setActiveLocation({
          id: baseLocation.id,
          uid: baseLocation.id,
          name: baseLocation.name,
          code: baseLocation.code,
        });
      }
    } catch {
      setLocationsError("Unable to load locations.");
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleCreateLocation() {
    const tenantUid = account?.tenantUid ?? account?.id;
    const locationName = locationForm.locationName.trim();
    const address = locationForm.address.trim();
    const pincode = locationForm.pincode.trim();

    if (!tenantUid) {
      setLocationsError("Unable to create location because tenant details are missing.");
      return;
    }

    if (!locationName || !address || !pincode) {
      setLocationsError("Location name, address, and pincode are required.");
      return;
    }

    setLocationSaving(true);
    setLocationsError(null);

    try {
      await apiClient.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.create), {
        tenantUid,
        place: locationName,
        address,
        pincode,
        longitude: locationForm.longitude.trim(),
        latitude: locationForm.latitude.trim(),
        status: "Enabled",
        parkingType: normalizeParkingType(locationForm.parking),
        open24Hours: locationForm.alwaysOpen,
        googleMapUrl: locationForm.googleMapUrl.trim(),
        locationType: "GOOGLE_MAP",
        locationCurrency: currency,
        timezone,
        baseLocation: locations.length === 0,
        country: INDIA_COUNTRY,
      });
      setCreateLocationOpen(false);
      setLocationForm(EMPTY_LOCATION_FORM);
      await loadLocations();
    } catch {
      setLocationsError("Unable to create location.");
    } finally {
      setLocationSaving(false);
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    setSettingsError(null);

    if (activeKey === "branding") {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        setUserPreferences({ theme: prefTheme, fontSize: prefFontSize });
        
        if (account) {
          setAccount({
            ...account,
            theme: {
              primaryColor: brandColor,
              logoUrl,
              faviconUrl: faviconUrl || undefined,
            },
            whiteLabel: {
              platformName: platformName || undefined,
              customDomain: customDomain || undefined,
              hideJaldeeBranding: hideBranding,
              customCss: customCss || undefined,
            },
          });
        }
      } catch {
        setSettingsError("Unable to save branding settings.");
      } finally {
        setSettingsSaving(false);
      }
      return;
    }

    const selectedCoreProducts = Object.fromEntries(coreProducts.map((item) => [item.id, item.enabled]));
    const selectedAddOns = Object.fromEntries(addOnModules.map((item) => [item.id, item.enabled]));
    const payload = {
      finance: true,
      booking: Boolean(selectedCoreProducts.booking),
      health: Boolean(selectedCoreProducts.health),
      eCommerce: Boolean(selectedCoreProducts.karty),
      lending: Boolean(selectedCoreProducts.lending),
      membership: Boolean(selectedAddOns.membership),
      lead: Boolean(selectedAddOns.leads),
      task: Boolean(selectedAddOns.tasks),
      donation: Boolean(selectedAddOns.donations),
    };

    try {
      const response = await updateTenantSettingsForShell(payload);
      setTenantSettings(toRecord(response) || payload);
      if (account) {
        setAccount({
          ...account,
          licensedProducts: buildLicensedProductsFromSelection(selectedCoreProducts),
          enabledModules: buildEnabledModulesFromSelection(account.enabledModules, selectedAddOns),
        });
      }
    } catch {
      setSettingsError("Unable to save tenant settings.");
    } finally {
      setSettingsSaving(false);
    }
  }

  function toggleCoreProduct(id: string, enabled: boolean) {
    setCoreProducts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled,
              statusLabel: enabled ? "Active" : "Available",
              statusMeta: enabled ? "Enabled since today" : "Click to enable",
              actionLabel: enabled ? "Configure" : undefined,
            }
          : item,
      ),
    );
  }

  function toggleAddOnModule(id: string, enabled: boolean) {
    setAddOnModules((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled,
              statusLabel: enabled ? "Active" : "Available",
              statusMeta: enabled ? "Enabled for this workspace" : "Click to enable",
              actionLabel: enabled ? "Configure" : undefined,
            }
          : item,
      ),
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page__content">
        <PageHeader
          title={activeItem.label}
          subtitle={activeItem.key === "subscriptions" ? `Manage your plan and the products, modules, and services enabled for ${displayName}` : activeItem.key === "locations" ? "Manage branch locations and operating defaults" : "Your business profile and operating defaults"}
          actions={
            <Button
              id={activeItem.key === "locations" ? "settings-locations-create-button" : "settings-save-button"}
              data-testid={activeItem.key === "locations" ? "settings-locations-create-button" : "settings-save-button"}
              variant="primary"
              className="settings-save-button"
              onClick={activeItem.key === "locations" ? openCreateLocationDialog : handleSaveSettings}
              disabled={settingsSaving || settingsLoading || locationsLoading || locationSaving}
            >
              <ActionGlyph kind={activeItem.key === "locations" ? "add" : "save"} />
              {activeItem.key === "locations" ? "Create Location" : settingsSaving ? "Saving" : "Save Changes"}
            </Button>
          }
          className="settings-page__header"
        />

        {settingsError || locationsError ? (
          <SectionCard className="settings-card settings-alert-card">
            <p className="settings-alert-card__copy">{settingsError ?? locationsError}</p>
          </SectionCard>
        ) : null}

        {activeItem.key === "company" ? (
          <div className="settings-page__cards">
            <SectionCard className="settings-card settings-card--company">
              <CardHeading icon="building" title="Profile" subtitle="Public information about your business" />
              <div className="settings-form-grid settings-form-grid--two">
                <Input label="Company Name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                <div>
                  <Input label="Display Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  <p className="settings-field-note">Shown on invoices and receipts</p>
                </div>
                <div className="settings-field-span">
                  <Select
                    label="Industry"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    options={[
                      { value: "healthcare", label: "healthcare" },
                      { value: "retail", label: "retail" },
                      { value: "services", label: "services" },
                    ]}
                  />
                </div>
              </div>

              <div className="settings-logo-row">
                <div className="settings-logo-uploader">
                  <ActionGlyph kind="upload" className="settings-logo-uploader__icon" />
                  <span>UPLOAD</span>
                </div>
                <div className="settings-logo-copy">
                  <p className="settings-logo-copy__title">Change your business logo</p>
                  <p className="settings-logo-copy__meta">Square images work best. Max 2MB, PNG or JPG.</p>
                  <button type="button" id="settings-company-remove-logo" data-testid="settings-company-remove-logo" className="settings-link-danger">Remove logo</button>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <CardHeading icon="scale" title="Legal & Tax" subtitle="Government registrations and tax compliance" />
              <div className="settings-form-grid settings-form-grid--two">
                <Input label="Legal Entity Name" value={legalEntityName} onChange={(event) => setLegalEntityName(event.target.value)} />
                <Input label="GSTIN" value={gstin} onChange={(event) => setGstin(event.target.value)} />
                <Input label="PAN" value={pan} onChange={(event) => setPan(event.target.value)} />
                <div />
                <div className="settings-field-span settings-field-span--full">
                  <Input label="Registered Address" value={registeredAddress} onChange={(event) => setRegisteredAddress(event.target.value)} />
                  <p className="settings-field-note">This address appears on all GST invoices</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <CardHeading icon="slidersHorizontal" title="Operating Defaults" subtitle="Default regional and time settings" />
              <div className="settings-form-grid settings-form-grid--four">
                <Select label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} options={[{ value: "INR", label: "INR" }]} />
                <Select
                  label="Timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  options={[{ value: "Asia/Kolkata", label: "Asia/Kolkata" }]}
                />
                <Select
                  label="Date Format"
                  value={dateFormat}
                  onChange={(event) => setDateFormat(event.target.value)}
                  options={[{ value: "DD/MM/YYYY", label: "DD/MM/YYYY" }]}
                />
                <Select
                  label="Fiscal Year Start"
                  value={fiscalYearStart}
                  onChange={(event) => setFiscalYearStart(event.target.value)}
                  options={[{ value: "April", label: "April" }]}
                />
              </div>

              <div className="settings-inline-check">
                <Checkbox checked={autoLockTransactions} onChange={(event) => setAutoLockTransactions(event.target.checked)} />
                <div>
                  <div className="settings-inline-check__title">Auto-lock transactions</div>
                  <div className="settings-inline-check__copy">Automatically lock invoices and payments after the month-end to prevent accidental changes.</div>
                </div>
              </div>
            </SectionCard>

            <div className="settings-danger">
              <div className="settings-danger__divider" />
              <div className="settings-danger__label">DANGER ZONE</div>
              <div className="settings-danger__divider" />
            </div>

            <div className="settings-danger-grid">
              <DangerTile icon="download" title="Export Business Data" description="Download a full archive of your tenant data (JSON/CSV)." />
              <DangerTile icon="trash2" title="Delete Tenant Account" description={`Permanently erase all data for ${displayName}.`} />
            </div>
          </div>
        ) : activeItem.key === "locations" ? (
          <div className="settings-page__cards">
            <SectionCard className="settings-card">
              <CardHeading icon="mapPin" title="Locations" subtitle="Tenant locations from the base service" />
              {locationsLoading ? (
                <div className="settings-placeholder">
                  <p className="settings-placeholder__title">Loading locations</p>
                  <p className="settings-placeholder__copy">Fetching tenant location records.</p>
                </div>
              ) : locations.length > 0 ? (
                <div className="settings-location-grid">
                  {locations.map((item) => (
                    <div key={item.id} className="settings-location-card">
                      <div className="settings-location-card__top">
                        <div>
                          <h3>{item.name}</h3>
                          <p>{item.code}</p>
                        </div>
                        <div className="settings-location-card__badges">
                          {item.isBase ? <Badge variant="info">BASE</Badge> : null}
                          <Badge variant={item.status.toLowerCase() === "enabled" || item.status.toLowerCase() === "active" ? "success" : "neutral"}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="settings-location-card__meta">
                        <span>{item.address || "No address available"}</span>
                        <span>{item.timezone || timezone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div data-testid="settings-locations-empty-state" data-state="empty" className="settings-empty-state">
                  <EmptyState
                    icon={<NavIcon name="mapPin" />}
                    title="No locations added"
                    description="Create your first branch or service location to start assigning work to a place."
                    action={
                      <Button
                        id="settings-locations-empty-create-button"
                        data-testid="settings-locations-empty-create-button"
                        variant="primary"
                        className="settings-location-create-button"
                        onClick={openCreateLocationDialog}
                      >
                        <ActionGlyph kind="add" />
                        Create Location
                      </Button>
                    }
                  />
                </div>
              )}
            </SectionCard>
          </div>
        ) : activeItem.key === "subscriptions" ? (
          <div className="settings-page__cards">
            <SectionCard className="settings-card">
              <div className="settings-plan-card">
                <div>
                  <h3 className="settings-plan-card__title">{formatPlanName(readString(tenantSettings?.plan, account?.plan) || "growth")} Plan</h3>
                  <p className="settings-plan-card__price">Rs. 4,999 per month, billed annually</p>
                  <div className="settings-plan-card__meta">
                    <NavIcon name="calendar" className="settings-plan-card__meta-icon" />
                    <span>Next billing: 15 December 2026</span>
                  </div>
                </div>
                <div className="settings-plan-card__actions">
                  <Button variant="primary">Upgrade Plan</Button>
                  <button type="button" id="settings-billing-history-button" data-testid="settings-billing-history-button" className="settings-link-button">
                    <NavIcon name="historyClock" className="settings-link-button__icon" />
                    <span>View billing history</span>
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Core Products</h3>
                  <Badge variant="info">TIER 4</Badge>
                </div>
                <p>Business applications you enable based on your use case. Toggle on to provision and start using.</p>
              </div>
              <div className="settings-product-grid">
                {coreProducts.map((item) => (
                  <ProductCard key={item.id} item={item} onToggle={toggleCoreProduct} />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Add-on Modules</h3>
                  <Badge variant="info">TIER 3</Badge>
                </div>
                <p>Capabilities that work across your core products. Enable to extend your core products with sales, loyalty, and workflow features.</p>
              </div>
              <div className="settings-product-grid">
                {addOnModules.map((item) => (
                  <ProductCard key={item.id} item={item} onToggle={toggleAddOnModule} />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-block-header">
                <div className="settings-block-header__title">
                  <h3>Platform Services</h3>
                  <Badge variant="info">TIER 2</Badge>
                </div>
                <p>Foundation services included with every plan. Some are always on; others are optional.</p>
              </div>
              <div className="settings-product-grid">
                {PLATFORM_SERVICES.map((item) => (
                  <ProductCard key={item.id} item={item} readOnly />
                ))}
              </div>
            </SectionCard>

            <SectionCard className="settings-card">
              <div className="settings-usage-header">
                <h3>Usage This Month</h3>
              </div>
              <div className="settings-usage-grid">
                {USAGE_ITEMS.map((item) => (
                  <UsageCard key={item.id} item={item} />
                ))}
              </div>
              <button type="button" id="settings-usage-report-button" data-testid="settings-usage-report-button" className="settings-usage-link">
                <span>View detailed usage report</span>
                <NavIcon name="arrowRight" className="settings-usage-link__icon" />
              </button>
            </SectionCard>
          </div>
        ) : activeItem.key === "branding" ? (
          <div className="settings-page__cards">
            {/* Brand Identity Card */}
            <SectionCard className="settings-card">
              <CardHeading icon="palette" title="Brand Identity" subtitle="Customize the primary brand color, logo, and browser icons for your account." />
              <div className="settings-form-grid settings-form-grid--two">
                <div>
                  <label className="ds-form-label">Primary Brand Color</label>
                  <p className="settings-field-note" style={{ marginBottom: "12px" }}>Used for primary buttons, active link states, and focus states.</p>
                  
                  {/* Preset Colors */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    {[
                      { hex: "#5B21D1", label: "Purple (Default)" },
                      { hex: "#0D9488", label: "Teal" },
                      { hex: "#2563EB", label: "Blue" },
                      { hex: "#EA580C", label: "Orange" },
                      { hex: "#059669", label: "Green" },
                      { hex: "#6366F1", label: "Indigo" },
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.label}
                        onClick={() => setBrandColor(preset.hex)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: preset.hex,
                          border: brandColor === preset.hex ? "3px solid #000" : "1px solid rgba(0,0,0,0.15)",
                          cursor: "pointer",
                          transform: brandColor === preset.hex ? "scale(1.1)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Custom Hex Picker */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      style={{
                        width: "42px",
                        height: "42px",
                        padding: "0",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    />
                    <Input
                      placeholder="#5B21D1"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      style={{ maxWidth: "120px" }}
                    />
                  </div>
                </div>

                {/* Theme Preview Box */}
                <div style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "var(--color-surface-alt)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--color-text-secondary)" }}>LIVE PREVIEW</div>
                  
                  {/* Mock Button */}
                  <button type="button" style={{
                    backgroundColor: brandColor,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}>
                    Primary Action Button
                  </button>

                  {/* Mock Sidebar Item */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: `linear-gradient(180deg, hsl(${brandColor.startsWith("#") ? hexToHSL(brandColor).h : 260}, ${brandColor.startsWith("#") ? hexToHSL(brandColor).s : 70}%, ${Math.min((brandColor.startsWith("#") ? hexToHSL(brandColor).l : 50) + 10, 95)}%) 0%, ${brandColor} 100%)`,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}>
                    <span>★</span>
                    <span>Active Navigation Link</span>
                  </div>
                </div>
              </div>

              <div className="settings-form-grid settings-form-grid--two" style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5edf6" }}>
                <Input
                  label="Custom Logo URL"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  fullWidth
                />
                <Input
                  label="Custom Favicon URL"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  fullWidth
                />
              </div>
            </SectionCard>

            {/* Personal Preferences Card */}
            <SectionCard className="settings-card">
              <CardHeading icon="slidersHorizontal" title="Personal Preferences" subtitle="Choose your workspace theme mode and typography scaling." />
              <div className="settings-form-grid settings-form-grid--two">
                <Select
                  label="Theme Mode"
                  value={prefTheme}
                  onChange={(e) => setPrefTheme(e.target.value as "light" | "dark" | "system")}
                  options={[
                    { value: "light", label: "Light Mode" },
                    { value: "dark", label: "Dark Mode" },
                    { value: "system", label: "System Default" },
                  ]}
                  fullWidth
                />
                <Select
                  label="Font Size"
                  value={prefFontSize}
                  onChange={(e) => setPrefFontSize(e.target.value as "sm" | "md" | "lg")}
                  options={[
                    { value: "sm", label: "Small (13px)" },
                    { value: "md", label: "Medium (14px - Default)" },
                    { value: "lg", label: "Large (15px)" },
                  ]}
                  fullWidth
                />
              </div>
            </SectionCard>

            {/* White Label Overrides Card */}
            <SectionCard className="settings-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid #e5edf6", paddingBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <NavIcon name="shield" className="settings-card__title-icon" />
                  <h3 style={{ margin: "0", fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>White Label Overrides</h3>
                </div>
                {account?.plan !== "enterprise" && (
                  <Badge variant="neutral" style={{ background: "#fef3c7", color: "#d97706", fontWeight: "700" }}>ENTERPRISE FEATURE</Badge>
                )}
              </div>
              
              {account?.plan !== "enterprise" && (
                <div style={{
                  padding: "12px",
                  background: "#fff9eb",
                  border: "1px solid #fef3c7",
                  borderRadius: "8px",
                  color: "#b45309",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "18px",
                }}>
                  Your account is currently on the {formatPlanName(account?.plan ?? "growth")} plan. White Labelling options are locked and require upgrading to the Enterprise plan.
                </div>
              )}

              <div className="settings-form-grid settings-form-grid--two" style={{ opacity: account?.plan === "enterprise" ? 1 : 0.6 }}>
                <Input
                  label="Platform Name"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Jaldee Business"
                  disabled={account?.plan !== "enterprise"}
                  fullWidth
                />
                <Input
                  label="Custom Domain URL"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="app.mycompany.com"
                  disabled={account?.plan !== "enterprise"}
                  fullWidth
                />
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="settings-inline-check" style={{ marginTop: "0", borderTop: "none", paddingTop: "0" }}>
                    <Switch
                      checked={hideBranding}
                      onChange={(checked) => setHideBranding(checked)}
                      disabled={account?.plan !== "enterprise"}
                    />
                    <div>
                      <div className="settings-inline-check__title" style={{ color: "var(--color-text-primary)" }}>Hide Jaldee branding</div>
                      <div className="settings-inline-check__copy">Removes "Powered by Jaldee" footers and default branding links throughout the UI.</div>
                    </div>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="ds-form-label">Custom CSS Overrides</label>
                  <p className="settings-field-note" style={{ marginBottom: "8px" }}>Escape hatch for fine-grained style customisation (e.g. custom font embedding, spacing overrides).</p>
                  <Textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="/* Custom CSS variables or styling */&#10;:root {&#10;  --font-family-base: 'Outfit', sans-serif;&#10;}"
                    disabled={account?.plan !== "enterprise"}
                    rows={6}
                    fullWidth
                    style={{
                      fontFamily: "var(--font-family-mono)",
                      fontSize: "12px",
                      background: account?.plan === "enterprise" ? "#FAFBFD" : "var(--color-surface-alt)",
                    }}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        ) : (
          <SectionCard className="settings-card">
            <CardHeading icon={activeItem.icon} title={activeItem.label} subtitle="This settings section is routed and ready for implementation." />
            <div className="settings-placeholder">
              <p className="settings-placeholder__title">{activeItem.label} is scaffolded</p>
              <p className="settings-placeholder__copy">Use this section for the next conversion slice while keeping the shared settings layout intact.</p>
            </div>
          </SectionCard>
        )}

        <Dialog
          open={createLocationOpen}
          onClose={closeCreateLocationDialog}
          testId="settings-create-location-dialog"
          title="Create Location"
          description="Add a branch or service location for this tenant."
          size="lg"
          contentClassName="settings-location-dialog"
          bodyClassName="settings-location-dialog__body"
        >
          <div className="settings-location-toolbar">
            <Input
              id="settings-location-search-input"
              data-testid="settings-location-search-input"
              ref={searchInputRef}
              value={searchLocation}
              onChange={(event) => setSearchLocation(event.target.value)}
              onKeyDown={handleLocationSearchKeyDown}
              placeholder="Search for your location..."
              fullWidth
              disabled={locationSaving || locationDetecting}
            />
            <Button
              id="settings-location-search-button"
              data-testid="settings-location-search-button"
              type="button"
              variant="secondary"
              size="md"
              onClick={handleLocationSearch}
              disabled={locationSaving || locationDetecting || !searchLocation.trim()}
            >
              Search
            </Button>
            <Button
              id="settings-location-auto-detect-button"
              data-testid="settings-location-auto-detect-button"
              type="button"
              variant="secondary"
              size="md"
              onClick={handleAutoDetectLocation}
              disabled={locationSaving || locationDetecting}
            >
              {locationDetecting ? "Detecting" : "Auto-detect"}
            </Button>
          </div>

          <div data-testid="settings-location-map" data-state={mapStatus} className="settings-map-placeholder">
            <div ref={mapContainerRef} className="settings-google-map" />
            {mapStatus === "loading" ? <p className="settings-map-message">Loading map...</p> : null}
            {mapStatus === "error" ? (
              <p className="settings-map-message">Map could not be loaded. Check the Google Maps API key and domain restrictions.</p>
            ) : null}
          </div>

          <div className="settings-form-grid settings-form-grid--two settings-location-form-grid">
            <Input
              id="settings-location-name-input"
              data-testid="settings-location-name-input"
              label="Location Name"
              value={locationForm.locationName}
              onChange={(event) => updateLocationForm("locationName", event.target.value)}
              placeholder="Main"
              fullWidth
              disabled={locationSaving}
            />
            <Input
              id="settings-location-pincode-input"
              data-testid="settings-location-pincode-input"
              label="PinCode"
              value={locationForm.pincode}
              onChange={(event) => updateLocationForm("pincode", event.target.value)}
              placeholder="682001"
              fullWidth
              disabled={locationSaving}
            />
            <div className="settings-field-span settings-field-span--full">
              <Textarea
                id="settings-location-address-textarea"
                data-testid="settings-location-address-textarea"
                label="Full Address"
                value={locationForm.address}
                onChange={(event) => updateLocationForm("address", event.target.value)}
                placeholder="Building name, street, city"
                rows={4}
                fullWidth
                disabled={locationSaving}
              />
            </div>
            <div className="settings-location-stack">
              <Input
                id="settings-location-map-url-input"
                data-testid="settings-location-map-url-input"
                label="Google Map URL"
                value={locationForm.googleMapUrl}
                onChange={(event) => updateLocationForm("googleMapUrl", event.target.value)}
                placeholder="https://maps.google.com/..."
                fullWidth
                disabled={locationSaving}
              />
              <Select
                id="settings-location-parking-select"
                data-testid="settings-location-parking-select"
                label="Parking"
                value={locationForm.parking}
                onChange={(event) => updateLocationForm("parking", event.target.value)}
                options={PARKING_OPTIONS}
                fullWidth
                disabled={locationSaving}
              />
              <Checkbox
                data-testid="settings-location-always-open-checkbox"
                data-active={locationForm.alwaysOpen}
                checked={locationForm.alwaysOpen}
                onChange={(event) => updateLocationForm("alwaysOpen", event.target.checked)}
                label="24 hours open"
                disabled={locationSaving}
              />
            </div>
            <div className="settings-location-dialog__coordinates settings-field-span settings-field-span--full">
              <Input
                id="settings-location-latitude-input"
                data-testid="settings-location-latitude-input"
                label="Latitude"
                value={locationForm.latitude}
                onChange={(event) => updateLocationForm("latitude", event.target.value)}
                placeholder="9.9312"
                fullWidth
                disabled={locationSaving}
              />
              <Input
                id="settings-location-longitude-input"
                data-testid="settings-location-longitude-input"
                label="Longitude"
                value={locationForm.longitude}
                onChange={(event) => updateLocationForm("longitude", event.target.value)}
                placeholder="76.2673"
                fullWidth
                disabled={locationSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              id="settings-location-cancel-button"
              data-testid="settings-location-cancel-button"
              variant="secondary"
              onClick={closeCreateLocationDialog}
              disabled={locationSaving}
            >
              Cancel
            </Button>
            <Button
              id="settings-location-submit-button"
              data-testid="settings-location-submit-button"
              variant="primary"
              className="settings-location-create-button"
              onClick={handleCreateLocation}
              disabled={locationSaving}
            >
              <ActionGlyph kind="add" />
              {locationSaving ? "Creating" : "Create Location"}
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}

function SettingsNavGroup({
  title,
  items,
  activeKey,
  onNavigate,
}: {
  title: string;
  items: SettingsNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
}) {
  return (
    <div className="settings-nav-group">
      <div className="settings-nav-group__title">{title}</div>
      <div className="settings-nav-group__items">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            id={`settings-nav-${item.key}`}
            data-testid={`settings-nav-${item.key}`}
            data-active={activeKey === item.key ? "true" : "false"}
            onClick={() => onNavigate(item.key)}
            className={`settings-nav-item ${activeKey === item.key ? "settings-nav-item--active" : ""}`}
          >
            <NavIcon name={item.icon} className="settings-nav-item__icon" />
            <span>{item.label}</span>
            {item.key === "developer" ? <span className="settings-nav-item__badge">PRO</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="settings-card__heading">
      <div className="settings-card__title-row">
        <NavIcon name={icon} className="settings-card__title-icon" />
        <h3>{title}</h3>
      </div>
      <p>{subtitle}</p>
    </div>
  );
}

function DangerTile({ icon, title, description }: { icon: string; title: string; description: string }) {
  const testId = `settings-danger-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
  return (
    <button type="button" id={testId} data-testid={testId} className="settings-danger-tile">
      <span className="settings-danger-tile__icon">
        <NavIcon name={icon} />
      </span>
      <span className="settings-danger-tile__content">
        <span className="settings-danger-tile__title">{title}</span>
        <span className="settings-danger-tile__description">{description}</span>
      </span>
    </button>
  );
}

function ProductCard({
  item,
  onToggle,
  readOnly = false,
}: {
  item: ProductCardItem;
  onToggle?: (id: string, enabled: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="settings-product-card">
      <div className="settings-product-card__top">
        <div className={`settings-product-card__icon settings-product-card__icon--${item.accent}`}>
          <NavIcon name={item.icon} className="settings-product-card__glyph" />
        </div>
        {readOnly ? (
          <span className="settings-product-card__lock">
            <NavIcon name="lock" />
          </span>
        ) : (
          <Switch checked={item.enabled} onChange={(checked) => onToggle?.(item.id, checked)} className="settings-product-card__switch" />
        )}
      </div>
      <div className="settings-product-card__body">
        <h4>{item.name}</h4>
        <p>{item.description}</p>
      </div>
      <div className="settings-product-card__footer">
        <div className="settings-product-card__status">
          <Badge variant={item.enabled ? "success" : "neutral"}>{item.statusLabel}</Badge>
          <span>{item.statusMeta}</span>
        </div>
        {item.actionLabel ? (
          <button type="button" id={`settings-product-${item.id}-action`} data-testid={`settings-product-${item.id}-action`} className="settings-product-card__action">
            <span>{item.actionLabel}</span>
            <NavIcon name="arrowRight" className="settings-product-card__action-icon" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UsageCard({ item }: { item: UsageItem }) {
  return (
    <div className="settings-usage-card">
      <div className="settings-usage-card__top">
        <span className="settings-usage-card__label">{item.label}</span>
        <div className="settings-usage-card__value">
          <strong>{item.value}</strong>
          <span>/ {item.total}</span>
        </div>
      </div>
      <div className="settings-usage-card__bar">
        <span style={{ width: `${item.progress}%` }} />
      </div>
      <div className="settings-usage-card__meta">{item.progress}% used</div>
    </div>
  );
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
    className,
  };

  switch (name) {
    case "building":
      return <svg {...shared}><path d="M4 20V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14" /><path d="M8 9h4" /><path d="M8 13h4" /><path d="M8 17h4" /><path d="M16 10h3a1 1 0 0 1 1 1v9" /></svg>;
    case "palette":
      return <svg {...shared}><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a2 2 0 0 1 0-4H14a7 7 0 1 0-2-10.5Z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="8" r="1" fill="currentColor" stroke="none" /></svg>;
    case "mapPin":
      return <svg {...shared}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
    case "box":
      return <svg {...shared}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12 20 7.5" /><path d="M12 12 4 7.5" /><path d="M12 12v9" /></svg>;
    case "creditCard":
      return <svg {...shared}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>;
    case "messageSquare":
      return <svg {...shared}><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 2.5Z" /></svg>;
    case "users":
      return <svg {...shared}><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><circle cx="17" cy="9" r="2" /><path d="M15 19a4 4 0 0 1 5 0" /></svg>;
    case "share2":
      return <svg {...shared}><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 12 8-6" /><path d="m8 12 8 6" /></svg>;
    case "shield":
      return <svg {...shared}><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9.5 12 1.7 1.7 3.3-3.4" /></svg>;
    case "code2":
      return <svg {...shared}><path d="m8 9-4 3 4 3" /><path d="m16 9 4 3-4 3" /><path d="m13 6-2 12" /></svg>;
    case "scale":
      return <svg {...shared}><path d="M12 4v16" /><path d="M7 7h10" /><path d="m7 7-3 5h6l-3-5Z" /><path d="m17 7-3 5h6l-3-5Z" /><path d="M8 20h8" /></svg>;
    case "slidersHorizontal":
      return <svg {...shared}><path d="M4 7h8" /><path d="M16 7h4" /><circle cx="14" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></svg>;
    case "download":
      return <svg {...shared}><path d="M12 4v10" /><path d="m8.5 10.5 3.5 3.5 3.5-3.5" /><path d="M5 20h14" /></svg>;
    case "trash2":
      return <svg {...shared}><path d="M4 7h16" /><path d="M10 11v5" /><path d="M14 11v5" /><path d="M6 7l1 12h10l1-12" /><path d="M9 7V4h6v3" /></svg>;
    case "upload":
      return <svg {...shared}><path d="M12 20V9" /><path d="m8.5 12.5 3.5-3.5 3.5 3.5" /><path d="M5 20h14" /></svg>;
    case "calendar":
      return <svg {...shared}><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4" /><path d="M16 4v4" /><path d="M4 10h16" /></svg>;
    case "historyClock":
      return <svg {...shared}><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 5v5h5" /><path d="M12 8v4l3 2" /></svg>;
    case "arrowRight":
      return <svg {...shared}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case "stethoscope":
      return <svg {...shared}><path d="M8 4v5a4 4 0 1 0 8 0V4" /><path d="M12 13v3a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="13" r="2" /></svg>;
    case "bag":
      return <svg {...shared}><path d="M6 8h12l-1 11H7L6 8Z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></svg>;
    case "wallet":
      return <svg {...shared}><path d="M4 7h13a3 3 0 0 1 3 3v7H7a3 3 0 0 1-3-3V7Z" /><path d="M4 7V6a2 2 0 0 1 2-2h11" /><path d="M16 12h4" /></svg>;
    case "crown":
      return <svg {...shared}><path d="m4 8 4 4 4-6 4 6 4-4-2 10H6L4 8Z" /></svg>;
    case "target":
      return <svg {...shared}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
    case "checkSquare":
      return <svg {...shared}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.3 2.3 4.7-4.8" /></svg>;
    case "heart":
      return <svg {...shared}><path d="M12 20s-6.5-4.2-8.5-7.5A4.9 4.9 0 0 1 12 7a4.9 4.9 0 0 1 8.5 5.5C18.5 15.8 12 20 12 20Z" /><path d="M9 12h6" /><path d="M12 9v6" /></svg>;
    case "currency":
      return <svg {...shared}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6" /><path d="M12 7v10" /><path d="M9 13h6" /></svg>;
    case "bell":
      return <svg {...shared}><path d="M12 4a4 4 0 0 1 4 4v2.5c0 .8.3 1.5.8 2.1l1.2 1.4H6l1.2-1.4c.5-.6.8-1.3.8-2.1V8a4 4 0 0 1 4-4Z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>;
    case "chartBars":
      return <svg {...shared}><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19V8" /><path d="M4 19h17" /></svg>;
    case "folder":
      return <svg {...shared}><path d="M4 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" /></svg>;
    case "lock":
      return <svg {...shared}><rect x="6" y="11" width="12" height="9" rx="2" /><path d="M9 11V8a3 3 0 0 1 6 0v3" /></svg>;
    default:
      return <svg {...shared}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

function ActionGlyph({ kind, className }: { kind: "save" | "upload" | "add"; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className,
  };

  if (kind === "save") {
    return (
      <svg {...shared}>
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M9 18h6" />
      </svg>
    );
  }

  if (kind === "add") {
    return (
      <svg {...shared}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M12 20V9" />
      <path d="m8.5 12.5 3.5-3.5 3.5 3.5" />
      <path d="M5 20h14" />
    </svg>
  );
}
