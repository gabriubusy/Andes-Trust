"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/use-supabase";
import { cacheStorage } from "@/lib/cache/storage";

export type CurrentFarm = {
  id: string;
  name: string;
  role: string;
};

const FARM_CACHE_KEY = "current_farm";
const FARM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

export function useCurrentFarm() {
  const { supabase, profileId, ready } = useSupabase();

  return useQuery<CurrentFarm | null>({
    queryKey: ["current-farm", profileId],
    enabled: ready && !!supabase && !!profileId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
    queryFn: async () => {
      if (!supabase || !profileId) return null;

      // Try to get from localStorage first
      const cached = cacheStorage.get<CurrentFarm>(FARM_CACHE_KEY);
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

      // Store in localStorage
      cacheStorage.set(FARM_CACHE_KEY, result, FARM_CACHE_TTL);

      return result;
    },
  });
}
