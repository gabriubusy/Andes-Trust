"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TokenState = { token: string; expiresAt: number; profileId: string } | null;

export function useSupabase() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [state, setState] = useState<TokenState>(null);
  const inflight = useRef<Promise<TokenState> | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) {
      setState(null);
      return;
    }
    let cancelled = false;
    void fetchToken().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };

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
  }, [ready, authenticated, getAccessToken]);

  const client = useMemo(() => (state ? createSupabaseBrowserClient(state.token) : null), [state]);

  return {
    supabase: client,
    profileId: state?.profileId ?? null,
    ready: ready && (!authenticated || !!client),
  };
}
