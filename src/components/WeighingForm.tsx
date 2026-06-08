"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { enqueueMutation } from "@/lib/offline/db";
import { toast } from "sonner";

const schema = z.object({
  weight_kg: z
    .string()
    .min(1, "Peso requerido")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, { message: "Peso inválido" }),
  measured_at: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v) return true;
        return new Date(v) <= new Date();
      },
      { message: "La fecha no puede ser futura." }
    ),
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

export default function WeighingForm({ animalId, farmId, profileId, onDone }: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      const weight = Number(v.weight_kg);
      const measuredAt = v.measured_at
        ? new Date(v.measured_at).toISOString()
        : new Date().toISOString();
      const payload = {
        animal_id: animalId,
        farm_id: farmId,
        weight_kg: weight,
        measured_at: measuredAt,
        measured_by: profileId,
        notes: v.notes || null,
      };
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (!supabase || isOffline) {
        await enqueueMutation("weighings", payload);
        return { queued: true };
      }
      const { error } = await supabase.from("weighings").insert(payload);
      if (error) throw error;
      await supabase.from("animals").update({ current_weight_kg: weight }).eq("id", animalId);
      return { queued: false };
    },
    onSuccess: () => {
      toast.success("Guardado correctamente");
      reset();
      queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
      queryClient.invalidateQueries({ queryKey: ["weighings", animalId] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      onDone?.();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass}>Peso (kg) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            {...register("weight_kg")}
          />
          {errors.weight_kg && (
            <p className="text-accent mt-1 text-xs">{errors.weight_kg.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Fecha</label>
          <input
            type="datetime-local"
            className={inputClass}
            max={new Date().toISOString().slice(0, 16)}
            {...register("measured_at")}
          />
          {errors.measured_at && (
            <p className="text-accent mt-1 text-xs">{errors.measured_at.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <input className={inputClass} {...register("notes")} />
        </div>
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Registrar pesaje
      </button>
    </form>
  );
}
