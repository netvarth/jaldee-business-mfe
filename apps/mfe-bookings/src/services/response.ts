export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of ["content", "items", "results", "records", "data"]) {
    const candidate = record[key];
    if (candidate === payload) {
      continue;
    }

    const list = unwrapList<T>(candidate);
    if (list.length > 0 || Array.isArray(candidate)) {
      return list;
    }
  }

  return [];
}
