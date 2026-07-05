"use client";

import { useState } from "react";
import { Dna, Syringe, FlaskConical, Building2, Fingerprint } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { TabFinca } from "./_tabs/TabFinca";
import { TabRazas } from "./_tabs/TabRazas";
import { TabVacunas } from "./_tabs/TabVacunas";
import { TabTratamientos } from "./_tabs/TabTratamientos";
import { TabSeguridad } from "./_tabs/TabSeguridad";

type Tab = "finca" | "razas" | "vacunas" | "tratamientos" | "seguridad";

const tabs: {
  id: Tab;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bg: string;
  activeBg: string;
}[] = [
  {
    id: "finca",
    label: "Finca",
    icon: Building2,
    description: "Datos generales",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    activeBg: "bg-blue-500/15 border-blue-500/30",
  },
  {
    id: "razas",
    label: "Razas",
    icon: Dna,
    description: "Catálogo de razas",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    activeBg: "bg-violet-500/15 border-violet-500/30",
  },
  {
    id: "vacunas",
    label: "Vacunas",
    icon: Syringe,
    description: "Catálogo de vacunas",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    activeBg: "bg-emerald-500/15 border-emerald-500/30",
  },
  {
    id: "tratamientos",
    label: "Tratamientos",
    icon: FlaskConical,
    description: "Medicamentos y antiparasitarios",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    activeBg: "bg-amber-500/15 border-amber-500/30",
  },
  {
    id: "seguridad",
    label: "Seguridad",
    icon: Fingerprint,
    description: "Passkey y acceso",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    activeBg: "bg-rose-500/15 border-rose-500/30",
  },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<Tab>("finca");
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <DashboardShell title="Configuración" subtitle="Ajustes">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active.bg}`}
        >
          <active.icon className={`h-5 w-5 ${active.color}`} />
        </div>
        <div>
          <h1 className="text-foreground text-xl font-bold tracking-tight">Configuración</h1>
          <p className="text-foreground/50 text-xs">
            Administra los catálogos y ajustes generales de tu finca.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Sidebar nav ── */}
        <nav className="shrink-0 lg:w-56">
          <p className="text-foreground/40 mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest">
            Secciones
          </p>
          <ul className="space-y-1">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? `${t.activeBg} border`
                        : "border-transparent hover:bg-muted hover:border-border"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive ? t.bg : "bg-muted group-hover:bg-muted/80"
                      }`}
                    >
                      <t.icon
                        className={`h-4 w-4 transition-colors ${
                          isActive ? t.color : "text-foreground/40 group-hover:text-foreground/60"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-semibold leading-tight ${
                          isActive ? t.color : "text-foreground/70 group-hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </div>
                      <div className="text-foreground/40 truncate text-[11px] leading-tight">
                        {t.description}
                      </div>
                    </div>
                    {isActive && (
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.color.replace("text-", "bg-")}`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Content ── */}
        <div className="min-w-0 flex-1">
          {/* Section breadcrumb */}
          <div className="mb-4 flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${active.bg}`}>
              <active.icon className={`h-3.5 w-3.5 ${active.color}`} />
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-foreground/40">Configuración</span>
              <span className="text-foreground/30">/</span>
              <span className={`font-semibold ${active.color}`}>{active.label}</span>
            </div>
          </div>

          {activeTab === "finca" && <TabFinca />}
          {activeTab === "razas" && <TabRazas />}
          {activeTab === "vacunas" && <TabVacunas />}
          {activeTab === "tratamientos" && <TabTratamientos />}
          {activeTab === "seguridad" && <TabSeguridad />}
        </div>
      </div>
    </DashboardShell>
  );
}
