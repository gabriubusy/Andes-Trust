"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";

const schema = z.object({
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
});

type Values = z.infer<typeof schema>;

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

type Props = {
  animalId: string;
  farmId: string;
  profileId: string;
  onDone?: () => void;
};

type VaccineRow = { id: string; name: string; booster_days: number | null };

export default function VaccinationForm({ animalId, farmId, profileId, onDone }: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const vaccinesQuery = useQuery<VaccineRow[]>({
    queryKey: ["vaccines-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("vaccines_catalog")
        .select("id, name, booster_days")
        .order("name");
      if (error) throw error;
      return (data ?? []) as VaccineRow[];
    },
  });

  const watchVaccine = watch("vaccine_id");
  const watchApplied = watch("applied_at");

  const handleVaccineChange = (id: string) => {
    setValue("vaccine_id", id, { shouldValidate: true });
    const v = vaccinesQuery.data?.find((x) => x.id === id);
    if (v?.booster_days) {
      const base = watchApplied ? new Date(watchApplied) : new Date();
      base.setDate(base.getDate() + v.booster_days);
      setValue("next_due_at", base.toISOString().slice(0, 10));
    }
  };

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!supabase) throw new Error("Sesión no lista.");
      const appliedAt = v.applied_at
        ? new Date(v.applied_at).toISOString()
        : new Date().toISOString();
      const { error } = await supabase.from("vaccinations").insert({
        animal_id: animalId,
        farm_id: farmId,
        vaccine_id: v.vaccine_id,
        applied_at: appliedAt,
        applied_by: profileId,
        dose_ml: v.dose_ml ? Number(v.dose_ml) : null,
        batch_number: v.batch_number || null,
        next_due_at: v.next_due_at || null,
        notes: v.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["vaccinations", animalId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onDone?.();
    },
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
          <label className={labelClass}>Aplicada el</label>
          <input type="datetime-local" className={inputClass} {...register("applied_at")} />
        </div>
        <div>
          <label className={labelClass}>Dosis (ml)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            {...register("dose_ml")}
          />
        </div>
        <div>
          <label className={labelClass}>Lote</label>
          <input className={inputClass} {...register("batch_number")} />
        </div>
        <div>
          <label className={labelClass}>Próxima dosis</label>
          <input type="date" className={inputClass} {...register("next_due_at")} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Notas</label>
          <input className={inputClass} {...register("notes")} />
        </div>
      </div>
      {mutation.error && <p className="text-accent text-sm">{(mutation.error as Error).message}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar vacuna
      </button>
    </form>
  );
}
