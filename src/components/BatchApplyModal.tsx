"use client";

// =====================================================================
// Aplicación POR LOTE de vacunas y tratamientos.
//
// El caso real: en el campo se vacuna o desparasita a un grupo entero el
// mismo día. Registrarlo animal por animal es inviable. Aquí se eligen los
// datos comunes una vez (producto, fecha, dosis…) y se marcan de una lista
// los animales que lo reciben. Los que NO se marcan quedan "libres" de esa
// vacuna/tratamiento: no se les crea registro.
//
// Cada animal genera un insert independiente con su propio client_uuid, así
// que el camino offline (cola Dexie + upsert idempotente) funciona igual que
// en los formularios individuales: si se corta la señal a media aplicación,
// nada se duplica ni se pierde.
// =====================================================================

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Syringe, FlaskConical, X, Check } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { submitOrQueue } from "@/lib/offline/submit";
import { friendlyErrorMessage } from "@/lib/errors/friendly";
import { toast } from "sonner";

type Kind = "vaccination" | "treatment";

type AnimalOpt = {
  id: string;
  tag: string;
  name: string | null;
  current_weight_kg: number | null;
  birth_date: string | null;
};

type VaccineRow = {
  id: string;
  name: string;
  booster_days: number | null;
  min_age_days: number | null;
};
type TreatmentRow = {
  id: string;
  name: string;
  kind: string | null;
  dose_per_kg: number | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
};

