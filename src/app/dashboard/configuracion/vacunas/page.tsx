"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Syringe } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";

type Vaccine = {
  id: string;
  name: string;
  manufacturer: string | null;
  disease: string | null;
  dose_ml: number | null;
  route: string | null;
  booster_days: number | null;
  withdrawal_days: number | null;
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

function VaccineModal({
  vaccine,
  onClose,
  onSave,
  saving,
}: {
  vaccine: Partial<Vaccine> | null;
  onClose: () => void;
  onSave: (data: Omit<Vaccine, "id">) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<Vaccine, "id">>({
    name: vaccine?.name ?? "",
    manufacturer: vaccine?.manufacturer ?? null,
    disease: vaccine?.disease ?? null,
    dose_ml: vaccine?.dose_ml ?? null,
    route: vaccine?.route ?? null,
    booster_days: vaccine?.booster_days ?? null,
    withdrawal_days: vaccine?.withdrawal_days ?? null,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({
      ...p,
      [key]:
        value === ""
          ? null
          : ["dose_ml", "booster_days", "withdrawal_days"].includes(key)
            ? Number(value)
            : value,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-lg rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-5 text-base font-bold">
          {vaccine?.id ? "Editar vacuna" : "Nueva vacuna"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej. Fiebre Aftosa, Brucelosis…"
            />
          </div>
          <div>
            <label className={labelClass}>Fabricante</label>
            <input
              className={inputClass}
              value={form.manufacturer ?? ""}
              onChange={(e) => set("manufacturer", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Enfermedad</label>
            <input
              className={inputClass}
              value={form.disease ?? ""}
              onChange={(e) => set("disease", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Dosis (ml)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={form.dose_ml ?? ""}
              onChange={(e) => set("dose_ml", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Vía de aplicación</label>
            <select
              className={inputClass}
              value={form.route ?? ""}
              onChange={(e) => set("route", e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="IM">Intramuscular (IM)</option>
              <option value="SC">Subcutánea (SC)</option>
              <option value="oral">Oral</option>
              <option value="IV">Intravenosa (IV)</option>
              <option value="IN">Intranasal (IN)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Refuerzo (días)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.booster_days ?? ""}
              onChange={(e) => set("booster_days", e.target.value)}
              placeholder="Ej. 365"
            />
          </div>
          <div>
            <label className={labelClass}>Retiro carne/leche (días)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.withdrawal_days ?? ""}
              onChange={(e) => set("withdrawal_days", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!form.name.trim() || saving}
            onClick={() => onSave(form)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VacunasCatalogoPage() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Partial<Vaccine> | null | false>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const vaccinesQuery = useQuery<Vaccine[]>({
    queryKey: ["vaccines-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("vaccines_catalog")
        .select("id, name, manufacturer, disease, dose_ml, route, booster_days, withdrawal_days")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Vaccine[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<Vaccine> & { id?: string }) => {
      if (!supabase) throw new Error("No supabase");
      const { id, ...data } = payload;
      if (id) {
        const { error } = await supabase.from("vaccines_catalog").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vaccines_catalog").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaccines-catalog"] });
      setModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("No supabase");
      const { error } = await supabase.from("vaccines_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaccines-catalog"] });
      setDeleteId(null);
    },
  });

  const vaccines = vaccinesQuery.data ?? [];

  return (
    <DashboardShell
      title="Catálogo de vacunas"
      subtitle="Configuración"
      action={
        <button
          type="button"
          onClick={() => setModal({})}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nueva vacuna
        </button>
      }
    >
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Vacunas disponibles</h2>
            <p className="text-foreground/60 text-xs">
              {vaccinesQuery.isLoading
                ? "Cargando…"
                : `${vaccines.length} vacuna${vaccines.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {vaccinesQuery.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error: {(vaccinesQuery.error as Error).message}
          </div>
        )}

        {!vaccinesQuery.isLoading && vaccines.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Syringe className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">No hay vacunas en el catálogo.</p>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primera vacuna
            </button>
          </div>
        )}

        {vaccines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Enfermedad</th>
                  <th className="px-5 py-3 text-left font-medium">Vía</th>
                  <th className="px-5 py-3 text-left font-medium">Dosis</th>
                  <th className="px-5 py-3 text-left font-medium">Refuerzo</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {vaccines.map((v) => (
                  <tr
                    key={v.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground px-5 py-3 font-medium">
                      {v.name}
                      {v.manufacturer && (
                        <div className="text-foreground/50 text-xs font-normal">
                          {v.manufacturer}
                        </div>
                      )}
                    </td>
                    <td className="text-foreground/70 px-5 py-3">{v.disease ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3">{v.route ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {v.dose_ml ? `${v.dose_ml} ml` : "—"}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {v.booster_days ? `${v.booster_days} días` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(v)}
                          className="text-foreground/60 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(v.id)}
                          className="text-foreground/60 hover:text-accent hover:bg-accent/10 rounded-lg p-1.5 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== false && (
        <VaccineModal
          vaccine={modal}
          onClose={() => setModal(false)}
          saving={upsertMutation.isPending}
          onSave={(data) =>
            upsertMutation.mutate({ ...(modal?.id ? { id: modal.id } : {}), ...data })
          }
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <h2 className="text-foreground mb-2 text-base font-bold">¿Eliminar vacuna?</h2>
            <p className="text-foreground/70 mb-6 text-sm">
              Los registros de vacunación existentes que usen esta vacuna no se eliminarán, pero
              perderán la referencia al catálogo.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
                className="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
