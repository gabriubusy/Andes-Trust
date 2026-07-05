// POST /api/reports/factura
// body: { sale_id: string }
// Genera el PDF de factura de una venta.

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  transfer: "Transferencia",
  check: "Cheque",
  crypto: "Criptomoneda",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  paid: "Cobrada",
  cancelled: "Cancelada",
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

  // ─── Construir PDF ─────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595; // A4
  const H = 842;
  const page = pdf.addPage([W, H]);
  const margin = 48;

  const C = {
    primary: rgb(0.145, 0.439, 0.937),
    dark: rgb(0.08, 0.09, 0.1),
    mid: rgb(0.35, 0.38, 0.42),
    light: rgb(0.6, 0.63, 0.67),
    white: rgb(1, 1, 1),
    border: rgb(0.88, 0.89, 0.91),
    rowAlt: rgb(0.97, 0.97, 0.98),
  };

  page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: C.primary });
  page.drawText("FACTURA", { x: margin, y: H - 38, size: 22, font: fontBold, color: C.white });
  const invoiceLabel = sale.invoice_number ?? sale.id.slice(0, 8).toUpperCase();
  page.drawText(`N° ${invoiceLabel}`, {
    x: margin,
    y: H - 58,
    size: 11,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
  page.drawText(fmtDate(sale.sold_at), {
    x: W - margin - 120,
    y: H - 45,
    size: 10,
    font: fontBold,
    color: C.white,
  });

  const farmName = farm?.name ?? "Finca El Progreso";
  const farmLegal = farm?.legal_id ? `RIF: ${farm.legal_id}` : "";
  const farmAddr = [farm?.address, farm?.region, farm?.country].filter(Boolean).join(", ");

  let y = H - 112;
  page.drawText("EMITE", { x: margin, y, size: 8, font: fontBold, color: C.primary });
  y -= 16;
  page.drawText(farmName, { x: margin, y, size: 12, font: fontBold, color: C.dark });
  y -= 15;
  if (farmLegal) {
    page.drawText(farmLegal, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }
  if (farmAddr) {
    page.drawText(farmAddr, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }

  const col2X = W / 2 + 10;
  let y2 = H - 112;
  page.drawText("FACTURAR A", { x: col2X, y: y2, size: 8, font: fontBold, color: C.primary });
  y2 -= 16;
  if (buyer) {
    page.drawText(buyer.name, { x: col2X, y: y2, size: 12, font: fontBold, color: C.dark });
    y2 -= 15;
    if (buyer.legal_id) {
      page.drawText(`RIF/Cédula: ${buyer.legal_id}`, {
        x: col2X,
        y: y2,
        size: 9,
        font,
        color: C.mid,
      });
      y2 -= 13;
    }
    if (buyer.phone) {
      page.drawText(buyer.phone, { x: col2X, y: y2, size: 9, font, color: C.mid });
      y2 -= 13;
    }
    if (buyer.email) {
      page.drawText(buyer.email, { x: col2X, y: y2, size: 9, font, color: C.mid });
      y2 -= 13;
    }
  } else {
    page.drawText("Sin comprador registrado", { x: col2X, y: y2, size: 10, font, color: C.mid });
    y2 -= 13;
  }

  y = Math.min(y, y2) - 20;
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 24;

  // ─── Tabla de items ──────────────────────────────────────────────────────
  const colDesc = margin;
  const colWeight = margin + 260;
  const colUnit = margin + 340;
  const colQty = margin + 400;
  const colSubtotal = W - margin - 80;

  const headerY = y;
  page.drawText("DESCRIPCIÓN", { x: colDesc, y: headerY, size: 8, font: fontBold, color: C.light });
  page.drawText("PESO", { x: colWeight, y: headerY, size: 8, font: fontBold, color: C.light });
  page.drawText("P. UNIT.", { x: colUnit, y: headerY, size: 8, font: fontBold, color: C.light });
  page.drawText("CANT.", { x: colQty, y: headerY, size: 8, font: fontBold, color: C.light });
  page.drawText("SUBTOTAL", {
    x: colSubtotal,
    y: headerY,
    size: 8,
    font: fontBold,
    color: C.light,
  });
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 18;

  const fmtMoney = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

  items.forEach((item, i) => {
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin - 4,
        y: y - 4,
        width: W - margin * 2 + 8,
        height: 18,
        color: C.rowAlt,
      });
    }
    const animal = Array.isArray(item.animals) ? item.animals[0] : item.animals;
    const desc = animal
      ? `${animal.tag}${animal.name ? " · " + animal.name : ""}`
      : (item.description ?? "—");
    page.drawText(desc.slice(0, 42), { x: colDesc, y, size: 9, font, color: C.dark });
    page.drawText(item.weight_kg ? `${item.weight_kg} kg` : "—", {
      x: colWeight,
      y,
      size: 9,
      font,
      color: C.mid,
    });
    page.drawText(fmtMoney(item.unit_price), { x: colUnit, y, size: 9, font, color: C.mid });
    page.drawText(String(item.quantity), { x: colQty, y, size: 9, font, color: C.mid });
    page.drawText(fmtMoney(item.quantity * item.unit_price), {
      x: colSubtotal,
      y,
      size: 9,
      font: fontBold,
      color: C.dark,
    });
    y -= 20;
  });

  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 26;

  page.drawText("TOTAL", { x: colUnit, y, size: 11, font: fontBold, color: C.dark });
  page.drawText(`${fmtMoney(sale.total_amount)} ${sale.currency}`, {
    x: colSubtotal - 20,
    y,
    size: 13,
    font: fontBold,
    color: C.primary,
  });
  y -= 26;

  if (sale.payment_method) {
    page.drawText(`Método de pago: ${PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: C.mid,
    });
    y -= 14;
  }
  page.drawText(`Estado: ${STATUS_LABEL[sale.status] ?? sale.status}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: C.mid,
  });
  y -= 14;

  if (sale.notes) {
    y -= 6;
    page.drawText("OBSERVACIONES", { x: margin, y, size: 8, font: fontBold, color: C.primary });
    y -= 14;
    page.drawText(sale.notes.slice(0, 110), { x: margin, y, size: 9, font, color: C.mid });
  }

  page.drawText(`Generado: ${new Date().toLocaleString("es-VE")}`, {
    x: margin,
    y: margin,
    size: 7,
    font,
    color: C.light,
  });

  const pdfBytes = await pdf.save();
  const filename = `factura-${invoiceLabel}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
