// =====================================================================
// Definición única de la consulta del hato.
//
// La precarga offline sólo funciona si la URL que pide el shell es
// IDÉNTICA a la que pide la pantalla: el service worker cachea por URL,
// así que una coma de más en el `select` genera otra entrada y la
// precarga no sirve de nada. Con los catálogos eso se resolvió con un
// comentario pidiendo que no divergieran; aquí se resuelve teniendo una
// sola definición que ambos importan, que no depende de recordarlo.
// =====================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { ANIMAL_PHOTOS_BUCKET } from "@/lib/supabase/storage";

export type AnimalRow = {
  id: string;
  tag: string;
  name: string | null;
  sex: "male" | "female";
  status: string;
  current_weight_kg: number | null;
  birth_date: string | null;
  photo_url: string | null;
  animal_breeds: { breeds: { name: string } | null }[] | null;
};

const ANIMAL_COLUMNS =
  "id, tag, name, sex, status, current_weight_kg, birth_date, photo_url, animal_breeds(breeds(name))";

export function animalsQueryKey(farmId: string | undefined) {
  return ["animals", farmId] as const;
}

export async function fetchAnimals(
  supabase: SupabaseClient | null,
  farmId: string | undefined
): Promise<AnimalRow[]> {
  if (!supabase || !farmId) return [];

  const { data, error } = await supabase
    .from("animals")
    .select(ANIMAL_COLUMNS)
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as AnimalRow[];

  // Bucket público: se resuelve la URL en el cliente en vez de pedirla.
  return rows.map((a) => ({
    ...a,
    photo_url: a.photo_url
      ? supabase.storage.from(ANIMAL_PHOTOS_BUCKET).getPublicUrl(a.photo_url).data.publicUrl
      : null,
  }));
}
