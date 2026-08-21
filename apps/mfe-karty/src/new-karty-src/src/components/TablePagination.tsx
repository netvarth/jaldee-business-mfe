import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Real pagination for the karty list tables.
 *
 * Replaces the decorative `[1, 2, '...', 5, 6]` markup that several tables shipped with:
 * that pager was a literal array with no state and no handlers, so a 4-row table claimed
 * six pages and highlighted page 5. Every number here derives from `total`/`pageSize`,
 * and the pager hides itself when there is only one page.
 */
export interface TablePaginationProps {
  /** Row count after filtering — drives both the label and the page count. */
  total: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the label, e.g. "items", "purchases". */
  noun?: string;
}

/** Page numbers to render, collapsing long runs to a single ellipsis on each side. */
export function buildPageList(current: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  total,
  page,
  pageSize,
  onPageChange,
  noun = 'items',
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const first = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, total);

  return (
    <div className="p-6 bg-white border-t border-surface-100 flex items-center justify-between">
      <div className="text-sm text-surface-500 tracking-tight">
        {total === 0 ? (
          <>No {noun}</>
        ) : (
          <>
            Showing <span className="font-semibold text-surface-900">{first}</span>
            {' '}to <span className="font-semibold text-surface-900">{last}</span>
            {' '}of <span className="font-semibold text-surface-900">{total}</span> {noun}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-surface-500 hover:text-surface-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            {buildPageList(safePage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="h-9 w-9 grid place-items-center text-sm font-bold text-surface-400 select-none">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === safePage ? 'page' : undefined}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm font-bold transition-all',
                    p === safePage
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                      : 'text-surface-500 hover:bg-surface-50'
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-surface-500 hover:text-surface-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
