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
  Pencil,
  Trash2,
  ShieldCheck,
  Award,
  ExternalLink,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Pagination, { usePagination } from "@/components/Pagination";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { canWrite } from "@/lib/permissions";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

type MilkRow = {
  id: string;
  animal_id: string | null;
  recorded_on: string;
  shift: "am" | "pm" | "midday";
  liters: number;
  fat_pct: number | null;
  protein_pct: number | null;
  notes: string | null;
  animals: { tag: string; name: string | null } | null;
};

const SHIFT_LABEL: Record<string, string> = { am: "AM", pm: "PM", midday: "Mediodía" };
// Paleta categórica validada (CVD-safe en claro y oscuro) para el desglose por turno.
const SHIFT_CHART_COLOR: Record<string, string> = {
  am: "#3987e5",
  midday: "#d55181",
  pm: "#008300",
};
const SHIFT_STYLE: Record<string, string> = {
  am: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  midday: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  pm: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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
    <div className="bg-card border-border rounded-xl border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground/60 mb-1">{label}</div>
      <div className="text-secondary font-bold">{Number(payload[0]?.value ?? 0).toFixed(1)} L</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShiftTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const v = Number(p?.value ?? 0);
  const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
  return (
    <div className="bg-card border-border rounded-xl border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground/70 mb-0.5 font-semibold">{p?.name}</div>
      <div className="text-foreground/60">
        {v.toFixed(1)} L · {pct}%
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnimalTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border-border rounded-xl border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground/70 mb-0.5 font-semibold">{payload[0]?.payload?.name}</div>
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
    onError: (err) => toast.error(friendlyErrorMessage(err)),
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
                max={new Date().toISOString().slice(0, 10)}
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

function EditRecordModal({
  record,
  farmId,
  onClose,
}: {
  record: MilkRow;
  farmId: string;
  onClose: () => void;
}) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    liters: String(record.liters),
    shift: record.shift,
    recorded_on: record.recorded_on,
    animal_id: record.animal_id ?? "",
    fat_pct: record.fat_pct != null ? String(record.fat_pct) : "",
    protein_pct: record.protein_pct != null ? String(record.protein_pct) : "",
    notes: record.notes ?? "",
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
        .order("tag");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Sin sesión");
      if (!form.liters || Number(form.liters) <= 0) throw new Error("Litros inválidos");
      const { error } = await supabase
        .from("milk_records")
        .update({
          animal_id: form.animal_id || null,
          liters: Number(form.liters),
          shift: form.shift,
          recorded_on: form.recorded_on,
          fat_pct: form.fat_pct ? Number(form.fat_pct) : null,
          protein_pct: form.protein_pct ? Number(form.protein_pct) : null,
          notes: form.notes || null,
        })
        .eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milk-production"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Registro actualizado");
      onClose();
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Sin sesión");
      const { error } = await supabase.from("milk_records").delete().eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milk-production"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Registro eliminado");
      onClose();
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-foreground text-base font-bold">Editar registro</h2>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
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
                value={form.liters}
                onChange={(e) => setForm((p) => ({ ...p, liters: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                className={inputClass}
                max={new Date().toISOString().slice(0, 10)}
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
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Eliminar
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}

type MilkQualityCert = {
  id: string;
  period_start: string;
  period_end: string;
  fat_pct: number | null;
  protein_pct: number | null;
  scc_thousands: number | null;
  total_liters: number;
  grade: "A" | "B" | "C";
  payload_hash: string;
  tx_hash: string | null;
  chain_id: number | null;
  created_at: string;
};

const GRADE_STYLE = {
  A: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    label: "Calidad A · Óptima",
  },
  B: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    label: "Calidad B · Aceptable",
  },
  C: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    label: "Calidad C · Observación",
  },
};

