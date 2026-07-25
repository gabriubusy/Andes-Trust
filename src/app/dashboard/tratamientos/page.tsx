"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BeakerIcon,
  BookOpen,
  Clock,
  FlaskConical,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Beef,
  Milk,
  Syringe,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Pagination, { usePagination } from "@/components/Pagination";
import RegisterTreatmentModal from "@/components/RegisterTreatmentModal";
import BatchApplyModal from "@/components/BatchApplyModal";
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

// Color de acento (barra lateral + icono) por tipo de tratamiento
const KIND_ACCENT: Record<string, { bar: string; icon: string }> = {
  antiparasitario: { bar: "bg-emerald-500", icon: "text-emerald-500" },
  antibiótico: { bar: "bg-blue-500", icon: "text-blue-500" },
  antiinflamatorio: { bar: "bg-orange-500", icon: "text-orange-500" },
  vitamínico: { bar: "bg-violet-500", icon: "text-violet-500" },
  mineral: { bar: "bg-sky-500", icon: "text-sky-500" },
  hormonal: { bar: "bg-pink-500", icon: "text-pink-500" },
};

function KindBadge({ kind }: { kind: string | null }) {
  if (!kind) return null;
  const cls = KIND_BADGE[kind] ?? "bg-muted text-foreground/60";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}
    >
      {kind}
    </span>
  );
}

