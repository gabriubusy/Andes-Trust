"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Beef,
  Milk,
  Syringe,
  FileCheck,
  Plus,
  ArrowUpRight,
  Calendar,
  QrCode,
  Activity,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { cacheStorage } from "@/lib/cache/storage";

type Variant = "primary" | "secondary" | "accent";

const variantBg: Record<Variant, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
};

const variantQuick: Record<Variant, string> = {
  primary: "from-primary/10 to-primary/0 border-primary/20 hover:border-primary/50",
  secondary: "from-secondary/10 to-secondary/0 border-secondary/20 hover:border-secondary/50",
  accent: "from-accent/10 to-accent/0 border-accent/20 hover:border-accent/50",
};

const variantIcon: Record<Variant, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
};

const quickActions: { icon: LucideIcon; label: string; href: string; variant: Variant }[] = [
  { icon: Plus, label: "Registrar animal", href: "/dashboard/animales/nuevo", variant: "primary" },
  {
    icon: QrCode,
    label: "Etiquetas QR",
    href: "/dashboard/animales/etiquetas",
    variant: "secondary",
  },
  { icon: Beef, label: "Ver hato", href: "/dashboard/animales", variant: "accent" },
  {
    icon: FileCheck,
    label: "Generar certificado",
    href: "/dashboard/certificados/nuevo",
    variant: "primary",
  },
];

