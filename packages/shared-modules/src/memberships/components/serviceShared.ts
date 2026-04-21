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

export function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

export function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

export function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function toInputDate(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getServiceStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "ACTIVE" || normalized === "ENABLED") return "Active";
  if (normalized === "INACTIVE" || normalized === "DISABLED") return "Inactive";
  if (normalized === "PENDING") return "Pending";

  return status || "Unknown";
}

export function getServiceImageUrl(service: any) {
  if (!Array.isArray(service?.serviceImage) || service.serviceImage.length === 0) {
    return null;
  }

  return String(service.serviceImage[service.serviceImage.length - 1]?.s3path ?? "");
}

export function getFileExtension(file: File) {
  const fromMime = file.type.split("/")[1];
  if (fromMime) return fromMime;

  const fileNameParts = file.name.split(".");
  return fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : "bin";
}

export function buildTemplateFields(schema: any, values: any, prefix = ""): Array<{ key: string; label: string; value: string }> {
  if (!schema || !schema.properties) return [];

  const rows: Array<{ key: string; label: string; value: string }> = [];

  Object.entries<any>(schema.properties).forEach(([propertyKey, propertySchema]) => {
    const currentValue = values?.[propertyKey];
    const label = propertySchema?.title ?? propertyKey;
    const key = prefix ? `${prefix}.${propertyKey}` : propertyKey;

    if (propertySchema?.type === "object" && propertySchema?.properties && currentValue) {
      rows.push(...buildTemplateFields(propertySchema, currentValue, key));
      return;
    }
    if (propertySchema?.type === "object" && propertySchema?.properties) {
      rows.push(...buildTemplateFields(propertySchema, currentValue ?? {}, key));
      return;
    }

    let value = "-";

    if (Array.isArray(currentValue)) {
      value = currentValue.length ? currentValue.join(", ") : "-";
    } else if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
      value = typeof currentValue === "object" ? JSON.stringify(currentValue) : String(currentValue);
    }

    rows.push({ key, label, value });
  });

  return rows;
}
