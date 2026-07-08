export function resolveTimeZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

export function formatIsoTime(value?: string, timeZone?: string | null, fallback = "09:00"): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const validTimeZone = resolveTimeZone(timeZone);
    return parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(validTimeZone ? { timeZone: validTimeZone } : {}),
    });
  }
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

function normalizeTime(value: string): { hour: number; minute: number; second: number; text: string } {
  const [hour = "00", minute = "00", second = "00"] = value.split(":");
  return {
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    text: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`,
  };
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getOffsetText(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    hour: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  return value.replace("GMT", "");
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const mins = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

export function buildOffsetDateTime(date: string, time: string, timeZone?: string | null): string {
  const validTimeZone = resolveTimeZone(timeZone);
  const normalized = normalizeTime(time);
  if (!validTimeZone) {
    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(year, month - 1, day, normalized.hour, normalized.minute, normalized.second);
    return `${date}T${normalized.text}${formatOffset(-localDate.getTimezoneOffset())}`;
  }

  const [year, month, day] = date.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, normalized.hour, normalized.minute, normalized.second);
  let guess = targetUtc;

  for (let index = 0; index < 2; index += 1) {
    const parts = getZonedParts(new Date(guess), validTimeZone);
    const observedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess += targetUtc - observedUtc;
  }

  const offset = getOffsetText(new Date(guess), validTimeZone);
  return `${date}T${normalized.text}${offset}`;
}
