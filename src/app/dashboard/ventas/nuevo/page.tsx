"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  Beef,
  User,
  BadgeDollarSign,
  CheckSquare,
  Square,
  Weight,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

const inputClass =
  "border-border bg-muted/40 text-foreground focus:border-primary focus:bg-background focus:ring-primary/20 w-full rounded-xl border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none transition-colors";
const labelClass = "text-foreground/70 mb-1.5 block text-xs font-medium";

type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  current_weight_kg: number | null;
};
type BuyerOption = { id: string; name: string; legal_id: string | null };
type OpenAlert = { id: string; type: string; animal_id: string | null };

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: ArrowLeftRight },
  { value: "check", label: "Cheque", icon: CreditCard },
  { value: "crypto", label: "Crypto", icon: BadgeDollarSign },
  { value: "escrow", label: "Escrow blockchain", icon: Check },
];

function AnimalCard({
  animal,
  selected,
  hasAlert,
  onToggle,
}: {
  animal: AnimalOption;
  selected: boolean;
  hasAlert: boolean;
  onToggle: () => void;
}) {
  const initials = animal.name
    ? animal.name.slice(0, 2).toUpperCase()
    : animal.tag
        .replace(/[^A-Z0-9]/gi, "")
        .slice(0, 2)
        .toUpperCase();

  return (
    <label
      className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
        selected
          ? "border-primary bg-primary/10 shadow-primary/10 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/30"
      }`}
    >
      <input type="checkbox" className="sr-only" checked={selected} onChange={onToggle} />

      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/50"
        }`}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-foreground font-mono text-xs font-bold">{animal.tag}</div>
        {animal.name && <div className="text-foreground/60 truncate text-xs">{animal.name}</div>}
        {animal.current_weight_kg && (
          <div className="text-foreground/40 mt-0.5 flex items-center gap-1 text-xs">
            <Weight className="h-2.5 w-2.5" />
            {animal.current_weight_kg} kg
          </div>
        )}
      </div>

      {/* Checkbox indicator */}
      <div
        className={`shrink-0 transition-colors ${selected ? "text-primary" : "text-foreground/20"}`}
      >
        {selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </div>

      {/* Alert indicator */}
      {hasAlert && (
        <span
          title="Alerta sanitaria activa"
          className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20"
        >
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        </span>
      )}
    </label>
  );
}

