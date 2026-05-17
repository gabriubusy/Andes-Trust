import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { FileText } from "lucide-react";

const sections = [
  {
    title: "1. Aceptación de los Términos",
    body: `Al acceder y utilizar la plataforma Finca El Progreso (en adelante, "la Plataforma"), usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.`,
  },
  {
    title: "2. Descripción del Servicio",
    body: `La Plataforma ofrece un sistema de gestión ganadera con trazabilidad blockchain que permite registrar animales, vacunaciones, tratamientos, pesajes y certificaciones. Los registros se anclan en la red Polygon para garantizar su inmutabilidad e integridad.`,
  },
  {
    title: "3. Registro y Cuenta de Usuario",
    body: `Para utilizar la Plataforma, deberá crear una cuenta proporcionando información verídica y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas bajo su cuenta. Notifíquenos de inmediato ante cualquier uso no autorizado.`,
  },
  {
    title: "4. Uso Aceptable",
    body: `Usted se compromete a utilizar la Plataforma únicamente para fines legítimos de gestión ganadera. Está prohibido: (a) introducir datos falsos o fraudulentos; (b) intentar acceder a datos de otras fincas sin autorización; (c) interferir con el funcionamiento de la Plataforma; (d) utilizar la Plataforma para actividades ilegales.`,
  },
  {
    title: "5. Propiedad de los Datos",
    body: `Usted conserva todos los derechos sobre los datos ganaderos que ingresa a la Plataforma. Al utilizar el servicio, nos otorga una licencia limitada para procesar dichos datos con el único fin de prestar el servicio. No vendemos ni compartimos sus datos productivos con terceros sin su consentimiento expreso.`,
  },
  {
    title: "6. Registros en Blockchain",
    body: `Los registros anclados en la blockchain de Polygon son inmutables por naturaleza. Una vez confirmada una transacción, no puede ser modificada ni eliminada. Usted comprende y acepta esta característica como parte inherente del servicio de trazabilidad.`,
  },
  {
    title: "7. Disponibilidad del Servicio",
    body: `Nos esforzamos por mantener la Plataforma disponible las 24 horas. Sin embargo, no garantizamos disponibilidad ininterrumpida. La función offline permite continuar registrando datos sin conexión; la sincronización ocurrirá al restaurarse la conectividad. No somos responsables de pérdidas derivadas de interrupciones del servicio.`,
  },
  {
    title: "8. Limitación de Responsabilidad",
    body: `En la medida máxima permitida por la ley aplicable, no seremos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso de la Plataforma. Nuestra responsabilidad total no superará el monto pagado por el servicio en los últimos 12 meses.`,
  },
  {
    title: "9. Modificaciones",
    body: `Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos los cambios significativos por correo electrónico o mediante aviso en la Plataforma. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos.`,
  },
  {
    title: "10. Ley Aplicable",
    body: `Estos Términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier disputa será sometida a los tribunales competentes de Mérida, Venezuela.`,
  },
  {
    title: "11. Contacto",
    body: `Para cualquier consulta sobre estos Términos, puede contactarnos en: legal@andestrust.com o escribirnos a nuestra dirección en Mérida, Venezuela.`,
  },
];

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

        <section className="container mx-auto max-w-3xl px-4 py-16">
          <div className="space-y-10">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-foreground mb-3 text-xl font-bold">{s.title}</h2>
                <p className="text-foreground/70 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
