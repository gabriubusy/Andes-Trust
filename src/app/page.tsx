import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { variantStyles, type Variant } from "@/lib/variants";
import {
  Shield,
  TreePine,
  Mountain,
  Lock,
  Zap,
  CheckCircle2,
  Smartphone,
  Database,
  BarChart3,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Globe,
  type LucideIcon,
} from "lucide-react";

const services: {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
  feature: string;
}[] = [
  {
    icon: Database,
    variant: "primary",
    title: "Registro Digital",
    desc: "Captura toda la información de tu ganado: nacimientos, vacunas, peso y más. Desde tu celular.",
    feature: "Offline-first",
  },
  {
    icon: Lock,
    variant: "secondary",
    title: "Blockchain Seguro",
    desc: "Cada registro es inmutable. Protegido contra manipulaciones para siempre.",
    feature: "Verificación criptográfica",
  },
  {
    icon: TreePine,
    variant: "accent",
    title: "Trazabilidad Total",
    desc: "Rastrea el historial completo desde el nacimiento hasta la venta.",
    feature: "Certificado de origen",
  },
  {
    icon: Mountain,
    variant: "primary",
    title: "Smart Contracts",
    desc: "Automatiza transacciones con contratos inteligentes y transparentes.",
    feature: "Sin intermediarios",
  },
  {
    icon: Smartphone,
    variant: "secondary",
    title: "Acceso Multiplataforma",
    desc: "Accede a toda la información desde cualquier dispositivo.",
    feature: "Web responsiva",
  },
  {
    icon: BarChart3,
    variant: "accent",
    title: "Análisis & Reportes",
    desc: "Dashboards con insights para mejores decisiones.",
    feature: "Exportar PDF/Excel",
  },
];

