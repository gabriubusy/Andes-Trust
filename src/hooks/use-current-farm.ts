"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/use-supabase";
import { cacheStorage } from "@/lib/cache/storage";

export type CurrentFarm = {
  id: string;
  name: string;
  role: string;
};

const FARM_CACHE_TTL = 60 * 60 * 1000; // 1 hora

export function useCurrentFarm() {
  const { supabase, profileId, ready } = useSupabase();

  return useQuery<CurrentFarm | null>({
    queryKey: ["current-farm", profileId],
    enabled: ready && !!supabase && !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || !profileId) return null;

      // Cache key incluye profileId para aislar entre usuarios
      const cacheKey = `current_farm_${profileId}`;
      const cached = cacheStorage.get<CurrentFarm>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from("farm_members")
        .select("role, farms(id, name)")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.farms) return null;
      const farm = Array.isArray(data.farms) ? data.farms[0] : data.farms;
      const result = { id: farm.id, name: farm.name, role: data.role };

      cacheStorage.set(cacheKey, result, FARM_CACHE_TTL);

      return result;
    },
  });
}
