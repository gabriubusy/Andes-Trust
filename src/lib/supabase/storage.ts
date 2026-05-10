import type { SupabaseClient } from "@supabase/supabase-js";

export const ANIMAL_PHOTOS_BUCKET = "animal-photos";
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];

export type UploadAnimalPhotoArgs = {
  supabase: SupabaseClient;
  farmId: string;
  animalId: string;
  profileId: string;
  file: File;
};

export async function uploadAnimalPhoto({
  supabase,
  farmId,
  animalId,
  profileId,
  file,
}: UploadAnimalPhotoArgs): Promise<{ storagePath: string; documentId: string }> {
  if (!ACCEPTED_PHOTO_MIME.includes(file.type)) {
    throw new Error("Formato no soportado. Usa JPG, PNG o WebP.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("La imagen supera 8 MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${farmId}/${animalId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ANIMAL_PHOTOS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      farm_id: farmId,
      entity_type: "animal",
      entity_id: animalId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: profileId,
    })
    .select("id")
    .single();

  if (docError || !doc) {
    await supabase.storage.from(ANIMAL_PHOTOS_BUCKET).remove([storagePath]);
    throw docError ?? new Error("No se pudo registrar el documento.");
  }

  return { storagePath, documentId: doc.id as string };
}

export async function getSignedPhotoUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 60 * 60
) {
  const { data, error } = await supabase.storage
    .from(ANIMAL_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}
