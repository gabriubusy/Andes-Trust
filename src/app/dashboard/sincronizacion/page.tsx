"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudOff, RefreshCw, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { getOfflineDb, type PendingMutation } from "@/lib/offline/db";
import { flushPending } from "@/lib/offline/sync";

const MAX_ATTEMPTS = 5;

const TABLE_LABEL: Record<string, string> = {
  weighings: "Pesaje",
  vaccinations: "Vacunación",
  treatments: "Tratamiento",
  milk_records: "Producción de leche",
  animal_events: "Evento",
};

export default function SincronizacionPage() {
  const { supabase } = useSupabase();
  const [items, setItems] = useState<PendingMutation[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const db = getOfflineDb();
    setItems(await db.pending.orderBy("created_at").toArray());
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [reload]);

  const sync = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      await flushPending(supabase);
    } finally {
      setBusy(false);
      await reload();
    }
  };

  const retryOne = async (id: number) => {
    if (!supabase) return;
    const db = getOfflineDb();
    const item = await db.pending.get(id);
    if (!item) return;
    setBusy(true);
    try {
      const { error } = await supabase.from(item.table).insert(item.payload);
      if (error) throw error;
      await db.pending.delete(id);
    } catch (err) {
      await db.pending.update(id, {
        attempts: (item.attempts ?? 0) + 1,
        last_error: (err as Error).message,
      });
    } finally {
      setBusy(false);
      await reload();
    }
  };

  const discard = async (id: number) => {
    const db = getOfflineDb();
    await db.pending.delete(id);
    await reload();
  };

  const stuck = items.filter((i) => (i.attempts ?? 0) >= MAX_ATTEMPTS);
  const pending = items.filter((i) => (i.attempts ?? 0) < MAX_ATTEMPTS);

  return (
    <DashboardShell
      title="Sincronización"
      subtitle="Mutaciones encoladas localmente"
      action={
        <button
          onClick={sync}
          disabled={busy || items.length === 0}
          className="border-border hover:border-primary/40 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reintentar todo
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={CloudOff} label="En cola" value={pending.length} tint="text-amber-500" />
          <Stat icon={AlertCircle} label="Atascadas" value={stuck.length} tint="text-red-500" />
          <Stat icon={CheckCircle} label="Listo" value={items.length === 0 ? "✓" : 0} tint="text-emerald-500" />
        </div>

        {items.length === 0 ? (
          <div className="bg-card border-border flex flex-col items-center justify-center gap-3 rounded-2xl border py-16">
            <CheckCircle className="text-emerald-500 h-10 w-10" />
            <p className="text-foreground/50 text-sm">No hay mutaciones pendientes</p>
          </div>
        ) : (
          <div className="bg-card border-border rounded-2xl border">
            <ul className="divide-border divide-y">
              {items.map((it) => {
                const stuck = (it.attempts ?? 0) >= MAX_ATTEMPTS;
                return (
                  <li key={it.id} className="flex items-start gap-4 px-6 py-4">
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${stuck ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {TABLE_LABEL[it.table] ?? it.table}
                        </span>
                        <span className="text-foreground/40 text-xs">
                          {new Date(it.created_at).toLocaleString("es-VE")}
                        </span>
                        <span className="bg-muted text-foreground/60 rounded-full px-2 py-0.5 text-xs">
                          intento {it.attempts ?? 0}/{MAX_ATTEMPTS}
                        </span>
                      </div>
                      {it.last_error && (
                        <p className="text-red-500 mt-1 text-xs">{it.last_error}</p>
                      )}
                      <pre className="text-foreground/50 mt-1 max-h-24 overflow-y-auto text-[10px]">
                        {JSON.stringify(it.payload, null, 2)}
                      </pre>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => it.id != null && retryOne(it.id)}
                        disabled={busy}
                        className="border-border hover:bg-muted rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => it.id != null && discard(it.id)}
                        className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                        title="Descartar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: typeof CloudOff; label: string; value: number | string; tint: string }) {
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4">
      <Icon className={`h-5 w-5 ${tint}`} />
      <div>
        <div className="text-foreground/60 text-xs">{label}</div>
        <div className="text-foreground text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
