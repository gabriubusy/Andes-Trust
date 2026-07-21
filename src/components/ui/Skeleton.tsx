export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted/60 animate-pulse rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-5 py-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-14 shrink-0 rounded-lg" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-2xl border">
      <div className="bg-muted/30 flex gap-4 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex animate-pulse gap-4 px-5 py-3.5">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={`h-3 ${j === 0 ? "w-1/4" : "flex-1"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border-border animate-pulse space-y-2 rounded-2xl border px-5 py-4"
        >
          <Skeleton className="h-2.5 w-1/3" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-2 w-1/4" />
        </div>
      ))}
    </div>
  );
}
