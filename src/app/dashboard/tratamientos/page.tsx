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
            return (
              <div
                key={t.id}
                className={`bg-card border rounded-2xl p-4 ${
                  inWithdrawal ? "border-amber-500/30" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Pill className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-foreground font-semibold">
                        {t.treatments_catalog?.name ?? "Tratamiento libre"}
                      </div>
                      {t.treatments_catalog?.active_ingredient && (
                        <div className="text-muted-foreground text-xs">
                          {t.treatments_catalog.active_ingredient}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <KindBadge kind={t.treatments_catalog?.kind ?? null} />
                        {inWithdrawal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Retiro activo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    {t.animals ? (
                      <Link
                        href={`/dashboard/animales/${t.animals.id}`}
                        className="text-primary font-mono font-semibold hover:underline"
                      >
                        {t.animals.tag}
                        {t.animals.name ? ` — ${t.animals.name}` : ""}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Animal eliminado</span>
                    )}
                    <div className="text-muted-foreground mt-0.5">
                      Inicio: {new Date(t.started_at).toLocaleDateString()}
                    </div>
                    {t.dose && <div className="text-muted-foreground">Dosis: {t.dose}</div>}
                  </div>
                </div>

                {(t.withdrawal_until_meat || t.withdrawal_until_milk) && (
                  <div className="border-border mt-3 flex flex-wrap gap-2 border-t pt-3">
                    <WithdrawalChip label="🥩 Carne" date={t.withdrawal_until_meat} />
                    <WithdrawalChip label="🥛 Leche" date={t.withdrawal_until_milk} />
                    {t.withdrawal_until_meat &&
                      daysLeft(t.withdrawal_until_meat) !== null &&
                      daysLeft(t.withdrawal_until_meat)! < 0 && (
                        <span className="text-muted-foreground text-xs">
                          ✓ Retiro carne cumplido
                        </span>
                      )}
                    {t.withdrawal_until_milk &&
                      daysLeft(t.withdrawal_until_milk) !== null &&
                      daysLeft(t.withdrawal_until_milk)! < 0 && (
                        <span className="text-muted-foreground text-xs">
                          ✓ Retiro leche cumplido
                        </span>
                      )}
                  </div>
                )}

                {t.notes && <p className="text-muted-foreground mt-2 text-xs">{t.notes}</p>}
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