const steps: { title: string; desc: string; icon: LucideIcon; variant: Variant }[] = [
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

const benefits: {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
  highlight: string;
}[] = [
  {
    icon: TrendingUp,
    variant: "primary",
    title: "Mayor Valor Comercial",
    desc: "Tu ganado con registro blockchain vale más en el mercado. Trazabilidad igual a confianza.",
    highlight: "+15% valor",
  },
  {
    icon: Shield,
    variant: "secondary",
    title: "Cero Fraudes",
    desc: "Documentos inmutables. Imposible falsificar.",
    highlight: "100% seguro",
  },
  {
    icon: FileCheck,
    variant: "accent",
    title: "Cumplimiento Legal",
    desc: "Facilita inspecciones y trámites.",
    highlight: "Certificado",
  },
  {
    icon: Globe,
    variant: "primary",
    title: "Mercados Internacionales",
    desc: "Abre puertas a compradores globales.",
    highlight: "Export ready",
  },
];

const heroPillars: { title: string; desc: string; icon: LucideIcon; variant: Variant }[] = [
  {
    title: "Inmutable",
    desc: "Registros que no se pueden alterar",
    icon: Lock,
    variant: "primary",
  },
  {
    title: "Trazable",
    desc: "Historial completo del nacimiento a la venta",
    icon: TreePine,
    variant: "secondary",
  },
  {
    title: "Verificable",
    desc: "Cualquiera puede comprobar el origen",
    icon: Shield,
    variant: "accent",
  },
  {
    title: "Sin papel",
    desc: "Todo digital, accesible y organizado",
    icon: FileCheck,
    variant: "primary",
  },
];

export default function Home() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header variant="transparent" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex min-h-[85vh] items-center overflow-hidden pt-16">
          <div className="absolute inset-0 z-0">
            <Image
              src="/home/hero-home.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="from-background/90 via-background/70 to-background absolute inset-0 bg-linear-to-b" />
            <div className="bg-primary/10 absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-3xl" />
          </div>

          <div className="relative z-20 container mx-auto px-4 py-20 text-center">
            <div className="mx-auto max-w-5xl">
              <div className="animate-fade-in border-primary/30 bg-primary/10 mb-8 inline-flex items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md">
                <span className="bg-secondary relative inline-flex h-2 w-2 rounded-full" />
                <span className="text-foreground/90 text-sm font-medium">
                  Tecnología blockchain para tu ganado
                </span>
              </div>

              <h1 className="text-foreground animate-slide-up mb-6 text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl lg:text-7xl">
                El futuro del registro
                <br />
                <span className="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
                  ganadero andino
                </span>
              </h1>
              <p
                className="text-foreground/70 animate-slide-up mx-auto mb-10 max-w-2xl text-lg md:text-xl"
                style={{ animationDelay: "0.1s" }}
              >
                Transforma tu hato con tecnología de punta. Registro inmutable, trazabilidad
                completa y contratos inteligentes en la nube de los Andes.
              </p>

              <div
                className="animate-slide-up flex flex-col justify-center gap-4 sm:flex-row"
                style={{ animationDelay: "0.2s" }}
              >
                <button className="group bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 rounded-xl px-8 py-4 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
                  <span className="flex items-center justify-center gap-2">
                    Solicitar Demo
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                <button className="group border-border bg-background/60 text-foreground hover:border-primary/60 hover:bg-background rounded-xl border px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all">
                  <span className="flex items-center justify-center gap-2">
                    Contactar
                    <Globe className="h-5 w-5 transition-transform group-hover:rotate-12" />
                  </span>
                </button>
              </div>

              <div
                className="animate-fade-in mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
                style={{ animationDelay: "0.4s" }}
              >
                {heroPillars.map((pillar, i) => {
                  const v = variantStyles[pillar.variant];
                  return (
                    <div
                      key={i}
                      className="group bg-card/60 border-border hover:border-primary/40 hover:bg-card relative overflow-hidden rounded-xl border p-5 text-left backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div
                        className={`${v.bgSoft} ${v.bgHover} mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors`}
                      >
                        <pillar.icon className={`${v.text} h-5 w-5`} />
                      </div>
                      <div className={`${v.text} text-base font-bold`}>{pillar.title}</div>
                      <div className="text-foreground/60 mt-1 text-xs leading-relaxed">
                        {pillar.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>Potencia tu gestión</span>
              </div>
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
                Todo lo que tu hato necesita
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Herramientas potentes para gestionar tu ganado con tecnología de última generación
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((item, i) => {
                const v = variantStyles[item.variant];
                return (
                  <div
                    key={i}
                    className="group border-border bg-card hover:border-primary/40 relative overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${v.bgSoft} ${v.bgHover} transition-colors`}
                    >
                      <item.icon className={`${v.text} h-7 w-7`} />
                    </div>
                    <h3 className="text-card-foreground mb-2 text-xl font-bold">{item.title}</h3>
                    <p className="text-foreground/70 mb-4 text-base leading-relaxed">{item.desc}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${v.text.replace("text-", "bg-")}`}
                      />
                      <span className={`${v.text} text-sm font-medium`}>{item.feature}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="bg-muted/50 relative overflow-hidden py-20 md:py-28">
          <div className="bg-primary/5 pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-16 text-center">
                <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  <span>Proceso simple</span>
                </div>
                <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
                  En minutos estás listo
                </h2>
                <p className="text-foreground/70 mx-auto max-w-xl text-lg">
                  Sin complicaciones. Sin papel. Sin trámites interminables.
                </p>
              </div>

              <div className="relative">
                {/* Connecting line (desktop) */}
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
                        {/* Icon with step badge */}
                        <div className="relative mb-6">
                          <div
                            className={`bg-card border-border group-hover:border-primary/40 relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl`}
                          >
                            <item.icon className={`${v.text} h-9 w-9`} />
                          </div>
                          <div
                            className={`bg-linear-to-br ${v.gradient} absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ${v.shadow}`}
                          >
                            {i + 1}
                          </div>
                        </div>

                        {/* Content card */}
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

        {/* Blockchain highlight */}
        <section className="container mx-auto px-4 py-16">
          <div className="bg-muted/50 mx-auto max-w-5xl rounded-3xl p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="order-2 md:order-1">
                <Image
                  src="/home/blockchain.png"
                  alt="Tecnología Blockchain"
                  width={600}
                  height={400}
                  className="w-full rounded-2xl shadow-xl"
                />
              </div>
              <div className="order-1 md:order-2">
                <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                  <Lock className="h-4 w-4" />
                  <span>Tecnología</span>
                </div>
                <h3 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Blockchain al servicio del campo
                </h3>
                <p className="text-foreground/70 mb-6 text-base leading-relaxed">
                  Cada registro de tu ganado queda protegido en una red descentralizada e inmutable.
                  Transparente, seguro y verificable.
                </p>
                <ul className="space-y-3">
                  {["Registro inmutable", "Transparencia total", "Verificación criptográfica"].map(
                    (item) => (
                      <li
                        key={item}
                        className="text-foreground/80 flex items-center gap-3 text-base"
                      >
                        <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <div className="bg-secondary/10 text-secondary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>Beneficios reales</span>
              </div>
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
                Más valor para tu ganado
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Lo que ganas al registrar tu hato con trazabilidad blockchain
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {benefits.map((item, i) => {
                const v = variantStyles[item.variant];
                return (
                  <div
                    key={i}
                    className="group border-border bg-card hover:border-primary/40 relative overflow-hidden rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${v.bgSoft} ${v.bgHover} transition-colors`}
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
                        <p className="text-foreground/70 text-base">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="contacto" className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0">
            <Image src="/home/cta.png" alt="" fill sizes="100vw" className="object-cover" />
            <div className="from-primary/95 to-primary/80 absolute inset-0 bg-linear-to-br" />
          </div>

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md md:p-14">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                <span>Sin compromiso</span>
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
                ¿Listo para el futuro?
              </h2>
              <p className="mb-10 text-lg text-white/90 md:text-xl">
                Da el siguiente paso hacia una ganadería trazable, transparente y verificable.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button className="group text-primary rounded-xl bg-white px-8 py-4 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
                  <span className="flex items-center justify-center gap-2">
                    Solicitar Demo
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                <button className="rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20">
                  Contactar
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
