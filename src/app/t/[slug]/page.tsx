import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Beef,
  Milk,
  ShieldCheck,
  Syringe,
  TrendingUp,
  Scale,
  FileCheck,
  AlertTriangle,
  Calendar,
  MapPin,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  Hash,
  Weight,
} from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ANIMAL_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import PublicQRBlock from "@/components/PublicQRBlock";

export const revalidate = 60;

const CERT_TYPE_LABELS: Record<string, string> = {
  origin: "Origen",
  health: "Sanidad",
  organic: "Orgánico",
  welfare: "Bienestar animal",
  export: "Exportación",
  other: "Otro",
};

export default async function PublicAnimalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: token, error: tokenError } = await supabase
    .from("traceability_tokens")
    .select("entity_type, entity_id, farm_id, is_active")
    .eq("slug", slug)
    .maybeSingle();

  // Si la consulta falla (no un simple "no existe"), lo logueamos para no
  // esconder un error real como un 404 mudo.
  if (tokenError) console.error("[t/slug] error consultando token", { slug, tokenError });
  if (tokenError || !token || !token.is_active || token.entity_type !== "animal") notFound();

  const now = Date.now();

  const [animalRes, weighingsRes, vaccinationsRes, certificationsRes, milkRes, farmRes] =
    await Promise.all([
      supabase
        .from("animals")
        .select(
          "id, tag, name, sex, birth_date, current_weight_kg, photo_url, color, origin, animal_breeds(breeds(name))"
        )
        .eq("id", token.entity_id)
        .maybeSingle(),
      supabase
        .from("weighings")
        .select("weight_kg, measured_at, notes")
        .eq("animal_id", token.entity_id)
        .order("measured_at", { ascending: false })
        .limit(15),
      supabase
        .from("vaccinations")
        .select("id, applied_at, next_due_at, notes, vaccines_catalog(name, disease)")
        .eq("animal_id", token.entity_id)
        .order("applied_at", { ascending: false }),
      supabase
        .from("certifications")
        .select("id, type, issuer, issued_at, valid_until")
        .eq("animal_id", token.entity_id)
        .order("issued_at", { ascending: false }),
      supabase
        .from("milk_records")
        .select("liters, recorded_on, shift")
        .eq("animal_id", token.entity_id)
        .gte("recorded_on", new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order("recorded_on", { ascending: false }),
      supabase
        .from("farms")
        .select("name, region, country, address")
        .eq("id", token.farm_id)
        .maybeSingle(),
    ]);

  // Un error de la consulta (p. ej. permisos/relación) no debe ocultarse como
  // un 404 silencioso: lo dejamos en los logs del servidor.
  if (animalRes.error)
    console.error("[t/slug] error consultando animal", {
      slug,
      entityId: token.entity_id,
      animalError: animalRes.error,
    });
  if (!animalRes.data) notFound();
  const animal = animalRes.data as unknown as Omit<typeof animalRes.data, "animal_breeds"> & {
    animal_breeds: { breeds: { name: string } | null }[] | null;
  };
  const breedLabel =
    (animal.animal_breeds ?? [])
      .map((ab) => ab.breeds?.name)
      .filter(Boolean)
      .join(", ") || "Sin registro";

  let photoUrl: string | null = null;
  if (animal.photo_url) {
    const { data: pub } = supabase.storage
      .from(ANIMAL_PHOTOS_BUCKET)
      .getPublicUrl(animal.photo_url);
    photoUrl = pub?.publicUrl ?? null;
  }

  const weighings = weighingsRes.data ?? [];
  const vaccinations = vaccinationsRes.data ?? [];
  const certifications = certificationsRes.data ?? [];
  const milkRows = milkRes.data ?? [];
  const farm = farmRes.data;

  // Fetch evidence photos for vaccinations
  const vacIds = vaccinations.map((v) => v.id as string).filter(Boolean);
  let vacPhotos: Record<string, string> = {};
  if (vacIds.length > 0) {
    const { data: vacDocs } = await supabase
      .from("documents")
      .select("entity_id, storage_path")
      .eq("entity_type", "vaccination")
      .in("entity_id", vacIds);
    if (vacDocs) {
      for (const doc of vacDocs) {
        if (doc.entity_id && doc.storage_path) {
          const { data: pub } = supabase.storage
            .from(ANIMAL_PHOTOS_BUCKET)
            .getPublicUrl(doc.storage_path);
          if (pub?.publicUrl) vacPhotos[doc.entity_id] = pub.publicUrl;
        }
      }
    }
  }

  const milkTotal = milkRows.reduce((acc, r) => acc + Number(r.liters ?? 0), 0);
  const latestWeight = weighings[0]?.weight_kg ?? animal.current_weight_kg;

  const fmtShort = new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const isExpired = (d: string | null) => (d ? new Date(d).getTime() < now : false);
  const isNearExpiry = (d: string | null) => {
    if (!d) return false;
    const days = (new Date(d).getTime() - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  };

  // Weight sparkline
  const sparkWeights = [...weighings]
    .reverse()
    .slice(-12)
    .map((w) => w.weight_kg);
  let sparkPath = "";
  if (sparkWeights.length >= 2) {
    const W = 120,
      H = 32,
      pad = 2;
    const minW = Math.min(...sparkWeights);
    const maxW = Math.max(...sparkWeights);
    const range = maxW - minW || 1;
    const pts = sparkWeights.map((w, i) => ({
      x: +(pad + (i / (sparkWeights.length - 1)) * (W - pad * 2)).toFixed(1),
      y: +(pad + (1 - (w - minW) / range) * (H - pad * 2)).toFixed(1),
    }));
    sparkPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  }

  return (
    <main className="bg-background text-foreground min-h-screen">
      {/* ── HERO ──────────────────────────────────────────── */}
      {photoUrl ? (
        // Con foto: hero a pantalla completa con la imagen
        <div className="relative h-[58vh] min-h-72 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={animal.tag} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

          {/* Logo + finca */}
          <div className="absolute top-4 right-0 left-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 backdrop-blur-sm">
              <Image src="/logo.png" alt="Logo" width={80} height={32} className="h-5 w-auto" />
              {farm && (
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <MapPin className="h-3 w-3" />
                  {[farm.name, farm.region].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* Nombre sobre la imagen */}
          <div className="absolute right-0 bottom-0 left-0 mx-auto max-w-5xl px-6 pb-8">
            <p className="mb-1 text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Ficha pública de trazabilidad
            </p>
            <h1 className="text-4xl leading-tight font-bold text-white drop-shadow-lg">
              {animal.name ?? animal.tag}
            </h1>
            {animal.name && <p className="mt-0.5 font-mono text-sm text-white/60">{animal.tag}</p>}
          </div>
        </div>
      ) : (
        // Sin foto: encabezado compacto centrado (sin espacio vacío)
        <div className="border-border relative w-full overflow-hidden border-b">
          <div className="from-primary/8 via-background to-background absolute inset-0 bg-linear-to-b" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 pt-5 pb-9 text-center">
            {/* Logo + finca */}
            <div className="bg-card/60 border-border mb-8 flex items-center gap-2 rounded-full border px-4 py-1.5">
              <Image src="/logo.png" alt="Logo" width={80} height={32} className="h-5 w-auto" />
              {farm && (
                <span className="text-foreground/60 flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {[farm.name, farm.region].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>

            {/* Badge de icono */}
            <div className="bg-primary/10 border-primary/20 shadow-primary/5 mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border shadow-lg">
              <Beef className="text-primary/70 h-11 w-11" />
            </div>

            <p className="text-foreground/50 mb-1.5 text-[10px] font-bold tracking-widest uppercase">
              Ficha pública de trazabilidad
            </p>
            <h1 className="text-foreground text-4xl leading-tight font-bold">
              {animal.name ?? animal.tag}
            </h1>
            {animal.name && (
              <p className="text-foreground/50 mt-1 font-mono text-sm">{animal.tag}</p>
            )}
          </div>
        </div>
      )}

      {/* ── PUBLISHED BADGE ──────────────────────────────── */}
      <div className="bg-primary/10 border-primary/20 flex items-center justify-center gap-2 border-t border-b px-4 py-2.5">
        <ShieldCheck className="text-primary h-4 w-4 shrink-0" />
        <p className="text-primary text-xs font-medium">
          Ficha publicada por {farm?.name ?? "Finca El Progreso"}
        </p>
      </div>

      <div className="mx-auto max-w-5xl p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start lg:gap-6">
          {/* ── STATS GRID (panel lateral en escritorio) ─────── */}
          <div className="grid grid-cols-2 gap-3 lg:sticky lg:top-4">
            <StatCard
              label="Sexo"
              value={animal.sex === "female" ? "Hembra" : "Macho"}
              icon={Beef}
              color="text-rose-500"
              bg="bg-rose-500/10"
            />
            <StatCard
              label="Raza"
              value={breedLabel}
              icon={Hash}
              color="text-violet-500"
              bg="bg-violet-500/10"
            />
            {animal.birth_date && (
              <StatCard
                label="Nacimiento"
                value={fmtShort.format(new Date(animal.birth_date))}
                icon={Calendar}
                color="text-amber-500"
                bg="bg-amber-500/10"
              />
            )}
            {latestWeight && (
              <StatCard
                label="Peso actual"
                value={`${latestWeight} kg`}
                icon={Weight}
                color="text-emerald-500"
                bg="bg-emerald-500/10"
                sparkPath={sparkPath}
              />
            )}
            {animal.color && (
              <StatCard
                label="Color"
                value={animal.color}
                icon={Beef}
                color="text-foreground/50"
                bg="bg-muted/40"
              />
            )}
            {milkTotal > 0 && (
              <StatCard
                label="Leche (30 días)"
                value={`${milkTotal.toFixed(1)} L`}
                icon={Milk}
                color="text-blue-500"
                bg="bg-blue-500/10"
              />
            )}
          </div>

          {/* ── HISTORIAL (columna derecha en escritorio) ────── */}
          <div className="space-y-4">
            {/* ── PESAJES ──────────────────────────────────────── */}
            {weighings.length > 0 && (
              <Section
                icon={Scale}
                title="Historial de pesajes"
                color="text-violet-500"
                count={weighings.length}
              >
                <ul className="divide-border divide-y">
                  {weighings.map((w, i) => {
                    const prev = weighings[i + 1];
                    const delta = prev ? w.weight_kg - prev.weight_kg : null;
                    return (
                      <li key={i} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                            <Scale className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <span className="text-foreground text-sm font-semibold tabular-nums">
                            {w.weight_kg} kg
                          </span>
                          {delta !== null && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta.toFixed(1)} kg
                            </span>
                          )}
                        </div>
                        <span className="text-foreground/40 text-xs">
                          {fmtShort.format(new Date(w.measured_at as string))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* ── VACUNAS ──────────────────────────────────────── */}
            {vaccinations.length > 0 && (
              <Section
                icon={Syringe}
                title="Registro de vacunación"
                color="text-emerald-500"
                count={vaccinations.length}
              >
                <div className="divide-border divide-y">
                  {vaccinations.map((v, i) => {
                    const cat = v.vaccines_catalog as { name?: string; disease?: string } | null;
                    const isDue = v.next_due_at && new Date(v.next_due_at).getTime() < now;
                    const photoUrl = vacPhotos[v.id as string];
                    return (
                      <div key={i} className="space-y-3 p-4">
                        {/* Evidence photo */}
                        {photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={`Evidencia ${cat?.name ?? "vacuna"}`}
                            className="h-36 w-full rounded-xl object-cover"
                          />
                        )}
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDue ? "bg-red-500/10" : "bg-emerald-500/10"}`}
                          >
                            <Syringe
                              className={`h-4 w-4 ${isDue ? "text-red-500" : "text-emerald-500"}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-foreground text-sm font-semibold">
                                {cat?.name ?? "Vacuna"}
                              </span>
                              {isDue ? (
                                <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Refuerzo pendiente
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  Al día
                                </span>
                              )}
                            </div>
                            {cat?.disease && (
                              <p className="text-foreground/40 mt-0.5 text-xs">
                                Contra: {cat.disease}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-3">
                              <span className="text-foreground/50 bg-muted/40 rounded-lg px-2 py-0.5 text-xs">
                                {fmtShort.format(new Date(v.applied_at as string))}
                              </span>
                              {v.next_due_at && (
                                <span
                                  className={`flex items-center gap-1 text-xs ${isDue ? "text-red-400" : "text-foreground/40"}`}
                                >
                                  <Clock className="h-3 w-3" />
                                  Próxima: {fmtShort.format(new Date(v.next_due_at))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ── CERTIFICADOS ─────────────────────────────────── */}
            {certifications.length > 0 && (
              <Section
                icon={FileCheck}
                title="Certificaciones"
                color="text-blue-500"
                count={certifications.length}
              >
                <ul className="divide-border divide-y">
                  {certifications.map((c) => {
                    const expired = isExpired(c.valid_until);
                    const nearExpiry = !expired && isNearExpiry(c.valid_until);
                    return (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${expired ? "bg-red-500/10" : "bg-emerald-500/10"}`}
                        >
                          {expired ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground text-sm font-medium">
                              {CERT_TYPE_LABELS[c.type] ?? c.type}
                            </span>
                            {expired ? (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                                <AlertTriangle className="h-2.5 w-2.5" /> Vencido
                              </span>
                            ) : nearExpiry ? (
                              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                <AlertTriangle className="h-2.5 w-2.5" /> Por vencer
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                Vigente
                              </span>
                            )}
                          </div>
                          {c.issuer && (
                            <p className="text-foreground/40 mt-0.5 text-xs">{c.issuer}</p>
                          )}
                        </div>
                        {c.issued_at && (
                          <span className="text-foreground/35 shrink-0 text-xs">
                            {fmtShort.format(new Date(c.issued_at))}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* ── QR ───────────────────────────────────────────── */}
            <Section icon={QrCode} title="Verificar trazabilidad" color="text-primary">
              <div className="px-4 pb-4">
                <PublicQRBlock slug={slug} animalId={token.entity_id} />
              </div>
            </Section>
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <p className="text-foreground/25 pt-6 pb-6 text-center text-xs">
          Ficha pública generada automáticamente · {farm?.name ?? "Finca El Progreso"}
        </p>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sparkPath,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  sparkPath?: string;
}) {
  return (
    <div className="bg-card border-border space-y-3 rounded-2xl border p-4">
      <div className={`${bg} inline-flex h-8 w-8 items-center justify-center rounded-lg`}>
        <Icon className={`${color} h-4 w-4`} />
      </div>
      <div>
        <p className="text-foreground/40 text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </p>
        <p className="text-foreground mt-0.5 text-base font-bold">{value}</p>
      </div>
      {sparkPath && (
        <svg viewBox="0 0 120 32" className="h-7 w-full opacity-60">
          <path
            d={sparkPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={color}
          />
        </svg>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  color,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-4 py-3.5">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Icon className={`${color} h-4 w-4`} />
          {title}
        </h2>
        {count !== undefined && (
          <span className="bg-muted text-foreground/50 rounded-full px-2 py-0.5 text-xs font-semibold">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
