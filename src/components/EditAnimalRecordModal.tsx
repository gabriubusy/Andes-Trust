"use client";

// =====================================================================
// Edición de pesajes, vacunas y tratamientos de un animal.
//
// Es SÓLO en línea, como la edición de leche: editar es un UPDATE sobre una
// fila que ya existe en el servidor por su id, y la cola offline sólo sabe
// insertar/upsert por `client_uuid`, no actualizar filas ajenas. Sin señal se
// avisa y se bloquea el botón.
//
// Un registro ANCLADO en blockchain no se puede editar: su hash quedó firmado
// on-chain y cambiar los datos lo invalidaría. La página oculta el botón de
// editar cuando hay `tx_hash`; aquí se rechaza igualmente como segunda barrera.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "@/hooks/use-supabase";
import { friendlyErrorMessage } from "@/lib/errors/friendly";
import OfflineWriteNotice, { useOnline } from "@/components/OfflineWriteNotice";
import { toast } from "sonner";

export type EditKind = "weighing" | "vaccination" | "treatment" | "milk";

export type EditableRecord = {
  id: string;
  tx_hash?: string | null;
  // weighing
  weight_kg?: number;
  measured_at?: string;
  // vaccination
  vaccine_id?: string | null;
  applied_at?: string;
  dose_ml?: number | null;
  batch_number?: string | null;
  next_due_at?: string | null;
  // treatment
  treatment_id?: string | null;
  started_at?: string;
  ended_at?: string | null;
  dose?: string | null;
  // milk
  liters?: number;
  shift?: "am" | "pm" | "midday";
  recorded_on?: string;
  fat_pct?: number | null;
  protein_pct?: number | null;
  // común
  notes?: string | null;
};

