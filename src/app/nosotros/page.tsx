"use client";

import { Users, Target, Award, Heart, MapPin } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NosotrosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Hero Section */}
      <section className="bg-slate-50 py-20 md:py-32 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-foreground mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Sobre Nosotros
          </h1>
          <p className="text-foreground/70 mx-auto max-w-2xl text-lg md:text-xl">
            Conoce al equipo detrás de Andes Trust y nuestra misión de transformar la ganadería en
            los Andes
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mb-6 text-3xl font-bold md:text-4xl">Nuestra Misión</h2>
          <p className="text-foreground/70 mb-8 text-lg">
            Empoderar a los ganaderos de los Andes venezolanos con tecnología blockchain,
            proporcionando herramientas seguras y transparentes para el registro y gestión de hatos,
            mejorando la trazabilidad y el valor comercial del ganado.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Target className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Misión</h3>
              <p className="text-foreground/70 text-sm">
                Modernizar la ganadería andina con tecnología de punta
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Award className="text-secondary h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Visión</h3>
              <p className="text-foreground/70 text-sm">
                Ser líderes en trazabilidad ganadera en Latinoamérica
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Heart className="text-accent h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Valores</h3>
              <p className="text-foreground/70 text-sm">
                Transparencia, seguridad e innovación constante
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto rounded-3xl bg-slate-50 px-4 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-foreground mb-6 text-center text-3xl font-bold md:text-4xl">
            Nuestra Historia
          </h2>
          <div className="text-foreground/70 space-y-6">
            <p>
              Andes Trust nació en 2023 en Mérida, Venezuela, con la visión de transformar la
              ganadería tradicional mediante tecnología blockchain. Fundado por un equipo de
              apasionados por la innovación y el desarrollo rural.
            </p>
            <p>
              Comenzamos como un pequeño proyecto piloto con 20 ganaderos locales, demostrando cómo
              la tecnología blockchain podía mejorar la trazabilidad y el valor comercial del
              ganado. Los resultados fueron extraordinarios: reducción de fraudes, mejor
              cumplimiento normativo y acceso a nuevos mercados.
            </p>
            <p>
              Hoy, somos más de 500 ganaderos activos en toda la región andina, con más de 10,000
              animales registrados en nuestra plataforma. Continuamos innovando y expandiendo
              nuestros servicios para apoyar a la comunidad ganadera venezolana.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-foreground mb-6 text-center text-3xl font-bold md:text-4xl">
            Nuestro Equipo
          </h2>
          <p className="text-foreground/70 mx-auto mb-12 max-w-2xl text-center text-lg">
            Un equipo multidisciplinario apasionado por la tecnología y el desarrollo rural
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-primary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                <Users className="text-primary h-10 w-10" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Carlos Méndez</h3>
              <p className="text-foreground/70 mb-2">CEO & Fundador</p>
              <p className="text-foreground/60 text-sm">
                Experto en blockchain con 10+ años en tecnología financiera
              </p>
            </div>
            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-secondary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                <Users className="text-secondary h-10 w-10" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">María Rodríguez</h3>
              <p className="text-foreground/70 mb-2">CTO</p>
              <p className="text-foreground/60 text-sm">
                Ingeniera de software especializada en sistemas distribuidos
              </p>
            </div>
            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-accent/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                <Users className="text-accent h-10 w-10" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">José Torres</h3>
              <p className="text-foreground/70 mb-2">Director de Operaciones</p>
              <p className="text-foreground/60 text-sm">
                Especialista en gestión agrícola y desarrollo rural
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-card border-border mx-auto max-w-4xl rounded-2xl border p-8 shadow-lg md:p-12">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-shrink-0">
              <div className="bg-primary/10 flex h-24 w-24 items-center justify-center rounded-full">
                <MapPin className="text-primary h-12 w-12" />
              </div>
            </div>
            <div>
              <h2 className="text-foreground mb-4 text-2xl font-bold md:text-3xl">Nuestra Sede</h2>
              <p className="text-foreground/70 mb-2">
                <strong>Dirección:</strong> Av. Principal, Edificio Tecnológico, Mérida, Venezuela
              </p>
              <p className="text-foreground/70 mb-2">
                <strong>Email:</strong> contacto@andestrust.com
              </p>
              <p className="text-foreground/70">
                <strong>Teléfono:</strong> +58 274 123 4567
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary mx-auto max-w-4xl rounded-2xl p-8 text-center md:p-12">
          <h2 className="text-primary-foreground mb-4 text-3xl font-bold md:text-4xl">
            ¿Quieres Ser Parte de Nuestro Equipo?
          </h2>
          <p className="text-primary-foreground/90 mb-8 text-lg">
            Estamos siempre buscando talentos apasionados por la tecnología y el desarrollo rural.
          </p>
          <button className="text-primary rounded-lg bg-white px-8 py-3 text-lg font-medium shadow-lg transition-colors hover:bg-slate-100">
            Ver Vacantes
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
}
