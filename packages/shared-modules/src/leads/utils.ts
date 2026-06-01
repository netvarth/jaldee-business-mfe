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

  if (payload && typeof payload === "object") {
    const candidate = payload as any;
    if (Array.isArray(candidate.content)) {
      return candidate.content as T[];
    }
    if (Array.isArray(candidate.data)) {
      return candidate.data as T[];
    }
    if (Array.isArray(candidate.records)) {
      return candidate.records as T[];
    }
    if (Array.isArray(candidate.items)) {
      return candidate.items as T[];
    }
  }

  return [];
}

export function unwrapCount(value: unknown) {
  const payload = unwrapPayload(value);

  if (typeof payload === "number") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as any;
    const pageTotal = candidate.page?.totalElements ?? candidate.page?.total;
    if (pageTotal !== undefined) {
      const num = Number(pageTotal);
      if (!isNaN(num)) return num;
    }

    const count =
      candidate.count ??
      candidate.total ??
      candidate.totalElements ??
      candidate.totalCount;

    if (count !== undefined) {
      const num = Number(count);
      if (!isNaN(num)) return num;
    }

    if (typeof candidate.data === "number") {
      return candidate.data;
    }
  }

  return Number(payload) || 0;
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
