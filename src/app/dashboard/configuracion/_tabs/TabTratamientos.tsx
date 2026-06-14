"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, FlaskConical, Beef, Droplets } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { inputClass, labelClass, type Treatment } from "./shared";
import { DeleteDialog } from "./DeleteDialog";
import { toast } from "sonner";

const KIND_STYLES: Record<string, string> = {
  antibiótico: "bg-red-500/10 text-red-400 border-red-500/20",
  antiparasitario: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  antiinflamatorio: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  vitamina: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hormona: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  otro: "bg-muted text-foreground/50 border-border",
};

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
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabTratamientos() {
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

  useEffect(() => {
    if (query.error) toast.error("Error al cargar: " + (query.error as Error).message);
  }, [query.error]);

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
      toast.success("Guardado correctamente");
    },
    onError: (err) => toast.error((err as Error).message),
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
    onError: (err) => toast.error((err as Error).message),
  });

  const items = query.data ?? [];

  return (
    <>
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
              <FlaskConical className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-foreground text-sm font-bold">Tratamientos disponibles</h2>
              <p className="text-foreground/40 text-xs">
                {query.isLoading
                  ? "Cargando…"
                  : `${items.length} tratamiento${items.length === 1 ? "" : "s"} en el catálogo`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nuevo tratamiento
          </button>
        </div>

        {/* Skeleton loading */}
        {query.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!query.isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-14">
            <div className="bg-amber-500/10 flex h-14 w-14 items-center justify-center rounded-2xl">
              <FlaskConical className="h-7 w-7 text-amber-500/60" />
            </div>
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">Sin tratamientos registrados</p>
              <p className="text-foreground/40 mt-0.5 text-xs">
                Agrega medicamentos y antiparasitarios para registrar tratamientos con un clic.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primero
            </button>
          </div>
        )}

        {/* Table */}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/40 text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Nombre</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Tipo</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Vía</th>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Beef className="h-3 w-3" /> Retiro carne
                    </span>
                  </th>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Droplets className="h-3 w-3" /> Retiro leche
                    </span>
                  </th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className="border-border hover:bg-muted/30 border-t transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="text-foreground font-medium leading-tight">{t.name}</p>
                      {t.active_ingredient && (
                        <p className="text-foreground/40 text-xs">{t.active_ingredient}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {t.kind ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${KIND_STYLES[t.kind] ?? "bg-muted text-foreground/60 border-border"}`}
                        >
                          {t.kind}
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-foreground/60 px-5 py-3 text-xs">{t.route ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {t.withdrawal_meat_days ? (
                        <span className="text-foreground/60 text-xs">
                          {t.withdrawal_meat_days} días
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {t.withdrawal_milk_days ? (
                        <span className="text-foreground/60 text-xs">
                          {t.withdrawal_milk_days} días
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal(t)}
                          className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(t.id)}
                          className="text-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
        <DeleteDialog
          title="¿Eliminar tratamiento?"
          body="Los registros existentes no se eliminarán, pero perderán la referencia al catálogo."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
