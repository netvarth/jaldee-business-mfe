import type { ApiScope } from "./types";

type QueryKeyPart =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>;

export function buildSharedQueryKey(
  moduleName: string,
  apiScope: ApiScope,
  locationId: string | null | undefined,
  ...parts: QueryKeyPart[]
) {
  return [moduleName, apiScope, locationId ?? null, ...parts] as const;
}

export function buildScopedListQueryKey(
  moduleName: string,
  apiScope: ApiScope,
  locationId: string | null | undefined,
  params?: Record<string, unknown>
) {
  return buildSharedQueryKey(moduleName, apiScope, locationId, "list", params ?? {});
}

export function buildScopedDetailQueryKey(
  moduleName: string,
  apiScope: ApiScope,
  locationId: string | null | undefined,
  recordId: string,
  params?: Record<string, unknown>
) {
  return buildSharedQueryKey(moduleName, apiScope, locationId, "detail", recordId, params ?? {});
}
