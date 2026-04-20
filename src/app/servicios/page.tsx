import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTASection from "@/components/CTASection";
import { variantStyles, type Variant } from "@/lib/variants";
import {
  Database,
  Lock,
  TreePine,
  Mountain,
  Smartphone,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface Service {
  icon: LucideIcon;
  variant: Variant;
  title: string;
  desc: string;
  features: string[];
}

const services: Service[] = [
  {
    icon: Database,
    variant: "primary",
    title: "Registro Digital",
    desc: "Digitaliza toda la información de tu hato: nacimientos, vacunas, peso y más.",
    features: [
      "Registro individual de animales",
      "Historial médico completo",
      "Control de peso y crecimiento",
      "Alertas de vacunación",
    ],
  },
  {
    icon: Lock,
    variant: "secondary",
    title: "Blockchain Seguro",
    desc: "Cada registro se almacena en la blockchain, garantizando inmutabilidad.",
    features: [
      "Registros inmutables",
      "Encriptación de extremo a extremo",
      "Verificación de identidad",
      "Auditoría transparente",
    ],
  },
  {
    icon: TreePine,
    variant: "accent",
    title: "Trazabilidad Total",
    desc: "Rastrea el historial completo de cada animal desde su nacimiento.",
    features: [
      "Seguimiento en tiempo real",
      "Historial de movimientos",
      "Certificación de origen",
      "Reportes de trazabilidad",
    ],
  },
  {
    icon: Mountain,
    variant: "primary",
    title: "Smart Contracts",
    desc: "Automatiza transacciones y acuerdos comerciales con contratos inteligentes.",
    features: [
      "Contratos automatizados",
      "Pagos seguros",
      "Acuerdos transparentes",
      "Ejecución automática",
    ],
  },
  {
    icon: Smartphone,
    variant: "secondary",
    title: "Acceso Multiplataforma",
    desc: "Accede a la información de tu hato desde cualquier dispositivo.",
    features: [
      "Web responsiva",
      "Sincronización offline",
      "Notificaciones en el navegador",
      "Interfaz intuitiva",
    ],
  },
  {
    icon: BarChart3,
    variant: "accent",
    title: "Análisis y Reportes",
    desc: "Obtén insights valiosos sobre el rendimiento de tu hato.",
    features: [
      "Dashboards interactivos",
      "Reportes personalizados",
      "Análisis de tendencias",
      "Exportación de datos",
    ],
  },
];

export default function ServiciosPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <PageHero
          badge={{ icon: Sparkles, label: "Nuestros servicios" }}
          title="Soluciones integrales"
          titleAccent="para tu hato"
          description="Todo lo que necesitas para gestionar tu ganado con tecnología blockchain"
        />

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const v = variantStyles[service.variant];
                return (
                  <div
                    key={service.title}
                    className="group border-border bg-card hover:border-primary/40 flex flex-col rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`${v.bgSoft} ${v.bgHover} mb-5 flex h-14 w-14 items-center justify-center rounded-xl transition-colors`}
                    >
                      <service.icon className={`${v.text} h-7 w-7`} />
                    </div>
                    <h3 className="text-card-foreground mb-2 text-xl font-bold">{service.title}</h3>
                    <p className="text-foreground/70 mb-5 text-sm leading-relaxed">
                      {service.desc}
                    </p>
                    <ul className="space-y-2 border-t border-dashed pt-4">
                      {service.features.map((feature) => (
                        <li
                          key={feature}
                          className="text-foreground/70 flex items-center gap-2 text-xs"
                        >
                          <span
                            className={`${v.text.replace("text-", "bg-")} h-1 w-1 rounded-full`}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <CTASection
          title="¿Interesado en nuestros servicios?"
          description="Contáctanos para una demostración personalizada de cómo podemos ayudar a tu hato"
          primaryLabel="Solicitar Demo"
          secondaryLabel="Contactar"
        />
      </main>

      <Footer />
    </div>
  );
}
