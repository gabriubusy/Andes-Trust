"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toast } from "sonner";
import {
  clearSession,
  isTokenUsable,
  readSession,
  writeSession,
  type PersistedSession,
} from "@/lib/offline/session";

type TokenState = PersistedSession | null;

type SupabaseContextValue = {
  supabase: SupabaseClient<Database> | null;
  profileId: string | null;
  ready: boolean;
  notInvited: boolean;
  /**
   * Sesión conocida pero sin cliente Supabase utilizable por falta de red.
   * La UI debe renderizar en sólo-lectura (caché) y encolar las escrituras.
   */
  captureMode: boolean;
  online: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  profileId: null,
  ready: false,
  notInvited: false,
  captureMode: false,
  online: true,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { ready: privyReady, authenticated, getAccessToken, logout } = usePrivy();
  const [state, setState] = useState<TokenState>(null);
  const [notInvited, setNotInvited] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const inflight = useRef<Promise<TokenState | "not_invited"> | null>(null);

  // ── Hidratación desde localStorage ──────────────────────────────────
  // En efecto (no en el inicializador de useState) para no desincronizar
  // el HTML del servidor con el del cliente.
  useEffect(() => {
    const s = readSession();
    if (s) setState(s);
    setHydrated(true);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const fetchToken = useCallback(async (): Promise<TokenState | "not_invited"> => {
    if (inflight.current) return inflight.current;
    const p = (async () => {
      const privyToken = await getAccessToken();
      if (!privyToken) return null;
      const res = await fetch("/api/supabase-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "not_invited") return "not_invited" as const;
      }
      if (!res.ok) return null;
      return (await res.json()) as PersistedSession;
    })();
    inflight.current = p;
    try {
      return await p;
    } finally {
      inflight.current = null;
    }
  }, [getAccessToken]);

  // `online` está en las dependencias a propósito: al recuperar señal el
  // efecto se remonta y vuelve a intentar mintear el token de inmediato,
  // sin necesidad de un segundo efecto que compita con éste.
  useEffect(() => {
    if (!privyReady) return;

    // Privy confirmó que no hay sesión: limpiar todo rastro local.
    if (!authenticated) {
      clearSession();
      setState(null);
      setNotInvited(false);
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;

    function schedule(fn: () => void, ms: number) {
      refreshTimer = setTimeout(fn, ms);
    }

    async function doFetch() {
      let s: TokenState | "not_invited";
      try {
        s = await fetchToken();
      } catch {
        s = null; // sin red: se reintenta abajo
      }
      if (cancelled) return;

      if (s === "not_invited") {
        clearSession();
        setNotInvited(true);
        setState(null);
        toast.error("No tienes acceso a esta plataforma", {
          description:
            "Esta plataforma es solo por invitación. Contacta al administrador de tu finca para recibir acceso.",
          duration: 6000,
        });
        void logout();
        return;
      }

      if (s) {
        retries = 0;
        // Cambio de usuario: descartar la cola del anterior sería destructivo,
        // así que sólo se limpia la sesión; la cola se purga en el logout.
        setState(s);
        writeSession(s);
        // Renovar 2 min antes de expirar.
        const ms = s.expiresAt - Date.now() - 2 * 60 * 1000;
        if (ms <= 0) void doFetch();
        else schedule(() => void doFetch(), ms);
        return;
      }

      // Falló (típicamente sin red). Reintentar con backoff acotado en vez
      // de rendirse: antes, un único fallo dejaba la app sin token para
      // siempre porque no se reprogramaba ningún timer.
      retries += 1;
      const delay = Math.min(5_000 * 2 ** (retries - 1), 60_000);
      retryTimer = setTimeout(() => void doFetch(), delay);
    }

    void doFetch();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [privyReady, authenticated, online, fetchToken, logout]);

  const tokenUsable = isTokenUsable(state);
  const supabase = tokenUsable ? createSupabaseBrowserClient(state!.token) : null;

  // Conocemos al usuario pero no podemos hablar con Supabase por falta de
  // red: la app arranca igual para seguir capturando datos en la cola.
  const captureMode = hydrated && !!state && !tokenUsable && !online;

  // `ready` ya no depende de que Privy arranque: offline nunca lo hace.
  const ready = hydrated && (!!supabase || captureMode || (privyReady && !authenticated));

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        profileId: state?.profileId ?? null,
        ready,
        notInvited,
        captureMode,
        online,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
