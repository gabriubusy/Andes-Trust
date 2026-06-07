"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { FileDown, FileText, Loader2, Droplets } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

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

export default function ReportesPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const { getAccessToken } = usePrivy();

  // ── Estado INSAI ─────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Estado Calidad Láctea ─────────────────────────────────────────────
  const [milkFrom, setMilkFrom] = useState("");
  const [milkTo, setMilkTo] = useState("");
  const [milkSelected, setMilkSelected] = useState<Set<string>>(new Set());

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

  return (
    <DashboardShell title="Reportes" subtitle="Cumplimiento INSAI · Calidad Láctea">
      <div className="space-y-8">
        {/* ── Fila 1: INSAI + Historial ───────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Generador INSAI */}
          <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              <h3 className="text-foreground text-base font-semibold">Reporte INSAI</h3>
            </div>
            <p className="text-foreground/50 text-xs">
              Inventario sanitario de animales para cumplimiento regulatorio.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-foreground/60 text-xs">Desde</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/60 text-xs">Hasta</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                />
              </label>
            </div>

            <div>
              <div className="text-foreground/60 mb-2 flex items-center justify-between text-xs">
                <span>Animales ({selected.size || "todos"})</span>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="text-primary text-xs">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="border-border max-h-52 overflow-y-auto rounded-lg border">
                {animals.map((a) => (
                  <label
                    key={a.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggle(a.id, setSelected)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{a.tag}</span>
                    {a.name && <span className="text-foreground/60">{a.name}</span>}
                  </label>
                ))}
                {animals.length === 0 && (
                  <div className="text-foreground/50 px-3 py-4 text-center text-sm">
                    Sin animales
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => generateInsai.mutate()}
              disabled={generateInsai.isPending}
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {generateInsai.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Generar PDF
            </button>
            {generateInsai.isError && (
              <p className="text-xs text-red-500">{(generateInsai.error as Error)?.message}</p>
            )}
          </div>

          {/* Historial */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-4 text-base font-semibold">
              Reportes INSAI generados
            </h3>
            <ul className="space-y-3 text-sm">
              {(reportsQuery.data ?? []).map((r) => (
                <li
                  key={r.id}
                  className="border-border flex items-start gap-2 border-b pb-2 last:border-0"
                >
                  <FileText className="text-foreground/40 mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-xs font-medium">
                      {new Date(r.created_at).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-foreground/50 text-xs">
                      {r.animal_ids.length} animal(es)
                      {r.date_from || r.date_to
                        ? ` · ${r.date_from ?? "—"}→${r.date_to ?? "—"}`
                        : ""}
                    </div>
                    {r.payload_hash && (
                      <code className="text-foreground/40 truncate text-[10px]">
                        {r.payload_hash.slice(0, 22)}…
                      </code>
                    )}
                  </div>
                </li>
              ))}
              {reportsQuery.data?.length === 0 && (
                <p className="text-foreground/50 text-sm">Sin reportes aún</p>
              )}
            </ul>
          </div>
        </div>

        {/* ── Fila 2: Calidad Láctea ──────────────────────────────────────── */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="text-primary h-5 w-5" />
            <h3 className="text-foreground text-base font-semibold">Reporte de Calidad Láctea</h3>
          </div>
          <p className="text-foreground/50 mb-5 text-xs">
            Análisis de producción, grasa %, proteína % y SCC por período. Clasifica la leche según
            COVENIN 903.
          </p>

          <div className="grid gap-6 sm:grid-cols-[auto_1fr] items-start">
            {/* Filtros */}
            <div className="space-y-4 min-w-[220px]">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-foreground/60 text-xs">Desde</span>
                  <input
                    type="date"
                    value={milkFrom}
                    onChange={(e) => setMilkFrom(e.target.value)}
                    className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground/60 text-xs">Hasta</span>
                  <input
                    type="date"
                    value={milkTo}
                    onChange={(e) => setMilkTo(e.target.value)}
                    className="border-border bg-background text-foreground mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                  />
                </label>
              </div>

              <button
                onClick={() => generateMilk.mutate()}
                disabled={generateMilk.isPending}
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 w-full justify-center"
              >
                {generateMilk.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {generateMilk.isPending ? "Generando…" : "Generar PDF"}
              </button>
              {generateMilk.isError && (
                <p className="text-xs text-red-500">{(generateMilk.error as Error)?.message}</p>
              )}
              {generateMilk.isSuccess && (
                <p className="text-xs text-green-600">PDF descargado correctamente.</p>
              )}
            </div>

            {/* Selector de animales */}
            <div>
              <div className="text-foreground/60 mb-2 flex items-center justify-between text-xs">
                <span>Filtrar por animal ({milkSelected.size || "todos"})</span>
                {milkSelected.size > 0 && (
                  <button
                    onClick={() => setMilkSelected(new Set())}
                    className="text-primary text-xs"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="border-border max-h-40 overflow-y-auto rounded-lg border">
                {animals.map((a) => (
                  <label
                    key={a.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={milkSelected.has(a.id)}
                      onChange={() => toggle(a.id, setMilkSelected)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{a.tag}</span>
                    {a.name && <span className="text-foreground/60">{a.name}</span>}
                  </label>
                ))}
                {animals.length === 0 && (
                  <div className="text-foreground/50 px-3 py-4 text-center text-sm">
                    Sin animales
                  </div>
                )}
              </div>
              <p className="text-foreground/40 mt-1 text-[11px]">
                Si no seleccionas animales, el reporte incluye toda la producción de la finca.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
