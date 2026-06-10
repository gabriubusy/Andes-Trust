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
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  birth: { label: "Nacimiento", icon: Baby, color: "text-green-500", bg: "bg-green-500/10" },
  weighing: { label: "Pesaje", icon: Scale, color: "text-blue-500", bg: "bg-blue-500/10" },
  vaccination: {
    label: "Vacunación",
    icon: Syringe,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  treatment: { label: "Tratamiento", icon: Pill, color: "text-orange-500", bg: "bg-orange-500/10" },
  deworming: {
    label: "Desparasitación",
    icon: Bug,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  insemination: { label: "Inseminación", icon: Dna, color: "text-pink-500", bg: "bg-pink-500/10" },
  pregnancy_check: {
    label: "Revisión gestación",
    icon: Stethoscope,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  calving: { label: "Parto", icon: HeartPulse, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  transfer: {
    label: "Transferencia",
    icon: ArrowRightLeft,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  sale: { label: "Venta", icon: ShoppingCart, color: "text-sky-500", bg: "bg-sky-500/10" },
  death: { label: "Muerte", icon: Skull, color: "text-red-500", bg: "bg-red-500/10" },
  slaughter: { label: "Sacrificio", icon: Skull, color: "text-rose-500", bg: "bg-rose-500/10" },
  note: { label: "Nota", icon: StickyNote, color: "text-gray-400", bg: "bg-gray-500/10" },
};

const PAYLOAD_LABELS: Record<string, string> = {
  location_from: "Desde",
  location_to: "Hacia",
  weight_kg: "Peso (kg)",
  dose_ml: "Dosis (ml)",
  batch_number: "Lote",
  buyer: "Comprador",
  price: "Precio",
};

const ALL_TYPES = Object.keys(EVENT_META);
const PAGE_SIZE = 30;

function formatPayload(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${PAYLOAD_LABELS[k] ?? k}: ${v}`)
    .join(" · ");
}

function groupByDay(events: EventRow[]) {
  const groups: { label: string; events: EventRow[] }[] = [];
  const map = new Map<string, EventRow[]>();

  for (const e of events) {
    const d = new Date(e.occurred_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = "Hoy";
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = "Ayer";
    } else {
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
      groups.push({ label, events: map.get(label)! });
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

  const eventsQuery = useQuery<EventRow[]>({
    queryKey: ["animal-events", farmId, typeFilter, page],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      let q = supabase!
        .from("animal_events")
        .select("id, type, occurred_at, notes, payload, animals(id, tag, name)")
        .eq("farm_id", farmId!)
        .order("occurred_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeFilter !== "all") q = q.eq("type", typeFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const filtered = (eventsQuery.data ?? []).filter((e) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (e.animals?.tag ?? "").toLowerCase().includes(term) ||
      (e.animals?.name ?? "").toLowerCase().includes(term) ||
      (e.notes ?? "").toLowerCase().includes(term) ||
      EVENT_META[e.type]?.label.toLowerCase().includes(term)
    );
  });

  const groups = groupByDay(filtered);

  // Stats
  const total = eventsQuery.data?.length ?? 0;
  const todayCount = (eventsQuery.data ?? []).filter(
    (e) => new Date(e.occurred_at).toDateString() === new Date().toDateString()
  ).length;
  const typeCounts = (eventsQuery.data ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <DashboardShell title="Eventos" subtitle="Historial de la finca">
      <div className="flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-card border-border rounded-2xl border px-5 py-4">
            <p className="text-foreground/50 text-xs">Esta página</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">{total}</p>
            <p className="text-foreground/40 text-xs">eventos</p>
          </div>
          <div className="bg-card border-border rounded-2xl border px-5 py-4">
            <p className="text-foreground/50 text-xs">Hoy</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">{todayCount}</p>
            <p className="text-foreground/40 text-xs">registros</p>
          </div>
          {topType && (
            <div className="bg-card border-border col-span-2 rounded-2xl border px-5 py-4 sm:col-span-1">
              <p className="text-foreground/50 text-xs">Tipo más frecuente</p>
              <p className="text-foreground mt-1 text-lg font-semibold">
                {EVENT_META[topType[0]]?.label ?? topType[0]}
              </p>
              <p className="text-foreground/40 text-xs">{topType[1]} veces</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-foreground/40 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por animal, tipo, nota…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="border-border bg-background text-foreground focus:border-primary w-full rounded-xl border py-2 pr-4 pl-9 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTypeFilter("all");
                setPage(0);
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                typeFilter === "all"
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border text-foreground/60 hover:border-primary/40"
              }`}
            >
              Todos
            </button>
            {ALL_TYPES.map((t) => {
              const meta = EVENT_META[t];
              const Icon = meta.icon;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(0);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                    typeFilter === t
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-foreground/60 hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        {eventsQuery.isLoading ? (
          <div className="text-foreground/50 flex items-center justify-center py-20 text-sm">
            Cargando eventos…
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Activity className="text-foreground/20 h-10 w-10" />
            <p className="text-foreground/50 text-sm">No hay eventos registrados</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-foreground/50 text-xs font-semibold uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="border-border flex-1 border-t" />
                  <span className="text-foreground/30 text-xs">{group.events.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.events.map((event) => {
                    const meta = EVENT_META[event.type] ?? {
                      label: event.type,
                      icon: Activity,
                      color: "text-gray-400",
                      bg: "bg-gray-500/10",
                    };
                    const Icon = meta.icon;
                    const payloadStr = formatPayload(event.payload ?? {});

                    return (
                      <div
                        key={event.id}
                        className="bg-card border-border hover:border-border/80 flex items-start gap-4 rounded-2xl border px-5 py-4 transition-colors"
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground text-sm font-medium">
                              {meta.label}
                            </span>
                            {event.animals && (
                              <Link
                                href={`/dashboard/animales/${event.animals.id}`}
                                className="bg-muted text-foreground/70 hover:text-primary rounded-full px-2 py-0.5 text-xs transition-colors"
                              >
                                {event.animals.name
                                  ? `${event.animals.name} (${event.animals.tag})`
                                  : event.animals.tag}
                              </Link>
                            )}
                          </div>
                          {event.notes && (
                            <p className="text-foreground/60 mt-1 text-xs">{event.notes}</p>
                          )}
                          {payloadStr && (
                            <p className="text-foreground/40 mt-0.5 text-xs">{payloadStr}</p>
                          )}
                        </div>
                        <time className="text-foreground/40 shrink-0 pt-0.5 text-xs">
                          {new Date(event.occurred_at).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(eventsQuery.data?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-foreground/50 text-sm">Página {page + 1}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(eventsQuery.data?.length ?? 0) < PAGE_SIZE}
                className="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
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
