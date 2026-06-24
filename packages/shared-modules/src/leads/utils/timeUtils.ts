/**
 * Utility functions for handling time strings in schedule/shift objects.
 * Supports conversion from 12‑hour format (e.g., "10:00 PM") to 24‑hour
 * format ("22:00") and ensures a consistent "HH:mm" representation.
 */

/**
 * Convert a time string to a standardized 24‑hour "HH:mm" format.
 *
 * Accepts:
 *  - "HH:mm" (24‑hour) – returned unchanged if valid.
 *  - "h:mm A" or "hh:mm A" (12‑hour with AM/PM), case‑insensitive.
 *
 * @param timeStr The input time string.
 * @returns A string in "HH:mm" format, or throws an Error if parsing fails.
 */
export function to24Hour(timeStr: string): string {
  const trimmed = timeStr.trim();
  // Already 24‑hour format?
  const twentyFourHourRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (twentyFourHourRegex.test(trimmed)) {
    return trimmed;
  }

  // 12‑hour format with AM/PM (e.g., "10:00 PM")
  const twelveHourRegex = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i;
  const match = trimmed.match(twelveHourRegex);
  if (!match) {
    throw new Error(`Invalid time format: "${timeStr}"`);
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12) {
    throw new Error(`Hour out of range in time: "${timeStr}"`);
  }

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  }
  if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  const hourStr = hour.toString().padStart(2, '0');
  return `${hourStr}:${minute}`;
}

/**
 * Normalizes a shift object ensuring startTime and endTime are in 24‑hour format.
 * The function also guarantees that breakMinutes is a number.
 *
 * @param shift The raw shift payload possibly containing 12‑hour times or malformed numbers.
 * @returns A new object with corrected fields.
 */
export function normalizeShift<T extends Record<string, any>>(shift: T): T {
  const result: any = { ...shift };
  if (typeof result.startTime === 'string') {
    result.startTime = to24Hour(result.startTime);
  }
  if (typeof result.endTime === 'string') {
    result.endTime = to24Hour(result.endTime);
  }
  // Ensure breakMinutes is a number (fixes "6 0" typo)
  if (result.breakMinutes != null) {
    const num = Number(result.breakMinutes);
    if (!Number.isNaN(num)) {
      result.breakMinutes = num;
    }
  }
  return result as T;
}

/**
 * Convert a 24‑hour time string to a 12‑hour format with AM/PM.
 * Returns e.g. "9.00 AM" or "05.30 PM" (dot separator for consistency with UI).
 */
export function to12Hour(time24: string): string {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour = hour - 12;
  // Use dot separator as shown in examples
  const hourFormatted = hour.toString().padStart(2, '0');
  const minuteFormatted = minute?.padStart(2, '0') ?? '00';
  return `${hourFormatted}.${minuteFormatted} ${period}`;
}

/**
 * Convert any payload's startTime/endTime to the 12‑hour format expected by the backend.
 * Uses `to24Hour` to normalize possible 12‑hour input first, then `to12Hour` for final output.
 */
export function applyTimeConversion<T extends Record<string, any>>(payload: T): T {
  const result = { ...payload } as any;
  if (typeof result.startTime === 'string') {
    result.startTime = to12Hour(to24Hour(result.startTime));
  }
  if (typeof result.endTime === 'string') {
    result.endTime = to12Hour(to24Hour(result.endTime));
  }
  return result as T;
}
