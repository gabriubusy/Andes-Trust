"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
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
  Plus,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Mail,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Variant = "primary" | "secondary" | "accent";

const navItems: {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}[] = [
  { icon: LayoutDashboard, label: "Resumen", href: "/dashboard", active: true },
  { icon: Beef, label: "Animales", href: "#" },
  { icon: Activity, label: "Eventos", href: "#" },
  { icon: Milk, label: "Producción", href: "#" },
  { icon: Syringe, label: "Tratamientos", href: "#", badge: "3" },
  { icon: FileCheck, label: "Certificados", href: "#" },
  { icon: Receipt, label: "Ventas", href: "#" },
  { icon: BarChart3, label: "Reportes", href: "#" },
  { icon: Users, label: "Equipo", href: "#" },
  { icon: Settings, label: "Configuración", href: "#" },
];

const kpis: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  variant: Variant;
}[] = [
  {
    icon: Beef,
    label: "Animales activos",
    value: "248",
    trend: "+12 este mes",
    trendUp: true,
    variant: "primary",
  },
  {
    icon: Milk,
    label: "Producción hoy",
    value: "847 L",
    trend: "+5.2% vs ayer",
    trendUp: true,
    variant: "secondary",
  },
  {
    icon: Syringe,
    label: "Vacunas próximas",
    value: "14",
    trend: "Siguientes 7 días",
    trendUp: false,
    variant: "accent",
  },
  {
    icon: FileCheck,
    label: "Certificados activos",
    value: "32",
    trend: "+3 este mes",
    trendUp: true,
    variant: "primary",
  },
];

const activity: {
  title: string;
  subtitle: string;
  time: string;
  icon: LucideIcon;
  variant: Variant;
}[] = [
  {
    title: "Vacuna aplicada · Aftosa",
    subtitle: "Animal #BR-1042 · Lote La Vega",
    time: "Hace 12 min",
    icon: Syringe,
    variant: "secondary",
  },
  {
    title: "Pesaje registrado · 412 kg",
    subtitle: "Animal #BR-0987 · +18 kg en 30 días",
    time: "Hace 1 h",
    icon: TrendingUp,
    variant: "primary",
  },
  {
    title: "Producción AM registrada",
    subtitle: "Lote ordeño · 423 L · 32 vacas",
    time: "Hoy 06:42",
    icon: Milk,
    variant: "accent",
  },
  {
    title: "Nuevo nacimiento · #BR-1058",
    subtitle: "Madre #BR-0421 · Hembra · 38 kg",
    time: "Ayer 22:15",
    icon: Beef,
    variant: "primary",
  },
  {
    title: "Traslado · 12 animales",
    subtitle: "De Potrero Alto a Corral B",
    time: "Ayer 14:30",
    icon: Activity,
    variant: "secondary",
  },
];

const upcomingEvents: { date: string; month: string; title: string; subtitle: string }[] = [
  { date: "26", month: "ABR", title: "Vacuna brucelosis", subtitle: "8 animales · Lote La Vega" },
  { date: "28", month: "ABR", title: "Parto esperado", subtitle: "Vaca #BR-0421 · 280 días" },
  { date: "02", month: "MAY", title: "Fin retiro leche", subtitle: "Vaca #BR-0331 · Antibiótico" },
  { date: "05", month: "MAY", title: "Inspección sanitaria", subtitle: "Veterinaria oficial" },
];

