// POST /api/reports/insai
// body: { farm_id, animal_ids?, date_from?, date_to? }
// Genera PDF estilizado del Reporte INSAI de Trazabilidad Sanitaria.

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
  if (!_admin)
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  return _admin;
}

const KIND_LABEL: Record<string, string> = {
  birth: "Nacimiento",
  weighing: "Pesaje",
  vaccination: "Vacunación",
  treatment: "Tratamiento",
  certification: "Certificación",
  insemination: "Inseminación",
  pregnancy_check: "Diagnóstico gestación",
  calving: "Parto",
  deworming: "Desparasitación",
  other: "Otro",
};

const KIND_COLOR: Record<string, [number, number, number]> = {
  birth: [0.13, 0.65, 0.4],
  weighing: [0.14, 0.44, 0.94],
  vaccination: [0.55, 0.2, 0.9],
  treatment: [0.85, 0.2, 0.2],
  certification: [0.1, 0.6, 0.8],
  insemination: [0.85, 0.45, 0.1],
  calving: [0.13, 0.65, 0.4],
  deworming: [0.5, 0.35, 0.1],
  other: [0.5, 0.5, 0.5],
};

const SEX_LABEL: Record<string, string> = { M: "Macho", F: "Hembra", m: "Macho", f: "Hembra" };
const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  sold: "Vendido",
  deceased: "Fallecido",
  transferred: "Transferido",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function wrapText(
  text: string,
  maxWidth: number,
  font: ReturnType<PDFDocument["embedFont"] extends Promise<infer T> ? () => T : never>,
  size: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (
      (font as { widthOfTextAtSize(t: string, s: number): number }).widthOfTextAtSize(test, size) >
      maxWidth
    ) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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

  const [{ data: profile }, { data: farm }] = await Promise.all([
    sb.from("profiles").select("id, full_name, email").eq("privy_did", privyDid).single(),
    sb
      .from("farms")
      .select("id, name, legal_id, address, region, country")
      .eq("id", body.farm_id)
      .single(),
  ]);
  if (!farm) return NextResponse.json({ error: "farm_not_found" }, { status: 404 });

  let animalsQ = sb
    .from("animals")
    .select("id, tag, name, sex, birth_date, current_weight_kg, status, breed_id")
    .eq("farm_id", body.farm_id);
  if (body.animal_ids?.length) animalsQ = animalsQ.in("id", body.animal_ids);
  const { data: animals } = await animalsQ.order("tag");
  if (!animals?.length) return NextResponse.json({ error: "no_animals" }, { status: 404 });

  const animalIds = animals.map((a) => a.id);
  let historyQ = sb.from("v_animal_full_history").select("*").in("animal_id", animalIds);
  if (body.date_from) historyQ = historyQ.gte("occurred_at", body.date_from);
  if (body.date_to) historyQ = historyQ.lte("occurred_at", body.date_to);
  const { data: history } = await historyQ.order("animal_id").order("occurred_at");

  const reportPayload = {
    farm: { id: farm.id, name: farm.name, legal_id: farm.legal_id },
    generated_at: new Date().toISOString(),
    generated_by: profile?.full_name ?? profile?.email ?? privyDid,
    date_from: body.date_from ?? null,
    date_to: body.date_to ?? null,
    animals: animals.map((a) => ({
      ...a,
      events: (history ?? []).filter((h) => h.animal_id === a.id),
    })),
  };

  void canonicalJson(reportPayload);
  const payloadHash = hashPayload(reportPayload);
  const generatedBy = reportPayload.generated_by;

  // ── PDF setup ──────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595;
  const H = 842;
  const margin = 44;
  const contentW = W - margin * 2;

  const C = {
    primary: rgb(0.145, 0.439, 0.937),
    dark: rgb(0.08, 0.09, 0.1),
    mid: rgb(0.35, 0.38, 0.42),
    light: rgb(0.6, 0.63, 0.67),
    white: rgb(1, 1, 1),
    bg: rgb(0.96, 0.97, 0.98),
    border: rgb(0.88, 0.89, 0.91),
    green: rgb(0.13, 0.65, 0.4),
    red: rgb(0.85, 0.2, 0.2),
    blue10: rgb(0.93, 0.96, 1.0),
  };

  let page = pdf.addPage([W, H]);
  let y = H;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - 44;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 60) newPage();
  };

  // ── Portada ──────────────────────────────────────────────────────────
  // Banda azul superior
  page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: C.primary });
  page.drawText("REPORTE INSAI", {
    x: margin,
    y: H - 34,
    size: 20,
    font: fontBold,
    color: C.white,
  });
  page.drawText("Trazabilidad Sanitaria Animal", {
    x: margin,
    y: H - 54,
    size: 10,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  const dateStr = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.drawText(dateStr, {
    x: W - margin - font.widthOfTextAtSize(dateStr, 9),
    y: H - 44,
    size: 9,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  y = H - 110;

  // Info finca
  page.drawText(farm.name, { x: margin, y, size: 14, font: fontBold, color: C.dark });
  y -= 18;
  if (farm.legal_id) {
    page.drawText(`RIF: ${farm.legal_id}`, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }
  const farmAddr = [farm.address, farm.region, farm.country].filter(Boolean).join(", ");
  if (farmAddr) {
    page.drawText(farmAddr, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }
  page.drawText(`Generado por: ${generatedBy}`, { x: margin, y, size: 8, font, color: C.light });
  y -= 13;
  if (body.date_from || body.date_to) {
    page.drawText(`Período: ${body.date_from ?? "Inicio"} → ${body.date_to ?? "Hoy"}`, {
      x: margin,
      y,
      size: 8,
      font,
      color: C.light,
    });
    y -= 13;
  }
  page.drawText(`Hash de integridad: ${payloadHash}`, {
    x: margin,
    y,
    size: 7,
    font,
    color: C.light,
  });
  y -= 20;

  // Separador
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 16;

  // Resumen
  const totalEvents = reportPayload.animals.reduce((s, a) => s + a.events.length, 0);
  const summaryCards = [
    { label: "Animales", value: String(animals.length) },
    { label: "Eventos totales", value: String(totalEvents) },
    { label: "Activos", value: String(animals.filter((a) => a.status === "active").length) },
    {
      label: "Período",
      value: body.date_from ? `${body.date_from} → ${body.date_to ?? "hoy"}` : "Completo",
    },
  ];
  const cardW = (contentW - 12) / 4;
  ensureSpace(60);
  for (let i = 0; i < summaryCards.length; i++) {
    const cx = margin + i * (cardW + 4);
    page.drawRectangle({
      x: cx,
      y: y - 46,
      width: cardW,
      height: 52,
      color: C.blue10,
      borderRadius: 6,
    });
    page.drawText(summaryCards[i].label, { x: cx + 8, y: y - 10, size: 7, font, color: C.mid });
    page.drawText(summaryCards[i].value, {
      x: cx + 8,
      y: y - 26,
      size: summaryCards[i].value.length > 10 ? 8 : 13,
      font: fontBold,
      color: C.primary,
    });
  }
  y -= 64;

  // ── Por animal ──────────────────────────────────────────────────────
  for (const a of reportPayload.animals) {
    ensureSpace(80);

    // Cabecera animal
    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: contentW,
      height: 42,
      color: C.bg,
      borderRadius: 8,
    });
    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: 4,
      height: 42,
      color: C.primary,
      borderRadius: 2,
    });

    page.drawText(`${a.tag}${a.name ? `  ·  ${a.name}` : ""}`, {
      x: margin + 12,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: C.dark,
    });

    const meta = [
      SEX_LABEL[a.sex] ?? a.sex ?? "—",
      a.birth_date ? `Nac. ${fmtDate(a.birth_date)}` : null,
      a.current_weight_kg ? `${a.current_weight_kg} kg` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    page.drawText(meta, { x: margin + 12, y: y - 24, size: 8, font, color: C.mid });

    // Badge estado
    const statusLabel = STATUS_LABEL[a.status] ?? a.status;
    const statusColor = a.status === "active" ? C.green : a.status === "deceased" ? C.red : C.mid;
    const badgeW = fontBold.widthOfTextAtSize(statusLabel, 7.5) + 16;
    page.drawRectangle({
      x: W - margin - badgeW - 4,
      y: y - 28,
      width: badgeW,
      height: 18,
      color: statusColor,
      borderRadius: 9,
    });
    page.drawText(statusLabel, {
      x: W - margin - badgeW + 4,
      y: y - 20,
      size: 7.5,
      font: fontBold,
      color: C.white,
    });

    y -= 50;

    if (a.events.length === 0) {
      ensureSpace(20);
      page.drawText("Sin eventos en el período seleccionado.", {
        x: margin + 12,
        y,
        size: 8.5,
        font,
        color: C.light,
      });
      y -= 20;
    } else {
      // Tabla de eventos
      ensureSpace(28);
      // Encabezado tabla
      page.drawRectangle({ x: margin, y: y - 14, width: contentW, height: 20, color: C.primary });
      const tHeaders = ["Fecha", "Tipo", "Detalle"];
      const tColsX = [margin + 4, margin + 76, margin + 160];
      for (let i = 0; i < tHeaders.length; i++) {
        page.drawText(tHeaders[i], {
          x: tColsX[i],
          y: y - 8,
          size: 7.5,
          font: fontBold,
          color: C.white,
        });
      }
      y -= 20;

      let alt = false;
      for (const ev of a.events) {
        const kindLabel = KIND_LABEL[ev.kind] ?? ev.kind;
        const kindColor = KIND_COLOR[ev.kind] ?? [0.5, 0.5, 0.5];

        // Limpiar detalle: sacar claves internas, mostrar valores legibles
        const raw = ev.detail ?? {};
        const detailParts: string[] = [];
        for (const [k, v] of Object.entries(raw)) {
          if (["measured_by", "recorded_by", "performed_by", "breed_id"].includes(k)) continue;
          const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          detailParts.push(`${label}: ${v}`);
        }
        const detailStr = detailParts.join("  ·  ") || "—";
        const detailLines = wrapText(
          detailStr,
          contentW - 170,
          font as Parameters<typeof wrapText>[2],
          8
        );
        const rowH = Math.max(16, detailLines.length * 12 + 6);

        ensureSpace(rowH + 4);
        if (alt)
          page.drawRectangle({
            x: margin,
            y: y - rowH + 2,
            width: contentW,
            height: rowH,
            color: C.bg,
          });

        page.drawText(fmtDate(ev.occurred_at), {
          x: tColsX[0],
          y: y - 10,
          size: 8,
          font,
          color: C.mid,
        });

        // Pill tipo
        const pillW = fontBold.widthOfTextAtSize(kindLabel, 7) + 10;
        page.drawRectangle({
          x: tColsX[1] - 1,
          y: y - 14,
          width: pillW,
          height: 14,
          color: rgb(...kindColor),
          borderRadius: 4,
          opacity: 0.15,
        });
        page.drawText(kindLabel, {
          x: tColsX[1] + 4,
          y: y - 9,
          size: 7,
          font: fontBold,
          color: rgb(...kindColor),
        });

        for (let li = 0; li < detailLines.length; li++) {
          page.drawText(detailLines[li], {
            x: tColsX[2],
            y: y - 9 - li * 12,
            size: 8,
            font,
            color: C.dark,
          });
        }

        page.drawLine({
          start: { x: margin, y: y - rowH + 2 },
          end: { x: W - margin, y: y - rowH + 2 },
          thickness: 0.3,
          color: C.border,
        });
        y -= rowH;
        alt = !alt;
      }
    }

    y -= 14;
  }

  // ── Pie de página + QR ───────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fincaelprogreso.com";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/dashboard/reportes`, {
    margin: 0,
    width: 100,
  });
  const qrPng = await pdf.embedPng(qrDataUrl);

  const lastPage = pdf.getPage(pdf.getPageCount() - 1);
  const footerY = margin + 10;

  lastPage.drawLine({
    start: { x: margin, y: footerY + 80 },
    end: { x: W - margin - 84, y: footerY + 80 },
    thickness: 0.5,
    color: C.border,
  });
  lastPage.drawText("Este reporte fue generado por la plataforma Finca El Progreso.", {
    x: margin,
    y: footerY + 66,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText(`Generado: ${new Date().toLocaleString("es-VE")}  ·  Por: ${generatedBy}`, {
    x: margin,
    y: footerY + 54,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText(`Hash: ${payloadHash}`, {
    x: margin,
    y: footerY + 42,
    size: 6.5,
    font,
    color: C.light,
  });
  lastPage.drawText("La integridad de este documento puede verificarse en la plataforma.", {
    x: margin,
    y: footerY + 30,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawImage(qrPng, { x: W - margin - 72, y: footerY, width: 72, height: 72 });

  const pdfBytes = await pdf.save();

  // Persistir
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
