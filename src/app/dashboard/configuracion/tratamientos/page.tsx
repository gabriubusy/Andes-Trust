"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, FlaskConical } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

type Treatment = {
  id: string;
  name: string;
  active_ingredient: string | null;
  kind: string | null;
  dose: string | null;
  route: string | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
  notes: string | null;
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

function TreatmentModal({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: Partial<Treatment> | null;
  onClose: () => void;
  onSave: (data: Omit<Treatment, "id">) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<Treatment, "id">>({
    name: item?.name ?? "",
    active_ingredient: item?.active_ingredient ?? null,
    kind: item?.kind ?? null,
    dose: item?.dose ?? null,
    route: item?.route ?? null,
    withdrawal_meat_days: item?.withdrawal_meat_days ?? null,
    withdrawal_milk_days: item?.withdrawal_milk_days ?? null,
    notes: item?.notes ?? null,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({
      ...p,
      [key]:
        value === ""
          ? null
          : ["withdrawal_meat_days", "withdrawal_milk_days"].includes(key)
            ? Number(value)
            : value,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-lg rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-5 text-base font-bold">
          {item?.id ? "Editar tratamiento" : "Nuevo tratamiento"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej. Oxitetraciclina, Ivermectina…"
            />
          </div>
          <div>
            <label className={labelClass}>Principio activo</label>
            <input
              className={inputClass}
              value={form.active_ingredient ?? ""}
              onChange={(e) => set("active_ingredient", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              className={inputClass}
              value={form.kind ?? ""}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="antibiótico">Antibiótico</option>
              <option value="antiparasitario">Antiparasitario</option>
              <option value="antiinflamatorio">Antiinflamatorio</option>
              <option value="vitamina">Vitamina / suplemento</option>
              <option value="hormona">Hormona</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Dosis</label>
            <input
              className={inputClass}
              value={form.dose ?? ""}
              onChange={(e) => set("dose", e.target.value)}
              placeholder="Ej. 5 ml/100 kg"
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
              <option value="tópico">Tópico</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Retiro carne (días)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.withdrawal_meat_days ?? ""}
              onChange={(e) => set("withdrawal_meat_days", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Retiro leche (días)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.withdrawal_milk_days ?? ""}
              onChange={(e) => set("withdrawal_milk_days", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notas</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
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

export default function TratamientosCatalogoPage() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Partial<Treatment> | null | false>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const query = useQuery<Treatment[]>({
    queryKey: ["treatments-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("treatments_catalog")
        .select(
          "id, name, active_ingredient, kind, dose, route, withdrawal_meat_days, withdrawal_milk_days, notes"
        )
        .order("name");
      if (error) throw error;
      return (data ?? []) as Treatment[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Omit<Treatment, "id"> & { id?: string }) => {
      if (!supabase) throw new Error("No supabase");
      const { id, ...data } = payload;
      if (id) {
        const { error } = await supabase.from("treatments_catalog").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("treatments_catalog").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments-catalog"] });
      setModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("No supabase");
      const { error } = await supabase.from("treatments_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments-catalog"] });
      setDeleteId(null);
    },
  });

  const items = query.data ?? [];

  return (
    <DashboardShell
      title="Catálogo de tratamientos"
      subtitle="Configuración"
      action={
        <button
          type="button"
          onClick={() => setModal({})}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nuevo tratamiento
        </button>
      }
    >
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Tratamientos disponibles</h2>
            <p className="text-foreground/60 text-xs">
              {query.isLoading
                ? "Cargando…"
                : `${items.length} tratamiento${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {query.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error: {friendlyErrorMessage(query.error)}
          </div>
        )}

        {!query.isLoading && items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <FlaskConical className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">No hay tratamientos en el catálogo.</p>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primero
            </button>
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Tipo</th>
                  <th className="px-5 py-3 text-left font-medium">Vía</th>
                  <th className="px-5 py-3 text-left font-medium">Retiro carne</th>
                  <th className="px-5 py-3 text-left font-medium">Retiro leche</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground px-5 py-3 font-medium">
                      {t.name}
                      {t.active_ingredient && (
                        <div className="text-foreground/50 text-xs font-normal">
                          {t.active_ingredient}
                        </div>
                      )}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 capitalize">{t.kind ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3">{t.route ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {t.withdrawal_meat_days ? `${t.withdrawal_meat_days} días` : "—"}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {t.withdrawal_milk_days ? `${t.withdrawal_milk_days} días` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(t)}
                          className="text-foreground/60 hover:text-foreground hover:bg-muted rounded-lg p-1.5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(t.id)}
                          className="text-foreground/60 hover:text-accent hover:bg-accent/10 rounded-lg p-1.5"
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
        <TreatmentModal
          item={modal}
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
            <h2 className="text-foreground mb-2 text-base font-bold">¿Eliminar tratamiento?</h2>
            <p className="text-foreground/70 mb-6 text-sm">
              Los registros existentes no se eliminarán, pero perderán la referencia al catálogo.
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
