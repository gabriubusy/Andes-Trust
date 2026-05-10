"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ChevronRight } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type SaleRow = {
  id: string;
  sold_at: string;
  total_amount: number;
  currency: string;
  status: string;
  escrow_status: string;
  buyers: { name: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-foreground/70",
  confirmed: "bg-blue-500/15 text-blue-600",
  paid: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-red-500/15 text-red-600",
};

const ESCROW_BADGE: Record<string, string> = {
  none: "bg-muted text-foreground/50",
  created: "bg-amber-500/15 text-amber-600",
  funded: "bg-blue-500/15 text-blue-600",
  released: "bg-emerald-500/15 text-emerald-600",
  refunded: "bg-orange-500/15 text-orange-600",
  failed: "bg-red-500/15 text-red-600",
};

export default function VentasPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const salesQuery = useQuery<SaleRow[]>({
    queryKey: ["sales", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("sales")
        .select("id, sold_at, total_amount, currency, status, escrow_status, buyers(name)")
        .eq("farm_id", farmId!)
        .order("sold_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as SaleRow[];
    },
  });

  return (
    <DashboardShell title="Ventas" subtitle="Transacciones comerciales y escrow">
      <div className="bg-card border-border rounded-2xl border">
        {salesQuery.isLoading ? (
          <div className="text-foreground/50 py-16 text-center text-sm">Cargando…</div>
        ) : (salesQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Receipt className="text-foreground/20 h-10 w-10" />
            <p className="text-foreground/50 text-sm">Sin ventas registradas</p>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {(salesQuery.data ?? []).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/ventas/${s.id}`}
                  className="hover:bg-muted/30 flex items-center gap-4 px-6 py-4 transition-colors"
                >
                  <Receipt className="text-foreground/40 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-medium">
                        {s.buyers?.name ?? "Sin comprador"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[s.status] ?? "bg-muted"}`}
                      >
                        {s.status}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${ESCROW_BADGE[s.escrow_status] ?? "bg-muted"}`}
                      >
                        escrow: {s.escrow_status}
                      </span>
                    </div>
                    <div className="text-foreground/50 mt-0.5 text-xs">
                      {new Date(s.sold_at).toLocaleDateString("es-VE")} · {s.total_amount}{" "}
                      {s.currency}
                    </div>
                  </div>
                  <ChevronRight className="text-foreground/30 h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
