"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { enqueueMutation } from "@/lib/offline/db";

const schema = z.object({
  treatment_id: z.string().uuid("Selecciona un tratamiento").optional().or(z.literal("")),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  dose: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

type Props = { animalId: string; farmId: string; profileId: string; onDone?: () => void };
type CatalogRow = {
  id: string;
  name: string;
  kind: string | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
};

export default function TreatmentForm({ animalId, farmId, profileId, onDone }: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const catalogQuery = useQuery<CatalogRow[]>({
    queryKey: ["treatments-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("treatments_catalog")
        .select("id, name, kind, withdrawal_meat_days, withdrawal_milk_days")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const watchTreatment = watch("treatment_id");
  const watchStarted = watch("started_at");
  const selected = catalogQuery.data?.find((t) => t.id === watchTreatment);

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
      const { error } = await supabase.from("treatments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["treatments", animalId] });
      onDone?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Tratamiento</label>
          <select className={inputClass} {...register("treatment_id")}>
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
      </div>
      {mutation.error && <p className="text-accent text-sm">{(mutation.error as Error).message}</p>}
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
