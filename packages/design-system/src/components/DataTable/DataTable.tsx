import { useState } from "react";
import { cn } from "../../utils";
import { Skeleton } from "../Skeleton/Skeleton";
import { EmptyState } from "../EmptyState/EmptyState";
import type { ReactNode } from "react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sticky?: "left" | "right";
  width?: number;
  hidden?: boolean;
  render?: (row: T) => ReactNode;
  footer?: () => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    pageSize: number;
    total: number;
    page?: number;
    onChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  className?: string;
  "data-testid"?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  emptyState,
  onRowClick,
  rowClassName,
  searchable,
  searchPlaceholder = "Search...",
  onSearch,
  pagination,
  className,
  "data-testid": testId = "data-table",
}: DataTableProps<T>) {

  const [internalSearch, setInternalSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const visibleColumns = columns.filter(c => !c.hidden);

  const filteredData = onSearch ? data : data.filter(row =>
    !internalSearch ||
    Object.values(row).some(v =>
      String(v).toLowerCase().includes(internalSearch.toLowerCase())
    )
  );

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    })
    : filteredData;

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleSearch(value: string) {
    setInternalSearch(value);
    onSearch?.(value);
  }

  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  return (
    <div
      data-testid={testId}
      className={cn(
        "bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Search bar */}
      {searchable && (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              🔍
            </span>
            <input
              data-testid={`${testId}-search`}
              value={internalSearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-gray-500">
            {sortedData.length} records
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          data-testid={`${testId}-table`}
          className="w-full border-collapse text-sm"
        >
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  data-testid={`${testId}-col-${col.key}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-gray-800 select-none",
                    col.sticky === "left" && "sticky left-0 bg-gray-50 z-10",
                    col.sticky === "right" && "sticky right-0 bg-gray-50 z-10",
                  )}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-300">
                        {sortKey === col.key
                          ? sortDir === "asc" ? "↑" : "↓"
                          : "↕"
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pagination?.pageSize ?? 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton height={12} width="80%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length}>
                  {emptyState ?? (
                    <EmptyState
                      icon="📭"
                      title="No data found"
                      description="Try adjusting your search or filters"
                    />
                  )}
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => (
                <tr
                  key={i}
                  data-testid={`${testId}-row-${i}`}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-100 transition-colors duration-75",
                    onRowClick && "cursor-pointer",
                    hoveredRow === i ? "bg-gray-50" : "bg-white",
                    rowClassName?.(row),
                  )}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      data-testid={`${testId}-cell-${i}-${col.key}`}
                      className={cn(
                        "px-4 py-3 text-gray-800",
                        col.sticky === "left" && "sticky left-0 bg-inherit z-10",
                        col.sticky === "right" && "sticky right-0 bg-inherit z-10",
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {visibleColumns.some(c => c.footer) && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.footer?.()}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div
          data-testid={`${testId}-pagination`}
          className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white"
        >
          {/* Left — record count */}
          <span className="text-xs text-gray-500">
            Showing {((currentPage - 1) * pagination.pageSize) + 1} to{" "}
            {Math.min(currentPage * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} records
          </span>

          {/* Right — navigation */}
          <div className="flex items-center gap-1">

            {/* First */}
            <PaginationBtn
              label="«"
              disabled={currentPage === 1}
              onClick={() => pagination.onChange(1)}
              testId={`${testId}-first`}
            />

            {/* Prev */}
            <PaginationBtn
              label="‹"
              disabled={currentPage === 1}
              onClick={() => pagination.onChange(currentPage - 1)}
              testId={`${testId}-prev`}
            />

            {/* Page numbers */}
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <PaginationBtn
                  key={p}
                  label={String(p)}
                  active={p === currentPage}
                  disabled={false}
                  onClick={() => pagination.onChange(p as number)}
                  testId={`${testId}-page-${p}`}
                />
              )
            )}

            {/* Next */}
            <PaginationBtn
              label="›"
              disabled={currentPage === totalPages}
              onClick={() => pagination.onChange(currentPage + 1)}
              testId={`${testId}-next`}
            />

            {/* Last */}
            <PaginationBtn
              label="»"
              disabled={currentPage === totalPages}
              onClick={() => pagination.onChange(totalPages)}
              testId={`${testId}-last`}
            />

            {/* Page size selector */}
            {pagination.onPageSizeChange && (
              <select
                data-testid={`${testId}-page-size`}
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                className="ml-2 h-8 rounded-md border border-gray-200 bg-white text-xs text-gray-600 px-2 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                {[10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pagination Button ────────────────────────────────

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
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-[32px] h-8 px-2 rounded-md text-xs border transition-colors",
        active
          ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
      )}
    >
      {label}
    </button>
  );
}

// ─── Page number generator ────────────────────────────

function getPageNumbers(current: number, total: number): (number | "...")[] {
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