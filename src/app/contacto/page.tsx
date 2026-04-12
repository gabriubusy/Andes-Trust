"use client";

import { Mail, Phone, MapPin, Send, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ContactoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Hero Section */}
      <section className="bg-slate-50 py-20 md:py-32 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-foreground mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Contacto
          </h1>
          <p className="text-foreground/70 mx-auto max-w-2xl text-lg md:text-xl">
            Estamos aquí para ayudarte. Contáctanos y responderemos lo antes posible.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          {/* Contact Info */}
          <div>
            <h2 className="text-foreground mb-6 text-3xl font-bold">Información de Contacto</h2>
            <p className="text-foreground/70 mb-8">
              Puedes contactarnos a través de cualquiera de estos medios. Estamos disponibles de
              lunes a viernes.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Mail className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-1 text-lg font-semibold">Email</h3>
                  <p className="text-foreground/70">contacto@andestrust.com</p>
                  <p className="text-foreground/70">soporte@andestrust.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-secondary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Phone className="text-secondary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-1 text-lg font-semibold">Teléfono</h3>
                  <p className="text-foreground/70">+58 274 123 4567</p>
                  <p className="text-foreground/70">+58 274 123 4568</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-accent/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <MapPin className="text-accent h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-1 text-lg font-semibold">Dirección</h3>
                  <p className="text-foreground/70">Av. Principal, Edificio Tecnológico</p>
                  <p className="text-foreground/70">Mérida, Venezuela 5101</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Clock className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-1 text-lg font-semibold">Horario</h3>
                  <p className="text-foreground/70">Lunes - Viernes: 8:00 AM - 6:00 PM</p>
                  <p className="text-foreground/70">Sábado: 9:00 AM - 1:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border-border rounded-xl border p-6 shadow-lg md:p-8">
            <h2 className="text-foreground mb-6 text-2xl font-bold">Envíanos un Mensaje</h2>
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-card-foreground mb-2 block text-sm font-medium">
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-card-foreground mb-2 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-card-foreground mb-2 block text-sm font-medium">
                  Asunto
                </label>
                <input
                  type="text"
                  placeholder="Asunto de tu mensaje"
                  className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-card-foreground mb-2 block text-sm font-medium">
                  Mensaje
                </label>
                <textarea
                  placeholder="Escribe tu mensaje aquí..."
                  className="border-border bg-background text-foreground focus:ring-primary min-h-[150px] w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                />
              </div>

              <button className="text-primary-foreground bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-8 py-3 text-lg font-medium transition-colors">
                <Send className="h-5 w-5" />
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto rounded-3xl bg-slate-50 px-4 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-foreground mb-6 text-center text-3xl font-bold md:text-4xl">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-4">
            <div className="bg-card border-border rounded-xl border p-6">
              <h3 className="text-card-foreground mb-2 text-lg font-semibold">
                ¿Cuánto tiempo tardan en responder?
              </h3>
              <p className="text-foreground/70">
                Respondemos a todas las consultas dentro de 24 horas hábiles. Para urgencias, puedes
                llamarnos directamente.
              </p>
            </div>
            <div className="bg-card border-border rounded-xl border p-6">
              <h3 className="text-card-foreground mb-2 text-lg font-semibold">
                ¿Ofrecen demostraciones gratuitas?
              </h3>
              <p className="text-foreground/70">
                Sí, ofrecemos demostraciones gratuitas para ganaderos interesados. Contáctanos para
                agendar una.
              </p>
            </div>
            <div className="bg-card border-border rounded-xl border p-6">
              <h3 className="text-card-foreground mb-2 text-lg font-semibold">
                ¿Tienen soporte técnico?
              </h3>
              <p className="text-foreground/70">
                Sí, ofrecemos soporte técnico 24/7 para todos nuestros usuarios a través de email,
                teléfono y chat.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
