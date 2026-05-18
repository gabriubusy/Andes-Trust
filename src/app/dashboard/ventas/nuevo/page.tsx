"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  current_weight_kg: number | null;
};
type BuyerOption = { id: string; name: string; legal_id: string | null };
type OpenAlert = { id: string; type: string; animal_id: string | null };

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

  const toggleAnimal = (animalId: string) => {
    setSelectedAnimalIds((prev) => {
      const next = prev.includes(animalId)
        ? prev.filter((x) => x !== animalId)
        : [...prev, animalId];
      // check sanitary alerts for selected animals
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
          status: "confirmed",
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

      // Mark animals as sold
      await supabase.from("animals").update({ status: "sold" }).in("id", selectedAnimalIds);

      return sale.id as string;
    },
    onSuccess: (saleId) => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      router.push(`/dashboard/ventas/${saleId}`);
    },
  });

  return (
    <DashboardShell title="Nueva venta">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Animal selector */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <h3 className="text-foreground mb-4 text-base font-bold">Animales a vender</h3>
          {animalsQuery.isLoading ? (
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {(animalsQuery.data ?? []).map((a) => {
                const isSelected = selectedAnimalIds.includes(a.id);
                const hasAlert = alertsQuery.data?.some(
                  (al) => al.animal_id === a.id && al.type !== "weighing_due"
                );
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={isSelected}
                      onChange={() => toggleAnimal(a.id)}
                    />
                    <div className="flex-1 text-sm">
                      <span className="text-foreground font-medium">{a.tag}</span>
                      {a.name && <span className="text-muted-foreground"> — {a.name}</span>}
                      {a.current_weight_kg && (
                        <span className="text-muted-foreground"> · {a.current_weight_kg} kg</span>
                      )}
                    </div>
                    {hasAlert && (
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 text-amber-500"
                        title="Alerta sanitaria activa"
                      />
                    )}
                  </label>
                );
              })}
              {animalsQuery.data?.length === 0 && (
                <p className="text-muted-foreground col-span-2 text-sm">No hay animales activos.</p>
              )}
            </div>
          )}

          {sanitaryBlocked.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {sanitaryBlocked.length} animal(es) seleccionado(s) tiene(n) alertas sanitarias
              activas (vacunación o retiro de medicamento). Resuélvelas antes de continuar.
            </div>
          )}
        </div>

        {/* Buyer */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <h3 className="text-foreground mb-4 text-base font-bold">Comprador</h3>
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
                <option value="">— nuevo comprador —</option>
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

        {/* Pricing */}
        <div className="bg-card border-border rounded-2xl border p-6">
          <h3 className="text-foreground mb-4 text-base font-bold">Condiciones económicas</h3>
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
              <label htmlFor="payment_method" className={labelClass}>
                Forma de pago
              </label>
              <select
                id="payment_method"
                className={inputClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">— selecciona —</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="check">Cheque</option>
                <option value="crypto">Crypto</option>
                <option value="escrow">Escrow blockchain</option>
              </select>
            </div>
            <div>
              <label htmlFor="invoice_number" className={labelClass}>
                N° de factura / documento
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
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
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
              />
            </div>
          </div>

          {selectedAnimalIds.length > 0 && unitPrice && (
            <div className="bg-muted/30 border-border mt-4 rounded-xl border px-4 py-3">
              <p className="text-foreground text-sm font-medium">
                Total estimado:{" "}
                <span className="text-primary">
                  ${totalAmount.toLocaleString("es-VE", { minimumFractionDigits: 2 })} USD
                </span>{" "}
                ({selectedAnimalIds.length} animal{selectedAnimalIds.length > 1 ? "es" : ""} × $
                {Number(unitPrice).toLocaleString("es-VE", { minimumFractionDigits: 2 })})
              </p>
            </div>
          )}
        </div>

        {create.error && <p className="text-accent text-sm">{(create.error as Error).message}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="border-border text-foreground/80 hover:bg-muted rounded-lg border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              create.isPending || selectedAnimalIds.length === 0 || sanitaryBlocked.length > 0
            }
            onClick={() => create.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar venta
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
