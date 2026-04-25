import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface CTAStat {
  readonly value: string;
  readonly label: string;
}

interface CTASectionProps {
  readonly title: string;
  readonly highlightedTitle?: string;
  readonly description: string;
  readonly badge?: string | null;
  readonly primaryLabel?: string;
  readonly secondaryLabel?: string;
  readonly trustSignals?: readonly string[];
  readonly stats?: readonly CTAStat[];
}

const DEFAULT_TRUST_SIGNALS: readonly string[] = [
  "Sin tarjeta de crédito",
  "Setup en 5 minutos",
  "Soporte en español",
  "Cancela cuando quieras",
];

const DEFAULT_STATS: readonly CTAStat[] = [
  { value: "+15%", label: "valor del hato" },
  { value: "100%", label: "registros inmutables" },
  { value: "<5min", label: "tiempo de setup" },
  { value: "24/7", label: "acceso a tus datos" },
];

const DEFAULT_BADGE = "Sin compromiso · Demo gratuita";

export default function CTASection({
  title,
  highlightedTitle,
  description,
  badge = DEFAULT_BADGE,
  primaryLabel = "Solicitar Demo",
  secondaryLabel,
  trustSignals = DEFAULT_TRUST_SIGNALS,
  stats = DEFAULT_STATS,
}: CTASectionProps) {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0">
        <Image src="/home/cta.png" alt="" fill sizes="100vw" className="object-cover" />
        <div className="from-background/95 via-background/85 to-primary/60 absolute inset-0 bg-linear-to-br" />
        <div className="bg-primary/25 absolute top-1/4 -left-20 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-secondary/20 absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          {badge && (
            <div className="mb-6 flex justify-center">
              <div className="border-primary/30 bg-primary/10 inline-flex items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md">
                <span className="bg-secondary relative inline-flex h-2 w-2 rounded-full">
                  <span className="bg-secondary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                </span>
                <span className="text-foreground/90 text-sm font-medium">{badge}</span>
              </div>
            </div>
          )}

          <h2 className="text-foreground mb-6 text-center text-4xl leading-[1.05] font-bold tracking-tight md:text-6xl lg:text-7xl">
            {title}
            {highlightedTitle && (
              <>
                <br />
                <span className="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
                  {highlightedTitle}
                </span>
              </>
            )}
          </h2>

          <p className="text-foreground/70 mx-auto mb-10 max-w-2xl text-center text-lg md:text-xl">
            {description}
          </p>

          <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="group bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 hover:shadow-primary/60 rounded-xl px-8 py-4 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
              <span className="flex items-center justify-center gap-2">
                {primaryLabel}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            {secondaryLabel && (
              <button className="group border-border bg-background/60 text-foreground hover:border-primary/60 hover:bg-background rounded-xl border px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all">
                {secondaryLabel}
              </button>
            )}
          </div>

          {trustSignals.length > 0 && (
            <div className="text-foreground/70 mb-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
              {trustSignals.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {stats.length > 0 && (
            <div className="bg-card/50 border-border grid grid-cols-2 gap-6 rounded-2xl border p-8 backdrop-blur-md md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="from-primary to-secondary bg-linear-to-r bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="text-foreground/60 mt-1 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
