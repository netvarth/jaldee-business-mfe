import { cn } from "../../utils";

interface SkeletonProps {
  width?:     number | string;
  height?:    number | string;
  className?: string;
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={cn("animate-pulse rounded bg-gray-100", className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div data-testid="skeleton-table" className="w-full">
      <div className="flex gap-4 px-4 py-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={12} width="100%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} height={12} width="100%" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      data-testid="skeleton-card"
      className={cn("rounded-lg border border-gray-200 p-4 space-y-3", className)}
    >
      <Skeleton height={16} width="60%" />
      <Skeleton height={12} width="100%" />
      <Skeleton height={12} width="80%" />
    </div>
  );
}