// =====================================================================
// RF-009 — Reporte INSAI (PDF con historial sanitario por animal/lote)
// POST /api/reports/insai
//   body: { animal_ids?: string[], date_from?: string, date_to?: string, farm_id: string }
//   Devuelve PDF con:
//     - Datos de la finca
//     - Por cada animal: ficha + timeline (birth/weighing/vaccination/treatment/certification)
//     - Hash del reporte (keccak256 del JSON canónico) + QR a /t/<slug si existe>
//   Persiste fila en regulatory_reports.
// =====================================================================

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
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

const KIND_LABEL: Record<string, string> = {
  birth: "Nacimiento",
  weighing: "Pesaje",
  vaccination: "Vacunación",
  treatment: "Tratamiento",
  certification: "Certificación",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  let privyDid: string;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    privyDid = claims.userId;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = (await req.json()) as {
    farm_id: string;
    animal_ids?: string[];
    date_from?: string;
    date_to?: string;
  };
  if (!body.farm_id) return NextResponse.json({ error: "farm_id_required" }, { status: 400 });

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("privy_did", privyDid)
    .single();
  const { data: farm } = await sb
    .from("farms")
    .select("id, name, legal_id, address, region, country")
    .eq("id", body.farm_id)
    .single();
  if (!farm) return NextResponse.json({ error: "farm_not_found" }, { status: 404 });

  let animalsQ = sb
    .from("animals")
    .select("id, tag, name, sex, birth_date, current_weight_kg, status")
    .eq("farm_id", body.farm_id);
  if (body.animal_ids?.length) animalsQ = animalsQ.in("id", body.animal_ids);
  const { data: animals } = await animalsQ.order("tag");
  if (!animals || animals.length === 0)
    return NextResponse.json({ error: "no_animals" }, { status: 404 });

  const animalIds = animals.map((a) => a.id);

  let historyQ = sb.from("v_animal_full_history").select("*").in("animal_id", animalIds);
  if (body.date_from) historyQ = historyQ.gte("occurred_at", body.date_from);
  if (body.date_to) historyQ = historyQ.lte("occurred_at", body.date_to);
  const { data: history } = await historyQ.order("animal_id").order("occurred_at");

  const reportPayload = {
    farm: { id: farm.id, name: farm.name, legal_id: farm.legal_id },
    generated_at: new Date().toISOString(),
    generated_by: profile?.full_name ?? privyDid,
    date_from: body.date_from ?? null,
    date_to: body.date_to ?? null,
    animals: animals.map((a) => ({
      ...a,
      events: (history ?? []).filter((h) => h.animal_id === a.id),
    })),
  };

  const canonical = canonicalJson(reportPayload);
  const payloadHash = hashPayload(reportPayload);
  void canonical; // canonical retained if needed for future signing

  // ─── PDF ────────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]); // A4
  const margin = 40;
  let y = 800;
  const lineHeight = 14;

  const drawText = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}
  ) => {
    if (y < margin + 40) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: margin,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? fontBold : font,
      color: rgb(...(opts.color ?? [0.1, 0.1, 0.1])),
    });
    y -= (opts.size ?? 10) + 4;
  };

  drawText("REPORTE INSAI — Trazabilidad Sanitaria", { size: 16, bold: true });
  drawText(farm.name + (farm.legal_id ? ` · RIF ${farm.legal_id}` : ""), { size: 11, bold: true });
  drawText([farm.address, farm.region, farm.country].filter(Boolean).join(", "), { size: 9 });
  drawText(`Generado: ${new Date().toLocaleString("es-VE")} · Por: ${reportPayload.generated_by}`, {
    size: 9,
  });
  if (body.date_from || body.date_to) {
    drawText(`Período: ${body.date_from ?? "—"} a ${body.date_to ?? "—"}`, { size: 9 });
  }
  drawText(`Hash: ${payloadHash}`, { size: 8, color: [0.4, 0.4, 0.4] });
  y -= 8;

  for (const a of reportPayload.animals) {
    if (y < margin + 80) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    drawText(`Animal ${a.tag}${a.name ? ` — ${a.name}` : ""}`, { size: 12, bold: true });
    drawText(
      `Sexo: ${a.sex} · Nacimiento: ${a.birth_date ?? "—"} · Peso actual: ${a.current_weight_kg ?? "—"} kg · Estado: ${a.status}`,
      { size: 9 }
    );
    if (a.events.length === 0) {
      drawText("Sin eventos en el período.", { size: 9, color: [0.5, 0.5, 0.5] });
    } else {
      for (const ev of a.events) {
        const date = new Date(ev.occurred_at).toLocaleDateString("es-VE");
        const detail = JSON.stringify(ev.detail).replace(/[{}"]/g, "").slice(0, 110);
        drawText(`  • ${date}  ${KIND_LABEL[ev.kind] ?? ev.kind}: ${detail}`, { size: 8.5 });
      }
    }
    y -= 6;
  }

  // QR del hash + footer
  const qrDataUrl = await QRCode.toDataURL(payloadHash, { margin: 0, width: 96 });
  const qrPng = await pdf.embedPng(qrDataUrl);
  const lastPage = pdf.getPage(pdf.getPageCount() - 1);
  lastPage.drawImage(qrPng, { x: 595 - margin - 80, y: margin, width: 80, height: 80 });
  lastPage.drawText("Verificar hash en blockchain", {
    x: 595 - margin - 160,
    y: margin + 84,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdf.save();

  // Persistir registro
  const { data: report } = await sb
    .from("regulatory_reports")
    .insert({
      farm_id: farm.id,
      kind: "insai",
      animal_ids: animalIds,
      date_from: body.date_from ?? null,
      date_to: body.date_to ?? null,
      payload_hash: payloadHash,
      generated_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="insai-${farm.name.replace(/\s+/g, "_")}-${Date.now()}.pdf"`,
      "X-Report-Id": report?.id ?? "",
      "X-Report-Hash": payloadHash,
    },
  });
}
