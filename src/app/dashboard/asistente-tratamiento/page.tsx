"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Stethoscope, Search, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";

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

export default function AsistenteTratamientoPage() {
  const { supabase } = useSupabase();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

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

  const suggest = useMutation<Suggestion[]>({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("suggest_treatment", {
        symptom_ids: Array.from(selected),
      });
      if (error) throw error;
      return (data ?? []) as Suggestion[];
    },
  });

  const grouped = useMemo(() => {
    const list = (symptomsQuery.data ?? []).filter((s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()),
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
      <div className="bg-amber-500/10 text-amber-700 dark:text-amber-300 mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Solo apoyo clínico.</strong> Las sugerencias se basan en coincidencia de síntomas;
          la decisión final corresponde al médico veterinario responsable.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Selector de síntomas */}
        <div className="bg-card border-border rounded-2xl border p-4">
          <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <Stethoscope className="h-4 w-4" /> Síntomas observados ({selected.size})
          </h3>
          <div className="relative mb-3">
            <Search className="text-foreground/40 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar síntoma…"
              className="border-border bg-background w-full rounded-lg border py-1.5 pr-3 pl-9 text-sm outline-none"
            />
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([system, list]) => (
              <div key={system}>
                <div className="text-foreground/40 mb-1 text-[10px] font-semibold tracking-wider uppercase">
                  {SYSTEM_LABEL[system] ?? system}
                </div>
                <div className="space-y-1">
                  {list.map((s) => (
                    <label
                      key={s.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1">{s.name}</span>
                      {s.severity_default >= 3 && (
                        <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                          grave
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            disabled={selected.size === 0 || suggest.isPending}
            onClick={() => suggest.mutate()}
            className="bg-primary hover:bg-primary/90 mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sugerir diagnóstico y tratamiento"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => {
                setSelected(new Set());
                suggest.reset();
              }}
              className="text-foreground/60 mt-2 w-full text-xs hover:underline"
            >
              Limpiar selección
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="space-y-3">
          {suggest.isIdle && (
            <div className="bg-card border-border flex flex-col items-center justify-center gap-2 rounded-2xl border py-16 text-sm">
              <Stethoscope className="text-foreground/20 h-10 w-10" />
              <p className="text-foreground/50">Selecciona los síntomas observados en el animal y pulsa el botón.</p>
            </div>
          )}

          {suggest.isSuccess && (suggest.data?.length ?? 0) === 0 && (
            <div className="bg-card border-border rounded-2xl border p-6 text-sm">
              No hay diagnósticos que coincidan con los síntomas seleccionados. Prueba con síntomas distintos
              o registra el caso para revisión veterinaria.
            </div>
          )}

          {(suggest.data ?? []).map((s, idx) => (
            <div key={s.disease_id} className="bg-card border-border rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-foreground/40 text-xs">#{idx + 1} diagnóstico</div>
                  <div className="text-foreground text-base font-semibold">{s.disease_name}</div>
                  <div className="text-foreground/60 mt-1 text-xs">
                    {s.match_count} de {s.total_symptoms} síntomas coinciden
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${
                      s.score >= 70 ? "text-emerald-600" : s.score >= 40 ? "text-amber-600" : "text-foreground/60"
                    }`}
                  >
                    {s.score}%
                  </div>
                  <div className="text-foreground/40 text-[10px]">match score</div>
                </div>
              </div>

              {s.treatments.length > 0 && (
                <div className="border-border mt-4 border-t pt-4">
                  <div className="text-foreground/60 mb-2 text-xs font-semibold tracking-wider uppercase">
                    Tratamientos sugeridos
                  </div>
                  <ul className="space-y-2">
                    {s.treatments.map((t) => (
                      <li key={t.treatment_id} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="text-foreground/30 mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground font-medium">
                            {t.priority === 1 && <span className="text-emerald-500 mr-1 text-xs">[1ª línea]</span>}
                            {t.name}
                            {t.kind && <span className="text-foreground/50"> · {t.kind}</span>}
                          </div>
                          {t.dose_hint && (
                            <div className="text-foreground/70 text-xs">{t.dose_hint}</div>
                          )}
                          {(t.withdrawal_meat_days || t.withdrawal_milk_days) && (
                            <div className="text-amber-600 mt-0.5 text-xs">
                              Retiro:
                              {t.withdrawal_meat_days != null && ` carne ${t.withdrawal_meat_days}d`}
                              {t.withdrawal_meat_days != null && t.withdrawal_milk_days != null && " · "}
                              {t.withdrawal_milk_days != null && `leche ${t.withdrawal_milk_days}d`}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {s.treatments.length === 0 && (
                <div className="text-foreground/50 mt-3 text-xs italic">
                  Sin tratamientos en catálogo para esta enfermedad. Consultar veterinario.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
