import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Singleton por token — evita múltiples instancias de GoTrueClient
const cache = new Map<string, SupabaseClient<Database>>();

export function createSupabaseBrowserClient(accessToken?: string): SupabaseClient<Database> {
  const key = accessToken ?? "__anon__";
  if (cache.has(key)) return cache.get(key)!;

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
    }
  );

  cache.set(key, client);
  return client;
}