// Tile de periodo de retiro (carne/leche) para el catálogo
function WithdrawalTile({
  icon: Icon,
  label,
  days,
}: {
  icon: typeof Beef;
  label: string;
  days: number | null;
}) {
  const hasWithdrawal = (days ?? 0) > 0;
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        hasWithdrawal
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-emerald-500/20 bg-emerald-500/5"
      }`}
    >
      <div className="text-foreground/50 mb-0.5 flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={`text-sm font-bold ${
          hasWithdrawal
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {hasWithdrawal ? `${days} días` : "Sin retiro"}
      </div>
    </div>
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
        <span className="text-[14px]">{emoji}</span>
        <span className="text-muted-foreground w-12 shrink-0">{label}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-500/20">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
        <span className="w-16 text-right font-medium text-emerald-600 dark:text-emerald-400">
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
      <span className="text-[14px]">{emoji}</span>
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
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("activos");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [showRegister, setShowRegister] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

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

  const catalog = catalogQuery.data ?? [];

  const filteredCatalog = catalog.filter((c) => {
    if (kindFilter !== "all" && (c.kind ?? "otros") !== kindFilter) return false;
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.active_ingredient ?? "").toLowerCase().includes(q) ||
      (c.kind ?? "").toLowerCase().includes(q)
    );
  });

  // Tipos presentes con su conteo, para los chips de filtro
  const kindCounts = catalog.reduce<Record<string, number>>((acc, c) => {
    const k = c.kind ?? "otros";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  // Agrupar el catálogo filtrado por tipo (para las secciones)
  const groupedCatalog = Object.entries(
    filteredCatalog.reduce<Record<string, CatalogItem[]>>((acc, c) => {
      const k = c.kind ?? "otros";
      (acc[k] ??= []).push(c);
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b));

  const activeCount = activeQuery.data?.length ?? 0;

  const activePg = usePagination(activeQuery.data ?? [], 20);
  const historyPg = usePagination(historyQuery.data ?? [], 20);

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
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/asistente-tratamiento"
            className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Asistente clínico</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowBatch(true)}
            className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Por lote</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Registrar tratamiento
          </button>
        </div>
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
                : "text-foreground/60 hover:text-foreground border-transparent"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[11px] font-bold text-red-500">
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
          {activePg.pageItems.map((t) => {
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

                <div className="py-4 pr-4 pl-5">
                  {/* Top row: drug info + animal meta */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left: drug */}
                    <div className="flex min-w-0 items-start gap-3">
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
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
                    <div className="shrink-0 text-right text-xs">
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
                    <p className="text-muted-foreground border-border/40 mt-2 border-t pt-2 text-xs italic">
                      {t.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {activeCount > 0 && (
            <Pagination
              page={activePg.page}
              totalPages={activePg.totalPages}
              total={activePg.total}
              onChange={activePg.setPage}
              noun="tratamiento"
            />
          )}
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
            <table className="hidden w-full text-sm md:table">
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
                {historyPg.pageItems.map((t) => (
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

            {/* Tarjetas (móvil) */}
            <ul className="divide-border divide-y md:hidden">
              {historyPg.pageItems.map((t) => (
                <li key={t.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-foreground font-medium">
                        {t.treatments_catalog?.name ?? "Libre"}
                      </div>
                      {t.dose && <div className="text-muted-foreground text-xs">{t.dose}</div>}
                    </div>
                    {t.animals ? (
                      <Link
                        href={`/dashboard/animales/${t.animals.id}`}
                        className="text-primary shrink-0 font-mono text-xs font-semibold hover:underline"
                      >
                        {t.animals.tag}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground shrink-0 text-xs">—</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={t.treatments_catalog?.kind ?? null} />
                    <span className="text-muted-foreground text-xs">
                      {new Date(t.started_at).toLocaleDateString()}
                      {t.ended_at
                        ? ` → ${new Date(t.ended_at).toLocaleDateString()}`
                        : " → en curso"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <WithdrawalChip label="🥩" date={t.withdrawal_until_meat} />
                    <WithdrawalChip label="🥛" date={t.withdrawal_until_milk} />
                    {!t.withdrawal_until_meat && !t.withdrawal_until_milk && (
                      <span className="text-muted-foreground text-xs">Sin retiro</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {(historyQuery.data ?? []).length > 0 && (
            <Pagination
              page={historyPg.page}
              totalPages={historyPg.totalPages}
              total={historyPg.total}
              onChange={historyPg.setPage}
              noun="tratamiento"
            />
          )}
        </div>
      )}

      {/* ── CATÁLOGO ── */}
      {tab === "catalogo" && (
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar por nombre, principio activo o tipo…"
              className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          {/* Chips de filtro por tipo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setKindFilter("all")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
                kindFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              Todos <span className="opacity-60">{catalog.length}</span>
            </button>
            {Object.entries(kindCounts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, count]) => {
                const active = kindFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKindFilter(active ? "all" : k)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
                      active
                        ? (KIND_BADGE[k] ?? "bg-muted text-foreground/60") +
                          " ring-1 ring-current/30"
                        : "bg-muted text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {k} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
          </div>

          {catalogQuery.isLoading && <SkeletonTable rows={5} cols={4} />}

          {/* Secciones agrupadas por tipo */}
          {groupedCatalog.map(([kind, items]) => {
            const accent = KIND_ACCENT[kind] ?? {
              bar: "bg-muted-foreground",
              icon: "text-foreground/40",
            };
            return (
              <div key={kind}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-3 w-1 rounded-full ${accent.bar}`} />
                  <h3 className="text-foreground text-sm font-semibold capitalize">{kind}</h3>
                  <span className="text-foreground/40 text-xs">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="bg-card border-border hover:border-primary/30 relative overflow-hidden rounded-2xl border p-4 pl-5 transition-colors hover:shadow-sm"
                    >
                      {/* Barra de acento por tipo */}
                      <span className={`absolute top-0 left-0 h-full w-1 ${accent.bar}`} />

                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <BeakerIcon className={`mt-0.5 h-4 w-4 shrink-0 ${accent.icon}`} />
                          <div>
                            <div className="text-foreground text-sm font-semibold">{c.name}</div>
                            {c.active_ingredient && (
                              <div className="text-muted-foreground text-xs">
                                {c.active_ingredient}
                              </div>
                            )}
                          </div>
                        </div>
                        <KindBadge kind={c.kind} />
                      </div>

                      {/* Vía y dosis */}
                      <div className="text-foreground/70 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {c.route && (
                          <span className="inline-flex items-center gap-1">
                            <Syringe className="text-foreground/40 h-3 w-3" /> {c.route}
                          </span>
                        )}
                        {c.dose_per_kg !== null && (
                          <span className="inline-flex items-center gap-1">
                            <FlaskConical className="text-foreground/40 h-3 w-3" /> {c.dose_per_kg}{" "}
                            ml/kg
                          </span>
                        )}
                      </div>

                      {/* Retiros */}
                      <div className="grid grid-cols-2 gap-2">
                        <WithdrawalTile
                          icon={Beef}
                          label="Retiro carne"
                          days={c.withdrawal_meat_days}
                        />
                        <WithdrawalTile
                          icon={Milk}
                          label="Retiro leche"
                          days={c.withdrawal_milk_days}
                        />
                      </div>

                      {c.notes && (
                        <p className="text-muted-foreground border-border/50 mt-2.5 border-t pt-2 text-xs">
                          {c.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredCatalog.length === 0 && !catalogQuery.isLoading && (
            <div className="py-12 text-center">
              <BookOpen className="text-foreground/20 mx-auto mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {catalogSearch
                  ? `Sin resultados para “${catalogSearch}”`
                  : "No hay tratamientos en el catálogo"}
              </p>
            </div>
          )}
        </div>
      )}

      {showRegister && (
        <RegisterTreatmentModal
          farmId={farmId}
          profileId={profileId ?? undefined}
          onClose={() => setShowRegister(false)}
          onDone={() => {
            setShowRegister(false);
            qc.invalidateQueries({ queryKey: ["treatments-active", farmId] });
            qc.invalidateQueries({ queryKey: ["treatments-history", farmId] });
          }}
        />
      )}

      {showBatch && (
        <BatchApplyModal
          kind="treatment"
          farmId={farmId}
          profileId={profileId ?? undefined}
          onClose={() => setShowBatch(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["treatments-active", farmId] });
            qc.invalidateQueries({ queryKey: ["treatments-history", farmId] });
          }}
        />
      )}
    </DashboardShell>
  );
}
