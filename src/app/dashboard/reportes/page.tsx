"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { FileDown, FileText, Loader2 } from "lucide-react";
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

export default function ReportesPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const { getAccessToken } = usePrivy();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const generate = useMutation({
    mutationFn: async () => {
      if (!farmId) throw new Error("Sin finca");
      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error("Sin token");
      const res = await fetch("/api/reports/insai", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: farmId,
          animal_ids: selected.size ? Array.from(selected) : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      });
      if (!res.ok) throw new Error("Generación falló");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insai-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => reportsQuery.refetch(),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <DashboardShell title="Reportes" subtitle="Cumplimiento INSAI · Trazabilidad">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Generador */}
        <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
          <h3 className="text-foreground text-base font-semibold">Generar reporte INSAI</h3>

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
            <div className="border-border max-h-64 overflow-y-auto rounded-lg border">
              {(animalsQuery.data ?? []).map((a) => (
                <label
                  key={a.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{a.tag}</span>
                  {a.name && <span className="text-foreground/60">{a.name}</span>}
                </label>
              ))}
              {animalsQuery.data?.length === 0 && (
                <div className="text-foreground/50 px-3 py-4 text-center text-sm">Sin animales</div>
              )}
            </div>
          </div>

          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Generar PDF
          </button>
          {generate.isError && (
            <p className="text-xs text-red-500">{(generate.error as Error)?.message}</p>
          )}
        </div>

        {/* Historial */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <h3 className="text-foreground mb-4 text-base font-semibold">Reportes generados</h3>
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
                    {r.date_from || r.date_to ? ` · ${r.date_from ?? "—"}→${r.date_to ?? "—"}` : ""}
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
    </DashboardShell>
  );
}
