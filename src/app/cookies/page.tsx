import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import {
  Cookie,
  Ban,
  WifiOff,
  SlidersHorizontal,
  Lock,
  BarChart3,
  HelpCircle,
  Settings2,
  HardDrive,
  Bell,
  RefreshCw,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const CONTACT_EMAIL = "privacidad@andestrust.com";

const cookieTypes: {
  name: string;
  icon: LucideIcon;
  required: boolean;
  examples: string[];
  desc: string;
}[] = [
  {
    name: "Cookies Esenciales",
    icon: Lock,
    required: true,
    examples: ["Sesión de usuario", "Token de autenticación", "Preferencias de tema"],
    desc: "Son imprescindibles para el funcionamiento básico de la Plataforma. Sin ellas no es posible autenticarse ni navegar por el panel. No pueden desactivarse.",
  },
  {
    name: "Cookies Funcionales",
    icon: SlidersHorizontal,
    required: false,
    examples: ["Finca seleccionada", "Idioma preferido", "Configuración de vista"],
    desc: "Recuerdan sus preferencias para ofrecerle una experiencia personalizada. Su desactivación puede limitar algunas funciones de conveniencia.",
  },
  {
    name: "Cookies Analíticas",
    icon: BarChart3,
    required: false,
    examples: ["Páginas visitadas", "Tiempo de sesión", "Errores encontrados"],
    desc: "Nos ayudan a entender cómo se usa la Plataforma para mejorarla. Los datos se tratan de forma agregada y anónima. Nunca identifican a usuarios individuales.",
  },
];

type Section = { id: string; num: number; title: string; icon: LucideIcon; body: string };

const sections: Section[] = [
  {
    id: "que-son",
    num: 2,
    title: "¿Qué son las cookies?",
    icon: HelpCircle,
    body: `Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo al visitarlos. Permiten que el sitio recuerde sus acciones y preferencias durante un período de tiempo, para que no tenga que volver a introducirlos cada vez que vuelva al sitio o navegue de una página a otra.`,
  },
  {
    id: "como-usamos",
    num: 3,
    title: "¿Cómo usamos las cookies?",
    icon: Settings2,
    body: `Utilizamos cookies propias para gestionar la sesión, guardar preferencias y analizar el uso de la Plataforma. No utilizamos cookies de terceros con fines publicitarios ni compartimos datos de cookies con redes de publicidad.`,
  },
  {
    id: "almacenamiento",
    num: 4,
    title: "Almacenamiento Local (localStorage / IndexedDB)",
    icon: HardDrive,
    body: `Además de cookies, la Plataforma utiliza almacenamiento local del navegador (localStorage e IndexedDB) para habilitar la funcionalidad offline. Esto le permite registrar datos sin conexión a internet. Estos datos se sincronizan con el servidor al recuperar la conectividad y se eliminan del dispositivo al cerrar sesión.`,
  },
  {
    id: "push",
    num: 5,
    title: "Notificaciones Push",
    icon: Bell,
    body: `Si acepta recibir notificaciones, su dispositivo almacena localmente una suscripción push. Esta suscripción se usa exclusivamente para enviarle alertas de la Plataforma (vencimientos de vacunas, alertas sanitarias). Puede revocar este permiso desde la configuración de su navegador en cualquier momento.`,
  },
  {
    id: "gestion",
    num: 6,
    title: "Gestión de Cookies",
    icon: SlidersHorizontal,
    body: `Puede controlar y eliminar cookies desde la configuración de su navegador. Tenga en cuenta que desactivar las cookies esenciales impedirá el uso normal de la Plataforma. Para más información sobre cómo gestionar cookies en su navegador, consulte la ayuda oficial de Chrome, Firefox, Safari o Edge.`,
  },
  {
    id: "actualizacion",
    num: 7,
    title: "Actualización de esta Política",
    icon: RefreshCw,
    body: `Podemos actualizar esta política periódicamente para reflejar cambios en nuestras prácticas. Le notificaremos cualquier cambio significativo mediante aviso en la Plataforma o por correo electrónico.`,
  },
];

const toc = [{ id: "tipos", num: 1, title: "Tipos de cookies que usamos" }, ...sections];

const highlights: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Ban,
    title: "Sin publicidad",
    desc: "No usamos cookies de terceros con fines publicitarios.",
  },
  {
    icon: Cookie,
    title: "Solo cookies propias",
    desc: "Sesión, preferencias y analítica anónima.",
  },
  {
    icon: WifiOff,
    title: "Funciona sin conexión",
    desc: "localStorage e IndexedDB para registrar offline.",
  },
  {
    icon: SlidersHorizontal,
    title: "Control total",
    desc: "Gestiónalas o elimínalas desde tu navegador.",
  },
];

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          badge={{ icon: Cookie, label: "Legal", variant: "accent" }}
          title="Política de"
          titleAccent="Cookies"
          description="Última actualización: enero de 2025. Información sobre cómo usamos cookies y almacenamiento local."
        />

        {/* Puntos clave */}
        <section className="container mx-auto max-w-6xl px-4 pt-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-card/50 border-border hover:border-secondary/40 rounded-2xl border p-5 backdrop-blur-sm transition-colors"
              >
                <div className="bg-secondary/10 text-secondary mb-3 flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-foreground text-sm font-semibold">{title}</h3>
                <p className="text-foreground/60 mt-1 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Índice + Contenido */}
        <section className="container mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Índice lateral */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 self-start">
                <p className="text-foreground/50 mb-4 text-xs font-semibold tracking-wider uppercase">
                  Contenido
                </p>
                <nav className="space-y-1">
                  {toc.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="group text-foreground/65 hover:bg-muted/60 hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      <span className="bg-muted text-foreground/50 group-hover:bg-primary group-hover:text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors">
                        {s.num}
                      </span>
                      <span className="leading-tight">{s.title}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Contenido */}
            <div className="min-w-0 space-y-5">
              {/* Tipos de cookies */}
              <article
                id="tipos"
                className="bg-card/50 border-border scroll-mt-28 rounded-2xl border p-6 backdrop-blur-sm md:p-8"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Cookie className="h-5 w-5" />
                  </div>
                  <h2 className="text-foreground text-lg font-bold tracking-tight md:text-xl">
                    <span className="text-primary/70">1.</span> Tipos de cookies que usamos
                  </h2>
                </div>

                <div className="space-y-4">
                  {cookieTypes.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.name} className="border-border bg-muted/30 rounded-xl border p-5">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="bg-secondary/10 text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="text-foreground font-semibold">{c.name}</h3>
                          {c.required ? (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                              Necesaria
                            </span>
                          ) : (
                            <span className="bg-muted text-foreground/60 rounded-full px-2 py-0.5 text-xs font-medium">
                              Opcional
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/70 mb-3 text-sm leading-relaxed">{c.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {c.examples.map((ex) => (
                            <span
                              key={ex}
                              className="bg-card text-foreground/60 border-border rounded-lg border px-3 py-1 text-xs"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Secciones de texto */}
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <article
                    key={s.id}
                    id={s.id}
                    className="bg-card/50 border-border scroll-mt-28 rounded-2xl border p-6 backdrop-blur-sm md:p-8"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-foreground text-lg font-bold tracking-tight md:text-xl">
                        <span className="text-primary/70">{s.num}.</span> {s.title}
                      </h2>
                    </div>
                    <p className="text-foreground/70 leading-relaxed">{s.body}</p>
                  </article>
                );
              })}

              {/* CTA de contacto */}
              <div className="from-primary/10 to-secondary/10 border-primary/20 mt-2 rounded-2xl border bg-linear-to-br p-7 text-center md:p-9">
                <div className="bg-primary/15 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  ¿Preguntas sobre cookies?
                </h3>
                <p className="text-foreground/70 mx-auto mt-2 max-w-md text-sm leading-relaxed">
                  Si tienes cualquier duda sobre nuestra política de cookies, escríbenos y te
                  ayudamos.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:shadow-xl"
                >
                  {CONTACT_EMAIL}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
