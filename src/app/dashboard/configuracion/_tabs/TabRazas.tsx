"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Dna, X } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { inputClass, labelClass, PURPOSE_LABELS, type Breed } from "./shared";
import { DeleteDialog } from "./DeleteDialog";
import { toast } from "sonner";

const SPECIES_LABELS: Record<string, string> = {
  bovine: "Bovina",
  equine: "Equina",
  porcine: "Porcina",
  ovine: "Ovina",
  caprine: "Caprina",
};

const SPECIES_STYLES: Record<string, string> = {
  bovine: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  equine: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  porcine: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  ovine: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  caprine: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const PURPOSE_STYLES: Record<string, string> = {
  dairy: "bg-blue-500/10 text-blue-400",
  beef: "bg-red-500/10 text-red-400",
  dual: "bg-violet-500/10 text-violet-400",
  breeding: "bg-green-500/10 text-green-400",
};

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
  const [purpose, setPurpose] = useState<"dairy" | "beef" | "dual" | "breeding" | "">(
    breed?.purpose ?? ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl">
              <Dna className="h-4 w-4" />
            </div>
            <h2 className="text-foreground text-base font-bold">
              {breed?.id ? "Editar raza" : "Nueva raza"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Holstein, Angus, Brahman…"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Especie</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SPECIES_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSpecies(key)}
                  className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                    species === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Propósito</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "", label: "Sin especificar" },
                { value: "dairy", label: "🥛 Lechero" },
                { value: "beef", label: "🥩 Cárnico" },
                { value: "dual", label: "⚡ Doble propósito" },
                { value: "breeding", label: "🔄 Reproducción" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPurpose(opt.value as typeof purpose)}
                  className={`rounded-xl border py-2 text-xs font-medium transition-all text-left px-3 ${
                    purpose === opt.value
                      ? "bg-secondary/20 text-secondary border-secondary/40"
                      : "border-border text-foreground/60 hover:border-secondary/30 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), species, purpose: purpose || null })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabRazas() {
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

  useEffect(() => {
    if (breedsQuery.error) toast.error("Error al cargar: " + (breedsQuery.error as Error).message);
  }, [breedsQuery.error]);

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
          .update({
            name: payload.name,
            species: payload.species,
            purpose: payload.purpose,
          } as never)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("breeds").insert({
          name: payload.name,
          species: payload.species,
          purpose: payload.purpose,
        } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setModal(false);
      toast.success("Guardado correctamente");
    },
    onError: (err) => toast.error((err as Error).message),
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
    onError: (err) => toast.error((err as Error).message),
  });

  const breeds = breedsQuery.data ?? [];

  return (
    <>
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
              <Dna className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-bold">Catálogo de razas</h2>
              <p className="text-foreground/50 text-xs">
                {breedsQuery.isLoading
                  ? "Cargando…"
                  : `${breeds.length} raza${breeds.length === 1 ? "" : "s"} registrada${breeds.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva raza
          </button>
        </div>

        {/* Skeleton */}
        {breedsQuery.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="bg-muted/40 h-3 w-28 animate-pulse rounded" />
                <div className="bg-muted/30 h-5 w-16 animate-pulse rounded-full" />
                <div className="bg-muted/20 ml-auto h-5 w-14 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!breedsQuery.isLoading && breeds.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="bg-muted/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Dna className="text-foreground/30 h-7 w-7" />
            </div>
            <p className="text-foreground/70 text-sm font-medium">No hay razas registradas</p>
            <p className="text-foreground/40 mt-1 text-xs">Crea el catálogo de razas de tu hato</p>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primera raza
            </button>
          </div>
        )}

        {/* Table */}
        {breeds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-foreground/50 border-border border-b text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Especie</th>
                  <th className="px-5 py-3 text-left font-medium">Propósito</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {breeds.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 group transition-colors">
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold">
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-foreground font-medium">{b.name}</span>
                      </div>
                    </td>

                    {/* Species chip */}
                    <td className="px-5 py-3.5">
                      {b.species ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SPECIES_STYLES[b.species] ?? "bg-muted text-foreground/50 border-border"}`}
                        >
                          {SPECIES_LABELS[b.species] ?? b.species}
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-400 border-amber-500/20 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                          Bovina
                        </span>
                      )}
                    </td>

                    {/* Purpose chip */}
                    <td className="px-5 py-3.5">
                      {b.purpose ? (
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${PURPOSE_STYLES[b.purpose] ?? "bg-muted text-foreground/50"}`}
                        >
                          {PURPOSE_LABELS[b.purpose] ?? b.purpose}
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">Sin especificar</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="pr-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setModal(b)}
                          className="text-foreground/50 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(b.id)}
                          className="text-foreground/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {breeds.length > 0 && (
          <div className="border-border text-foreground/40 border-t px-5 py-3 text-xs">
            {breeds.length} raza{breeds.length !== 1 ? "s" : ""} en el catálogo
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
        <DeleteDialog
          title="¿Eliminar raza?"
          body="Esta acción no se puede deshacer. Los animales que usen esta raza perderán la referencia."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
