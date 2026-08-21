/**
 * Shared scaffold for the commerce list screens.
 *
 * Exists so every screen handles the three states the repo's no-silent-mocks rule cares
 * about in the same way, rather than each one inventing its own:
 *
 *   - loading      → skeleton, never zeros
 *   - error        → says the call failed, never an empty table (which reads as "no data")
 *   - unavailable  → the feature has no backing data yet; stated explicitly
 *
 * An empty table is only ever shown when the request genuinely succeeded and returned
 * nothing, which is the one case where "no rows" is a fact rather than a guess.
 */
import React from "react";
import { EmptyState, ErrorState, PageHeader, SectionCard, Skeleton } from "@jaldee/design-system";

export interface ListScreenProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Filter/search controls rendered above the table. */
  toolbar?: React.ReactNode;
  isLoading?: boolean;
  error?: unknown;
  /** Rendered instead of the table when the feature has no backing data yet. */
  unavailable?: { title: string; description: string } | null;
  /** Shown above the content — e.g. a truncation warning. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}

export function ListScreen({
  title,
  subtitle,
  actions,
  toolbar,
  isLoading,
  error,
  unavailable,
  notice,
  children,
}: ListScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full bg-surface-50 text-surface-900">
      <div className="dashboard-container mx-auto max-w-[1560px] px-4 md:px-8 pb-12 pt-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-600">
                Karty
              </span>
              <span className="text-xs text-surface-500">Commerce</span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-surface-900">{title}</h1>
            {subtitle && <p className="mt-1 text-[13.5px] text-surface-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {notice}

        <SectionCard className="border-surface-200 shadow-sm" padding={false}>
          {toolbar ? <div className="px-[22px] pt-5 pb-3.5 border-b border-surface-100">{toolbar}</div> : null}

          {isLoading ? (
            <div className="flex flex-col gap-2 p-6" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState
                title="Couldn't load this list"
                description={
                  error instanceof Error
                    ? error.message
                    : "The request to the commerce service failed. Retry, or check that the service is reachable."
                }
              />
            </div>
          ) : unavailable ? (
            <div className="p-6">
              <EmptyState title={unavailable.title} description={unavailable.description} />
            </div>
          ) : (
            children
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/** Amber strip for "these figures are partial" style warnings. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="text-[13px] text-amber-600">⚠</span>
      <span className="text-[12.5px] leading-snug text-amber-700">{children}</span>
    </div>
  );
}

/** Consistent "showing N of M" truncation notice for the 200-row server cap. */
export function TruncationNotice({
  fetched,
  total,
  noun,
}: {
  fetched: number;
  total: number;
  noun: string;
}) {
  if (total <= fetched) return null;
  return (
    <Notice>
      Showing the {fetched.toLocaleString("en-IN")} most recent of {total.toLocaleString("en-IN")}{" "}
      {noun} — the API returns a capped page. Narrow the filters for a complete view.
    </Notice>
  );
}
