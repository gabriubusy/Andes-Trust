import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import {
  Zap,
  Database,
  TrendingUp,
  Shield,
  CheckCircle2,
  Smartphone,
  FileCheck,
  Globe,
  type LucideIcon,
} from "lucide-react";

interface Step {
  title: string;
  desc: string;
  icon: LucideIcon;
  variant: Variant;
}

interface Requirement {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
}

const steps: Step[] = [
  {
    title: "Crea tu cuenta",
    desc: "Solo email y datos de tu finca. En menos de 2 minutos.",
    icon: Zap,
    variant: "primary",
  },
  {
    title: "Registra tu ganado",
    desc: "Escanea el arete RFID o ingresa datos manualmente.",
    icon: Database,
    variant: "secondary",
  },
  {
    title: "Monitorea todo",
    desc: "Peso, vacunas, tratamientos. Todo en tiempo real.",
    icon: TrendingUp,
    variant: "accent",
  },
  {
    title: "Vende con confianza",
    desc: "Tu comprador recibe el historial completo e inmutable.",
    icon: Shield,
    variant: "primary",
  },
];

const requirements: Requirement[] = [
  {
    icon: Smartphone,
    variant: "primary",
    title: "Teléfono o Tablet",
    desc: "Con cámara para escanear aretes RFID o capturar fotos",
  },
  {
    icon: FileCheck,
    variant: "secondary",
    title: "Datos de tu ganado",
    desc: "Lista de animales con aretes o identificadores",
  },
  {
    icon: Globe,
    variant: "accent",
    title: "Conexión a internet",
    desc: "Móvil o WiFi para sincronizar datos",
  },
];

const perks = [
  "Registro digital de animales",
  "Historial blockchain inmutable",
  "Acceso desde cualquier dispositivo",
  "Sincronización offline",
  "Dashboard de análisis",
  "Certificados de trazabilidad",
];

export default function ComoFuncionaPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: Zap, label: "4 pasos simples" }}
          title="En minutos"
          titleAccent="estás listo"
          description="Sin complicaciones. Sin papel. Sin trámites interminables."
        />

        {/* Steps */}
        <section className="bg-muted/50 relative overflow-hidden py-20 md:py-28">
          <div className="bg-primary/5 pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="relative">
                <div className="from-primary/0 via-primary/30 to-primary/0 pointer-events-none absolute top-10 right-8 left-8 hidden h-px bg-linear-to-r lg:block" />

                <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {steps.map((item, i) => {
                    const v = variantStyles[item.variant];
                    const stepNumber = String(i + 1).padStart(2, "0");
                    return (
                      <div
                        key={i}
                        className="group relative flex flex-col items-center text-center"
                      >
                        <div className="relative mb-6">
                          <div className="bg-card border-border group-hover:border-primary/40 relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                            <item.icon className={`${v.text} h-9 w-9`} />
                          </div>
                          <div
                            className={`bg-linear-to-br ${v.gradient} absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ${v.shadow}`}
                          >
                            {i + 1}
                          </div>
                        </div>

                        <div className="bg-card border-border group-hover:border-primary/20 flex w-full flex-1 flex-col rounded-2xl border p-6 transition-all duration-300 group-hover:shadow-lg">
                          <div
                            className={`${v.text} mb-2 text-xs font-semibold tracking-widest uppercase`}
                          >
                            Paso {stepNumber}
                          </div>
                          <h3 className="text-card-foreground mb-2 text-lg font-bold">
                            {item.title}
                          </h3>
                          <p className="text-foreground/70 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-14 text-center">
                <div className="border-primary/20 bg-card/50 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 backdrop-blur-sm">
                  <Zap className="text-primary h-4 w-4" />
                  <span className="text-foreground/80 text-sm">Tiempo total de setup:</span>
                  <span className="text-primary text-sm font-bold">Menos de 5 minutos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Lo que necesitas para empezar
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Solo estas cosas simples para comenzar a transformar tu ganadería
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {requirements.map((item) => {
                const v = variantStyles[item.variant];
                return (
                  <div
                    key={item.title}
                    className="group bg-card border-border hover:border-primary/40 rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`${v.bgSoft} ${v.bgHover} mb-5 flex h-14 w-14 items-center justify-center rounded-xl transition-colors`}
                    >
                      <item.icon className={`${v.text} h-7 w-7`} />
                    </div>
                    <h3 className="text-card-foreground mb-2 text-lg font-bold">{item.title}</h3>
                    <p className="text-foreground/70 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Perks */}
        <section className="container mx-auto px-4 py-16">
          <div className="bg-muted/50 mx-auto max-w-4xl rounded-3xl p-8 md:p-10">
            <div className="mb-8 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                ¿Qué obtienes al registrarte?
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {perks.map((perk) => (
                <div
                  key={perk}
                  className="bg-card border-border flex items-center gap-3 rounded-xl border p-4"
                >
                  <CheckCircle2 className="text-secondary h-5 w-5 shrink-0" />
                  <span className="text-foreground text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTASection
          title="¿Comenzamos?"
          description="En menos de 5 minutos puedes tener tu cuenta activa y registrar tu primer animal"
          primaryLabel="Solicitar Demo"
          secondaryLabel="Contactar"
        />
      </main>

      <Footer />
    </div>
  );
}
