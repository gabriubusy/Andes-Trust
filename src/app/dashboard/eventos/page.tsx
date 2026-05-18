"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, Filter } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type EventRow = {
  id: string;
  type: string;
  occurred_at: string;
  notes: string | null;
  payload: Record<string, unknown>;
  animals: { tag: string; name: string | null } | null;
};

const EVENT_LABELS: Record<string, string> = {
  birth: "Nacimiento",
  weighing: "Pesaje",
  vaccination: "Vacunación",
  treatment: "Tratamiento",
  deworming: "Desparasitación",
  insemination: "Inseminación",
  pregnancy_check: "Revisión gestación",
  calving: "Parto",
  transfer: "Transferencia",
  sale: "Venta",
  death: "Muerte",
  slaughter: "Sacrificio",
  note: "Nota",
};

const EVENT_COLORS: Record<string, string> = {
  birth: "bg-green-500",
  weighing: "bg-blue-500",
  vaccination: "bg-purple-500",
  treatment: "bg-orange-500",
  deworming: "bg-yellow-500",
  insemination: "bg-pink-500",
  pregnancy_check: "bg-teal-500",
  calving: "bg-emerald-500",
  transfer: "bg-indigo-500",
  sale: "bg-sky-500",
  death: "bg-red-500",
  slaughter: "bg-rose-500",
  note: "bg-gray-500",
};

const ALL_TYPES = Object.keys(EVENT_LABELS);

export default function EventosPage() {
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const [search, setSearch] = useState("");
  type EventType = "birth" | "weighing" | "vaccination" | "treatment" | "deworming" | "insemination" | "pregnancy_check" | "calving" | "transfer" | "sale" | "death" | "slaughter" | "note";
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const eventsQuery = useQuery<EventRow[]>({
    queryKey: ["animal-events", farmId, typeFilter, page],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      let q = supabase!
        .from("animal_events")
        .select("id, type, occurred_at, notes, payload, animals(tag, name)")
        .eq("farm_id", farmId!)
        .order("occurred_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter !== "all") q = q.eq("type", typeFilter);

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
      EVENT_LABELS[e.type]?.toLowerCase().includes(term)
    );
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <DashboardShell title="Eventos" subtitle="Historial de la finca">
      <div className="flex flex-col gap-6">
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
          <div className="flex items-center gap-2">
            <Filter className="text-foreground/40 h-4 w-4 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as EventType | "all");
                setPage(0);
              }}
              className="border-border bg-background text-foreground focus:border-primary rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="all">Todos los tipos</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card border-border rounded-2xl border">
          {eventsQuery.isLoading ? (
            <div className="text-foreground/50 flex items-center justify-center py-16 text-sm">
              Cargando eventos…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Activity className="text-foreground/20 h-10 w-10" />
              <p className="text-foreground/50 text-sm">No hay eventos registrados</p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {filtered.map((event) => (
                <li key={event.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-0.5 flex-shrink-0">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${EVENT_COLORS[event.type] ?? "bg-gray-400"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-medium">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </span>
                      {event.animals && (
                        <span className="bg-muted text-foreground/70 rounded-full px-2 py-0.5 text-xs">
                          {event.animals.name ?? event.animals.tag} ({event.animals.tag})
                        </span>
                      )}
                    </div>
                    {event.notes && (
                      <p className="text-foreground/60 mt-0.5 text-xs">{event.notes}</p>
                    )}
                    {Object.keys(event.payload ?? {}).length > 0 && (
                      <p className="text-foreground/40 mt-0.5 text-xs">
                        {Object.entries(event.payload)
                          .filter(([, v]) => v !== null && v !== undefined && v !== "")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <time className="text-foreground/40 shrink-0 text-xs">
                    {formatDate(event.occurred_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {(eventsQuery.data?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/50">Página {page + 1}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(eventsQuery.data?.length ?? 0) < PAGE_SIZE}
                className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
