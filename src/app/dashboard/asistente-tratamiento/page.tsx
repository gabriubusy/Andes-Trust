"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Stethoscope,
  Search,
  Loader2,
  AlertTriangle,
  FlaskConical,
  CheckCircle2,
  Plus,
  Scale,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import RegisterTreatmentModal from "@/components/RegisterTreatmentModal";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type Symptom = { id: string; name: string; body_system: string | null; severity_default: number };
type SuggestionTx = {
  treatment_id: string;
  name: string;
  kind: string | null;
  route: string | null;
  dose_hint: string | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
  priority: number;
};
type Suggestion = {
  disease_id: string;
  disease_name: string;
  match_count: number;
  total_symptoms: number;
  score: number;
  treatments: SuggestionTx[];
};

const SYSTEM_LABEL: Record<string, string> = {
  digestivo: "Digestivo",
  respiratorio: "Respiratorio",
  ubre: "Ubre / Mama",
  piel: "Piel",
  locomotor: "Locomotor",
  sistémico: "Sistémico",
  reproductivo: "Reproductivo",
};

const SYSTEM_ICON: Record<string, string> = {
  digestivo: "🫁",
  respiratorio: "💨",
  ubre: "🐄",
  piel: "🩹",
  locomotor: "🦵",
  sistémico: "🌡️",
  reproductivo: "🔬",
};

const KIND_COLOR: Record<string, string> = {
  antibiótico: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  antiparasitario: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  antiinflamatorio: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  vitamínico: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  mineral: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  hormonal: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
};

/** Normaliza la unidad tal como debe mostrarse. */
function normalizeUnit(u: string): string {
  const low = u.toLowerCase();
  if (low === "ml") return "mL";
  if (low === "ui") return "UI";
  return low; // mg, g
}

const doseFmt = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

/**
 * Calcula la dosis total para un peso a partir del texto de `dose_hint`.
 * Soporta "X u/kg" y "X u/N kg" (u = mg, mL, g, UI). Devuelve null si el
 * texto no trae una tasa por peso —"10 mL IM", "Soporte electrolítico"—:
 * ahí no hay nada que calcular y se muestra sólo la indicación original.
 */
function doseForWeight(hint: string | null, weightKg: number | null): string | null {
  if (!hint || !weightKg || weightKg <= 0) return null;

  // "X u/N kg" (denominador explícito, p. ej. "1 mL/50 kg")
  const perN = hint.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|ui)\s*\/\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  if (perN) {
    const rate = parseFloat(perN[1].replace(",", "."));
    const per = parseFloat(perN[3].replace(",", "."));
    if (per > 0) return `${doseFmt.format((rate / per) * weightKg)} ${normalizeUnit(perN[2])}`;
  }

  // "X u/kg"
  const perKg = hint.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|ui)\s*\/\s*kg/i);
  if (perKg) {
    const rate = parseFloat(perKg[1].replace(",", "."));
    return `${doseFmt.format(rate * weightKg)} ${normalizeUnit(perKg[2])}`;
  }

  return null;
}

function ScoreMeter({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-border"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {score}%
        </span>
      </div>
    </div>
  );
}

