"use client";

import Link from "next/link";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Beef,
  Calendar,
  FlaskConical,
  Loader2,
  MapPin,
  Milk,
  Pencil,
  QrCode,
  Syringe,
  TrendingUp,
  X,
  Check,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WeighingForm from "@/components/WeighingForm";
import VaccinationForm from "@/components/VaccinationForm";
import MilkForm from "@/components/MilkForm";
import TreatmentForm from "@/components/TreatmentForm";
import AnimalQrCard from "@/components/AnimalQrCard";
import SignAnchorButton from "@/components/SignAnchorButton";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";

type AnimalUpdate = {
  id: string;
  tag: string;
  name: string | null;
  sex: "male" | "female";
  status: "active" | "sold" | "dead" | "lost" | "slaughtered";
  current_weight_kg: number | null;
  birth_date: string | null;
  birth_weight_kg: number | null;
  color: string | null;
  photo_url: string | null;
  purpose: "dairy" | "beef" | "dual" | "breeding" | null;
};

type Animal = AnimalUpdate & {
  breeds: { name: string } | null;
};

type Tab = "info" | "pesajes" | "vacunas" | "tratamientos" | "leche" | "movimientos" | "qr";

function AnimalDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("info");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [editValues, setEditValues] = useState<Partial<Animal>>({});

  const animalQuery = useQuery<Animal | null>({
    queryKey: ["animal", id],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("animals")
        .select(
          "id, tag, name, sex, status, current_weight_kg, birth_date, birth_weight_kg, color, photo_url, purpose, breeds(name)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Animal | null) ?? null;
    },
  });

  const tokenQuery = useQuery<{ slug: string } | null>({
    queryKey: ["animal-token", id],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return null;
      const { data } = await supabase
        .from("traceability_tokens")
        .select("slug")
        .eq("entity_type", "animal")
        .eq("entity_id", id)
        .eq("is_active", true)
        .maybeSingle();
      return data ?? null;
    },
  });

  const weighingsQuery = useQuery({
    queryKey: ["weighings", id],
    enabled: !!supabase && tab === "pesajes",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("weighings")
        .select("id, weight_kg, measured_at, notes")
        .eq("animal_id", id)
        .order("measured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const vaccinationsQuery = useQuery({
    queryKey: ["vaccinations", id],
    enabled: !!supabase && tab === "vacunas",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("vaccinations")
        .select("id, applied_at, dose_ml, batch_number, next_due_at, notes, vaccines_catalog(name)")
        .eq("animal_id", id)
        .order("applied_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const breedsQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: ["breeds"],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("breeds").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<AnimalUpdate> & { breed_id?: string | null }) => {
      if (!supabase) throw new Error("Sesión no lista.");
      const { error } = await supabase.from("animals").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animal", id] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      setEditing(false);
    },
  });

  const treatmentsQuery = useQuery({
    queryKey: ["treatments", id],
    enabled: !!supabase && tab === "tratamientos",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("treatments")
        .select(
          "id, started_at, ended_at, dose, notes, withdrawal_until_meat, withdrawal_until_milk, treatments_catalog(name, kind)"
        )
        .eq("animal_id", id)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const milkQuery = useQuery({
    queryKey: ["milk", id],
    enabled: !!supabase && tab === "leche",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("milk_records")
        .select("id, recorded_on, shift, liters, fat_pct, protein_pct")
        .eq("animal_id", id)
        .order("recorded_on", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const movementsQuery = useQuery({
    queryKey: ["movements", id],
    enabled: !!supabase && tab === "movimientos",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("animal_events")
        .select("id, type, occurred_at, payload, notes")
        .eq("animal_id", id)
        .eq("type", "transfer")
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase || !animalQuery.data?.photo_url) {
        setPhotoUrl(null);
        return;
      }
      const url = await getSignedPhotoUrl(supabase, animalQuery.data.photo_url);
      if (!cancelled) setPhotoUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, animalQuery.data?.photo_url]);

  const tabs: { id: Tab; label: string; icon: typeof Beef }[] = [
    { id: "info", label: "Información", icon: Beef },
    { id: "pesajes", label: "Pesajes", icon: TrendingUp },
    { id: "vacunas", label: "Vacunas", icon: Syringe },
    { id: "tratamientos", label: "Tratamientos", icon: FlaskConical },
    { id: "leche", label: "Leche", icon: Milk },
    { id: "movimientos", label: "Movimientos", icon: MapPin },
    { id: "qr", label: "QR público", icon: QrCode },
  ];

  if (animalQuery.isLoading) {
    return (
      <DashboardShell title="Cargando…">
        <div className="flex items-center gap-2">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-foreground/70 text-sm">Cargando animal…</span>
        </div>
      </DashboardShell>
    );
  }

  const animal = animalQuery.data;
  if (!animal) {
    return (
      <DashboardShell title="No encontrado">
        <p className="text-foreground/70 text-sm">El animal no existe o no tienes acceso.</p>
        <Link
          href="/dashboard/animales"
          className="text-primary text-sm font-medium hover:underline"
        >
          ← Volver al listado
        </Link>
      </DashboardShell>
    );
  }

  const farmId = farmQuery.data?.id;

  const addMovement = useMutation({
    mutationFn: async (vals: {
      location_from: string;
      location_to: string;
      reason: string;
      occurred_at: string;
    }) => {
      if (!supabase || !profileId || !farmId) throw new Error("Sesión no lista.");
      const { error } = await supabase.from("animal_events").insert({
        animal_id: id,
        farm_id: farmId,
        type: "transfer",
        occurred_at: vals.occurred_at
          ? new Date(vals.occurred_at).toISOString()
          : new Date().toISOString(),
        performed_by: profileId,
        payload: {
          location_from: vals.location_from || null,
          location_to: vals.location_to || null,
        },
        notes: vals.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements", id] });
    },
  });

  return (
    <DashboardShell
      title={`${animal.tag}${animal.name ? ` · ${animal.name}` : ""}`}
      subtitle="Animal"
    >
      <Link
        href="/dashboard/animales"
        className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="bg-card border-border overflow-hidden rounded-2xl border">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={animal.tag} className="h-64 w-full object-cover" />
            ) : (
              <div className="bg-muted/40 flex h-64 items-center justify-center">
                <Beef className="text-foreground/30 h-12 w-12" />
              </div>
            )}
            <div className="space-y-2 p-4">
              <div className="text-foreground font-mono text-sm font-semibold">{animal.tag}</div>
              <div className="text-foreground/60 text-xs capitalize">
                {animal.sex === "female" ? "Hembra" : "Macho"}
                {animal.breeds?.name ? ` · ${animal.breeds.name}` : ""}
              </div>
              {animal.current_weight_kg && (
                <div className="text-foreground text-sm">
                  Peso actual: <span className="font-semibold">{animal.current_weight_kg} kg</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-border flex flex-wrap gap-1 border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "text-foreground/60 hover:text-foreground border-transparent"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="bg-card border-border rounded-2xl border p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground text-base font-bold">Datos del animal</h3>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditValues({
                        name: animal.name ?? undefined,
                        color: animal.color ?? undefined,
                        birth_date: animal.birth_date ?? undefined,
                        purpose: animal.purpose ?? undefined,
                        status: animal.status,
                      });
                      setEditing(true);
                    }}
                    className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        const payload: Record<string, unknown> = {
                          name: editValues.name || null,
                          color: editValues.color || null,
                          birth_date: editValues.birth_date || null,
                          purpose: editValues.purpose || null,
                          status: editValues.status,
                        };
                        updateMutation.mutate(payload as Partial<Animal>);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Guardar
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                  <Field label="Arete" value={animal.tag} />
                  <Field label="Nombre" value={animal.name ?? "—"} />
                  <Field label="Sexo" value={animal.sex === "female" ? "Hembra" : "Macho"} />
                  <Field label="Raza" value={animal.breeds?.name ?? "—"} />
                  <Field label="Propósito" value={animal.purpose ?? "—"} />
                  <Field
                    label="Fecha de nacimiento"
                    value={
                      animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "—"
                    }
                  />
                  <Field
                    label="Peso al nacer"
                    value={animal.birth_weight_kg ? `${animal.birth_weight_kg} kg` : "—"}
                  />
                  <Field
                    label="Peso actual"
                    value={animal.current_weight_kg ? `${animal.current_weight_kg} kg` : "—"}
                  />
                  <Field label="Color" value={animal.color ?? "—"} />
                  <Field label="Estado" value={animal.status} />
                </dl>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Nombre", key: "name" as const, type: "text" },
                    { label: "Color", key: "color" as const, type: "text" },
                    { label: "Fecha de nacimiento", key: "birth_date" as const, type: "date" },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="text-foreground/60 mb-1 block text-xs font-medium">
                        {label}
                      </label>
                      <input
                        type={type}
                        value={(editValues[key] as string) ?? ""}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, [key]: e.target.value }) as Partial<Animal>)
                        }
                        className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-foreground/60 mb-1 block text-xs font-medium">
                      Propósito
                    </label>
                    <select
                      value={editValues.purpose ?? ""}
                      onChange={(e) =>
                        setEditValues((p) => ({
                          ...p,
                          purpose: (e.target.value || null) as Animal["purpose"],
                        }))
                      }
                      className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    >
                      <option value="">Sin especificar</option>
                      <option value="dairy">Lechero</option>
                      <option value="beef">Cárnico</option>
                      <option value="dual">Doble propósito</option>
                      <option value="breeding">Reproducción</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-foreground/60 mb-1 block text-xs font-medium">
                      Estado
                    </label>
                    <select
                      value={editValues.status ?? "active"}
                      onChange={(e) =>
                        setEditValues((p) => ({ ...p, status: e.target.value as Animal["status"] }))
                      }
                      className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    >
                      <option value="active">Activo</option>
                      <option value="sold">Vendido</option>
                      <option value="dead">Fallecido</option>
                      <option value="retired">Retirado</option>
                    </select>
                  </div>
                  {updateMutation.error && (
                    <p className="text-accent text-xs md:col-span-2">
                      {(updateMutation.error as Error).message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "pesajes" && farmId && profileId && (
            <div className="space-y-4">
              <div className="bg-card border-border rounded-2xl border p-6">
                <h3 className="text-foreground mb-4 text-base font-bold">Registrar pesaje</h3>
                <WeighingForm animalId={animal.id} farmId={farmId} profileId={profileId} />
              </div>
              <WeightChart rows={weighingsQuery.data ?? []} isLoading={weighingsQuery.isLoading} />
              <RecordList
                title="Histórico"
                isLoading={weighingsQuery.isLoading}
                rows={(weighingsQuery.data ?? []).map((w) => ({
                  id: w.id as string,
                  primary: `${w.weight_kg} kg`,
                  secondary: new Date(w.measured_at as string).toLocaleString(),
                  tertiary: w.notes ?? null,
                  icon: TrendingUp,
                }))}
              />
            </div>
          )}

          {tab === "vacunas" && farmId && profileId && (
            <div className="space-y-4">
              <div className="bg-card border-border rounded-2xl border p-6">
                <h3 className="text-foreground mb-4 text-base font-bold">Registrar vacuna</h3>
                <VaccinationForm
                  animalId={animal.id}
                  farmId={farmId}
                  profileId={profileId}
                  animalBirthDate={animal.birth_date}
                />
              </div>
              <RecordList
                title="Historial"
                isLoading={vaccinationsQuery.isLoading}
                rows={(vaccinationsQuery.data ?? []).map((v) => {
                  const cat = v.vaccines_catalog as { name?: string } | { name: string }[] | null;
                  const name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
                  return {
                    id: v.id as string,
                    primary: name ?? "Vacuna",
                    secondary: new Date(v.applied_at as string).toLocaleString(),
                    tertiary: v.next_due_at
                      ? `Próxima: ${new Date(v.next_due_at as string).toLocaleDateString()}`
                      : null,
                    icon: Syringe,
                    action: (
                      <SignAnchorButton
                        entityType="vaccinations"
                        entityId={v.id as string}
                        payload={v}
                      />
                    ),
                  };
                })}
              />
            </div>
          )}

          {tab === "tratamientos" && farmId && profileId && (
            <div className="space-y-4">
              <div className="bg-card border-border rounded-2xl border p-6">
                <h3 className="text-foreground mb-4 text-base font-bold">Registrar tratamiento</h3>
                <TreatmentForm
                  animalId={animal.id}
                  farmId={farmId}
                  profileId={profileId}
                  animalWeightKg={animal.current_weight_kg}
                />
              </div>
              <RecordList
                title="Historial"
                isLoading={treatmentsQuery.isLoading}
                rows={(treatmentsQuery.data ?? []).map((t) => {
                  const cat = t.treatments_catalog as { name?: string; kind?: string } | null;
                  const name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
                  const kind = Array.isArray(cat) ? cat[0]?.kind : cat?.kind;
                  return {
                    id: t.id as string,
                    primary: name ?? "Tratamiento libre",
                    secondary: `Inicio: ${new Date(t.started_at as string).toLocaleDateString()}${t.ended_at ? ` · Fin: ${new Date(t.ended_at as string).toLocaleDateString()}` : ""}`,
                    tertiary: t.withdrawal_until_meat
                      ? `Retiro carne hasta: ${new Date(t.withdrawal_until_meat as string).toLocaleDateString()}`
                      : (kind ?? t.dose ?? null),
                    icon: FlaskConical,
                    action: (
                      <SignAnchorButton
                        entityType="treatments"
                        entityId={t.id as string}
                        payload={t}
                      />
                    ),
                  };
                })}
                emptyHint="Sin tratamientos registrados."
              />
            </div>
          )}

          {tab === "leche" && farmId && profileId && (
            <div className="space-y-4">
              <div className="bg-card border-border rounded-2xl border p-6">
                <h3 className="text-foreground mb-4 text-base font-bold">Registrar producción</h3>
                <MilkForm animalId={animal.id} farmId={farmId} profileId={profileId} />
              </div>
              <RecordList
                title="Histórico"
                isLoading={milkQuery.isLoading}
                rows={(milkQuery.data ?? []).map((m) => ({
                  id: m.id as string,
                  primary: `${m.liters} L · ${{ am: "AM", pm: "PM", midday: "Mediodía" }[m.shift as string] ?? (m.shift as string)}`,
                  secondary: new Date(m.recorded_on as string).toLocaleDateString(),
                  tertiary: m.fat_pct
                    ? `Grasa ${m.fat_pct}% · Prot. ${m.protein_pct ?? "—"}%`
                    : null,
                  icon: Milk,
                }))}
                emptyHint="Aún no hay registros de leche para este animal."
              />
            </div>
          )}

          {tab === "movimientos" && farmId && profileId && (
            <MovementsTab
              movements={(movementsQuery.data ?? []) as MovementRow[]}
              isLoading={movementsQuery.isLoading}
              isSaving={addMovement.isPending}
              saveError={addMovement.error as Error | null}
              onSubmit={(vals) => addMovement.mutate(vals)}
            />
          )}

          {tab === "qr" && tokenQuery.data && (
            <AnimalQrCard
              slug={tokenQuery.data.slug}
              animalTag={animal.tag}
              animalName={animal.name}
            />
          )}
          {tab === "qr" && !tokenQuery.data && !tokenQuery.isLoading && (
            <div className="bg-card border-border rounded-2xl border p-6 text-sm">
              No se encontró un token público para este animal.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground/60 text-xs">{label}</dt>
      <dd className="text-foreground text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}

type ListRow = {
  id: string;
  primary: string;
  secondary: string;
  tertiary: string | null;
  icon: typeof Beef;
  action?: React.ReactNode;
};

type MovementRow = {
  id: string;
  occurred_at: string;
  payload: { location_from?: string | null; location_to?: string | null } | null;
  notes: string | null;
};

type MovementsTabProps = {
  movements: MovementRow[];
  isLoading: boolean;
  isSaving: boolean;
  saveError: Error | null;
  onSubmit: (vals: {
    location_from: string;
    location_to: string;
    reason: string;
    occurred_at: string;
  }) => void;
};

type MovementPayload = { location_from?: string | null; location_to?: string | null };

const inputCls =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";

function MovementsTab({ movements, isLoading, isSaving, saveError, onSubmit }: MovementsTabProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) return;
    onSubmit({ location_from: from, location_to: to, reason, occurred_at: occurredAt });
    setFrom("");
    setTo("");
    setReason("");
    setOccurredAt("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border-border rounded-2xl border p-6">
        <h3 className="text-foreground mb-4 text-base font-bold">Registrar traslado</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="mv_from" className="text-foreground mb-1 block text-xs font-medium">
              Origen (corral / potrero)
            </label>
            <input
              id="mv_from"
              className={inputCls}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Corral A"
            />
          </div>
          <div>
            <label htmlFor="mv_to" className="text-foreground mb-1 block text-xs font-medium">
              Destino *
            </label>
            <input
              id="mv_to"
              className={inputCls}
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Potrero Norte"
            />
          </div>
          <div>
            <label htmlFor="mv_at" className="text-foreground mb-1 block text-xs font-medium">
              Fecha / hora
            </label>
            <input
              id="mv_at"
              type="datetime-local"
              className={inputCls}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="mv_reason" className="text-foreground mb-1 block text-xs font-medium">
              Motivo
            </label>
            <input
              id="mv_reason"
              className={inputCls}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rotación de potreros"
            />
          </div>
          {saveError && <p className="text-accent text-xs md:col-span-2">{saveError.message}</p>}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar traslado
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card border-border rounded-2xl border p-6">
        <h3 className="text-foreground mb-4 text-base font-bold">Historial de movimientos</h3>
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        ) : movements.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin movimientos registrados.</p>
        ) : (
          <ul className="divide-border divide-y">
            {movements.map((m) => {
              const p = m.payload as MovementPayload | null;
              return (
                <li key={m.id} className="flex items-start gap-3 py-3">
                  <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {p?.location_from ? `${p.location_from} → ` : ""}
                      {p?.location_to ?? "—"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(m.occurred_at).toLocaleString()}
                      {m.notes ? ` · ${m.notes}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

type WeighingRow = { weight_kg: number; measured_at: string };

function WeightChart({ rows, isLoading }: { rows: WeighingRow[]; isLoading: boolean }) {
  if (isLoading) return null;
  // rows come newest-first; reverse for chronological chart
  const sorted = [...rows].reverse().slice(-24);
  if (sorted.length < 2) return null;

  const W = 480,
    H = 120,
    PAD = 8;
  const weights = sorted.map((r) => r.weight_kg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const pts = sorted.map((r, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (r.weight_kg - minW) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <h3 className="text-foreground mb-3 text-base font-bold">Tendencia de peso</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfica de peso">
        <polyline
          points={polyline}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {sorted.map((r, i) => {
          const [x, y] = pts[i].split(",").map(Number);
          return <circle key={r.measured_at} cx={x} cy={y} r="3" className="fill-primary" />;
        })}
      </svg>
      <div className="text-muted-foreground mt-2 flex justify-between text-xs">
        <span>
          {new Date(first.measured_at).toLocaleDateString()} — {first.weight_kg} kg
        </span>
        <span className="font-medium text-foreground">
          {last.weight_kg} kg ({last.weight_kg >= first.weight_kg ? "+" : ""}
          {(last.weight_kg - first.weight_kg).toFixed(1)} kg)
        </span>
        <span>{new Date(last.measured_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function RecordList({
  title,
  rows,
  isLoading,
  emptyHint,
}: {
  title: string;
  rows: ListRow[];
  isLoading: boolean;
  emptyHint?: string;
}) {
  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground text-base font-bold">{title}</h3>
        <Calendar className="text-foreground/30 h-4 w-4" />
      </div>
      {isLoading && <p className="text-foreground/60 text-sm">Cargando…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-foreground/60 text-sm">{emptyHint ?? "Sin registros aún."}</p>
      )}
      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="hover:bg-muted/50 flex items-start gap-4 rounded-xl p-3 transition-colors"
            >
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <r.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-sm font-medium">{r.primary}</div>
                <div className="text-foreground/60 text-xs">{r.secondary}</div>
                {r.tertiary && (
                  <div className="text-foreground/50 mt-0.5 text-xs">{r.tertiary}</div>
                )}
              </div>
              {r.action && <div className="shrink-0">{r.action}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <AnimalDetailContent params={params} />
    </Suspense>
  );
}
