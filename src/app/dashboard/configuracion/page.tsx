"use client";

import { useState } from "react";
import { Dna, Syringe, FlaskConical, Building2 } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { TabFinca } from "./_tabs/TabFinca";
import { TabRazas } from "./_tabs/TabRazas";
import { TabVacunas } from "./_tabs/TabVacunas";
import { TabTratamientos } from "./_tabs/TabTratamientos";

type Tab = "finca" | "razas" | "vacunas" | "tratamientos";

const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "finca", label: "Finca", icon: Building2, description: "Datos generales" },
  { id: "razas", label: "Razas", icon: Dna, description: "Catálogo de razas" },
  { id: "vacunas", label: "Vacunas", icon: Syringe, description: "Catálogo de vacunas" },
  {
    id: "tratamientos",
    label: "Tratamientos",
    icon: FlaskConical,
    description: "Medicamentos y antiparasitarios",
  },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<Tab>("finca");
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <DashboardShell title="Configuración" subtitle="Ajustes">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Administra los catálogos y ajustes generales de tu finca.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="shrink-0 lg:w-52">
          <ul className="space-y-1">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-primary/15" : "bg-muted"
                      }`}
                    >
                      <t.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : "text-foreground/50"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-sm leading-tight font-medium ${isActive ? "text-primary" : ""}`}
                      >
                        {t.label}
                      </div>
                      <div className="text-foreground/50 truncate text-xs leading-tight">
                        {t.description}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
              <active.icon className="text-primary h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-base leading-tight font-bold">{active.label}</h2>
              <p className="text-foreground/50 text-xs">{active.description}</p>
            </div>
          </div>

          {activeTab === "finca" && <TabFinca />}
          {activeTab === "razas" && <TabRazas />}
          {activeTab === "vacunas" && <TabVacunas />}
          {activeTab === "tratamientos" && <TabTratamientos />}
        </div>
      </div>
    </DashboardShell>
  );
}
