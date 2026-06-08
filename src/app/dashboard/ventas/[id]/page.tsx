"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Receipt,
  User,
  Beef,
  BadgeCheck,
  XCircle,
  Scale,
  CreditCard,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";

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
  escrow_status: "none" | "created" | "funded" | "released" | "refunded" | "failed";
  escrow_token: string | null;
  escrow_amount: string | null;
  escrow_buyer: string | null;
  escrow_seller: string | null;
  conditions_hash: string | null;
  escrow_deadline: string | null;
  escrow_create_tx: string | null;
  escrow_release_tx: string | null;
  escrow_refund_tx: string | null;
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

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://amoy.polygonscan.com";

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

const ESCROW_CLS: Record<string, string> = {
  none: "bg-muted text-foreground/50",
  created: "bg-amber-500/15 text-amber-600",
  funded: "bg-blue-500/15 text-blue-600",
  released: "bg-emerald-500/15 text-emerald-600",
  refunded: "bg-orange-500/15 text-orange-600",
  failed: "bg-red-500/15 text-red-500",
};

const ESCROW_LABEL: Record<string, string> = {
  none: "Sin contrato",
  created: "Contrato creado",
  funded: "Fondos depositados",
  released: "Pago liberado automáticamente",
  refunded: "Reembolsado",
  failed: "Error",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function txLink(hash: string | null) {
  if (!hash) return null;
  return `${EXPLORER}/tx/${hash}`;
}

function HashRow({ label, value, link }: { label: string; value: string; link?: string | null }) {
  const short = value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1 font-mono hover:underline"
        >
          {short} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-foreground font-mono">{short}</span>
      )}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useSupabase();
  const { getAccessToken } = usePrivy();
  const qc = useQueryClient();

  const [buyer, setBuyer] = useState("");
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(7);

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
          escrow_status, escrow_token, escrow_amount, escrow_buyer, escrow_seller,
          conditions_hash, escrow_deadline,
          escrow_create_tx, escrow_release_tx, escrow_refund_tx,
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale", id] }),
  });

  const escrowAction = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/sales/${id}/escrow/action`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Error en escrow");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale", id] }),
  });

  const sale = saleQuery.data;

  if (saleQuery.isLoading || !sale) {
    return (
      <DashboardShell title="Cargando venta…">
        <div className="flex items-center gap-3 py-16">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Cargando…</span>
        </div>
      </DashboardShell>
    );
  }

  const totalWeight = sale.sale_items.reduce((s, i) => s + (i.weight_kg ?? 0), 0);
  const escrow = sale.escrow_status;

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
                    {(statusMutation.error as Error).message}
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

          {/* Escrow */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-foreground flex items-center gap-2 text-base font-bold">
                  <Receipt className="text-primary h-4 w-4" /> Pago automatizado
                </h3>
                <p className="text-foreground/40 text-xs mt-0.5">Contrato inteligente · Polygon</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESCROW_CLS[escrow] ?? "bg-muted"}`}
              >
                {ESCROW_LABEL[escrow] ?? escrow}
              </span>
            </div>

            {escrow === "none" && (
              <div className="space-y-3">
                <div className="bg-muted/30 border-border rounded-xl border p-3 space-y-1.5 text-xs">
                  <p className="text-foreground/70 font-medium">¿Cómo funciona?</p>
                  <ol className="text-foreground/50 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>
                      El <strong className="text-foreground/70">comprador</strong> deposita el monto
                      en el contrato
                    </li>
                    <li>El contrato verifica el historial sanitario del animal on-chain</li>
                    <li>
                      El pago se{" "}
                      <strong className="text-foreground/70">libera automáticamente</strong> al
                      vendedor cuando las condiciones se cumplen
                    </li>
                  </ol>
                </div>
                <input
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="0x… wallet del comprador"
                  className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-xs"
                />
                <input
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  placeholder="0x… wallet del vendedor (finca)"
                  className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Monto (USDC 6 dec)"
                    className="border-border bg-background text-foreground flex-1 rounded-lg border px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border-border bg-background text-foreground w-16 rounded-lg border px-2 py-2 text-xs"
                  />
                  <span className="text-muted-foreground self-center text-xs">días</span>
                </div>
                <button
                  type="button"
                  disabled={!buyer || !seller || !amount || escrowAction.isPending}
                  onClick={() =>
                    escrowAction.mutate({
                      action: "create",
                      buyer,
                      seller,
                      amount,
                      deadline_seconds: days * 86400,
                    })
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {escrowAction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Crear contrato de pago"
                  )}
                </button>
              </div>
            )}

            {escrow !== "none" && (
              <div className="divide-border divide-y">
                {sale.escrow_buyer && <HashRow label="Comprador" value={sale.escrow_buyer} />}
                {sale.escrow_seller && <HashRow label="Vendedor" value={sale.escrow_seller} />}
                {sale.escrow_amount && (
                  <HashRow label="Monto" value={`${sale.escrow_amount} (raw)`} />
                )}
                {sale.conditions_hash && (
                  <HashRow label="Hash condiciones" value={sale.conditions_hash} />
                )}
                {sale.escrow_deadline && (
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="text-foreground">
                      {new Date(sale.escrow_deadline).toLocaleString("es-VE")}
                    </span>
                  </div>
                )}
                {sale.escrow_create_tx && (
                  <HashRow
                    label="Tx create"
                    value={sale.escrow_create_tx}
                    link={txLink(sale.escrow_create_tx)}
                  />
                )}
                {sale.escrow_release_tx && (
                  <HashRow
                    label="Tx release"
                    value={sale.escrow_release_tx}
                    link={txLink(sale.escrow_release_tx)}
                  />
                )}
                {sale.escrow_refund_tx && (
                  <HashRow
                    label="Tx refund"
                    value={sale.escrow_refund_tx}
                    link={txLink(sale.escrow_refund_tx)}
                  />
                )}
              </div>
            )}

            {escrow === "created" && (
              <div className="border-amber-500/30 bg-amber-500/5 mt-3 rounded-xl border border-dashed p-3 text-xs space-y-1">
                <p className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Esperando depósito del comprador
                </p>
                <p className="text-foreground/50">
                  El comprador debe depositar los fondos en el contrato desde su wallet para activar
                  la custodia automática.
                </p>
              </div>
            )}

            {(escrow === "created" || escrow === "funded") && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  disabled={escrowAction.isPending}
                  onClick={() => escrowAction.mutate({ action: "release" })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-600/90 disabled:opacity-50"
                >
                  {escrowAction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Verificar condiciones y liberar pago
                </button>
                <button
                  type="button"
                  disabled={escrowAction.isPending}
                  onClick={() => escrowAction.mutate({ action: "refund" })}
                  className="border-destructive/30 text-destructive hover:bg-destructive/5 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Reembolsar al comprador (tras vencimiento)
                </button>
              </div>
            )}

            {escrowAction.isError && (
              <p className="mt-2 text-xs text-red-500">{(escrowAction.error as Error).message}</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
