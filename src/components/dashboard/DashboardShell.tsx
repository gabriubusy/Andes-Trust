"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  Beef,
  Activity,
  Milk,
  Syringe,
  FileCheck,
  Receipt,
  BarChart3,
  Users,
  Settings,
  Bell,
  BellRing,
  Stethoscope,
  Check,
  ExternalLink,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { useSupabase } from "@/hooks/use-supabase";
import ThemeToggle from "@/components/ThemeToggle";

const navItems: { icon: LucideIcon; label: string; href: string; matches?: string[] }[] = [
  { icon: LayoutDashboard, label: "Resumen", href: "/dashboard" },
  { icon: Beef, label: "Animales", href: "/dashboard/animales", matches: ["/dashboard/animales"] },
  {
    icon: Milk,
    label: "Producción",
    href: "/dashboard/produccion",
    matches: ["/dashboard/produccion"],
  },
  { icon: Activity, label: "Eventos", href: "/dashboard/eventos", matches: ["/dashboard/eventos"] },
  {
    icon: BellRing,
    label: "Alertas",
    href: "/dashboard/alertas",
    matches: ["/dashboard/alertas"],
  },
  {
    icon: FileCheck,
    label: "Certificados",
    href: "/dashboard/certificados",
    matches: ["/dashboard/certificados"],
  },
  {
    icon: BarChart3,
    label: "Reportes",
    href: "/dashboard/reportes",
    matches: ["/dashboard/reportes"],
  },
  {
    icon: Receipt,
    label: "Ventas",
    href: "/dashboard/ventas",
    matches: ["/dashboard/ventas"],
  },
  {
    icon: Syringe,
    label: "Tratamientos",
    href: "/dashboard/tratamientos",
    matches: ["/dashboard/tratamientos"],
  },
  {
    icon: Stethoscope,
    label: "Asistente clínico",
    href: "/dashboard/asistente-tratamiento",
    matches: ["/dashboard/asistente-tratamiento"],
  },
  {
    icon: Users,
    label: "Equipo",
    href: "/dashboard/equipo",
    matches: ["/dashboard/equipo"],
  },
  {
    icon: Settings,
    label: "Configuración",
    href: "/dashboard/configuracion",
    matches: ["/dashboard/configuracion"],
  },
];

const comingSoonItems: { icon: LucideIcon; label: string }[] = [];

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

type Alert = {
  id: string;
  type: string;
  due_at: string;
  status: string;
  payload: Record<string, unknown> | null;
  animal_id: string | null;
};

const ALERT_LABELS: Record<string, string> = {
  vaccination_due: "Vacunación pendiente",
  treatment_withdrawal: "Retiro de tratamiento",
  weighing_due: "Pesaje pendiente",
  custom: "Alerta personalizada",
};

