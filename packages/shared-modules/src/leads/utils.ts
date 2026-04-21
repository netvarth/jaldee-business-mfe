export function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

export function unwrapList<T = any>(value: unknown): T[] {
  const payload = unwrapPayload(value);

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data as T[];
  }

  return [];
}

export function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

export function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function fullName(item: any) {
  const first = String(item?.firstName ?? item?.consumerFirstName ?? "").trim();
  const last = String(item?.lastName ?? item?.consumerLastName ?? "").trim();
  const value = `${first} ${last}`.trim();
  return value || "-";
}

export function mapLeadStatusLabel(status: unknown) {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Converted";
    case "REJECTED":
      return "Rejected";
    case "NO_RESPONSE":
      return "RNR";
    case "INACTIVE":
      return "Inactive";
    default:
      return status ? String(status) : "-";
  }
}

export const PRODUCT_TYPE_OPTIONS = [
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "CHECKIN", label: "Check-in" },
  { value: "ORDER", label: "Order" },
  { value: "UNKNOWN", label: "General" },
];

export const CHANNEL_TYPE_OPTIONS = [
  { value: "DIRECT", label: "Direct" },
  { value: "QRCODE", label: "Qrcode" },
  { value: "WHATSAPP", label: "Whatsapp" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "IVR", label: "Ivr" },
  { value: "BRANDEDAPP", label: "Branded App" },
  { value: "SDK", label: "Lead SDK" },
];
