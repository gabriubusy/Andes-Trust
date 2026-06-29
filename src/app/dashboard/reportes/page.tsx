"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import {
  FileDown,
  FileText,
  Loader2,
  Droplets,
  History,
  CheckSquare,
  Square,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { toast } from "sonner";

type AnimalLite = { id: string; tag: string; name: string | null };
type ReportRow = {
  id: string;
  created_at: string;
  date_from: string | null;
  date_to: string | null;
  payload_hash: string | null;
  animal_ids: string[];
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const dateInputClass =
  "border-border bg-muted/40 text-foreground hover:border-foreground/20 focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-xl border px-3 py-2 text-sm outline-none transition focus:bg-background focus:ring-2";

function AnimalSelector({
  animals,
  selected,
  onToggle,
  onClear,
}: {
  animals: AnimalLite[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const allSelected = animals.length > 0 && selected.size === animals.length;
  const toggleAll = () => {
    if (allSelected) onClear();
    else
      animals.forEach((a) => {
        if (!selected.has(a.id)) onToggle(a.id);
      });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-foreground/55 text-xs font-semibold uppercase tracking-wide">
          Animales{" "}
          <span className="text-foreground/35 normal-case">
            (
            {selected.size === 0
              ? "todos"
              : `${selected.size} seleccionado${selected.size > 1 ? "s" : ""}`}
            )
          </span>
        </span>
        <div className="flex gap-2">
          {animals.length > 0 && (
            <button onClick={toggleAll} className="text-primary text-xs hover:underline">
              {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={onClear} className="text-foreground/40 text-xs hover:underline">
              Limpiar
            </button>
          )}
        </div>
      </div>
      <div className="border-border bg-muted/20 max-h-52 overflow-y-auto rounded-xl border">
        {animals.length === 0 && (
          <div className="text-foreground/40 px-4 py-6 text-center text-sm">
            Sin animales registrados
          </div>
        )}
        {animals.map((a) => {
          const checked = selected.has(a.id);
          return (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0 transition-colors ${
                checked ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              {checked ? (
                <CheckSquare className="text-primary h-4 w-4 shrink-0" />
              ) : (
                <Square className="text-foreground/30 h-4 w-4 shrink-0" />
              )}
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(a.id)}
              />
              <span className="text-foreground font-mono text-xs font-semibold">{a.tag}</span>
              {a.name && <span className="text-foreground/50 truncate text-xs">{a.name}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const { getAccessToken } = usePrivy();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [milkFrom, setMilkFrom] = useState("");
  const [milkTo, setMilkTo] = useState("");
  const [milkSelected, setMilkSelected] = useState<Set<string>>(new Set());

  const HISTORY_PAGE_SIZE = 5;
  const [historyPage, setHistoryPage] = useState(1);

  const animalsQuery = useQuery<AnimalLite[]>({
    queryKey: ["animals-lite", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId!)
        .order("tag");
      if (error) throw error;
      return data ?? [];
    },
  });

  const reportsQuery = useQuery<ReportRow[]>({
    queryKey: ["regulatory-reports", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("regulatory_reports")
        .select("id, created_at, date_from, date_to, payload_hash, animal_ids")
        .eq("farm_id", farmId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const generateInsai = useMutation({
    mutationFn: async () => {
      if (!farmId) throw new Error("Sin finca");
      const token = await getAccessToken();
      if (!token) throw new Error("Sin token");
      const res = await fetch("/api/reports/insai", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: farmId,
          animal_ids: selected.size ? Array.from(selected) : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Generación falló");
      }
      downloadBlob(await res.blob(), `insai-${Date.now()}.pdf`);
    },
    onSuccess: () => reportsQuery.refetch(),
    onError: (err) => toast.error((err as Error).message),
  });

  const generateMilk = useMutation({
    mutationFn: async () => {
      if (!farmId) throw new Error("Sin finca");
      const token = await getAccessToken();
      if (!token) throw new Error("Sin token");
      const res = await fetch("/api/reports/calidad-lactea", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: farmId,
          animal_ids: milkSelected.size ? Array.from(milkSelected) : undefined,
          date_from: milkFrom || undefined,
          date_to: milkTo || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error === "no_records"
            ? "No hay registros de leche en ese período"
            : (err?.error ?? "Generación falló")
        );
      }
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = cd.match(/filename="(.+?)"/)?.[1] ?? `calidad-lactea-${Date.now()}.pdf`;
      downloadBlob(await res.blob(), name);
    },
    onError: (err) => toast.error((err as Error).message),
    onSuccess: () => toast.success("Reporte descargado"),
  });

  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const animals = animalsQuery.data ?? [];

  const reports = reportsQuery.data ?? [];
  const historyTotalPages = Math.max(1, Math.ceil(reports.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedReports = reports.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );

  return (
    <DashboardShell title="Reportes" subtitle="Cumplimiento · Calidad">
      <div className="space-y-6">
        {/* ── Row 1: INSAI + History ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* INSAI generator */}
          <div className="bg-card border-border rounded-2xl border p-6 space-y-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="from-primary/20 to-primary/5 border-primary/20 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-linear-to-br">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-foreground text-base font-bold">Reporte INSAI</h3>
                <p className="text-foreground/50 text-xs mt-0.5">
                  Inventario sanitario de animales para cumplimiento regulatorio.
                </p>
              </div>
            </div>

            {/* Date range */}
            <div className="border-border bg-muted/20 rounded-xl border p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <CalendarRange className="text-foreground/40 h-3.5 w-3.5" />
                <span className="text-foreground/55 text-xs font-semibold uppercase tracking-wide">
                  Rango de fechas <span className="text-foreground/35 normal-case">(opcional)</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground/50 mb-1 block text-xs">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={dateInputClass}
                  />
                </div>
                <div>
                  <label className="text-foreground/50 mb-1 block text-xs">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={dateInputClass}
                  />
                </div>
              </div>
            </div>

            <AnimalSelector
              animals={animals}
              selected={selected}
              onToggle={(id) => toggle(id, setSelected)}
              onClear={() => setSelected(new Set())}
            />

            <button
              onClick={() => generateInsai.mutate()}
              disabled={generateInsai.isPending}
              className="bg-primary hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/20 disabled:opacity-50 transition-colors"
            >
              {generateInsai.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {generateInsai.isPending ? "Generando PDF…" : "Descargar PDF"}
            </button>

            <p className="text-foreground/40 text-xs">
              Sin animales seleccionados: incluye todo el inventario activo de la finca.
            </p>
          </div>

          {/* History */}
          <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="bg-muted/60 text-foreground/50 flex h-7 w-7 items-center justify-center rounded-lg">
                <History className="h-4 w-4" />
              </div>
              <h3 className="text-foreground text-base font-bold">Historial INSAI</h3>
            </div>

            {reportsQuery.isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-muted/30 h-12 animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {!reportsQuery.isLoading && (reportsQuery.data?.length ?? 0) === 0 && (
              <div className="text-foreground/40 flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm">
                Sin reportes generados
              </div>
            )}

            <ul className="space-y-2">
              {pagedReports.map((r) => (
                <li
                  key={r.id}
                  className="bg-muted/20 border-border hover:border-primary/30 hover:bg-muted/40 rounded-xl border p-3 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="text-primary/50 mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-xs font-semibold">
                        {new Date(r.created_at).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-foreground/50 mt-0.5 text-xs">
                        {r.animal_ids.length} animal{r.animal_ids.length !== 1 ? "es" : ""}
                        {(r.date_from || r.date_to) && (
                          <span>
                            {" "}
                            · {r.date_from ?? "—"} → {r.date_to ?? "—"}
                          </span>
                        )}
                      </div>
                      {r.payload_hash && (
                        <code className="text-foreground/30 mt-0.5 block truncate text-[10px]">
                          {r.payload_hash.slice(0, 24)}…
                        </code>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {reports.length > HISTORY_PAGE_SIZE && (
              <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-foreground/40 text-xs">
                  Página {safeHistoryPage} de {historyTotalPages} · {reports.length} reportes
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={safeHistoryPage <= 1}
                    className="border-border text-foreground/60 hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={safeHistoryPage >= historyTotalPages}
                    className="border-border text-foreground/60 hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Milk Quality ── */}
        <div className="bg-card border-border rounded-2xl border p-6 space-y-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-linear-to-br from-blue-500/20 to-blue-500/5 text-blue-400">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-bold">Reporte de Calidad Láctea</h3>
              <p className="text-foreground/50 text-xs mt-0.5">
                Análisis de producción, grasa %, proteína % y SCC por período. Clasifica según
                COVENIN 903.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Dates */}
            <div className="space-y-4">
              <div className="border-border bg-muted/20 rounded-xl border p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <CalendarRange className="text-foreground/40 h-3.5 w-3.5" />
                  <span className="text-foreground/55 text-xs font-semibold uppercase tracking-wide">
                    Rango de fechas{" "}
                    <span className="text-foreground/35 normal-case">(opcional)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-foreground/50 mb-1 block text-xs">Desde</label>
                    <input
                      type="date"
                      value={milkFrom}
                      onChange={(e) => setMilkFrom(e.target.value)}
                      className={dateInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-foreground/50 mb-1 block text-xs">Hasta</label>
                    <input
                      type="date"
                      value={milkTo}
                      onChange={(e) => setMilkTo(e.target.value)}
                      className={dateInputClass}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => generateMilk.mutate()}
                disabled={generateMilk.isPending}
                className="bg-blue-500 hover:bg-blue-500/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-colors"
              >
                {generateMilk.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {generateMilk.isPending ? "Generando PDF…" : "Descargar PDF"}
              </button>

              <p className="text-foreground/40 text-xs">
                Sin animales seleccionados: incluye toda la producción de la finca.
              </p>
            </div>

            {/* Animal selector */}
            <AnimalSelector
              animals={animals}
              selected={milkSelected}
              onToggle={(id) => toggle(id, setMilkSelected)}
              onClear={() => setMilkSelected(new Set())}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
