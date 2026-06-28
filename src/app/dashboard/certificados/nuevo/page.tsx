"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CertificateForm from "@/components/CertificateForm";

export default function NuevoCertificadoPage() {
  const router = useRouter();

  return (
    <DashboardShell title="Nuevo certificado" subtitle="Certificados">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/dashboard/certificados"
          className="text-foreground/70 hover:text-foreground mb-4 inline-flex w-fit cursor-pointer items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>

        <div className="bg-card border-border rounded-2xl border shadow-sm">
          <div className="border-border flex items-start gap-4 border-b p-6">
            <div className="from-primary/20 to-primary/5 border-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br">
              <Award className="text-primary h-6 w-6" />
            </div>
            <div>
              <h2 className="text-foreground text-lg font-bold tracking-tight">
                Datos del certificado
              </h2>
              <p className="text-foreground/60 mt-0.5 text-sm">
                Registra un certificado de trazabilidad, sanidad u origen para la finca o un animal
                específico.
              </p>
            </div>
          </div>

          <div className="p-6">
            <CertificateForm
              onSuccess={() => router.push("/dashboard/certificados")}
              onCancel={() => router.push("/dashboard/certificados")}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
