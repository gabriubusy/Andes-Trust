import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import { Users, Target, Award, Heart, MapPin, Mail, Phone, type LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
}

interface TeamMember {
  name: string;
  role: string;
  desc: string;
  variant: Variant;
}

const pillars: Pillar[] = [
  {
    icon: Target,
    variant: "primary",
    title: "Misión",
    desc: "Modernizar la ganadería andina con tecnología blockchain de punta",
  },
  {
    icon: Award,
    variant: "secondary",
    title: "Visión",
    desc: "Ser líderes en trazabilidad ganadera en Latinoamérica",
  },
  {
    icon: Heart,
    variant: "accent",
    title: "Valores",
    desc: "Transparencia, seguridad e innovación constante",
  },
];

const team: TeamMember[] = [
  {
    name: "Carlos Méndez",
    role: "CEO & Fundador",
    desc: "Experto en blockchain con 10+ años en tecnología financiera",
    variant: "primary",
  },
  {
    name: "María Rodríguez",
    role: "CTO",
    desc: "Ingeniera de software especializada en sistemas distribuidos",
    variant: "secondary",
  },
  {
    name: "José Torres",
    role: "Director de Operaciones",
    desc: "Especialista en gestión agrícola y desarrollo rural",
    variant: "accent",
  },
];

export default function NosotrosPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: Heart, label: "Sobre nosotros" }}
          title="Transformamos la"
          titleAccent="ganadería andina"
          description="Conoce al equipo detrás de Andes Trust y nuestra misión de modernizar la ganadería en los Andes"
        />

        {/* Mission pillars */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Nuestra misión
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg leading-relaxed">
                Empoderar a los ganaderos de los Andes venezolanos con tecnología blockchain,
                proporcionando herramientas seguras y transparentes para el registro y gestión de
                hatos.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => {
                const v = variantStyles[pillar.variant];
                return (
                  <div
                    key={pillar.title}
                    className="group bg-card border-border hover:border-primary/40 rounded-2xl border p-7 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`${v.bgSoft} ${v.bgHover} mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors`}
                    >
                      <pillar.icon className={`${v.text} h-7 w-7`} />
                    </div>
                    <h3 className="text-card-foreground mb-2 text-xl font-bold">{pillar.title}</h3>
                    <p className="text-foreground/70 text-sm leading-relaxed">{pillar.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-foreground mb-8 text-center text-3xl font-bold tracking-tight md:text-4xl">
                Nuestra historia
              </h2>
              <div className="text-foreground/70 space-y-5 text-base leading-relaxed">
                <p>
                  Nacimos en Mérida, Venezuela, con la visión de transformar la ganadería
                  tradicional mediante tecnología blockchain. Fundados por un equipo apasionado por
                  la innovación y el desarrollo rural.
                </p>
                <p>
                  Creemos que la trazabilidad inmutable puede mejorar el valor comercial del ganado,
                  reducir fraudes y abrir puertas a mercados que exigen certificación verificable de
                  origen.
                </p>
                <p>
                  Trabajamos para apoyar a la comunidad ganadera de la región andina con
                  herramientas modernas, seguras y accesibles desde cualquier dispositivo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Nuestro equipo
              </h2>
              <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                Un equipo multidisciplinario apasionado por la tecnología y el desarrollo rural
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {team.map((member) => {
                const v = variantStyles[member.variant];
                return (
                  <div
                    key={member.name}
                    className="group bg-card border-border hover:border-primary/40 rounded-2xl border p-7 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`bg-linear-to-br ${v.gradient} ${v.shadow} mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg`}
                    >
                      <Users className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-card-foreground mb-1 text-lg font-bold">{member.name}</h3>
                    <p className={`${v.text} mb-3 text-sm font-semibold`}>{member.role}</p>
                    <p className="text-foreground/60 text-sm leading-relaxed">{member.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="container mx-auto px-4 pb-20">
          <div className="bg-card border-border mx-auto max-w-4xl rounded-3xl border p-8 md:p-10">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-10">
              <div className="bg-primary/10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl">
                <MapPin className="text-primary h-10 w-10" />
              </div>
              <div className="flex-1">
                <h2 className="text-foreground mb-4 text-2xl font-bold tracking-tight">
                  Nuestra sede
                </h2>
                <div className="space-y-2 text-sm">
                  <p className="text-foreground/80 flex items-start gap-2">
                    <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <span>Av. Principal, Edificio Tecnológico, Mérida, Venezuela</span>
                  </p>
                  <p className="text-foreground/80 flex items-center gap-2">
                    <Mail className="text-primary h-4 w-4 shrink-0" />
                    <span>contacto@andestrust.com</span>
                  </p>
                  <p className="text-foreground/80 flex items-center gap-2">
                    <Phone className="text-primary h-4 w-4 shrink-0" />
                    <span>+58 274 123 4567</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <CTASection
          title="¿Quieres ser parte del equipo?"
          description="Estamos siempre buscando talento apasionado por la tecnología y el desarrollo rural"
          primaryLabel="Ver Vacantes"
          secondaryLabel="Contactar"
        />
      </main>

      <Footer />
    </div>
  );
}
