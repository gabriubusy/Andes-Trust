"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Stethoscope } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import TreatmentForm from "@/components/TreatmentForm";

type AnimalOpt = {
  id: string;
  tag: string;
  name: string | null;
  current_weight_kg: number | null;
  birth_date: string | null;
};

type Props = {
  farmId: string | undefined;
  profileId: string | undefined;
  /** Fija el animal (no editable) cuando se abre desde el contexto de un animal. */
  presetAnimalId?: string;
  /** Pre-selecciona el tratamiento del catálogo (p. ej. sugerido por el asistente). */
  presetTreatmentId?: string;
  onClose: () => void;
  onDone: () => void;
};

export default function RegisterTreatmentModal({
  farmId,
  profileId,
  presetAnimalId,
  presetTreatmentId,
  onClose,
  onDone,
}: Props) {
  const { supabase } = useSupabase();
  const [animalId, setAnimalId] = useState(presetAnimalId ?? "");

  const animalsQuery = useQuery<AnimalOpt[]>({
    queryKey: ["animals-for-treatment", farmId],
    enabled: !!supabase && !!farmId && !presetAnimalId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("animals")
        .select("id, tag, name, current_weight_kg, birth_date")
        .eq("farm_id", farmId!)
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return (data ?? []) as AnimalOpt[];
    },
  });

  const animals = animalsQuery.data ?? [];
  const selectedAnimal = animals.find((a) => a.id === animalId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-xl">
              <Stethoscope className="text-primary h-4 w-4" />
            </div>
            <h2 className="text-foreground text-base font-bold">Registrar tratamiento</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de animal (oculto si viene fijado) */}
        {!presetAnimalId && (
          <div className="mb-4">
            <label className="text-foreground mb-1 block text-xs font-medium">
              Animal <span className="text-accent">*</span>
            </label>
            <select
              className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
            >
              <option value="">— Selecciona un animal —</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {animalId ? (
          <TreatmentForm
            key={animalId}
            animalId={animalId}
            farmId={farmId}
            profileId={profileId}
            animalWeightKg={selectedAnimal?.current_weight_kg ?? null}
            animalBirthDate={selectedAnimal?.birth_date ?? null}
            presetTreatmentId={presetTreatmentId}
            onDone={onDone}
          />
        ) : (
          <p className="text-foreground/50 py-4 text-center text-sm">
            Selecciona un animal para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
