"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Milk, Plus, Loader2, TrendingUp } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type MilkRow = {
  id: string;
  recorded_on: string;
  shift: "am" | "pm" | "midday";
  liters: number;
  fat_pct: number | null;
  protein_pct: number | null;
  animals: { tag: string; name: string | null } | null;
};

const SHIFT_LABEL: Record<string, string> = { am: "AM", pm: "PM", midday: "Mediodía" };

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

function AddRecordModal({
  farmId,
  profileId,
  onClose,
}: {
  farmId: string;
  profileId: string;
  onClose: () => void;
}) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    liters: "",
    shift: "am" as "am" | "pm" | "midday",
    recorded_on: new Date().toISOString().slice(0, 10),
    animal_id: "",
    fat_pct: "",
    protein_pct: "",
    notes: "",
  });

  const animalsQuery = useQuery<{ id: string; tag: string; name: string | null }[]>({
    queryKey: ["animals-select", farmId],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId)
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Sin sesión");
      if (!form.liters || Number(form.liters) <= 0) throw new Error("Litros inválidos");
      const { error } = await supabase.from("milk_records").insert({
        farm_id: farmId,
        recorded_by: profileId,
        animal_id: form.animal_id || null,
        liters: Number(form.liters),
        shift: form.shift,
        recorded_on: form.recorded_on,
        fat_pct: form.fat_pct ? Number(form.fat_pct) : null,
        protein_pct: form.protein_pct ? Number(form.protein_pct) : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milk-production"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-5 text-base font-bold">Registrar producción</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Litros *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.liters}
                onChange={(e) => setForm((p) => ({ ...p, liters: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Turno *</label>
              <select
                className={inputClass}
                value={form.shift}
                onChange={(e) =>
                  setForm((p) => ({ ...p, shift: e.target.value as typeof form.shift }))
                }
              >
                <option value="am">Mañana (AM)</option>
                <option value="midday">Mediodía</option>
                <option value="pm">Tarde (PM)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Fecha *</label>
            <input
              type="date"
              className={inputClass}
              value={form.recorded_on}
              onChange={(e) => setForm((p) => ({ ...p, recorded_on: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Animal (opcional)</label>
            <select
              className={inputClass}
              value={form.animal_id}
              onChange={(e) => setForm((p) => ({ ...p, animal_id: e.target.value }))}
            >
              <option value="">— Producción total de finca —</option>
              {(animalsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>% Grasa</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                value={form.fat_pct}
                onChange={(e) => setForm((p) => ({ ...p, fat_pct: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>% Proteína</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                value={form.protein_pct}
                onChange={(e) => setForm((p) => ({ ...p, protein_pct: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <input
              className={inputClass}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          {mutation.error && (
            <p className="text-accent text-sm">{(mutation.error as Error).message}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProduccionPage() {
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [showModal, setShowModal] = useState(false);
  const [days, setDays] = useState(30);

  const recordsQuery = useQuery<MilkRow[]>({
    queryKey: ["milk-production", farmId, days],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("milk_records")
        .select("id, recorded_on, shift, liters, fat_pct, protein_pct, animals(tag, name)")
        .eq("farm_id", farmId)
        .gte("recorded_on", since)
        .order("recorded_on", { ascending: false })
        .order("shift");
      if (error) throw error;
      return (data ?? []) as unknown as MilkRow[];
    },
  });

  const records = recordsQuery.data ?? [];
  const totalLiters = records.reduce((s, r) => s + Number(r.liters), 0);
  const avgPerDay = days > 0 ? totalLiters / days : 0;

  // Group by day for summary
  const byDay = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.recorded_on] = (acc[r.recorded_on] ?? 0) + Number(r.liters);
    return acc;
  }, {});
  const days7 = Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" });

  return (
    <DashboardShell
      title="Producción de leche"
      subtitle="Producción"
      action={
        profileId && farmId ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Registrar
          </button>
        ) : null
      }
    >
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card border-border rounded-2xl border p-5">
          <div className="bg-primary/10 text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-xl">
            <Milk className="h-5 w-5" />
          </div>
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {totalLiters.toFixed(1)} L
          </div>
          <div className="text-foreground/60 mt-1 text-xs">Total últimos {days} días</div>
        </div>
        <div className="bg-card border-border rounded-2xl border p-5">
          <div className="bg-secondary/10 text-secondary mb-3 flex h-10 w-10 items-center justify-center rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {avgPerDay.toFixed(1)} L
          </div>
          <div className="text-foreground/60 mt-1 text-xs">Promedio diario</div>
        </div>
        <div className="bg-card border-border rounded-2xl border p-5">
          <div className="bg-accent/10 text-accent mb-3 flex h-10 w-10 items-center justify-center rounded-xl">
            <Milk className="h-5 w-5" />
          </div>
          <div className="text-foreground text-2xl font-bold tabular-nums">{records.length}</div>
          <div className="text-foreground/60 mt-1 text-xs">Registros en el período</div>
        </div>
      </div>

      {/* Últimos 7 días resumen */}
      {days7.length > 0 && (
        <div className="bg-card border-border rounded-2xl border p-5">
          <h2 className="text-foreground mb-4 text-sm font-bold">Últimos 7 días</h2>
          <div className="flex items-end gap-2">
            {days7.reverse().map(([date, liters]) => {
              const max = Math.max(...days7.map(([, l]) => l));
              const pct = max > 0 ? (liters / max) * 100 : 0;
              return (
                <div key={date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-foreground/70 text-xs tabular-nums">
                    {liters.toFixed(0)}
                  </span>
                  <div className="bg-muted w-full rounded-t-md" style={{ height: 60 }}>
                    <div
                      className="bg-primary w-full rounded-t-md transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-foreground/50 text-[10px]">{fmt(date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla de registros */}
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Registros</h2>
            <p className="text-foreground/60 text-xs">
              {recordsQuery.isLoading ? "Cargando…" : `${records.length} registros`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-foreground/60 text-xs">Ver:</span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  days === d ? "bg-primary/10 text-primary" : "text-foreground/60 hover:bg-muted"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {!recordsQuery.isLoading && records.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Milk className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">Sin registros en este período.</p>
          </div>
        )}

        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  <th className="px-5 py-3 text-left font-medium">Turno</th>
                  <th className="px-5 py-3 text-left font-medium">Animal</th>
                  <th className="px-5 py-3 text-right font-medium">Litros</th>
                  <th className="px-5 py-3 text-right font-medium">Grasa</th>
                  <th className="px-5 py-3 text-right font-medium">Proteína</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {fmt(r.recorded_on)}
                    </td>
                    <td className="text-foreground/70 px-5 py-3">
                      {SHIFT_LABEL[r.shift] ?? r.shift}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 font-mono text-xs">
                      {r.animals ? (
                        `${r.animals.tag}${r.animals.name ? ` · ${r.animals.name}` : ""}`
                      ) : (
                        <span className="text-foreground/40">Finca</span>
                      )}
                    </td>
                    <td className="text-foreground px-5 py-3 text-right font-semibold tabular-nums">
                      {Number(r.liters).toFixed(2)}
                    </td>
                    <td className="text-foreground/60 px-5 py-3 text-right tabular-nums">
                      {r.fat_pct ? `${r.fat_pct}%` : "—"}
                    </td>
                    <td className="text-foreground/60 px-5 py-3 text-right tabular-nums">
                      {r.protein_pct ? `${r.protein_pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && farmId && profileId && (
        <AddRecordModal farmId={farmId} profileId={profileId} onClose={() => setShowModal(false)} />
      )}
    </DashboardShell>
  );
}
