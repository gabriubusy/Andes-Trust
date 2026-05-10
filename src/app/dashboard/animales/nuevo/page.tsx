"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AnimalForm from "@/components/AnimalForm";

export default function NuevoAnimalPage() {
  return (
    <DashboardShell title="Nuevo animal" subtitle="Animales">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/animales"
          className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>
      </div>
      <div className="bg-card border-border rounded-2xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-bold">Datos del animal</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          Al crearlo se generará automáticamente su QR público de trazabilidad.
        </p>
        <AnimalForm />
      </div>
    </DashboardShell>
  );
}
