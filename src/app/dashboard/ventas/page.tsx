"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  PackageX,
  Plus,
  Receipt,
  TrendingUp,
  User,
  TrendingDown,
  ShoppingCart,
  X,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { toast } from "sonner";

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

type RawSaleRow = Omit<SaleRow, "_item_count"> & { sale_items: { id: string }[] };

type PurchaseRow = {
  id: string;
  seller_name: string;
  purchased_at: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  invoice_number: string | null;
  notes: string | null;
  _item_count: number;
};

type RawPurchaseRow = Omit<PurchaseRow, "_item_count"> & { purchase_items: { id: string }[] };

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  paid: "Pagada",
  cancelled: "Cancelada",
};

const STATUS_CLS: Record<string, string> = {
  draft: "bg-muted text-foreground/60",
  confirmed: "bg-blue-500/15 text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  crypto: "Crypto",
  escrow: "Contrato inteligente",
};

type SaleFilter = "all" | "confirmed" | "paid" | "draft" | "cancelled";
type Mode = "sales" | "purchases";

// ─── Purchase modal ───────────────────────────────────────────────────────────

type PurchaseItem = {
  animal_id: string | null;
  description: string;
  quantity: number;
  price_per_unit: string;
};

type AnimalOption = { id: string; tag: string; name: string | null };

