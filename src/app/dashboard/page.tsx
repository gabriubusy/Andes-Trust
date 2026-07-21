"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { cacheStorage } from "@/lib/cache/storage";
import { friendlyErrorMessage } from "@/lib/errors/friendly";
import { canWrite } from "@/lib/permissions";

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

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

// `write: true` = la acción crea o modifica datos, así que no se le muestra
// a quien no puede escribir: acabaría en una pantalla que RLS le va a negar.
const quickActions: {
  icon: LucideIcon;
  label: string;
  href: string;
  variant: Variant;
  write?: boolean;
}[] = [
  {
    icon: Plus,
    label: "Registrar animal",
    href: "/dashboard/animales/nuevo",
    variant: "primary",
    write: true,
  },
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
    write: true,
  },
];

const dayFormat = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "short" });

function ChartSkeleton({ h = 180 }: { h?: number }) {
  return <div className="bg-muted/30 animate-pulse rounded-xl" style={{ height: h }} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MilkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border-border rounded-xl border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground/60 mb-1">{label}</div>
      <div className="text-secondary font-bold">{payload[0]?.value?.toFixed(1)} L</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WeightTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border-border rounded-xl border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground/60 mb-1">{label}</div>
      <div className="text-accent font-bold">{payload[0]?.value?.toFixed(1)} kg</div>
    </div>
  );
}

