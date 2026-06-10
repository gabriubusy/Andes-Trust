"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, PackageX, Plus, Receipt, TrendingUp, User } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { SkeletonCard } from "@/components/ui/Skeleton";

// ─── types ────────────────────────────────────────────────────────────────────

type SaleRow = {
  id: string;
  sold_at: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  invoice_number: string | null;
  buyers: { name: string } | null;
  _item_count: number;
};

type RawRow = Omit<SaleRow, "_item_count"> & {
  sale_items: { id: string }[];
};

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  paid: "Cobrada",
  cancelled: "Cancelada",
};

const STATUS_CLS: Record<string, string> = {
  draft: "bg-muted text-foreground/60",
  confirmed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/15 text-red-500",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  crypto: "Crypto",
  escrow: "Contrato inteligente",
};

type Filter = "all" | "confirmed" | "paid" | "draft" | "cancelled";

// ─── component ────────────────────────────────────────────────────────────────

export default function VentasPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [filter, setFilter] = useState<Filter>("all");

  const salesQuery = useQuery<SaleRow[]>({
    queryKey: ["sales", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("sales")
        .select(
          "id, sold_at, total_amount, currency, status, payment_method, invoice_number, buyers(name), sale_items(id)"
        )
        .eq("farm_id", farmId!)
        .order("sold_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as unknown as RawRow[]).map((r) => ({
        ...r,
        _item_count: r.sale_items?.length ?? 0,
      }));
    },
  });

  const all = salesQuery.data ?? [];

  // ── stats ──
  const confirmed = all.filter((s) => s.status === "confirmed");
  const paid = all.filter((s) => s.status === "paid");
  const totalRevenue = paid.reduce((s, r) => s + r.total_amount, 0);
  const pendingAmount = confirmed.reduce((s, r) => s + r.total_amount, 0);

  // ── filter ──
  const visible = filter === "all" ? all : all.filter((s) => s.status === (filter as string));

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "confirmed", label: "Confirmadas" },
    { id: "paid", label: "Cobradas" },
    { id: "draft", label: "Borradores" },
    { id: "cancelled", label: "Canceladas" },
  ];

  return (
    <DashboardShell
      title="Ventas y compras"
      subtitle="Cadena de suministro · Pagos automatizados"
      action={
        <Link
          href="/dashboard/ventas/nuevo"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Registrar operación
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Receipt}
          label="Total operaciones"
          value={all.length.toString()}
          sub={`${confirmed.length} confirmadas`}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Ingresos cobrados"
          value={`$${totalRevenue.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
          sub={`${paid.length} operaciones cobradas`}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={PackageX}
          label="Pendiente de cobro"
          value={`$${pendingAmount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
          sub={`${confirmed.length} operaciones por cobrar`}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Filter tabs */}
      <div className="border-border flex gap-1 overflow-x-auto border-b">
        {filters.map((f) => {
          const count = f.id === "all" ? all.length : all.filter((s) => s.status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="bg-muted text-foreground/50 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {salesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-card border-border rounded-2xl border p-12 text-center">
          <Receipt className="text-muted-foreground/20 mx-auto mb-4 h-12 w-12" />
          <p className="text-foreground/60 text-sm">
            {filter === "all"
              ? "Aún no hay ventas registradas."
              : `No hay ventas con estado "${STATUS_LABEL[filter] ?? filter}".`}
          </p>
          <Link
            href="/dashboard/ventas/nuevo"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Registrar primera venta
          </Link>
        </div>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          {/* Table header */}
          <div className="border-border hidden grid-cols-[1fr_160px_120px_110px_120px_40px] items-center gap-4 border-b px-5 py-3 md:grid">
            {["Comprador", "Animales", "Total", "Pago", "Estado", ""].map((h) => (
              <span
                key={h}
                className="text-foreground/40 text-xs font-semibold tracking-wider uppercase"
              >
                {h}
              </span>
            ))}
          </div>

          <ul className="divide-border divide-y">
            {visible.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/dashboard/ventas/${sale.id}`}
                  className="hover:bg-muted/30 grid items-center gap-4 px-5 py-4 transition-colors md:grid-cols-[1fr_160px_120px_110px_120px_40px]"
                >
                  {/* Comprador */}
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <User className="text-primary h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-foreground truncate font-medium">
                        {sale.buyers?.name ?? "Sin comprador"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(sale.sold_at).toLocaleDateString("es-VE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {sale.invoice_number && (
                          <span className="ml-1 opacity-60">· {sale.invoice_number}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Animales */}
                  <span className="text-muted-foreground hidden text-sm md:block">
                    {sale._item_count} animal{sale._item_count !== 1 ? "es" : ""}
                  </span>

                  {/* Total */}
                  <span className="text-foreground hidden font-semibold md:block">
                    ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      {sale.currency}
                    </span>
                  </span>

                  {/* Pago */}
                  <span className="text-muted-foreground hidden text-xs md:block">
                    {sale.payment_method
                      ? (PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method)
                      : "—"}
                  </span>

                  {/* Estado */}
                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline-flex md:items-center ${STATUS_CLS[sale.status] ?? "bg-muted text-foreground/60"}`}
                  >
                    {STATUS_LABEL[sale.status] ?? sale.status}
                  </span>

                  {/* Mobile total + status */}
                  <div className="flex items-center justify-between md:hidden">
                    <span className="text-foreground font-semibold">
                      ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[sale.status] ?? "bg-muted text-foreground/60"}`}
                    >
                      {STATUS_LABEL[sale.status] ?? sale.status}
                    </span>
                  </div>

                  <ChevronRight className="text-muted-foreground/40 hidden h-4 w-4 md:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-card border-border rounded-2xl border p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <p className="text-foreground text-xl font-bold">{value}</p>
          <p className="text-muted-foreground text-xs">{sub}</p>
        </div>
      </div>
    </div>
  );
}
