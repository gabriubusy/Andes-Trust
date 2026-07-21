import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Link from "next/link";
import {
  Shield,
  Building2,
  Database,
  Target,
  Scale,
  Clock,
  Share2,
  ShieldCheck,
  UserCheck,
  Globe,
  RefreshCw,
  Mail,
  Lock,
  Ban,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const CONTACT_EMAIL = "privacidad@andestrust.com";

type Section = {
  id: string;
  num: number;
  title: string;
  icon: LucideIcon;
  body: string;
};

const sections: Section[] = [
  {
    id: "responsable",
    num: 1,
    title: "Responsable del Tratamiento",
    icon: Building2,
    body: `Finca El Progreso, con domicilio en Mérida, Venezuela (correo: ${CONTACT_EMAIL}), es la entidad responsable del tratamiento de sus datos personales recopilados a través de esta Plataforma.`,
  },
  {
    id: "datos",
    num: 2,
    title: "Datos que Recopilamos",
    icon: Database,
    body: `Recopilamos los siguientes tipos de información: (a) Datos de cuenta: nombre, correo electrónico y dirección de billetera digital (wallet) al registrarse; (b) Datos ganaderos: información sobre animales, fincas, tratamientos, pesajes y eventos productivos que usted registra; (c) Datos técnicos: dirección IP, tipo de dispositivo, sistema operativo y datos de uso de la Plataforma; (d) Datos de suscripción push: endpoint y claves para notificaciones en su dispositivo.`,
  },
  {
    id: "finalidad",
    num: 3,
    title: "Finalidad del Tratamiento",
    icon: Target,
    body: `Utilizamos sus datos para: (a) prestar y mejorar el servicio de gestión ganadera; (b) generar certificados y registros de trazabilidad; (c) enviarle notificaciones relevantes (alertas sanitarias, vencimientos); (d) cumplir obligaciones legales; (e) analizar el uso de la Plataforma de forma agregada y anónima.`,
  },
  {
    id: "base-legal",
    num: 4,
    title: "Base Legal",
    icon: Scale,
    body: `El tratamiento de sus datos se basa en: (a) la ejecución del contrato de servicio que usted acepta al registrarse; (b) su consentimiento explícito para el envío de notificaciones push; (c) nuestro interés legítimo en mejorar la Plataforma y prevenir fraudes.`,
  },
  {
    id: "conservacion",
    num: 5,
    title: "Conservación de Datos",
    icon: Clock,
    body: `Conservamos sus datos personales mientras mantenga una cuenta activa. Tras la cancelación, los datos se eliminan en un plazo de 90 días, salvo obligación legal en contrario. Los registros anclados en blockchain no pueden eliminarse por su naturaleza inmutable; sin embargo, no contienen datos personales identificables directamente.`,
  },
  {
    id: "comparticion",
    num: 6,
    title: "Compartición de Datos",
    icon: Share2,
    body: `No vendemos sus datos. Podemos compartirlos con: (a) proveedores de infraestructura (Supabase, Polygon) bajo contratos de confidencialidad; (b) autoridades competentes cuando exista obligación legal. Los datos ganaderos nunca se comparten con terceros sin su consentimiento expreso.`,
  },
  {
    id: "seguridad",
    num: 7,
    title: "Seguridad",
    icon: ShieldCheck,
    body: `Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos: cifrado en tránsito (TLS) y en reposo (AES-256), control de acceso basado en roles, auditoría de accesos y almacenamiento seguro de credenciales. Los registros críticos se anclan en blockchain para garantizar su integridad.`,
  },
  {
    id: "derechos",
    num: 8,
    title: "Sus Derechos",
    icon: UserCheck,
    body: `Usted tiene derecho a: (a) acceder a sus datos personales; (b) solicitar su rectificación si son inexactos; (c) solicitar su eliminación (salvo registros blockchain); (d) oponerse al tratamiento basado en interés legítimo; (e) solicitar la portabilidad de sus datos ganaderos en formato CSV o JSON. Para ejercer estos derechos, contáctenos en ${CONTACT_EMAIL}.`,
  },
  {
    id: "transferencias",
    num: 9,
    title: "Transferencias Internacionales",
    icon: Globe,
    body: `Sus datos pueden ser procesados en servidores ubicados fuera de Venezuela (incluyendo Estados Unidos y la Unión Europea) por nuestros proveedores de infraestructura, quienes ofrecen garantías adecuadas de protección conforme a sus políticas de privacidad.`,
  },
  {
    id: "cambios",
    num: 10,
    title: "Cambios en esta Política",
    icon: RefreshCw,
    body: `Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos cambios significativos por correo electrónico. La fecha de última actualización siempre estará visible al inicio del documento.`,
  },
  {
    id: "contacto",
    num: 11,
    title: "Contacto",
    icon: Mail,
    body: `Para consultas sobre privacidad o para ejercer sus derechos, escriba a: ${CONTACT_EMAIL}. Responderemos en un plazo máximo de 30 días hábiles.`,
  },
];

const highlights: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Ban, title: "No vendemos tus datos", desc: "Nunca comercializamos tu información." },
  {
    icon: Lock,
    title: "Cifrado de extremo a extremo",
    desc: "TLS en tránsito y AES-256 en reposo.",
  },
  {
    icon: UserCheck,
    title: "Tus derechos garantizados",
    desc: "Acceso, rectificación y portabilidad.",
  },
  {
    icon: ShieldCheck,
    title: "Integridad en blockchain",
    desc: "Registros críticos inmutables y verificables.",
  },
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

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          badge={{ icon: Shield, label: "Legal", variant: "secondary" }}
          title="Política de"
          titleAccent="Privacidad"
          description="Última actualización: enero de 2025. Su privacidad es nuestra prioridad."
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
                  ¿Dudas sobre tu privacidad?
                </h3>
                <p className="text-foreground/70 mx-auto mt-2 max-w-md text-sm leading-relaxed">
                  Escríbenos para ejercer tus derechos o resolver cualquier consulta. Respondemos en
                  un máximo de 30 días hábiles.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="group bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:shadow-xl"
                >
                  {CONTACT_EMAIL}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              <p className="text-foreground/40 pt-2 text-center text-xs lg:hidden">
                <Link href="#" className="hover:text-primary transition-colors">
                  ↑ Volver arriba
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
