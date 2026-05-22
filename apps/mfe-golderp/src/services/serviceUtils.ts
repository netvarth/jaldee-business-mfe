export function normalizeCountResponse(response: unknown) {
  if (typeof response === "number") return response;
  if (typeof response === "string") {
    const parsed = Number(response);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (response && typeof response === "object") {
    const candidate = (response as Record<string, unknown>).count;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
}

export function appendQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
