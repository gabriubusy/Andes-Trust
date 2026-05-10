"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Dna,
  Syringe,
  FlaskConical,
  Building2,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

// ─── shared styles ────────────────────────────────────────────────────────────
const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

// ─── types ────────────────────────────────────────────────────────────────────
type Breed = { id: string; name: string; species: string; purpose: string | null };
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
type FarmDetail = {
  id: string;
  name: string;
  legal_id: string | null;
  country: string | null;
  region: string | null;
  address: string | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  dairy: "Lechero",
  beef: "Cárnico",
  dual: "Doble propósito",
  breeding: "Reproducción",
};

// ─── Delete confirm dialog ─────────────────────────────────────────────────
function DeleteDialog({
  title,
  body,
  onCancel,
  onConfirm,
  pending,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-2 text-base font-bold">{title}</h2>
        <p className="text-foreground/70 mb-6 text-sm">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: FINCA
// ═══════════════════════════════════════════════════════════════════════════════
function TabFinca() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Omit<FarmDetail, "id">>({
    name: "",
    legal_id: null,
    country: null,
    region: null,
    address: null,
  });
  const [saved, setSaved] = useState(false);

  const detailQuery = useQuery<FarmDetail | null>({
    queryKey: ["farm-detail", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return null;
      const { data, error } = await supabase
        .from("farms")
        .select("id, name, legal_id, country, region, address")
        .eq("id", farmId)
        .maybeSingle();
      if (error) throw error;
      return data as FarmDetail | null;
    },
  });

  useEffect(() => {
    if (detailQuery.data)
      setForm({
        name: detailQuery.data.name,
        legal_id: detailQuery.data.legal_id,
        country: detailQuery.data.country,
        region: detailQuery.data.region,
        address: detailQuery.data.address,
      });
  }, [detailQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !farmId) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("farms")
        .update({
          name: form.name.trim(),
          legal_id: form.legal_id || null,
          country: form.country || null,
          region: form.region || null,
          address: form.address || null,
        })
        .eq("id", farmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-detail", farmId] });
      queryClient.invalidateQueries({ queryKey: ["current-farm"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value || null }));

  return (
    <div className="bg-card border-border max-w-2xl rounded-2xl border p-6">
      <p className="text-foreground/60 mb-6 text-sm">
        Esta información aparece en los certificados y fichas públicas de tus animales.
      </p>

      {detailQuery.isLoading ? (
        <div className="flex items-center gap-2 py-6">
          <Loader2 className="text-primary h-4 w-4 animate-spin" />
          <span className="text-foreground/60 text-sm">Cargando…</span>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Nombre de la finca *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Finca El Progreso"
            />
          </div>
          <div>
            <label className={labelClass}>NIT / Cédula jurídica</label>
            <input
              className={inputClass}
              value={form.legal_id ?? ""}
              onChange={(e) => set("legal_id", e.target.value)}
              placeholder="Identificación fiscal (opcional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>País</label>
              <input
                className={inputClass}
                value={form.country ?? ""}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Ej. Venezuela"
              />
            </div>
            <div>
              <label className={labelClass}>Región / Estado</label>
              <input
                className={inputClass}
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value)}
                placeholder="Ej. Mérida"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input
              className={inputClass}
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Vereda, municipio, km…"
            />
          </div>
          {updateMutation.error && (
            <p className="text-accent text-sm">{(updateMutation.error as Error).message}</p>
          )}
          <div className="pt-2">
            <button
              type="button"
              disabled={!form.name.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saved ? "Guardado" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: RAZAS
// ═══════════════════════════════════════════════════════════════════════════════
function BreedModal({
  breed,
  onClose,
  onSave,
  saving,
}: {
  breed: Partial<Breed> | null;
  onClose: () => void;
  onSave: (data: { name: string; species: string; purpose: string | null }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(breed?.name ?? "");
  const [species, setSpecies] = useState(breed?.species ?? "bovine");
  const [purpose, setPurpose] = useState(breed?.purpose ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-5 text-base font-bold">
          {breed?.id ? "Editar raza" : "Nueva raza"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Holstein, Angus, Brahman…"
            />
          </div>
          <div>
            <label className={labelClass}>Especie</label>
            <select
              className={inputClass}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="bovine">Bovina</option>
              <option value="equine">Equina</option>
              <option value="porcine">Porcina</option>
              <option value="ovine">Ovina</option>
              <option value="caprine">Caprina</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Propósito</label>
            <select
              className={inputClass}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="dairy">Lechero</option>
              <option value="beef">Cárnico</option>
              <option value="dual">Doble propósito</option>
              <option value="breeding">Reproducción</option>
            </select>
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
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), species, purpose: purpose || null })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function TabRazas({ onAdd }: { onAdd: () => void }) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Partial<Breed> | null | false>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const breedsQuery = useQuery<Breed[]>({
    queryKey: ["breeds"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("breeds")
        .select("id, name, species, purpose")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Breed[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      species: string;
      purpose: string | null;
    }) => {
      if (!supabase) throw new Error("No supabase");
      if (payload.id) {
        const { error } = await supabase
          .from("breeds")
          .update({ name: payload.name, species: payload.species, purpose: payload.purpose })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("breeds")
          .insert({ name: payload.name, species: payload.species, purpose: payload.purpose });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("No supabase");
      const { error } = await supabase.from("breeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setDeleteId(null);
    },
  });

  // expose add trigger to parent for header action button
  useEffect(() => {
    /* intentional — onAdd is passed down */
  }, []);

  const breeds = breedsQuery.data ?? [];

  return (
    <>
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Catálogo de razas</h2>
            <p className="text-foreground/60 text-xs">
              {breedsQuery.isLoading
                ? "Cargando…"
                : `${breeds.length} raza${breeds.length === 1 ? "" : "s"} registrada${breeds.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nueva raza
          </button>
        </div>

        {breedsQuery.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error al cargar: {(breedsQuery.error as Error).message}
          </div>
        )}

        {!breedsQuery.isLoading && breeds.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Dna className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">No hay razas registradas.</p>
            <button
              type="button"
              onClick={() => setModal({})}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Agregar primera raza
            </button>
          </div>
        )}

        {breeds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium">Especie</th>
                  <th className="px-5 py-3 text-left font-medium">Propósito</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {breeds.map((b) => (
                  <tr
                    key={b.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="text-foreground px-5 py-3 font-medium">{b.name}</td>
                    <td className="text-foreground/70 px-5 py-3 capitalize">{b.species}</td>
                    <td className="text-foreground/70 px-5 py-3">
                      {b.purpose ? (PURPOSE_LABELS[b.purpose] ?? b.purpose) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(b)}
                          className="text-foreground/60 hover:text-foreground hover:bg-muted rounded-lg p-1.5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(b.id)}
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
        <BreedModal
          breed={modal}
          onClose={() => setModal(false)}
          saving={upsertMutation.isPending}
          onSave={(data) =>
            upsertMutation.mutate({ ...(modal?.id ? { id: modal.id } : {}), ...data })
          }
        />
      )}
      {deleteId && (
        <DeleteDialog
          title="¿Eliminar raza?"
          body="Esta acción no se puede deshacer. Los animales que usen esta raza perderán la referencia."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          pending={deleteMutation.isPending}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: VACUNAS
// ═══════════════════════════════════════════════════════════════════════════════
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

function TabVacunas() {
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
    <>
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
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nueva vacuna
          </button>
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
                          className="text-foreground/60 hover:text-foreground hover:bg-muted rounded-lg p-1.5"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(v.id)}
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TRATAMIENTOS
// ═══════════════════════════════════════════════════════════════════════════════
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

function TabTratamientos() {
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
    mutationFn: async (payload: Partial<Treatment> & { id?: string }) => {
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
    <>
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
          <button
            type="button"
            onClick={() => setModal({})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nuevo tratamiento
          </button>
        </div>

        {query.error && (
          <div className="text-accent px-5 py-4 text-sm">
            Error: {(query.error as Error).message}
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
type Tab = "finca" | "razas" | "vacunas" | "tratamientos";

const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "finca", label: "Finca", icon: Building2, description: "Datos generales" },
  { id: "razas", label: "Razas", icon: Dna, description: "Catálogo de razas" },
  { id: "vacunas", label: "Vacunas", icon: Syringe, description: "Catálogo de vacunas" },
  {
    id: "tratamientos",
    label: "Tratamientos",
    icon: FlaskConical,
    description: "Medicamentos y antiparasitarios",
  },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<Tab>("finca");
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <DashboardShell title="Configuración" subtitle="Ajustes">
      {/* Page header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Administra los catálogos y ajustes generales de tu finca.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <nav className="shrink-0 lg:w-52">
          <ul className="space-y-1">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-primary/15" : "bg-muted"
                      }`}
                    >
                      <t.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : "text-foreground/50"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-sm leading-tight font-medium ${isActive ? "text-primary" : ""}`}
                      >
                        {t.label}
                      </div>
                      <div className="text-foreground/50 truncate text-xs leading-tight">
                        {t.description}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {/* Section header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
              <active.icon className="text-primary h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base leading-tight font-bold">{active.label}</h2>
              <p className="text-foreground/50 text-xs">{active.description}</p>
            </div>
          </div>

          {activeTab === "finca" && <TabFinca />}
          {activeTab === "razas" && <TabRazas onAdd={() => {}} />}
          {activeTab === "vacunas" && <TabVacunas />}
          {activeTab === "tratamientos" && <TabTratamientos />}
        </div>
      </div>
    </DashboardShell>
  );
}
