// Lógica de verificación de integridad/firma de una entidad sanitaria.
// Compartida entre el endpoint público /api/verify y la página /verify.
import { createClient } from "@supabase/supabase-js";
import { hashPayload, verifyHashSignature } from "@/lib/crypto/sign";

export type VerifyResult = {
  entity: string;
  id: string;
  current_hash: string;
  integrity_ok: boolean;
  signatures: {
    signer: string;
    signed_at: string;
    signed_hash: string;
    signature_valid: boolean;
    hash_matches_current: boolean;
  }[];
  anchors: {
    network: string;
    tx_hash: string;
    contract_address: string;
    anchored_hash: string;
    anchored_at: string;
    matches_current: boolean;
  }[];
};

export const VERIFY_ALLOWED_ENTITIES = new Set([
  "animals",
  "vaccinations",
  "treatments",
  "weighings",
  "certifications",
  "sales",
]);

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Devuelve el resultado de verificación, o null si la entidad no existe / no está soportada. */
export async function verifyEntity(entity: string, id: string): Promise<VerifyResult | null> {
  if (!VERIFY_ALLOWED_ENTITIES.has(entity)) return null;

  const sb = admin();
  const { data: row, error } = await sb.from(entity).select("*").eq("id", id).single();
  if (error || !row) return null;

  const currentHash = hashPayload(row);

  const [{ data: sigs }, { data: anchors }] = await Promise.all([
    sb
      .from("signatures")
      .select("signer_address, signature, payload_hash, signed_at")
      .eq("entity_type", entity)
      .eq("entity_id", id),
    sb
      .from("blockchain_records")
      .select("payload_hash, network, tx_hash, anchored_at, contract_address")
      .eq("entity_type", entity)
      .eq("entity_id", id),
  ]);

  const signatureChecks = await Promise.all(
    (sigs ?? []).map(async (s) => {
      const ok = await verifyHashSignature(
        s.payload_hash as `0x${string}`,
        s.signature as `0x${string}`,
        s.signer_address as `0x${string}`
      ).catch(() => false);
      return {
        signer: s.signer_address as string,
        signed_at: s.signed_at as string,
        signed_hash: s.payload_hash as string,
        signature_valid: ok,
        hash_matches_current: s.payload_hash === currentHash,
      };
    })
  );

  const anchorMatches = (anchors ?? []).map((a) => ({
    network: a.network as string,
    tx_hash: a.tx_hash as string,
    contract_address: a.contract_address as string,
    anchored_hash: a.payload_hash as string,
    anchored_at: a.anchored_at as string,
    matches_current: a.payload_hash === currentHash,
  }));

  const integrityOk =
    signatureChecks.every((s) => s.signature_valid && s.hash_matches_current) &&
    anchorMatches.every((a) => a.matches_current);

  return {
    entity,
    id,
    current_hash: currentHash,
    integrity_ok: integrityOk,
    signatures: signatureChecks,
    anchors: anchorMatches,
  };
}
