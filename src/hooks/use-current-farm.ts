"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/use-supabase";

export type CurrentFarm = {
  id: string;
  name: string;
  role: string;
};

export function useCurrentFarm() {
  const { supabase, profileId, ready } = useSupabase();

  return useQuery<CurrentFarm | null>({
    queryKey: ["current-farm", profileId],
    enabled: ready && !!supabase && !!profileId,
    queryFn: async () => {
      if (!supabase || !profileId) return null;
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
      return { id: farm.id, name: farm.name, role: data.role };
    },
  });
}
