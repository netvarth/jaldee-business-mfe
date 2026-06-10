import { cn } from "@jaldee/design-system";

type TaskPaginationFooterProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
  testId?: string;
};

export function TaskPaginationFooter({
  page,
  pageSize,
  total,
  onChange,
  className,
  testId = "tasks-card-pagination",
}: TaskPaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const currentStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentEnd = Math.min(currentPage * pageSize, total);

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 border-t border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] bg-[var(--color-surface)] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6",
        className
      )}
    >
      <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
        Showing {currentStart} to {currentEnd} of {total} records
      </span>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <TaskPageButton
            label="<<"
            ariaLabel="First page"
            disabled={currentPage === 1}
            onClick={() => onChange(1)}
            testId={`${testId}-first`}
          />
          <TaskPageButton
            label="<"
            ariaLabel="Previous page"
            disabled={currentPage === 1}
            onClick={() => onChange(currentPage - 1)}
            testId={`${testId}-prev`}
          />

          {getTaskPageNumbers(currentPage, totalPages).map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="w-8 text-center text-[length:var(--text-xs)] text-[var(--color-text-secondary)]"
              >
                ...
              </span>
            ) : (
              <TaskPageButton
                key={pageNumber}
                label={String(pageNumber)}
                ariaLabel={`Page ${pageNumber}`}
                active={pageNumber === currentPage}
                disabled={false}
                onClick={() => onChange(pageNumber)}
                testId={`${testId}-page-${pageNumber}`}
              />
            )
          )}

          <TaskPageButton
            label=">"
            ariaLabel="Next page"
            disabled={currentPage === totalPages}
            onClick={() => onChange(currentPage + 1)}
            testId={`${testId}-next`}
          />
          <TaskPageButton
            label=">>"
            ariaLabel="Last page"
            disabled={currentPage === totalPages}
            onClick={() => onChange(totalPages)}
            testId={`${testId}-last`}
          />
        </div>
      ) : null}
    </div>
  );
}

function TaskPageButton({
  label,
  ariaLabel,
  disabled,
  active,
  onClick,
  testId,
}: {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 min-w-[32px] rounded-md border px-2 text-[length:var(--text-xs)] transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] font-semibold text-[var(--color-primary-foreground)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
        disabled && "pointer-events-none cursor-not-allowed opacity-40"
      )}
    >
      {label}
    </button>
  );
}

function getTaskPageNumbers(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}
