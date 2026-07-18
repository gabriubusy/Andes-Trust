import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import { variantStyles, type Variant } from "@/lib/variants";
import { Mail, Phone, MapPin, Clock, MessageSquare, type LucideIcon } from "lucide-react";

interface ContactItem {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  lines: string[];
}

const contactItems: ContactItem[] = [
  {
    icon: Mail,
    variant: "primary",
    title: "Email",
    lines: ["contacto@andestrust.com", "soporte@andestrust.com"],
  },
  {
    icon: Phone,
    variant: "secondary",
    title: "Teléfono",
    lines: ["+58 274 123 4567", "+58 274 123 4568"],
  },
  {
    icon: MapPin,
    variant: "accent",
    title: "Dirección",
    lines: ["Av. Principal, Edificio Tecnológico", "Mérida, Venezuela 5101"],
  },
  {
    icon: Clock,
    variant: "primary",
    title: "Horario",
    lines: ["Lunes - Viernes: 8:00 AM - 6:00 PM", "Sábado: 9:00 AM - 1:00 PM"],
  },
];

const quickFaqs = [
  {
    q: "¿Cuánto tiempo tardan en responder?",
    a: "Respondemos a todas las consultas dentro de 24 horas hábiles. Para urgencias, puedes llamarnos directamente.",
  },
  {
    q: "¿Ofrecen demostraciones gratuitas?",
    a: "Sí, ofrecemos demostraciones gratuitas para ganaderos interesados. Contáctanos para agendar una.",
  },
  {
    q: "¿Tienen soporte técnico?",
    a: "Sí, ofrecemos soporte técnico a través de email, teléfono y chat en nuestro horario de atención.",
  },
];

export default function ContactoPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: MessageSquare, label: "Estamos aquí para ayudarte" }}
          title="Hablemos"
          titleAccent="de tu ganadería"
          description="Contáctanos por cualquier medio y te responderemos lo antes posible"
        />

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-5">
            {/* Contact info */}
            <div className="lg:col-span-2">
              <h2 className="text-foreground mb-3 text-2xl font-bold tracking-tight">
                Información de contacto
              </h2>
              <p className="text-foreground/70 mb-8 text-sm leading-relaxed">
                Puedes contactarnos a través de cualquiera de estos medios. Estamos disponibles de
                lunes a viernes.
              </p>

              <div className="space-y-5">
                {contactItems.map((item) => {
                  const v = variantStyles[item.variant];
                  return (
                    <div key={item.title} className="flex items-start gap-4">
                      <div
                        className={`${v.bgSoft} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}
                      >
                        <item.icon className={`${v.text} h-5 w-5`} />
                      </div>
                      <div>
                        <h3 className="text-card-foreground mb-1 text-sm font-semibold">
                          {item.title}
                        </h3>
                        {item.lines.map((line) => (
                          <p key={line} className="text-foreground/70 text-sm">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact form */}
            <div className="bg-card border-border rounded-2xl border p-6 shadow-sm md:p-8 lg:col-span-3">
              <h2 className="text-foreground mb-6 text-2xl font-bold tracking-tight">
                Envíanos un mensaje
              </h2>
              <ContactForm />
            </div>
          </div>
        </section>

        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-foreground mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">
                Preguntas rápidas
              </h2>
              <div className="space-y-3">
                {quickFaqs.map((faq) => (
                  <div
                    key={faq.q}
                    className="bg-card border-border hover:border-primary/30 rounded-xl border p-6 transition-colors"
                  >
                    <h3 className="text-card-foreground mb-2 font-semibold">{faq.q}</h3>
                    <p className="text-foreground/70 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
