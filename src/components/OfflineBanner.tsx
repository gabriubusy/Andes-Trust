"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { CloudOff, Cloud, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { pendingCount } from "@/lib/offline/db";
import { flushPending, stuckCount } from "@/lib/offline/sync";

/** Cada cuánto se reintenta drenar mientras haya cola. El backoff real por
 *  fila vive en flushPending; esto sólo marca el pulso. */
const FLUSH_INTERVAL_MS = 15_000;
const COUNT_INTERVAL_MS = 5_000;

export default function OfflineBanner() {
  const { supabase, captureMode, profileId } = useSupabase();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [stuck, setStuck] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    setPending(await pendingCount());
    try {
      setStuck(await stuckCount());
    } catch {
      setStuck(0);
    }
  }, []);

  const sync = useCallback(
    async (force = false) => {
      // Ref en vez de estado: el estado no se ve actualizado dentro del
      // intervalo, y dos drenados simultáneos pisan la misma fila.
      if (!supabase || syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        await flushPending(supabase, { force, profileId });
      } finally {
        syncingRef.current = false;
        setSyncing(false);
        await refreshCount();
      }
    },
    [supabase, profileId, refreshCount]
  );

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    void refreshCount();

    const onOnline = () => {
      setOnline(true);
      void sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const t = window.setInterval(refreshCount, COUNT_INTERVAL_MS);

    // En desarrollo NO registramos el service worker: cachear chunks de
    // /_next/static/* con CacheFirst rompe el HMR (sirve hashes viejos).
    // En desarrollo, además, desregistramos cualquier SW existente para
    // recuperar entornos que ya quedaron atascados.
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => null);
      } else {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(t);
    };
  }, [refreshCount, sync]);

  // Drenado periódico con pulso fijo. Antes esto era un efecto que dependía
  // de `pending`, así que una fila permanentemente fallida lo re-disparaba
  // sin descanso; ahora el ritmo lo marca el intervalo y el backoff por fila.
  useEffect(() => {
    if (!online || !supabase) return;
    const t = window.setInterval(() => {
      if (pending > stuck) void sync();
    }, FLUSH_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [online, supabase, pending, stuck, sync]);

  const drainable = pending - stuck;
  const idle = online && pending === 0 && !captureMode;
  if (!mounted || idle) return null;

  const tone =
    !online || captureMode
      ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      : stuck > 0
        ? "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <div
      className={`pointer-events-auto fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-xs shadow-lg backdrop-blur ${tone}`}
    >
      {online && !captureMode ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span>
        {captureMode ? "Modo captura · sin conexión" : online ? "Conectado" : "Sin conexión"}
        {pending > 0 && ` · ${pending} pendiente(s)`}
      </span>

      {stuck > 0 && (
        <Link
          href="/dashboard/sincronizacion"
          className="inline-flex items-center gap-1 rounded-full bg-current/10 px-2 py-0.5 hover:bg-current/20"
        >
          <AlertTriangle className="h-3 w-3" />
          {stuck} con error
        </Link>
      )}

      {online && drainable > 0 && (
        <button
          onClick={() => void sync(true)}
          disabled={syncing}
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-current/10 px-2 py-0.5 hover:bg-current/20 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Sincronizar
        </button>
      )}
    </div>
  );
}
