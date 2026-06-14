"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BeakerIcon,
  BookOpen,
  Clock,
  FlaskConical,
  Pill,
  Search,
  Stethoscope,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

// ─── types ───────────────────────────────────────────────────────────────────

type ActiveTreatment = {
  id: string;
  started_at: string;
  ended_at: string | null;
  dose: string | null;
  notes: string | null;
  withdrawal_until_meat: string | null;
  withdrawal_until_milk: string | null;
  animals: { id: string; tag: string; name: string | null } | null;
  treatments_catalog: {
    name: string;
    kind: string | null;
    active_ingredient: string | null;
  } | null;
};

type HistoryTreatment = ActiveTreatment;

type CatalogItem = {
  id: string;
  name: string;
  active_ingredient: string | null;
  kind: string | null;
  route: string | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
  dose_per_kg: number | null;
  notes: string | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const KIND_BADGE: Record<string, string> = {
  antiparasitario: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  antibiótico: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  antiinflamatorio: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  vitamínico: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  mineral: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  hormonal: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
};

function KindBadge({ kind }: { kind: string | null }) {
  if (!kind) return null;
  const cls = KIND_BADGE[kind] ?? "bg-muted text-foreground/60";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {kind}
    </span>
  );
}

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  return diff;
}

function WithdrawalChip({ label, date }: { label: string; date: string | null }) {
  if (!date) return null;
  const days = daysLeft(date);
  if (days === null || days < 0) return null;
  const urgent = days <= 3;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        urgent
          ? "bg-red-500/15 text-red-600 dark:text-red-400"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      }`}
    >
      <Clock className="h-2.5 w-2.5" />
      {label}: {days}d
    </span>
  );
}

function WithdrawalBar({
  label,
  emoji,
  date,
  startedAt,
}: {
  label: string;
  emoji: string;
  date: string | null;
  startedAt: string;
}) {
  if (!date) return null;
  const days = daysLeft(date);
  const total = Math.ceil((new Date(date).getTime() - new Date(startedAt).getTime()) / 86_400_000);
  const elapsed = total - (days ?? 0);
  const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 100;

  if (days === null) return null;

  if (days < 0) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[13px]">{emoji}</span>
        <span className="text-muted-foreground w-12 shrink-0">{label}</span>
        <div className="bg-emerald-500/20 h-1.5 flex-1 overflow-hidden rounded-full">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
        <span className="text-emerald-600 dark:text-emerald-400 w-16 text-right font-medium">
          Cumplido
        </span>
      </div>
    );
  }

  const urgent = days <= 3;
  const barColor = urgent ? "bg-red-500" : "bg-amber-500";
  const trackColor = urgent ? "bg-red-500/20" : "bg-amber-500/20";
  const textColor = urgent
    ? "text-red-600 dark:text-red-400"
    : "text-amber-700 dark:text-amber-400";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[13px]">{emoji}</span>
      <span className="text-muted-foreground w-12 shrink-0">{label}</span>
      <div className={`${trackColor} h-1.5 flex-1 overflow-hidden rounded-full`}>
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-16 text-right font-semibold tabular-nums ${textColor}`}>
        {days}d restantes
      </span>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

type Tab = "activos" | "historial" | "catalogo";

