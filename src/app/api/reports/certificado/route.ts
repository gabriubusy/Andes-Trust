// POST /api/reports/certificado
// body: { certification_id: string }
// Genera un PDF oficial del certificado con QR de verificación blockchain.

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

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

const CERT_TYPE_LABELS: Record<string, string> = {
  origin: "Origen",
  health: "Sanidad Animal",
  organic: "Producción Orgánica",
  welfare: "Bienestar Animal",
  export: "Exportación",
  other: "General",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  try {
    await getPrivy().verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = (await req.json()) as { certification_id: string };
  if (!body.certification_id) {
    return NextResponse.json({ error: "certification_id_required" }, { status: 400 });
  }

  const sb = getAdmin();

  // Cargar certificado con datos relacionados
  const { data: cert, error: certErr } = await sb
    .from("certifications")
    .select(
      "id, type, issuer, issued_at, valid_until, document_url, metadata, farm_id, animal_id, animals(tag, name, sex, birth_date, current_weight_kg), farms(name, legal_id, address, region, country)"
    )
    .eq("id", body.certification_id)
    .single();

  if (certErr || !cert) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Cargar firma blockchain si existe
  const { data: sig } = await sb
    .from("signatures")
    .select("payload_hash, anchor_tx, signed_at, signer_address")
    .eq("entity_type", "certifications")
    .eq("entity_id", body.certification_id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const farm = Array.isArray(cert.farms) ? cert.farms[0] : cert.farms;
  const animal = Array.isArray(cert.animals) ? cert.animals[0] : cert.animals;
  const meta = (cert.metadata ?? {}) as Record<string, string>;
  const typeLabel = CERT_TYPE_LABELS[cert.type] ?? cert.type;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fincaelprogreso.com";
  const verifyUrl = `${appUrl}/api/verify/certifications/${cert.id}`;

  // ─── Construir PDF ───────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595; // A4
  const H = 842;
  const page = pdf.addPage([W, H]);
  const margin = 48;

  // Paleta
  const C = {
    primary: rgb(0.145, 0.439, 0.937), // azul #2570ef
    dark: rgb(0.08, 0.09, 0.1),
    mid: rgb(0.35, 0.38, 0.42),
    light: rgb(0.6, 0.63, 0.67),
    bg: rgb(0.96, 0.97, 0.98),
    white: rgb(1, 1, 1),
    green: rgb(0.13, 0.65, 0.4),
    amber: rgb(0.85, 0.55, 0.1),
    red: rgb(0.85, 0.2, 0.2),
    border: rgb(0.88, 0.89, 0.91),
  };

  // ── Banda superior azul ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: C.primary });

  // Título en la banda
  page.drawText("CERTIFICADO OFICIAL", {
    x: margin,
    y: H - 38,
    size: 20,
    font: fontBold,
    color: C.white,
  });
  page.drawText(typeLabel.toUpperCase(), {
    x: margin,
    y: H - 58,
    size: 11,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  // Número de certificado (esquina derecha)
  const certNum = cert.id.slice(0, 8).toUpperCase();
  page.drawText(`N° ${certNum}`, {
    x: W - margin - 90,
    y: H - 45,
    size: 10,
    font: fontBold,
    color: C.white,
  });

  // ── Nombre de la finca ───────────────────────────────────────────────
  const farmName = farm?.name ?? "Finca El Progreso";
  const farmLegal = farm?.legal_id ? `RIF: ${farm.legal_id}` : "";
  const farmAddr = [farm?.address, farm?.region, farm?.country].filter(Boolean).join(", ");

  let y = H - 110;
  page.drawText(farmName, { x: margin, y, size: 13, font: fontBold, color: C.dark });
  y -= 16;
  if (farmLegal) {
    page.drawText(farmLegal, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }
  if (farmAddr) {
    page.drawText(farmAddr, { x: margin, y, size: 9, font, color: C.mid });
    y -= 13;
  }

  // ── Separador ────────────────────────────────────────────────────────
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 20;

  // ── Sección: Datos del certificado ───────────────────────────────────
  const drawField = (label: string, value: string, xOffset = 0) => {
    page.drawText(label.toUpperCase(), {
      x: margin + xOffset,
      y: y + 12,
      size: 7,
      font,
      color: C.light,
    });
    page.drawText(value || "—", {
      x: margin + xOffset,
      y,
      size: 10,
      font: fontBold,
      color: C.dark,
    });
  };

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

  const now = Date.now();
  const expired = cert.valid_until ? new Date(cert.valid_until).getTime() < now : false;
  const nearExpiry = cert.valid_until
    ? !expired && (new Date(cert.valid_until).getTime() - now) / 86400000 <= 30
    : false;
  const statusLabel = expired ? "VENCIDO" : nearExpiry ? "POR VENCER" : "VIGENTE";
  const statusColor = expired ? C.red : nearExpiry ? C.amber : C.green;

  // Estado badge
  page.drawRectangle({
    x: W - margin - 80,
    y: y - 4,
    width: 80,
    height: 26,
    color: statusColor,
    borderRadius: 4,
  });
  page.drawText(statusLabel, {
    x: W - margin - 80 + (80 - fontBold.widthOfTextAtSize(statusLabel, 9)) / 2,
    y: y + 5,
    size: 9,
    font: fontBold,
    color: C.white,
  });

  drawField("Tipo", typeLabel);
  y -= 32;
  drawField("Emisor / Entidad certificadora", cert.issuer ?? "—");
  y -= 32;

  const col2 = (W - margin * 2) / 2;
  drawField("Fecha de emisión", fmt(cert.issued_at));
  drawField("Fecha de vencimiento", fmt(cert.valid_until), col2);
  y -= 36;

  // ── Separador ────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: C.border,
  });
  y -= 20;

  // ── Animal (si aplica) ───────────────────────────────────────────────
  if (animal) {
    page.drawText("ANIMAL CERTIFICADO", {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: C.primary,
    });
    y -= 18;

    drawField("Arete / Identificación", animal.tag);
    drawField("Nombre", animal.name ?? "Sin nombre", col2);
    y -= 32;
    drawField(
      "Sexo",
      animal.sex === "M" ? "Macho" : animal.sex === "F" ? "Hembra" : (animal.sex ?? "—")
    );
    drawField("Fecha de nacimiento", fmt(animal.birth_date ?? null), col2);
    y -= 32;
    if (animal.current_weight_kg) {
      drawField("Peso actual", `${animal.current_weight_kg} kg`);
      y -= 32;
    }

    page.drawLine({
      start: { x: margin, y },
      end: { x: W - margin, y },
      thickness: 0.5,
      color: C.border,
    });
    y -= 20;
  }

  // ── Metadatos adicionales (fat%, protein%, etc.) ─────────────────────
  const metaEntries = Object.entries(meta).filter(([k]) => k !== "notes");
  if (metaEntries.length > 0) {
    page.drawText("DATOS DE CALIDAD", { x: margin, y, size: 8, font: fontBold, color: C.primary });
    y -= 18;

    const metaLabels: Record<string, string> = {
      fat_pct: "Contenido de grasa (%)",
      protein_pct: "Contenido de proteína (%)",
      somatic_cells: "Células somáticas (cel/mL)",
      bacteria_count: "Recuento bacteriano (UFC/mL)",
      acidity: "Acidez (°Dornic)",
      density: "Densidad (g/mL)",
      temperature: "Temperatura (°C)",
      volume_liters: "Volumen (L)",
      sample_date: "Fecha de muestra",
    };

    let col = 0;
    for (const [k, v] of metaEntries) {
      const label = metaLabels[k] ?? k.replace(/_/g, " ");
      drawField(label, String(v), col === 0 ? 0 : col2);
      if (col === 1) {
        y -= 32;
        col = 0;
      } else {
        col = 1;
      }
    }
    if (col === 1) y -= 32;

    page.drawLine({
      start: { x: margin, y },
      end: { x: W - margin, y },
      thickness: 0.5,
      color: C.border,
    });
    y -= 20;
  }

  // ── Notas ────────────────────────────────────────────────────────────
  if (meta.notes) {
    page.drawText("OBSERVACIONES", { x: margin, y, size: 8, font: fontBold, color: C.primary });
    y -= 16;
    const words = meta.notes.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, 9) > W - margin * 2) {
        page.drawText(line, { x: margin, y, size: 9, font, color: C.mid });
        y -= 13;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 9, font, color: C.mid });
      y -= 13;
    }
    y -= 10;
  }

  // ── Blockchain / Firma ───────────────────────────────────────────────
  if (sig) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: W - margin, y },
      thickness: 0.5,
      color: C.border,
    });
    y -= 20;
    page.drawText("TRAZABILIDAD BLOCKCHAIN", {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: C.primary,
    });
    y -= 18;
    page.drawText(`Hash: ${sig.payload_hash}`, { x: margin, y, size: 7.5, font, color: C.mid });
    y -= 13;
    if (sig.signer_address) {
      page.drawText(`Firmado por: ${sig.signer_address}`, {
        x: margin,
        y,
        size: 7.5,
        font,
        color: C.mid,
      });
      y -= 13;
    }
    if (sig.anchor_tx) {
      page.drawText(`TX Blockchain: ${sig.anchor_tx}`, {
        x: margin,
        y,
        size: 7.5,
        font,
        color: C.mid,
      });
      y -= 13;
    }
    const signedDate = new Date(sig.signed_at).toLocaleString("es-VE");
    page.drawText(`Firmado el: ${signedDate}`, { x: margin, y, size: 7.5, font, color: C.mid });
  }

  // ── QR + pie de página ───────────────────────────────────────────────
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 100 });
  const qrPng = await pdf.embedPng(qrDataUrl);
  const qrSize = 80;
  const qrX = W - margin - qrSize;
  const qrY = margin + 10;

  page.drawImage(qrPng, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Verificar autenticidad", {
    x: qrX + qrSize / 2 - font.widthOfTextAtSize("Verificar autenticidad", 7) / 2,
    y: qrY - 11,
    size: 7,
    font,
    color: C.light,
  });

  // Línea de pie
  page.drawLine({
    start: { x: margin, y: margin + 100 },
    end: { x: W - margin - qrSize - 10, y: margin + 100 },
    thickness: 0.5,
    color: C.border,
  });
  page.drawText(
    "Este certificado ha sido generado digitalmente por la plataforma Finca El Progreso.",
    {
      x: margin,
      y: margin + 86,
      size: 7,
      font,
      color: C.light,
    }
  );
  page.drawText("Su autenticidad puede verificarse escaneando el código QR o en: " + verifyUrl, {
    x: margin,
    y: margin + 74,
    size: 7,
    font,
    color: C.light,
  });
  page.drawText(`Generado: ${new Date().toLocaleString("es-VE")}`, {
    x: margin,
    y: margin + 62,
    size: 7,
    font,
    color: C.light,
  });

  const pdfBytes = await pdf.save();
  const filename = `certificado-${typeLabel.replace(/\s+/g, "_")}-${certNum}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