export default function DashboardShell({ title, subtitle, children, action }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, user, logout } = usePrivy();
  const farmQuery = useCurrentFarm();
  const { supabase } = useSupabase();
  const farmId = farmQuery.data?.id;
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Cerrar notifications dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const alertsQuery = useQuery<Alert[]>({
    queryKey: ["alerts-dropdown", farmId],
    enabled: !!supabase && !!farmId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("alerts")
        .select("id, type, due_at, status, payload, animal_id")
        .eq("farm_id", farmId!)
        .eq("status", "open")
        .order("due_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase!
        .from("alerts")
        .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-dropdown", farmId] });
    },
  });

  const openAlerts = alertsQuery.data?.length ?? 0;

  useEffect(() => {
    if (ready && !authenticated) router.replace("/login");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h1 className="text-foreground text-xl font-semibold">Finca El Progreso</h1>
            <p className="text-foreground/50 text-sm">Verificando sesión...</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-primary/40 h-2 w-2 rounded-full"
              style={{
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const email = user?.email?.address ?? user?.google?.email;
  const displayName = user?.google?.name ?? email?.split("@")[0] ?? "ganadero";
  const initials = displayName.slice(0, 2).toUpperCase();
  const farmName = farmQuery.data?.name ?? "Cargando finca…";

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.matches?.some((m) => pathname.startsWith(m))) return true;
    return pathname === item.href;
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={(e) => {
            e.preventDefault();
            setSidebarOpen(false);
          }}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`bg-card/40 border-border fixed inset-y-0 left-0 z-50 w-64 flex-col border-r backdrop-blur-xl lg:static lg:z-auto lg:flex ${
          sidebarOpen ? "flex" : "hidden"
        }`}
      >
        <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Finca El Progreso"
              width={120}
              height={48}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
            className="text-foreground/70 hover:text-foreground rounded-lg p-1.5 transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-border shrink-0 border-b px-6 py-3">
          <div className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
            Finca
          </div>
          <div className="text-foreground truncate text-sm font-semibold">{farmName}</div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-primary" : "text-foreground/60 group-hover:text-foreground"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/dashboard/alertas" && openAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                    {openAlerts}
                  </span>
                )}
              </Link>
            );
          })}

          {comingSoonItems.length > 0 && (
            <div className="border-border/50 mt-4 border-t pt-4">
              <p className="text-foreground/40 px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase">
                Próximamente
              </p>
              {comingSoonItems.map((item) => (
                <div
                  key={item.label}
                  className="text-foreground/30 flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </nav>
        <div className="border-border shrink-0 border-t p-4">
          <div className="bg-muted/50 border-border flex items-center gap-3 rounded-xl border p-3">
            <div className="from-primary to-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-sm font-medium">{displayName}</div>
              <div className="text-foreground/60 truncate text-xs">{email ?? "Sin email"}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              className="text-foreground/60 hover:bg-background hover:text-foreground rounded-lg p-1.5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="border-border bg-background/80 sticky top-0 z-50 flex h-16 items-center gap-4 border-b px-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            className="text-foreground/70 hover:text-foreground -ml-2 rounded-lg p-2 transition-colors lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
            <Image
              src="/logo.png"
              alt="Finca El Progreso"
              width={120}
              height={48}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <div className="hidden lg:block">
            <div className="text-foreground/60 text-xs">{subtitle ?? farmName}</div>
            <div className="text-foreground text-base font-semibold">{title}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {action}
            <ThemeToggle />

            {/* Notificaciones */}
            <div ref={bellRef} className="relative">
              <button
                type="button"
                aria-label="Notificaciones"
                onClick={() => setNotifOpen((o) => !o)}
                className="border-border text-foreground/70 hover:border-primary/40 hover:text-foreground relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
              >
                <Bell className="h-4 w-4" />
                {openAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {openAlerts > 9 ? "9+" : openAlerts}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="bg-card border-border absolute right-0 top-11 z-50 w-80 rounded-2xl border shadow-xl">
                  <div className="border-border flex items-center justify-between border-b px-4 py-3">
                    <span className="text-foreground text-sm font-semibold">Notificaciones</span>
                    {openAlerts > 0 && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                        {openAlerts} pendiente{openAlerts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {alertsQuery.isLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="text-primary h-5 w-5 animate-spin" />
                      </div>
                    )}
                    {!alertsQuery.isLoading && openAlerts === 0 && (
                      <div className="py-10 text-center">
                        <Bell className="text-foreground/20 mx-auto mb-2 h-8 w-8" />
                        <p className="text-foreground/50 text-sm">Sin alertas pendientes</p>
                      </div>
                    )}
                    {alertsQuery.data?.map((alert) => {
                      const label = ALERT_LABELS[alert.type] ?? alert.type;
                      const animalName =
                        (alert.payload as any)?.animal_name ?? (alert.payload as any)?.name ?? null;
                      const dueDate = alert.due_at
                        ? new Date(alert.due_at).toLocaleDateString("es-VE", {
                            day: "numeric",
                            month: "short",
                          })
                        : null;
                      return (
                        <div
                          key={alert.id}
                          className="border-border hover:bg-muted/40 flex items-start gap-3 border-b px-4 py-3 last:border-0"
                        >
                          <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                            <BellRing className="text-primary h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-xs font-medium">{label}</p>
                            {animalName && (
                              <p className="text-foreground/60 truncate text-xs">{animalName}</p>
                            )}
                            {dueDate && (
                              <p className="text-foreground/40 text-xs">Vence: {dueDate}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                            aria-label="Marcar como visto"
                            className="text-foreground/40 hover:text-primary hover:bg-primary/10 mt-0.5 shrink-0 rounded-lg p-1 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-border border-t px-4 py-2">
                    <Link
                      href="/dashboard/alertas"
                      onClick={() => setNotifOpen(false)}
                      className="text-primary hover:text-primary/80 flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      Ver todas las alertas
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              className="border-border text-foreground hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
