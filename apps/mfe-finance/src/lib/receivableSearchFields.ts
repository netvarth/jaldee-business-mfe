import type { SearchSchema } from "@jaldee/shared-modules";

export function normalizeReceivableSearchSchema(schema: SearchSchema | null | undefined) {
  if (!schema) {
    return null;
  }

  return schema;
}
