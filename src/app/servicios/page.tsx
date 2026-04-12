"use client";

import { Database, Lock, TreePine, Mountain, Smartphone, BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ServiciosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Hero Section */}
      <section className="bg-slate-50 py-20 md:py-32 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-foreground mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Nuestros Servicios
          </h1>
          <p className="text-foreground/70 mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Soluciones integrales para la gestión ganadera con tecnología blockchain
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-8 py-3 text-lg font-medium shadow-lg transition-colors">
              Comenzar Ahora
            </button>
            <button className="text-secondary border-secondary hover:bg-secondary hover:text-secondary-foreground rounded-lg border-2 px-8 py-3 text-lg font-medium transition-colors">
              Solicitar Demo
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Database className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Registro Digital</h3>
              <p className="text-foreground/70 mb-4">
                Digitaliza toda la información de tu hato: nacimientos, vacunas, peso, y más.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• Registro individual de animales</li>
                <li>• Historial médico completo</li>
                <li>• Control de peso y crecimiento</li>
                <li>• Alertas de vacunación</li>
              </ul>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-secondary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Lock className="text-secondary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Blockchain Segura</h3>
              <p className="text-foreground/70 mb-4">
                Cada registro se almacena en la blockchain, garantizando inmutabilidad.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• Registros inmutables</li>
                <li>• Encriptación de extremo a extremo</li>
                <li>• Verificación de identidad</li>
                <li>• Auditoría transparente</li>
              </ul>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-accent/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <TreePine className="text-accent h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                Trazabilidad Total
              </h3>
              <p className="text-foreground/70 mb-4">
                Rastrea el historial completo de cada animal desde su nacimiento.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• Seguimiento en tiempo real</li>
                <li>• Historial de movimientos</li>
                <li>• Certificación de origen</li>
                <li>• Reportes de trazabilidad</li>
              </ul>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Mountain className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Smart Contracts</h3>
              <p className="text-foreground/70 mb-4">
                Automatiza transacciones y acuerdos comerciales con contratos inteligentes.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• Contratos automatizados</li>
                <li>• Pagos seguros</li>
                <li>• Acuerdos transparentes</li>
                <li>• Ejecución automática</li>
              </ul>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-secondary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Smartphone className="text-secondary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">App Móvil</h3>
              <p className="text-foreground/70 mb-4">
                Accede a la información de tu hato desde cualquier lugar.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• App iOS y Android</li>
                <li>• Sincronización offline</li>
                <li>• Notificaciones push</li>
                <li>• Interfaz intuitiva</li>
              </ul>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="bg-accent/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <BarChart3 className="text-accent h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                Análisis y Reportes
              </h3>
              <p className="text-foreground/70 mb-4">
                Obtén insights valiosos sobre el rendimiento de tu hato.
              </p>
              <ul className="text-foreground/60 space-y-2 text-sm">
                <li>• Dashboards interactivos</li>
                <li>• Reportes personalizados</li>
                <li>• Análisis de tendencias</li>
                <li>• Exportación de datos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary mx-auto max-w-4xl rounded-2xl p-8 text-center md:p-12">
          <h2 className="text-primary-foreground mb-4 text-3xl font-bold md:text-4xl">
            ¿Interesado en Nuestros Servicios?
          </h2>
          <p className="text-primary-foreground/90 mb-8 text-lg">
            Contáctanos para una demostración personalizada de cómo podemos ayudar a tu hato.
          </p>
          <button className="text-primary rounded-lg bg-white px-8 py-3 text-lg font-medium shadow-lg transition-colors hover:bg-slate-100">
            Solicitar Demo
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
}
