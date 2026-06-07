"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toast } from "sonner";

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
        toast.error("No tienes acceso a esta plataforma", {
          description:
            "Esta plataforma es solo por invitación. Contacta al administrador de tu finca para recibir acceso.",
          duration: 6000,
        });
        void logout();
      } else {
        setState(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken, logout]);

  const supabase = state ? createSupabaseBrowserClient(state.token) : null;

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
