"use client";

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Calendar,
  Clock,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Leaf,
  Database,
  Globe,
  Heart,
} from "lucide-react";

const articles = [
  {
    slug: "blockchain-ganaderia-futuro",
    title: "Por qué la blockchain es el futuro de la ganadería",
    excerpt:
      "Descubre cómo la tecnología blockchain está transformando la trazabilidad ganadera y por qué los compradores internacionales exigen certificados digitales.",
    category: "Tecnología",
    categoryColor: "primary",
    date: "10 abril 2026",
    readTime: "5 min",
    image: "/blog/blockchain.jpg",
    featured: true,
  },
  {
    slug: "registro-animales-app",
    title: "Cómo registrar tu ganado en 3 pasos con la app móvil",
    excerpt:
      "Una guía práctica para registrar animales usando tu teléfono móvil. Escanea aretes RFID o ingresa datos manualmente.",
    category: "Tutorial",
    categoryColor: "secondary",
    date: "8 abril 2026",
    readTime: "4 min",
    image: "/blog/app.jpg",
    featured: false,
  },
  {
    slug: "trazabilidad-aumenta-valor",
    title: "Cómo la trazabilidad aumenta el valor de tu ganado",
    excerpt:
      "Estudios demuestras que animales con registro blockchain se venden hasta 15% más caro. Conoce los datos.",
    category: "Negocios",
    categoryColor: "accent",
    date: "5 abril 2026",
    readTime: "6 min",
    image: "/blog/valor.jpg",
    featured: false,
  },
  {
    slug: "normativa-exportacion-ganado",
    title: "Requisitos para exportar ganado a Colombia y países andinos",
    excerpt:
      "Todo lo que necesitas saber sobre certificados de trazabilidad y requisitos legales para exportar tu ganado.",
    category: "Legal",
    categoryColor: "primary",
    date: "3 abril 2026",
    readTime: "8 min",
    image: "/blog/export.jpg",
    featured: false,
  },
  {
    slug: "rfid-ganaderia",
    title: "Todo sobre aretes RFID para ganado",
    excerpt:
      "Guía completa sobre los tipos de aretes RFID, lectores compatibles y cómo integrarlos con tu sistema de gestión.",
    category: "Tecnología",
    categoryColor: "secondary",
    date: "1 abril 2026",
    readTime: "7 min",
    image: "/blog/rfid.jpg",
    featured: false,
  },
  {
    slug: "smart-contracts-ganaderia",
    title: "Smart contracts: automatiza ventas de ganado",
    excerpt:
      "Cómo usar contratos inteligentes para automatizar pagos y transferencias de propiedad al vender tu ganado.",
    category: "Tecnología",
    categoryColor: "accent",
    date: "28 marzo 2026",
    readTime: "6 min",
    image: "/blog/contracts.jpg",
    featured: false,
  },
  // CUIDADO DEL GANADO
  {
    slug: "vacunas-ganado-calendario",
    title: "Calendario de vacunas para ganado bovino",
    excerpt:
      "Todo lo que necesitas saber sobre las vacunas esenciales, fechas y protocolos para mantener tu hato saludable.",
    category: "Cuidado",
    categoryColor: "primary",
    date: "11 abril 2026",
    readTime: "8 min",
    image: "/blog/vacunas.jpg",
    featured: false,
  },
  {
    slug: "nutricion-ganado",
    title: "Guía de nutrición para ganado bovino",
    excerpt:
      "Aprende sobre los requerimientos nutricionales, tipos de alimentos y cómo optimizar la alimentación de tu hato.",
    category: "Cuidado",
    categoryColor: "secondary",
    date: "9 abril 2026",
    readTime: "10 min",
    image: "/blog/nutricion.jpg",
    featured: false,
  },
  {
    slug: "atencion-parto",
    title: "Atención al parto en ganado bovino",
    excerpt:
      "Guía completa para asistir el parto, cuidar al ternero recién nacido y prevenir complicaciones.",
    category: "Cuidado",
    categoryColor: "accent",
    date: "7 abril 2026",
    readTime: "7 min",
    image: "/blog/parto.jpg",
    featured: false,
  },
  {
    slug: "parasitos-ganado",
    title: "Control de parásitos en ganado bovino",
    excerpt:
      "Aprende a identificar, prevenir y tratar las principales parasitosis que afectan al ganado.",
    category: "Cuidado",
    categoryColor: "primary",
    date: "6 abril 2026",
    readTime: "8 min",
    image: "/blog/parasitos.jpg",
    featured: false,
  },
  {
    slug: "manejo-pasto",
    title: "Manejo integrado del pasto para ganadería",
    excerpt:
      "Técnicas de manejo del pasto para maximizar la producción forrajera y la capacidad de carga.",
    category: "Cuidado",
    categoryColor: "secondary",
    date: "4 abril 2026",
    readTime: "9 min",
    image: "/blog/pasto.jpg",
    featured: false,
  },
  {
    slug: "suplementacion-ganado",
    title: "Suplementación estratégica en época seca",
    excerpt:
      "Aprende a planificar la suplementación para mantener la productividad durante la época seca.",
    category: "Cuidado",
    categoryColor: "accent",
    date: "2 abril 2026",
    readTime: "6 min",
    image: "/blog/suplementacion.jpg",
    featured: false,
  },
];