export default function DashboardPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const canEdit = canWrite(farmQuery.data?.role);

  type SummaryData = {
    activeAnimals: number;
    litersToday: number;
    litersYesterday: number;
    upcomingVacs: number;
    certifications: number;
  };
  const summary = useQuery<SummaryData | null>({
    queryKey: ["dashboard-summary", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<SummaryData | null> => {
      const cached = cacheStorage.get("dashboard-summary");
      if (cached) return cached as SummaryData;
      if (!supabase || !farmId) return null;

      const today = new Date();
      const sevenDays = new Date();
      sevenDays.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().slice(0, 10);
      const sevenStr = sevenDays.toISOString().slice(0, 10);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const [
        { count: activeCount },
        { data: milkToday },
        { data: milkYesterday },
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
          .from("milk_records")
          .select("liters")
          .eq("farm_id", farmId)
          .eq("recorded_on", yesterdayStr),
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
      const litersYesterday = (milkYesterday ?? []).reduce(
        (acc, r) => acc + Number(r.liters ?? 0),
        0
      );

      const result = {
        activeAnimals: activeCount ?? 0,
        litersToday,
        litersYesterday,
        upcomingVacs: upcomingVacs ?? 0,
        certifications: certs ?? 0,
      };

      cacheStorage.set("dashboard-summary", result, 60 * 60 * 1000);
      return result;
    },
  });

  type RecentAnimal = {
    id: string;
    tag: string;
    name: string | null;
    current_weight_kg: number | null;
    created_at: string;
  };
  const recentAnimals = useQuery<RecentAnimal[]>({
    queryKey: ["dashboard-recent-animals", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<RecentAnimal[]> => {
      if (!supabase || !farmId) return [];
      const cached = cacheStorage.get("dashboard-recent-animals");
      if (cached) return cached as RecentAnimal[];
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

  type UpcomingVac = {
    id: unknown;
    next_due_at: unknown;
    vaccines_catalog: unknown;
    animals: unknown;
  };
  const upcomingEvents = useQuery<UpcomingVac[]>({
    queryKey: ["dashboard-upcoming-vacs", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<UpcomingVac[]> => {
      if (!supabase || !farmId) return [];
      const cached = cacheStorage.get("dashboard-upcoming-vacs");
      if (cached) return cached as UpcomingVac[];
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

  // Milk production last 7 days
  const milkChart = useQuery({
    queryKey: ["dashboard-milk-chart", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const days: { date: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ date: d.toISOString().slice(0, 10), label: dayFormat.format(d) });
      }
      const { data } = await supabase
        .from("milk_records")
        .select("recorded_on, liters")
        .eq("farm_id", farmId)
        .gte("recorded_on", days[0].date)
        .lte("recorded_on", days[6].date);

      const totals: Record<string, number> = {};
      for (const r of data ?? []) {
        totals[r.recorded_on] = (totals[r.recorded_on] ?? 0) + Number(r.liters ?? 0);
      }
      return days.map((d) => ({ label: d.label, litros: totals[d.date] ?? 0 }));
    },
  });

  // Animal breed distribution
  const speciesChart = useQuery({
    queryKey: ["dashboard-species-chart", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("animal_breeds(breeds(name))")
        .eq("farm_id", farmId)
        .eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const a of data ?? []) {
        const breeds = ((a.animal_breeds ?? []) as { breeds: { name?: string } | null }[])
          .map((ab) => ab.breeds?.name)
          .filter((n): n is string => Boolean(n));
        if (breeds.length === 0) {
          counts["Sin raza"] = (counts["Sin raza"] ?? 0) + 1;
        } else {
          for (const name of breeds) {
            counts[name] = (counts[name] ?? 0) + 1;
          }
        }
      }
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Weight trend — last 8 weighing records
  const weightChart = useQuery({
    queryKey: ["dashboard-weight-chart", farmId],
    enabled: !!supabase && !!farmId,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data } = await supabase
        .from("weighings")
        .select("measured_at, weight_kg")
        .eq("farm_id", farmId)
        .order("measured_at", { ascending: false })
        .limit(8);
      return (data ?? []).reverse().map((r) => ({
        label: new Date(r.measured_at as string).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
        }),
        kg: Number(r.weight_kg ?? 0),
      }));
    },
  });

  // Milk trend: today vs yesterday
  const milkDelta =
    summary.data && summary.data.litersYesterday > 0
      ? ((summary.data.litersToday - summary.data.litersYesterday) / summary.data.litersYesterday) *
        100
      : null;

  const kpis: {
    icon: LucideIcon;
    label: string;
    value: string;
    href: string;
    trend?: string;
    trendDir?: "up" | "down" | "flat";
    variant: Variant;
  }[] = [
    {
      icon: Beef,
      label: "Animales activos",
      value: String(summary.data?.activeAnimals ?? "—"),
      href: "/dashboard/animales",
      variant: "primary",
    },
    {
      icon: Milk,
      label: "Producción hoy",
      value: summary.data ? `${summary.data.litersToday.toFixed(1)} L` : "—",
      href: "/dashboard/produccion",
      trend:
        milkDelta !== null
          ? `${milkDelta >= 0 ? "+" : ""}${milkDelta.toFixed(1)}% vs ayer`
          : undefined,
      trendDir:
        milkDelta === null ? undefined : milkDelta > 0 ? "up" : milkDelta < 0 ? "down" : "flat",
      variant: "secondary",
    },
    {
      icon: Syringe,
      label: "Vacunas próximas",
      value: String(summary.data?.upcomingVacs ?? "—"),
      href: "/dashboard/eventos",
      trend: "Siguientes 7 días",
      variant: "accent",
    },
    {
      icon: FileCheck,
      label: "Certificados",
      value: String(summary.data?.certifications ?? "—"),
      href: "/dashboard/certificados",
      variant: "primary",
    },
  ];

  useEffect(() => {
    if (summary.error)
      toast.error(friendlyErrorMessage(summary.error, { fallback: "Error al cargar el resumen." }));
  }, [summary.error]);
  useEffect(() => {
    if (recentAnimals.error)
      toast.error(
        friendlyErrorMessage(recentAnimals.error, {
          fallback: "Error al cargar animales recientes.",
        })
      );
  }, [recentAnimals.error]);
  useEffect(() => {
    if (upcomingEvents.error)
      toast.error(
        friendlyErrorMessage(upcomingEvents.error, {
          fallback: "Error al cargar próximas vacunas.",
        })
      );
  }, [upcomingEvents.error]);

  const totalSpecies = (speciesChart.data ?? []).reduce((a, b) => a + b.value, 0);

  return (
    <DashboardShell title="Panel principal" subtitle="Resumen">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
          Hola{farmQuery.data ? `, bienvenido a ${farmQuery.data.name}` : ""}
        </h1>
        <p className="text-foreground/70 mt-1 text-sm">
          Aquí tienes un resumen de la actividad de tu hato hoy.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group bg-card border-border hover:border-primary/40 rounded-2xl border p-5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${variantBg[kpi.variant]}`}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="text-foreground/30 group-hover:text-primary h-4 w-4 transition-colors" />
            </div>
            <div className="mt-4">
              <div className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                {kpi.value}
              </div>
              <div className="text-foreground/70 mt-1 text-sm">{kpi.label}</div>
              {kpi.trend && (
                <div
                  className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                    kpi.trendDir === "up"
                      ? "text-emerald-500"
                      : kpi.trendDir === "down"
                        ? "text-red-600 dark:text-red-400"
                        : "text-foreground/50"
                  }`}
                >
                  {kpi.trendDir === "up" && <TrendingUp className="h-3 w-3" />}
                  {kpi.trendDir === "down" && <TrendingDown className="h-3 w-3" />}
                  {kpi.trendDir === "flat" && <Minus className="h-3 w-3" />}
                  {kpi.trend}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-card border-border rounded-2xl border p-5">
        <h2 className="text-foreground mb-4 text-base font-bold">Acciones rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions
            .filter((action) => !action.write || canEdit)
            .map((action) => (
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

      {/* Charts row 1: Milk area + Species donut */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Milk production last 7 days */}
        <div className="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-base font-bold">Producción de leche</h2>
              <p className="text-foreground/50 mt-0.5 text-xs">Últimos 7 días · litros/día</p>
            </div>
            <Link
              href="/dashboard/produccion"
              className="text-primary text-xs font-medium hover:underline"
            >
              Ver todo
            </Link>
          </div>
          {milkChart.isLoading ? (
            <ChartSkeleton h={200} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={milkChart.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-secondary, #3b82f6)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-secondary, #3b82f6)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-foreground-muted, #94a3b8)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-foreground-muted, #94a3b8)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MilkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="litros"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#milkGrad)"
                  dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Species donut */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5">
            <h2 className="text-foreground text-base font-bold">Composición del hato</h2>
            <p className="text-foreground/50 mt-0.5 text-xs">Por raza · animales activos</p>
          </div>
          {speciesChart.isLoading ? (
            <ChartSkeleton h={200} />
          ) : (speciesChart.data ?? []).length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-foreground/40 text-sm">Sin datos</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={speciesChart.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(speciesChart.data ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `${v} (${((v / totalSpecies) * 100).toFixed(0)}%)`,
                      name,
                    ]}
                    contentStyle={{
                      background: "var(--color-card, #1e293b)",
                      border: "1px solid var(--color-border, #334155)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-1.5">
                {(speciesChart.data ?? []).map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-foreground/70 capitalize">{s.name}</span>
                    </div>
                    <span className="text-foreground font-medium">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2: Weight bar + Animals + Vaccines */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weight trend bar chart */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5">
            <h2 className="text-foreground text-base font-bold">Tendencia de peso</h2>
            <p className="text-foreground/50 mt-0.5 text-xs">Últimos registros · kg</p>
          </div>
          {weightChart.isLoading ? (
            <ChartSkeleton h={180} />
          ) : (weightChart.data ?? []).length === 0 ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-foreground/40 text-sm">Sin registros de peso</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weightChart.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-foreground-muted, #94a3b8)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-foreground-muted, #94a3b8)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<WeightTooltip />} />
                <Bar dataKey="kg" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent animals */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-foreground text-base font-bold">Últimos animales</h2>
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
                className="hover:bg-muted/50 flex items-start gap-3 rounded-xl p-2.5 transition-colors"
              >
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-sm font-medium">
                    {a.tag}
                    {a.name ? ` · ${a.name}` : ""}
                  </div>
                  <div className="text-foreground/50 text-xs">
                    {a.current_weight_kg ? `${a.current_weight_kg} kg · ` : ""}
                    {new Date(a.created_at).toLocaleDateString("es-CO")}
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

        {/* Upcoming vaccines */}
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
              const daysUntil = date ? Math.ceil((date.getTime() - Date.now()) / 86400000) : null;
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
                    {daysUntil !== null && (
                      <div
                        className={`mt-0.5 text-[10px] font-semibold ${daysUntil <= 2 ? "text-red-600 dark:text-red-400" : daysUntil <= 4 ? "text-amber-600 dark:text-amber-400" : "text-emerald-500"}`}
                      >
                        {daysUntil === 0
                          ? "Hoy"
                          : daysUntil === 1
                            ? "Mañana"
                            : `En ${daysUntil} días`}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
