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
import { verifyEntity, VERIFY_ALLOWED_ENTITIES } from "@/lib/verify/verifyEntity";

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
  if (!VERIFY_ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json({ error: "entity_not_supported" }, { status: 400 });
  }

  const result = await verifyEntity(entity, id);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(result);
}