const quickActions: { icon: LucideIcon; label: string; variant: Variant }[] = [
  { icon: Plus, label: "Registrar animal", variant: "primary" },
  { icon: Activity, label: "Nuevo evento", variant: "secondary" },
  { icon: Milk, label: "Producción de leche", variant: "accent" },
  { icon: FileCheck, label: "Generar certificado", variant: "primary" },
];

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

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-foreground/70 text-sm">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  const walletAddress = user?.wallet?.address;
  const email = user?.email?.address ?? user?.google?.email;
  const displayName = user?.google?.name ?? email?.split("@")[0] ?? "ganadero";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <aside className="bg-card/40 border-border hidden w-64 shrink-0 flex-col border-r backdrop-blur-xl lg:flex">
        <div className="border-border flex h-16 items-center border-b px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Andes Trust"
              width={120}
              height={48}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${
                  item.active ? "text-primary" : "text-foreground/60 group-hover:text-foreground"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-accent/15 text-accent rounded-full px-2 py-0.5 text-xs font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-border border-t p-4">
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/80 sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 backdrop-blur-xl md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
            <Image
              src="/logo.png"
              alt="Andes Trust"
              width={120}
              height={48}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <div className="hidden lg:block">
            <div className="text-foreground/60 text-xs">Resumen</div>
            <div className="text-foreground text-base font-semibold">Panel principal</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="border-accent/30 bg-accent/10 text-accent hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium md:inline-flex">
              <span className="bg-accent h-1.5 w-1.5 rounded-full" />
              Datos demo
            </div>
            <button
              type="button"
              aria-label="Notificaciones"
              className="border-border text-foreground/70 hover:border-primary/40 hover:text-foreground relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span className="bg-accent absolute top-1.5 right-1.5 h-2 w-2 rounded-full" />
            </button>
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
          <div className="mx-auto max-w-7xl space-y-8">
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                Hola, {displayName}
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
                    <div
                      className={`mt-2 text-xs ${kpi.trendUp ? "text-primary" : "text-foreground/60"}`}
                    >
                      {kpi.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card border-border rounded-2xl border p-5">
              <h2 className="text-foreground mb-4 text-base font-bold">Acciones rápidas</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={`group flex items-center gap-3 rounded-xl border bg-linear-to-br p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${variantQuick[action.variant]}`}
                  >
                    <div className="bg-background/60 flex h-9 w-9 items-center justify-center rounded-lg">
                      <action.icon className={`h-4 w-4 ${variantIcon[action.variant]}`} />
                    </div>
                    <span className="text-foreground text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-foreground text-base font-bold">Actividad reciente</h2>
                  <button
                    type="button"
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Ver todo
                  </button>
                </div>
                <ul className="space-y-1">
                  {activity.map((item, i) => (
                    <li
                      key={i}
                      className="hover:bg-muted/50 flex items-start gap-4 rounded-xl p-3 transition-colors"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${variantBg[item.variant]}`}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground text-sm font-medium">{item.title}</div>
                        <div className="text-foreground/60 text-xs">{item.subtitle}</div>
                      </div>
                      <div className="text-foreground/50 shrink-0 text-xs">{item.time}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-6">
                <div className="bg-card border-border rounded-2xl border p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Calendar className="text-primary h-4 w-4" />
                    <h2 className="text-foreground text-base font-bold">Próximos eventos</h2>
                  </div>
                  <ul className="space-y-3">
                    {upcomingEvents.map((event, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="bg-muted border-border flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border">
                          <div className="text-foreground text-base leading-none font-bold">
                            {event.date}
                          </div>
                          <div className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                            {event.month}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground text-sm font-medium">{event.title}</div>
                          <div className="text-foreground/60 text-xs">{event.subtitle}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-card border-border rounded-2xl border p-6">
                  <h2 className="text-foreground mb-4 text-base font-bold">Tu cuenta</h2>
                  <ul className="space-y-3 text-sm">
                    {email && (
                      <li className="flex items-center gap-3">
                        <Mail className="text-primary h-4 w-4 shrink-0" />
                        <span className="text-foreground/80 truncate">{email}</span>
                      </li>
                    )}
                    {walletAddress && (
                      <li className="flex items-center gap-3">
                        <Wallet className="text-secondary h-4 w-4 shrink-0" />
                        <span className="text-foreground/80 truncate font-mono text-xs">
                          {walletAddress}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
