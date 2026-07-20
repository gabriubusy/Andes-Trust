"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { enqueueMutation, newClientUuid } from "@/lib/offline/db";
import { submitToastMessage } from "@/lib/offline/submit";
import AnimalPhotoUploader from "@/components/AnimalPhotoUploader";
import { uploadAnimalPhoto } from "@/lib/supabase/storage";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const schema = z
  .object({
    vaccine_id: z.string().uuid("Selecciona una vacuna"),
    applied_at: z.string().optional(),
    dose_ml: z
      .string()
      .optional()
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
        message: "Dosis inválida",
      }),
    batch_number: z.string().max(60).optional(),
    next_due_at: z.string().optional(),
    notes: z.string().max(280).optional(),
    vet_approved: z.boolean().refine((v) => v === true, {
      message: "Se requiere confirmación del veterinario responsable.",
    }),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const applied = data.applied_at ? new Date(data.applied_at + "T12:00:00") : null;
    const nextDue = data.next_due_at ? new Date(data.next_due_at) : null;

    if (applied && applied > now) {
      ctx.addIssue({
        code: "custom",
        path: ["applied_at"],
        message: "La fecha de aplicación no puede ser futura.",
      });
    }
    if (nextDue && applied && nextDue <= applied) {
      ctx.addIssue({
        code: "custom",
        path: ["next_due_at"],
        message: "La próxima dosis debe ser posterior a la fecha de aplicación.",
      });
    }
    if (nextDue && nextDue < now) {
      ctx.addIssue({
        code: "custom",
        path: ["next_due_at"],
        message: "La próxima dosis no puede estar en el pasado.",
      });
    }
  });

type Values = z.infer<typeof schema>;

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

type Props = {
  readonly animalId: string;
  readonly farmId: string | undefined;
  readonly profileId: string | undefined;
  readonly animalBirthDate?: string | null;
  readonly onDone?: () => void;
};

type VaccineRow = {
  id: string;
  name: string;
  booster_days: number | null;
  min_age_days: number | null;
};

