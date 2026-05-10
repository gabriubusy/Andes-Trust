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
} from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ANIMAL_PHOTOS_BUCKET } from "@/lib/supabase/storage";

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

  // Fetch all data in parallel
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
        .select("applied_at, next_due_at, notes, vaccines_catalog(name, disease)")
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
    const { data: signed } = await supabase.storage
      .from(ANIMAL_PHOTOS_BUCKET)
      .createSignedUrl(animal.photo_url, 60 * 30);
    photoUrl = signed?.signedUrl ?? null;
  }

  const weighings = weighingsRes.data ?? [];
  const vaccinations = vaccinationsRes.data ?? [];
  const certifications = certificationsRes.data ?? [];
  const milkRows = milkRes.data ?? [];
  const farm = farmRes.data;

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

  return (
    <main className="bg-background text-foreground min-h-screen py-10 md:py-16">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        {/* Logo + finca */}
        <div className="flex flex-col items-center gap-1 text-center">
          <Image
            src="/logo.png"
            alt="Finca El Progreso"
            width={120}
            height={48}
            className="h-8 w-auto"
          />
          {farm && (
            <p className="text-foreground/50 mt-1 inline-flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {[farm.name, farm.region, farm.country].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Tarjeta principal */}
        <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={animal.tag} className="h-72 w-full object-cover" />
          ) : (
            <div className="bg-muted/40 flex h-72 items-center justify-center">
              <Beef className="text-foreground/20 h-20 w-20" />
            </div>
          )}

          <div className="space-y-6 p-6 md:p-8">
            <div className="text-center">
              <p className="text-foreground/50 text-xs font-semibold tracking-widest uppercase">
                Ficha pública · trazabilidad verificada
              </p>
              <h1 className="text-foreground mt-2 text-3xl font-bold">
                {animal.name ?? animal.tag}
              </h1>
              <p className="text-foreground/60 mt-0.5 font-mono text-sm">{animal.tag}</p>
            </div>

            {/* Datos clave */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Sexo" value={animal.sex === "female" ? "Hembra" : "Macho"} />
              <Stat label="Raza" value={(animal.breeds as { name: string } | null)?.name ?? "—"} />
              <Stat
                label="Nacimiento"
                value={animal.birth_date ? fmtShort.format(new Date(animal.birth_date)) : "—"}
                icon={Calendar}
              />
              <Stat
                label="Peso"
                value={latestWeight ? `${latestWeight} kg` : "—"}
                icon={TrendingUp}
              />
              {animal.color && <Stat label="Color" value={animal.color} />}
              {animal.origin && <Stat label="Origen" value={animal.origin} />}
            </dl>

            {/* Badge verificado */}
            <div className="border-border/50 text-foreground/50 flex items-center justify-center gap-2 border-t pt-4 text-xs">
              <ShieldCheck className="text-primary h-4 w-4" />
              Verificado por Finca El Progreso · {fmt.format(new Date())}
            </div>
          </div>
        </div>

        {/* Historial de pesajes */}
        {weighings.length > 0 && (
          <section className="bg-card border-border space-y-4 rounded-2xl border p-6">
            <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
              <Scale className="text-primary h-4 w-4" /> Historial de pesajes
            </h2>
            <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
              {weighings.map((w, i) => (
                <li
                  key={i}
                  className="bg-muted/10 flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-foreground font-semibold tabular-nums">
                    {w.weight_kg} kg
                  </span>
                  <span className="text-foreground/50 text-xs">
                    {fmtShort.format(new Date(w.measured_at as string))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Vacunas */}
        {vaccinations.length > 0 && (
          <section className="bg-card border-border space-y-4 rounded-2xl border p-6">
            <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
              <Syringe className="text-primary h-4 w-4" /> Registro de vacunación
            </h2>
            <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
              {vaccinations.map((v, i) => {
                const cat = v.vaccines_catalog as { name?: string; disease?: string } | null;
                return (
                  <li key={i} className="bg-muted/10 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground text-sm font-medium">
                        {cat?.name ?? "Vacuna"}
                      </span>
                      <span className="text-foreground/50 text-xs">
                        {fmtShort.format(new Date(v.applied_at as string))}
                      </span>
                    </div>
                    {cat?.disease && (
                      <p className="text-foreground/40 mt-0.5 text-xs">Contra: {cat.disease}</p>
                    )}
                    {v.next_due_at && (
                      <p className="text-foreground/40 mt-0.5 text-xs">
                        Próxima: {fmtShort.format(new Date(v.next_due_at))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Certificados */}
        {certifications.length > 0 && (
          <section className="bg-card border-border space-y-4 rounded-2xl border p-6">
            <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
              <FileCheck className="text-primary h-4 w-4" /> Certificaciones
            </h2>
            <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
              {certifications.map((c) => (
                <li key={c.id} className="bg-muted/10 flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-foreground text-sm font-medium">
                      {CERT_TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    {c.issuer && <p className="text-foreground/40 text-xs">{c.issuer}</p>}
                  </div>
                  <div className="text-right">
                    {isExpired(c.valid_until) ? (
                      <span className="text-destructive inline-flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Vencido
                      </span>
                    ) : isNearExpiry(c.valid_until) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                        <AlertTriangle className="h-3 w-3" /> Por vencer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <ShieldCheck className="h-3 w-3" /> Vigente
                      </span>
                    )}
                    {c.issued_at && (
                      <p className="text-foreground/40 mt-0.5 text-xs">
                        {fmtShort.format(new Date(c.issued_at))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Producción de leche */}
        {milkTotal > 0 && (
          <section className="bg-card border-border rounded-2xl border p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <Milk className="text-primary h-6 w-6" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">{milkTotal.toFixed(1)} L</p>
                <p className="text-foreground/50 text-xs">Producción últimos 30 días</p>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <p className="text-foreground/30 pb-4 text-center text-xs">
          Esta ficha es pública y generada automáticamente por el sistema de trazabilidad de Finca
          El Progreso.
        </p>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-muted/30 border-border rounded-xl border p-3">
      <p className="text-foreground/50 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-foreground mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
