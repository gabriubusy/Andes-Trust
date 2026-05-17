import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Shield } from "lucide-react";

const sections = [
  {
    title: "1. Responsable del Tratamiento",
    body: `Finca El Progreso, con domicilio en Mérida, Venezuela (correo: privacidad@andestrust.com), es la entidad responsable del tratamiento de sus datos personales recopilados a través de esta Plataforma.`,
  },
  {
    title: "2. Datos que Recopilamos",
    body: `Recopilamos los siguientes tipos de información: (a) Datos de cuenta: nombre, correo electrónico y dirección de billetera digital (wallet) al registrarse; (b) Datos ganaderos: información sobre animales, fincas, tratamientos, pesajes y eventos productivos que usted registra; (c) Datos técnicos: dirección IP, tipo de dispositivo, sistema operativo y datos de uso de la Plataforma; (d) Datos de suscripción push: endpoint y claves para notificaciones en su dispositivo.`,
  },
  {
    title: "3. Finalidad del Tratamiento",
    body: `Utilizamos sus datos para: (a) prestar y mejorar el servicio de gestión ganadera; (b) generar certificados y registros de trazabilidad; (c) enviarle notificaciones relevantes (alertas sanitarias, vencimientos); (d) cumplir obligaciones legales; (e) analizar el uso de la Plataforma de forma agregada y anónima.`,
  },
  {
    title: "4. Base Legal",
    body: `El tratamiento de sus datos se basa en: (a) la ejecución del contrato de servicio que usted acepta al registrarse; (b) su consentimiento explícito para el envío de notificaciones push; (c) nuestro interés legítimo en mejorar la Plataforma y prevenir fraudes.`,
  },
  {
    title: "5. Conservación de Datos",
    body: `Conservamos sus datos personales mientras mantenga una cuenta activa. Tras la cancelación, los datos se eliminan en un plazo de 90 días, salvo obligación legal en contrario. Los registros anclados en blockchain no pueden eliminarse por su naturaleza inmutable; sin embargo, no contienen datos personales identificables directamente.`,
  },
  {
    title: "6. Compartición de Datos",
    body: `No vendemos sus datos. Podemos compartirlos con: (a) proveedores de infraestructura (Supabase, Polygon) bajo contratos de confidencialidad; (b) autoridades competentes cuando exista obligación legal. Los datos ganaderos nunca se comparten con terceros sin su consentimiento expreso.`,
  },
  {
    title: "7. Seguridad",
    body: `Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos: cifrado en tránsito (TLS) y en reposo (AES-256), control de acceso basado en roles, auditoría de accesos y almacenamiento seguro de credenciales. Los registros críticos se anclan en blockchain para garantizar su integridad.`,
  },
  {
    title: "8. Sus Derechos",
    body: `Usted tiene derecho a: acceder a sus datos personales; solicitar su rectificación si son inexactos; solicitar su eliminación (salvo registros blockchain); oponerse al tratamiento basado en interés legítimo; solicitar la portabilidad de sus datos ganaderos en formato CSV o JSON. Para ejercer estos derechos, contáctenos en privacidad@andestrust.com.`,
  },
  {
    title: "9. Transferencias Internacionales",
    body: `Sus datos pueden ser procesados en servidores ubicados fuera de Venezuela (incluyendo Estados Unidos y la Unión Europea) por nuestros proveedores de infraestructura, quienes ofrecen garantías adecuadas de protección conforme a sus políticas de privacidad.`,
  },
  {
    title: "10. Cambios en esta Política",
    body: `Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos cambios significativos por correo electrónico. La fecha de última actualización siempre estará visible al inicio del documento.`,
  },
  {
    title: "11. Contacto",
    body: `Para consultas sobre privacidad o para ejercer sus derechos, escriba a: privacidad@andestrust.com. Responderemos en un plazo máximo de 30 días hábiles.`,
  },
];

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
