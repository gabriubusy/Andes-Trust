"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Dna } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";

type Breed = {
  id: string;
  name: string;
  species: string;
  purpose: "dairy" | "beef" | "dual" | "breeding" | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  dairy: "Lechero",
  beef: "Cárnico",
  dual: "Doble propósito",
  breeding: "Reproducción",
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

function BreedModal({
  breed,
  onClose,
  onSave,
  saving,
}: {
  breed: Partial<Breed> | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    species: string;
    purpose: "dairy" | "beef" | "dual" | "breeding" | null;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(breed?.name ?? "");
  const [species, setSpecies] = useState(breed?.species ?? "bovine");
  const [purpose, setPurpose] = useState(breed?.purpose ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-5 text-base font-bold">
          {breed?.id ? "Editar raza" : "Nueva raza"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Holstein, Angus, Brahman…"
            />
          </div>
          <div>
            <label className={labelClass}>Especie</label>
            <select
              className={inputClass}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="bovine">Bovina</option>
              <option value="equine">Equina</option>
              <option value="porcine">Porcina</option>
              <option value="ovine">Ovina</option>
              <option value="caprine">Caprina</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Propósito</label>
            <select
              className={inputClass}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="dairy">Lechero</option>
              <option value="beef">Cárnico</option>
              <option value="dual">Doble propósito</option>
              <option value="breeding">Reproducción</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), species, purpose: purpose || null })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RazasPage() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Partial<Breed> | null | false>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const breedsQuery = useQuery<Breed[]>({
    queryKey: ["breeds"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("breeds")
        .select("id, name, species, purpose")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Breed[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      species: string;
      purpose: "dairy" | "beef" | "dual" | "breeding" | null;
    }) => {
      if (!supabase) throw new Error("No supabase");
      if (payload.id) {
        const { error } = await supabase
          .from("breeds")
          .update({ name: payload.name, species: payload.species, purpose: payload.purpose })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("breeds")
          .insert({ name: payload.name, species: payload.species, purpose: payload.purpose });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("No supabase");
      const { error } = await supabase.from("breeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setDeleteId(null);
    },
  });

  const breeds = breedsQuery.data ?? [];

  return (
    <DashboardShell
      title="Razas"
      subtitle="Configuración"
      action={
        <button
          type="button"
          onClick={() => setModal({})}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nueva raza
        </button>
      }
    >
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Catálogo de razas</h2>
            <p className="text-foreground/60 text-xs">
              {breedsQuery.isLoading
                ? "Cargando…"
                : `${breeds.length} raza${breeds.length === 1 ? "" : "s"} registrada${breeds.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {breedsQuery.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error al cargar: {(breedsQuery.error as Error).message}
          </div>
        )}

        {!breedsQuery.isLoading && breeds.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Dna className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">No hay razas registradas.</p>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primera raza
            </button>
          </div>
        )}

        {breeds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Especie</th>
                  <th className="px-5 py-3 text-left font-medium">Propósito</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {breeds.map((b) => (
                  <tr
                    key={b.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground px-5 py-3 font-medium">{b.name}</td>
                    <td className="text-foreground/70 px-5 py-3 capitalize">{b.species}</td>
                    <td className="text-foreground/70 px-5 py-3">
                      {b.purpose ? (PURPOSE_LABELS[b.purpose] ?? b.purpose) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(b)}
                          className="text-foreground/60 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(b.id)}
                          className="text-foreground/60 hover:text-accent hover:bg-accent/10 rounded-lg p-1.5 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== false && (
        <BreedModal
          breed={modal}
          onClose={() => setModal(false)}
          saving={upsertMutation.isPending}
          onSave={(data) =>
            upsertMutation.mutate({ ...(modal?.id ? { id: modal.id } : {}), ...data })
          }
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <h2 className="text-foreground mb-2 text-base font-bold">¿Eliminar raza?</h2>
            <p className="text-foreground/70 mb-6 text-sm">
              Esta acción no se puede deshacer. Los animales que usen esta raza perderán la
              referencia.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
                className="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
