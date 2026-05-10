"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, QrCode, Tag } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type AnimalRow = {
  id: string;
  tag: string;
  name: string | null;
  sex: "male" | "female";
  status: string;
  current_weight_kg: number | null;
  birth_date: string | null;
  breeds: { name: string } | null;
};

export default function AnimalesListPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const animalsQuery = useQuery<AnimalRow[]>({
    queryKey: ["animals", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name, sex, status, current_weight_kg, birth_date, breeds(name)")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AnimalRow[];
    },
  });

  const animals = animalsQuery.data ?? [];

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
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Listado</h2>
            <p className="text-foreground/60 text-xs">
              {animalsQuery.isLoading
                ? "Cargando…"
                : `${animals.length} animal${animals.length === 1 ? "" : "es"} registrado${
                    animals.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>
        </div>

        {animalsQuery.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error al cargar: {(animalsQuery.error as Error).message}
          </div>
        )}

        {!animalsQuery.isLoading && animals.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Tag className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">Aún no tienes animales registrados.</p>
            <Link
              href="/dashboard/animales/nuevo"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Registrar primer animal
            </Link>
          </div>
        )}

        {animals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Arete</th>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Raza</th>
                  <th className="px-5 py-3 text-left font-medium">Sexo</th>
                  <th className="px-5 py-3 text-right font-medium">Peso</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {animals.map((a) => (
                  <tr
                    key={a.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground px-5 py-3 font-mono text-xs font-semibold">
                      {a.tag}
                    </td>
                    <td className="text-foreground px-5 py-3">{a.name ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3">{a.breeds?.name ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3 capitalize">
                      {a.sex === "female" ? "Hembra" : "Macho"}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 text-right tabular-nums">
                      {a.current_weight_kg ? `${a.current_weight_kg} kg` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-primary/10 text-primary inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize">
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/animales/${a.id}`}
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        Ver ficha →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