export default function NuevaVentaPage() {
  const router = useRouter();
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const queryClient = useQueryClient();
  const farmId = farmQuery.data?.id;

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [buyerId, setBuyerId] = useState("");
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerLegalId, setNewBuyerLegalId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [soldAt, setSoldAt] = useState("");
  const [sanitaryBlocked, setSanitaryBlocked] = useState<string[]>([]);

  const animalsQuery = useQuery<AnimalOption[]>({
    queryKey: ["animals-active", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name, current_weight_kg")
        .eq("farm_id", farmId)
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return (data ?? []) as AnimalOption[];
    },
  });

  const buyersQuery = useQuery<BuyerOption[]>({
    queryKey: ["buyers", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("buyers")
        .select("id, name, legal_id")
        .eq("farm_id", farmId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as BuyerOption[];
    },
  });

  const alertsQuery = useQuery<OpenAlert[]>({
    queryKey: ["open-alerts", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("alerts")
        .select("id, type, animal_id")
        .eq("farm_id", farmId)
        .eq("status", "open");
      if (error) throw error;
      return (data ?? []) as OpenAlert[];
    },
  });

  useEffect(() => {
    if (animalsQuery.error)
      toast.error(friendlyErrorMessage(animalsQuery.error, { fallback: "Error al cargar." }));
  }, [animalsQuery.error]);
  useEffect(() => {
    if (buyersQuery.error)
      toast.error(friendlyErrorMessage(buyersQuery.error, { fallback: "Error al cargar." }));
  }, [buyersQuery.error]);

  const toggleAnimal = (animalId: string) => {
    setSelectedAnimalIds((prev) => {
      const next = prev.includes(animalId)
        ? prev.filter((x) => x !== animalId)
        : [...prev, animalId];
      const blocked = next.filter((aid) =>
        alertsQuery.data?.some((a) => a.animal_id === aid && a.type !== "weighing_due")
      );
      setSanitaryBlocked(blocked);
      return next;
    });
  };

  const totalAmount =
    selectedAnimalIds.length > 0 && unitPrice ? selectedAnimalIds.length * Number(unitPrice) : 0;

  const create = useMutation({
    mutationFn: async () => {
      if (!supabase || !profileId || !farmId) throw new Error("Sesión no lista.");
      if (selectedAnimalIds.length === 0) throw new Error("Selecciona al menos un animal.");
      if (sanitaryBlocked.length > 0)
        throw new Error(
          "Hay animales con alertas sanitarias activas. Resuélvelas antes de vender."
        );

      let resolvedBuyerId = buyerId || null;

      if (!buyerId && newBuyerName.trim()) {
        const { data: nb, error: be } = await supabase
          .from("buyers")
          .insert({ farm_id: farmId, name: newBuyerName.trim(), legal_id: newBuyerLegalId || null })
          .select("id")
          .single();
        if (be || !nb) throw be ?? new Error("No se pudo crear el comprador.");
        resolvedBuyerId = nb.id as string;
        queryClient.invalidateQueries({ queryKey: ["buyers", farmId] });
      }

      const { data: sale, error: se } = await supabase
        .from("sales")
        .insert({
          farm_id: farmId,
          buyer_id: resolvedBuyerId,
          sold_at: soldAt ? new Date(soldAt).toISOString() : new Date().toISOString(),
          total_amount: totalAmount,
          payment_method: paymentMethod || null,
          invoice_number: invoiceNumber || null,
          notes: notes || null,
          created_by: profileId,
          status: "draft",
        })
        .select("id")
        .single();
      if (se || !sale) throw se ?? new Error("No se pudo crear la venta.");

      const items = selectedAnimalIds.map((aid) => {
        const animal = animalsQuery.data?.find((a) => a.id === aid);
        return {
          sale_id: sale.id as string,
          animal_id: aid,
          description: animal ? `${animal.tag}${animal.name ? ` — ${animal.name}` : ""}` : null,
          quantity: 1,
          unit_price: Number(unitPrice) || 0,
          weight_kg: animal?.current_weight_kg ?? null,
        };
      });

      const { error: ie } = await supabase.from("sale_items").insert(items);
      if (ie) throw ie;

      await supabase.from("animals").update({ status: "sold" }).in("id", selectedAnimalIds);
      return sale.id as string;
    },
    onSuccess: (saleId) => {
      toast.success("Venta registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      router.push(`/dashboard/ventas/${saleId}`);
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const step = (n: number, title: string, icon: React.ReactNode) => (
    <div className="mb-5 flex items-center gap-2">
      <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
        {n}
      </div>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-foreground text-base font-bold">{title}</h3>
      </div>
    </div>
  );

  return (
    <DashboardShell title="Nueva venta">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Step 1 — Animals */}
        <div className="bg-card border-border rounded-2xl border p-6">
          {step(1, "Animales a vender", <Beef className="text-primary h-4 w-4" />)}

          {animalsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted/30 h-20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (animalsQuery.data?.length ?? 0) === 0 ? (
            <div className="text-foreground/50 border-border rounded-2xl border border-dashed py-10 text-center text-sm">
              No hay animales activos disponibles para la venta.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(animalsQuery.data ?? []).map((a) => (
                <AnimalCard
                  key={a.id}
                  animal={a}
                  selected={selectedAnimalIds.includes(a.id)}
                  hasAlert={
                    !!alertsQuery.data?.some(
                      (al) => al.animal_id === a.id && al.type !== "weighing_due"
                    )
                  }
                  onToggle={() => toggleAnimal(a.id)}
                />
              ))}
            </div>
          )}

          {/* Selection summary */}
          {selectedAnimalIds.length > 0 && (
            <div className="bg-primary/5 border-primary/20 mt-4 flex items-center justify-between rounded-xl border px-4 py-2.5">
              <span className="text-foreground/70 text-sm">
                <span className="text-primary font-bold">{selectedAnimalIds.length}</span> animal
                {selectedAnimalIds.length > 1 ? "es" : ""} seleccionado
                {selectedAnimalIds.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => {
                  setSelectedAnimalIds([]);
                  setSanitaryBlocked([]);
                }}
                className="text-foreground/40 hover:text-foreground text-xs"
              >
                Limpiar selección
              </button>
            </div>
          )}

          {sanitaryBlocked.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>
                  {sanitaryBlocked.length} animal{sanitaryBlocked.length > 1 ? "es" : ""}
                </strong>{" "}
                con alertas sanitarias activas (vacunación o retiro de medicamento). Resuélvelas
                antes de continuar.
              </span>
            </div>
          )}
        </div>

        {/* Step 2 — Buyer */}
        <div className="bg-card border-border rounded-2xl border p-6">
          {step(2, "Comprador", <User className="text-primary h-4 w-4" />)}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="buyer_id" className={labelClass}>
                Comprador existente
              </label>
              <select
                id="buyer_id"
                className={inputClass}
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
              >
                <option value="">— Nuevo comprador —</option>
                {buyersQuery.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.legal_id ? ` (${b.legal_id})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {!buyerId && (
              <>
                <div>
                  <label htmlFor="buyer_name" className={labelClass}>
                    Nombre del comprador
                  </label>
                  <input
                    id="buyer_name"
                    className={inputClass}
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label htmlFor="buyer_legal" className={labelClass}>
                    RIF / Cédula
                  </label>
                  <input
                    id="buyer_legal"
                    className={inputClass}
                    value={newBuyerLegalId}
                    onChange={(e) => setNewBuyerLegalId(e.target.value)}
                    placeholder="J-12345678-9"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 3 — Pricing */}
        <div className="bg-card border-border rounded-2xl border p-6">
          {step(3, "Condiciones económicas", <BadgeDollarSign className="text-primary h-4 w-4" />)}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="unit_price" className={labelClass}>
                Precio por animal (USD)
              </label>
              <input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="1500.00"
              />
            </div>
            <div>
              <label htmlFor="invoice_number" className={labelClass}>
                N° de nota de entrega / documento
              </label>
              <input
                id="invoice_number"
                className={inputClass}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FACT-0042"
              />
            </div>
            <div>
              <label htmlFor="sold_at" className={labelClass}>
                Fecha de venta
              </label>
              <input
                id="sold_at"
                type="datetime-local"
                className={inputClass}
                max={new Date().toISOString().slice(0, 16)}
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Forma de pago</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(paymentMethod === opt.value ? "" : opt.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                      paymentMethod === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <opt.icon className="h-3.5 w-3.5 shrink-0" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes" className={labelClass}>
                Notas
              </label>
              <textarea
                id="notes"
                rows={2}
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales…"
              />
            </div>
          </div>

          {/* Total summary */}
          {selectedAnimalIds.length > 0 && unitPrice && (
            <div className="border-primary/20 bg-primary/5 mt-5 rounded-2xl border p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-foreground/60 text-sm">Total estimado</span>
                <span className="text-primary text-2xl font-bold tabular-nums">
                  ${totalAmount.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                  <span className="text-primary/60 ml-1 text-sm font-normal">USD</span>
                </span>
              </div>
              <div className="text-foreground/40 mt-1 text-xs">
                {selectedAnimalIds.length} animal{selectedAnimalIds.length > 1 ? "es" : ""} × $
                {Number(unitPrice).toLocaleString("es-CO", { minimumFractionDigits: 2 })} USD c/u
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="border-border text-foreground/70 hover:bg-muted rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              create.isPending || selectedAnimalIds.length === 0 || sanitaryBlocked.length > 0
            }
            onClick={() => create.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar venta
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
