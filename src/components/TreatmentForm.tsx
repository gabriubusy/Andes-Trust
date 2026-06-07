"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { enqueueMutation } from "@/lib/offline/db";
import AnimalPhotoUploader from "@/components/AnimalPhotoUploader";
import { uploadAnimalPhoto } from "@/lib/supabase/storage";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const schema = z.object({
  treatment_id: z.string().uuid("Selecciona un tratamiento").optional().or(z.literal("")),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  dose: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  vet_approved: z.boolean().refine((v) => v === true, {
    message: "Se requiere aprobación veterinaria antes de registrar.",
  }),
});

type Values = z.infer<typeof schema>;

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

type Props = {
  animalId: string;
  farmId: string | undefined;
  profileId: string | undefined;
  animalWeightKg?: number | null;
  onDone?: () => void;
};

type CatalogRow = {
  id: string;
  name: string;
  kind: string | null;
  dose_per_kg: number | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
};

export default function TreatmentForm({
  animalId,
  farmId,
  profileId,
  animalWeightKg,
  onDone,
}: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { vet_approved: false },
  });

  const catalogQuery = useQuery<CatalogRow[]>({
    queryKey: ["treatments-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("treatments_catalog")
        .select("id, name, kind, dose_per_kg, withdrawal_meat_days, withdrawal_milk_days")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  useEffect(() => {
    if (catalogQuery.error)
      toast.error("Error al cargar: " + (catalogQuery.error as Error).message);
  }, [catalogQuery.error]);

  const watchTreatment = watch("treatment_id");
  const watchStarted = watch("started_at");
  const selected = catalogQuery.data?.find((t) => t.id === watchTreatment);

  const handleTreatmentChange = (id: string) => {
    setValue("treatment_id", id, { shouldValidate: true });
    const t = catalogQuery.data?.find((x) => x.id === id);
    if (t?.dose_per_kg && animalWeightKg) {
      const calculated = (t.dose_per_kg * animalWeightKg).toFixed(2);
      setValue("dose", `${calculated} ml`);
    }
  };

  const calculatedDose =
    selected?.dose_per_kg && animalWeightKg
      ? `${(selected.dose_per_kg * animalWeightKg).toFixed(2)} ml`
      : null;

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      const startedAt = v.started_at
        ? new Date(v.started_at).toISOString()
        : new Date().toISOString();
      const startDate = new Date(startedAt);

      const withdrawalMeat = selected?.withdrawal_meat_days
        ? new Date(startDate.getTime() + selected.withdrawal_meat_days * 864e5)
            .toISOString()
            .slice(0, 10)
        : null;
      const withdrawalMilk = selected?.withdrawal_milk_days
        ? new Date(startDate.getTime() + selected.withdrawal_milk_days * 864e5)
            .toISOString()
            .slice(0, 10)
        : null;

      const payload = {
        animal_id: animalId,
        farm_id: farmId,
        prescribed_by: profileId,
        treatment_id: v.treatment_id || null,
        started_at: startedAt,
        ended_at: v.ended_at ? new Date(v.ended_at).toISOString() : null,
        dose: v.dose || null,
        notes: v.notes || null,
        withdrawal_until_meat: withdrawalMeat,
        withdrawal_until_milk: withdrawalMilk,
      };

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!supabase || isOffline) {
        await enqueueMutation("treatments", payload);
        return;
      }

      const { data: inserted, error } = await supabase
        .from("treatments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      if (photo && inserted?.id && farmId && profileId) {
        await uploadAnimalPhoto({
          supabase,
          farmId,
          animalId,
          profileId,
          file: photo,
          entityType: "treatment",
          entityId: inserted.id,
        });
      }
    },
    onSuccess: () => {
      reset();
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["treatments", animalId] });
      toast.success("Guardado correctamente");
      onDone?.();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Tratamiento</label>
          <select
            className={inputClass}
            value={watchTreatment ?? ""}
            onChange={(e) => handleTreatmentChange(e.target.value)}
          >
            <option value="">— selecciona o deja en blanco —</option>
            {catalogQuery.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.kind ? ` (${t.kind})` : ""}
              </option>
            ))}
          </select>
          {errors.treatment_id && (
            <p className="text-accent mt-1 text-xs">{errors.treatment_id.message}</p>
          )}
        </div>

        {calculatedDose && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 md:col-span-2 dark:text-blue-400">
            Dosis calculada según peso ({animalWeightKg} kg): <strong>{calculatedDose}</strong> —
            puedes ajustarla manualmente abajo.
          </div>
        )}

        {selected && (selected.withdrawal_meat_days || selected.withdrawal_milk_days) && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 md:col-span-2 dark:text-yellow-400">
            Retiro estimado:{" "}
            {selected.withdrawal_meat_days ? `carne ${selected.withdrawal_meat_days} días` : ""}
            {selected.withdrawal_meat_days && selected.withdrawal_milk_days ? " · " : ""}
            {selected.withdrawal_milk_days ? `leche ${selected.withdrawal_milk_days} días` : ""}
            {watchStarted ? ` desde ${new Date(watchStarted).toLocaleDateString()}` : ""}
          </div>
        )}

        <div>
          <label className={labelClass}>Inicio</label>
          <input type="datetime-local" className={inputClass} {...register("started_at")} />
        </div>
        <div>
          <label className={labelClass}>Fin</label>
          <input type="datetime-local" className={inputClass} {...register("ended_at")} />
        </div>
        <div>
          <label className={labelClass}>Dosis</label>
          <input className={inputClass} placeholder="Ej. 5 ml/kg" {...register("dose")} />
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <input className={inputClass} {...register("notes")} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Foto / evidencia (opcional)</label>
          <AnimalPhotoUploader value={photo} onChange={setPhoto} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded accent-primary"
            {...register("vet_approved")}
          />
          <span className="text-foreground text-sm">
            Confirmo que soy el profesional veterinario responsable y apruebo este tratamiento con
            la dosis indicada.
          </span>
        </label>
        {errors.vet_approved && (
          <p className="text-accent mt-1 text-xs">{errors.vet_approved.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar tratamiento
      </button>
    </form>
  );
}