export default function AsistenteTratamientoPage() {
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [applyTx, setApplyTx] = useState<string | null>(null);
  const [weight, setWeight] = useState("");

  const weightKg = weight ? Number(weight.replace(",", ".")) : null;
  const validWeight = weightKg != null && weightKg > 0 ? weightKg : null;

  const symptomsQuery = useQuery<Symptom[]>({
    queryKey: ["symptoms-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("symptoms_catalog")
        .select("id, name, body_system, severity_default")
        .order("body_system")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Symptom[];
    },
  });

  const selectedIds = useMemo(() => Array.from(selected).sort(), [selected]);

  const suggest = useQuery<Suggestion[]>({
    queryKey: ["suggest-treatment", selectedIds],
    enabled: !!supabase && selectedIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("suggest_treatment", {
        symptom_ids: selectedIds,
      });
      if (error) throw error;
      return (data ?? []) as Suggestion[];
    },
  });

  const grouped = useMemo(() => {
    const list = (symptomsQuery.data ?? []).filter(
      (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
    );
    const by: Record<string, Symptom[]> = {};
    for (const s of list) {
      const k = s.body_system ?? "otros";
      (by[k] ??= []).push(s);
    }
    return by;
  }, [symptomsQuery.data, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <DashboardShell
      title="Asistente de tratamiento"
      subtitle="Sugerencias clínicas según síntomas observados"
    >
      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Solo apoyo clínico.</strong> Las sugerencias se basan en coincidencia de síntomas;
          la decisión final corresponde al médico veterinario responsable.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── Síntomas ── */}
        <div className="flex flex-col gap-3">
          <div className="bg-card border-border rounded-2xl border p-4">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="text-primary h-4 w-4" />
                Síntomas observados
              </h3>
              {selected.size > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                  {selected.size} selec.
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar síntoma…"
                className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border py-1.5 pr-3 pl-8 text-sm outline-none focus:ring-0"
              />
            </div>

            {/* Peso del animal → calcula la dosis total sugerida */}
            <div className="relative mb-3">
              <Scale className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Peso del animal (kg) — opcional"
                className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border py-1.5 pr-12 pl-8 text-sm outline-none focus:ring-0"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                kg
              </span>
            </div>

            {/* List */}
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([system, list]) => (
                <div key={system}>
                  <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    <span>{SYSTEM_ICON[system] ?? "•"}</span>
                    {SYSTEM_LABEL[system] ?? system}
                  </div>
                  <div className="space-y-0.5">
                    {list.map((s) => {
                      const isChecked = selected.has(s.id);
                      return (
                        // Botón, no <label> con checkbox sr-only: aquel movía el
                        // foco a un input de posición absoluta y el navegador
                        // desplazaba la página ("el salto"). Además el checkbox
                        // sólo existía sin marcar, así que un síntoma marcado no
                        // se podía quitar con clic.
                        <button
                          key={s.id}
                          type="button"
                          role="checkbox"
                          aria-checked={isChecked}
                          onClick={() => toggle(s.id)}
                          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                            isChecked
                              ? "bg-primary/8 text-foreground"
                              : "hover:bg-muted/50 text-foreground/80"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? "border-primary bg-primary"
                                : "border-border group-hover:border-primary/50"
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className="h-2.5 w-2.5 text-white"
                                viewBox="0 0 10 10"
                                fill="none"
                              >
                                <path
                                  d="M2 5l2.5 2.5L8 3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="flex-1 leading-snug">{s.name}</span>
                          {s.severity_default >= 3 && (
                            <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-500 uppercase">
                              grave
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estado en tiempo real */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                {suggest.isFetching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analizando…
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-3.5 w-3.5" />
                    Actualizado en tiempo real
                  </>
                )}
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-muted-foreground hover:text-foreground text-xs transition"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>

        {/* ── Resultados ── */}
        <div className="space-y-3">
          {selected.size === 0 && (
            <div className="bg-card border-border hidden flex-col items-center justify-center gap-3 rounded-2xl border py-20 text-center lg:flex">
              <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
                <Stethoscope className="text-muted-foreground/40 h-7 w-7" />
              </div>
              <p className="text-muted-foreground max-w-xs text-sm">
                Selecciona los síntomas observados en el animal y las sugerencias aparecerán
                automáticamente.
              </p>
            </div>
          )}

          {selected.size > 0 && suggest.isSuccess && (suggest.data?.length ?? 0) === 0 && (
            <div className="bg-card border-border rounded-2xl border p-8 text-center text-sm">
              <FlaskConical className="text-muted-foreground/30 mx-auto mb-3 h-8 w-8" />
              <p className="text-muted-foreground">
                Sin diagnósticos que coincidan. Prueba con otros síntomas o registra el caso para
                revisión.
              </p>
            </div>
          )}

          {(selected.size > 0 ? (suggest.data ?? []) : []).map((s, idx) => {
            const scoreColor =
              s.score >= 70
                ? "text-emerald-600 dark:text-emerald-400"
                : s.score >= 40
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground";
            const borderColor =
              s.score >= 70
                ? "border-emerald-500/30"
                : s.score >= 40
                  ? "border-amber-500/30"
                  : "border-border";
            const accentColor =
              s.score >= 70
                ? "bg-emerald-500"
                : s.score >= 40
                  ? "bg-amber-500"
                  : "bg-muted-foreground/30";

            return (
              <div
                key={s.disease_id}
                className={`bg-card relative overflow-hidden rounded-2xl border ${borderColor} transition-shadow hover:shadow-md`}
              >
                {/* Accent bar */}
                <div className={`absolute top-0 left-0 h-full w-1 ${accentColor} rounded-l-2xl`} />

                <div className="px-5 py-4 pl-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground mb-0.5 text-[11px] font-semibold tracking-wider uppercase">
                        #{idx + 1} diagnóstico
                      </div>
                      <div className="text-foreground text-base leading-tight font-bold">
                        {s.disease_name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                          <div
                            className={`h-full rounded-full ${accentColor}`}
                            style={{ width: `${(s.match_count / s.total_symptoms) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${scoreColor}`}>
                          {s.match_count}/{s.total_symptoms} síntomas
                        </span>
                      </div>
                    </div>
                    <ScoreMeter score={s.score} />
                  </div>

                  {/* Treatments */}
                  {s.treatments.length > 0 && (
                    <div className="border-border mt-4 border-t pt-4">
                      <div className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
                        Tratamientos sugeridos
                      </div>
                      <div className="space-y-3">
                        {s.treatments.map((t, ti) => (
                          <div
                            key={t.treatment_id}
                            className={`rounded-xl p-3 ${
                              t.priority === 1
                                ? "border border-emerald-500/20 bg-emerald-500/8"
                                : "bg-muted/40"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {t.priority === 1 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  1ª línea
                                </span>
                              )}
                              {t.priority > 1 && (
                                <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                  {ti + 1}ª opción
                                </span>
                              )}
                              <span className="text-foreground text-sm font-semibold">
                                {t.name}
                              </span>
                              {t.kind && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    KIND_COLOR[t.kind] ?? "bg-muted text-foreground/60"
                                  }`}
                                >
                                  {t.kind}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setApplyTx(t.treatment_id)}
                                className="border-primary/30 text-primary hover:bg-primary/10 ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[12px] font-semibold transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Aplicar a animal
                              </button>
                            </div>

                            {(t.dose_hint || t.route) && (
                              <div className="text-muted-foreground mt-1 text-xs">
                                {[t.dose_hint, t.route ? `vía ${t.route}` : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}

                            {(() => {
                              const dose = doseForWeight(t.dose_hint, validWeight);
                              if (!dose) return null;
                              return (
                                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-[12px] font-semibold text-primary">
                                  <Scale className="h-3 w-3" />≈ {dose} para{" "}
                                  {doseFmt.format(validWeight!)} kg
                                  <span className="text-primary/60 font-normal">· por dosis</span>
                                </div>
                              );
                            })()}

                            {(t.withdrawal_meat_days || t.withdrawal_milk_days) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {t.withdrawal_meat_days != null && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                    🥩 Carne {t.withdrawal_meat_days}d
                                  </span>
                                )}
                                {t.withdrawal_milk_days != null && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                                    🥛 Leche {t.withdrawal_milk_days}d
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.treatments.length === 0 && (
                    <div className="border-border mt-3 border-t pt-3">
                      <p className="text-muted-foreground text-xs italic">
                        Sin tratamientos en catálogo para esta enfermedad. Consultar veterinario.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {applyTx && (
        <RegisterTreatmentModal
          farmId={farmId}
          profileId={profileId ?? undefined}
          presetTreatmentId={applyTx}
          onClose={() => setApplyTx(null)}
          onDone={() => setApplyTx(null)}
        />
      )}
    </DashboardShell>
  );
}