function getAnimalAgeDays(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function VaccinationForm({
  animalId,
  farmId,
  profileId,
  animalBirthDate,
  onDone,
}: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [ageWarning, setAgeWarning] = useState<string | null>(null);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const birthDateStr = animalBirthDate ?? null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { vet_approved: false },
  });

  const vaccinesQuery = useQuery<VaccineRow[]>({
    queryKey: ["vaccines-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("vaccines_catalog")
        .select("id, name, booster_days, min_age_days")
        .order("name");
      if (error) throw error;
      return (data ?? []) as VaccineRow[];
    },
  });

  useEffect(() => {
    if (vaccinesQuery.error)
      toast.error("Error al cargar: " + (vaccinesQuery.error as Error).message);
  }, [vaccinesQuery.error]);

  const watchVaccine = watch("vaccine_id");
  const watchApplied = watch("applied_at");

  // Validar fecha de aplicación vs nacimiento y vs hoy
  useEffect(() => {
    setDateWarning(null);
    if (!watchApplied) return;
    const applied = new Date(watchApplied + "T12:00:00");
    const now = new Date();
    if (applied > now) {
      setDateWarning("La fecha de aplicación no puede ser futura.");
      return;
    }
    if (birthDateStr) {
      const birth = new Date(birthDateStr);
      if (applied < birth) {
        setDateWarning(
          `La vacuna no puede aplicarse antes del nacimiento del animal (${new Date(birthDateStr).toLocaleDateString("es-VE")}).`
        );
        return;
      }
    }
  }, [watchApplied, birthDateStr]);

  const handleVaccineChange = (id: string) => {
    setValue("vaccine_id", id, { shouldValidate: true });
    setAgeWarning(null);

    const v = vaccinesQuery.data?.find((x) => x.id === id);
    if (!v) return;

    if (v.booster_days) {
      const base = watchApplied ? new Date(watchApplied) : new Date();
      base.setDate(base.getDate() + v.booster_days);
      setValue("next_due_at", base.toISOString().slice(0, 10));
    }

    if (v.min_age_days) {
      const ageDays = getAnimalAgeDays(animalBirthDate);
      if (ageDays !== null && ageDays < v.min_age_days) {
        const minWeeks = Math.round(v.min_age_days / 7);
        const currentWeeks = Math.round(ageDays / 7);
        setAgeWarning(
          `Esta vacuna requiere que el animal tenga al menos ${minWeeks} semanas (${v.min_age_days} días). ` +
            `El animal tiene aproximadamente ${currentWeeks} semanas (${ageDays} días).`
        );
      }
    }
  };

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      const appliedAt = v.applied_at
        ? new Date(v.applied_at + "T12:00:00").toISOString()
        : new Date().toISOString();
      const payload = {
        animal_id: animalId,
        farm_id: farmId,
        vaccine_id: v.vaccine_id,
        applied_at: appliedAt,
        applied_by: profileId,
        dose_ml: v.dose_ml ? Number(v.dose_ml) : null,
        batch_number: v.batch_number || null,
        next_due_at: v.next_due_at || null,
        notes: v.notes || null,
      };

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!supabase || isOffline) {
        // La cola no guarda binarios: si hay foto adjunta, se pierde. Mejor
        // decirlo que dejar al usuario creyendo que quedó registrada.
        await enqueueMutation(
          "vaccinations",
          { ...payload, client_uuid: newClientUuid() },
          profileId
        );
        return { queued: true as const, photoDropped: !!photo };
      }

      const { data: inserted, error } = await supabase
        .from("vaccinations")
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
          entityType: "vaccination",
          entityId: inserted.id,
        });
      }
      return { queued: false as const, photoDropped: false };
    },
    onSuccess: (result) => {
      reset();
      setPhoto(null);
      setAgeWarning(null);
      queryClient.invalidateQueries({ queryKey: ["vaccinations", animalId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(submitToastMessage(result), {
        description: result.photoDropped
          ? "La foto no se pudo adjuntar sin conexión; vuelve a subirla más tarde."
          : undefined,
      });
      onDone?.();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Vacuna *</label>
          <select
            className={inputClass}
            value={watchVaccine ?? ""}
            onChange={(e) => handleVaccineChange(e.target.value)}
          >
            <option value="">— selecciona —</option>
            {vaccinesQuery.data?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {errors.vaccine_id && (
            <p className="text-accent mt-1 text-xs">{errors.vaccine_id.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="applied_at" className={labelClass}>
            Aplicada el
          </label>
          <input
            id="applied_at"
            type="date"
            className={inputClass}
            max={todayStr}
            {...register("applied_at")}
          />
          {errors.applied_at && (
            <p className="text-accent mt-1 text-xs">{errors.applied_at.message}</p>
          )}
          {dateWarning && !errors.applied_at && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚠️ {dateWarning}</p>
          )}
        </div>

        {ageWarning && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 md:col-span-2 dark:text-red-400">
            ⚠️ {ageWarning}
          </div>
        )}

        <div>
          <label htmlFor="dose_ml" className={labelClass}>
            Dosis (ml)
          </label>
          <input
            id="dose_ml"
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            {...register("dose_ml")}
          />
        </div>
        <div>
          <label htmlFor="batch_number" className={labelClass}>
            Lote
          </label>
          <input id="batch_number" className={inputClass} {...register("batch_number")} />
        </div>
        <div>
          <label htmlFor="next_due_at" className={labelClass}>
            Próxima dosis
          </label>
          <input id="next_due_at" type="date" className={inputClass} {...register("next_due_at")} />
          {errors.next_due_at && (
            <p className="text-accent mt-1 text-xs">{errors.next_due_at.message}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="vax_notes" className={labelClass}>
            Notas
          </label>
          <input id="vax_notes" className={inputClass} {...register("notes")} />
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
            Confirmo que soy el veterinario responsable, he verificado el protocolo sanitario y
            autorizo la aplicación de esta vacuna. <span className="text-accent">*</span>
          </span>
        </label>
        {errors.vet_approved && (
          <p className="text-accent mt-1 text-xs">{errors.vet_approved.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !isValid}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar vacuna
      </button>
    </form>
  );
}
