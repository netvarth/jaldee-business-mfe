import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

let scheduleSearchSchemaCache: SearchSchema | null | undefined;
let scheduleSearchSchemaPromise: Promise<SearchSchema | null> | null = null;

export async function loadScheduleSearchSchema(api: ReturnType<typeof useBookingApi>) {
  if (scheduleSearchSchemaCache !== undefined) {
    return scheduleSearchSchemaCache;
  }

  if (scheduleSearchSchemaPromise) {
    return scheduleSearchSchemaPromise;
  }

  scheduleSearchSchemaPromise = api
    .get<SearchSchema>("/calendars/schedules/search/schema", { _skipLocationParam: true })
    .then((response) => {
      const normalized = normalizeSearchSchema(response) ?? null;
      scheduleSearchSchemaCache = normalized;
      return normalized;
    })
    .catch(() => {
      scheduleSearchSchemaCache = null;
      return null;
    })
    .finally(() => {
      scheduleSearchSchemaPromise = null;
    });

  return scheduleSearchSchemaPromise;
}
