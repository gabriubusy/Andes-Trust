"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { uploadAnimalPhoto } from "@/lib/supabase/storage";
import AnimalPhotoUploader from "@/components/AnimalPhotoUploader";

const schema = z.object({
  tag: z.string().min(1, "El arete es obligatorio").max(50),
  name: z.string().max(120).optional(),
  sex: z.enum(["male", "female"]),
  purpose: z.enum(["", "dairy", "beef", "dual", "breeding"]).optional(),
  birth_date: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v) return true;
        return new Date(v) <= new Date();
      },
      { message: "La fecha de nacimiento no puede ser futura." }
    ),
  current_weight_kg: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
      message: "Peso inválido",
    }),
  color: z.string().max(60).optional(),
  mother_id: z.string().optional(),
  birth_health_notes: z.string().max(500).optional(),
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
  const [selectedBreedIds, setSelectedBreedIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { sex: "female" },
  });

  const sex = watch("sex");
  const purpose = watch("purpose");

  useEffect(() => {
    if (sex === "male" && purpose === "dairy") {
      setValue("purpose", "");
    }
  }, [sex, purpose, setValue]);

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

  const farmId = farmQuery.data?.id;
  const femalesQuery = useQuery({
    queryKey: ["animals-females", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId)
        .eq("sex", "female")
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return (data ?? []) as { id: string; tag: string; name: string | null }[];
    },
  });

  useEffect(() => {
    if (breedsQuery.error) toast.error("Error al cargar: " + (breedsQuery.error as Error).message);
  }, [breedsQuery.error]);

  useEffect(() => {
    if (femalesQuery.error)
      toast.error("Error al cargar: " + (femalesQuery.error as Error).message);
  }, [femalesQuery.error]);

  function toggleBreed(id: string) {
    setSelectedBreedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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
          sex: values.sex,
          purpose: values.purpose || null,
          birth_date: values.birth_date || null,
          birth_weight_kg: weight,
          current_weight_kg: weight,
          color: values.color || null,
          mother_id: values.mother_id || null,
          metadata: values.birth_health_notes
            ? { birth_health_notes: values.birth_health_notes }
            : {},
        })
        .select("id")
        .single();
      if (animalError || !animal) throw animalError ?? new Error("No se creó el animal.");

      if (selectedBreedIds.length > 0) {
        await supabase
          .from("animal_breeds")
          .insert(selectedBreedIds.map((breed_id) => ({ animal_id: animal.id, breed_id })));
      }

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
      toast.success("Guardado correctamente");
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      router.push(`/dashboard/animales/${animalId}`);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const disabled = create.isPending || !farmQuery.data;
  const submitDisabled = disabled || !isValid;

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
        <div className="md:col-span-2">
          <label className={labelClass}>
            Razas{" "}
            {selectedBreedIds.length > 0 && (
              <span className="text-primary font-normal">
                ({selectedBreedIds.length} seleccionadas)
              </span>
            )}
          </label>
          <div className="border-border bg-background rounded-lg border p-3">
            {breedsQuery.isLoading ? (
              <p className="text-muted-foreground text-xs">Cargando razas…</p>
            ) : (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {(breedsQuery.data ?? []).map((b: { id: string; name: string }) => (
                  <label
                    key={b.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted text-sm"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selectedBreedIds.includes(b.id)}
                      onChange={() => toggleBreed(b.id)}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            )}
          </div>
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
            {sex !== "male" && <option value="dairy">Lechero</option>}
            <option value="beef">Carne</option>
            <option value="dual">Doble propósito</option>
            <option value="breeding">Reproducción</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha de nacimiento</label>
          <input
            type="date"
            className={inputClass}
            max={new Date().toISOString().slice(0, 10)}
            {...register("birth_date")}
          />
          {errors.birth_date && (
            <p className="text-accent mt-1 text-xs">{errors.birth_date.message}</p>
          )}
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
        <div>
          <label htmlFor="mother_id" className={labelClass}>
            Madre (opcional)
          </label>
          <select id="mother_id" className={inputClass} {...register("mother_id")}>
            <option value="">— sin registrar —</option>
            {femalesQuery.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.tag}
                {f.name ? ` — ${f.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="birth_health_notes" className={labelClass}>
            Condiciones sanitarias al nacer
          </label>
          <textarea
            id="birth_health_notes"
            rows={3}
            className={inputClass}
            placeholder="Parto normal, sin complicaciones. Peso adecuado para la raza..."
            {...register("birth_health_notes")}
          />
          {errors.birth_health_notes && (
            <p className="text-accent mt-1 text-xs">{errors.birth_health_notes.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Foto del animal</label>
        <AnimalPhotoUploader value={photo} onChange={setPhoto} disabled={disabled} />
      </div>

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
          disabled={submitDisabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear animal
        </button>
      </div>
    </form>
  );
}
