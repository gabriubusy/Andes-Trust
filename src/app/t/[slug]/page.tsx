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

  const { data: token } = await supabase
    .from("traceability_tokens")
    .select("entity_type, entity_id, farm_id, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!token || !token.is_active || token.entity_type !== "animal") notFound();

  const now = Date.now();

  const [animalRes, weighingsRes, vaccinationsRes, certificationsRes, milkRes, farmRes] =
    await Promise.all([
      supabase
        .from("animals")
        .select(
          "id, tag, name, sex, birth_date, current_weight_kg, photo_url, color, origin, breeds(name)"
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

  if (!animalRes.data) notFound();
  const animal = animalRes.data as typeof animalRes.data & { breeds: { name: string } | null };

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
      .in("entity_id", vacIds)
      .eq("bucket", "animal-photos");
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

  const fmt = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "long", year: "numeric" });
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
      {/* ── HERO full-width ───────────────────────────────── */}
      <div className="relative h-[60vh] min-h-72 w-full">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={animal.tag} className="h-full w-full object-cover" />
        ) : (
          <div className="bg-muted/20 flex h-full w-full items-center justify-center">
            <Beef className="text-foreground/10 h-32 w-32" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Logo + farm top */}
        <div className="absolute top-4 left-0 right-0 flex items-center justify-center">
          <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={80} height={32} className="h-5 w-auto" />
            {farm && (
              <span className="text-white/70 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[farm.name, farm.region].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>

        {/* Animal name sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg px-6 pb-8">
          <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">
            Ficha pública · trazabilidad verificada
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight drop-shadow-lg">
            {animal.name ?? animal.tag}
          </h1>
          {animal.name && <p className="text-white/60 font-mono text-sm mt-0.5">{animal.tag}</p>}
        </div>
      </div>

      {/* ── VERIFIED BADGE ───────────────────────────────── */}
      <div className="bg-primary/10 border-primary/20 border-b border-t flex items-center justify-center gap-2 px-4 py-2.5">
        <ShieldCheck className="text-primary h-4 w-4 shrink-0" />
        <p className="text-primary text-xs font-medium">
          Verificado por {farm?.name ?? "Finca El Progreso"} · {fmt.format(new Date())}
        </p>
      </div>

      <div className="mx-auto max-w-lg">
        <div className="space-y-4 p-4">
          {/* ── STATS GRID ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Sexo"
              value={animal.sex === "female" ? "Hembra" : "Macho"}
              icon={Beef}
              color="text-rose-500"
              bg="bg-rose-500/10"
            />
            <StatCard
              label="Raza"
              value={(animal.breeds as { name: string } | null)?.name ?? "Sin registro"}
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
                        <div className="bg-violet-500/10 flex h-8 w-8 items-center justify-center rounded-lg">
                          <Scale className="text-violet-500 h-3.5 w-3.5" />
                        </div>
                        <span className="text-foreground text-sm font-semibold tabular-nums">
                          {w.weight_kg} kg
                        </span>
                        {delta !== null && (
                          <span
                            className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}
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
                    <div key={i} className="p-4 space-y-3">
                      {/* Evidence photo */}
                      {photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt={`Evidencia ${cat?.name ?? "vacuna"}`}
                          className="w-full h-36 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5 ${isDue ? "bg-red-500/10" : "bg-emerald-500/10"}`}
                        >
                          <Syringe
                            className={`h-4 w-4 ${isDue ? "text-red-500" : "text-emerald-500"}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-foreground text-sm font-semibold">
                              {cat?.name ?? "Vacuna"}
                            </span>
                            {isDue ? (
                              <span className="bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full px-2 py-0.5 flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Refuerzo pendiente
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full px-2 py-0.5">
                                Al día
                              </span>
                            )}
                          </div>
                          {cat?.disease && (
                            <p className="text-foreground/40 text-xs mt-0.5">
                              Contra: {cat.disease}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-foreground/50 text-xs bg-muted/40 rounded-lg px-2 py-0.5">
                              {fmtShort.format(new Date(v.applied_at as string))}
                            </span>
                            {v.next_due_at && (
                              <span
                                className={`text-xs flex items-center gap-1 ${isDue ? "text-red-400" : "text-foreground/40"}`}
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
                          <XCircle className="text-red-500 h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="text-emerald-500 h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-foreground text-sm font-medium">
                            {CERT_TYPE_LABELS[c.type] ?? c.type}
                          </span>
                          {expired ? (
                            <span className="bg-red-500/10 text-red-500 text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Vencido
                            </span>
                          ) : nearExpiry ? (
                            <span className="bg-amber-500/10 text-amber-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Por vencer
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                              Vigente
                            </span>
                          )}
                        </div>
                        {c.issuer && (
                          <p className="text-foreground/40 text-xs mt-0.5">{c.issuer}</p>
                        )}
                      </div>
                      {c.issued_at && (
                        <span className="text-foreground/35 text-xs shrink-0">
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

          {/* ── FOOTER ───────────────────────────────────────── */}
          <p className="text-foreground/25 pb-6 text-center text-xs">
            Ficha pública generada automáticamente · {farm?.name ?? "Finca El Progreso"}
          </p>
        </div>
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
    <div className="bg-card border-border rounded-2xl border p-4 space-y-3">
      <div className={`${bg} inline-flex h-8 w-8 items-center justify-center rounded-lg`}>
        <Icon className={`${color} h-4 w-4`} />
      </div>
      <div>
        <p className="text-foreground/40 text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </p>
        <p className="text-foreground text-base font-bold mt-0.5">{value}</p>
      </div>
      {sparkPath && (
        <svg viewBox="0 0 120 32" className="w-full h-7 opacity-60">
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
    <div className="bg-card border-border rounded-2xl border overflow-hidden">
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
