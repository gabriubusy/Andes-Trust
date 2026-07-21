"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Receipt,
  Download,
  User,
  Beef,
  BadgeCheck,
  XCircle,
  Scale,
  CreditCard,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

// ─── types ────────────────────────────────────────────────────────────────────

type SaleItem = {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  weight_kg: number | null;
  animals: { id: string; tag: string; name: string | null } | null;
};

type Sale = {
  id: string;
  farm_id: string;
  sold_at: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  invoice_number: string | null;
  notes: string | null;
  buyers: {
    id: string;
    name: string;
    legal_id: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  sale_items: SaleItem[];
};

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  draft: "bg-muted text-foreground/60",
  confirmed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/15 text-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  paid: "Cobrada",
  cancelled: "Cancelada",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  crypto: "Criptomoneda",
  escrow: "Contrato inteligente",
};

// ─── component ───────────────────────────────────────────────────────────────

export default function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useSupabase();
  const { getAccessToken } = usePrivy();
  const qc = useQueryClient();

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const saleQuery = useQuery<Sale>({
    queryKey: ["sale", id],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("sales")
        .select(
          `
          id, farm_id, sold_at, total_amount, currency, status, payment_method,
          invoice_number, notes,
          buyers(id, name, legal_id, phone, email),
          sale_items(id, description, quantity, unit_price, weight_kg, animals(id, tag, name))
        `
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Sale;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase!
        .from("sales")
        .update({ status: newStatus as "draft" | "confirmed" | "paid" | "cancelled" })
        .eq("id", id);
      if (error) throw error;

      // Al cancelar la venta, los animales vuelven a estar disponibles (activos).
      if (newStatus === "cancelled") {
        const animalIds = (saleQuery.data?.sale_items ?? [])
          .map((it) => (Array.isArray(it.animals) ? it.animals[0]?.id : it.animals?.id))
          .filter((x): x is string => !!x);
        if (animalIds.length > 0) {
          const { error: revertError } = await supabase!
            .from("animals")
            .update({ status: "active" })
            .in("id", animalIds)
            .eq("status", "sold");
          if (revertError) throw revertError;
        }
      }
    },
    onSuccess: (_data, newStatus) => {
      qc.invalidateQueries({ queryKey: ["sale", id] });
      if (newStatus === "cancelled") {
        qc.invalidateQueries({ queryKey: ["animals"] });
      }
    },
  });

  async function downloadInvoice() {
    setDownloadingInvoice(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/reports/factura", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sale_id: id }),
      });
      if (!res.ok) throw new Error("Error generando la factura");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(friendlyErrorMessage(e));
    } finally {
      setDownloadingInvoice(false);
    }
  }

  const sale = saleQuery.data;

  if (!supabase || saleQuery.isPending) {
    return (
      <DashboardShell title="Cargando venta…">
        <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_380px]">
          {/* Columna izquierda */}
          <div className="space-y-5">
            {/* Cabecera */}
            <div className="bg-card border-border rounded-2xl border p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="bg-muted/50 h-6 w-24 rounded-full" />
                  <div className="bg-muted/40 h-3 w-40 rounded-full" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="bg-muted/60 ml-auto h-7 w-32 rounded-full" />
                  <div className="bg-muted/40 ml-auto h-3 w-20 rounded-full" />
                </div>
              </div>
            </div>
            {/* Lista de animales */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
              <div className="bg-muted/60 h-4 w-32 rounded-full" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-muted/50 h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted/50 h-3.5 w-40 rounded-full" />
                    <div className="bg-muted/40 h-3 w-24 rounded-full" />
                  </div>
                  <div className="bg-muted/40 h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          {/* Columna derecha */}
          <div className="bg-card border-border h-fit space-y-4 rounded-2xl border p-6">
            <div className="bg-muted/60 h-4 w-40 rounded-full" />
            <div className="bg-muted/40 h-3 w-full rounded-full" />
            <div className="bg-muted/40 h-3 w-2/3 rounded-full" />
            <div className="bg-muted/50 h-10 w-full rounded-xl" />
            <div className="bg-muted/40 h-10 w-full rounded-xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  // La query terminó pero no hay venta: error de carga o la venta no existe.
  if (saleQuery.isError || !sale) {
    return (
      <DashboardShell title="Venta no disponible">
        <div className="bg-card border-border rounded-2xl border p-10 text-center">
          <XCircle className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
          <p className="text-foreground mb-1 text-sm font-medium">
            No se pudo cargar el detalle de la venta
          </p>
          <p className="text-foreground/60 mb-6 text-sm">
            {saleQuery.isError
              ? friendlyErrorMessage(saleQuery.error, {
                  fallback: "Ocurrió un error al consultar la venta.",
                })
              : "La venta no existe o no tienes acceso a ella."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => saleQuery.refetch()}
              disabled={saleQuery.isFetching}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saleQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              Reintentar
            </button>
            <Link
              href="/dashboard/ventas"
              className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a ventas
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const totalWeight = sale.sale_items.reduce((s, i) => s + (i.weight_kg ?? 0), 0);

  return (
    <DashboardShell
      title={sale.buyers?.name ?? "Venta sin comprador"}
      subtitle={new Date(sale.sold_at).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}
      action={
        <Link
          href="/dashboard/ventas"
          className="text-foreground/60 hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Columna izquierda ── */}
        <div className="space-y-5">
          {/* Cabecera de la venta */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[sale.status] ?? "bg-muted"}`}
                  >
                    {STATUS_LABEL[sale.status] ?? sale.status}
                  </span>
                  {sale.invoice_number && (
                    <span className="text-muted-foreground text-xs">
                      Factura: {sale.invoice_number}
                    </span>
                  )}
                </div>
                <p className="text-foreground/60 text-sm">
                  {sale.sale_items.length} animal{sale.sale_items.length !== 1 ? "es" : ""}
                  {totalWeight > 0 && ` · ${totalWeight.toFixed(1)} kg total`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-foreground text-2xl font-bold">
                  ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    {sale.currency}
                  </span>
                </p>
                {sale.payment_method && (
                  <p className="text-muted-foreground text-xs">
                    {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones de estado */}
            {(sale.status === "confirmed" || sale.status === "draft") && (
              <div className="border-border mt-4 flex flex-wrap gap-2 border-t pt-4">
                {sale.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("paid")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600/90 disabled:opacity-60"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Marcar como cobrada
                  </button>
                )}
                {sale.status === "draft" && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("confirmed")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Confirmar venta
                  </button>
                )}
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    if (confirm("¿Cancelar esta venta?")) statusMutation.mutate("cancelled");
                  }}
                  className="border-border text-foreground/60 hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancelar
                </button>
                {statusMutation.isError && (
                  <p className="text-destructive w-full text-xs">
                    {friendlyErrorMessage(statusMutation.error)}
                  </p>
                )}
              </div>
            )}

            {sale.notes && <p className="text-muted-foreground mt-3 text-sm">{sale.notes}</p>}
          </div>

          {/* Animales */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-4 flex items-center gap-2 text-base font-bold">
              <Beef className="text-primary h-4 w-4" /> Animales vendidos
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground pb-2 text-left text-xs font-semibold tracking-wider uppercase">
                      Arete
                    </th>
                    <th className="text-muted-foreground pb-2 text-left text-xs font-semibold tracking-wider uppercase">
                      Descripción
                    </th>
                    <th className="text-muted-foreground pb-2 text-right text-xs font-semibold tracking-wider uppercase">
                      Peso
                    </th>
                    <th className="text-muted-foreground pb-2 text-right text-xs font-semibold tracking-wider uppercase">
                      P. Unit.
                    </th>
                    <th className="text-muted-foreground pb-2 text-right text-xs font-semibold tracking-wider uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {sale.sale_items.map((item) => (
                    <tr key={item.id} className="text-sm">
                      <td className="py-2.5 pr-3">
                        {item.animals ? (
                          <Link
                            href={`/dashboard/animales/${item.animals.id}`}
                            className="text-primary font-mono font-semibold hover:underline"
                          >
                            {item.animals.tag}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-3">
                        {item.animals?.name ?? item.description ?? "—"}
                      </td>
                      <td className="text-muted-foreground py-2.5 text-right">
                        {item.weight_kg ? `${item.weight_kg} kg` : "—"}
                      </td>
                      <td className="text-foreground py-2.5 text-right">
                        ${item.unit_price.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-foreground py-2.5 text-right font-semibold">
                        $
                        {(item.quantity * item.unit_price).toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-border border-t">
                    <td colSpan={3} className="pt-3" />
                    <td className="text-muted-foreground pt-3 text-right text-xs font-semibold tracking-wider uppercase">
                      Total
                    </td>
                    <td className="text-primary pt-3 text-right text-base font-bold">
                      ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-5">
          {/* Comprador */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-4 flex items-center gap-2 text-base font-bold">
              <User className="text-primary h-4 w-4" /> Comprador
            </h3>
            {sale.buyers ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nombre</dt>
                  <dd className="text-foreground font-medium">{sale.buyers.name}</dd>
                </div>
                {sale.buyers.legal_id && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">RIF / Cédula</dt>
                    <dd className="text-foreground font-mono text-xs">{sale.buyers.legal_id}</dd>
                  </div>
                )}
                {sale.buyers.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd className="text-foreground">{sale.buyers.phone}</dd>
                  </div>
                )}
                {sale.buyers.email && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-foreground text-xs">{sale.buyers.email}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">Sin comprador registrado.</p>
            )}
          </div>

          {/* Resumen financiero */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-4 flex items-center gap-2 text-base font-bold">
              <CreditCard className="text-primary h-4 w-4" /> Resumen financiero
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Animales</dt>
                <dd className="text-foreground">{sale.sale_items.length}</dd>
              </div>
              {totalWeight > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Scale className="h-3 w-3" /> Peso total
                  </dt>
                  <dd className="text-foreground">{totalWeight.toFixed(1)} kg</dd>
                </div>
              )}
              {totalWeight > 0 && sale.total_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Precio / kg</dt>
                  <dd className="text-foreground">
                    ${(sale.total_amount / totalWeight).toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="border-border flex justify-between border-t pt-2">
                <dt className="text-foreground font-semibold">Total</dt>
                <dd className="text-primary text-base font-bold">
                  ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                  {sale.currency}
                </dd>
              </div>
            </dl>
          </div>

          {/* Facturas */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-1 flex items-center gap-2 text-base font-bold">
              <Receipt className="text-primary h-4 w-4" /> Factura
            </h3>
            <p className="text-foreground/40 mb-4 text-xs">
              {sale.invoice_number
                ? `N° ${sale.invoice_number}`
                : "Genera un PDF con el detalle de esta venta"}
            </p>
            <button
              type="button"
              disabled={downloadingInvoice}
              onClick={downloadInvoice}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {downloadingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar factura (PDF)
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