type Props = {
  readonly kind: EditKind;
  readonly record: EditableRecord;
  readonly animalId: string;
  readonly onClose: () => void;
  readonly onSaved?: () => void;
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

/** ISO → valor para <input type="datetime-local"> (YYYY-MM-DDTHH:mm) en hora local. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Primer número positivo dentro de un texto ("5 ml/kg" → 5). null si no hay o es ≤ 0. */
function positiveNumberIn(text: string): number | null {
  const m = text.match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return n > 0 ? n : null;
}

const TITLES: Record<EditKind, string> = {
  weighing: "Editar pesaje",
  vaccination: "Editar vacuna",
  treatment: "Editar tratamiento",
  milk: "Editar producción",
};

const SHIFTS: { value: "am" | "midday" | "pm"; label: string }[] = [
  { value: "am", label: "Mañana" },
  { value: "midday", label: "Mediodía" },
  { value: "pm", label: "Tarde" },
];

export default function EditAnimalRecordModal({ kind, record, animalId, onClose, onSaved }: Props) {
  const { supabase } = useSupabase();
  const online = useOnline();
  const queryClient = useQueryClient();
  const anchored = !!record.tx_hash;

  const today = new Date().toISOString().slice(0, 10);
  const todayLocal = toLocalInput(new Date().toISOString());

  // Estado inicial según tipo.
  const [weightKg, setWeightKg] = useState(
    record.weight_kg != null ? String(record.weight_kg) : ""
  );
  const [measuredAt, setMeasuredAt] = useState(toLocalInput(record.measured_at));
  const [vaccineId, setVaccineId] = useState(record.vaccine_id ?? "");
  const [appliedAt, setAppliedAt] = useState((record.applied_at ?? "").slice(0, 10));
  const [doseMl, setDoseMl] = useState(record.dose_ml != null ? String(record.dose_ml) : "");
  const [batchNumber, setBatchNumber] = useState(record.batch_number ?? "");
  const [nextDue, setNextDue] = useState(record.next_due_at ?? "");
  const [treatmentId, setTreatmentId] = useState(record.treatment_id ?? "");
  const [startedAt, setStartedAt] = useState((record.started_at ?? "").slice(0, 10));
  const [endedAt, setEndedAt] = useState((record.ended_at ?? "").slice(0, 10));
  const [doseText, setDoseText] = useState(record.dose ?? "");
  const [liters, setLiters] = useState(record.liters != null ? String(record.liters) : "");
  const [shift, setShift] = useState<"am" | "midday" | "pm">(record.shift ?? "am");
  const [recordedOn, setRecordedOn] = useState((record.recorded_on ?? "").slice(0, 10));
  const [fatPct, setFatPct] = useState(record.fat_pct != null ? String(record.fat_pct) : "");
  const [proteinPct, setProteinPct] = useState(
    record.protein_pct != null ? String(record.protein_pct) : ""
  );
  const [notes, setNotes] = useState(record.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // Catálogo sólo cuando hace falta (misma clave que los formularios de alta).
  const catalogQuery = useQuery({
    queryKey: [kind === "vaccination" ? "vaccines-catalog" : "treatments-catalog"],
    enabled: !!supabase && kind !== "weighing",
    queryFn: async () => {
      const cols =
        kind === "vaccination"
          ? "id, name, booster_days, min_age_days"
          : "id, name, kind, dose_per_kg, withdrawal_meat_days, withdrawal_milk_days";
      const { data, error } = await (supabase as SupabaseClient)
        .from(kind === "vaccination" ? "vaccines_catalog" : "treatments_catalog")
        .select(cols)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const catalog = useMemo(
    () =>
      (catalogQuery.data ?? []) as unknown as { id: string; name: string; kind?: string | null }[],
    [catalogQuery.data]
  );

  useEffect(() => {
    if (catalogQuery.error)
      toast.error(friendlyErrorMessage(catalogQuery.error, { fallback: "Error al cargar." }));
  }, [catalogQuery.error]);

  function validate(): string | null {
    if (kind === "weighing") {
      const w = Number(weightKg);
      if (!weightKg || Number.isNaN(w) || w <= 0)
        return "El peso debe ser un número mayor que cero.";
      if (measuredAt && measuredAt > todayLocal) return "La fecha no puede ser futura.";
    }
    if (kind === "vaccination") {
      if (!vaccineId) return "Selecciona una vacuna.";
      if (!appliedAt) return "La fecha de aplicación es obligatoria.";
      if (appliedAt > today) return "La fecha de aplicación no puede ser futura.";
      if (!doseMl.trim() || positiveNumberIn(doseMl) === null)
        return "La dosis (ml) debe ser un número mayor que cero.";
      if (nextDue && nextDue <= appliedAt)
        return "La próxima dosis debe ser posterior a la fecha de aplicación.";
    }
    if (kind === "treatment") {
      if (!startedAt) return "La fecha de inicio es obligatoria.";
      if (startedAt > today) return "La fecha de inicio no puede ser futura.";
      if (!doseText.trim() || positiveNumberIn(doseText) === null)
        return "La dosis debe incluir una cantidad mayor que cero.";
      if (endedAt && endedAt < startedAt) return "La fecha de fin no puede ser anterior al inicio.";
    }
    if (kind === "milk") {
      const l = Number(liters);
      if (!liters || Number.isNaN(l) || l <= 0)
        return "Los litros deben ser un número mayor que cero.";
      if (!recordedOn) return "La fecha es obligatoria.";
      if (recordedOn > today) return "La fecha no puede ser futura.";
      if (fatPct && (Number.isNaN(Number(fatPct)) || Number(fatPct) < 0))
        return "El % de grasa no es válido.";
      if (proteinPct && (Number.isNaN(Number(proteinPct)) || Number(proteinPct) < 0))
        return "El % de proteína no es válido.";
    }
    return null;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Sesión no lista.");
      if (anchored)
        throw new Error("Este registro está anclado en blockchain y no puede editarse.");

      if (kind === "weighing") {
        const { error } = await supabase
          .from("weighings")
          .update({
            weight_kg: Number(weightKg),
            measured_at: measuredAt ? new Date(measuredAt).toISOString() : undefined,
            notes: notes || null,
          })
          .eq("id", record.id);
        if (error) throw error;
      } else if (kind === "vaccination") {
        const { error } = await supabase
          .from("vaccinations")
          .update({
            vaccine_id: vaccineId,
            applied_at: new Date(appliedAt + "T12:00:00").toISOString(),
            dose_ml: doseMl ? Number(doseMl) : null,
            batch_number: batchNumber || null,
            next_due_at: nextDue || null,
            notes: notes || null,
          })
          .eq("id", record.id);
        if (error) throw error;
      } else if (kind === "treatment") {
        // Tratamiento: si cambia el producto o la fecha, se recalcula el retiro.
        const t = catalog.find((c) => c.id === treatmentId) as
          | { withdrawal_meat_days?: number | null; withdrawal_milk_days?: number | null }
          | undefined;
        const start = new Date(startedAt + "T12:00:00");
        const wMeat = t?.withdrawal_meat_days
          ? new Date(start.getTime() + t.withdrawal_meat_days * 864e5).toISOString().slice(0, 10)
          : null;
        const wMilk = t?.withdrawal_milk_days
          ? new Date(start.getTime() + t.withdrawal_milk_days * 864e5).toISOString().slice(0, 10)
          : null;
        const { error } = await supabase
          .from("treatments")
          .update({
            treatment_id: treatmentId || null,
            started_at: start.toISOString(),
            ended_at: endedAt ? new Date(endedAt + "T12:00:00").toISOString() : null,
            dose: doseText || null,
            notes: notes || null,
            withdrawal_until_meat: wMeat,
            withdrawal_until_milk: wMilk,
          })
          .eq("id", record.id);
        if (error) throw error;
      } else {
        // Leche.
        const { error } = await supabase
          .from("milk_records")
          .update({
            liters: Number(liters),
            shift,
            recorded_on: recordedOn,
            fat_pct: fatPct ? Number(fatPct) : null,
            protein_pct: proteinPct ? Number(proteinPct) : null,
            notes: notes || null,
          })
          .eq("id", record.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Registro actualizado");
      // Invalida la lista del tab. La clave es la misma que usa cada query de
      // la ficha del animal (`["milk", id]`, `["weighings", id]`, …).
      const KEY_BY_KIND: Record<EditKind, string> = {
        weighing: "weighings",
        vaccination: "vaccinations",
        treatment: "treatments",
        milk: "milk",
      };
      queryClient.invalidateQueries({ queryKey: [KEY_BY_KIND[kind], animalId] });
      // El pesaje cambia el peso actual del animal (trigger); la leche alimenta
      // los paneles de producción.
      if (kind === "weighing") queryClient.invalidateQueries({ queryKey: ["animal", animalId] });
      if (kind === "milk") {
        queryClient.invalidateQueries({ queryKey: ["milk-production"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      }
      onSaved?.();
      onClose();
    },
    onError: (err) => setError(friendlyErrorMessage(err)),
  });

  function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border-border relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-base font-bold">{TITLES[kind]}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          {anchored && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              Este registro está anclado en blockchain: no puede editarse.
            </p>
          )}
          {!online && !anchored && <OfflineWriteNotice action="editar un registro" />}

          {kind === "weighing" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Peso (kg) <span className="text-accent">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  max={todayLocal}
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                />
              </div>
            </div>
          )}

          {kind === "vaccination" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Vacuna <span className="text-accent">*</span>
                </label>
                <select
                  className={inputClass}
                  value={vaccineId}
                  onChange={(e) => setVaccineId(e.target.value)}
                >
                  <option value="">— selecciona —</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Aplicada el <span className="text-accent">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Dosis (ml) <span className="text-accent">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={doseMl}
                  onChange={(e) => setDoseMl(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Lote</label>
                <input
                  className={inputClass}
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Próxima dosis</label>
                <input
                  type="date"
                  className={inputClass}
                  value={nextDue}
                  onChange={(e) => setNextDue(e.target.value)}
                />
              </div>
            </div>
          )}

          {kind === "treatment" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Tratamiento</label>
                <select
                  className={inputClass}
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                >
                  <option value="">— sin catálogo —</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.kind ? ` (${c.kind})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Inicio <span className="text-accent">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Fin</label>
                <input
                  type="date"
                  className={inputClass}
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Dosis <span className="text-accent">*</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="Ej. 5 ml/kg"
                  value={doseText}
                  onChange={(e) => setDoseText(e.target.value)}
                />
              </div>
            </div>
          )}

          {kind === "milk" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Litros <span className="text-accent">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Turno <span className="text-accent">*</span>
                </label>
                <select
                  className={inputClass}
                  value={shift}
                  onChange={(e) => setShift(e.target.value as "am" | "midday" | "pm")}
                >
                  {SHIFTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Fecha <span className="text-accent">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  value={recordedOn}
                  onChange={(e) => setRecordedOn(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>% Grasa</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={fatPct}
                  onChange={(e) => setFatPct(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>% Proteína</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={proteinPct}
                  onChange={(e) => setProteinPct(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Notas</label>
            <input
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-accent text-xs">{error}</p>}
        </div>

        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending || anchored || !online}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
