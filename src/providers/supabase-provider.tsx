"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type TokenState = { token: string; expiresAt: number; profileId: string } | null;

type SupabaseContextValue = {
  supabase: SupabaseClient<Database> | null;
  profileId: string | null;
  ready: boolean;
  notInvited: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  profileId: null,
  ready: false,
  notInvited: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const [state, setState] = useState<TokenState>(null);
  const [notInvited, setNotInvited] = useState(false);
  const inflight = useRef<Promise<TokenState> | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) {
      setState(null);
      setNotInvited(false);
      return;
    }
    let cancelled = false;

    async function fetchToken(): Promise<TokenState> {
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
          if (body?.error === "not_invited") return "not_invited" as unknown as TokenState;
        }
        if (!res.ok) return null;
        return (await res.json()) as TokenState;
      })();
      inflight.current = p;
      try {
        return await p;
      } finally {
        inflight.current = null;
      }
    }

    void fetchToken().then((s) => {
      if (cancelled) return;
      if ((s as unknown as string) === "not_invited") {
        setNotInvited(true);
        setState(null);
      } else {
        setState(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  const supabase = state ? createSupabaseBrowserClient(state.token) : null;

  if (notInvited) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground p-6">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-7 w-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Acceso restringido</h1>
          <p className="text-sm text-foreground/60 mb-6">
            Esta plataforma es por invitación. Contacta al administrador de tu finca para recibir
            acceso.
          </p>
          <button
            type="button"
            onClick={() => {
              setNotInvited(false);
              logout();
            }}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        profileId: state?.profileId ?? null,
        ready: ready && (!authenticated || !!supabase),
        notInvited,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