export default function DashboardPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const summary = useQuery({
    queryKey: ["dashboard-summary", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    queryFn: async () => {
      const cached = cacheStorage.get("dashboard-summary");
      if (cached) return cached;
      if (!supabase || !farmId) return null;

      const today = new Date();
      const sevenDays = new Date();
      sevenDays.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().slice(0, 10);
      const sevenStr = sevenDays.toISOString().slice(0, 10);

      const [
        { count: activeCount },
        { data: milkToday },
        { count: upcomingVacs },
        { count: certs },
      ] = await Promise.all([
        supabase
          .from("animals")
          .select("id", { count: "exact", head: true })
          .eq("farm_id", farmId)
          .eq("status", "active"),
        supabase
          .from("milk_records")
          .select("liters")
          .eq("farm_id", farmId)
          .eq("recorded_on", todayStr),
        supabase
          .from("vaccinations")
          .select("id", { count: "exact", head: true })
          .eq("farm_id", farmId)
          .gte("next_due_at", todayStr)
          .lte("next_due_at", sevenStr),
        supabase
          .from("certifications")
          .select("id", { count: "exact", head: true })
          .eq("farm_id", farmId),
      ]);

      const litersToday = (milkToday ?? []).reduce((acc, r) => acc + Number(r.liters ?? 0), 0);

      const result = {
        activeAnimals: activeCount ?? 0,
        litersToday,
        upcomingVacs: upcomingVacs ?? 0,
        certifications: certs ?? 0,
      };

      cacheStorage.set("dashboard-summary", result, 60 * 60 * 1000);
      return result;
    },
  });

  const recentAnimals = useQuery({
    queryKey: ["dashboard-recent-animals", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    queryFn: async () => {
      if (!supabase || !farmId) return [];

      const cached = cacheStorage.get("dashboard-recent-animals");
      if (cached) return cached;

      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name, current_weight_kg, created_at")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      const result = data ?? [];
      cacheStorage.set("dashboard-recent-animals", result, 60 * 60 * 1000);
      return result;
    },
  });

  const upcomingEvents = useQuery({
    queryKey: ["dashboard-upcoming-vacs", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 5 * 60 * 1000, // 5 minutes (más frecuente por ser tiempo-sensible)
    gcTime: 60 * 60 * 1000, // 1 hour
    queryFn: async () => {
      if (!supabase || !farmId) return [];

      const cached = cacheStorage.get("dashboard-upcoming-vacs");
      if (cached) return cached;

      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("vaccinations")
        .select("id, next_due_at, vaccines_catalog(name), animals(tag, name)")
        .eq("farm_id", farmId)
        .gte("next_due_at", today)
        .order("next_due_at", { ascending: true })
        .limit(5);
      if (error) throw error;

      const result = data ?? [];
      cacheStorage.set("dashboard-upcoming-vacs", result, 30 * 60 * 1000);
      return result;
    },
  });

  const kpis: {
    icon: LucideIcon;
    label: string;
    value: string;
    trend?: string;
    variant: Variant;
  }[] = [
    {
      icon: Beef,
      label: "Animales activos",
      value: String(summary.data?.activeAnimals ?? "—"),
      variant: "primary",
    },
    {
      icon: Milk,
      label: "Producción hoy",
      value: summary.data ? `${summary.data.litersToday.toFixed(1)} L` : "—",
      variant: "secondary",
    },
    {
      icon: Syringe,
      label: "Vacunas próximas",
      value: String(summary.data?.upcomingVacs ?? "—"),
      trend: "Siguientes 7 días",
      variant: "accent",
    },
    {
      icon: FileCheck,
      label: "Certificados",
      value: String(summary.data?.certifications ?? "—"),
      variant: "primary",
    },
  ];

  const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "short" });

  return (
    <DashboardShell title="Panel principal" subtitle="Resumen">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
          Hola{farmQuery.data ? `, bienvenido a ${farmQuery.data.name}` : ""}
        </h1>
        <p className="text-foreground/70 mt-1 text-sm">
          Aquí tienes un resumen de la actividad de tu hato hoy.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border-border hover:border-primary/40 rounded-2xl border p-5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${variantBg[kpi.variant]}`}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="text-foreground/30 h-4 w-4" />
            </div>
            <div className="mt-4">
              <div className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                {kpi.value}
              </div>
              <div className="text-foreground/70 mt-1 text-sm">{kpi.label}</div>
              {kpi.trend && <div className="text-foreground/60 mt-2 text-xs">{kpi.trend}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border-border rounded-2xl border p-5">
        <h2 className="text-foreground mb-4 text-base font-bold">Acciones rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group flex items-center gap-3 rounded-xl border bg-linear-to-br p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${variantQuick[action.variant]}`}
            >
              <div className="bg-background/60 flex h-9 w-9 items-center justify-center rounded-lg">
                <action.icon className={`h-4 w-4 ${variantIcon[action.variant]}`} />
              </div>
              <span className="text-foreground text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-foreground text-base font-bold">Últimos animales registrados</h2>
            <Link
              href="/dashboard/animales"
              className="text-primary text-xs font-medium hover:underline"
            >
              Ver todo
            </Link>
          </div>
          {recentAnimals.isLoading && <p className="text-foreground/60 text-sm">Cargando…</p>}
          {!recentAnimals.isLoading && (recentAnimals.data?.length ?? 0) === 0 && (
            <p className="text-foreground/60 text-sm">
              Aún no hay animales.{" "}
              <Link href="/dashboard/animales/nuevo" className="text-primary hover:underline">
                Crea el primero
              </Link>
              .
            </p>
          )}
          <ul className="space-y-1">
            {(recentAnimals.data ?? []).map((a) => (
              <li
                key={a.id}
                className="hover:bg-muted/50 flex items-start gap-4 rounded-xl p-3 transition-colors"
              >
                <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-sm font-medium">
                    {a.tag} {a.name ? `· ${a.name}` : ""}
                  </div>
                  <div className="text-foreground/60 text-xs">
                    {a.current_weight_kg ? `${a.current_weight_kg} kg · ` : ""}
                    Registrado {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/dashboard/animales/${a.id}`}
                  className="text-primary shrink-0 text-xs font-medium hover:underline"
                >
                  Ver →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Calendar className="text-primary h-4 w-4" />
            <h2 className="text-foreground text-base font-bold">Próximas vacunas</h2>
          </div>
          {upcomingEvents.isLoading && <p className="text-foreground/60 text-sm">Cargando…</p>}
          {!upcomingEvents.isLoading && (upcomingEvents.data?.length ?? 0) === 0 && (
            <p className="text-foreground/60 text-sm">No hay vacunas programadas.</p>
          )}
          <ul className="space-y-3">
            {(upcomingEvents.data ?? []).map((ev) => {
              const date = ev.next_due_at ? new Date(ev.next_due_at as string) : null;
              const cat = ev.vaccines_catalog as { name?: string } | { name: string }[] | null;
              const animal = ev.animals as
                | { tag?: string; name?: string }
                | { tag: string }[]
                | null;
              const vaccineName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
              const animalRow = Array.isArray(animal) ? animal[0] : animal;
              return (
                <li key={ev.id as string} className="flex items-start gap-3">
                  <div className="bg-muted border-border flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border">
                    <div className="text-foreground text-base leading-none font-bold">
                      {date?.getDate() ?? "—"}
                    </div>
                    <div className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                      {date ? monthFormat.format(date) : ""}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-medium">
                      {vaccineName ?? "Vacuna"}
                    </div>
                    <div className="text-foreground/60 text-xs">
                      {animalRow?.tag ? `Animal ${animalRow.tag}` : ""}
                      {animalRow && "name" in animalRow && animalRow.name
                        ? ` · ${animalRow.name}`
                        : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {(summary.error || recentAnimals.error || upcomingEvents.error) && (
        <p className="text-accent text-xs">
          Hubo un problema al cargar algunos datos. Intenta recargar la página.
        </p>
      )}
    </DashboardShell>
  );
}
