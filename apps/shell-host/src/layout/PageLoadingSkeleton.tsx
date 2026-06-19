import { Skeleton, SkeletonTable } from "@jaldee/design-system";

export default function PageLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-3">
          <Skeleton height={28} width={200} className="rounded-lg bg-gray-200/60" />
          <Skeleton height={16} width={340} className="rounded-lg bg-gray-200/40" />
        </div>
      </div>

      {/* Grid of stats placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 space-y-3">
          <Skeleton height={14} width={80} className="rounded bg-gray-200/40" />
          <Skeleton height={32} width={120} className="rounded-lg bg-gray-200/60" />
          <Skeleton height={12} width={150} className="rounded bg-gray-200/40" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 space-y-3">
          <Skeleton height={14} width={80} className="rounded bg-gray-200/40" />
          <Skeleton height={32} width={100} className="rounded-lg bg-gray-200/60" />
          <Skeleton height={12} width={130} className="rounded bg-gray-200/40" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 space-y-3">
          <Skeleton height={14} width={80} className="rounded bg-gray-200/40" />
          <Skeleton height={32} width={140} className="rounded-lg bg-gray-200/60" />
          <Skeleton height={12} width={160} className="rounded bg-gray-200/40" />
        </div>
      </div>

      {/* Content area table skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-4">
        <SkeletonTable rows={4} columns={5} />
      </div>
    </div>
  );
}
