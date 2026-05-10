"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";

const schema = z.object({
  liters: z
    .string()
    .min(1, "Litros requeridos")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, { message: "Valor inválido" }),
  shift: z.enum(["am", "pm", "midday"]),
  recorded_on: z.string().optional(),
  fat_pct: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: "% inválido",
    }),
  protein_pct: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: "% inválido",
    }),
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

export default function MilkForm({ animalId, farmId, profileId, onDone }: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { shift: "am" },
  });

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      if (!supabase) throw new Error("Sesión no lista.");
      const { error } = await supabase.from("milk_records").insert({
        animal_id: animalId,
        farm_id: farmId,
        recorded_by: profileId,
        liters: Number(v.liters),
        shift: v.shift,
        recorded_on: v.recorded_on || new Date().toISOString().slice(0, 10),
        fat_pct: v.fat_pct ? Number(v.fat_pct) : null,
        protein_pct: v.protein_pct ? Number(v.protein_pct) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      reset({ shift: "am" });
      queryClient.invalidateQueries({ queryKey: ["milk", animalId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onDone?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass}>Litros *</label>
          <input type="number" step="0.01" min="0" className={inputClass} {...register("liters")} />
          {errors.liters && <p className="text-accent mt-1 text-xs">{errors.liters.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Turno *</label>
          <select className={inputClass} {...register("shift")}>
            <option value="am">Mañana (AM)</option>
            <option value="midday">Mediodía</option>
            <option value="pm">Tarde (PM)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" className={inputClass} {...register("recorded_on")} />
        </div>
        <div>
          <label className={labelClass}>% Grasa</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={inputClass}
            {...register("fat_pct")}
          />
          {errors.fat_pct && <p className="text-accent mt-1 text-xs">{errors.fat_pct.message}</p>}
        </div>
        <div>
          <label className={labelClass}>% Proteína</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={inputClass}
            {...register("protein_pct")}
          />
          {errors.protein_pct && (
            <p className="text-accent mt-1 text-xs">{errors.protein_pct.message}</p>
          )}
        </div>
      </div>
      {mutation.error && <p className="text-accent text-sm">{(mutation.error as Error).message}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar producción
      </button>
    </form>
  );
}
