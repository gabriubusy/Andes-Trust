import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import {
  FileText,
  CheckCircle2,
  Boxes,
  UserCircle2,
  ShieldCheck,
  KeyRound,
  Anchor,
  Wifi,
  WifiOff,
  Scale,
  RefreshCw,
  Gavel,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const CONTACT_EMAIL = "legal@andestrust.com";

type Section = {
  id: string;
  num: number;
  title: string;
  icon: LucideIcon;
  body: string;
};

const sections: Section[] = [
  {
    id: "aceptacion",
    num: 1,
    title: "Aceptación de los Términos",
    icon: CheckCircle2,
    body: `Al acceder y utilizar la plataforma Finca El Progreso (en adelante, "la Plataforma"), usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.`,
  },
  {
    id: "servicio",
    num: 2,
    title: "Descripción del Servicio",
    icon: Boxes,
    body: `La Plataforma ofrece un sistema de gestión ganadera con trazabilidad blockchain que permite registrar animales, vacunaciones, tratamientos, pesajes y certificaciones. Los registros se anclan en la red Polygon para garantizar su inmutabilidad e integridad.`,
  },
  {
    id: "registro",
    num: 3,
    title: "Registro y Cuenta de Usuario",
    icon: UserCircle2,
    body: `Para utilizar la Plataforma, deberá crear una cuenta proporcionando información verídica y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas bajo su cuenta. Notifíquenos de inmediato ante cualquier uso no autorizado.`,
  },
  {
    id: "uso-aceptable",
    num: 4,
    title: "Uso Aceptable",
    icon: ShieldCheck,
    body: `Usted se compromete a utilizar la Plataforma únicamente para fines legítimos de gestión ganadera. Está prohibido: (a) introducir datos falsos o fraudulentos; (b) intentar acceder a datos de otras fincas sin autorización; (c) interferir con el funcionamiento de la Plataforma; (d) utilizar la Plataforma para actividades ilegales.`,
  },
  {
    id: "propiedad",
    num: 5,
    title: "Propiedad de los Datos",
    icon: KeyRound,
    body: `Usted conserva todos los derechos sobre los datos ganaderos que ingresa a la Plataforma. Al utilizar el servicio, nos otorga una licencia limitada para procesar dichos datos con el único fin de prestar el servicio. No vendemos ni compartimos sus datos productivos con terceros sin su consentimiento expreso.`,
  },
  {
    id: "blockchain",
    num: 6,
    title: "Registros en Blockchain",
    icon: Anchor,
    body: `Los registros anclados en la blockchain de Polygon son inmutables por naturaleza. Una vez confirmada una transacción, no puede ser modificada ni eliminada. Usted comprende y acepta esta característica como parte inherente del servicio de trazabilidad.`,
  },
  {
    id: "disponibilidad",
    num: 7,
    title: "Disponibilidad del Servicio",
    icon: Wifi,
    body: `Nos esforzamos por mantener la Plataforma disponible las 24 horas. Sin embargo, no garantizamos disponibilidad ininterrumpida. La función offline permite continuar registrando datos sin conexión; la sincronización ocurrirá al restaurarse la conectividad. No somos responsables de pérdidas derivadas de interrupciones del servicio.`,
  },
  {
    id: "responsabilidad",
    num: 8,
    title: "Limitación de Responsabilidad",
    icon: Scale,
    body: `En la medida máxima permitida por la ley aplicable, no seremos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso de la Plataforma. Nuestra responsabilidad total no superará el monto pagado por el servicio en los últimos 12 meses.`,
  },
  {
    id: "modificaciones",
    num: 9,
    title: "Modificaciones",
    icon: RefreshCw,
    body: `Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos los cambios significativos por correo electrónico o mediante aviso en la Plataforma. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos.`,
  },
  {
    id: "ley",
    num: 10,
    title: "Ley Aplicable",
    icon: Gavel,
    body: `Estos Términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier disputa será sometida a los tribunales competentes de Mérida, Venezuela.`,
  },
  {
    id: "contacto",
    num: 11,
    title: "Contacto",
    icon: Mail,
    body: `Para cualquier consulta sobre estos Términos, puede contactarnos en: ${CONTACT_EMAIL} o escribirnos a nuestra dirección en Mérida, Venezuela.`,
  },
];

const highlights: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: KeyRound,
    title: "Tus datos son tuyos",
    desc: "Conservas todos los derechos sobre tu información ganadera.",
  },
  { icon: Boxes, title: "Trazabilidad inmutable", desc: "Registros anclados en la red Polygon." },
  {
    icon: WifiOff,
    title: "Modo sin conexión",
    desc: "Registra offline; sincroniza al reconectar.",
  },
  { icon: Scale, title: "Marco legal claro", desc: "Regido por las leyes de Venezuela." },
];

/** Convierte un cuerpo con enumeraciones "(a) ... (b) ..." en intro + lista. */
function parseBody(body: string): { intro: string; items: string[] } {
  const idx = body.search(/\([a-z]\)/);
  if (idx === -1) return { intro: body, items: [] };
  const intro = body
    .slice(0, idx)
    .trim()
    .replace(/[:.]?\s*$/, ":");
  const items = body
    .slice(idx)
    .split(/\s*\([a-z]\)\s*/)
    .map((s) => s.trim().replace(/[;.]\s*$/, ""))
    .filter(Boolean);
  return { intro, items };
}

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          badge={{ icon: FileText, label: "Legal", variant: "primary" }}
          title="Términos y"
          titleAccent="Condiciones"
          description="Última actualización: enero de 2025. Por favor léalos detenidamente antes de utilizar la plataforma."
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
                  {sections.map((s) => (
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

            {/* Secciones */}
            <div className="min-w-0 space-y-5">
              {sections.map((s) => {
                const { intro, items } = parseBody(s.body);
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

                    <p className="text-foreground/70 leading-relaxed">{intro}</p>

                    {items.length > 0 && (
                      <ul className="mt-4 space-y-2.5">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="bg-secondary/15 text-secondary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                              {String.fromCharCode(97 + i)}
                            </span>
                            <span className="text-foreground/70 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}

              {/* CTA de contacto */}
              <div className="from-primary/10 to-secondary/10 border-primary/20 mt-2 rounded-2xl border bg-linear-to-br p-7 text-center md:p-9">
                <div className="bg-primary/15 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  ¿Dudas sobre estos términos?
                </h3>
                <p className="text-foreground/70 mx-auto mt-2 max-w-md text-sm leading-relaxed">
                  Escríbenos y con gusto te aclaramos cualquier punto antes de que empieces a usar
                  la plataforma.
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
