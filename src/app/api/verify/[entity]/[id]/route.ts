// =====================================================================
// GET /api/verify/[entity]/[id]
//   Verifica integridad y firma de una entidad sanitaria:
//     - Recalcula el JSON canónico desde la fila actual.
//     - Confirma que el hash actual coincide con el registrado en
//       `signatures.payload_hash` y, si procede, en `blockchain_records`.
//     - Verifica la firma EIP-191 contra `signer_address`.
//   Pública (sin auth): la trazabilidad debe poder ser auditada por
//   terceros independientes.
// =====================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashPayload, verifyHashSignature } from "@/lib/crypto/sign";

// Simple in-process rate limiter: max 30 requests per IP per minute.
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ENTITIES = new Set([
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const ip =
    _req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    _req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { entity, id } = await params;
  if (!ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json({ error: "entity_not_supported" }, { status: 400 });
  }

  const sb = admin();

  const { data: row, error } = await sb.from(entity).select("*").eq("id", id).single();
  if (error || !row) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
        signer: s.signer_address,
        signed_at: s.signed_at,
        signed_hash: s.payload_hash,
        signature_valid: ok,
        hash_matches_current: s.payload_hash === currentHash,
      };
    })
  );

  const anchorMatches = (anchors ?? []).map((a) => ({
    network: a.network,
    tx_hash: a.tx_hash,
    contract_address: a.contract_address,
    anchored_hash: a.payload_hash,
    anchored_at: a.anchored_at,
    matches_current: a.payload_hash === currentHash,
  }));

  const integrityOk =
    signatureChecks.every((s) => s.signature_valid && s.hash_matches_current) &&
    anchorMatches.every((a) => a.matches_current);

  return NextResponse.json({
    entity,
    id,
    current_hash: currentHash,
    integrity_ok: integrityOk,
    signatures: signatureChecks,
    anchors: anchorMatches,
  });
}
