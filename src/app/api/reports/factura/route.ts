// POST /api/reports/factura
// body: { sale_id: string }
// Genera el PDF de nota de entrega de una venta.
// (La ruta conserva el nombre `factura` por compatibilidad; el documento
//  que produce es una nota de entrega.)

import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia bancaria",
  check: "Cheque",
  crypto: "Criptomoneda (USDC)",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  paid: "Cobrada",
  cancelled: "Cancelada",
};

// ─── paleta ──────────────────────────────────────────────────────────────────
const C = {
  primary: rgb(0.231, 0.51, 0.965), // #3b82f6
  primaryDark: rgb(0.145, 0.361, 0.816), // #2557d0
  primaryTint: rgb(0.914, 0.945, 0.996), // fondo azul muy claro
  ink: rgb(0.09, 0.11, 0.15),
  mid: rgb(0.4, 0.44, 0.5),
  light: rgb(0.62, 0.66, 0.71),
  white: rgb(1, 1, 1),
  border: rgb(0.89, 0.9, 0.93),
  rowAlt: rgb(0.976, 0.98, 0.988),
  green: rgb(0.06, 0.55, 0.36),
  greenTint: rgb(0.91, 0.97, 0.94),
  amber: rgb(0.78, 0.49, 0.05),
  amberTint: rgb(0.99, 0.95, 0.87),
  slate: rgb(0.46, 0.5, 0.56),
  slateTint: rgb(0.93, 0.94, 0.96),
  red: rgb(0.82, 0.2, 0.24),
  redTint: rgb(0.99, 0.92, 0.93),
};

const STATUS_STYLE: Record<string, { fg: ReturnType<typeof rgb>; bg: ReturnType<typeof rgb> }> = {
  draft: { fg: C.slate, bg: C.slateTint },
  confirmed: { fg: C.primaryDark, bg: C.primaryTint },
  paid: { fg: C.green, bg: C.greenTint },
  cancelled: { fg: C.red, bg: C.redTint },
};

const W = 595.28; // A4 pt
const H = 841.89;
const MARGIN = 50;

