"use client";

import Link from "next/link";
import { use, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Beef,
  Calendar,
  Check,
  ChevronDown,
  FlaskConical,
  Loader2,
  MapPin,
  Milk,
  Pencil,
  Plus,
  QrCode,
  Syringe,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WeighingForm from "@/components/WeighingForm";
import VaccinationForm from "@/components/VaccinationForm";
import MilkForm from "@/components/MilkForm";
import TreatmentForm from "@/components/TreatmentForm";
import AnimalQrCard from "@/components/AnimalQrCard";
import SignAnchorButton from "@/components/SignAnchorButton";
import Lightbox from "@/components/Lightbox";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { getSignedPhotoUrl, uploadAnimalPhoto } from "@/lib/supabase/storage";
import { friendlyErrorMessage } from "@/lib/errors/friendly";
import { submitOrQueue, submitToastMessage } from "@/lib/offline/submit";
import OfflineWriteNotice, { useOnline } from "@/components/OfflineWriteNotice";
import EditAnimalRecordModal, {
  type EditKind,
  type EditableRecord,
} from "@/components/EditAnimalRecordModal";
import { toast } from "sonner";

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
  animal_breeds: { breeds: { name: string } | null }[] | null;
};

const STATUS_LABEL: Record<Animal["status"], string> = {
  active: "Activo",
  sold: "Vendido",
  dead: "Fallecido",
  slaughtered: "Sacrificado",
  lost: "Perdido",
};

type Tab = "info" | "pesajes" | "vacunas" | "tratamientos" | "leche" | "movimientos" | "qr";

function AnimalDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase, profileId, captureMode } = useSupabase();
  const online = useOnline();
  const farmQuery = useCurrentFarm();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [delModal, setDelModal] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [vacModal, setVacModal] = useState(false);
  const [weighModal, setWeighModal] = useState(false);
  const [treatModal, setTreatModal] = useState(false);
  const [milkModal, setMilkModal] = useState(false);
  const [movModal, setMovModal] = useState(false);
  // Edición de un registro (pesaje/vacuna/tratamiento). null = cerrado.
  const [editRecord, setEditRecord] = useState<{ kind: EditKind; record: EditableRecord } | null>(
    null
  );
  const [editValues, setEditValues] = useState<Partial<Animal>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const animalQuery = useQuery<Animal | null>({
    queryKey: ["animal", id],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("animals")
        .select(
          "id, tag, name, sex, status, current_weight_kg, birth_date, birth_weight_kg, color, photo_url, purpose, animal_breeds(breeds(name))"
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
      const rows = data ?? [];
      if (!rows.length) return rows;
      // Pesajes anclables (SignAnchorButton soporta "weighings"): si alguno se
      // ancló, no debe poder editarse. Se trae su tx_hash para bloquear la edición.
      const ids = rows.map((r) => r.id as string);
      const { data: brs } = await supabase
        .from("blockchain_records")
        .select("entity_id, tx_hash")
        .eq("entity_type", "weighings")
        .in("entity_id", ids);
      const brMap: Record<string, string> = {};
      for (const br of brs ?? []) brMap[br.entity_id as string] = br.tx_hash as string;
      return rows.map((r) => ({ ...r, tx_hash: brMap[r.id as string] ?? null }));
    },
  });

  const vaccinationsQuery = useQuery({
    queryKey: ["vaccinations", id],
    enabled: !!supabase && tab === "vacunas",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("vaccinations")
        .select(
          "id, vaccine_id, applied_at, dose_ml, batch_number, next_due_at, notes, vaccines_catalog(name)"
        )
        .eq("animal_id", id)
        .order("applied_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return rows;
      const ids = rows.map((r) => r.id as string);
      const { data: brs } = await supabase
        .from("blockchain_records")
        .select("entity_id, tx_hash")
        .eq("entity_type", "vaccinations")
        .in("entity_id", ids);
      const brMap: Record<string, string> = {};
      for (const br of brs ?? []) brMap[br.entity_id as string] = br.tx_hash as string;
      return rows.map((r) => ({ ...r, tx_hash: brMap[r.id as string] ?? null }));
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
      const payload = { ...values };
      if (photoFile) {
        if (!profileId || !farmQuery.data?.id) throw new Error("Sesión no lista.");
        const { storagePath } = await uploadAnimalPhoto({
          supabase,
          farmId: farmQuery.data.id,
          animalId: id,
          profileId,
          file: photoFile,
        });
        payload.photo_url = storagePath;
      }
      const { error } = await supabase.from("animals").update(payload).eq("id", id);
      if (error) throw error;

      // Registrar el evento de baja al cambiar de estado, para que aparezca en el
      // timeline. Solo en la transición (no si ya estaba muerto/sacrificado).
      const prevStatus = animalQuery.data?.status;
      if (
        (values.status === "dead" || values.status === "slaughtered") &&
        values.status !== prevStatus &&
        profileId &&
        farmQuery.data?.id
      ) {
        await supabase.from("animal_events").insert({
          animal_id: id,
          farm_id: farmQuery.data.id,
          type: values.status === "dead" ? "death" : "slaughter",
          occurred_at: new Date().toISOString(),
          performed_by: profileId,
          payload: {},
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animal", id] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["events-merged"] });
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Sesión no lista.");
      const { error } = await supabase.from("animals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      router.push("/dashboard/animales");
    },
  });

  const addMovement = useMutation({
    mutationFn: async (vals: {
      location_from: string;
      location_to: string;
      reason: string;
      occurred_at: string;
    }) => {
      if (!profileId || !farmQuery.data?.id) throw new Error("Sesión no lista.");
      // Pasa por la cola, no por un insert directo: `animal_events` ya es una
      // OfflineTable. Antes el traslado se perdía sin conexión —y encima el
      // modal se cerraba igual, así que ni siquiera se notaba.
      return submitOrQueue(
        supabase,
        "animal_events",
        {
          animal_id: id,
          farm_id: farmQuery.data.id,
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
        },
        profileId
      );
    },
    onSuccess: (result) => {
      toast.success(submitToastMessage(result));
      queryClient.invalidateQueries({ queryKey: ["movements", id] });
      setMovModal(false);
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const treatmentsQuery = useQuery({
    queryKey: ["treatments", id],
    enabled: !!supabase && tab === "tratamientos",
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("treatments")
        .select(
          "id, treatment_id, started_at, ended_at, dose, notes, withdrawal_until_meat, withdrawal_until_milk, treatments_catalog(name, kind)"
        )
        .eq("animal_id", id)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return rows;
      const ids = rows.map((r) => r.id as string);
      const { data: brs } = await supabase
        .from("blockchain_records")
        .select("entity_id, tx_hash")
        .eq("entity_type", "treatments")
        .in("entity_id", ids);
      const brMap: Record<string, string> = {};
      for (const br of brs ?? []) brMap[br.entity_id as string] = br.tx_hash as string;
      return rows.map((r) => ({ ...r, tx_hash: brMap[r.id as string] ?? null }));
    },
  });

  // Fotos de evidencia por entidad — después de las queries principales
  const vacDocsQuery = useQuery<Record<string, string>>({
    queryKey: ["docs-vac", id],
    enabled: !!supabase && tab === "vacunas" && !!vaccinationsQuery.data?.length,
    queryFn: async () => {
      if (!supabase) return {};
      const vacIds = (vaccinationsQuery.data ?? []).map((v) => v.id as string);
      if (!vacIds.length) return {};
      const { data } = await supabase
        .from("documents")
        .select("entity_id, storage_path")
        .eq("entity_type", "vaccination")
        .in("entity_id", vacIds)
        .limit(100);
      const map: Record<string, string> = {};
      for (const d of data ?? []) {
        const { data: pub } = supabase.storage
          .from("animal-photos")
          .getPublicUrl(d.storage_path as string);
        if (pub?.publicUrl) map[d.entity_id as string] = pub.publicUrl;
      }
      return map;
    },
  });

  const treatDocsQuery = useQuery<Record<string, string>>({
    queryKey: ["docs-treat", id],
    enabled: !!supabase && tab === "tratamientos" && !!treatmentsQuery.data?.length,
    queryFn: async () => {
      if (!supabase) return {};
      const tIds = (treatmentsQuery.data ?? []).map((t) => t.id as string);
      if (!tIds.length) return {};
      const { data } = await supabase
        .from("documents")
        .select("entity_id, storage_path")
        .eq("entity_type", "treatment")
        .in("entity_id", tIds)
        .limit(100);
      const map: Record<string, string> = {};
      for (const d of data ?? []) {
        const { data: pub } = supabase.storage
          .from("animal-photos")
          .getPublicUrl(d.storage_path as string);
        if (pub?.publicUrl) map[d.entity_id as string] = pub.publicUrl;
      }
      return map;
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
    if (editing && animalQuery.data && Object.keys(editValues).length === 0) {
      const a = animalQuery.data;
      setEditValues({
        name: a.name || "",
        color: a.color || "",
        birth_date: a.birth_date ? a.birth_date.split("T")[0] : "",
        purpose: a.purpose ?? undefined,
        status: a.status,
      });
    }
  }, [animalQuery.data, editing]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!supabase || animalQuery.isPending || animalQuery.isLoading) {
    return (
      <DashboardShell title="">
        <div className="grid animate-pulse gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <div className="bg-card border-border overflow-hidden rounded-2xl border">
              <div className="bg-muted/40 h-64 w-full" />
              <div className="space-y-3 p-4">
                <div className="bg-muted/60 h-4 w-20 rounded-full" />
                <div className="bg-muted/40 h-3 w-32 rounded-full" />
                <div className="bg-muted/40 h-3 w-24 rounded-full" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-5">
            {/* Tab bar skeleton */}
            <div className="bg-muted/30 border-border flex gap-1 rounded-2xl border p-1">
              {[80, 72, 72, 100, 60, 96, 72].map((w, i) => (
                <div key={i} className="bg-muted/50 h-9 rounded-xl" style={{ width: w }} />
              ))}
            </div>
            {/* Card skeleton */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
              <div className="bg-muted/60 h-4 w-32 rounded-full" />
              <div className="grid gap-4 md:grid-cols-2">
                {[120, 96, 140, 80, 110, 100, 130, 90].map((w, i) => (
                  <div key={i} className="space-y-2">
                    <div className="bg-muted/40 h-2.5 w-16 rounded-full" />
                    <div className="bg-muted/60 h-3.5 rounded-full" style={{ width: w }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const animal = animalQuery.data;
  if (!animal) {
    // Sin conexión el dato lo sirve el service worker desde su caché. Si esta
    // ficha nunca se abrió con señal, no hay nada que servir — y decir "no
    // existe" sería mentira: el animal está, es el dispositivo el que no lo
    // tiene. La distinción importa porque la acción del usuario es distinta.
    const offlineMiss = captureMode || !!animalQuery.error;
    return (
      <DashboardShell title={offlineMiss ? "No disponible sin conexión" : "No encontrado"}>
        <p className="text-foreground/70 text-sm">
          {offlineMiss
            ? "Esta ficha no está guardada en el dispositivo. Ábrela una vez con conexión para poder consultarla sin señal."
            : "El animal no existe o no tienes acceso."}
        </p>
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
          <div className="bg-card border-border overflow-hidden rounded-2xl border shadow-sm">
            {/* Foto con status badge encima */}
            <div className="relative">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={animal.tag} className="h-64 w-full object-cover" />
              ) : (
                <div className="from-muted/60 to-muted/30 flex h-64 items-center justify-center bg-gradient-to-br">
                  <Beef className="text-foreground/15 h-16 w-16" />
                </div>
              )}
              {/* Status badge */}
              <span
                className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm ${
                  animal.status === "active"
                    ? "bg-emerald-500/80 text-white"
                    : animal.status === "sold"
                      ? "bg-blue-500/80 text-white"
                      : "bg-red-500/80 text-white"
                }`}
              >
                {STATUS_LABEL[animal.status] ?? animal.status}
              </span>
            </div>

            {/* Info del animal */}
            <div className="space-y-3 p-4">
              <div>
                <div className="text-foreground font-mono text-base font-bold">{animal.tag}</div>
                {animal.name && <div className="text-foreground/60 text-sm">{animal.name}</div>}
              </div>

              {/* Chips raza / sexo */}
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-muted text-foreground/70 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                  {animal.sex === "female" ? "♀ Hembra" : "♂ Macho"}
                </span>
                {(animal.animal_breeds ?? [])
                  .map((ab) => ab.breeds?.name)
                  .filter(Boolean)
                  .join(", ") && (
                  <span className="bg-muted text-foreground/70 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                    {(animal.animal_breeds ?? [])
                      .map((ab) => ab.breeds?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {animal.purpose && (
                  <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[12px] font-medium capitalize">
                    {animal.purpose === "dairy"
                      ? "Lechero"
                      : animal.purpose === "beef"
                        ? "Cárnico"
                        : animal.purpose === "dual"
                          ? "Doble prop."
                          : "Reproducción"}
                  </span>
                )}
              </div>

              {/* Peso */}
              {animal.current_weight_kg && (
                <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-xl border px-3 py-2">
                  <TrendingUp className="text-primary h-3.5 w-3.5 shrink-0" />
                  <div>
                    <div className="text-foreground text-sm font-bold">
                      {animal.current_weight_kg} kg
                    </div>
                    <div className="text-foreground/40 text-[11px]">Peso actual</div>
                  </div>
                </div>
              )}

              {/* Fecha de nacimiento */}
              {animal.birth_date && (
                <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-xl border px-3 py-2">
                  <Calendar className="text-foreground/40 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <div className="text-foreground text-sm font-medium">
                      {new Date(animal.birth_date).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-foreground/40 text-[11px]">Fecha de nacimiento</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDelModal(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" /> Eliminar animal
          </button>
        </div>

        <div className="space-y-6">
          {/* Banner compacto del animal — visible en todas las tabs */}
          <div className="bg-card border-border flex items-center gap-3 rounded-2xl border px-4 py-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={animal.tag} className="h-full w-full object-cover" />
              ) : (
                <div className="bg-muted/50 flex h-full w-full items-center justify-center">
                  <Beef className="text-foreground/20 h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-mono text-sm font-bold">{animal.tag}</p>
              <p className="text-foreground/50 truncate text-xs">
                {animal.sex === "female" ? "Hembra" : "Macho"}
                {(animal.animal_breeds ?? [])
                  .map((ab) => ab.breeds?.name)
                  .filter(Boolean)
                  .join(", ")
                  ? ` · ${(animal.animal_breeds ?? [])
                      .map((ab) => ab.breeds?.name)
                      .filter(Boolean)
                      .join(", ")}`
                  : ""}
                {animal.current_weight_kg ? ` · ${animal.current_weight_kg} kg` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                animal.status === "active"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : animal.status === "sold"
                    ? "bg-blue-500/15 text-blue-600"
                    : "bg-red-500/15 text-red-500"
              }`}
            >
              {STATUS_LABEL[animal.status] ?? animal.status}
            </span>
          </div>

          <div className="bg-muted/30 border-border flex flex-wrap gap-1 rounded-2xl border p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-card text-primary border-border border shadow-sm"
                    : "text-foreground/50 hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Las pestañas de captura se renderizan sólo con `farmId && profileId`.
              Sin eso no aparecía NADA —ni botón ni aviso—, que es el síntoma de
              "no me deja registrar". Mejor explicar por qué. */}
          {tab !== "info" && tab !== "qr" && (!farmId || !profileId) && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">No se pudo determinar tu finca.</span>{" "}
                {captureMode
                  ? "Sin conexión sólo se conocen los datos guardados en el dispositivo. Abre el panel una vez con señal y podrás volver a registrar aquí sin conexión."
                  : "Reintenta en unos segundos; si persiste, vuelve a entrar al panel."}
              </p>
            </div>
          )}

          {tab === "info" && (
            <div className="bg-card border-border overflow-hidden rounded-2xl border">
              <div className="border-border flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  <Beef className="text-primary h-4 w-4" />
                  <h3 className="text-foreground text-base font-bold">Datos del animal</h3>
                </div>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditValues({
                        name: animal.name || "",
                        color: animal.color || "",
                        birth_date: animal.birth_date || "",
                        purpose: animal.purpose || undefined,
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
                      onClick={() => {
                        setEditing(false);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setPhotoError(null);
                      }}
                      className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={updateMutation.isPending || !online}
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
                <dl className="grid gap-3 p-5 md:grid-cols-2">
                  <Field label="Arete" value={animal.tag} />
                  <Field label="Nombre" value={animal.name ?? "—"} />
                  <Field label="Sexo" value={animal.sex === "female" ? "Hembra" : "Macho"} />
                  <Field
                    label="Raza"
                    value={
                      (animal.animal_breeds ?? [])
                        .map((ab) => ab.breeds?.name)
                        .filter(Boolean)
                        .join(", ") || "—"
                    }
                  />
                  <Field label="Propósito" value={animal.purpose ?? "—"} />
                  <Field
                    label="Fecha de nacimiento"
                    value={
                      animal.birth_date
                        ? new Date(animal.birth_date).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"
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
                  <Field label="Color / capa" value={animal.color ?? "—"} />
                  <Field
                    label="Estado"
                    value={
                      animal.status === "active"
                        ? "Activo"
                        : animal.status === "sold"
                          ? "Vendido"
                          : animal.status === "dead"
                            ? "Fallecido"
                            : animal.status
                    }
                  />
                </dl>
              ) : (
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {!online && (
                    <div className="md:col-span-2">
                      <OfflineWriteNotice action="editar este animal" />
                    </div>
                  )}
                  {[
                    { label: "Nombre", key: "name" as const, type: "text" },
                    { label: "Color", key: "color" as const, type: "text" },
                    { label: "Fecha de nacimiento", key: "birth_date" as const, type: "date" },
                  ].map(({ label, key, type }) => {
                    let value = editValues[key] as string | undefined;
                    if (type === "date" && value) {
                      value = value.split("T")[0];
                    }
                    return (
                      <div key={key}>
                        <label className="text-foreground/60 mb-1 block text-xs font-medium">
                          {label}
                        </label>
                        <input
                          type={type}
                          value={value ?? ""}
                          max={type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                          onChange={(e) =>
                            setEditValues(
                              (p) => ({ ...p, [key]: e.target.value }) as Partial<Animal>
                            )
                          }
                          className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                        />
                      </div>
                    );
                  })}
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
                      <option value="slaughtered">Sacrificado</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-foreground/60 mb-1 block text-xs font-medium">
                      Foto del animal
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="bg-muted/40 border-border h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
                        {photoPreview || photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoPreview ?? photoUrl ?? ""}
                            alt={animal.tag}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Beef className="text-foreground/20 h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setPhotoError(null);
                            if (!file) {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                              return;
                            }
                            if (file.size > 8 * 1024 * 1024) {
                              setPhotoError("La imagen supera 8 MB.");
                              return;
                            }
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }}
                          className="text-foreground/70 file:bg-muted file:text-foreground hover:file:bg-muted/70 block w-full text-xs file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                        />
                        <p className="text-foreground/40 mt-1 text-[11px]">
                          JPG, PNG o WebP · máx. 8 MB
                        </p>
                        {photoError && <p className="text-accent mt-1 text-xs">{photoError}</p>}
                      </div>
                    </div>
                  </div>
                  {updateMutation.error && (
                    <p className="text-accent text-xs md:col-span-2">
                      {friendlyErrorMessage(updateMutation.error)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "pesajes" && farmId && profileId && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setWeighModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Registrar pesaje
                </button>
              </div>
              {weighModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setWeighModal(false)}
                  />
                  <div className="bg-card border-border relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl">
                    <div className="border-border flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-primary h-5 w-5" />
                        <h2 className="text-foreground text-base font-bold">Registrar pesaje</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeighModal(false)}
                        className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      <WeighingForm
                        animalId={animal.id}
                        farmId={farmId}
                        profileId={profileId}
                        onDone={() => setWeighModal(false)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <WeightChart
                  rows={weighingsQuery.data ?? []}
                  isLoading={weighingsQuery.isLoading}
                />
                <RecordList
                  title="Histórico de pesajes"
                  titleIcon={TrendingUp}
                  isLoading={weighingsQuery.isLoading}
                  emptyIcon={TrendingUp}
                  emptyHint="Aún no hay pesajes registrados."
                  iconBg="bg-violet-500/10"
                  iconColor="text-violet-500"
                  rows={(weighingsQuery.data ?? []).map((w, i, arr) => {
                    const prev = arr[i + 1];
                    const delta = prev ? w.weight_kg - prev.weight_kg : null;
                    return {
                      id: w.id as string,
                      primary: `${w.weight_kg} kg`,
                      secondary: new Date(w.measured_at as string).toLocaleString("es-VE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      tertiary: w.notes ?? null,
                      badge:
                        delta !== null
                          ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kg`
                          : undefined,
                      badgeColor:
                        delta === null
                          ? undefined
                          : delta >= 0
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-red-500/10 text-red-500",
                      icon: TrendingUp,
                      action: (w as { tx_hash?: string | null }).tx_hash ? undefined : (
                        <RecordEditButton
                          onClick={() =>
                            setEditRecord({
                              kind: "weighing",
                              record: {
                                id: w.id as string,
                                weight_kg: w.weight_kg as number,
                                measured_at: w.measured_at as string,
                                notes: (w.notes as string | null) ?? null,
                              },
                            })
                          }
                        />
                      ),
                    };
                  })}
                />
              </div>
            </div>
          )}

          {tab === "vacunas" && farmId && profileId && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setVacModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Registrar vacuna
                </button>
              </div>

              {vacModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setVacModal(false)}
                  />
                  <div className="bg-card border-border relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl">
                    <div className="border-border flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Syringe className="text-primary h-5 w-5" />
                        <h2 className="text-foreground text-base font-bold">Registrar vacuna</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVacModal(false)}
                        className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="max-h-[80vh] overflow-y-auto p-6">
                      <VaccinationForm
                        animalId={animal.id}
                        farmId={farmId}
                        profileId={profileId}
                        animalBirthDate={animal.birth_date}
                        onDone={() => setVacModal(false)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <RecordList
                title="Historial de vacunas"
                titleIcon={Syringe}
                isLoading={vaccinationsQuery.isLoading}
                emptyIcon={Syringe}
                emptyHint="Aún no hay vacunas registradas."
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600"
                rows={(vaccinationsQuery.data ?? []).map((v) => {
                  const cat = v.vaccines_catalog as { name?: string } | { name: string }[] | null;
                  const name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
                  const fmtDate = (iso: string) =>
                    new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  const details: { label: string; value: string }[] = [
                    { label: "Vacuna", value: name ?? "—" },
                    { label: "Fecha aplicación", value: fmtDate(v.applied_at as string) },
                    ...(v.dose_ml ? [{ label: "Dosis", value: `${v.dose_ml} ml` }] : []),
                    ...(v.batch_number ? [{ label: "Lote", value: v.batch_number as string }] : []),
                    ...(v.next_due_at
                      ? [{ label: "Próxima dosis", value: fmtDate(v.next_due_at as string) }]
                      : []),
                    ...(v.notes ? [{ label: "Notas", value: v.notes as string }] : []),
                    { label: "ID registro", value: (v.id as string).slice(0, 8) + "…" },
                  ];
                  return {
                    id: v.id as string,
                    primary: name ?? "Vacuna",
                    secondary: fmtDate(v.applied_at as string),
                    tertiary: v.next_due_at
                      ? `Próxima dosis: ${fmtDate(v.next_due_at as string)}`
                      : null,
                    badge: v.dose_ml ? `${v.dose_ml} ml` : undefined,
                    badgeColor: "bg-emerald-500/10 text-emerald-600",
                    icon: Syringe,
                    photo: vacDocsQuery.data?.[v.id as string] ?? null,
                    details,
                    action: (
                      <div className="flex items-center gap-1.5">
                        {!(v as unknown as { tx_hash?: string | null }).tx_hash && (
                          <RecordEditButton
                            onClick={() =>
                              setEditRecord({
                                kind: "vaccination",
                                record: {
                                  id: v.id as string,
                                  vaccine_id:
                                    (v as { vaccine_id?: string | null }).vaccine_id ?? null,
                                  applied_at: v.applied_at as string,
                                  dose_ml: (v.dose_ml as number | null) ?? null,
                                  batch_number: (v.batch_number as string | null) ?? null,
                                  next_due_at: (v.next_due_at as string | null) ?? null,
                                  notes: (v.notes as string | null) ?? null,
                                },
                              })
                            }
                          />
                        )}
                        <SignAnchorButton
                          entityType="vaccinations"
                          entityId={v.id as string}
                          txHash={(v as unknown as { tx_hash?: string | null }).tx_hash ?? null}
                        />
                      </div>
                    ),
                  };
                })}
              />
            </div>
          )}

          {tab === "tratamientos" && farmId && profileId && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setTreatModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Registrar tratamiento
                </button>
              </div>
              {treatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setTreatModal(false)}
                  />
                  <div className="bg-card border-border relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl">
                    <div className="border-border flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="text-primary h-5 w-5" />
                        <h2 className="text-foreground text-base font-bold">
                          Registrar tratamiento
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTreatModal(false)}
                        className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="max-h-[80vh] overflow-y-auto p-6">
                      <TreatmentForm
                        animalId={animal.id}
                        farmId={farmId}
                        profileId={profileId}
                        animalWeightKg={animal.current_weight_kg}
                        onDone={() => setTreatModal(false)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <RecordList
                title="Historial de tratamientos"
                titleIcon={FlaskConical}
                isLoading={treatmentsQuery.isLoading}
                emptyIcon={FlaskConical}
                emptyHint="Sin tratamientos registrados."
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600"
                rows={(treatmentsQuery.data ?? []).map((t) => {
                  const cat = t.treatments_catalog as { name?: string; kind?: string } | null;
                  const name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
                  const kind = Array.isArray(cat) ? cat[0]?.kind : cat?.kind;
                  const active = !t.ended_at;
                  const fmtDate = (iso: string) =>
                    new Date(iso).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  const details: { label: string; value: string }[] = [
                    { label: "Tratamiento", value: name ?? "Libre" },
                    ...(kind ? [{ label: "Tipo", value: kind }] : []),
                    { label: "Inicio", value: fmtDate(t.started_at as string) },
                    ...(t.ended_at
                      ? [{ label: "Fin", value: fmtDate(t.ended_at as string) }]
                      : [{ label: "Estado", value: "En curso" }]),
                    ...(t.dose ? [{ label: "Dosis", value: t.dose as string }] : []),
                    ...(t.withdrawal_until_meat
                      ? [
                          {
                            label: "Retiro carne",
                            value: fmtDate(t.withdrawal_until_meat as string),
                          },
                        ]
                      : []),
                    ...(t.withdrawal_until_milk
                      ? [
                          {
                            label: "Retiro leche",
                            value: fmtDate(t.withdrawal_until_milk as string),
                          },
                        ]
                      : []),
                    ...(t.notes ? [{ label: "Notas", value: t.notes as string }] : []),
                  ];
                  return {
                    id: t.id as string,
                    primary: name ?? "Tratamiento libre",
                    secondary: `Inicio: ${fmtDate(t.started_at as string)}${t.ended_at ? ` · Fin: ${fmtDate(t.ended_at as string)}` : ""}`,
                    tertiary: t.withdrawal_until_meat
                      ? `⚠ Retiro carne: ${fmtDate(t.withdrawal_until_meat as string)}`
                      : (kind ?? t.dose ?? null),
                    badge: active ? "Activo" : "Finalizado",
                    badgeColor: active
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-muted text-foreground/50",
                    icon: FlaskConical,
                    photo: treatDocsQuery.data?.[t.id as string] ?? null,
                    details,
                    action: (
                      <div className="flex items-center gap-1.5">
                        {!(t as unknown as { tx_hash?: string | null }).tx_hash && (
                          <RecordEditButton
                            onClick={() =>
                              setEditRecord({
                                kind: "treatment",
                                record: {
                                  id: t.id as string,
                                  treatment_id:
                                    (t as { treatment_id?: string | null }).treatment_id ?? null,
                                  started_at: t.started_at as string,
                                  ended_at: (t.ended_at as string | null) ?? null,
                                  dose: (t.dose as string | null) ?? null,
                                  notes: (t.notes as string | null) ?? null,
                                },
                              })
                            }
                          />
                        )}
                        <SignAnchorButton
                          entityType="treatments"
                          entityId={t.id as string}
                          txHash={(t as unknown as { tx_hash?: string | null }).tx_hash ?? null}
                        />
                      </div>
                    ),
                  };
                })}
              />
            </div>
          )}

          {tab === "leche" && farmId && profileId && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMilkModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Registrar producción
                </button>
              </div>
              {milkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMilkModal(false)}
                  />
                  <div className="bg-card border-border relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl">
                    <div className="border-border flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Milk className="text-primary h-5 w-5" />
                        <h2 className="text-foreground text-base font-bold">
                          Registrar producción
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMilkModal(false)}
                        className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      <MilkForm
                        animalId={animal.id}
                        farmId={farmId}
                        profileId={profileId}
                        onDone={() => setMilkModal(false)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <RecordList
                title="Histórico de producción"
                titleIcon={Milk}
                isLoading={milkQuery.isLoading}
                emptyIcon={Milk}
                emptyHint="Aún no hay registros de leche para este animal."
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                rows={(milkQuery.data ?? []).map((m) => {
                  const shiftLabel: Record<string, string> = {
                    am: "Mañana",
                    pm: "Tarde",
                    midday: "Mediodía",
                  };
                  return {
                    id: m.id as string,
                    primary: `${m.liters} L`,
                    secondary: new Date(m.recorded_on as string).toLocaleDateString("es-VE", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    tertiary: m.fat_pct
                      ? `Grasa ${m.fat_pct}% · Proteína ${m.protein_pct ?? "—"}%`
                      : null,
                    badge: shiftLabel[m.shift as string] ?? (m.shift as string),
                    badgeColor:
                      m.shift === "am"
                        ? "bg-yellow-400/15 text-yellow-600"
                        : m.shift === "pm"
                          ? "bg-indigo-500/10 text-indigo-500"
                          : "bg-blue-500/10 text-blue-500",
                    icon: Milk,
                  };
                })}
              />
            </div>
          )}

          {tab === "movimientos" && farmId && profileId && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMovModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Registrar traslado
                </button>
              </div>
              {movModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMovModal(false)}
                  />
                  <div className="bg-card border-border relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl">
                    <div className="border-border flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="text-primary h-5 w-5" />
                        <h2 className="text-foreground text-base font-bold">Registrar traslado</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMovModal(false)}
                        className="text-foreground/40 hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      <MovementForm
                        isSaving={addMovement.isPending}
                        saveError={addMovement.error as Error | null}
                        onSubmit={(vals) => addMovement.mutate(vals)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <MovementsList
                movements={(movementsQuery.data ?? []) as MovementRow[]}
                isLoading={movementsQuery.isLoading}
              />
            </div>
          )}

          {tab === "qr" && tokenQuery.data && (
            <div className="flex flex-col items-center gap-6 py-4">
              <AnimalQrCard
                slug={tokenQuery.data.slug}
                animalTag={animal.tag}
                animalName={animal.name}
              />
              <p className="text-foreground/40 max-w-xs text-center text-xs">
                Imprime o comparte este código para que cualquier persona pueda verificar el
                historial sanitario y de trazabilidad de este animal.
              </p>
            </div>
          )}
          {tab === "qr" && !tokenQuery.data && !tokenQuery.isLoading && (
            <div className="bg-card border-border text-foreground/60 rounded-2xl border p-6 text-center text-sm">
              No se encontró un token público para este animal.
            </div>
          )}
        </div>
      </div>

      {editRecord && (
        <EditAnimalRecordModal
          kind={editRecord.kind}
          record={editRecord.record}
          animalId={id}
          onClose={() => setEditRecord(null)}
        />
      )}

      {delModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteMutation.isPending && setDelModal(false)}
          />
          <div className="bg-card border-border relative z-10 w-full max-w-md rounded-2xl border shadow-2xl">
            <div className="border-border flex items-center gap-2 border-b px-6 py-4">
              <Trash2 className="h-5 w-5 text-red-500" />
              <h2 className="text-foreground text-base font-bold">Eliminar animal</h2>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-foreground/70 text-sm">
                ¿Seguro que quieres eliminar{" "}
                <span className="text-foreground font-semibold">{animal.tag}</span>
                {animal.name ? ` (${animal.name})` : ""}? Se borrarán también todos sus pesajes,
                vacunas, tratamientos y demás registros asociados. Esta acción no se puede deshacer.
              </p>
              {!online && <OfflineWriteNotice action="eliminar un animal" />}
              {deleteMutation.error && (
                <p className="text-accent text-xs">{friendlyErrorMessage(deleteMutation.error)}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => setDelModal(false)}
                  className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending || !online}
                  onClick={() => deleteMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 border-border/40 rounded-xl border px-3 py-2.5">
      <dt className="text-foreground/45 text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground mt-0.5 text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}

type ListRow = {
  id: string;
  primary: string;
  secondary: string;
  tertiary: string | null;
  badge?: string;
  badgeColor?: string;
  icon: typeof Beef;
  photo?: string | null;
  action?: React.ReactNode;
  details?: { label: string; value: string }[];
};

type MovementRow = {
  id: string;
  occurred_at: string;
  payload: { location_from?: string | null; location_to?: string | null } | null;
  notes: string | null;
};

type MovementPayload = { location_from?: string | null; location_to?: string | null };

const inputCls =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";

function MovementForm({
  isSaving,
  saveError,
  onSubmit,
}: {
  isSaving: boolean;
  saveError: Error | null;
  onSubmit: (vals: {
    location_from: string;
    location_to: string;
    reason: string;
    occurred_at: string;
  }) => void;
}) {
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
          max={new Date().toISOString().slice(0, 16)}
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
          disabled={isSaving || !to.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar traslado
        </button>
      </div>
    </form>
  );
}

function MovementsList({ movements, isLoading }: { movements: MovementRow[]; isLoading: boolean }) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-foreground text-sm font-semibold">Historial de traslados</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${movements.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-foreground/40"}`}
        >
          {isLoading ? "—" : movements.length}
        </span>
      </div>
      {isLoading && (
        <div className="divide-border divide-y">
          {[1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
              <div className="bg-muted/60 h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <div className="bg-muted/60 h-3 w-1/3 rounded-full" />
                <div className="bg-muted/40 h-2.5 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && movements.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
          <div className="bg-muted/40 flex h-14 w-14 items-center justify-center rounded-2xl">
            <MapPin className="text-foreground/20 h-7 w-7" />
          </div>
          <p className="text-foreground/40 text-sm">Sin traslados registrados.</p>
        </div>
      )}
      {movements.length > 0 && (
        <ul className="divide-border divide-y">
          {movements.map((m) => {
            const p = m.payload as MovementPayload | null;
            return (
              <li
                key={m.id}
                className="hover:bg-muted/20 flex items-center gap-4 px-5 py-3.5 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {p?.location_from && (
                      <span className="text-foreground/50">{p.location_from}</span>
                    )}
                    {p?.location_from && <span className="text-foreground/30 text-xs">→</span>}
                    <span>{p?.location_to ?? "—"}</span>
                  </div>
                  <div className="text-foreground/45 mt-0.5 text-xs">
                    {new Date(m.occurred_at).toLocaleString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.notes ? ` · ${m.notes}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type WeighingRow = { weight_kg: number; measured_at: string };

function WeightChart({ rows, isLoading }: { rows: WeighingRow[]; isLoading: boolean }) {
  if (isLoading)
    return (
      <div className="bg-card border-border animate-pulse rounded-2xl border p-6">
        <div className="bg-muted/40 mb-4 h-4 w-36 rounded" />
        <div className="bg-muted/20 h-32 rounded-xl" />
      </div>
    );

  const sorted = [...rows].reverse().slice(-24);
  if (sorted.length === 0) return null;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const delta = last.weight_kg - first.weight_kg;
  const gain = delta >= 0;
  const pctChange = first.weight_kg > 0 ? ((delta / first.weight_kg) * 100).toFixed(1) : "0";

  // KPIs
  const avg = sorted.reduce((s, r) => s + r.weight_kg, 0) / sorted.length;
  const max = Math.max(...sorted.map((r) => r.weight_kg));

  if (sorted.length < 2)
    return (
      <div className="bg-card border-border rounded-2xl border p-6">
        <p className="text-foreground/50 text-sm">
          Solo hay un pesaje. Registra más para ver la tendencia.
        </p>
      </div>
    );

  // SVG chart
  const W = 500,
    H = 110,
    PL = 10,
    PR = 10,
    PT = 10,
    PB = 10;
  const weights = sorted.map((r) => r.weight_kg);
  const minW = Math.min(...weights) * 0.98;
  const maxW = Math.max(...weights) * 1.02;
  const range = maxW - minW || 1;
  const pts = sorted.map((r, i) => {
    const x = PL + (i / (sorted.length - 1)) * (W - PL - PR);
    const y = PT + (1 - (r.weight_kg - minW) / range) * (H - PT - PB);
    return { x: +x.toFixed(1), y: +y.toFixed(1), r };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  // Area fill path
  const areaPath =
    `M${pts[0].x},${H - PB} ` +
    pts.map((p) => `L${p.x},${p.y}`).join(" ") +
    ` L${pts[pts.length - 1].x},${H - PB} Z`;

  return (
    <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-base font-bold">Tendencia de peso</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${gain ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}
        >
          {gain ? "▲" : "▼"} {gain ? "+" : ""}
          {delta.toFixed(1)} kg ({gain ? "+" : ""}
          {pctChange}%)
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Peso actual", value: `${last.weight_kg} kg`, highlight: true },
          { label: "Promedio", value: `${avg.toFixed(1)} kg`, highlight: false },
          { label: "Máximo", value: `${max} kg`, highlight: false },
        ].map((k) => (
          <div key={k.label} className="bg-muted/40 rounded-xl px-3 py-2.5">
            <div className="text-foreground/50 text-xs">{k.label}</div>
            <div
              className={`mt-0.5 text-sm font-bold ${k.highlight ? "text-primary" : "text-foreground"}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* SVG */}
      <div className="bg-muted/20 overflow-hidden rounded-xl px-2 pt-2 pb-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfica de peso">
          <defs>
            <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#wGrad)" />
          <polyline
            points={polyline}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
              <circle cx={p.x} cy={p.y} r="7" fill="#3b82f6" fillOpacity="0.15" />
            </g>
          ))}
        </svg>
        {/* X axis labels */}
        <div className="mt-1 flex justify-between px-2 pb-2">
          <span className="text-foreground/40 text-[11px]">
            {new Date(first.measured_at).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
            })}
          </span>
          <span className="text-foreground/40 text-[11px]">
            {new Date(last.measured_at).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Botón "Editar" para una fila de registro (mismo look que SignAnchorButton). */
function RecordEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Editar registro"
      className="border-border text-foreground/50 hover:border-primary/40 hover:text-primary inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
      Editar
    </button>
  );
}

function RecordList({
  title,
  rows,
  isLoading,
  emptyHint,
  emptyIcon: EmptyIcon = Calendar,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  titleIcon: TitleIcon,
}: {
  title: string;
  rows: ListRow[];
  isLoading: boolean;
  emptyHint?: string;
  emptyIcon?: typeof Beef;
  iconBg?: string;
  iconColor?: string;
  titleIcon?: typeof Beef;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  return (
    <div className="bg-card border-border overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          {TitleIcon && <TitleIcon className={`h-4 w-4 ${iconColor}`} />}
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLoading ? "bg-muted text-foreground/30" : rows.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-foreground/40"}`}
        >
          {isLoading ? "—" : rows.length}
        </span>
      </div>

      {isLoading && (
        <div className="divide-border divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
              <div className="bg-muted/60 h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <div className="bg-muted/60 h-3 w-1/3 rounded-full" />
                <div className="bg-muted/40 h-2.5 w-1/2 rounded-full" />
              </div>
              <div className="bg-muted/40 h-6 w-14 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
          <div className="bg-muted/40 flex h-14 w-14 items-center justify-center rounded-2xl">
            <EmptyIcon className="text-foreground/20 h-7 w-7" />
          </div>
          <p className="text-foreground/40 text-sm">{emptyHint ?? "Sin registros aún."}</p>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="divide-border divide-y">
          {rows.map((r) => {
            const isExpanded = expandedId === r.id;
            const hasDetails = r.details && r.details.length > 0;
            return (
              <li key={r.id} className="divide-border divide-y">
                <div
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${hasDetails ? "hover:bg-muted/20 cursor-pointer" : ""}`}
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="relative h-10 w-10 shrink-0">
                    {r.photo ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomSrc(r.photo!);
                        }}
                        className="focus-visible:ring-primary group/thumb block h-10 w-10 overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2"
                        aria-label="Ampliar imagen"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.photo}
                          alt=""
                          className="h-10 w-10 object-cover transition-transform group-hover/thumb:scale-110"
                        />
                      </button>
                    ) : (
                      <div
                        className={`${iconBg} ${iconColor} flex h-10 w-10 items-center justify-center rounded-xl`}
                      >
                        <r.icon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-medium">{r.primary}</span>
                      {r.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.badgeColor ?? "bg-muted text-foreground/60"}`}
                        >
                          {r.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-foreground/45 mt-0.5 text-xs">{r.secondary}</div>
                    {r.tertiary && (
                      <div className="text-foreground/60 mt-0.5 text-xs font-medium">
                        {r.tertiary}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.action && <div onClick={(e) => e.stopPropagation()}>{r.action}</div>}
                    {hasDetails && (
                      <ChevronDown
                        className={`text-foreground/30 h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    )}
                  </div>
                </div>
                {isExpanded && r.details && (
                  <div className="bg-muted/10 px-5 py-4">
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {r.details.map((d) => (
                        <div
                          key={d.label}
                          className="bg-background border-border/50 rounded-xl border px-3 py-2.5"
                        >
                          <dt className="text-foreground/40 text-[11px] font-semibold tracking-wider uppercase">
                            {d.label}
                          </dt>
                          <dd className="text-foreground mt-0.5 text-xs font-medium break-all">
                            {d.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
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