function CertifyModal({
  farmId,
  records,
  onClose,
  onSuccess,
}: {
  farmId: string;
  records: MilkRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    grade: "A" | "B" | "C";
    txHash: string | null;
    avgFat: number | null;
    avgProtein: number | null;
    avgSccThousands: number | null;
    totalLiters: number;
    recordCount: number;
  } | null>(null);

  const handleCertify = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/milk-quality/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farm_id: farmId,
          period_start: periodStart,
          period_end: periodEnd,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al certificar");
      setResult(data);
      onSuccess();
    } catch (err) {
      toast.error(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const g = result ? GRADE_STYLE[result.grade] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Award className="text-primary h-4 w-4" />
            </div>
            <h2 className="text-foreground text-base font-bold">Certificar calidad láctea</h2>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <p className="text-foreground/50 text-xs leading-relaxed">
              Se evaluarán los registros del período según estándares{" "}
              <strong className="text-foreground/70">COVENIN 903</strong> y el resultado se anclará
              en blockchain de forma inmutable.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Inicio del período</label>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Fin del período</label>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  min={periodStart}
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Observaciones (opcional)</label>
              <textarea
                className={inputClass}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre el período…"
              />
            </div>
            {/* Mini chart del período */}
            {(() => {
              const periodRecords = records.filter(
                (r) => r.recorded_on >= periodStart && r.recorded_on <= periodEnd
              );
              const byDay: Record<string, number> = {};
              for (const r of periodRecords) {
                byDay[r.recorded_on] = (byDay[r.recorded_on] ?? 0) + Number(r.liters);
              }
              const data = Object.entries(byDay)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, litros]) => ({ label: fmt(date), litros }));
              if (data.length < 2) return null;
              return (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-foreground/40 mb-2 text-[10px] font-medium tracking-wider uppercase">
                    Producción del período · {periodRecords.length} registros
                  </p>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={data} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="certAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<MilkTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="litros"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#certAreaGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            <div className="bg-muted/30 border-border flex items-start gap-2 rounded-xl border p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-foreground/50 text-xs">
                Esta acción es <strong className="text-foreground/70">irreversible</strong> — el
                grado queda registrado on-chain. Verifica que los datos del período sean completos.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="border-border text-foreground/70 flex-1 rounded-xl border px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCertify}
                disabled={loading || !periodStart || !periodEnd}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {loading ? "Certificando…" : "Certificar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`${g!.bg} ${g!.border} space-y-2 rounded-2xl border p-5 text-center`}>
              <div className={`text-4xl font-black ${g!.text}`}>{result.grade}</div>
              <div className={`text-sm font-semibold ${g!.text}`}>
                {GRADE_STYLE[result.grade].label}
              </div>
              <div className="text-foreground/40 text-xs">Evaluado según COVENIN 903</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Litros totales", `${result.totalLiters.toFixed(1)} L`],
                ["Registros", result.recordCount.toString()],
                ["% Grasa prom.", result.avgFat != null ? `${result.avgFat.toFixed(2)}%` : "—"],
                [
                  "% Proteína prom.",
                  result.avgProtein != null ? `${result.avgProtein.toFixed(2)}%` : "—",
                ],
                [
                  "SCC prom.",
                  result.avgSccThousands != null ? `${result.avgSccThousands}k cél/mL` : "—",
                ],
                ["Estado blockchain", result.txHash ? "✓ Anclado" : "Pendiente"],
              ].map(([label, value]) => (
                <div key={label} className="bg-muted/30 rounded-xl p-2.5">
                  <div className="text-foreground/40 mb-0.5">{label}</div>
                  <div className="text-foreground font-semibold">{value}</div>
                </div>
              ))}
            </div>
            {result.txHash && (
              <a
                href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Ver en Polygonscan
              </a>
            )}
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProduccionPage() {
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const canEdit = canWrite(farmQuery.data?.role);
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  const retryAnchor = useMutation({
    mutationFn: async (certId: string) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/milk-quality/${certId}/anchor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === "relayer_not_configured"
            ? "El anclaje en blockchain no está configurado en el servidor."
            : (data.error ?? "No se pudo anclar")
        );
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Certificación anclada en blockchain");
      queryClient.invalidateQueries({ queryKey: ["milk-quality-certs", farmId] });
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<MilkRow | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [showCertify, setShowCertify] = useState(false);

  const certsQuery = useQuery<MilkQualityCert[]>({
    queryKey: ["milk-quality-certs", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("milk_quality_certs")
        .select(
          "id, period_start, period_end, fat_pct, protein_pct, scc_thousands, total_liters, grade, payload_hash, tx_hash, chain_id, created_at"
        )
        .eq("farm_id", farmId)
        .order("period_start", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as MilkQualityCert[];
    },
  });

  const recordsQuery = useQuery<MilkRow[]>({
    queryKey: ["milk-production", farmId, days],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("milk_records")
        .select(
          "id, animal_id, recorded_on, shift, liters, fat_pct, protein_pct, notes, animals(tag, name)"
        )
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
      toast.error(friendlyErrorMessage(recordsQuery.error, { fallback: "Error al cargar." }));
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

  const { pageItems: pagedRecords, page, setPage, totalPages, total } = usePagination(filtered, 20);

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
      .slice(-30)
      .map(([date, litros]) => ({ label: fmt(date), litros }));
  }, [records]);

  // Producción por turno (donut)
  const shiftData = useMemo(() => {
    const byShift: Record<string, number> = {};
    for (const r of records) {
      byShift[r.shift] = (byShift[r.shift] ?? 0) + Number(r.liters);
    }
    return (["am", "midday", "pm"] as const)
      .filter((s) => byShift[s] > 0)
      .map((s) => ({
        key: s,
        name: SHIFT_LABEL[s],
        value: +byShift[s].toFixed(1),
        color: SHIFT_CHART_COLOR[s],
      }));
  }, [records]);

  // Top animales por producción (barra horizontal)
  const animalData = useMemo(() => {
    const byAnimal: Record<string, number> = {};
    for (const r of records) {
      const key = r.animals
        ? `${r.animals.tag}${r.animals.name ? ` · ${r.animals.name}` : ""}`
        : "Finca";
      byAnimal[key] = (byAnimal[key] ?? 0) + Number(r.liters);
    }
    return Object.entries(byAnimal)
      .map(([name, litros]) => ({ name, litros: +litros.toFixed(1) }))
      .sort((a, b) => b.litros - a.litros)
      .slice(0, 8);
  }, [records]);

  const shiftTotal = shiftData.reduce((s, d) => s + d.value, 0);

  return (
    <DashboardShell
      title="Producción de leche"
      subtitle="Producción"
      action={
        profileId && farmId && canEdit ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCertify(true)}
              className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
            >
              <Award className="h-4 w-4" /> Certificar período
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Registrar
            </button>
          </div>
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
            color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          {
            icon: FlaskConical,
            label: "% Proteína promedio",
            value: records.some((r) => r.protein_pct) ? `${avgProtein.toFixed(2)}%` : "—",
            color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
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

      {/* Charts */}
      {records.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Producción diaria */}
          <div className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
            <div className="mb-5">
              <h2 className="text-foreground text-base font-bold">Producción diaria</h2>
              <p className="text-foreground/50 mt-0.5 text-xs">
                Litros por día · últimos {days} días
              </p>
            </div>
            {chartData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center">
                <p className="text-foreground/40 text-sm">Sin datos</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.15)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<MilkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="litros"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#prodAreaGrad)"
                    dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Distribución por turno */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <div className="mb-5">
              <h2 className="text-foreground text-base font-bold">Por turno</h2>
              <p className="text-foreground/50 mt-0.5 text-xs">Distribución de litros</p>
            </div>
            {shiftData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-foreground/40 text-sm">Sin datos</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={shiftData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {shiftData.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ShiftTooltip total={shiftTotal} />} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-1.5">
                  {shiftData.map((d) => (
                    <li key={d.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-foreground/70">{d.name}</span>
                      </div>
                      <span className="text-foreground font-medium tabular-nums">
                        {d.value.toFixed(1)} L
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Producción por animal */}
      {animalData.length > 0 && (
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5">
            <h2 className="text-foreground text-base font-bold">Producción por animal</h2>
            <p className="text-foreground/50 mt-0.5 text-xs">
              Litros acumulados · top {animalData.length}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(140, animalData.length * 40)}>
            <BarChart
              data={animalData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AnimalTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="litros" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border space-y-3 border-b px-5 py-4">
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
              <span className="text-foreground/50 mr-1 text-xs">Período:</span>
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
              className="bg-muted/50 border-border text-foreground placeholder:text-foreground/30 focus:border-primary w-full rounded-xl border py-2 pr-3 pl-8 text-sm transition-colors outline-none"
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-foreground/50 border-border border-b text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  <th className="px-5 py-3 text-left font-medium">Turno</th>
                  <th className="px-5 py-3 text-left font-medium">Animal</th>
                  <th className="px-5 py-3 text-right font-medium">Litros</th>
                  <th className="px-5 py-3 text-right font-medium">Grasa</th>
                  <th className="px-5 py-3 text-right font-medium">Proteína</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {pagedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-foreground/70 text-sm tabular-nums">
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
                    <td className="text-foreground/60 px-5 py-3.5 text-right text-sm tabular-nums">
                      {r.fat_pct ? `${r.fat_pct}%` : <span className="text-foreground/30">—</span>}
                    </td>
                    <td className="text-foreground/60 px-5 py-3.5 text-right text-sm tabular-nums">
                      {r.protein_pct ? (
                        `${r.protein_pct}%`
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {canEdit && (
                        <button
                          onClick={() => setEditRecord(r)}
                          className="text-foreground/40 hover:text-primary hover:bg-primary/10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tarjetas (móvil) */}
        {filtered.length > 0 && (
          <ul className="divide-border divide-y md:hidden">
            {pagedRecords.map((r) => (
              <li key={r.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-foreground text-lg font-bold tabular-nums">
                      {Number(r.liters).toFixed(2)}
                      <span className="text-foreground/40 ml-1 text-xs font-normal">L</span>
                    </div>
                    <div className="text-foreground/70 mt-0.5 text-xs tabular-nums">
                      {fmt(r.recorded_on)}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SHIFT_STYLE[r.shift] ?? "bg-muted text-foreground/60 border-border"}`}
                  >
                    {SHIFT_LABEL[r.shift] ?? r.shift}
                  </span>
                </div>

                <div>
                  {r.animals ? (
                    <span className="text-foreground font-mono text-xs font-semibold">
                      {r.animals.tag}
                      {r.animals.name && (
                        <span className="text-foreground/50 font-normal"> · {r.animals.name}</span>
                      )}
                    </span>
                  ) : (
                    <span className="bg-muted/60 text-foreground/50 rounded-lg px-2 py-0.5 text-xs">
                      Finca
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-foreground/60">
                      Grasa{" "}
                      <span className="text-foreground/80 tabular-nums">
                        {r.fat_pct ? `${r.fat_pct}%` : "—"}
                      </span>
                    </span>
                    <span className="text-foreground/60">
                      Proteína{" "}
                      <span className="text-foreground/80 tabular-nums">
                        {r.protein_pct ? `${r.protein_pct}%` : "—"}
                      </span>
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setEditRecord(r)}
                      className="text-foreground/60 border-border hover:text-primary hover:bg-primary/10 inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="px-5 pb-1">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onChange={setPage}
              noun="registro"
            />
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-border text-foreground/40 flex items-center justify-between border-t px-5 py-3 text-xs">
            <span>
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            {search && (
              <button onClick={() => setSearch("")} className="text-primary hover:underline">
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Certificaciones emitidas */}
      {(certsQuery.data ?? []).length > 0 && (
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <ShieldCheck className="text-primary h-4 w-4" />
              </div>
              <div>
                <h2 className="text-foreground text-sm font-bold">
                  Certificaciones de calidad láctea
                </h2>
                <p className="text-foreground/40 text-xs">Ancladas en blockchain · COVENIN 903</p>
              </div>
            </div>
            <span className="bg-muted text-foreground/50 rounded-full px-2 py-0.5 text-xs font-semibold">
              {certsQuery.data!.length}
            </span>
          </div>
          <div className="divide-border divide-y">
            {certsQuery.data!.map((cert) => {
              const g = GRADE_STYLE[cert.grade];
              const fmtPeriod = (d: string) =>
                new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              return (
                <div key={cert.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${g.bg} ${g.text}`}
                  >
                    {cert.grade}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold ${g.text}`}>{g.label}</span>
                      {cert.tx_hash ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                          <ShieldCheck className="h-2.5 w-2.5" /> On-chain
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => retryAnchor.mutate(cert.id)}
                          disabled={retryAnchor.isPending}
                          title="Reintentar anclaje en blockchain"
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RotateCw
                            className={`h-2.5 w-2.5 ${retryAnchor.isPending && retryAnchor.variables === cert.id ? "animate-spin" : ""}`}
                          />
                          Pendiente · Reintentar
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/40 mt-0.5 text-xs">
                      {fmtPeriod(cert.period_start)} — {fmtPeriod(cert.period_end)}
                    </p>
                    <div className="text-foreground/35 mt-1 flex items-center gap-3 text-[10px]">
                      {cert.total_liters != null && (
                        <span>{Number(cert.total_liters).toFixed(1)} L</span>
                      )}
                      {cert.fat_pct != null && <span>Grasa {cert.fat_pct}%</span>}
                      {cert.protein_pct != null && <span>Proteína {cert.protein_pct}%</span>}
                      {cert.scc_thousands != null && <span>SCC {cert.scc_thousands}k</span>}
                    </div>
                  </div>
                  {cert.tx_hash && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${cert.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/30 hover:text-primary shrink-0 transition-colors"
                      title="Ver en Polygonscan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && farmId && profileId && (
        <AddRecordModal farmId={farmId} profileId={profileId} onClose={() => setShowModal(false)} />
      )}
      {editRecord && farmId && (
        <EditRecordModal record={editRecord} farmId={farmId} onClose={() => setEditRecord(null)} />
      )}
      {showCertify && farmId && (
        <CertifyModal
          farmId={farmId}
          records={records}
          onClose={() => setShowCertify(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["milk-quality-certs", farmId] })
          }
        />
      )}
    </DashboardShell>
  );
}
