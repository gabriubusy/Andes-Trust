"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  Search,
  Baby,
  Scale,
  Syringe,
  Pill,
  Bug,
  Dna,
  Stethoscope,
  HeartPulse,
  ArrowRightLeft,
  ShoppingCart,
  Skull,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  Clock,
  X,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type EventRow = {
  id: string;
  type: string;
  occurred_at: string;
  notes: string | null;
  payload: Record<string, unknown>;
  animals: { id: string; tag: string; name: string | null } | null;
};

const EVENT_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; ring: string }
> = {
  birth: {
    label: "Nacimiento",
    icon: Baby,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    ring: "ring-green-500/20",
  },
  weighing: {
    label: "Pesaje",
    icon: Scale,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
  },
  vaccination: {
    label: "Vacunación",
    icon: Syringe,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/20",
  },
  treatment: {
    label: "Tratamiento",
    icon: Pill,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/20",
  },
  deworming: {
    label: "Desparasitación",
    icon: Bug,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    ring: "ring-yellow-500/20",
  },
  insemination: {
    label: "Inseminación",
    icon: Dna,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    ring: "ring-pink-500/20",
  },
  pregnancy_check: {
    label: "Revisión gestación",
    icon: Stethoscope,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
    ring: "ring-teal-500/20",
  },
  calving: {
    label: "Parto",
    icon: HeartPulse,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  transfer: {
    label: "Transferencia",
    icon: ArrowRightLeft,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    ring: "ring-indigo-500/20",
  },
  sale: {
    label: "Venta",
    icon: ShoppingCart,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/20",
  },
  death: {
    label: "Muerte",
    icon: Skull,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    ring: "ring-red-500/20",
  },
  slaughter: {
    label: "Sacrificio",
    icon: Skull,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/20",
  },
  note: {
    label: "Nota",
    icon: StickyNote,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-500/10",
    ring: "ring-gray-500/20",
  },
};

const PAYLOAD_LABELS: Record<string, string> = {
  location_from: "Desde",
  location_to: "Hacia",
  weight_kg: "Peso",
  dose_ml: "Dosis",
  batch_number: "Lote",
  buyer: "Comprador",
  price: "Precio",
  vaccine_name: "Vacuna",
  product_name: "Producto",
  diagnosis: "Diagnóstico",
  method: "Método",
  sire: "Semental",
  result: "Resultado",
  expected_due_at: "Parto est.",
  animales: "Animales",
};

const ALL_TYPES = Object.keys(EVENT_META);
const PAGE_SIZE = 30;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

function formatPayloadChips(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 4)
    .map(([k, v]) => ({ label: PAYLOAD_LABELS[k] ?? k.replace(/_/g, " "), value: String(v) }));
}

