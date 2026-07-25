"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  Check,
  Filter,
  Loader2,
  Syringe,
  Scale,
  ShieldAlert,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Pagination, { usePagination } from "@/components/Pagination";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { canWrite } from "@/lib/permissions";
import { SkeletonList } from "@/components/ui/Skeleton";

type AlertRow = {
  id: string;
  farm_id: string;
  animal_id: string | null;
  type: "vaccination_due" | "treatment_withdrawal" | "weighing_due" | "custom";
  due_at: string;
  status: "open" | "acknowledged" | "dismissed" | "resolved";
  payload: {
    animal_tag?: string;
    animal_name?: string;
    last_applied_at?: string;
    last_weighing_at?: string;
    vaccination_id?: string;
  } & Record<string, unknown>;
  source_table: string | null;
  source_id: string | null;
  animals: { tag: string; name: string | null } | null;
};

const TYPE_LABEL: Record<AlertRow["type"], string> = {
  vaccination_due: "Vacunación próxima",
  treatment_withdrawal: "Período de retiro",
  weighing_due: "Pesaje pendiente",
  custom: "Alerta",
};

const TYPE_ICON: Record<AlertRow["type"], typeof Syringe> = {
  vaccination_due: Syringe,
  treatment_withdrawal: ShieldAlert,
  weighing_due: Scale,
  custom: AlertTriangle,
};

const STATUS_LABEL: Record<AlertRow["status"], string> = {
  open: "Abierta",
  acknowledged: "Reconocida",
  dismissed: "Descartada",
  resolved: "Resuelta",
};

// Color por tipo de alerta (chip del ícono en la lista)
const TYPE_COLOR: Record<AlertRow["type"], { bg: string; text: string }> = {
  vaccination_due: { bg: "bg-purple-500/10", text: "text-purple-500" },
  treatment_withdrawal: { bg: "bg-orange-500/10", text: "text-orange-500" },
  weighing_due: { bg: "bg-blue-500/10", text: "text-blue-500" },
  custom: { bg: "bg-muted", text: "text-foreground/60" },
};

const STATUS_BADGE: Record<AlertRow["status"], string> = {
  open: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  acknowledged: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  dismissed: "bg-muted text-foreground/50",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function AlertasPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const canEdit = canWrite(farmQuery.data?.role);
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<"all" | AlertRow["type"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AlertRow["status"]>("open");

  const alertsQuery = useQuery<AlertRow[]>({
    queryKey: ["alerts", farmId, typeFilter, statusFilter],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      let q = supabase!
        .from("alerts")
        .select(
          "id, farm_id, animal_id, type, due_at, status, payload, source_table, source_id, animals(tag, name)"
        )
        .eq("farm_id", farmId!)
        .order("due_at", { ascending: true });
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AlertRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AlertRow["status"] }) => {
      const { error } = await supabase!
        .from("alerts")
        .update({ status, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const counts = useMemo(() => {
    const all = alertsQuery.data ?? [];
    return {
      open: all.filter((a) => a.status === "open").length,
      vaccination_due: all.filter((a) => a.type === "vaccination_due").length,
      treatment_withdrawal: all.filter((a) => a.type === "treatment_withdrawal").length,
      weighing_due: all.filter((a) => a.type === "weighing_due").length,
    };
  }, [alertsQuery.data]);

  const {
    pageItems: pagedAlerts,
    page,
    setPage,
    totalPages,
    total,
  } = usePagination(alertsQuery.data ?? [], 20);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardShell title="Alertas" subtitle="Vacunación, retiros y pesajes pendientes">
      <div className="flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              ["Abiertas", counts.open, BellRing, "text-amber-500", "bg-amber-500/10"],
              [
                "Vacunación",
                counts.vaccination_due,
                Syringe,
                "text-purple-500",
                "bg-purple-500/10",
              ],
              [
                "Retiro",
                counts.treatment_withdrawal,
                ShieldAlert,
                "text-orange-500",
                "bg-orange-500/10",
              ],
              ["Pesaje", counts.weighing_due, Scale, "text-blue-500", "bg-blue-500/10"],
            ] as const
          ).map(([label, value, Icon, color, bg]) => (
            <div
              key={label}
              className="bg-card border-border hover:border-foreground/20 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
              >
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <div className="text-foreground/60 text-xs">{label}</div>
                <div className="text-foreground text-2xl font-bold tabular-nums">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="text-foreground/40 h-4 w-4" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="border-border bg-background text-foreground focus:border-primary rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="all">Todos los tipos</option>
            {(Object.keys(TYPE_LABEL) as AlertRow["type"][]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border-border bg-background text-foreground focus:border-primary rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(STATUS_LABEL) as AlertRow["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="bg-card border-border rounded-2xl border">
          {alertsQuery.isLoading ? (
            <SkeletonList rows={5} />
          ) : (alertsQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <BellRing className="text-foreground/20 h-10 w-10" />
              <p className="text-foreground/50 text-sm">Sin alertas con esos filtros</p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {pagedAlerts.map((alert) => {
                const Icon = TYPE_ICON[alert.type];
                const overdue = new Date(alert.due_at).getTime() < Date.now();
                const isActive = alert.status === "open" || alert.status === "acknowledged";
                const chip =
                  overdue && isActive
                    ? { bg: "bg-red-500/10", text: "text-red-500" }
                    : TYPE_COLOR[alert.type];
                const rowBusy = setStatus.isPending && setStatus.variables?.id === alert.id;
                return (
                  <li
                    key={alert.id}
                    className={`hover:bg-muted/30 relative flex items-center gap-4 px-6 py-4 transition-colors ${
                      overdue && isActive
                        ? "before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-red-500"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${chip.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-sm font-semibold">
                          {TYPE_LABEL[alert.type]}
                        </span>
                        {alert.animals && (
                          <span className="text-foreground/60 text-xs">
                            {alert.animals.name ?? alert.animals.tag}
                            <span className="text-foreground/40"> · {alert.animals.tag}</span>
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_BADGE[alert.status]}`}
                        >
                          {STATUS_LABEL[alert.status]}
                        </span>
                      </div>
                      <p className="text-foreground/50 mt-1 text-xs">
                        <span className={overdue && isActive ? "font-medium text-red-500" : ""}>
                          {overdue && isActive ? "Vencida" : "Vence"}:{" "}
                          <strong className="font-semibold">{formatDate(alert.due_at)}</strong>
                        </span>
                        {alert.payload?.last_weighing_at && (
                          <> · Último pesaje {formatDate(String(alert.payload.last_weighing_at))}</>
                        )}
                        {alert.payload?.last_applied_at && (
                          <>
                            {" "}
                            · Última aplicación {formatDate(String(alert.payload.last_applied_at))}
                          </>
                        )}
                      </p>
                    </div>
                    {alert.status === "open" && canEdit && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => setStatus.mutate({ id: alert.id, status: "acknowledged" })}
                          disabled={setStatus.isPending}
                          title="Reconocer"
                          className="border-border text-foreground/70 inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50"
                        >
                          {rowBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setStatus.mutate({ id: alert.id, status: "dismissed" })}
                          disabled={setStatus.isPending}
                          title="Descartar"
                          className="border-border hover:bg-muted text-foreground/70 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
                        >
                          {rowBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                          Descartar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {(alertsQuery.data ?? []).length > 0 && (
            <div className="px-6 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onChange={setPage}
                noun="alerta"
              />
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
