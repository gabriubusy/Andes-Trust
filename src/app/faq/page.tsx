"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import { ChevronDown, HelpCircle, Shield, Smartphone, type LucideIcon } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: Readonly<FAQItemProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card border-border hover:border-primary/30 overflow-hidden rounded-xl border transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-card-foreground text-base font-semibold">{question}</span>
        <ChevronDown
          className={`text-foreground/60 h-5 w-5 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-foreground/70 px-5 pb-5 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

interface Category {
  category: string;
  icon: LucideIcon;
  variant: Variant;
  questions: { q: string; a: string }[];
}

const faqCategories: Category[] = [
  {
    category: "General",
    icon: HelpCircle,
    variant: "primary",
    questions: [
      {
        q: "¿Qué es Finca El Progreso?",
        a: "Finca El Progreso es una plataforma de trazabilidad ganadera basada en tecnología blockchain. Permite registrar, gestionar y certificar el historial de tu ganado de manera segura e inmutable.",
      },
      {
        q: "¿Por qué usar blockchain para mi ganado?",
        a: "La blockchain garantiza que cada registro sea inmutable y verificable. Esto significa que nadie puede modificar o falsificar los datos, generando confianza total en la trazabilidad de tu ganado.",
      },
      {
        q: "¿Necesito conocimientos técnicos?",
        a: "No, Finca El Progreso está diseñado para ser intuitivo y fácil de usar. Solo necesitas un teléfono o tablet para comenzar a registrar tu ganado.",
      },
    ],
  },
  {
    category: "Seguridad",
    icon: Shield,
    variant: "secondary",
    questions: [
      {
        q: "¿Mis datos están seguros?",
        a: "Sí, usamos encriptación AES-256 y arquitectura blockchain para garantizar la seguridad e inmutabilidad de tus datos. Además, cumplimos con GDPR, ISO 27001 y SOC 2.",
      },
      {
        q: "¿Qué pasa si pierdo mi teléfono?",
        a: "Tus datos están almacenados en la nube, no en el dispositivo. Puedes iniciar sesión desde cualquier dispositivo y seguirás teniendo acceso a toda tu información.",
      },
      {
        q: "¿Quién puede ver mis datos?",
        a: "Solo tú y las personas que autorices pueden ver tus datos privados. Los certificados de trazabilidad que generes serán públicos pero no revelarán información sensible.",
      },
      {
        q: "¿Es legal usar estos certificados?",
        a: "Sí, nuestros certificados cumplen con las normativas locales e internacionales de trazabilidad ganadera. Son aceptados por autoridades y compradores nacionales e internacionales.",
      },
    ],
  },
  {
    category: "Uso",
    icon: Smartphone,
    variant: "accent",
    questions: [
      {
        q: "¿Qué necesito para comenzar?",
        a: "Solo necesitas un correo electrónico y información básica de tu finca. Puedes empezar a registrar animales inmediatamente desde nuestra app web o móvil.",
      },
      {
        q: "¿Necesito internet todo el tiempo?",
        a: "No, nuestra app funciona sin conexión. Los datos se sincronizan cuando tengas conexión a internet.",
      },
      {
        q: "¿Cómo registro un animal?",
        a: "Puedes registrar animales escaneando el arete RFID con la cámara de tu teléfono o ingresando los datos manualmente. Cada animal queda asignado a tu cuenta de forma segura.",
      },
      {
        q: "¿Puedo importar datos que ya tengo?",
        a: "Sí, puedes importar datos desde archivos Excel o CSV. También podemos ayudarte con la migración de otros sistemas.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: HelpCircle, label: "Ayuda" }}
          title="Preguntas"
          titleAccent="frecuentes"
          description="Respuestas a las dudas más comunes sobre Finca El Progreso"
        />

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl">
            {faqCategories.map((category) => {
              const v = variantStyles[category.variant];
              return (
                <div key={category.category} className="mb-12 last:mb-0">
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className={`${v.bgSoft} flex h-10 w-10 items-center justify-center rounded-xl`}
                    >
                      <category.icon className={`${v.text} h-5 w-5`} />
                    </div>
                    <h2 className="text-foreground text-xl font-bold tracking-tight md:text-2xl">
                      {category.category}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {category.questions.map((faq) => (
                      <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-muted/50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                ¿No encontraste lo que buscas?
              </h2>
              <p className="text-foreground/70 mb-8 text-lg">
                Nuestro equipo de soporte está listo para ayudarte
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/contacto"
                  className="text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Contactar Soporte
                </Link>
                <Link
                  href="/como-funciona"
                  className="border-border text-foreground hover:border-primary hover:bg-primary/5 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Solicitar Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <CTASection
          title="¿Resolvemos"
          highlightedTitle="tu duda?"
          description="Crea tu cuenta gratis y descubre cómo transformar tu ganadería"
          primaryLabel="Solicitar Demo"
          secondaryLabel="Contactar"
        />
      </main>

      <Footer />
    </div>
  );
}
