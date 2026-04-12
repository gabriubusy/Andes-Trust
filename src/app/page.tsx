"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  Users,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Globe,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header variant="transparent" />

      <main className="flex-1">
        <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-16">
          <div
            className="absolute inset-0 z-0"
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
          >
            <img src="/home/hero-home.png" alt="" className="h-full w-full object-cover" />
            <div className="from-background/80 via-background/60 to-background/90 absolute inset-0 bg-gradient-to-b" />
            <div className="from-primary/5 to-secondary/5 absolute inset-0 bg-gradient-to-r via-transparent" />
            <svg
              className="text-foreground/5 absolute right-0 bottom-0 left-0 h-32 w-full"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="currentColor"
                fillOpacity="0.1"
                d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ></path>
            </svg>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC0yNHYtMmgtMnYzem0tMzQgMjR2MmgtMnYtMmgyem0zNC0yNHYzdi0ySCAyMHYyem0tMzQgMjR2MmgtMnYtMmgyeiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9zdmc+')] opacity-30" />
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <div className="bg-primary/10 absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl" />
            <div
              className="bg-secondary/10 absolute right-1/4 bottom-1/3 h-96 w-96 animate-pulse rounded-full blur-3xl"
              style={{ animationDelay: "1s" }}
            />
          </div>

          <div className="relative z-20 container mx-auto px-4 py-20 text-center">
            <div className="mx-auto max-w-5xl">
              <div className="animate-fade-in border-primary/30 bg-primary/10 mb-8 inline-flex items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="bg-secondary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                  <span className="bg-secondary relative inline-flex h-2 w-2 rounded-full"></span>
                </span>
                <span className="text-foreground/90 text-sm font-medium">
                  Tecnología blockchain para tu ganado
                </span>
              </div>

              <h1 className="text-foreground animate-slide-up mb-8 text-5xl leading-tight font-bold tracking-tight md:text-6xl lg:text-8xl">
                El futuro del registro
                <br />
                <span className="from-primary via-primary to-secondary bg-gradient-to-r bg-clip-text text-transparent">
                  ganadero andino
                </span>
              </h1>
              <p
                className="text-foreground/70 animate-slide-up mx-auto mb-10 max-w-2xl text-xl md:text-2xl"
                style={{ animationDelay: "0.1s" }}
              >
                Transforma tu hato con tecnología de ponta. Registro immutable, trazabilidad
                completa y contratos inteligentes en la nube de los Andes.
              </p>

              <div
                className="animate-slide-up flex flex-col justify-center gap-5 sm:flex-row"
                style={{ animationDelay: "0.2s" }}
              >
                <button className="group from-primary to-primary/90 shadow-primary/25 hover:shadow-primary/40 relative overflow-hidden rounded-2xl bg-gradient-to-r px-10 py-5 text-xl font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                  <span className="relative z-10 flex items-center gap-3">
                    Comenzar Ahora
                    <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                </button>
                <button className="group border-primary/30 bg-background/50 text-foreground hover:border-primary/60 hover:bg-primary/5 relative overflow-hidden rounded-2xl border-2 px-10 py-5 text-xl font-semibold backdrop-blur-sm transition-all">
                  <span className="flex items-center gap-3">
                    Ver Demo
                    <Globe className="h-6 w-6 transition-transform group-hover:rotate-12" />
                  </span>
                </button>
              </div>

              <div
                className="animate-fade-in mt-20 grid grid-cols-2 gap-6 md:grid-cols-4"
                style={{ animationDelay: "0.4s" }}
              >
                {[
                  {
                    number: "500+",
                    label: "Ganaderos activos",
                    icon: Users,
                    colorClass: "text-primary",
                  },
                  {
                    number: "10K+",
                    label: "Animales registrados",
                    icon: TrendingUp,
                    colorClass: "text-secondary",
                  },
                  { number: "99.9%", label: "Uptime", icon: Shield, colorClass: "text-accent" },
                  { number: "24/7", label: "Soporte", icon: Wallet, colorClass: "text-foreground" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="group bg-card/60 border-border hover:border-primary/40 hover:bg-card relative overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className={`absolute -right-4 -bottom-4 h-24 w-24 ${stat.colorClass}/5 transition-transform group-hover:scale-150 group-hover:${stat.colorClass}/10`}
                    >
                      <stat.icon className="h-full w-full" />
                    </div>
                    <div className="relative">
                      <div className={`${stat.colorClass} text-4xl font-bold md:text-5xl`}>
                        {stat.number}
                      </div>
                      <div className="text-foreground/60 mt-1 text-sm">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
                <Zap className="h-4 w-4" />
                <span>Potencia tu gestión</span>
              </div>
              <h2 className="text-foreground mb-4 text-4xl font-bold md:text-5xl">
                Todo lo que tu hato necesita
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Herramientas potentes para gestionar tu ganado con tecnología de última generación
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Database,
                  color: "primary",
                  title: "Registro Digital",
                  desc: "Captura toda la info de tu ganado: nacimientos, vacunas, peso y más. Desde tu celular.",
                  feature: "Offline-first",
                },
                {
                  icon: Lock,
                  color: "secondary",
                  title: "Blockchain Seguro",
                  desc: "Cada registro es inmutable. Protegido contramanipulaciones para siempre.",
                  feature: "Cryptographically verified",
                },
                {
                  icon: TreePine,
                  color: "accent",
                  title: "Trazabilidad Total",
                  desc: "Rastrea el historial completo desde el nacimiento hasta la venta.",
                  feature: "Certificado de origen",
                },
                {
                  icon: Mountain,
                  color: "primary",
                  title: "Smart Contracts",
                  desc: "Automatiza transacciones con contratos inteligentes y transparentes.",
                  feature: "Sin intermediarios",
                },
                {
                  icon: Smartphone,
                  color: "secondary",
                  title: "App Móvil",
                  desc: "Accede a toda la info desde cualquier lugar.",
                  feature: "iOS & Android",
                },
                {
                  icon: BarChart3,
                  color: "accent",
                  title: "Análisis & Reportes",
                  desc: "Dashboards con insights para mejores decisiones.",
                  feature: "Export PDF/Excel",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group border-border bg-card hover:border-primary/40 relative overflow-hidden rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div
                    className={`absolute -top-8 -right-8 h-32 w-32 rounded-full ${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/5 transition-all duration-500 group-hover:${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/15 group-hover:scale-150`}
                  />
                  <div
                    className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/10 transition-all duration-300 group-hover:${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/20 group-hover:scale-110`}
                  >
                    <item.icon
                      className={`${item.color === "primary" ? "text-primary" : item.color === "secondary" ? "text-secondary" : "text-accent"} h-8 w-8`}
                    />
                  </div>
                  <h3 className="text-card-foreground mb-3 text-2xl font-bold">{item.title}</h3>
                  <p className="text-foreground/70 mb-4 text-base leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}`}
                    />
                    <span className="text-primary text-sm font-medium">{item.feature}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-muted py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-16 text-center">
                <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
                  <span className="font-semibold">4</span>
                  <span>pasos simples</span>
                </div>
                <h2 className="text-foreground mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
                  En minutos estás listo
                </h2>
                <p className="text-foreground/70 mx-auto max-w-xl text-lg">
                  Sin complicaciones. Sin papel. Sin trámites interminables.
                </p>
              </div>

              <div className="relative">
                <div className="from-primary via-secondary to-accent absolute top-0 bottom-0 left-8 w-0.5 bg-gradient-to-b md:top-1/2 md:right-0 md:bottom-auto md:left-0 md:h-0.5 md:w-full" />

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      step: 1,
                      colorClass: "from-primary to-primary/80",
                      shadowColor: "shadow-primary/30",
                      glowClass: "from-primary/20 to-secondary/20",
                      itemColor: "primary",
                      title: "Crea tu cuenta",
                      desc: "Solo email y datos de tu finca. En menos de 2 minutos.",
                      icon: Zap,
                    },
                    {
                      step: 2,
                      colorClass: "from-secondary to-secondary/80",
                      shadowColor: "shadow-secondary/30",
                      glowClass: "from-secondary/20 to-accent/20",
                      itemColor: "secondary",
                      title: "Registra tu ganado",
                      desc: "Escanea el arete RFID o ingresa datos manualmente.",
                      icon: Database,
                    },
                    {
                      step: 3,
                      colorClass: "from-accent to-accent/80",
                      shadowColor: "shadow-accent/30",
                      glowClass: "from-accent/20 to-primary/20",
                      itemColor: "accent",
                      title: "Monitorea todo",
                      desc: "Peso, vacunas, tratamientos. Todo en tiempo real.",
                      icon: TrendingUp,
                    },
                    {
                      step: 4,
                      colorClass: "from-primary to-primary/80",
                      shadowColor: "shadow-primary/30",
                      glowClass: "from-primary/20 to-secondary/20",
                      itemColor: "primary",
                      title: "Vende con confianza",
                      desc: "Tu comprador recibe el historial completo e immutable.",
                      icon: Shield,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group relative"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    >
                      <div className="bg-card border-border hover:border-primary/30 relative overflow-hidden rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                        <div className="relative mb-6">
                          <div
                            className={`absolute -inset-4 rounded-full bg-gradient-to-br ${item.glowClass} opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100 group-hover:blur-2xl`}
                          />
                          <div
                            className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${item.colorClass} text-4xl font-black text-white shadow-xl ${item.shadowColor}`}
                          >
                            {item.step}
                            <item.icon className="absolute -right-2 -bottom-2 h-5 w-5 text-white/80" />
                          </div>
                        </div>

                        <h3 className="text-card-foreground mb-3 text-2xl font-bold">
                          {item.title}
                        </h3>
                        <p className="text-foreground/70 text-base leading-relaxed">{item.desc}</p>

                        <div
                          className={`absolute -top-4 -right-4 h-24 w-24 rounded-full ${item.itemColor === "primary" ? "bg-primary" : item.itemColor === "secondary" ? "bg-secondary" : "bg-accent"}/5 opacity-0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-100`}
                        />
                      </div>

                      {i < 3 && (
                        <div className="text-primary/30 absolute top-1/2 -right-4 hidden -translate-y-1/2 md:block lg:-right-6">
                          <ArrowRight className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="border-primary/20 bg-primary/5 inline-flex items-center gap-3 rounded-full border px-6 py-3 backdrop-blur-sm">
                  <Zap className="text-primary h-5 w-5" />
                  <span className="text-foreground/80">Tiempo total de setup:</span>
                  <span className="text-primary font-bold">Menos de 5 minutos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl shadow-2xl">
            <img
              src="/home/freepik_natural-hand-holding-mode_2768078433.png"
              alt="Ganaderos de los Andes"
              className="h-56 w-full object-cover md:h-72"
            />
            <div className="from-background/80 via-background/20 absolute inset-0 bg-gradient-to-t to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-5 md:p-7">
              <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                {[
                  { number: "15+", label: "Años", color: "text-primary" },
                  { number: "100%", label: "Trazabilidad", color: "text-secondary" },
                  { number: "50+", label: "Fincas", color: "text-accent" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`${stat.color} text-2xl font-bold md:text-3xl`}>
                      {stat.number}
                    </div>
                    <div className="text-xs text-white/80">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="bg-muted/50 mx-auto max-w-4xl rounded-3xl p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="order-2 md:order-1">
                <img
                  src="/home/blockchain.png"
                  alt="Tecnología Blockchain"
                  className="w-full rounded-2xl shadow-xl"
                />
              </div>
              <div className="order-1 text-center md:order-2 md:text-left">
                <h3 className="text-foreground mb-4 text-2xl font-bold md:text-3xl">
                  Tecnología Blockchain
                </h3>
                <p className="text-foreground/70 mb-6 text-base">
                  Cada registro de tu ganado queda protegido en una red descentralizada e inmutable.
                  Transparente, seguro y verificable.
                </p>
                <ul className="text-foreground/70 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-5 w-5" />
                    <span>Registro inmutable</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-5 w-5" />
                    <span>Transparencia total</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary h-5 w-5" />
                    <span>Verificación criptográfica</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <div className="bg-secondary/10 text-secondary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>Beneficios reales</span>
              </div>
              <h2 className="text-foreground mb-4 text-4xl font-bold md:text-5xl">
                Más valor para tu ganado
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Cientos de ganaderos ya disfrutan de los beneficios
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: TrendingUp,
                  color: "primary",
                  title: "Mayor Valor Comercial",
                  desc: "Tu ganado con registro blockchain vale más en el mercado. Trazabilidad = confianza.",
                  highlight: "+15% valor",
                },
                {
                  icon: Shield,
                  color: "secondary",
                  title: "Cero Fraudes",
                  desc: "Documentos inmutables. Imposible falsificar.",
                  highlight: "100% seguro",
                },
                {
                  icon: FileCheck,
                  color: "accent",
                  title: "Cumplimiento Legal",
                  desc: "Facilita inspections y trámites.",
                  highlight: "API certified",
                },
                {
                  icon: Globe,
                  color: "primary",
                  title: "Mercados Internacionales",
                  desc: "Abre puertas a compradores globales.",
                  highlight: "Export ready",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group border-border bg-card hover:border-primary/40 relative overflow-hidden rounded-2xl border p-8 transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`absolute -top-4 -right-4 h-24 w-24 rounded-full ${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/5 blur-2xl transition-all group-hover:${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/15`}
                  />
                  <div className="relative flex items-start gap-5">
                    <div
                      className={`flex-shrink-0 ${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/10 group-hover:${item.color === "primary" ? "bg-primary" : item.color === "secondary" ? "bg-secondary" : "bg-accent"}/20 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors`}
                    >
                      <item.icon
                        className={`${item.color === "primary" ? "text-primary" : item.color === "secondary" ? "text-secondary" : "text-accent"} h-7 w-7`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="text-card-foreground text-xl font-bold">{item.title}</h3>
                        <span
                          className={`text-xs font-medium ${item.color === "primary" ? "text-primary" : item.color === "secondary" ? "text-secondary" : "text-accent"}`}
                        >
                          {item.highlight}
                        </span>
                      </div>
                      <p className="text-foreground/70 text-base">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0">
            <img src="/home/cta.png" alt="" className="h-full w-full object-cover" />
            <div className="from-primary/90 via-primary/70 to-primary/90 absolute inset-0 bg-gradient-to-r" />
          </div>

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md md:p-16">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                <span>Sin compromiso</span>
              </div>
              <h2 className="mb-4 text-4xl font-bold text-white md:text-6xl">
                ¿Listo para el futuro?
              </h2>
              <p className="mb-10 text-xl text-white/90">
                Únete a los ganaderos que ya transforman su negocio con tecnología
              </p>
              <div className="flex flex-col justify-center gap-5 sm:flex-row">
                <button className="group text-primary hover:shadow-3xl relative overflow-hidden rounded-2xl bg-white px-10 py-5 text-xl font-bold shadow-2xl transition-all hover:scale-105">
                  <span className="relative z-10 flex items-center gap-3">
                    Crear Cuenta Gratis
                    <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                <button className="rounded-2xl border-2 border-white/30 bg-white/10 px-10 py-5 text-xl font-semibold text-white transition-all hover:bg-white/20">
                  Contactar Ventas
                </button>
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-10 text-white/90">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold">+500</div>
                    <div className="text-sm text-white/70">Ganaderos</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold">5 min</div>
                    <div className="text-sm text-white/70">Setup</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold">100%</div>
                    <div className="text-sm text-white/70">Seguro</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
