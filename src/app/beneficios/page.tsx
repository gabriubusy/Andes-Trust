import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import {
  TrendingUp,
  Shield,
  FileCheck,
  Globe,
  DollarSign,
  Clock,
  type LucideIcon,
} from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
  highlight: string;
}

const benefits: Benefit[] = [
  {
    icon: TrendingUp,
    variant: "primary",
    title: "Mayor Valor Comercial",
    desc: "El ganado con registro blockchain genera más confianza en el mercado, y esa confianza se traduce en mejores precios.",
    highlight: "Más valor",
  },
  {
    icon: Shield,
    variant: "secondary",
    title: "Cero Fraudes",
    desc: "Documentos inmutables e imposibles de falsificar. Cada registro queda protegido criptográficamente.",
    highlight: "Registros inmutables",
  },
  {
    icon: FileCheck,
    variant: "accent",
    title: "Cumplimiento Legal",
    desc: "Facilita inspecciones y trámites regulatorios. Cumple con normativas locales e internacionales.",
    highlight: "Normativas al día",
  },
  {
    icon: Globe,
    variant: "primary",
    title: "Mercados Internacionales",
    desc: "Abre puertas a compradores globales que exigen trazabilidad certificada.",
    highlight: "Export ready",
  },
  {
    icon: DollarSign,
    variant: "secondary",
    title: "Mejor Acceso a Crédito",
    desc: "Documenta el valor real de tu hato para acceder a financiamiento con mejores condiciones.",
    highlight: "Valor verificado",
  },
  {
    icon: Clock,
    variant: "accent",
    title: "Ahorro de Tiempo",
    desc: "Elimina el papeleo y las tareas manuales. Todo digitalizado y organizado en un solo lugar.",
    highlight: "Sin papeleo",
  },
];

export default function BeneficiosPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: TrendingUp, label: "Beneficios reales", variant: "secondary" }}
          title="Más valor"
          titleAccent="para tu ganado"
          description="Lo que ganas al registrar tu hato con trazabilidad blockchain"
        />

        {/* Benefits grid */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Beneficios principales
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Cómo la tecnología blockchain transforma tu ganadería
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {benefits.map((item) => {
                const v = variantStyles[item.variant];
                return (
                  <div
                    key={item.title}
                    className="group border-border bg-card hover:border-primary/40 rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className={`${v.bgSoft} ${v.bgHover} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors`}
                      >
                        <item.icon className={`${v.text} h-6 w-6`} />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <h3 className="text-card-foreground text-lg font-bold">{item.title}</h3>
                          <span className={`${v.text} text-xs font-semibold whitespace-nowrap`}>
                            {item.highlight}
                          </span>
                        </div>
                        <p className="text-foreground/70 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <CTASection
          title="¿Listo para empezar?"
          description="Da el siguiente paso hacia una ganadería trazable y verificable"
          primaryLabel="Solicitar Demo"
          secondaryLabel="Contactar"
        />
      </main>

      <Footer />
    </div>
  );
}
