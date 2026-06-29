"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginación de cliente reutilizable.
 *
 * Uso:
 *   const { pageItems, page, setPage, totalPages, total } = usePagination(filtered, 20);
 *   ...render pageItems...
 *   <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
 */
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return { pageItems, page: safePage, setPage, totalPages, total, pageSize };
}

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
  /** Etiqueta singular del elemento, ej. "animal". */
  noun?: string;
  className?: string;
};

export default function Pagination({
  page,
  totalPages,
  total,
  onChange,
  noun = "elemento",
  className = "",
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`border-border mt-4 flex items-center justify-between border-t pt-3 ${className}`}
    >
      <span className="text-foreground/40 text-xs">
        Página {page} de {totalPages} · {total} {noun}
        {total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="border-border text-foreground/60 hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="border-border text-foreground/60 hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
