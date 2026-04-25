import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import {
  Shield,
  Lock,
  Key,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Server,
  type LucideIcon,
} from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
}

interface Feature {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
  bullets: string[];
}

interface Compliance {
  name: string;
  desc: string;
  variant: Variant;
}

const pillars: Pillar[] = [
  {
    icon: Lock,
    variant: "primary",
    title: "Encriptación",
    desc: "AES-256 de extremo a extremo",
  },
  {
    icon: Shield,
    variant: "secondary",
    title: "Blockchain",
    desc: "Registros inmutables",
  },
  {
    icon: Key,
    variant: "accent",
    title: "Autenticación",
    desc: "Multi-factor y biométrica",
  },
  {
    icon: Eye,
    variant: "primary",
    title: "Monitoreo",
    desc: "24/7 vigilancia activa",
  },
];

const features: Feature[] = [
  {
    icon: Server,
    variant: "primary",
    title: "Infraestructura Segura",
    desc: "Servidores en centros de datos certificados con redundancia geográfica y backups automáticos diarios.",
    bullets: [
      "Certificación ISO 27001",
      "Redundancia geográfica",
      "Backups automáticos",
      "Disaster recovery plan",
    ],
  },
  {
    icon: Fingerprint,
    variant: "secondary",
    title: "Autenticación Avanzada",
    desc: "Sistema multi-factor con opciones biométricas y tokens de seguridad.",
    bullets: ["Autenticación 2FA", "Biometría facial", "Tokens hardware", "SSO empresarial"],
  },
  {
    icon: Lock,
    variant: "accent",
    title: "Encriptación de Datos",
    desc: "Todos los datos encriptados en reposo y en tránsito con estándares militares.",
    bullets: [
      "AES-256 en reposo",
      "TLS 1.3 en tránsito",
      "Encriptación de campos",
      "Rotación automática de claves",
    ],
  },
  {
    icon: AlertTriangle,
    variant: "primary",
    title: "Monitoreo y Alertas",
    desc: "Detección de intrusiones y respuesta automática a amenazas.",
    bullets: [
      "SIEM integrado",
      "Análisis de comportamiento",
      "Alertas en tiempo real",
      "Respuesta automática",
    ],
  },
];

const compliance: Compliance[] = [
  {
    name: "GDPR",
    desc: "Cumplimos con el Reglamento General de Protección de Datos de la UE.",
    variant: "primary",
  },
  {
    name: "ISO 27001",
    desc: "Certificados en gestión de seguridad de la información.",
    variant: "secondary",
  },
  {
    name: "SOC 2 Type II",
    desc: "Auditoría anual de controles de seguridad, disponibilidad e integridad.",
    variant: "accent",
  },
  {
    name: "HIPAA",
    desc: "Estándares de privacidad y seguridad para datos sensibles.",
    variant: "primary",
  },
];

export default function SeguridadPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: Shield, label: "Seguridad de nivel enterprise" }}
          title="Tu información"
          titleAccent="siempre protegida"
          description="Tu información y la de tu hato están protegidas con los más altos estándares de seguridad"
        />

        {/* Pillars */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Nuestro compromiso de seguridad
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Múltiples capas de seguridad para proteger tus datos y garantizar la integridad de
                cada registro en la blockchain.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pillars.map((pillar) => {
                const v = variantStyles[pillar.variant];
                return (
                  <div
                    key={pillar.title}
                    className="group bg-card border-border hover:border-primary/40 rounded-2xl border p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`${v.bgSoft} ${v.bgHover} mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors`}
                    >
                      <pillar.icon className={`${v.text} h-7 w-7`} />
                    </div>
                    <h3 className="text-card-foreground mb-2 text-lg font-bold">{pillar.title}</h3>
                    <p className="text-foreground/70 text-sm">{pillar.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-foreground mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">
                Características de seguridad
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                {features.map((feature) => {
                  const v = variantStyles[feature.variant];
                  return (
                    <div
                      key={feature.title}
                      className="bg-card border-border hover:border-primary/30 rounded-2xl border p-6 transition-colors md:p-7"
                    >
                      <div className="flex items-start gap-5">
                        <div
                          className={`${v.bgSoft} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl`}
                        >
                          <feature.icon className={`${v.text} h-6 w-6`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-card-foreground mb-2 text-lg font-bold">
                            {feature.title}
                          </h3>
                          <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                            {feature.desc}
                          </p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {feature.bullets.map((bullet) => (
                              <li
                                key={bullet}
                                className="text-foreground/60 flex items-center gap-2 text-xs"
                              >
                                <span
                                  className={`${v.text.replace("text-", "bg-")} h-1 w-1 rounded-full`}
                                />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Cumplimiento normativo
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Cumplimos con las regulaciones internacionales de protección de datos y seguridad
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {compliance.map((item) => {
                const v = variantStyles[item.variant];
                return (
                  <div
                    key={item.name}
                    className="bg-card border-border hover:border-primary/30 flex items-start gap-4 rounded-2xl border p-6 transition-colors"
                  >
                    <CheckCircle2 className={`${v.text} mt-0.5 h-6 w-6 shrink-0`} />
                    <div>
                      <h3 className="text-card-foreground mb-1 text-lg font-bold">{item.name}</h3>
                      <p className="text-foreground/70 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <CTASection
          title="¿Preguntas sobre"
          highlightedTitle="seguridad?"
          description="Nuestro equipo de seguridad está disponible para responder cualquier consulta sobre nuestras prácticas"
          badge="Respuesta en menos de 24h"
          primaryLabel="Contactar Seguridad"
          trustSignals={[
            "Cifrado end-to-end",
            "Auditorías periódicas",
            "Cumplimiento ISO",
            "Reporta vulnerabilidades",
          ]}
          stats={[]}
        />
      </main>

      <Footer />
    </div>
  );
}
