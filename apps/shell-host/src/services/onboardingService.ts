import { apiClient } from "@jaldee/api-client";
import { buildBaseServiceUrl, BASE_SERVICE_ENDPOINTS } from "./serviceUrls";

interface TenantUpdateInput {
  tenantUid: string;
  tenantName: string;
  gstin?: string;
  businessPhoneCountryCode?: string;
  businessPhoneNumber?: string;
  email?: string;
}

interface TenantSettingsUpdateInput {
  tenantUid: string;
  selectedProducts: string[];
}

interface LocationCreateInput {
  tenantUid: string;
  locationName: string;
  address: string;
  pincode: string;
  longitude: string;
  latitude: string;
  parking: string;
  alwaysOpen: boolean;
  googleMapUrl: string;
}

const INDIA_COUNTRY = {
  countryCode: "IN",
  name: "India",
  status: "Enabled",
  currency: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    status: "Enabled",
  },
} as const;

function sanitizePhonePart(value?: string) {
  return (value ?? "").replace(/\D/g, "");
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

function isRealEmail(value?: string) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export const onboardingService = {
  async getTenant(tenantUid: string) {
    return apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.detail(tenantUid))
    );
  },

  async getTenantSettings() {
    return apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.get)
    );
  },

  async updateTenant(input: TenantUpdateInput) {
    const payload = {
      tenantName: input.tenantName.trim(),
      brandName: input.tenantName.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta",
      tenantProfile: {
        businessName: input.tenantName.trim(),
        licenseName: input.gstin?.trim() || undefined,
        primaryNumber: input.businessPhoneNumber
          ? {
            countryCode: sanitizePhonePart(input.businessPhoneCountryCode),
            number: sanitizePhonePart(input.businessPhoneNumber),
          }
          : undefined,
        email: isRealEmail(input.email) ? input.email?.trim() : undefined,
      },
    };

    return apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.update(input.tenantUid)),
      payload
    );
  },

  async updateTenantSettings(input: TenantSettingsUpdateInput) {
    const selected = new Set(input.selectedProducts);

    return apiClient.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.update), {
      tenantUid: input.tenantUid,
      finance: true,
      booking: selected.has("bookings"),
      health: selected.has("health"),
      lending: selected.has("lending"),
      eCommerce: selected.has("karty"),
    });
  },

  async createLocation(input: LocationCreateInput) {
    return apiClient.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.create), {
      tenantUid: input.tenantUid,
      place: input.locationName.trim(),
      address: input.address.trim(),
      pincode: input.pincode.trim(),
      longitude: input.longitude.trim(),
      latitude: input.latitude.trim(),
      status: "Enabled",
      parkingType: normalizeParkingType(input.parking),
      open24Hours: input.alwaysOpen,
      googleMapUrl: input.googleMapUrl.trim(),
      locationType: "GOOGLE_MAP",
      locationCurrency: "INR",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta",
      baseLocation: true,
      country: INDIA_COUNTRY,
    });
  },
};
