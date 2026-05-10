// =====================================================================
// RF-008 — Escrow API
// POST /api/sales/[id]/escrow
//   Construye el payload sanitario canónico de la venta (animales,
//   vacunas, tratamientos, certificaciones, fotos), calcula el hash
//   keccak256 que se usará como `conditionsHash`/`payloadHash`, y lo
//   persiste en `sales.payload_hash` / `sales.conditions_hash`.
//
//   El cliente (wallet del owner / vendedor) usa estos datos para llamar
//   `TraceabilityAnchor.anchor` y `PaymentEscrow.release`.
// =====================================================================

import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canonicalJson, hashPayload } from "@/lib/crypto/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _privy: PrivyClient | null = null;
function getPrivy() {
  if (!_privy) _privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  return _privy;
}

let _admin: SupabaseClient | null = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _admin;
}

function uuidToBytes32(uuid: string): `0x${string}` {
  return ("0x" + uuid.replace(/-/g, "")) as `0x${string}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: saleId } = await params;
  const auth = req.headers.get("authorization");
  const privyToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!privyToken) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  try {
    await getPrivy().verifyAuthToken(privyToken);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const sb = getAdmin();

  const { data: sale, error: saleErr } = await sb
    .from("sales")
    .select(
      "id, farm_id, status, total_amount, currency, sold_at, escrow_status, sale_items(animal_id, weight_kg, unit_price, quantity)"
    )
    .eq("id", saleId)
    .single();
  if (saleErr || !sale) return NextResponse.json({ error: "sale_not_found" }, { status: 404 });

  const animalIds = (sale.sale_items ?? [])
    .map((it: { animal_id: string | null }) => it.animal_id)
    .filter((x): x is string => !!x);

  const [animals, vaccinations, treatments, certs] = await Promise.all([
    sb
      .from("animals")
      .select("id, tag, name, sex, breed_id, birth_date, current_weight_kg")
      .in("id", animalIds),
    sb
      .from("vaccinations")
      .select("id, animal_id, vaccine_id, applied_at, batch_number, next_due_at")
      .in("animal_id", animalIds),
    sb
      .from("treatments")
      .select(
        "id, animal_id, treatment_id, started_at, ended_at, withdrawal_until_meat, withdrawal_until_milk"
      )
      .in("animal_id", animalIds),
    sb
      .from("certifications")
      .select("id, animal_id, type, issuer, issued_at, valid_until")
      .in("animal_id", animalIds),
  ]);

  const payload = {
    saleId: sale.id,
    farmId: sale.farm_id,
    soldAt: sale.sold_at,
    currency: sale.currency,
    totalAmount: String(sale.total_amount),
    animals: (animals.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    vaccinations: (vaccinations.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    treatments: (treatments.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    certifications: (certs.data ?? []).sort((a, b) => a.id.localeCompare(b.id)),
  };

  const canonical = canonicalJson(payload);
  const hash = hashPayload(payload);
  const saleIdBytes32 = uuidToBytes32(sale.id);

  await sb.from("sales").update({ payload_hash: hash, conditions_hash: hash }).eq("id", sale.id);

  return NextResponse.json({
    saleId: sale.id,
    saleIdBytes32,
    payloadHash: hash,
    conditionsHash: hash,
    canonicalJson: canonical,
    payload,
  });
}
