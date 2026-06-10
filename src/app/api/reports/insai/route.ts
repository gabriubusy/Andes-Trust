// POST /api/reports/insai
// body: { farm_id, animal_ids?, date_from?, date_to? }

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
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

// pdf-lib StandardFonts only support WinAnsi — replace accented chars with ASCII
function norm(text: string): string {
  return text
    .replace(/[áàäâã]/g, "a")
    .replace(/[ÁÀÄÂÃ]/g, "A")
    .replace(/[éèëê]/g, "e")
    .replace(/[ÉÈËÊ]/g, "E")
    .replace(/[íìïî]/g, "i")
    .replace(/[ÍÌÏÎ]/g, "I")
    .replace(/[óòöôõ]/g, "o")
    .replace(/[ÓÒÖÔÕ]/g, "O")
    .replace(/[úùüû]/g, "u")
    .replace(/[ÚÙÜÛ]/g, "U")
    .replace(/[ñ]/g, "n")
    .replace(/[Ñ]/g, "N")
    .replace(/[ç]/g, "c")
    .replace(/[Ç]/g, "C")
    .replace(/[·•]/g, "·")
    .replace(/[→]/g, "->")
    .replace(/[—–]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

const KIND_LABEL: Record<string, string> = {
  birth: "Nacimiento",
  weighing: "Pesaje",
  vaccination: "Vacunacion",
  treatment: "Tratamiento",
  certification: "Certificacion",
  insemination: "Inseminacion",
  pregnancy_check: "Diagnostico gestacion",
  calving: "Parto",
  deworming: "Desparasitacion",
  other: "Otro",
};

const KIND_COLOR: Record<string, RGB> = {
  birth: rgb(0.13, 0.65, 0.4),
  weighing: rgb(0.14, 0.44, 0.94),
  vaccination: rgb(0.55, 0.2, 0.9),
  treatment: rgb(0.85, 0.2, 0.2),
  certification: rgb(0.1, 0.6, 0.8),
  insemination: rgb(0.85, 0.45, 0.1),
  calving: rgb(0.13, 0.65, 0.4),
  deworming: rgb(0.5, 0.35, 0.1),
  other: rgb(0.45, 0.5, 0.55),
};

const SEX_LABEL: Record<string, string> = {
  M: "Macho",
  F: "Hembra",
  m: "Macho",
  f: "Hembra",
  male: "Macho",
  female: "Hembra",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  sold: "Vendido",
  deceased: "Fallecido",
  transferred: "Transferido",
  inactive: "Inactivo",
};
const STATUS_COLOR: Record<string, RGB> = {
  active: rgb(0.1, 0.6, 0.35),
  sold: rgb(0.14, 0.44, 0.94),
  deceased: rgb(0.75, 0.18, 0.18),
  transferred: rgb(0.5, 0.35, 0.1),
  inactive: rgb(0.45, 0.5, 0.55),
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type AnyFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;

function wrapText(text: string, maxWidth: number, font: AnyFont, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
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
  const generatedBy = norm(reportPayload.generated_by);

  // ── PDF setup ──────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595; // A4 width pts
  const H = 842; // A4 height pts
  const ML = 48; // left margin
  const MR = 48; // right margin
  const contentW = W - ML - MR;

  // ── Color palette ──────────────────────────────────────────────────────
  const C = {
    primary: rgb(0.1, 0.38, 0.9), // #1A61E6 blue
    primaryDk: rgb(0.07, 0.27, 0.68), // darker blue
    dark: rgb(0.08, 0.09, 0.12), // near-black
    mid: rgb(0.3, 0.33, 0.4), // medium gray
    light: rgb(0.55, 0.58, 0.64), // light gray
    vlight: rgb(0.76, 0.78, 0.82), // very light gray
    white: rgb(1, 1, 1),
    offWhite: rgb(0.975, 0.978, 0.984),
    bgCard: rgb(0.96, 0.968, 0.984),
    border: rgb(0.88, 0.9, 0.93),
    green: rgb(0.1, 0.58, 0.34),
    greenBg: rgb(0.91, 0.98, 0.94),
    red: rgb(0.8, 0.16, 0.16),
    redBg: rgb(0.99, 0.93, 0.93),
    amber: rgb(0.8, 0.5, 0.05),
    amberBg: rgb(0.99, 0.97, 0.91),
  };

  // ── Page state ─────────────────────────────────────────────────────────
  let page = pdf.addPage([W, H]);
  let y = H;
  let pageNum = 1;

  const addPageNum = (p: ReturnType<typeof pdf.addPage>, n: number) => {
    const label = `Pagina ${n}`;
    p.drawText(label, {
      x: W - MR - font.widthOfTextAtSize(label, 7),
      y: 18,
      size: 7,
      font,
      color: C.vlight,
    });
  };

  const newPage = () => {
    addPageNum(page, pageNum);
    pageNum++;
    page = pdf.addPage([W, H]);
    y = H - 32;
    // Thin top accent bar on subsequent pages
    page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: C.primary });
    // Small header
    page.drawText(norm(`REPORTE INSAI  ·  ${norm(farm.name)}`), {
      x: ML,
      y: H - 18,
      size: 7.5,
      font,
      color: C.light,
    });
    const pg = `Pag. ${pageNum}`;
    page.drawText(pg, {
      x: W - MR - font.widthOfTextAtSize(pg, 7.5),
      y: H - 18,
      size: 7.5,
      font,
      color: C.light,
    });
    page.drawLine({
      start: { x: ML, y: H - 24 },
      end: { x: W - MR, y: H - 24 },
      thickness: 0.3,
      color: C.border,
    });
    y = H - 38;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) newPage();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // COVER / HEADER
  // ═══════════════════════════════════════════════════════════════════════

  // Deep blue header band (full width)
  const headerH = 100;
  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: C.primaryDk });
  // Accent stripe at very top
  page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: rgb(0.45, 0.72, 1) });
  // Decorative right circle
  page.drawCircle({ x: W + 10, y: H - 10, size: 90, color: C.primary, opacity: 0.4 });
  page.drawCircle({ x: W - 30, y: H - 80, size: 55, color: rgb(0.45, 0.72, 1), opacity: 0.15 });

  // Title
  page.drawText("REPORTE INSAI", {
    x: ML,
    y: H - 36,
    size: 22,
    font: fontBold,
    color: C.white,
  });
  page.drawText("Trazabilidad Sanitaria Animal", {
    x: ML,
    y: H - 54,
    size: 10,
    font,
    color: rgb(0.72, 0.86, 1),
  });

  // Date top-right
  const dateStr = norm(
    new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
  );
  page.drawText(dateStr, {
    x: W - MR - font.widthOfTextAtSize(dateStr, 8.5),
    y: H - 38,
    size: 8.5,
    font,
    color: rgb(0.72, 0.86, 1),
  });

  // Period badge
  const periodText = body.date_from
    ? `Periodo: ${body.date_from}  ->  ${body.date_to ?? "Hoy"}`
    : "Periodo: Completo";
  page.drawText(norm(periodText), {
    x: W - MR - font.widthOfTextAtSize(norm(periodText), 7.5),
    y: H - 54,
    size: 7.5,
    font,
    color: rgb(0.6, 0.78, 1),
  });

  y = H - headerH - 16;

  // ── Farm info block ────────────────────────────────────────────────────
  const farmBlockH = 64;
  page.drawRectangle({
    x: ML,
    y: y - farmBlockH,
    width: contentW,
    height: farmBlockH,
    color: C.bgCard,
    borderColor: C.border,
    borderWidth: 0.5,
  });
  // Left accent
  page.drawRectangle({ x: ML, y: y - farmBlockH, width: 3, height: farmBlockH, color: C.primary });

  page.drawText(norm(farm.name), {
    x: ML + 14,
    y: y - 18,
    size: 13,
    font: fontBold,
    color: C.dark,
  });

  const farmMeta1Parts = [
    farm.legal_id ? `RIF: ${farm.legal_id}` : null,
    farm.country ? norm(farm.country) : null,
    farm.region ? norm(farm.region) : null,
  ]
    .filter(Boolean)
    .join("   ·   ");

  if (farmMeta1Parts) {
    page.drawText(farmMeta1Parts, { x: ML + 14, y: y - 33, size: 8.5, font, color: C.mid });
  }
  if (farm.address) {
    page.drawText(norm(farm.address), { x: ML + 14, y: y - 45, size: 7.5, font, color: C.light });
  }
  page.drawText(`Generado por: ${generatedBy}`, {
    x: ML + 14,
    y: y - 57,
    size: 7,
    font,
    color: C.vlight,
  });

  y -= farmBlockH + 16;

  // ── Summary stats cards ────────────────────────────────────────────────
  const totalEvents = reportPayload.animals.reduce((s, a) => s + a.events.length, 0);
  const activeCount = animals.filter((a) => a.status === "active").length;

  const summaryItems = [
    { label: "Animales", value: String(animals.length), icon: "●" },
    { label: "Eventos totales", value: String(totalEvents), icon: "◆" },
    { label: "Activos", value: String(activeCount), icon: "✓" },
    {
      label: body.date_from ? "Periodo filtrado" : "Periodo",
      value: body.date_from ? "Filtrado" : "Completo",
      icon: "◷",
    },
  ];

  const cardW = (contentW - 12) / 4;
  const cardH = 58;

  for (let i = 0; i < summaryItems.length; i++) {
    const cx = ML + i * (cardW + 4);
    const item = summaryItems[i];

    // Card bg
    page.drawRectangle({
      x: cx,
      y: y - cardH,
      width: cardW,
      height: cardH,
      color: C.white,
      borderColor: C.border,
      borderWidth: 0.5,
    });
    // Bottom accent bar
    page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: 3, color: C.primary });

    // Label
    page.drawText(item.label, { x: cx + 10, y: y - 14, size: 7, font, color: C.light });
    // Value
    const valSize = item.value.length > 8 ? 11 : 18;
    page.drawText(item.value, {
      x: cx + 10,
      y: y - 36,
      size: valSize,
      font: fontBold,
      color: C.primary,
    });
  }
  y -= cardH + 20;

  // Divider
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.4, color: C.border });
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════
  // PER-ANIMAL SECTIONS
  // ═══════════════════════════════════════════════════════════════════════

  for (const a of reportPayload.animals) {
    ensureSpace(88);

    // ── Animal header card ───────────────────────────────────────────────
    const animalCardH = 50;
    page.drawRectangle({
      x: ML,
      y: y - animalCardH,
      width: contentW,
      height: animalCardH,
      color: C.offWhite,
      borderColor: C.border,
      borderWidth: 0.5,
    });
    // Primary left bar
    page.drawRectangle({
      x: ML,
      y: y - animalCardH,
      width: 4,
      height: animalCardH,
      color: C.primary,
    });

    // Tag + name
    const tagText = norm(a.tag);
    const nameText = a.name ? `  ·  ${norm(a.name)}` : "";
    page.drawText(tagText, { x: ML + 16, y: y - 16, size: 12, font: fontBold, color: C.dark });
    if (nameText) {
      const tagW = fontBold.widthOfTextAtSize(tagText, 12);
      page.drawText(nameText, { x: ML + 16 + tagW, y: y - 16, size: 11, font, color: C.mid });
    }

    // Meta line
    const metaParts = [
      SEX_LABEL[a.sex] ? norm(SEX_LABEL[a.sex]) : null,
      a.birth_date ? `Nac. ${fmtDate(a.birth_date)}` : null,
      a.current_weight_kg ? `${a.current_weight_kg} kg` : null,
    ]
      .filter(Boolean)
      .join("   ·   ");
    page.drawText(norm(metaParts), { x: ML + 16, y: y - 31, size: 8, font, color: C.mid });

    // Event count chip
    const evCountText = `${a.events.length} evento${a.events.length !== 1 ? "s" : ""}`;
    const evChipW = font.widthOfTextAtSize(evCountText, 7) + 14;
    page.drawRectangle({
      x: ML + 16,
      y: y - 45,
      width: evChipW,
      height: 13,
      color: C.bgCard,
      borderColor: C.border,
      borderWidth: 0.4,
    });
    page.drawText(evCountText, { x: ML + 23, y: y - 39, size: 7, font, color: C.mid });

    // Status badge
    const statusLabel = norm(STATUS_LABEL[a.status] ?? a.status);
    const statusColor = STATUS_COLOR[a.status] ?? C.mid;
    const badgeW = fontBold.widthOfTextAtSize(statusLabel, 7.5) + 18;
    const badgeX = W - MR - badgeW - 4;
    page.drawRectangle({ x: badgeX, y: y - 30, width: badgeW, height: 18, color: statusColor });
    page.drawText(statusLabel, {
      x: badgeX + 9,
      y: y - 22,
      size: 7.5,
      font: fontBold,
      color: C.white,
    });

    y -= animalCardH + 8;

    // ── Events ────────────────────────────────────────────────────────────
    if (a.events.length === 0) {
      ensureSpace(24);
      page.drawText("Sin eventos en el periodo seleccionado.", {
        x: ML + 14,
        y,
        size: 8.5,
        font,
        color: C.vlight,
      });
      y -= 20;
    } else {
      // Table header
      ensureSpace(28);
      const COL = { date: ML + 4, type: ML + 82, detail: ML + 170, note: ML + 380 };

      page.drawRectangle({ x: ML, y: y - 18, width: contentW, height: 22, color: C.primary });
      // Column labels
      for (const [label, x] of [
        ["Fecha", COL.date],
        ["Tipo de evento", COL.type],
        ["Detalle", COL.detail],
      ] as [string, number][]) {
        page.drawText(label, { x, y: y - 11, size: 7.5, font: fontBold, color: C.white });
      }
      y -= 22;

      let rowAlt = false;
      for (const ev of a.events) {
        const kindLabel = norm(KIND_LABEL[ev.kind] ?? ev.kind);
        const kindColor = KIND_COLOR[ev.kind] ?? rgb(0.45, 0.5, 0.55);

        // Build detail string
        const raw = ev.detail ?? {};
        const detailParts: string[] = [];
        for (const [k, v] of Object.entries(raw)) {
          if (["measured_by", "recorded_by", "performed_by", "breed_id"].includes(k)) continue;
          const label = norm(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
          detailParts.push(`${label}: ${norm(String(v))}`);
        }
        const detailStr = detailParts.join("  ·  ") || "—";
        const detailMaxW = contentW - (COL.detail - ML) - 8;
        const detailLines = wrapText(norm(detailStr), detailMaxW, font, 7.5);
        const rowH = Math.max(20, detailLines.length * 11 + 10);

        ensureSpace(rowH + 2);

        // Alternating row bg
        if (rowAlt) {
          page.drawRectangle({
            x: ML,
            y: y - rowH,
            width: contentW,
            height: rowH,
            color: C.offWhite,
          });
        }

        // Date cell
        page.drawText(norm(fmtDate(ev.occurred_at)), {
          x: COL.date,
          y: y - 13,
          size: 8,
          font,
          color: C.mid,
        });

        // Kind pill
        const pillW = fontBold.widthOfTextAtSize(kindLabel, 7) + 14;
        page.drawRectangle({
          x: COL.type - 1,
          y: y - 16,
          width: pillW,
          height: 14,
          color: kindColor,
          opacity: 0.12,
        });
        page.drawRectangle({ x: COL.type - 1, y: y - 16, width: 2, height: 14, color: kindColor });
        page.drawText(kindLabel, {
          x: COL.type + 6,
          y: y - 10,
          size: 7,
          font: fontBold,
          color: kindColor,
        });

        // Detail lines
        for (let li = 0; li < detailLines.length; li++) {
          page.drawText(detailLines[li], {
            x: COL.detail,
            y: y - 11 - li * 11,
            size: 7.5,
            font,
            color: C.dark,
          });
        }

        // Row divider
        page.drawLine({
          start: { x: ML, y: y - rowH },
          end: { x: W - MR, y: y - rowH },
          thickness: 0.25,
          color: C.border,
        });

        y -= rowH;
        rowAlt = !rowAlt;
      }

      // Bottom border for table
      page.drawLine({
        start: { x: ML, y },
        end: { x: W - MR, y },
        thickness: 0.5,
        color: C.border,
      });
    }

    y -= 20;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER (last page)
  // ═══════════════════════════════════════════════════════════════════════
  addPageNum(page, pageNum);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fincaelprogreso.com";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/dashboard/reportes`, {
    margin: 0,
    width: 100,
  });
  const qrPng = await pdf.embedPng(qrDataUrl);

  const lastPage = pdf.getPage(pdf.getPageCount() - 1);
  const footerY = 28;
  const footerLineY = footerY + 78;

  // Footer bg band
  lastPage.drawRectangle({ x: 0, y: footerY - 8, width: W, height: 90, color: C.offWhite });
  lastPage.drawLine({
    start: { x: ML, y: footerLineY },
    end: { x: W - MR - 88, y: footerLineY },
    thickness: 0.4,
    color: C.border,
  });

  lastPage.drawText("Este reporte fue generado por la plataforma Finca El Progreso.", {
    x: ML,
    y: footerY + 62,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText(
    norm(`Generado: ${new Date().toLocaleString("es-CO")}   ·   Por: ${generatedBy}`),
    {
      x: ML,
      y: footerY + 49,
      size: 7,
      font,
      color: C.light,
    }
  );
  // Hash row with label
  lastPage.drawText("Hash de integridad:", {
    x: ML,
    y: footerY + 36,
    size: 6.5,
    font: fontBold,
    color: C.vlight,
  });
  lastPage.drawText(payloadHash, {
    x: ML + font.widthOfTextAtSize("Hash de integridad: ", 6.5),
    y: footerY + 36,
    size: 6.5,
    font,
    color: C.vlight,
  });
  lastPage.drawText("La integridad de este documento puede verificarse en la plataforma.", {
    x: ML,
    y: footerY + 22,
    size: 7,
    font,
    color: C.vlight,
  });

  // QR code
  lastPage.drawImage(qrPng, { x: W - MR - 72, y: footerY - 4, width: 72, height: 72 });
  lastPage.drawText("Verificar", {
    x: W - MR - 72 + 20,
    y: footerY - 14,
    size: 6.5,
    font,
    color: C.vlight,
  });

  const pdfBytes = await pdf.save();

  // Persist
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
