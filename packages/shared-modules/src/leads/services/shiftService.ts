import { normalizeShift, applyTimeConversion } from '../../utils/timeUtils';
import { buildBaseServiceUrl } from '../../serviceUrls';
import { ApiClient } from '@jaldee/api-client'; // Adjust import according to actual client type

/**
 * Creates a shift (working hours) entry.
 * Accepts `startTime`/`endTime` in 24‑hour "HH:mm" format (or 12‑hour strings).
 * The payload is converted to the 12‑hour representation expected by the backend:
 *   "9.00 AM", "05.30 PM", etc.
 */
export async function createShift<T extends Record<string, any>>(shift: T, api: ApiClient) {
  // Ensure fields are valid and in 24‑hour format first.
  const normalized = normalizeShift(shift);

  // Convert to the 12‑hour format required by the API using a global helper.
  const payload = applyTimeConversion(normalized);

  const url = buildBaseServiceUrl('/platform-service/v1/api/shift/create');
  // Keep consistent with other platform‑service calls.
  return api.post<any>(url, payload, { _skipLocationParam: true } as any);
}
