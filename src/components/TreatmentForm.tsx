"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { enqueueMutation, newClientUuid } from "@/lib/offline/db";
import { isNetworkError, submitToastMessage } from "@/lib/offline/submit";
import AnimalPhotoUploader from "@/components/AnimalPhotoUploader";
import { uploadAnimalPhoto } from "@/lib/supabase/storage";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

const schema = z
  .object({
    treatment_id: z.string().uuid("Selecciona un tratamiento").optional().or(z.literal("")),
    started_at: z.string().min(1, "La fecha de inicio es obligatoria."),
    ended_at: z.string().optional(),
    // Obligatoria y con cantidad: texto libre ("5 ml/kg", "10 ml") pero debe
    // contener un número mayor que cero. Una dosis vacía, "0" o sin cifra no vale.
    dose: z
      .string()
      .min(1, "La dosis es obligatoria.")
      .max(120)
      .refine(
        (v) => {
          const m = v.match(/\d+(\.\d+)?/); // primera cifra del texto
          return m !== null && Number(m[0]) > 0;
        },
        { message: "La dosis debe incluir una cantidad mayor que cero." }
      ),
    notes: z.string().max(500).optional(),
    vet_approved: z.boolean().refine((v) => v === true, {
      message: "Se requiere aprobación veterinaria antes de registrar.",
    }),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const started = data.started_at ? new Date(data.started_at) : null;
    const ended = data.ended_at ? new Date(data.ended_at) : null;
    if (started && started > now)
      ctx.addIssue({
        code: "custom",
        path: ["started_at"],
        message: "La fecha de inicio no puede ser futura.",
      });
    if (started && ended && ended < started)
      ctx.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "La fecha de fin no puede ser anterior al inicio.",
      });
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
  animalBirthDate?: string | null;
  /** Pre-selecciona un tratamiento del catálogo (p. ej. sugerido por el asistente clínico). */
  presetTreatmentId?: string;
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
  animalBirthDate,
  presetTreatmentId,
  onDone,
}: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const birthDateStr = animalBirthDate
    ? new Date(animalBirthDate).toISOString().slice(0, 10)
    : undefined;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      vet_approved: false,
      treatment_id: presetTreatmentId ?? "",
      started_at: new Date().toISOString().slice(0, 10),
    },
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
      toast.error(friendlyErrorMessage(catalogQuery.error, { fallback: "Error al cargar." }));
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

  // Al cargar el catálogo con un tratamiento pre-seleccionado, calcula la dosis sugerida.
  useEffect(() => {
    if (!presetTreatmentId || !catalogQuery.data) return;
    const t = catalogQuery.data.find((x) => x.id === presetTreatmentId);
    if (t?.dose_per_kg && animalWeightKg) {
      setValue("dose", `${(t.dose_per_kg * animalWeightKg).toFixed(2)} ml`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogQuery.data, presetTreatmentId, animalWeightKg]);

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

      // El uuid se genera ANTES del primer intento y viaja también en el
      // insert online: si el insert llega pero se pierde la respuesta, el
      // drenado hace upsert sobre la misma fila en vez de duplicarla.
      const body = { ...payload, client_uuid: newClientUuid() };

      // La cola no guarda binarios: si hay foto adjunta, se pierde. Mejor
      // decirlo que dejar al usuario creyendo que quedó registrada.
      const queue = async () => {
        await enqueueMutation("treatments", body, profileId);
        return { queued: true as const, photoDropped: !!photo };
      };

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!supabase || isOffline) return queue();

      let inserted: { id: string } | null;
      try {
        const { data, error } = await supabase
          .from("treatments")
          .insert(body)
          .select("id")
          .single();
        if (error) throw error;
        inserted = data;
      } catch (err) {
        // `navigator.onLine` sólo sabe si hay interfaz de red levantada, no si
        // hay internet: en el campo devuelve true con señal que no llega a
        // ningún sitio. Sin esto el registro se perdía con un error rojo.
        if (isNetworkError(err)) return queue();
        throw err; // validación o RLS: debe verlo el usuario
      }

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
      return { queued: false as const, photoDropped: false };
    },
    onSuccess: (result) => {
      reset();
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["treatments", animalId] });
      toast.success(submitToastMessage(result), {
        description: result.photoDropped
          ? "La foto no se pudo adjuntar sin conexión; vuelve a subirla más tarde."
          : undefined,
      });
      onDone?.();
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
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

        {selected && (selected.withdrawal_meat_days || selected.withdrawal_milk_days) ? (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 md:col-span-2 dark:text-yellow-400">
            Retiro estimado:{" "}
            {selected.withdrawal_meat_days ? `carne ${selected.withdrawal_meat_days} días` : ""}
            {selected.withdrawal_meat_days && selected.withdrawal_milk_days ? " · " : ""}
            {selected.withdrawal_milk_days ? `leche ${selected.withdrawal_milk_days} días` : ""}
            {watchStarted ? ` desde ${new Date(watchStarted).toLocaleDateString()}` : ""}
          </div>
        ) : null}

        <div>
          <label className={labelClass}>
            Inicio <span className="text-accent">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            max={todayStr}
            min={birthDateStr}
            {...register("started_at")}
          />
          {errors.started_at && (
            <p className="text-accent mt-1 text-xs">{errors.started_at.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Fin</label>
          <input type="date" className={inputClass} min={birthDateStr} {...register("ended_at")} />
          {errors.ended_at && <p className="text-accent mt-1 text-xs">{errors.ended_at.message}</p>}
        </div>
        <div>
          <label className={labelClass}>
            Dosis <span className="text-accent">*</span>
          </label>
          <input className={inputClass} placeholder="Ej. 5 ml/kg" {...register("dose")} />
          {errors.dose && <p className="text-accent mt-1 text-xs">{errors.dose.message}</p>}
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

      <div className="border-border bg-muted/30 rounded-lg border px-4 py-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="accent-primary mt-0.5 h-4 w-4 rounded"
            {...register("vet_approved")}
          />
          <span className="text-foreground text-sm">
            Confirmo que soy el profesional veterinario responsable y apruebo este tratamiento con
            la dosis indicada. <span className="text-accent">*</span>
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
        Registrar tratamiento
      </button>
    </form>
  );
}
