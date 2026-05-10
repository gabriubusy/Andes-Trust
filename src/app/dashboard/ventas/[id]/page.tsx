"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Receipt, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";

type Sale = {
  id: string;
  farm_id: string;
  sold_at: string;
  total_amount: number;
  currency: string;
  status: string;
  notes: string | null;
  escrow_status: "none" | "created" | "funded" | "released" | "refunded" | "failed";
  escrow_token: string | null;
  escrow_amount: string | null;
  escrow_buyer: string | null;
  escrow_seller: string | null;
  conditions_hash: string | null;
  payload_hash: string | null;
  escrow_deadline: string | null;
  escrow_create_tx: string | null;
  escrow_release_tx: string | null;
  escrow_refund_tx: string | null;
  buyers: { name: string } | null;
  sale_items: {
    id: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    animals: { tag: string; name: string | null } | null;
  }[];
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://amoy.polygonscan.com";

function txLink(hash: string | null) {
  if (!hash) return null;
  return `${EXPLORER}/tx/${hash}`;
}

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
          id, farm_id, sold_at, total_amount, currency, status, notes,
          escrow_status, escrow_token, escrow_amount, escrow_buyer, escrow_seller,
          conditions_hash, payload_hash, escrow_deadline,
          escrow_create_tx, escrow_release_tx, escrow_refund_tx,
          buyers(name),
          sale_items(id, description, quantity, unit_price, animals(tag, name))
        `
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Sale;
    },
  });

  const action = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/sales/${id}/escrow/action`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "fail");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sale", id] }),
  });

  const sale = saleQuery.data;
  if (!sale) {
    return (
      <DashboardShell title="Venta">
        <div className="py-16 text-center text-sm">Cargando…</div>
      </DashboardShell>
    );
  }

  const escrowStatus = sale.escrow_status;

  return (
    <DashboardShell
      title={`Venta — ${sale.buyers?.name ?? "Sin comprador"}`}
      subtitle={new Date(sale.sold_at).toLocaleDateString("es-VE")}
      action={
        <Link
          href="/dashboard/ventas"
          className="text-foreground/60 hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Datos */}
        <div className="space-y-4">
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-3 flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-4 w-4" /> Detalles
            </h3>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-foreground/60">Total</dt>
              <dd className="text-foreground font-medium">
                {sale.total_amount} {sale.currency}
              </dd>
              <dt className="text-foreground/60">Estado</dt>
              <dd className="text-foreground">{sale.status}</dd>
              <dt className="text-foreground/60">Items</dt>
              <dd>{sale.sale_items.length}</dd>
            </dl>
            {sale.notes && <p className="text-foreground/60 mt-2 text-xs">{sale.notes}</p>}
          </div>

          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-3 text-base font-semibold">Animales</h3>
            <ul className="divide-border divide-y">
              {sale.sale_items.map((it) => (
                <li key={it.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {it.animals?.tag ?? it.description ?? "Item"}
                    {it.animals?.name && (
                      <span className="text-foreground/50"> · {it.animals.name}</span>
                    )}
                  </span>
                  <span className="text-foreground/60">
                    {it.quantity} × {it.unit_price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Escrow */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <h3 className="text-foreground mb-4 flex items-center gap-2 text-base font-semibold">
            Escrow on-chain
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                escrowStatus === "released"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : escrowStatus === "refunded"
                    ? "bg-orange-500/15 text-orange-600"
                    : escrowStatus === "created" || escrowStatus === "funded"
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-muted text-foreground/60"
              }`}
            >
              {escrowStatus}
            </span>
          </h3>

          {escrowStatus === "none" && (
            <div className="space-y-3 text-sm">
              <p className="text-foreground/60 text-xs">
                Crea el escrow con direcciones del comprador y vendedor.
              </p>
              <input
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="0x… buyer"
                className="border-border bg-background w-full rounded-lg border px-3 py-2 text-xs"
              />
              <input
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder="0x… seller"
                className="border-border bg-background w-full rounded-lg border px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="amount (mUSDC, 6 dec)"
                  className="border-border bg-background flex-1 rounded-lg border px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="border-border bg-background w-20 rounded-lg border px-3 py-2 text-xs"
                />
                <span className="text-foreground/50 self-center text-xs">días</span>
              </div>
              <button
                disabled={!buyer || !seller || !amount || action.isPending}
                onClick={() =>
                  action.mutate({
                    action: "create",
                    buyer,
                    seller,
                    amount,
                    deadline_seconds: days * 86400,
                  })
                }
                className="bg-primary hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {action.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear escrow"}
              </button>
            </div>
          )}

          {escrowStatus !== "none" && (
            <dl className="space-y-2 text-xs">
              {sale.escrow_buyer && <Row label="Buyer" value={sale.escrow_buyer} />}
              {sale.escrow_seller && <Row label="Seller" value={sale.escrow_seller} />}
              {sale.escrow_amount && <Row label="Amount" value={`${sale.escrow_amount} (raw)`} />}
              {sale.conditions_hash && (
                <Row label="Cond. hash" value={sale.conditions_hash} truncate />
              )}
              {sale.escrow_deadline && (
                <Row
                  label="Deadline"
                  value={new Date(sale.escrow_deadline).toLocaleString("es-VE")}
                />
              )}
              {sale.escrow_create_tx && (
                <Row
                  label="Tx create"
                  value={sale.escrow_create_tx}
                  link={txLink(sale.escrow_create_tx)!}
                />
              )}
              {sale.escrow_release_tx && (
                <Row
                  label="Tx release"
                  value={sale.escrow_release_tx}
                  link={txLink(sale.escrow_release_tx)!}
                />
              )}
              {sale.escrow_refund_tx && (
                <Row
                  label="Tx refund"
                  value={sale.escrow_refund_tx}
                  link={txLink(sale.escrow_refund_tx)!}
                />
              )}
            </dl>
          )}

          {escrowStatus === "created" && (
            <div className="border-border mt-4 rounded-lg border border-dashed p-3 text-xs">
              <AlertCircle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
              El comprador debe llamar <code>fundEscrow(saleId)</code> desde su wallet (con
              `approve` previo del USDC). Luego ejecuta &quot;Liberar pago&quot; aquí.
            </div>
          )}

          {(escrowStatus === "created" || escrowStatus === "funded") && (
            <button
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "release" })}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-600/90 disabled:opacity-50"
            >
              {action.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Anclar y liberar pago
            </button>
          )}

          {(escrowStatus === "created" || escrowStatus === "funded") && (
            <button
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "refund" })}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10 disabled:opacity-50"
            >
              Refund (tras deadline)
            </button>
          )}

          {action.isError && (
            <p className="mt-2 text-xs text-red-500">{(action.error as Error).message}</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Row({
  label,
  value,
  truncate,
  link,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  link?: string;
}) {
  const display =
    truncate || value.length > 30 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-foreground/50 shrink-0">{label}</dt>
      <dd className="text-right font-mono break-all">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {display}
          </a>
        ) : (
          display
        )}
      </dd>
    </div>
  );
}
