"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  QrCode,
  Tag,
  Search,
  SlidersHorizontal,
  Beef,
  Weight,
  Venus,
  Mars,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { ANIMAL_PHOTOS_BUCKET } from "@/lib/supabase/storage";

type AnimalRow = {
  id: string;
  tag: string;
  name: string | null;
  sex: "male" | "female";
  status: string;
  current_weight_kg: number | null;
  birth_date: string | null;
  photo_url: string | null;
  breeds: { name: string } | null;
};

type SortKey = "tag" | "name" | "breeds" | "current_weight_kg";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  sold: "Vendido",
  deceased: "Fallecido",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  inactive: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  sold: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  deceased: "bg-red-500/15 text-red-400 border-red-500/20",
};

function AnimalAvatar({
  tag,
  name,
  photoUrl,
}: {
  tag: string;
  name: string | null;
  photoUrl: string | null;
}) {
  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : tag
        .replace(/[^A-Z0-9]/gi, "")
        .slice(0, 2)
        .toUpperCase();
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name ?? tag} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
    );
  }
  return (
    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
      {initials}
    </div>
  );
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

export default function AnimalesListPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const currentRole = farmQuery.data?.role ?? "viewer";
  const canEdit = ["owner", "admin", "operator", "vet"].includes(currentRole);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sexFilter, setSexFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tag");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const animalsQuery = useQuery<AnimalRow[]>({
    queryKey: ["animals", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select(
          "id, tag, name, sex, status, current_weight_kg, birth_date, photo_url, breeds(name)"
        )
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as AnimalRow[];

      // Bucket es público — convertir storagePath a URL pública directamente
      return rows.map((a) => ({
        ...a,
        photo_url: a.photo_url
          ? supabase.storage.from(ANIMAL_PHOTOS_BUCKET).getPublicUrl(a.photo_url).data.publicUrl
          : null,
      }));
    },
  });

  useEffect(() => {
    if (animalsQuery.error)
      toast.error("Error al cargar: " + (animalsQuery.error as Error).message);
  }, [animalsQuery.error]);

  const animals = animalsQuery.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const active = animals.filter((a) => a.status === "active").length;
    const females = animals.filter((a) => a.sex === "female").length;
    const males = animals.filter((a) => a.sex === "male").length;
    const weights = animals.filter((a) => a.current_weight_kg).map((a) => a.current_weight_kg!);
    const avgWeight = weights.length ? weights.reduce((s, w) => s + w, 0) / weights.length : 0;
    return { active, females, males, avgWeight, total: animals.length };
  }, [animals]);

  // Unique statuses present
  const statusOptions = useMemo(() => {
    const s = new Set(animals.map((a) => a.status));
    return ["all", ...Array.from(s)];
  }, [animals]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = animals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.tag.toLowerCase().includes(q) ||
          (a.name ?? "").toLowerCase().includes(q) ||
          (a.breeds?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (sexFilter !== "all") list = list.filter((a) => a.sex === sexFilter);

    list = [...list].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "current_weight_kg") {
        va = a.current_weight_kg ?? -1;
        vb = b.current_weight_kg ?? -1;
      } else if (sortKey === "breeds") {
        va = a.breeds?.name ?? "";
        vb = b.breeds?.name ?? "";
      } else {
        va = (a[sortKey] ?? "") as string;
        vb = (b[sortKey] ?? "") as string;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [animals, search, statusFilter, sexFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const thClass = "px-4 py-3 text-left font-medium select-none";
  const thBtn =
    "inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer";

  return (
    <DashboardShell
      title="Animales"
      subtitle="Hato"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/animales/etiquetas"
            className="border-border text-foreground/80 hover:bg-muted hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors md:inline-flex"
          >
            <QrCode className="h-4 w-4" /> Etiquetas QR
          </Link>
          <Link
            href="/dashboard/animales/nuevo"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </Link>
        </div>
      }
    >
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Beef, label: "Total", value: stats.total, color: "text-primary bg-primary/10" },
          {
            icon: Beef,
            label: "Activos",
            value: stats.active,
            color: "text-emerald-400 bg-emerald-500/10",
          },
          {
            icon: Venus,
            label: "Hembras",
            value: stats.females,
            color: "text-pink-400 bg-pink-500/10",
          },
          {
            icon: Mars,
            label: "Machos",
            value: stats.males,
            color: "text-blue-400 bg-blue-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}
            >
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-foreground text-xl font-bold">{s.value}</div>
              <div className="text-foreground/50 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Avg weight pill */}
      {stats.avgWeight > 0 && (
        <div className="flex items-center gap-2">
          <div className="bg-accent/10 text-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Weight className="h-3 w-3" />
            Peso promedio: {stats.avgWeight.toFixed(0)} kg
          </div>
        </div>
      )}

      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Toolbar */}
        <div className="border-border border-b px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-foreground text-base font-bold">Listado</h2>
              <p className="text-foreground/50 text-xs">
                {animalsQuery.isLoading
                  ? "Cargando…"
                  : `${filtered.length} de ${animals.length} animal${animals.length === 1 ? "" : "es"}`}
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="text-foreground/40 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por arete, nombre o raza…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-foreground/30 focus:border-primary w-full rounded-xl border py-2 pr-3 pl-8 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="text-foreground/40 h-3.5 w-3.5 shrink-0" />

            {/* Status filters */}
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "Todos" : (STATUS_LABELS[s] ?? s)}
                </button>
              ))}
            </div>

            <div className="bg-border h-4 w-px" />

            {/* Sex filters */}
            <div className="flex gap-1.5">
              {[
                { key: "all", label: "Ambos sexos" },
                { key: "female", label: "Hembras" },
                { key: "male", label: "Machos" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSexFilter(opt.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    sexFilter === opt.key
                      ? "bg-secondary/20 text-secondary border-secondary/40"
                      : "border-border text-foreground/60 hover:border-secondary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!animalsQuery.isLoading && animals.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="bg-muted/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Tag className="text-foreground/30 h-7 w-7" />
            </div>
            <p className="text-foreground/70 text-sm font-medium">
              Aún no tienes animales registrados
            </p>
            <p className="text-foreground/40 mt-1 text-xs">
              Comienza registrando tu primer animal en el hato
            </p>
            <Link
              href="/dashboard/animales/nuevo"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Registrar primer animal
            </Link>
          </div>
        )}

        {/* No results */}
        {!animalsQuery.isLoading && animals.length > 0 && filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Search className="text-foreground/20 mx-auto h-8 w-8 mb-3" />
            <p className="text-foreground/60 text-sm">No se encontraron animales con ese filtro.</p>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSexFilter("all");
              }}
              className="text-primary mt-2 text-xs hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {animalsQuery.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="bg-muted/40 h-9 w-9 animate-pulse rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted/40 h-3 w-24 animate-pulse rounded" />
                  <div className="bg-muted/30 h-2.5 w-16 animate-pulse rounded" />
                </div>
                <div className="bg-muted/30 h-5 w-14 animate-pulse rounded-full" />
                <div className="bg-muted/30 h-3 w-10 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-foreground/50 border-border border-b text-xs uppercase tracking-wide">
                <tr>
                  <th className={thClass} style={{ width: 48 }} />
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => toggleSort("tag")}>
                      Arete <SortIcon col="tag" sortKey={sortKey} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => toggleSort("name")}>
                      Nombre <SortIcon col="name" sortKey={sortKey} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
                    <button className={thBtn} onClick={() => toggleSort("breeds")}>
                      Raza <SortIcon col="breeds" sortKey={sortKey} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>Sexo</th>
                  <th className={`${thClass} text-right`}>
                    <button className={thBtn} onClick={() => toggleSort("current_weight_kg")}>
                      Peso <SortIcon col="current_weight_kg" sortKey={sortKey} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 group transition-colors">
                    {/* Avatar */}
                    <td className="pl-5 py-3.5">
                      <AnimalAvatar tag={a.tag} name={a.name} photoUrl={a.photo_url ?? null} />
                    </td>

                    {/* Tag */}
                    <td className="px-4 py-3.5">
                      <span className="text-foreground font-mono text-xs font-bold tracking-wider">
                        {a.tag}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <span className="text-foreground font-medium">
                        {a.name ?? (
                          <span className="text-foreground/30 font-normal italic">Sin nombre</span>
                        )}
                      </span>
                    </td>

                    {/* Breed */}
                    <td className="px-4 py-3.5">
                      {a.breeds?.name ? (
                        <span className="bg-muted/60 text-foreground/70 rounded-lg px-2 py-0.5 text-xs">
                          {a.breeds.name}
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Sex */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          a.sex === "female"
                            ? "bg-pink-500/10 text-pink-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {a.sex === "female" ? (
                          <Venus className="h-2.5 w-2.5" />
                        ) : (
                          <Mars className="h-2.5 w-2.5" />
                        )}
                        {a.sex === "female" ? "Hembra" : "Macho"}
                      </span>
                    </td>

                    {/* Weight */}
                    <td className="px-4 py-3.5 text-right">
                      {a.current_weight_kg ? (
                        <span className="text-foreground/80 tabular-nums text-sm">
                          {a.current_weight_kg}{" "}
                          <span className="text-foreground/40 text-xs">kg</span>
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          STATUS_STYLES[a.status] ?? "bg-muted text-foreground/60 border-border"
                        }`}
                      >
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="pr-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/animales/${a.id}`}
                          title="Ver ficha"
                          className="text-foreground/60 hover:text-primary hover:bg-primary/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canEdit && (
                          <Link
                            href={`/dashboard/animales/${a.id}?edit=1`}
                            title="Editar"
                            className="text-foreground/60 hover:text-primary hover:bg-primary/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-border text-foreground/40 flex items-center justify-between border-t px-5 py-3 text-xs">
            <span>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
            {(search || statusFilter !== "all" || sexFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setSexFilter("all");
                }}
                className="text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
