"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HeartPulse,
  Plus,
  X,
  Loader2,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Baby,
  XCircle,
  ChevronDown,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Pagination, { usePagination } from "@/components/Pagination";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

// ── Tipos ────────────────────────────────────────────────────────────────────

type AnimalLite = { id: string; tag: string; name: string | null; sex: string };

type Insemination = {
  id: string;
  animal_id: string;
  sire_id: string | null;
  sire_external: string | null;
  method: "IA" | "natural" | "embryo";
  performed_at: string;
  notes: string | null;
  animals: { tag: string; name: string | null } | null;
  sire: { tag: string; name: string | null } | null;
  pregnancies: Pregnancy[];
};

type Pregnancy = {
  id: string;
  insemination_id: string | null;
  animal_id: string;
  confirmed_at: string | null;
  expected_due_at: string | null;
  result: "pregnant" | "empty" | "aborted" | "calved" | null;
  notes: string | null;
  animals?: { tag: string; name: string | null } | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  IA: "Inseminación artificial",
  natural: "Monta natural",
  embryo: "Transferencia embrionaria",
};

const RESULT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pregnant: {
    label: "Preñada",
    color: "text-emerald-600 bg-emerald-500/10",
    icon: <HeartPulse className="h-3.5 w-3.5" />,
  },
  empty: {
    label: "Vacía",
    color: "text-foreground/50 bg-muted",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  aborted: {
    label: "Aborto",
    color: "text-red-600 bg-red-500/10",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  calved: {
    label: "Parida",
    color: "text-blue-600 bg-blue-500/10",
    icon: <Baby className="h-3.5 w-3.5" />,
  },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Bovinos: gestación ~283 días
function estimateDue(performedAt: string): string {
  const d = new Date(performedAt);
  d.setDate(d.getDate() + 283);
  return d.toISOString().slice(0, 10);
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ReproduccionPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const qc = useQueryClient();

  const [showInsemForm, setShowInsemForm] = useState(false);
  const [showPregForm, setShowPregForm] = useState(false);
  const [selectedInsemId, setSelectedInsemId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  // ── Datos animales (hembras) ─────────────────────────────────────────
  const animalsQuery = useQuery<AnimalLite[]>({
    queryKey: ["animals-lite", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("animals")
        .select("id, tag, name, sex")
        .eq("farm_id", farmId!)
        .order("tag");
      if (error) throw error;
      return data ?? [];
    },
  });

  const females = (animalsQuery.data ?? []).filter(
    (a) => a.sex === "F" || a.sex === "f" || a.sex === "female"
  );
  const males = (animalsQuery.data ?? []).filter(
    (a) => a.sex === "M" || a.sex === "m" || a.sex === "male"
  );

  // ── Inseminaciones ───────────────────────────────────────────────────
  const insemQuery = useQuery<Insemination[]>({
    queryKey: ["inseminations", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inseminations")
        .select(
          "id, animal_id, sire_id, sire_external, method, performed_at, notes, animals(tag, name), sire:animals!inseminations_sire_id_fkey(tag, name), pregnancies(id, insemination_id, animal_id, confirmed_at, expected_due_at, result, notes)"
        )
        .eq("farm_id", farmId!)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Insemination[];
    },
  });

  // ── Gestaciones activas (sin resultado o preñada) ────────────────────
  const pregQuery = useQuery<Pregnancy[]>({
    queryKey: ["pregnancies", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pregnancies")
        .select(
          "id, insemination_id, animal_id, confirmed_at, expected_due_at, result, notes, animals(tag, name)"
        )
        .eq("farm_id", farmId!)
        .or("result.is.null,result.eq.pregnant")
        .order("expected_due_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Pregnancy[];
    },
  });

  // ── KPIs ─────────────────────────────────────────────────────────────
  const allInsem = insemQuery.data ?? [];
  const activePregnancies = pregQuery.data ?? [];
  const pregPg = usePagination(activePregnancies, 20);
  const insemPg = usePagination(allInsem, 20);
  const dueSoon = activePregnancies.filter((p) => {
    const d = daysUntil(p.expected_due_at);
    return d !== null && d >= 0 && d <= 30;
  });
  const thisMonth = allInsem.filter((i) => {
    const d = new Date(i.performed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <DashboardShell title="Reproducción" subtitle="Inseminaciones · Gestaciones · Partos">
      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Gestaciones activas",
            value: activePregnancies.length,
            icon: <HeartPulse className="h-5 w-5" />,
            color: "text-emerald-600",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Partos próximos (30 d)",
            value: dueSoon.length,
            icon: <CalendarClock className="h-5 w-5" />,
            color: "text-amber-600",
            bg: "bg-amber-500/10",
          },
          {
            label: "Insem. este mes",
            value: thisMonth.length,
            icon: <Plus className="h-5 w-5" />,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Total inseminaciones",
            value: allInsem.length,
            icon: <CheckCircle2 className="h-5 w-5" />,
            color: "text-foreground/60",
            bg: "bg-muted",
          },
        ].map((k) => (
          <div key={k.label} className="bg-card border-border rounded-2xl border p-4">
            <div className={`${k.bg} ${k.color} mb-3 inline-flex rounded-xl p-2`}>{k.icon}</div>
            <div className="text-foreground text-2xl font-bold">{k.value}</div>
            <div className="text-foreground/50 mt-0.5 text-xs">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Partos próximos (alerta) ────────────────────────────────────── */}
      {dueSoon.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Partos próximos ({dueSoon.length})
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dueSoon.map((p) => {
              const d = daysUntil(p.expected_due_at)!;
              const animal = Array.isArray(p.animals) ? p.animals[0] : p.animals;
              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-amber-950/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {animal?.tag ?? "—"}
                    </span>
                    {animal?.name && (
                      <span className="text-foreground/50 text-xs ml-1">{animal.name}</span>
                    )}
                    <div className="text-xs text-foreground/50 mt-0.5">
                      Parto est.: {fmt(p.expected_due_at)}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold rounded-full px-2 py-0.5 ${d <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {d === 0 ? "Hoy" : `${d} d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs + botones ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t === "active" ? "Gestaciones activas" : "Historial"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowPregForm(true);
              setSelectedInsemId(null);
            }}
            className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium"
          >
            <Baby className="h-4 w-4" /> Registrar gestación
          </button>
          <button
            onClick={() => setShowInsemForm(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nueva inseminación
          </button>
        </div>
      </div>

      {/* ── Tab: gestaciones activas ────────────────────────────────────── */}
      {tab === "active" && (
        <div className="bg-card border-border rounded-2xl border overflow-hidden">
          {activePregnancies.length === 0 ? (
            <div className="text-foreground/50 py-16 text-center text-sm">
              No hay gestaciones activas registradas.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Confirmada
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Parto estimado
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                    Días restantes
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pregPg.pageItems.map((p) => {
                  const animal = Array.isArray(p.animals) ? p.animals[0] : p.animals;
                  const days = daysUntil(p.expected_due_at);
                  const overdue = days !== null && days < 0;
                  return (
                    <tr
                      key={p.id}
                      className="border-border hover:bg-muted/30 border-b last:border-0 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{animal?.tag ?? "—"}</span>
                        {animal?.name && (
                          <span className="text-foreground/50 ml-1 text-xs">{animal.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 hidden sm:table-cell">
                        {fmt(p.confirmed_at)}
                      </td>
                      <td className="px-4 py-3 font-medium">{fmt(p.expected_due_at)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {days === null ? (
                          "—"
                        ) : (
                          <span
                            className={`font-semibold ${overdue ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-foreground"}`}
                          >
                            {overdue
                              ? `${Math.abs(days)} d vencido`
                              : days === 0
                                ? "Hoy"
                                : `${days} d`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PregnancyResultBadge result={p.result} />
                      </td>
                      <td className="px-4 py-3">
                        <UpdateResultButton
                          pregnancy={p}
                          farmId={farmId!}
                          supabase={supabase}
                          onDone={() => {
                            qc.invalidateQueries({ queryKey: ["pregnancies", farmId] });
                            qc.invalidateQueries({ queryKey: ["inseminations", farmId] });
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {activePregnancies.length > 0 && (
            <div className="px-5 pb-2">
              <Pagination
                page={pregPg.page}
                totalPages={pregPg.totalPages}
                total={pregPg.total}
                onChange={pregPg.setPage}
                noun="registro"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: historial inseminaciones ───────────────────────────────── */}
      {tab === "history" && (
        <div className="bg-card border-border rounded-2xl border overflow-hidden">
          {allInsem.length === 0 ? (
            <div className="text-foreground/50 py-16 text-center text-sm">
              No hay inseminaciones registradas aún.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">
                    Método
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                    Toro / Semen
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody>
                {insemPg.pageItems.map((i) => {
                  const animal = Array.isArray(i.animals) ? i.animals[0] : i.animals;
                  const sire = Array.isArray(i.sire) ? i.sire[0] : i.sire;
                  const preg = i.pregnancies?.[0];
                  return (
                    <tr
                      key={i.id}
                      className="border-border hover:bg-muted/30 border-b last:border-0 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{animal?.tag ?? "—"}</span>
                        {animal?.name && (
                          <span className="text-foreground/50 ml-1 text-xs">{animal.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 hidden sm:table-cell">
                        {METHOD_LABELS[i.method] ?? i.method}
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{fmt(i.performed_at)}</td>
                      <td className="px-4 py-3 text-foreground/70 hidden md:table-cell">
                        {sire
                          ? `${sire.tag}${sire.name ? ` · ${sire.name}` : ""}`
                          : (i.sire_external ?? "—")}
                      </td>
                      <td className="px-4 py-3">
                        <PregnancyResultBadge result={preg?.result ?? null} pending={!preg} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {allInsem.length > 0 && (
            <div className="px-5 pb-2">
              <Pagination
                page={insemPg.page}
                totalPages={insemPg.totalPages}
                total={insemPg.total}
                onChange={insemPg.setPage}
                noun="registro"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Modal: nueva inseminación ───────────────────────────────────── */}
      {showInsemForm && (
        <InseminationModal
          females={females}
          males={males}
          farmId={farmId!}
          supabase={supabase}
          onClose={() => setShowInsemForm(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["inseminations", farmId] });
            setShowInsemForm(false);
          }}
        />
      )}

      {/* ── Modal: registrar gestación ──────────────────────────────────── */}
      {showPregForm && (
        <PregnancyModal
          females={females}
          inseminations={allInsem}
          farmId={farmId!}
          supabase={supabase}
          preselectedInsemId={selectedInsemId}
          onClose={() => setShowPregForm(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["pregnancies", farmId] });
            qc.invalidateQueries({ queryKey: ["inseminations", farmId] });
            setShowPregForm(false);
          }}
        />
      )}
    </DashboardShell>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function PregnancyResultBadge({ result, pending }: { result: string | null; pending?: boolean }) {
  if (pending) return <span className="text-foreground/40 text-xs">Sin diagnóstico</span>;
  if (!result) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
        <HeartPulse className="h-3 w-3" /> Preñada
      </span>
    );
  }
  const meta = RESULT_META[result];
  if (!meta) return <span className="text-foreground/40 text-xs">{result}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

function UpdateResultButton({
  pregnancy,
  farmId,
  supabase,
  onDone,
}: {
  pregnancy: Pregnancy;
  farmId: string;
  supabase: ReturnType<typeof useSupabase>["supabase"];
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: async (result: string) => {
      const { error } = await (supabase as any)
        .from("pregnancies")
        .update({ result })
        .eq("id", pregnancy.id);
      if (error) throw error;
    },
    onSuccess: () => onDone(),
  });

  const actions: { key: string; label: string; className: string }[] = [
    {
      key: "calved",
      label: "Parida",
      className:
        "border border-green-600/40 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40",
    },
    {
      key: "empty",
      label: "Vacia",
      className:
        "border border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40",
    },
    {
      key: "aborted",
      label: "Aborto",
      className:
        "border border-red-500/40 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40",
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {actions.map((a) => (
        <button
          key={a.key}
          onClick={() => mutation.mutate(a.key)}
          disabled={mutation.isPending}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${a.className}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Modal inseminación ───────────────────────────────────────────────────────

function InseminationModal({
  females,
  males,
  farmId,
  supabase,
  onClose,
  onDone,
}: {
  females: AnimalLite[];
  males: AnimalLite[];
  farmId: string;
  supabase: ReturnType<typeof useSupabase>["supabase"];
  onClose: () => void;
  onDone: () => void;
}) {
  const [animalId, setAnimalId] = useState(females[0]?.id ?? "");
  const [method, setMethod] = useState<"IA" | "natural" | "embryo">("IA");
  const [sireId, setSireId] = useState("");
  const [sireExternal, setSireExternal] = useState("");
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [createPreg, setCreatePreg] = useState(true);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: insem, error } = await (supabase as any)
        .from("inseminations")
        .insert({
          farm_id: farmId,
          animal_id: animalId,
          method,
          sire_id: sireId || null,
          sire_external: sireExternal || null,
          performed_at: performedAt,
          notes: notes || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (createPreg) {
        const { error: pe } = await (supabase as any).from("pregnancies").insert({
          farm_id: farmId,
          animal_id: animalId,
          insemination_id: insem.id,
          expected_due_at: estimateDue(performedAt),
          result: null,
        });
        if (pe) throw pe;
      }
    },
    onSuccess: onDone,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-foreground text-base font-bold">Nueva inseminación</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">
              Animal (hembra) <span className="text-red-500">*</span>
            </label>
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              {females.length === 0 && <option value="">— No hay hembras registradas —</option>}
              {females.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">Método</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as "IA" | "natural" | "embryo")}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-foreground/60 mb-1 block text-xs font-medium">
                Toro (interno)
              </label>
              <select
                value={sireId}
                onChange={(e) => setSireId(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                <option value="">— Ninguno —</option>
                {males.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag}
                    {a.name ? ` · ${a.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-foreground/60 mb-1 block text-xs font-medium">
                Semen externo / Donante
              </label>
              <input
                type="text"
                value={sireExternal}
                onChange={(e) => setSireExternal(e.target.value)}
                placeholder="Nombre / código"
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">Fecha</label>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createPreg}
              onChange={(e) => setCreatePreg(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-foreground/70">
              Crear gestación pendiente (parto est. en 283 días)
            </span>
          </label>

          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-xs text-red-500">{(mutation.error as Error).message}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !animalId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal gestación ──────────────────────────────────────────────────────────

function PregnancyModal({
  females,
  inseminations,
  farmId,
  supabase,
  preselectedInsemId,
  onClose,
  onDone,
}: {
  females: AnimalLite[];
  inseminations: Insemination[];
  farmId: string;
  supabase: ReturnType<typeof useSupabase>["supabase"];
  preselectedInsemId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [animalId, setAnimalId] = useState(females[0]?.id ?? "");
  const [insemId, setInsemId] = useState(preselectedInsemId ?? "");
  const [confirmedAt, setConfirmedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDue, setExpectedDue] = useState(
    estimateDue(new Date().toISOString().slice(0, 10))
  );
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("pregnancies").insert({
        farm_id: farmId,
        animal_id: animalId,
        insemination_id: insemId || null,
        confirmed_at: confirmedAt || null,
        expected_due_at: expectedDue || null,
        result: "pregnant",
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gestación registrada");
      onDone();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-foreground text-base font-bold">Registrar gestación</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">
              Animal (hembra) <span className="text-red-500">*</span>
            </label>
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              {females.length === 0 && <option value="">— No hay hembras registradas —</option>}
              {females.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">
              Vincular a inseminación (opcional)
            </label>
            <select
              value={insemId}
              onChange={(e) => setInsemId(e.target.value)}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="">— Sin vincular —</option>
              {inseminations
                .filter((i) => i.animal_id === animalId || !animalId)
                .map((i) => {
                  const a = Array.isArray(i.animals) ? i.animals[0] : i.animals;
                  return (
                    <option key={i.id} value={i.id}>
                      {a?.tag} · {fmt(i.performed_at)} · {METHOD_LABELS[i.method]}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-foreground/60 mb-1 block text-xs font-medium">
                Fecha diagnóstico
              </label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={confirmedAt}
                onChange={(e) => setConfirmedAt(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-foreground/60 mb-1 block text-xs font-medium">
                Parto estimado
              </label>
              <input
                type="date"
                value={expectedDue}
                onChange={(e) => setExpectedDue(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-foreground/60 mb-1 block text-xs font-medium">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-xs text-red-500">{(mutation.error as Error).message}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !animalId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Baby className="h-4 w-4" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
