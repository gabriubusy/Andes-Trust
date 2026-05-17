import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Cookie } from "lucide-react";

const cookieTypes = [
  {
    name: "Cookies Esenciales",
    required: true,
    examples: ["Sesión de usuario", "Token de autenticación", "Preferencias de tema"],
    desc: "Son imprescindibles para el funcionamiento básico de la Plataforma. Sin ellas no es posible autenticarse ni navegar por el panel. No pueden desactivarse.",
  },
  {
    name: "Cookies Funcionales",
    required: false,
    examples: ["Finca seleccionada", "Idioma preferido", "Configuración de vista"],
    desc: "Recuerdan sus preferencias para ofrecerle una experiencia personalizada. Su desactivación puede limitar algunas funciones de conveniencia.",
  },
  {
    name: "Cookies Analíticas",
    required: false,
    examples: ["Páginas visitadas", "Tiempo de sesión", "Errores encontrados"],
    desc: "Nos ayudan a entender cómo se usa la Plataforma para mejorarla. Los datos se tratan de forma agregada y anónima. Nunca identifican a usuarios individuales.",
  },
];

const sections = [
  {
    title: "¿Qué son las cookies?",
    body: `Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo al visitarlos. Permiten que el sitio recuerde sus acciones y preferencias durante un período de tiempo, para que no tenga que volver a introducirlos cada vez que vuelva al sitio o navegue de una página a otra.`,
  },
  {
    title: "¿Cómo usamos las cookies?",
    body: `Utilizamos cookies propias para gestionar la sesión, guardar preferencias y analizar el uso de la Plataforma. No utilizamos cookies de terceros con fines publicitarios ni compartimos datos de cookies con redes de publicidad.`,
  },
  {
    title: "Almacenamiento Local (localStorage / IndexedDB)",
    body: `Además de cookies, la Plataforma utiliza almacenamiento local del navegador (localStorage e IndexedDB) para habilitar la funcionalidad offline. Esto le permite registrar datos sin conexión a internet. Estos datos se sincronizan con el servidor al recuperar la conectividad y se eliminan del dispositivo al cerrar sesión.`,
  },
  {
    title: "Notificaciones Push",
    body: `Si acepta recibir notificaciones, su dispositivo almacena localmente una suscripción push. Esta suscripción se usa exclusivamente para enviarle alertas de la Plataforma (vencimientos de vacunas, alertas sanitarias). Puede revocar este permiso desde la configuración de su navegador en cualquier momento.`,
  },
  {
    title: "Gestión de Cookies",
    body: `Puede controlar y eliminar cookies desde la configuración de su navegador. Tenga en cuenta que desactivar las cookies esenciales impedirá el uso normal de la Plataforma. Para más información sobre cómo gestionar cookies en su navegador, consulte la ayuda oficial de Chrome, Firefox, Safari o Edge.`,
  },
  {
    title: "Actualización de esta Política",
    body: `Podemos actualizar esta política periódicamente para reflejar cambios en nuestras prácticas. Le notificaremos cualquier cambio significativo mediante aviso en la Plataforma o por correo electrónico.`,
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

        <section className="container mx-auto max-w-3xl px-4 py-16">
          <div className="space-y-12">
            {/* Tipos de cookies */}
            <div>
              <h2 className="text-foreground mb-6 text-xl font-bold">Tipos de cookies que usamos</h2>
              <div className="space-y-4">
                {cookieTypes.map((c) => (
                  <div key={c.name} className="bg-card border-border rounded-2xl border p-6">
                    <div className="mb-2 flex items-center gap-3">
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
                          className="bg-muted text-foreground/60 rounded-lg px-3 py-1 text-xs"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secciones de texto */}
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-foreground mb-3 text-xl font-bold">{s.title}</h2>
                <p className="text-foreground/70 leading-relaxed">{s.body}</p>
              </div>
            ))}

            {/* Contacto */}
            <div className="bg-primary/5 border-primary/20 rounded-2xl border p-6">
              <h2 className="text-foreground mb-2 text-lg font-bold">¿Preguntas sobre cookies?</h2>
              <p className="text-foreground/70 text-sm">
                Si tiene cualquier duda sobre nuestra política de cookies, escríbanos a{" "}
                <a href="mailto:privacidad@andestrust.com" className="text-primary hover:underline">
                  privacidad@andestrust.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
