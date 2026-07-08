export function accountPath(accountSlug: string | undefined, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (isDomainScopedConsumerSite()) {
    return normalizedPath;
  }

  const slug = getResolvedAccountSlug(accountSlug);
  return normalizedPath === "/" ? `/${slug}` : `/${slug}${normalizedPath}`;
}

export function getResolvedAccountSlug(accountSlug?: string) {
  const explicitSlug = accountSlug?.trim();
  if (explicitSlug) return explicitSlug;

  const configuredSlug = import.meta.env.VITE_CONSUMER_ACCOUNT_SLUG?.trim();
  if (configuredSlug) return configuredSlug;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return "account1";
}

export function isDomainScopedConsumerSite() {
  const routeMode = import.meta.env.VITE_CONSUMER_ROUTE_MODE?.trim().toLowerCase();
  if (routeMode === "domain") return true;
  if (routeMode === "path") return false;

  return Boolean(import.meta.env.VITE_CONSUMER_ACCOUNT_SLUG?.trim());
}

export function isReservedRoute(value: string | undefined) {
  return ["login", "account", "profile", "bookings", "terms", "privacy", "refund", "shipping"].includes(value ?? "");
}