export default function TratamientosPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [tab, setTab] = useState<Tab>("activos");
  const [catalogSearch, setCatalogSearch] = useState("");

  // tratamientos activos (withdrawal aún vigente o sin fecha de fin)
  const activeQuery = useQuery<ActiveTreatment[]>({
    queryKey: ["treatments-active", farmId],
    enabled: !!supabase && !!farmId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("treatments")
        .select(
          "id, started_at, ended_at, dose, notes, withdrawal_until_meat, withdrawal_until_milk, animals(id, tag, name), treatments_catalog(name, kind, active_ingredient)"
        )
        .eq("farm_id", farmId!)
        .or("ended_at.is.null,withdrawal_until_meat.gte.today,withdrawal_until_milk.gte.today")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ActiveTreatment[];
    },
  });

  // historial completo
  const historyQuery = useQuery<HistoryTreatment[]>({
    queryKey: ["treatments-history", farmId],
    enabled: !!supabase && !!farmId && tab === "historial",
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("treatments")
        .select(
          "id, started_at, ended_at, dose, notes, withdrawal_until_meat, withdrawal_until_milk, animals(id, tag, name), treatments_catalog(name, kind, active_ingredient)"
        )
        .eq("farm_id", farmId!)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as HistoryTreatment[];
    },
  });

  // catálogo
  const catalogQuery = useQuery<CatalogItem[]>({
    queryKey: ["treatments-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("treatments_catalog")
        .select(
          "id, name, active_ingredient, kind, route, withdrawal_meat_days, withdrawal_milk_days, dose_per_kg, notes"
        )
        .order("kind")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const filteredCatalog = (catalogQuery.data ?? []).filter(
    (c) =>
      !catalogSearch ||
      c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (c.active_ingredient ?? "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (c.kind ?? "").toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const activeCount = activeQuery.data?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: typeof FlaskConical; count?: number }[] = [
    { id: "activos", label: "En curso / retiro", icon: AlertTriangle, count: activeCount },
    { id: "historial", label: "Historial", icon: Clock },
    { id: "catalogo", label: "Catálogo", icon: BookOpen },
  ];

  return (
    <DashboardShell
      title="Tratamientos"
      subtitle="Seguimiento sanitario y farmacopea"
      action={
        <Link
          href="/dashboard/asistente-tratamiento"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Stethoscope className="h-4 w-4" />
          Asistente clínico
        </Link>
      }
    >
      {/* Tabs */}
      <div className="border-border flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ACTIVOS ── */}
      {tab === "activos" && (
        <div className="space-y-3">
          {activeQuery.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {!activeQuery.isLoading && activeCount === 0 && (
            <div className="bg-card border-border rounded-2xl border p-10 text-center">
              <FlaskConical className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
              <p className="text-foreground/60 text-sm">
                No hay tratamientos activos ni periodos de retiro vigentes.
              </p>
            </div>
          )}
          {(activeQuery.data ?? []).map((t) => {
            const meatDays = daysLeft(t.withdrawal_until_meat);
            const milkDays = daysLeft(t.withdrawal_until_milk);
            const inWithdrawal =
              (meatDays !== null && meatDays >= 0) || (milkDays !== null && milkDays >= 0);
            const urgentWithdrawal =
              (meatDays !== null && meatDays >= 0 && meatDays <= 3) ||
              (milkDays !== null && milkDays >= 0 && milkDays <= 3);
            const hasWithdrawal = !!(t.withdrawal_until_meat || t.withdrawal_until_milk);

            return (
              <div
                key={t.id}
                className={`bg-card relative overflow-hidden rounded-2xl border transition-shadow hover:shadow-md ${
                  urgentWithdrawal
                    ? "border-red-500/30"
                    : inWithdrawal
                      ? "border-amber-500/30"
                      : "border-border"
                }`}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute top-0 left-0 h-full w-1 rounded-l-2xl ${
                    urgentWithdrawal
                      ? "bg-red-500"
                      : inWithdrawal
                        ? "bg-amber-500"
                        : "bg-primary/40"
                  }`}
                />

                <div className="pl-5 pr-4 py-4">
                  {/* Top row: drug info + animal meta */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left: drug */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          inWithdrawal ? "bg-amber-500/10" : "bg-primary/10"
                        }`}
                      >
                        <Pill
                          className={`h-4 w-4 ${inWithdrawal ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground text-sm font-semibold">
                          {t.treatments_catalog?.name ?? "Tratamiento libre"}
                        </div>
                        {t.treatments_catalog?.active_ingredient && (
                          <div className="text-muted-foreground text-xs">
                            {t.treatments_catalog.active_ingredient}
                          </div>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <KindBadge kind={t.treatments_catalog?.kind ?? null} />
                          {inWithdrawal && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                urgentWithdrawal
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Retiro activo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: animal + dates */}
                    <div className="text-right text-xs shrink-0">
                      {t.animals ? (
                        <Link
                          href={`/dashboard/animales/${t.animals.id}`}
                          className="text-primary font-mono text-sm font-bold hover:underline"
                        >
                          {t.animals.tag}
                          {t.animals.name && (
                            <span className="text-muted-foreground font-sans font-normal">
                              {" "}
                              — {t.animals.name}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Animal eliminado</span>
                      )}
                      <div className="text-muted-foreground mt-1 flex flex-col gap-0.5">
                        <span>
                          Inicio:{" "}
                          <span className="text-foreground/70 font-medium">
                            {new Date(t.started_at).toLocaleDateString("es-VE")}
                          </span>
                        </span>
                        {t.dose && (
                          <span>
                            Dosis: <span className="text-foreground/70 font-medium">{t.dose}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Withdrawal progress bars */}
                  {hasWithdrawal && (
                    <div className="border-border mt-3 space-y-2 border-t pt-3">
                      <WithdrawalBar
                        label="Carne"
                        emoji="🥩"
                        date={t.withdrawal_until_meat}
                        startedAt={t.started_at}
                      />
                      <WithdrawalBar
                        label="Leche"
                        emoji="🥛"
                        date={t.withdrawal_until_milk}
                        startedAt={t.started_at}
                      />
                    </div>
                  )}

                  {t.notes && (
                    <p className="text-muted-foreground mt-2 border-t border-border/40 pt-2 text-xs italic">
                      {t.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === "historial" && (
        <div className="space-y-3">
          {historyQuery.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {!historyQuery.isLoading && (historyQuery.data ?? []).length === 0 && (
            <div className="bg-card border-border rounded-2xl border p-10 text-center">
              <Clock className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
              <p className="text-foreground/60 text-sm">Aún no hay tratamientos registrados.</p>
            </div>
          )}
          <div className="bg-card border-border overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                    Animal
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                    Tratamiento
                  </th>
                  <th className="text-foreground/50 hidden px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase md:table-cell">
                    Tipo
                  </th>
                  <th className="text-foreground/50 hidden px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase md:table-cell">
                    Inicio
                  </th>
                  <th className="text-foreground/50 hidden px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase lg:table-cell">
                    Fin
                  </th>
                  <th className="text-foreground/50 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                    Retiro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {(historyQuery.data ?? []).map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {t.animals ? (
                        <Link
                          href={`/dashboard/animales/${t.animals.id}`}
                          className="text-primary font-mono text-xs font-semibold hover:underline"
                        >
                          {t.animals.tag}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">
                        {t.treatments_catalog?.name ?? "Libre"}
                      </div>
                      {t.dose && <div className="text-muted-foreground text-xs">{t.dose}</div>}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <KindBadge kind={t.treatments_catalog?.kind ?? null} />
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-xs md:table-cell">
                      {new Date(t.started_at).toLocaleDateString()}
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-xs lg:table-cell">
                      {t.ended_at ? new Date(t.ended_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <WithdrawalChip label="🥩" date={t.withdrawal_until_meat} />
                        <WithdrawalChip label="🥛" date={t.withdrawal_until_milk} />
                        {!t.withdrawal_until_meat && !t.withdrawal_until_milk && (
                          <span className="text-muted-foreground text-xs">Sin retiro</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATÁLOGO ── */}
      {tab === "catalogo" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar por nombre, principio activo o tipo…"
              className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          {catalogQuery.isLoading && <SkeletonTable rows={5} cols={4} />}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map((c) => (
              <div key={c.id} className="bg-card border-border rounded-2xl border p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <BeakerIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-foreground text-sm font-semibold">{c.name}</div>
                      {c.active_ingredient && (
                        <div className="text-muted-foreground text-xs">{c.active_ingredient}</div>
                      )}
                    </div>
                  </div>
                  <KindBadge kind={c.kind} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {c.route && (
                    <>
                      <dt className="text-muted-foreground">Vía</dt>
                      <dd className="text-foreground font-medium">{c.route}</dd>
                    </>
                  )}
                  {c.dose_per_kg !== null && (
                    <>
                      <dt className="text-muted-foreground">Dosis/kg</dt>
                      <dd className="text-foreground font-medium">{c.dose_per_kg} ml/kg</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Retiro carne</dt>
                  <dd
                    className={`font-medium ${(c.withdrawal_meat_days ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {c.withdrawal_meat_days ? `${c.withdrawal_meat_days} días` : "Sin retiro"}
                  </dd>
                  <dt className="text-muted-foreground">Retiro leche</dt>
                  <dd
                    className={`font-medium ${(c.withdrawal_milk_days ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {c.withdrawal_milk_days ? `${c.withdrawal_milk_days} días` : "Sin retiro"}
                  </dd>
                </dl>

                {c.notes && (
                  <p className="text-muted-foreground mt-2 border-t border-border/50 pt-2 text-xs">
                    {c.notes}
                  </p>
                )}
              </div>
            ))}

            {filteredCatalog.length === 0 && !catalogQuery.isLoading && (
              <div className="col-span-full py-10 text-center">
                <p className="text-muted-foreground text-sm">
                  Sin resultados para &ldquo;{catalogSearch}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
