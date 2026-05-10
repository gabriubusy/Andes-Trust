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
};

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  profileId: null,
  ready: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [state, setState] = useState<TokenState>(null);
  const inflight = useRef<Promise<TokenState> | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) {
      setState(null);
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
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  const supabase = state ? createSupabaseBrowserClient(state.token) : null;

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        profileId: state?.profileId ?? null,
        ready: ready && (!authenticated || !!supabase),
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