const categories = [
  { name: "Todos", icon: Zap, color: "primary" },
  { name: "Tecnología", icon: Database, color: "primary" },
  { name: "Negocios", icon: TrendingUp, color: "secondary" },
  { name: "Legal", icon: Shield, color: "accent" },
  { name: "Tutorial", icon: Users, color: "primary" },
  { name: "Cuidado", icon: Heart, color: "secondary" },
];

export default function BlogPage() {
  const featuredArticle = articles.find((a) => a.featured);
  const regularArticles = articles.filter((a) => !a.featured);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 z-0">
            <Image src="/home/hero-home.png" alt="" fill priority className="object-cover" />
            <div className="from-background/80 via-background/60 to-background/90 absolute inset-0 bg-gradient-to-b" />
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
              <Zap className="h-4 w-4" />
              <span>Blog</span>
            </div>
            <h1 className="text-foreground mb-6 text-5xl font-bold md:text-6xl lg:text-7xl">
              Noticias y Artículos
            </h1>
            <p className="text-foreground/70 mx-auto max-w-2xl text-xl">
              Aprende sobre trazabilidad ganadera, tecnología blockchain y tendencias del sector
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          {featuredArticle && (
            <div className="mx-auto max-w-6xl">
              <div className="mb-8">
                <span className="text-primary text-sm font-semibold tracking-wider uppercase">
                  Artículo Destacado
                </span>
              </div>
              <Link
                href={`/blog/${featuredArticle.slug}`}
                className="group bg-card border-border hover:border-primary/40 relative overflow-hidden rounded-2xl border transition-all hover:shadow-2xl"
              >
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="relative h-64 overflow-hidden md:h-full">
                    <div className="bg-primary/10 absolute inset-0 flex items-center justify-center">
                      <Shield className="text-primary/30 h-20 w-20" />
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          featuredArticle.categoryColor === "primary"
                            ? "bg-primary/10 text-primary"
                            : featuredArticle.categoryColor === "secondary"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-accent/10 text-accent"
                        }`}
                      >
                        {featuredArticle.category}
                      </span>
                    </div>
                    <h2 className="text-card-foreground group-hover:text-primary mb-3 text-2xl font-bold transition-colors md:text-3xl">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-foreground/70 mb-6">{featuredArticle.excerpt}</p>
                    <div className="text-foreground/50 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {featuredArticle.date}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {featuredArticle.readTime} lectura
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </section>

        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                      i === 0
                        ? "bg-primary text-white"
                        : "bg-card border-border text-foreground/70 hover:border-primary/40 border"
                    }`}
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {regularArticles.map((article, i) => (
                  <Link
                    key={i}
                    href={`/blog/${article.slug}`}
                    className="group bg-card border-border hover:border-primary/40 flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <div className="bg-primary/5 absolute inset-0 flex items-center justify-center">
                        {article.category === "Tecnología" ? (
                          <Database className="text-primary/30 h-12 w-12" />
                        ) : article.category === "Negocios" ? (
                          <TrendingUp className="text-secondary/30 h-12 w-12" />
                        ) : (
                          <Shield className="text-accent/30 h-12 w-12" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            article.categoryColor === "primary"
                              ? "bg-primary/10 text-primary"
                              : article.categoryColor === "secondary"
                                ? "bg-secondary/10 text-secondary"
                                : "bg-accent/10 text-accent"
                          }`}
                        >
                          {article.category}
                        </span>
                      </div>
                      <h3 className="text-card-foreground group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-foreground/70 mb-4 line-clamp-2 flex-1 text-sm">
                        {article.excerpt}
                      </p>
                      <div className="border-border mt-auto flex items-center justify-between border-t pt-4">
                        <span className="text-foreground/50 text-sm">{article.date}</span>
                        <span className="text-primary flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                          Leer <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="bg-muted mx-auto max-w-4xl rounded-3xl p-8 text-center md:p-12">
            <div className="bg-secondary/10 text-secondary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
              <Leaf className="h-4 w-4" />
              <span>Newsletter</span>
            </div>
            <h2 className="text-foreground mb-4 text-3xl font-bold">
              ¿Quieres recibir nuestras noticias?
            </h2>
            <p className="text-foreground/70 mb-8">
              Suscríbete para recibir artículos, consejos y novedades sobre trazabilidad ganadera
            </p>
            <form className="flex flex-col gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Tu correo electrónico"
                className="border-border bg-background text-foreground focus:ring-primary flex-1 rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
              />
              <button className="text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-6 py-3 font-medium whitespace-nowrap transition-colors">
                Suscribirse
              </button>
            </form>
          </div>
        </section>

        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0">
            <Image src="/home/cta.png" alt="" fill className="object-cover" />
            <div className="from-primary/90 via-primary/70 to-primary/90 absolute inset-0 bg-gradient-to-r" />
          </div>

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md md:p-16">
              <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
                ¿Tienes un tema para proponer?
              </h2>
              <p className="mb-10 text-xl text-white/90">
                Envíanos tus sugerencias de temas que te gustaría leer en nuestro blog
              </p>
              <Link
                href="/contacto"
                className="text-primary hover:shadow-3xl relative inline-block overflow-hidden rounded-2xl bg-white px-10 py-5 text-xl font-bold shadow-2xl transition-all hover:scale-105"
              >
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
