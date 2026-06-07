"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Milk,
  Plus,
  Loader2,
  TrendingUp,
  Search,
  X,
  Droplets,
  FlaskConical,
  CalendarDays,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { toast } from "sonner";

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
const SHIFT_STYLE: Record<string, string> = {
  am: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  midday: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  pm: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground/70 mb-1.5 block text-xs font-medium";

const fmt = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MilkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border-border rounded-xl border px-3 py-2 shadow-lg text-xs">
      <div className="text-foreground/60 mb-1">{label}</div>
      <div className="text-secondary font-bold">{Number(payload[0]?.value ?? 0).toFixed(1)} L</div>
    </div>
  );
}

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
      toast.success("Guardado correctamente");
      onClose();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-foreground text-base font-bold">Registrar producción</h2>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Shift selector */}
          <div>
            <label className={labelClass}>Turno *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["am", "midday", "pm"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, shift: s }))}
                  className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                    form.shift === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-primary/40"
                  }`}
                >
                  {SHIFT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Litros *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                placeholder="0.00"
                value={form.liters}
                onChange={(e) => setForm((p) => ({ ...p, liters: e.target.value }))}
              />
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
                placeholder="0.00"
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
                placeholder="0.00"
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
              placeholder="Observaciones opcionales…"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50"
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
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    if (recordsQuery.error)
      toast.error("Error al cargar: " + (recordsQuery.error as Error).message);
  }, [recordsQuery.error]);

  const records = recordsQuery.data ?? [];

  // Filtered records
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        (r.animals?.tag ?? "finca").toLowerCase().includes(q) ||
        (r.animals?.name ?? "").toLowerCase().includes(q) ||
        r.recorded_on.includes(q)
    );
  }, [records, search]);

  const totalLiters = records.reduce((s, r) => s + Number(r.liters), 0);
  const avgPerDay = days > 0 ? totalLiters / days : 0;
  const avgFat =
    records.filter((r) => r.fat_pct).reduce((s, r) => s + Number(r.fat_pct ?? 0), 0) /
    (records.filter((r) => r.fat_pct).length || 1);
  const avgProtein =
    records.filter((r) => r.protein_pct).reduce((s, r) => s + Number(r.protein_pct ?? 0), 0) /
    (records.filter((r) => r.protein_pct).length || 1);

  // Area chart data — group by day
  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const r of records) {
      byDay[r.recorded_on] = (byDay[r.recorded_on] ?? 0) + Number(r.liters);
    }
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, litros]) => ({ label: fmt(date), litros }));
  }, [records]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Milk,
            label: `Total últimos ${days} días`,
            value: `${totalLiters.toFixed(1)} L`,
            color: "bg-secondary/10 text-secondary",
          },
          {
            icon: TrendingUp,
            label: "Promedio diario",
            value: `${avgPerDay.toFixed(1)} L`,
            color: "bg-primary/10 text-primary",
          },
          {
            icon: Droplets,
            label: "% Grasa promedio",
            value: records.some((r) => r.fat_pct) ? `${avgFat.toFixed(2)}%` : "—",
            color: "bg-amber-500/10 text-amber-400",
          },
          {
            icon: FlaskConical,
            label: "% Proteína promedio",
            value: records.some((r) => r.protein_pct) ? `${avgProtein.toFixed(2)}%` : "—",
            color: "bg-purple-500/10 text-purple-400",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border-border rounded-2xl border p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${kpi.color}`}
            >
              <kpi.icon className="h-5 w-5" />
            </div>
            <div className="text-foreground text-2xl font-bold tabular-nums">{kpi.value}</div>
            <div className="text-foreground/50 mt-1 text-xs">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Area chart */}
      {chartData.length > 1 && (
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-base font-bold">Tendencia de producción</h2>
              <p className="text-foreground/50 text-xs mt-0.5">
                Últimos 14 días registrados · litros/día
              </p>
            </div>
            <CalendarDays className="text-foreground/20 h-4 w-4" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="milkAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip content={<MilkTooltip />} />
              <Area
                type="monotone"
                dataKey="litros"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#milkAreaGrad)"
                dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border border-b px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-foreground text-base font-bold">Registros</h2>
              <p className="text-foreground/50 text-xs">
                {recordsQuery.isLoading
                  ? "Cargando…"
                  : `${filtered.length} de ${records.length} registros`}
              </p>
            </div>
            {/* Period filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-foreground/50 text-xs mr-1">Período:</span>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    days === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="text-foreground/40 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por animal o fecha…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/50 border-border text-foreground placeholder:text-foreground/30 focus:border-primary w-full rounded-xl border py-2 pr-3 pl-8 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* Skeleton */}
        {recordsQuery.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="bg-muted/40 h-5 w-14 animate-pulse rounded-full" />
                <div className="bg-muted/30 h-3 w-20 animate-pulse rounded" />
                <div className="bg-muted/20 ml-auto h-3 w-12 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {!recordsQuery.isLoading && records.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="bg-muted/40 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Milk className="text-foreground/30 h-6 w-6" />
            </div>
            <p className="text-foreground/60 text-sm font-medium">Sin registros en este período</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-foreground/50 border-border border-b text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  <th className="px-5 py-3 text-left font-medium">Turno</th>
                  <th className="px-5 py-3 text-left font-medium">Animal</th>
                  <th className="px-5 py-3 text-right font-medium">Litros</th>
                  <th className="px-5 py-3 text-right font-medium">Grasa</th>
                  <th className="px-5 py-3 text-right font-medium">Proteína</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-foreground/70 tabular-nums text-sm">
                        {fmt(r.recorded_on)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SHIFT_STYLE[r.shift] ?? "bg-muted text-foreground/60 border-border"}`}
                      >
                        {SHIFT_LABEL[r.shift] ?? r.shift}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.animals ? (
                        <span className="text-foreground font-mono text-xs font-semibold">
                          {r.animals.tag}
                          {r.animals.name && (
                            <span className="text-foreground/50 font-normal">
                              {" "}
                              · {r.animals.name}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="bg-muted/60 text-foreground/50 rounded-lg px-2 py-0.5 text-xs">
                          Finca
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-foreground font-bold tabular-nums">
                        {Number(r.liters).toFixed(2)}
                        <span className="text-foreground/40 ml-1 text-xs font-normal">L</span>
                      </span>
                    </td>
                    <td className="text-foreground/60 px-5 py-3.5 text-right tabular-nums text-sm">
                      {r.fat_pct ? `${r.fat_pct}%` : <span className="text-foreground/30">—</span>}
                    </td>
                    <td className="text-foreground/60 px-5 py-3.5 text-right tabular-nums text-sm">
                      {r.protein_pct ? (
                        `${r.protein_pct}%`
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-border text-foreground/40 flex items-center justify-between border-t px-5 py-3 text-xs">
            <span>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
            {search && (
              <button onClick={() => setSearch("")} className="text-primary hover:underline">
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && farmId && profileId && (
        <AddRecordModal farmId={farmId} profileId={profileId} onClose={() => setShowModal(false)} />
      )}
    </DashboardShell>
  );
}
