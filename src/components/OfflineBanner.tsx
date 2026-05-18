"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudOff, Cloud, RefreshCw, Loader2 } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { pendingCount } from "@/lib/offline/db";
import { flushPending } from "@/lib/offline/sync";

export default function OfflineBanner() {
  const { supabase } = useSupabase();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const sync = useCallback(async () => {
    if (!supabase || syncing) return;
    setSyncing(true);
    try {
      await flushPending(supabase);
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [supabase, syncing, refreshCount]);

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
    const t = window.setInterval(refreshCount, 5000);

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

  useEffect(() => {
    if (online && supabase && pending > 0 && !syncing) void sync();
  }, [online, supabase, pending, syncing, sync]);

  if (!mounted || (online && pending === 0)) return null;

  return (
    <div
      className={`pointer-events-auto fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-xs shadow-lg backdrop-blur ${
        online
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      }`}
    >
      {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span>
        {online ? "Conectado" : "Sin conexión"}
        {pending > 0 && ` · ${pending} pendiente(s)`}
      </span>
      {online && pending > 0 && (
        <button
          onClick={sync}
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
