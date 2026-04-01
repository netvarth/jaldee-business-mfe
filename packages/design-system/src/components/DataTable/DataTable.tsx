import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils";
import { Skeleton } from "../Skeleton/Skeleton";
import { EmptyState } from "../EmptyState/EmptyState";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  sticky?: "left" | "right";
  width?: number | string;
  hidden?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
  render?: (row: T) => ReactNode;
  footer?: () => ReactNode;
  sortFn?: (a: T, b: T) => number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId?: (row: T) => string;

  loading?: boolean;
  emptyState?: ReactNode;

  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;

  sorting?: {
    sortKey: string | null;
    sortDir: "asc" | "desc";
    onChange: (key: string, dir: "asc" | "desc") => void;
  };

  pagination?: {
    pageSize: number;
    total: number;
    page: number;
    onChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };

  selection?: {
    selectedRowKeys: string[];
    onChange: (keys: string[]) => void;
  };

  className?: string;
  tableClassName?: string;
  "data-testid"?: string;
}

function getCellValue<T extends object>(row: T, key: keyof T | string) {
  return row[key as keyof T];
}

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  loading = false,
  emptyState,
  onRowClick,
  rowClassName,
  sorting,
  pagination,
  selection,
  className,
  tableClassName,
  "data-testid": testId = "data-table",
}: DataTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<"asc" | "desc">("asc");

  function resolveRowId(row: T, index: number): string {
    if (typeof getRowId === "function") return getRowId(row);

    const maybeId = (row as { id?: string | number }).id;
    if (maybeId !== undefined && maybeId !== null) return String(maybeId);

    return String(index);
  }

  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns]
  );

  const sortKey = sorting?.sortKey ?? internalSortKey;
  const sortDir = sorting?.sortDir ?? internalSortDir;

  function handleSort(key: string) {
    if (sorting) {
      const nextDir =
        sorting.sortKey === key
          ? sorting.sortDir === "asc"
            ? "desc"
            : "asc"
          : "asc";

      sorting.onChange(key, nextDir);
      return;
    }

    if (internalSortKey === key) {
      setInternalSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setInternalSortKey(key);
      setInternalSortDir("asc");
    }
  }

  const sortedData = useMemo(() => {
    if (sorting) return data;
    if (!sortKey) return data;

    const column = visibleColumns.find((col) => String(col.key) === sortKey);
    if (!column) return data;

    const next = [...data].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b);
      }

      const aValue = getCellValue(a, sortKey);
      const bValue = getCellValue(b, sortKey);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return aValue - bValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return aValue.getTime() - bValue.getTime();
      }

      return String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return sortDir === "asc" ? next : next.reverse();
  }, [data, sortKey, sortDir, sorting, visibleColumns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;

    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  const selectedKeys = selection?.selectedRowKeys ?? [];
  const visibleRowKeys = paginatedData.map((row, index) =>
    resolveRowId(row, index)
  );

  const allSelected =
    visibleRowKeys.length > 0 &&
    visibleRowKeys.every((key) => selectedKeys.includes(key));

  const someSelected =
    visibleRowKeys.some((key) => selectedKeys.includes(key)) && !allSelected;

  function toggleAllRows() {
    if (!selection) return;

    if (allSelected) {
      selection.onChange(selectedKeys.filter((key) => !visibleRowKeys.includes(key)));
      return;
    }

    selection.onChange(Array.from(new Set([...selectedKeys, ...visibleRowKeys])));
  }

  function toggleRow(rowKey: string) {
    if (!selection) return;

    const exists = selectedKeys.includes(rowKey);
    selection.onChange(
      exists
        ? selectedKeys.filter((key) => key !== rowKey)
        : [...selectedKeys, rowKey]
    );
  }

  const state = loading ? "loading" : paginatedData.length === 0 ? "empty" : "ready";

  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  return (
    <div
      data-testid={testId}
      data-state={state}
      data-has-selection={selection ? "true" : "false"}
      data-has-pagination={pagination ? "true" : "false"}
      className={cn(
        "w-full overflow-hidden rounded-2xl border",
        "bg-[var(--color-surface)] border-[color:color-mix(in_srgb,var(--color-border)_78%,white)]",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table
          role="table"
          data-testid={`${testId}-table`}
          className={cn("w-full border-collapse text-sm", tableClassName)}
        >
          <thead>
            <tr className="border-b border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_38%,white)]">
              {selection && (
                <th scope="col" className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    data-testid={`${testId}-select-all`}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAllRows}
                    aria-label="Select all rows on current page"
                    className={cn(
                      "cursor-pointer",
                      "focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]"
                    )}
                  />
                </th>
              )}

              {visibleColumns.map((col) => {
                const isSorted = sortKey === String(col.key);
                const ariaSort = col.sortable
                  ? isSorted
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined;

                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    aria-sort={ariaSort}
                    data-testid={`${testId}-col-${String(col.key)}`}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                    className={cn(
                      "px-6 py-3 text-xs font-medium whitespace-nowrap",
                      "text-[var(--color-text-secondary)]",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      (!col.align || col.align === "left") && "text-left",
                      col.sortable &&
                        "cursor-pointer select-none hover:text-[var(--color-text-primary)]",
                      col.sticky === "left" &&
                        "sticky left-0 z-10 bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_38%,white)]",
                      col.sticky === "right" &&
                        "sticky right-0 z-10 bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_38%,white)]",
                      col.headerClassName
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "center" && "justify-center",
                        col.align === "right" && "justify-end w-full"
                      )}
                    >
                      {col.header}
                      {col.sortable && (
                        <span aria-hidden="true">
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pagination?.pageSize ?? 5 }).map((_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className="border-b border-[color:color-mix(in_srgb,var(--color-border)_72%,white)]"
                >
                  {selection && (
                    <td className="px-6 py-4">
                      <Skeleton height={12} width="16px" />
                    </td>
                  )}

                  {visibleColumns.map((col) => (
                    <td key={String(col.key)} className="px-6 py-4">
                      <Skeleton height={12} width="80%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selection ? 1 : 0)}>
                  {emptyState ?? (
                    <EmptyState
                      icon="📭"
                      title="No data found"
                      description="Try adjusting your filters"
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = resolveRowId(row, index);
                const isSelected = selectedKeys.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    data-testid={`${testId}-row-${rowId}`}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b transition-colors",
                      "border-[color:color-mix(in_srgb,var(--color-border)_72%,white)]",
                      onRowClick && "cursor-pointer hover:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)]",
                      isSelected && "bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_30%,white)]",
                      rowClassName?.(row)
                    )}
                  >
                    {selection && (
                      <td
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          data-testid={`${testId}-select-${rowId}`}
                          checked={isSelected}
                          onChange={() => toggleRow(rowId)}
                          aria-label={`Select row ${index + 1}`}
                          className={cn(
                            "cursor-pointer",
                            "focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]"
                          )}
                        />
                      </td>
                    )}

                    {visibleColumns.map((col) => (
                      <td
                        key={String(col.key)}
                        data-testid={`${testId}-cell-${rowId}-${String(col.key)}`}
                        className={cn(
                          "px-6 py-4 align-middle text-[var(--color-text-primary)]",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.sticky === "left" && "sticky left-0 z-10 bg-inherit",
                          col.sticky === "right" && "sticky right-0 z-10 bg-inherit",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : String(getCellValue(row, col.key) ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>

          {visibleColumns.some((col) => col.footer) && (
            <tfoot>
              <tr className="border-t border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_30%,white)] font-semibold">
                {selection && <td className="px-6 py-4" />}
                {visibleColumns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4">
                    {col.footer?.()}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div
          data-testid={`${testId}-pagination`}
          className="flex items-center justify-between border-t border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] bg-[var(--color-surface)] px-6 py-3"
        >
          <span className="text-xs text-[var(--color-text-secondary)]">
            Showing {(currentPage - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(currentPage * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} records
          </span>

          <div className="flex items-center gap-1">
            <PaginationBtn
              label="«"
              disabled={currentPage === 1}
              onClick={() => pagination.onChange(1)}
              testId={`${testId}-first`}
            />
            <PaginationBtn
              label="‹"
              disabled={currentPage === 1}
              onClick={() => pagination.onChange(currentPage - 1)}
              testId={`${testId}-prev`}
            />

            {getPageNumbers(currentPage, totalPages).map((page, i) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="w-8 text-center text-xs text-[var(--color-text-secondary)]"
                >
                  ...
                </span>
              ) : (
                <PaginationBtn
                  key={page}
                  label={String(page)}
                  active={page === currentPage}
                  disabled={false}
                  onClick={() => pagination.onChange(page)}
                  testId={`${testId}-page-${page}`}
                />
              )
            )}

            <PaginationBtn
              label="›"
              disabled={currentPage === totalPages}
              onClick={() => pagination.onChange(currentPage + 1)}
              testId={`${testId}-next`}
            />
            <PaginationBtn
              label="»"
              disabled={currentPage === totalPages}
              onClick={() => pagination.onChange(totalPages)}
              testId={`${testId}-last`}
            />

            {pagination.onPageSizeChange && (
              <select
                data-testid={`${testId}-page-size`}
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                className={cn(
                  "ml-2 h-8 rounded-md border px-2 text-xs",
                  "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]"
                )}
                aria-label="Rows per page"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationBtn({
  label,
  disabled,
  active,
  onClick,
  testId,
}: {
  label: string;
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-[32px] h-8 px-2 rounded-md text-xs border transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]",
        active
          ? "font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]"
          : "bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      {label}
    </button>
  );
}

function getPageNumbers(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

type DataTableToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  recordCount?: number;
};

export function DataTableToolbar({
  query,
  onQueryChange,
  searchPlaceholder = "Search...",
  recordCount,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative w-full max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            "h-[38px] w-full rounded-xl border pl-10 pr-4 text-sm",
            "bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)]",
            "border-[color:color-mix(in_srgb,var(--color-border)_78%,white)]",
            "text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            "focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)]",
            "focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
          )}
        />
      </div>

      {typeof recordCount === "number" && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {recordCount} records
        </span>
      )}
    </div>
  );
}
