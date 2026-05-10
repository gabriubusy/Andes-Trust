import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted/60 animate-pulse rounded-lg", className)} />;
}

/** Fila de tabla esqueleto */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-border border-t">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Tarjeta KPI esqueleto */
export function SkeletonKpi() {
  return (
    <div className="bg-card border-border rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

/** Lista de items esqueleto */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bloque de formulario esqueleto */
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Sección con título + contenido esqueleto */
export function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