function PurchaseModal({
  farmId,
  supabase,
  onClose,
  onDone,
}: {
  farmId: string;
  supabase: ReturnType<typeof useSupabase>["supabase"];
  onClose: () => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [sellerName, setSellerName] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(today);
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([
    { animal_id: null, description: "", quantity: 1, price_per_unit: "" },
  ]);

  // Animals available to link (not already sold)
  const animalsQuery = useQuery<AnimalOption[]>({
    queryKey: ["animals-for-purchase", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId)
        .order("tag");
      if (error) throw error;
      return (data ?? []) as AnimalOption[];
    },
  });

  const totalAmount = items.reduce(
    (sum, it) => sum + it.quantity * (parseFloat(it.price_per_unit) || 0),
    0
  );

  // All items have a linked animal → auto-pay label
  const allLinked = items.length > 0 && items.every((it) => !!it.animal_id);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { animal_id: null, description: "", quantity: 1, price_per_unit: "" },
    ]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = <K extends keyof PurchaseItem>(i: number, key: K, val: PurchaseItem[K]) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const mutation = useMutation({
    mutationFn: async () => {
      // Insert purchase header
      const { data: purchase, error: pErr } = await supabase!
        .from("purchases")
        .insert({
          farm_id: farmId,
          seller_name: sellerName.trim(),
          purchased_at: purchasedAt,
          total_amount: totalAmount,
          currency,
          payment_method: paymentMethod || null,
          invoice_number: invoiceNumber.trim() || null,
          notes: notes.trim() || null,
          // auto-paid if all items are linked; else confirmed
          status: allLinked ? "paid" : "confirmed",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // Insert items
      const itemRows = items
        .filter((it) => it.animal_id || it.description.trim())
        .map((it) => ({
          purchase_id: purchase.id,
          animal_id: it.animal_id || null,
          description: it.description.trim() || null,
          quantity: it.quantity,
          price_per_unit: parseFloat(it.price_per_unit) || 0,
        }));

      if (itemRows.length > 0) {
        const { error: iErr } = await supabase!.from("purchase_items").insert(itemRows);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => {
      toast.success("Compra registrada");
      onDone();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const inputCls =
    "border-border bg-background text-foreground focus:border-primary w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-foreground/30";
  const labelCls = "text-foreground/60 mb-1.5 block text-xs font-medium";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 flex h-8 w-8 items-center justify-center rounded-xl">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="text-foreground text-base font-bold">Registrar compra</h2>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Seller + date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Vendedor / Proveedor *</label>
              <input
                className={inputCls}
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Nombre del vendedor"
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Fecha de compra</label>
              <input
                type="date"
                max={today}
                className={inputCls}
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>N° factura / recibo</label>
              <input
                className={inputCls}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FAC-001"
              />
            </div>
          </div>

          {/* Currency + payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Moneda</label>
              <select
                className={inputCls}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD — Dólar</option>
                <option value="VES">VES — Bolívar</option>
                <option value="COP">COP — Peso colombiano</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                className={inputCls}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="check">Cheque</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Animales / ítems comprados</label>
              <button
                type="button"
                onClick={addItem}
                className="text-amber-500 hover:text-amber-400 text-xs font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="border-border bg-muted/20 rounded-xl border p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                    <div>
                      <label className={labelCls}>Animal (opcional)</label>
                      <select
                        className={inputCls}
                        value={item.animal_id ?? ""}
                        onChange={(e) => updateItem(i, "animal_id", e.target.value || null)}
                      >
                        <option value="">— sin vincular —</option>
                        {animalsQuery.data?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.tag}
                            {a.name ? ` · ${a.name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="mt-5 text-foreground/30 hover:text-red-400 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className={labelCls}>Descripción</label>
                      <input
                        className={inputCls}
                        placeholder="Novillo, vaca, etc."
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className={inputCls}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Precio / unidad</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`${inputCls} pl-7`}
                          placeholder="0.00"
                          value={item.price_per_unit}
                          onChange={(e) => updateItem(i, "price_per_unit", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total auto-calculated */}
          <div className="bg-muted/30 border-border rounded-xl border px-4 py-3 flex items-center justify-between">
            <span className="text-foreground/60 text-sm">Monto total calculado</span>
            <span className="text-foreground font-bold text-lg">
              ${totalAmount.toLocaleString("es-VE", { minimumFractionDigits: 2 })} {currency}
            </span>
          </div>

          {allLinked && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400">
              Todos los animales están vinculados — la compra se marcará automáticamente como{" "}
              <strong>Pagada</strong>.
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones, observaciones, etc."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!sellerName.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-amber-500 hover:bg-amber-500/90 text-white inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar compra
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function VentasPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("tab") === "purchases" ? "purchases" : "sales"
  );
  const [filter, setFilter] = useState<SaleFilter>("all");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    setMode(tab === "purchases" ? "purchases" : "sales");
  }, [searchParams]);

  const switchMode = (m: Mode) => {
    setMode(m);
    router.replace(`/dashboard/ventas?tab=${m}`, { scroll: false });
  };

  // ── Sales query ──
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
      return ((data ?? []) as unknown as RawSaleRow[]).map((r) => ({
        ...r,
        _item_count: r.sale_items?.length ?? 0,
      }));
    },
  });

  // ── Purchases query ──
  const purchasesQuery = useQuery<PurchaseRow[]>({
    queryKey: ["purchases", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await (
        supabase as never as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (
                a: string,
                b: string
              ) => {
                order: (
                  a: string,
                  b: object
                ) => {
                  limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
                };
              };
            };
          };
        }
      )
        .from("purchases")
        .select(
          "id, seller_name, purchased_at, total_amount, currency, status, payment_method, invoice_number, notes, purchase_items(id)"
        )
        .eq("farm_id", farmId!)
        .order("purchased_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as unknown as RawPurchaseRow[]).map((r) => ({
        ...r,
        _item_count: r.purchase_items?.length ?? 0,
      }));
    },
  });

  const allSales = salesQuery.data ?? [];
  const allPurchases = purchasesQuery.data ?? [];

  // Sales stats
  const confirmedSales = allSales.filter((s) => s.status === "confirmed");
  const paidSales = allSales.filter((s) => s.status === "paid");
  const totalRevenue = paidSales.reduce((s, r) => s + r.total_amount, 0);
  const pendingAmount = confirmedSales.reduce((s, r) => s + r.total_amount, 0);

  // Purchases stats
  const totalSpent = allPurchases
    .filter((p) => p.status === "paid")
    .reduce((s, r) => s + r.total_amount, 0);
  const pendingPayment = allPurchases
    .filter((p) => p.status === "confirmed")
    .reduce((s, r) => s + r.total_amount, 0);

  const visibleSales =
    filter === "all" ? allSales : allSales.filter((s) => s.status === (filter as string));

  const saleFilters: { id: SaleFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "confirmed", label: "Confirmadas" },
    { id: "paid", label: "Cobradas" },
    { id: "draft", label: "Borradores" },
    { id: "cancelled", label: "Canceladas" },
  ];

  const fmt = (n: number, currency = "USD") =>
    `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2 })} ${currency}`;

  return (
    <DashboardShell
      title="Ventas y compras"
      subtitle="Cadena de suministro · Pagos automatizados"
      action={
        mode === "sales" ? (
          <Link
            href="/dashboard/ventas/nuevo"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Registrar venta
          </Link>
        ) : (
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="bg-amber-500 hover:bg-amber-500/90 text-white inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Registrar compra
          </button>
        )
      }
    >
      {/* ── Mode toggle ── */}
      <div className="flex gap-0 border border-border rounded-xl overflow-hidden w-fit">
        <button
          onClick={() => switchMode("sales")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all ${
            mode === "sales"
              ? "bg-primary text-white shadow-sm"
              : "bg-card text-foreground/50 hover:text-foreground hover:bg-muted"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Ventas
          {allSales.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mode === "sales" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"}`}
            >
              {allSales.length}
            </span>
          )}
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => switchMode("purchases")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all ${
            mode === "purchases"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-card text-foreground/50 hover:text-foreground hover:bg-muted"
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Compras
          {allPurchases.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mode === "purchases" ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-500"}`}
            >
              {allPurchases.length}
            </span>
          )}
        </button>
      </div>

      {/* ── VENTAS ── */}
      {mode === "sales" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Receipt}
              label="Total ventas"
              value={allSales.length.toString()}
              sub={`${confirmedSales.length} confirmadas`}
              color="text-blue-500"
              bg="bg-blue-500/10"
            />
            <StatCard
              icon={TrendingUp}
              label="Ingresos cobrados"
              value={fmt(totalRevenue)}
              sub={`${paidSales.length} operaciones cobradas`}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />
            <StatCard
              icon={PackageX}
              label="Pendiente de cobro"
              value={fmt(pendingAmount)}
              sub={`${confirmedSales.length} por cobrar`}
              color="text-amber-500"
              bg="bg-amber-500/10"
            />
          </div>

          <div className="border-border flex gap-1 overflow-x-auto border-b">
            {saleFilters.map((f) => {
              const count =
                f.id === "all" ? allSales.length : allSales.filter((s) => s.status === f.id).length;
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

          {salesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : visibleSales.length === 0 ? (
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
                {visibleSales.map((sale) => (
                  <li key={sale.id}>
                    <Link
                      href={`/dashboard/ventas/${sale.id}`}
                      className="hover:bg-muted/30 grid items-center gap-4 px-5 py-4 transition-colors md:grid-cols-[1fr_160px_120px_110px_120px_40px]"
                    >
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
                      <span className="text-muted-foreground hidden text-sm md:block">
                        {sale._item_count} animal{sale._item_count !== 1 ? "es" : ""}
                      </span>
                      <span className="text-foreground hidden font-semibold md:block">
                        ${sale.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          {sale.currency}
                        </span>
                      </span>
                      <span className="text-muted-foreground hidden text-xs md:block">
                        {sale.payment_method
                          ? (PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method)
                          : "—"}
                      </span>
                      <span
                        className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline-flex md:items-center ${STATUS_CLS[sale.status] ?? "bg-muted text-foreground/60"}`}
                      >
                        {STATUS_LABEL[sale.status] ?? sale.status}
                      </span>
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
        </>
      )}

      {/* ── COMPRAS ── */}
      {mode === "purchases" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={ShoppingCart}
              label="Total compras"
              value={allPurchases.length.toString()}
              sub={`${allPurchases.filter((p) => p.status === "confirmed").length} confirmadas`}
              color="text-amber-500"
              bg="bg-amber-500/10"
            />
            <StatCard
              icon={TrendingDown}
              label="Total gastado"
              value={fmt(totalSpent)}
              sub={`${allPurchases.filter((p) => p.status === "paid").length} operaciones pagadas`}
              color="text-red-400"
              bg="bg-red-500/10"
            />
            <StatCard
              icon={PackageX}
              label="Pendiente de pago"
              value={fmt(pendingPayment)}
              sub={`${allPurchases.filter((p) => p.status === "confirmed").length} por pagar`}
              color="text-violet-500"
              bg="bg-violet-500/10"
            />
          </div>

          {purchasesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : allPurchases.length === 0 ? (
            <div className="bg-card border-border rounded-2xl border p-12 text-center">
              <ShoppingCart className="text-foreground/10 mx-auto mb-4 h-12 w-12" />
              <p className="text-foreground/60 text-sm font-medium">No hay compras registradas</p>
              <p className="text-foreground/40 text-xs mt-1">
                Registra la adquisición de animales, insumos y otros gastos
              </p>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="bg-amber-500 hover:bg-amber-500/90 text-white mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Registrar primera compra
              </button>
            </div>
          ) : (
            <div className="bg-card border-border overflow-hidden rounded-2xl border">
              <div className="border-border hidden grid-cols-[1fr_120px_130px_110px_120px] items-center gap-4 border-b px-5 py-3 md:grid">
                {["Vendedor", "Animales", "Total", "Pago", "Estado"].map((h) => (
                  <span
                    key={h}
                    className="text-foreground/40 text-xs font-semibold tracking-wider uppercase"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <ul className="divide-border divide-y">
                {allPurchases.map((p) => (
                  <li
                    key={p.id}
                    className="hover:bg-muted/30 grid items-center gap-4 px-5 py-4 transition-colors md:grid-cols-[1fr_120px_130px_110px_120px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                        <User className="text-amber-500 h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate font-medium">{p.seller_name}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(p.purchased_at).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {p.invoice_number && (
                            <span className="ml-1 opacity-60">· {p.invoice_number}</span>
                          )}
                        </div>
                        {p.notes && (
                          <div className="text-foreground/30 truncate text-xs mt-0.5">
                            {p.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-muted-foreground hidden text-sm md:block">
                      {p._item_count > 0
                        ? `${p._item_count} animal${p._item_count !== 1 ? "es" : ""}`
                        : "—"}
                    </span>
                    <span className="text-foreground hidden font-semibold md:block">
                      ${p.total_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        {p.currency}
                      </span>
                    </span>
                    <span className="text-muted-foreground hidden text-xs md:block">
                      {p.payment_method
                        ? (PAYMENT_LABEL[p.payment_method] ?? p.payment_method)
                        : "—"}
                    </span>
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline-flex md:items-center ${STATUS_CLS[p.status] ?? "bg-muted text-foreground/60"}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showPurchaseModal && farmId && (
        <PurchaseModal
          farmId={farmId}
          supabase={supabase}
          onClose={() => setShowPurchaseModal(false)}
          onDone={() => {
            setShowPurchaseModal(false);
            qc.invalidateQueries({ queryKey: ["purchases", farmId] });
          }}
        />
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
