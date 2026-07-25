"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Syringe, RefreshCw, Clock } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import Pagination, { usePagination } from "@/components/Pagination";
import { inputClass, labelClass, type Vaccine } from "./shared";
import { DeleteDialog } from "./DeleteDialog";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

const ROUTE_STYLES: Record<string, string> = {
  IM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  SC: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  oral: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  IV: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  IN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

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
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabVacunas() {
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

  useEffect(() => {
    if (vaccinesQuery.error)
      toast.error(friendlyErrorMessage(vaccinesQuery.error, { fallback: "Error al cargar." }));
  }, [vaccinesQuery.error]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: Omit<Vaccine, "id"> & { id?: string }) => {
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
      toast.success("Guardado correctamente");
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
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
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const vaccines = vaccinesQuery.data ?? [];
  const { pageItems, page, setPage, totalPages, total } = usePagination(vaccines, 10);

  return (
    <>
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Syringe className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-foreground text-sm font-bold">Vacunas disponibles</h2>
              <p className="text-foreground/40 text-xs">
                {vaccinesQuery.isLoading
                  ? "Cargando…"
                  : `${vaccines.length} vacuna${vaccines.length === 1 ? "" : "s"} en el catálogo`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nueva vacuna
          </button>
        </div>

        {/* Skeleton loading */}
        {vaccinesQuery.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!vaccinesQuery.isLoading && vaccines.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Syringe className="h-7 w-7 text-emerald-500/60" />
            </div>
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">Sin vacunas registradas</p>
              <p className="text-foreground/40 mt-0.5 text-xs">
                Agrega las vacunas que usas en tu finca para registrar aplicaciones fácilmente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primera vacuna
            </button>
          </div>
        )}

        {/* Table */}
        {vaccines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/40 text-[12px] tracking-wide uppercase">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Nombre</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Enfermedad</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Vía</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Dosis</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Refuerzo</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((v) => (
                  <tr
                    key={v.id}
                    className="border-border hover:bg-muted/30 border-t transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="text-foreground leading-tight font-medium">{v.name}</p>
                      {v.manufacturer && (
                        <p className="text-foreground/40 text-xs">{v.manufacturer}</p>
                      )}
                    </td>
                    <td className="text-foreground/60 px-5 py-3 text-xs">{v.disease ?? "—"}</td>
                    <td className="px-5 py-3">
                      {v.route ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium ${ROUTE_STYLES[v.route] ?? "bg-muted text-foreground/60 border-border"}`}
                        >
                          {v.route}
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-foreground/60 px-5 py-3 text-xs tabular-nums">
                      {v.dose_ml ? `${v.dose_ml} ml` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {v.booster_days ? (
                        <span className="text-foreground/60 inline-flex items-center gap-1 text-xs tabular-nums">
                          <RefreshCw className="text-foreground/30 h-3 w-3" />
                          {v.booster_days} días
                        </span>
                      ) : (
                        <span className="text-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal(v)}
                          className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(v.id)}
                          className="text-foreground/40 rounded-lg p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
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
            <div className="px-5 pb-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onChange={setPage}
                noun="vacuna"
              />
            </div>
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
        <DeleteDialog
          title="¿Eliminar vacuna?"
          body="Los registros de vacunación existentes no se eliminarán, pero perderán la referencia al catálogo."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
