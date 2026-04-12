"use client";

import {
  Shield,
  Lock,
  Key,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Server,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SeguridadPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Hero Section */}
      <section className="bg-slate-50 py-20 md:py-32 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-foreground mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Seguridad
          </h1>
          <p className="text-foreground/70 mx-auto max-w-2xl text-lg md:text-xl">
            Tu información y la de tu hato están protegidas con los más altos estándares de
            seguridad
          </p>
        </div>
      </section>

      {/* Security Overview */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
              Nuestro Compromiso de Seguridad
            </h2>
            <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
              Implementamos múltiples capas de seguridad para proteger tus datos y garantizar la
              integridad de cada registro en la blockchain.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Lock className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Encriptación</h3>
              <p className="text-foreground/70 text-sm">AES-256 de extremo a extremo</p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-secondary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Shield className="text-secondary h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Blockchain</h3>
              <p className="text-foreground/70 text-sm">Registros inmutables</p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Key className="text-accent h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Autenticación</h3>
              <p className="text-foreground/70 text-sm">Multi-factor y biométrica</p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 text-center shadow-lg">
              <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Eye className="text-primary h-8 w-8" />
              </div>
              <h3 className="text-card-foreground mb-2 text-xl font-semibold">Monitoreo</h3>
              <p className="text-foreground/70 text-sm">24/7 vigilancia activa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="container mx-auto rounded-3xl bg-slate-50 px-4 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-foreground mb-12 text-center text-3xl font-bold md:text-4xl">
            Características de Seguridad
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Server className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                    Infraestructura Segura
                  </h3>
                  <p className="text-foreground/70 mb-4">
                    Servidores alojados en centros de datos certificados con redundancia geográfica
                    y backups automáticos diarios.
                  </p>
                  <ul className="text-foreground/60 space-y-2 text-sm">
                    <li>• Certificación ISO 27001</li>
                    <li>• Redundancia geográfica</li>
                    <li>• Backups automáticos</li>
                    <li>• Disaster recovery plan</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-secondary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Fingerprint className="text-secondary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                    Autenticación Avanzada
                  </h3>
                  <p className="text-foreground/70 mb-4">
                    Sistema de autenticación multi-factor con opciones biométricas y tokens de
                    seguridad.
                  </p>
                  <ul className="text-foreground/60 space-y-2 text-sm">
                    <li>• Autenticación 2FA</li>
                    <li>• Biometría facial</li>
                    <li>• Tokens hardware</li>
                    <li>• SSO empresarial</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-accent/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <Lock className="text-accent h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                    Encriptación de Datos
                  </h3>
                  <p className="text-foreground/70 mb-4">
                    Todos los datos están encriptados en reposo y en tránsito usando estándares
                    militares.
                  </p>
                  <ul className="text-foreground/60 space-y-2 text-sm">
                    <li>• AES-256 en reposo</li>
                    <li>• TLS 1.3 en tránsito</li>
                    <li>• Encriptación de campos</li>
                    <li>• Keys rotación automática</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <AlertTriangle className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-card-foreground mb-2 text-xl font-semibold">
                    Monitoreo y Alertas
                  </h3>
                  <p className="text-foreground/70 mb-4">
                    Sistema de detección de intrusiones y respuesta automática a amenazas.
                  </p>
                  <ul className="text-foreground/60 space-y-2 text-sm">
                    <li>• SIEM integrado</li>
                    <li>• Análisis de comportamiento</li>
                    <li>• Alertas en tiempo real</li>
                    <li>• Respuesta automática</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-foreground mb-6 text-center text-3xl font-bold md:text-4xl">
            Cumplimiento Normativo
          </h2>
          <p className="text-foreground/70 mx-auto mb-12 max-w-2xl text-center text-lg">
            Cumplimos con las regulaciones internacionales de protección de datos y seguridad.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="text-primary h-6 w-6" />
                <h3 className="text-card-foreground text-lg font-semibold">GDPR</h3>
              </div>
              <p className="text-foreground/70 text-sm">
                Cumplimos con el Reglamento General de Protección de Datos de la UE para garantizar
                la privacidad de los usuarios.
              </p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="text-secondary h-6 w-6" />
                <h3 className="text-card-foreground text-lg font-semibold">ISO 27001</h3>
              </div>
              <p className="text-foreground/70 text-sm">
                Certificados en gestión de seguridad de la información con procesos auditados
                regularmente.
              </p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="text-accent h-6 w-6" />
                <h3 className="text-card-foreground text-lg font-semibold">SOC 2 Type II</h3>
              </div>
              <p className="text-foreground/70 text-sm">
                Auditoría anual de controles de seguridad, disponibilidad e integridad de
                procesamiento.
              </p>
            </div>

            <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="text-primary h-6 w-6" />
                <h3 className="text-card-foreground text-lg font-semibold">HIPAA</h3>
              </div>
              <p className="text-foreground/70 text-sm">
                Cumplimos con estándares de privacidad y seguridad para datos sensibles de salud.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary mx-auto max-w-4xl rounded-2xl p-8 text-center md:p-12">
          <h2 className="text-primary-foreground mb-4 text-3xl font-bold md:text-4xl">
            ¿Tienes Preguntas de Seguridad?
          </h2>
          <p className="text-primary-foreground/90 mb-8 text-lg">
            Nuestro equipo de seguridad está disponible para responder cualquier consulta sobre
            nuestras prácticas de seguridad.
          </p>
          <button className="text-primary rounded-lg bg-white px-8 py-3 text-lg font-medium shadow-lg transition-colors hover:bg-slate-100">
            Contactar Seguridad
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
}