function groupByDay(events: EventRow[]) {
  const groups: { label: string; date: Date; events: EventRow[] }[] = [];
  const map = new Map<string, EventRow[]>();

  for (const e of events) {
    const d = new Date(e.occurred_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Hoy";
    else if (d.toDateString() === yesterday.toDateString()) label = "Ayer";
    else {
      label = d.toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    if (!map.has(label)) {
      map.set(label, []);
      groups.push({ label, date: d, events: map.get(label)! });
    }
    map.get(label)!.push(e);
  }
  return groups;
}

export default function EventosPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Normaliza la relación a-uno de animales (Supabase puede devolver objeto o array)
  const oneAnimal = (a: unknown): EventRow["animals"] => {
    const row = Array.isArray(a) ? a[0] : a;
    return (row as EventRow["animals"]) ?? null;
  };

  // Los eventos viven en varias tablas: animal_events (traslados/ventas/notas)
  // + las tablas sanitarias propias (tratamientos, vacunas, pesajes). Las
  // combinamos aquí para que TODO aparezca en el historial.
  const eventsQuery = useQuery<EventRow[]>({
    queryKey: ["events-merged", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const LIMIT = 200;
      const [ev, weigh, vac, treat, insem, preg, sales, births] = await Promise.all([
        supabase!
          .from("animal_events")
          .select("id, type, occurred_at, notes, payload, animals(id, tag, name)")
          .eq("farm_id", farmId!)
          .order("occurred_at", { ascending: false })
          .limit(LIMIT),
        supabase!
          .from("weighings")
          .select("id, measured_at, weight_kg, notes, animals(id, tag, name)")
          .eq("farm_id", farmId!)
          .order("measured_at", { ascending: false })
          .limit(LIMIT),
        supabase!
          .from("vaccinations")
          .select(
            "id, applied_at, dose_ml, batch_number, next_due_at, notes, animals(id, tag, name), vaccines_catalog(name)"
          )
          .eq("farm_id", farmId!)
          .order("applied_at", { ascending: false })
          .limit(LIMIT),
        supabase!
          .from("treatments")
          .select(
            "id, started_at, ended_at, dose, notes, animals(id, tag, name), treatments_catalog(name, kind)"
          )
          .eq("farm_id", farmId!)
          .order("started_at", { ascending: false })
          .limit(LIMIT),
        // Reproducción y ventas viven en tablas propias; se combinan igual que
        // pesajes/vacunas/tratamientos para que aparezcan en el timeline.
        (supabase as any)
          .from("inseminations")
          .select(
            "id, performed_at, method, sire_external, notes, animals:animals!inseminations_animal_id_fkey(id, tag, name), sire:animals!inseminations_sire_id_fkey(tag, name)"
          )
          .eq("farm_id", farmId!)
          .order("performed_at", { ascending: false })
          .limit(LIMIT),
        (supabase as any)
          .from("pregnancies")
          .select(
            "id, confirmed_at, expected_due_at, result, notes, created_at, animals(id, tag, name)"
          )
          .eq("farm_id", farmId!)
          .order("confirmed_at", { ascending: false })
          .limit(LIMIT),
        (supabase as any)
          .from("sales")
          .select(
            "id, sold_at, total_amount, currency, status, notes, buyers(name), sale_items(animal_id, animals(id, tag, name))"
          )
          .eq("farm_id", farmId!)
          .neq("status", "draft")
          .order("sold_at", { ascending: false })
          .limit(LIMIT),
        // No existe un evento "birth" propio: el nacimiento se deriva de la
        // fecha de nacimiento registrada en el animal.
        supabase!
          .from("animals")
          .select("id, tag, name, birth_date, birth_weight_kg")
          .eq("farm_id", farmId!)
          .not("birth_date", "is", null)
          .order("birth_date", { ascending: false })
          .limit(LIMIT),
      ]);

      if (ev.error) throw ev.error;

      const rows: EventRow[] = [];

      for (const e of ev.data ?? []) {
        rows.push({
          id: `ev:${e.id}`,
          type: e.type as string,
          occurred_at: e.occurred_at as string,
          notes: (e.notes as string) ?? null,
          payload: (e.payload as Record<string, unknown>) ?? {},
          animals: oneAnimal(e.animals),
        });
      }
      for (const w of weigh.data ?? []) {
        rows.push({
          id: `weigh:${w.id}`,
          type: "weighing",
          occurred_at: w.measured_at as string,
          notes: (w.notes as string) ?? null,
          payload: { weight_kg: w.weight_kg },
          animals: oneAnimal(w.animals),
        });
      }
      for (const v of vac.data ?? []) {
        const cat = v.vaccines_catalog as { name?: string } | { name?: string }[] | null;
        const vaccine_name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
        rows.push({
          id: `vac:${v.id}`,
          type: "vaccination",
          occurred_at: v.applied_at as string,
          notes: (v.notes as string) ?? null,
          payload: {
            vaccine_name,
            dose_ml: v.dose_ml,
            batch_number: v.batch_number,
            next_due_at: v.next_due_at,
          },
          animals: oneAnimal(v.animals),
        });
      }
      for (const t of treat.data ?? []) {
        type Cat = { name?: string; kind?: string };
        const cat = t.treatments_catalog as Cat | Cat[] | null;
        const one = Array.isArray(cat) ? cat[0] : cat;
        const product_name = one?.name;
        // Un tratamiento con producto antiparasitario es una desparasitación.
        const isDeworming = one?.kind === "antiparasitario";
        rows.push({
          id: `treat:${t.id}`,
          type: isDeworming ? "deworming" : "treatment",
          occurred_at: t.started_at as string,
          notes: (t.notes as string) ?? null,
          payload: { product_name, dose: t.dose, ended_at: t.ended_at },
          animals: oneAnimal(t.animals),
        });
      }
      for (const i of (insem?.data ?? []) as any[]) {
        const sire = Array.isArray(i.sire) ? i.sire[0] : i.sire;
        rows.push({
          id: `insem:${i.id}`,
          type: "insemination",
          occurred_at: i.performed_at as string,
          notes: (i.notes as string) ?? null,
          payload: { method: i.method, sire: sire?.tag ?? i.sire_external ?? null },
          animals: oneAnimal(i.animals),
        });
      }
      const PREG_RESULT: Record<string, string> = {
        pregnant: "Preñada",
        empty: "Vacía",
        aborted: "Aborto",
        calved: "Parió",
      };
      for (const p of (preg?.data ?? []) as any[]) {
        rows.push({
          id: `preg:${p.id}`,
          // Un registro con resultado "calved" representa un parto; el resto, una revisión.
          type: p.result === "calved" ? "calving" : "pregnancy_check",
          // La fecha del evento es cuándo se registró/confirmó, NUNCA la fecha
          // estimada de parto (que es futura y desordenaría el timeline).
          occurred_at: (p.confirmed_at ?? p.created_at) as string,
          notes: (p.notes as string) ?? null,
          payload: {
            result: p.result ? (PREG_RESULT[p.result] ?? p.result) : null,
            expected_due_at: p.expected_due_at,
          },
          animals: oneAnimal(p.animals),
        });
      }
      for (const s of (sales?.data ?? []) as any[]) {
        const buyer = Array.isArray(s.buyers) ? s.buyers[0] : s.buyers;
        const items = (s.sale_items ?? []) as { animals: unknown }[];
        const withAnimal = items.filter((it) => it.animals);
        rows.push({
          id: `sale:${s.id}`,
          type: "sale",
          occurred_at: s.sold_at as string,
          notes: (s.notes as string) ?? null,
          payload: {
            buyer: buyer?.name ?? null,
            price: s.total_amount != null ? `${s.total_amount} ${s.currency ?? ""}`.trim() : null,
            animales: withAnimal.length > 1 ? withAnimal.length : null,
          },
          // Con un único animal vinculado lo mostramos; con varios, el chip de conteo.
          animals: withAnimal.length === 1 ? oneAnimal(withAnimal[0].animals) : null,
        });
      }
      for (const a of (births?.data ?? []) as any[]) {
        if (!a.birth_date) continue;
        rows.push({
          id: `birth:${a.id}`,
          type: "birth",
          occurred_at: a.birth_date as string,
          notes: null,
          payload: { weight_kg: a.birth_weight_kg },
          animals: { id: a.id, tag: a.tag, name: a.name },
        });
      }

      rows.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      return rows;
    },
  });

  const allEvents = eventsQuery.data ?? [];

  // Filtro por tipo + búsqueda (en cliente, sobre el conjunto combinado)
  const matched = allEvents.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (e.animals?.tag ?? "").toLowerCase().includes(term) ||
      (e.animals?.name ?? "").toLowerCase().includes(term) ||
      (e.notes ?? "").toLowerCase().includes(term) ||
      EVENT_META[e.type]?.label.toLowerCase().includes(term)
    );
  });

  const pageEvents = matched.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const groups = groupByDay(pageEvents);

  const total = allEvents.length;
  const todayCount = allEvents.filter(
    (e) => new Date(e.occurred_at).toDateString() === new Date().toDateString()
  ).length;
  const typeCounts = allEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topMeta = topType ? EVENT_META[topType[0]] : null;
  const TopIcon = topMeta?.icon ?? Activity;

  return (
    <DashboardShell title="Eventos" subtitle="Historial de la finca">
      <div className="flex flex-col gap-5">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <CalendarDays className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground text-2xl leading-none font-bold">{total}</p>
              <p className="text-foreground/40 mt-1 text-xs">eventos cargados</p>
            </div>
          </div>

          <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-foreground text-2xl leading-none font-bold">{todayCount}</p>
              <p className="text-foreground/40 mt-1 text-xs">registros hoy</p>
            </div>
          </div>

          {topType && topMeta ? (
            <div className="bg-card border-border col-span-2 flex items-center gap-3 rounded-2xl border p-4 sm:col-span-1">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${topMeta.bg}`}
              >
                <TopIcon className={`h-5 w-5 ${topMeta.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-foreground/40 text-xs">Tipo más frecuente</p>
                <p className="text-foreground mt-0.5 truncate text-sm font-semibold">
                  {topMeta.label}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp className="text-foreground/30 h-3 w-3" />
                  <span className="text-foreground/40 text-xs">{topType[1]} registros</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border-border col-span-2 rounded-2xl border p-4 sm:col-span-1" />
          )}
        </div>

        {/* ── Filtros ── */}
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          {/* Search bar */}
          <div className="border-border border-b px-4 py-3">
            <div className="relative">
              <Search className="text-foreground/30 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por animal, tipo, nota…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="bg-muted/40 text-foreground focus:bg-muted/70 placeholder:text-foreground/30 w-full rounded-xl border-0 py-2 pr-9 pl-9 text-sm transition-colors outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-foreground/30 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Type chips — scrollable */}
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto px-4 py-3">
            <button
              onClick={() => {
                setTypeFilter("all");
                setPage(0);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                typeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              Todos {total > 0 && <span className="ml-1 opacity-60">{total}</span>}
            </button>
            {ALL_TYPES.map((t) => {
              const meta = EVENT_META[t];
              const Icon = meta.icon;
              const count = typeCounts[t] ?? 0;
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(0);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? `${meta.bg} ${meta.color} ring-1 ${meta.ring}`
                      : "bg-muted text-foreground/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                  {count > 0 && (
                    <span className={`ml-0.5 text-[11px] ${active ? "opacity-70" : "opacity-40"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Timeline ── */}
        {eventsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border-border h-20 animate-pulse rounded-2xl border"
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-card border-border flex flex-col items-center justify-center gap-3 rounded-2xl border py-24">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
              <Activity className="text-foreground/20 h-7 w-7" />
            </div>
            <p className="text-foreground/50 text-sm">No hay eventos registrados</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-primary text-xs hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Day header */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="bg-muted flex h-7 items-center gap-2 rounded-full px-3">
                    <CalendarDays className="text-foreground/40 h-3 w-3" />
                    <span className="text-foreground/60 text-xs font-semibold">{group.label}</span>
                  </div>
                  <div className="border-border flex-1 border-t" />
                  <span className="bg-muted text-foreground/40 rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {group.events.length} evento{group.events.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Events */}
                <div className="relative pl-5">
                  {/* Vertical timeline line */}
                  <div className="border-border absolute top-0 bottom-0 left-0 w-px border-l border-dashed" />

                  <div className="space-y-2">
                    {group.events.map((event) => {
                      const meta = EVENT_META[event.type] ?? {
                        label: event.type,
                        icon: Activity,
                        color: "text-gray-600 dark:text-gray-400",
                        bg: "bg-gray-500/10",
                        ring: "ring-gray-500/20",
                      };
                      const Icon = meta.icon;
                      const chips = formatPayloadChips(event.payload ?? {});

                      return (
                        <div
                          key={event.id}
                          className="bg-card border-border hover:border-primary/20 group relative flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all hover:shadow-sm"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`border-background absolute top-4 -left-[22px] h-2.5 w-2.5 rounded-full border-2 ${meta.bg.replace("/10", "/60")}`}
                          />

                          {/* Icon */}
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.bg} ${meta.ring}`}
                          >
                            <Icon className={`h-4 w-4 ${meta.color}`} />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-sm font-semibold ${meta.color}`}>
                                {meta.label}
                              </span>
                              {event.animals && (
                                <Link
                                  href={`/dashboard/animales/${event.animals.id}`}
                                  className="bg-muted hover:bg-muted/80 text-foreground/70 hover:text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                                >
                                  {event.animals.name
                                    ? `${event.animals.name} · ${event.animals.tag}`
                                    : event.animals.tag}
                                </Link>
                              )}
                            </div>

                            {event.notes && (
                              <p className="text-foreground/60 mt-1.5 text-xs leading-relaxed">
                                {event.notes}
                              </p>
                            )}

                            {chips.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {chips.map((c) => (
                                  <span
                                    key={c.label}
                                    className="bg-muted/60 text-foreground/50 rounded-lg px-2 py-0.5 text-[12px]"
                                  >
                                    <span className="text-foreground/30">{c.label}:</span>{" "}
                                    <span className="text-foreground/60 font-medium">
                                      {c.value}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Time */}
                          <time className="text-foreground/30 shrink-0 pt-0.5 text-[12px] font-medium">
                            {fmtTime(event.occurred_at)}
                          </time>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {matched.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-foreground/40 text-sm">
              Página <span className="text-foreground font-medium">{page + 1}</span> de{" "}
              {Math.ceil(matched.length / PAGE_SIZE)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= matched.length}
                className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