type Props = {
  readonly kind: Kind;
  readonly farmId: string | undefined;
  readonly profileId: string | undefined;
  readonly onClose: () => void;
  readonly onDone?: () => void;
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

/** Primer número positivo dentro de un texto de dosis ("5 ml/kg" → 5). null si no hay. */
function positiveNumberIn(text: string): number | null {
  const m = text.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function BatchApplyModal({ kind, farmId, profileId, onClose, onDone }: Props) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const isVaccine = kind === "vaccination";

  const [catalogId, setCatalogId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(""); // solo tratamiento
  const [doseText, setDoseText] = useState(""); // ml (vacuna) o texto libre (tratamiento)
  const [batchNumber, setBatchNumber] = useState(""); // solo vacuna
  const [nextDue, setNextDue] = useState(""); // solo vacuna
  const [notes, setNotes] = useState("");
  const [vetApproved, setVetApproved] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const animalsQuery = useQuery<AnimalOpt[]>({
    queryKey: ["animals-batch", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("animals")
        .select("id, tag, name, current_weight_kg, birth_date")
        .eq("farm_id", farmId!)
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return (data ?? []) as AnimalOpt[];
    },
  });

  const catalogQuery = useQuery({
    // Mismas claves que los formularios individuales: así el service worker
    // sirve la misma entrada cacheada offline.
    queryKey: [isVaccine ? "vaccines-catalog" : "treatments-catalog"],
    enabled: !!supabase,
    queryFn: async () => {
      const cols = isVaccine
        ? "id, name, booster_days, min_age_days"
        : "id, name, kind, dose_per_kg, withdrawal_meat_days, withdrawal_milk_days";
      const { data, error } = await supabase!
        .from(isVaccine ? "vaccines_catalog" : "treatments_catalog")
        .select(cols)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const animals = useMemo(() => animalsQuery.data ?? [], [animalsQuery.data]);
  // El `select()` se arma con una cadena en tiempo de ejecución, así que el
  // cliente tipado no puede inferir la forma: se castea vía unknown.
  const catalogRows = (catalogQuery.data ?? []) as unknown as (VaccineRow | TreatmentRow)[];
  const selectedTreatment = !isVaccine
    ? (catalogRows as TreatmentRow[]).find((t) => t.id === catalogId)
    : undefined;
  const selectedVaccine = isVaccine
    ? (catalogRows as VaccineRow[]).find((v) => v.id === catalogId)
    : undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return animals;
    return animals.filter(
      (a) => a.tag.toLowerCase().includes(q) || (a.name ?? "").toLowerCase().includes(q)
    );
  }, [animals, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((a) => next.delete(a.id));
      else filtered.forEach((a) => next.add(a.id));
      return next;
    });

  // Dosis calculada por peso (solo tratamiento con dose_per_kg): se muestra
  // como ayuda; en el lote cada animal recibe la suya según su propio peso.
  const perKgHint =
    !isVaccine && selectedTreatment?.dose_per_kg
      ? `Dosis por peso: ${selectedTreatment.dose_per_kg} ml/kg — se calcula por animal según su peso.`
      : null;

  function validate(): string | null {
    if (selected.size === 0) return "Marca al menos un animal.";
    if (isVaccine && !catalogId) return "Selecciona una vacuna.";
    if (!vetApproved) return "Se requiere la confirmación del veterinario responsable.";

    // Fecha obligatoria y no futura.
    if (!date) return "La fecha es obligatoria.";
    if (date > todayStr) return "La fecha no puede ser futura.";

    // Dosis obligatoria y con cantidad mayor que cero. En tratamiento con
    // dose_per_kg la calcula el sistema por animal, así que ahí no se exige.
    const autoDose = !isVaccine && !!selectedTreatment?.dose_per_kg;
    if (!autoDose) {
      if (!doseText.trim())
        return isVaccine ? "La dosis (ml) es obligatoria." : "La dosis es obligatoria.";
      if (positiveNumberIn(doseText) === null)
        return isVaccine
          ? "La dosis (ml) debe ser un número mayor que cero."
          : "La dosis debe contener un número mayor que cero.";
    }

    // Próxima dosis (vacuna) posterior a la aplicación y no en el pasado.
    if (isVaccine && nextDue) {
      if (nextDue <= date) return "La próxima dosis debe ser posterior a la fecha de aplicación.";
      if (nextDue < todayStr) return "La próxima dosis no puede estar en el pasado.";
    }
    // Fin (tratamiento) no anterior al inicio.
    if (!isVaccine && endDate && endDate < date)
      return "La fecha de fin no puede ser anterior al inicio.";

    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);

    const chosen = animals.filter((a) => selected.has(a.id));

    // Un animal no puede recibir algo antes de nacer: se omite y se avisa,
    // en vez de crear un registro con fecha imposible.
    const bornInTime = chosen.filter((a) => !a.birth_date || a.birth_date.slice(0, 10) <= date);
    const skippedByBirth = chosen.length - bornInTime.length;

    const appliedAtIso = new Date(date + "T12:00:00").toISOString();
    const doseMl = isVaccine && doseText.trim() ? positiveNumberIn(doseText) : null;

    let saved = 0;
    let queued = 0;
    const failures: string[] = [];

    for (const a of bornInTime) {
      try {
        let payload: Record<string, unknown>;
        if (isVaccine) {
          payload = {
            animal_id: a.id,
            farm_id: farmId,
            vaccine_id: catalogId,
            applied_at: appliedAtIso,
            applied_by: profileId,
            dose_ml: doseMl,
            batch_number: batchNumber || null,
            next_due_at: nextDue || null,
            notes: notes || null,
          };
        } else {
          // Dosis por animal: si el producto tiene dose_per_kg y hay peso, se
          // calcula; si no, se usa el texto libre común a todos.
          const perAnimalDose =
            selectedTreatment?.dose_per_kg && a.current_weight_kg
              ? `${(selectedTreatment.dose_per_kg * a.current_weight_kg).toFixed(2)} ml`
              : doseText.trim() || null;
          const startDate = new Date(appliedAtIso);
          const wMeat = selectedTreatment?.withdrawal_meat_days
            ? new Date(startDate.getTime() + selectedTreatment.withdrawal_meat_days * 864e5)
                .toISOString()
                .slice(0, 10)
            : null;
          const wMilk = selectedTreatment?.withdrawal_milk_days
            ? new Date(startDate.getTime() + selectedTreatment.withdrawal_milk_days * 864e5)
                .toISOString()
                .slice(0, 10)
            : null;
          payload = {
            animal_id: a.id,
            farm_id: farmId,
            prescribed_by: profileId,
            treatment_id: catalogId || null,
            started_at: appliedAtIso,
            ended_at: endDate ? new Date(endDate + "T12:00:00").toISOString() : null,
            dose: perAnimalDose,
            notes: notes || null,
            withdrawal_until_meat: wMeat,
            withdrawal_until_milk: wMilk,
          };
        }

        const res = await submitOrQueue(
          supabase,
          isVaccine ? "vaccinations" : "treatments",
          payload,
          profileId
        );
        if (res.queued) queued += 1;
        else saved += 1;
      } catch (err) {
        failures.push(`${a.tag}: ${friendlyErrorMessage(err)}`);
      }
    }

    setSaving(false);

    if (saved + queued > 0) {
      queryClient.invalidateQueries({ queryKey: [isVaccine ? "vaccinations" : "treatments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      const parts: string[] = [];
      if (saved) parts.push(`${saved} guardado${saved !== 1 ? "s" : ""}`);
      if (queued) parts.push(`${queued} en cola (sin conexión)`);
      const extras: string[] = [];
      if (skippedByBirth)
        extras.push(
          `${skippedByBirth} omitido${skippedByBirth !== 1 ? "s" : ""} por fecha anterior al nacimiento`
        );
      if (failures.length) extras.push(`${failures.length} con error`);
      toast.success(parts.join(" · "), {
        description: extras.length ? extras.join(" · ") : undefined,
      });
    }

    if (failures.length) {
      // No se cierra si TODO falló: el usuario debe poder corregir y reintentar.
      setError(failures.slice(0, 3).join(" · ") + (failures.length > 3 ? " …" : ""));
      if (saved + queued === 0) return;
    }

    onDone?.();
    onClose();
  }

  const Icon = isVaccine ? Syringe : FlaskConical;
  const title = isVaccine ? "Vacunación por lote" : "Tratamiento por lote";
  const recibe = selected.size;
  const libres = animals.length - recibe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border-border relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Icon className="text-primary h-5 w-5" />
            <h2 className="text-foreground text-base font-bold">{title}</h2>
          </div>
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
          {/* Datos comunes */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className={isVaccine ? "" : "md:col-span-2"}>
              <label className={labelClass}>{isVaccine ? "Vacuna *" : "Tratamiento"}</label>
              <select
                className={inputClass}
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
              >
                <option value="">
                  {isVaccine ? "— selecciona —" : "— selecciona o deja en blanco —"}
                </option>
                {catalogRows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!isVaccine && "kind" in c && c.kind ? ` (${c.kind})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                {isVaccine ? "Aplicada el" : "Inicio"} <span className="text-accent">*</span>
              </label>
              <input
                type="date"
                className={inputClass}
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {!isVaccine && (
              <div>
                <label className={labelClass}>Fin (opcional)</label>
                <input
                  type="date"
                  className={inputClass}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>
                {isVaccine ? "Dosis (ml)" : "Dosis"}{" "}
                {!(!isVaccine && selectedTreatment?.dose_per_kg) && (
                  <span className="text-accent">*</span>
                )}
              </label>
              <input
                className={inputClass}
                inputMode={isVaccine ? "decimal" : "text"}
                placeholder={isVaccine ? "Ej. 2" : "Ej. 5 ml/kg"}
                value={doseText}
                onChange={(e) => setDoseText(e.target.value)}
                disabled={!isVaccine && !!selectedTreatment?.dose_per_kg}
              />
              {perKgHint && <p className="text-foreground/50 mt-1 text-[11px]">{perKgHint}</p>}
            </div>

            {isVaccine && (
              <>
                <div>
                  <label className={labelClass}>Lote (nº)</label>
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
              </>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Notas</label>
              <input
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Selección de animales */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className={labelClass + " mb-0"}>
                Animales · <span className="text-primary">{recibe} reciben</span> ·{" "}
                <span className="text-foreground/50">{libres} libres</span>
              </label>
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="text-primary text-xs font-medium hover:underline"
              >
                {allFilteredSelected ? "Quitar todos" : "Marcar todos"}
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="text-foreground/30 pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                className={inputClass + " pl-9"}
                placeholder="Buscar por arete o nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="border-border max-h-64 overflow-y-auto rounded-lg border">
              {animalsQuery.isLoading ? (
                <p className="text-foreground/50 p-4 text-center text-sm">Cargando animales…</p>
              ) : filtered.length === 0 ? (
                <p className="text-foreground/50 p-4 text-center text-sm">Sin animales activos.</p>
              ) : (
                filtered.map((a) => {
                  const checked = selected.has(a.id);
                  return (
                    <label
                      key={a.id}
                      className="hover:bg-muted/50 border-border/50 flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4"
                        checked={checked}
                        onChange={() => toggle(a.id)}
                      />
                      <span className="text-foreground font-mono text-sm">{a.tag}</span>
                      {a.name && (
                        <span className="text-foreground/50 truncate text-xs">{a.name}</span>
                      )}
                      {a.current_weight_kg != null && (
                        <span className="text-foreground/40 ml-auto text-[11px]">
                          {a.current_weight_kg} kg
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Confirmación veterinaria */}
          <div className="border-border bg-muted/30 rounded-lg border px-4 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="accent-primary mt-0.5 h-4 w-4 rounded"
                checked={vetApproved}
                onChange={(e) => setVetApproved(e.target.checked)}
              />
              <span className="text-foreground text-sm">
                Confirmo que soy el veterinario responsable y autorizo esta aplicación en los
                animales marcados. <span className="text-accent">*</span>
              </span>
            </label>
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
            disabled={saving || selected.size === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aplicar a {recibe} animal{recibe !== 1 ? "es" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
