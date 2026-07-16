import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

let calendarSearchSchemaCache: SearchSchema | null | undefined;
let calendarSearchSchemaPromise: Promise<SearchSchema | null> | null = null;

export async function loadCalendarSearchSchema(api: ReturnType<typeof useBookingApi>) {
  if (calendarSearchSchemaCache !== undefined) {
    return calendarSearchSchemaCache;
  }

  if (calendarSearchSchemaPromise) {
    return calendarSearchSchemaPromise;
  }

  calendarSearchSchemaPromise = api
    .get<SearchSchema>("/calendars/search/schema", { _skipLocationParam: true })
    .then((response) => {
      const normalized = normalizeSearchSchema(response) ?? null;
      calendarSearchSchemaCache = normalized;
      return normalized;
    })
    .catch(() => {
      calendarSearchSchemaCache = null;
      return null;
    })
    .finally(() => {
      calendarSearchSchemaPromise = null;
    });

  return calendarSearchSchemaPromise;
}
