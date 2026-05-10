"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { uploadAnimalPhoto } from "@/lib/supabase/storage";
import AnimalPhotoUploader from "@/components/AnimalPhotoUploader";

const schema = z.object({
  tag: z.string().min(1, "El arete es obligatorio").max(50),
  name: z.string().max(120).optional(),
  breed_id: z.string().optional(),
  sex: z.enum(["male", "female"]),
  purpose: z.enum(["", "dairy", "beef", "dual", "breeding"]).optional(),
  birth_date: z.string().optional(),
  current_weight_kg: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
      message: "Peso inválido",
    }),
  color: z.string().max(60).optional(),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

export default function AnimalForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sex: "female" },
  });

  const breedsQuery = useQuery({
    queryKey: ["breeds"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("breeds").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!supabase || !profileId || !farmQuery.data) {
        throw new Error("Sesión no lista. Reintenta en unos segundos.");
      }
      const farmId = farmQuery.data.id;
      const weight = values.current_weight_kg ? Number(values.current_weight_kg) : null;

      const { data: animal, error: animalError } = await supabase
        .from("animals")
        .insert({
          farm_id: farmId,
          tag: values.tag,
          name: values.name || null,
          breed_id: values.breed_id || null,
          sex: values.sex,
          purpose: values.purpose || null,
          birth_date: values.birth_date || null,
          birth_weight_kg: weight,
          current_weight_kg: weight,
          color: values.color || null,
        })
        .select("id")
        .single();
      if (animalError || !animal) throw animalError ?? new Error("No se creó el animal.");

      if (weight !== null) {
        await supabase.from("weighings").insert({
          animal_id: animal.id,
          farm_id: farmId,
          weight_kg: weight,
          measured_by: profileId,
          notes: "Peso inicial al alta",
        });
      }

      await supabase
        .from("traceability_tokens")
        .insert({ farm_id: farmId, entity_type: "animal", entity_id: animal.id });

      if (photo) {
        const { storagePath } = await uploadAnimalPhoto({
          supabase,
          farmId,
          animalId: animal.id,
          profileId,
          file: photo,
        });
        await supabase.from("animals").update({ photo_url: storagePath }).eq("id", animal.id);
      }

      return animal.id as string;
    },
    onSuccess: (animalId) => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      router.push(`/dashboard/animales/${animalId}`);
    },
  });

  const disabled = create.isPending || !farmQuery.data;

  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Arete / Identificador *</label>
          <input className={inputClass} placeholder="BR-1042" {...register("tag")} />
          {errors.tag && <p className="text-accent mt-1 text-xs">{errors.tag.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Nombre / alias</label>
          <input className={inputClass} placeholder="Lucero" {...register("name")} />
        </div>
        <div>
          <label className={labelClass}>Raza</label>
          <select className={inputClass} {...register("breed_id")}>
            <option value="">— sin raza —</option>
            {breedsQuery.data?.map((b: { id: string; name: string }) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sexo *</label>
          <select className={inputClass} {...register("sex")}>
            <option value="female">Hembra</option>
            <option value="male">Macho</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Propósito</label>
          <select className={inputClass} {...register("purpose")}>
            <option value="">—</option>
            <option value="dairy">Lechero</option>
            <option value="beef">Carne</option>
            <option value="dual">Doble propósito</option>
            <option value="breeding">Reproducción</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha de nacimiento</label>
          <input type="date" className={inputClass} {...register("birth_date")} />
        </div>
        <div>
          <label className={labelClass}>Peso actual (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            placeholder="380"
            {...register("current_weight_kg")}
          />
        </div>
        <div>
          <label className={labelClass}>Color / capa</label>
          <input className={inputClass} placeholder="Negro y blanco" {...register("color")} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Foto del animal</label>
        <AnimalPhotoUploader value={photo} onChange={setPhoto} disabled={disabled} />
      </div>

      {create.error && <p className="text-accent text-sm">{(create.error as Error).message}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="border-border text-foreground/80 hover:bg-muted rounded-lg border px-4 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear animal
        </button>
      </div>
    </form>
  );
}