function fmtMoney(n: number, currency = "") {
  const sign = n < 0 ? "-" : "";
  const v = `${sign}$${Math.abs(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return currency ? `${v} ${currency}` : v;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
  return w;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - w / 2, y, size, font, color });
}

function drawPill(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  fg: ReturnType<typeof rgb>,
  bg: ReturnType<typeof rgb>
) {
  const size = 9;
  const padX = 10;
  const textW = font.widthOfTextAtSize(text.toUpperCase(), size);
  const boxW = textW + padX * 2;
  const boxH = 20;
  page.drawRectangle({ x: rightX - boxW, y: y - 5, width: boxW, height: boxH, color: bg });
  page.drawText(text.toUpperCase(), {
    x: rightX - boxW + padX,
    y,
    size,
    font,
    color: fg,
  });
  return boxW;
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

  const body = (await req.json()) as { sale_id: string };
  if (!body.sale_id) {
    return NextResponse.json({ error: "sale_id_required" }, { status: 400 });
  }

  const sb = getAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("privy_did", privyDid)
    .single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 401 });

  const { data: sale, error: saleErr } = await sb
    .from("sales")
    .select(
      "id, farm_id, sold_at, total_amount, currency, status, payment_method, invoice_number, notes, buyers(name, legal_id, phone, email), sale_items(description, quantity, unit_price, weight_kg, animals(tag, name)), farms(name, legal_id, address, region, country)"
    )
    .eq("id", body.sale_id)
    .single();

  if (saleErr || !sale) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: membership } = await sb
    .from("farm_members")
    .select("role")
    .eq("farm_id", sale.farm_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const farm = Array.isArray(sale.farms) ? sale.farms[0] : sale.farms;
  const buyer = Array.isArray(sale.buyers) ? sale.buyers[0] : sale.buyers;
  const items = sale.sale_items ?? [];

  // ─── Documento ───────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let logoImg = null;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "logo.png"));
    logoImg = await pdf.embedPng(logoBytes);
  } catch {
    logoImg = null;
  }

  const page = pdf.addPage([W, H]);
  const right = W - MARGIN;

  // ── Cabecera: logo + nombre finca a la izquierda, "NOTA DE ENTREGA" a la derecha ──
  let headTop = H - MARGIN;
  const logoSize = 42;
  if (logoImg) {
    page.drawImage(logoImg, {
      x: MARGIN,
      y: headTop - logoSize + 6,
      width: logoSize,
      height: logoSize,
    });
  }
  const farmName = farm?.name ?? "Finca El Progreso";
  const textX = logoImg ? MARGIN + logoSize + 12 : MARGIN;
  page.drawText(farmName, { x: textX, y: headTop - 12, size: 15, font: fontBold, color: C.ink });
  const farmLegal = farm?.legal_id ? `RIF/NIT: ${farm.legal_id}` : "";
  if (farmLegal) {
    page.drawText(farmLegal, { x: textX, y: headTop - 28, size: 8.5, font, color: C.mid });
  }

  // Tamaño menor que el de "FACTURA": el texto es más largo y a 22pt se
  // montaba sobre el nombre de la finca en la esquina izquierda.
  drawRightText(page, "NOTA DE ENTREGA", right, headTop - 6, 15, fontBold, C.primary);
  const invoiceLabel = sale.invoice_number ?? sale.id.slice(0, 8).toUpperCase();
  drawRightText(page, `N.° ${invoiceLabel}`, right, headTop - 26, 10, fontBold, C.ink);
  drawRightText(page, fmtDate(sale.sold_at), right, headTop - 39, 9, font, C.mid);

  let y = headTop - 62;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: right, y },
    thickness: 1.2,
    color: C.primary,
  });
  y -= 26;

  // ── Tarjetas: Emite / Entregar a ──────────────────────────────────────────
  const cardGap = 16;
  const cardW = (right - MARGIN - cardGap) / 2;
  const cardTop = y;
  const cardPad = 14;

  const farmAddr = [farm?.address, farm?.region, farm?.country].filter(Boolean).join(", ");
  const emitLines = [farmLegal, farmAddr].filter(Boolean);
  const buyerLines = buyer
    ? [
        buyer.legal_id ? `RIF/Cédula: ${buyer.legal_id}` : null,
        buyer.phone ?? null,
        buyer.email ?? null,
      ].filter(Boolean)
    : ["Sin comprador registrado"];

  const cardH = 34 + Math.max(emitLines.length, buyerLines.length) * 13 + cardPad;

  // caja izquierda: EMITE
  page.drawRectangle({
    x: MARGIN,
    y: cardTop - cardH,
    width: cardW,
    height: cardH,
    color: C.rowAlt,
    borderColor: C.border,
    borderWidth: 1,
  });
  page.drawRectangle({ x: MARGIN, y: cardTop - cardH, width: 3, height: cardH, color: C.primary });
  let ly = cardTop - cardPad - 2;
  page.drawText("EMITE", {
    x: MARGIN + cardPad,
    y: ly,
    size: 7.5,
    font: fontBold,
    color: C.primary,
  });
  ly -= 16;
  page.drawText(farmName, { x: MARGIN + cardPad, y: ly, size: 11, font: fontBold, color: C.ink });
  for (const line of emitLines) {
    ly -= 13;
    page.drawText(line as string, { x: MARGIN + cardPad, y: ly, size: 8.5, font, color: C.mid });
  }

  // caja derecha: ENTREGAR A
  const rightCardX = MARGIN + cardW + cardGap;
  page.drawRectangle({
    x: rightCardX,
    y: cardTop - cardH,
    width: cardW,
    height: cardH,
    color: C.white,
    borderColor: C.border,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: rightCardX,
    y: cardTop - cardH,
    width: 3,
    height: cardH,
    color: C.amber,
  });
  let ry = cardTop - cardPad - 2;
  page.drawText("ENTREGAR A", {
    x: rightCardX + cardPad,
    y: ry,
    size: 7.5,
    font: fontBold,
    color: C.amber,
  });
  ry -= 16;
  page.drawText(buyer?.name ?? "—", {
    x: rightCardX + cardPad,
    y: ry,
    size: 11,
    font: fontBold,
    color: C.ink,
  });
  for (const line of buyerLines) {
    ry -= 13;
    page.drawText(line as string, {
      x: rightCardX + cardPad,
      y: ry,
      size: 8.5,
      font,
      color: C.mid,
    });
  }

  y = cardTop - cardH - 28;

  // ── Estado + método de pago ───────────────────────────────────────────────
  const statusStyle = STATUS_STYLE[sale.status] ?? STATUS_STYLE.draft;
  drawPill(
    page,
    STATUS_LABEL[sale.status] ?? sale.status,
    right,
    y,
    fontBold,
    statusStyle.fg,
    statusStyle.bg
  );
  if (sale.payment_method) {
    page.drawText(`Método de pago:  ${PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}`, {
      x: MARGIN,
      y: y + 1,
      size: 9.5,
      font,
      color: C.mid,
    });
  }
  y -= 30;

  // ── Tabla de items ─────────────────────────────────────────────────────────
  const colDesc = MARGIN + 10;
  const colWeightR = MARGIN + 300;
  const colQtyR = MARGIN + 345;
  const colUnitR = MARGIN + 420;
  const colSubtotalR = right - 8;

  const headerH = 24;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerH + 6,
    width: right - MARGIN,
    height: headerH,
    color: C.primary,
  });
  const headerTextY = y - headerH + 15;
  page.drawText("DESCRIPCIÓN", {
    x: colDesc,
    y: headerTextY,
    size: 8,
    font: fontBold,
    color: C.white,
  });
  drawRightText(page, "PESO", colWeightR, headerTextY, 8, fontBold, C.white);
  drawRightText(page, "CANT.", colQtyR, headerTextY, 8, fontBold, C.white);
  drawRightText(page, "P. UNIT.", colUnitR, headerTextY, 8, fontBold, C.white);
  drawRightText(page, "SUBTOTAL", colSubtotalR, headerTextY, 8, fontBold, C.white);
  y -= headerH + 6;

  const rowH = 22;
  let computedSubtotal = 0;
  items.forEach((item, i) => {
    const animal = Array.isArray(item.animals) ? item.animals[0] : item.animals;
    const desc = animal
      ? `${animal.tag}${animal.name ? " · " + animal.name : ""}`
      : (item.description ?? "—");
    const subtotal = item.quantity * item.unit_price;
    computedSubtotal += subtotal;

    if (i % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowH + 7,
        width: right - MARGIN,
        height: rowH,
        color: C.rowAlt,
      });
    }
    const textY = y - rowH + 14;
    page.drawText(desc.length > 46 ? desc.slice(0, 45) + "…" : desc, {
      x: colDesc,
      y: textY,
      size: 9,
      font,
      color: C.ink,
    });
    drawRightText(
      page,
      item.weight_kg ? `${item.weight_kg} kg` : "—",
      colWeightR,
      textY,
      9,
      font,
      C.mid
    );
    drawRightText(page, String(item.quantity), colQtyR, textY, 9, font, C.mid);
    drawRightText(page, fmtMoney(item.unit_price), colUnitR, textY, 9, font, C.mid);
    drawRightText(page, fmtMoney(subtotal), colSubtotalR, textY, 9.5, fontBold, C.ink);
    y -= rowH;
  });

  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: right, y: y + 4 },
    thickness: 1,
    color: C.border,
  });
  y -= 20;

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalsBoxW = 230;
  const totalsBoxX = right - totalsBoxW;
  const hasDiscrepancy = Math.abs(computedSubtotal - sale.total_amount) > 0.01;

  let totalsH = 46;
  if (hasDiscrepancy) totalsH += 20;

  page.drawRectangle({
    x: totalsBoxX,
    y: y - totalsH + 14,
    width: totalsBoxW,
    height: totalsH,
    color: C.rowAlt,
    borderColor: C.border,
    borderWidth: 1,
  });

  let ty = y;
  if (hasDiscrepancy) {
    page.drawText("Subtotal", { x: totalsBoxX + 14, y: ty, size: 9.5, font, color: C.mid });
    drawRightText(
      page,
      fmtMoney(computedSubtotal),
      totalsBoxX + totalsBoxW - 14,
      ty,
      9.5,
      font,
      C.mid
    );
    ty -= 18;
    page.drawText("Ajuste / condiciones", {
      x: totalsBoxX + 14,
      y: ty,
      size: 9,
      font,
      color: C.mid,
    });
    drawRightText(
      page,
      fmtMoney(sale.total_amount - computedSubtotal),
      totalsBoxX + totalsBoxW - 14,
      ty,
      9,
      font,
      C.mid
    );
    ty -= 20;
    page.drawLine({
      start: { x: totalsBoxX + 14, y: ty + 10 },
      end: { x: totalsBoxX + totalsBoxW - 14, y: ty + 10 },
      thickness: 0.5,
      color: C.border,
    });
  } else {
    ty -= 4;
  }
  page.drawText("TOTAL", { x: totalsBoxX + 14, y: ty, size: 11, font: fontBold, color: C.ink });
  drawRightText(
    page,
    fmtMoney(sale.total_amount, sale.currency),
    totalsBoxX + totalsBoxW - 14,
    ty - 1,
    14,
    fontBold,
    C.primary
  );

  y = y - totalsH - 20;

  // ── Notas ─────────────────────────────────────────────────────────────────
  if (sale.notes) {
    page.drawText("OBSERVACIONES", { x: MARGIN, y, size: 8, font: fontBold, color: C.primary });
    y -= 15;
    const maxWidth = right - MARGIN;
    const words = sale.notes.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, 9.5) > maxWidth) {
        page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: C.mid });
        y -= 14;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: C.mid });
      y -= 14;
    }
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  const footerY = 56;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 16 },
    end: { x: right, y: footerY + 16 },
    thickness: 0.75,
    color: C.border,
  });
  drawCenteredText(
    page,
    `${farmName} · Documento generado digitalmente el ${new Date().toLocaleString("es-VE")}`,
    W / 2,
    footerY,
    7.5,
    fontOblique,
    C.light
  );
  drawCenteredText(
    page,
    "Este documento no requiere firma manuscrita para su validez interna.",
    W / 2,
    footerY - 12,
    7,
    font,
    C.light
  );

  const pdfBytes = await pdf.save();
  const filename = `nota-entrega-${invoiceLabel}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
