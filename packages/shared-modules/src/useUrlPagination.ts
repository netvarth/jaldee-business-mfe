import { useEffect, useRef, useState } from "react";

type UrlPaginationOptions = {
  namespace: string;
  defaultPage?: number;
  defaultPageSize?: number;
  legacyPageParam?: string;
  legacyPageSizeParam?: string;
  resetOnPageSizeChange?: boolean;
  resetDeps?: readonly unknown[];
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function useUrlPagination({
  namespace,
  defaultPage = DEFAULT_PAGE,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  legacyPageParam,
  legacyPageSizeParam,
  resetOnPageSizeChange = true,
  resetDeps,
}: UrlPaginationOptions) {
  const pageParam = `${namespace}Page`;
  const pageSizeParam = `${namespace}PageSize`;
  const [page, setPage] = useState(() =>
    readPositiveUrlNumber(
      pageParam,
      readPositiveUrlNumber(legacyPageParam, readStoredPaginationNumber(namespace, "page", defaultPage))
    )
  );
  const [pageSize, setPageSize] = useState(() =>
    readPositiveUrlNumber(
      pageSizeParam,
      readPositiveUrlNumber(legacyPageSizeParam, readStoredPaginationNumber(namespace, "pageSize", defaultPageSize))
    )
  );
  const didRunResetEffectRef = useRef(false);
  const didRunPageSizeResetEffectRef = useRef(false);

  useEffect(() => {
    writeStoredPagination(namespace, page, pageSize);
    syncPaginationToUrl(pageParam, pageSizeParam, page, pageSize);
  }, [namespace, page, pageParam, pageSize, pageSizeParam]);

  useEffect(() => {
    if (!resetDeps) return;

    if (!didRunResetEffectRef.current) {
      didRunResetEffectRef.current = true;
      return;
    }

    setPage(1);
  }, resetDeps ?? []);

  useEffect(() => {
    if (!resetOnPageSizeChange) return;

    if (!didRunPageSizeResetEffectRef.current) {
      didRunPageSizeResetEffectRef.current = true;
      return;
    }

    setPage(1);
  }, [pageSize, resetOnPageSizeChange]);

  return { page, setPage, pageSize, setPageSize };
}

function readPositiveUrlNumber(param: string | undefined, fallback: number) {
  if (typeof window === "undefined") return fallback;
  if (!param) return fallback;

  const value = Number(new URLSearchParams(window.location.search).get(param));
  if (!Number.isFinite(value) || value < 1) return fallback;

  return Math.floor(value);
}

function readStoredPaginationNumber(namespace: string, key: "page" | "pageSize", fallback: number) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(namespace));
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<Record<"page" | "pageSize", unknown>>;
    const value = Number(parsed[key]);
    if (!Number.isFinite(value) || value < 1) return fallback;

    return Math.floor(value);
  } catch {
    return fallback;
  }
}

function writeStoredPagination(namespace: string, page: number, pageSize: number) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getStorageKey(namespace),
      JSON.stringify({
        page: Math.max(1, page),
        pageSize: Math.max(1, pageSize),
      })
    );
  } catch {
    // Session storage is a convenience; URL params still carry the state.
  }
}

function getStorageKey(namespace: string) {
  return `jaldee:data-table-pagination:${namespace}`;
}

function syncPaginationToUrl(pageParam: string, pageSizeParam: string, page: number, pageSize: number) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set(pageParam, String(Math.max(1, page)));
  url.searchParams.set(pageSizeParam, String(Math.max(1, pageSize)));

  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextHref !== currentHref) {
    window.history.replaceState(window.history.state, "", nextHref);
  }
}
