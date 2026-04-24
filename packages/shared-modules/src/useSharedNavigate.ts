import { useCallback } from "react";
import { useSharedModulesContext } from "./context";

function normalizeBasePath(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "/") return "";
  if (!trimmed.startsWith("/")) return `/${trimmed.replace(/\/+$/, "")}`;
  return trimmed.replace(/\/+$/, "");
}

function resolveInternalNavigationTarget(href: string, basePath: string) {
  if (typeof window === "undefined") return null;

  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return null;

  try {
    const isRelative = !raw.startsWith("/") && !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw);
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    const normalizedBasePath = normalizeBasePath(basePath);
    let pathname = url.pathname;

    if (isRelative || !normalizedBasePath) {
      // Router-internal path (already relative to the host basename).
      pathname = pathname || "/";
    } else if (pathname.startsWith(normalizedBasePath)) {
      pathname = pathname.slice(normalizedBasePath.length) || "/";
    } else {
      // This looks like a shell-level navigation (outside current MFE basename).
      return null;
    }

    if (!pathname.startsWith("/")) {
      pathname = `/${pathname}`;
    }

    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function useSharedNavigate() {
  const { basePath, navigate } = useSharedModulesContext();

  return useCallback(
    (href: string) => {
      const internalTarget = navigate ? resolveInternalNavigationTarget(href, basePath) : null;
      if (navigate && internalTarget) {
        navigate(internalTarget);
        return;
      }

      if (typeof window !== "undefined") {
        window.location.assign(href);
      }
    },
    [basePath, navigate]
  );
}
