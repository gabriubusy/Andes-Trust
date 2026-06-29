// POST /api/reports/calidad-lactea
// body: { farm_id, date_from?, date_to?, animal_ids? }

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
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

type MilkRecord = {
  id: string;
  animal_id: string | null;
  recorded_on: string;
  shift: string;
  liters: number;
  fat_pct: number | null;
  protein_pct: number | null;
  scc: number | null;
  temperature_c: number | null;
  notes: string | null;
  animals: { tag: string; name: string | null } | null;
};

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function round2(n: number): string {
  return n.toFixed(2);
}

// pdf-lib Helvetica only supports WinAnsi — strip non-ASCII
function t(text: string): string {
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
    .replace(/→/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[·•]/g, ".")
    .replace(/°/g, "deg")
    .replace(/[«»""'']/g, '"')
    .replace(/[^\x00-\xFF]/g, "?");
}

type QualityResult = {
  label: string;
  grade: "A" | "B" | "C" | "-";
  color: [number, number, number];
  bg: [number, number, number];
};

function classifyMilk(
  fat: number | null,
  protein: number | null,
  scc: number | null
): QualityResult {
  if (fat === null && protein === null)
    return {
      label: "Sin datos suficientes",
      grade: "-",
      color: [0.5, 0.5, 0.55],
      bg: [0.94, 0.94, 0.95],
    };
  const fatOk = fat !== null ? fat >= 3.2 : true;
  const proteinOk = protein !== null ? protein >= 2.8 : true;
  const sccOk = scc !== null ? scc <= 400000 : true;
  if (fatOk && proteinOk && sccOk)
    return {
      label: "Calidad A - Optima",
      grade: "A",
      color: [0.06, 0.6, 0.35],
      bg: [0.9, 0.97, 0.93],
    };
  if (sccOk)
    return {
      label: "Calidad B - Aceptable",
      grade: "B",
      color: [0.82, 0.5, 0.05],
      bg: [0.99, 0.95, 0.88],
    };
  return {
    label: "Calidad C - Observar",
    grade: "C",
    color: [0.8, 0.15, 0.15],
    bg: [0.99, 0.91, 0.91],
  };
}

// ─── Layout constants ──────────────────────────────────────────────────────────
const W = 595,
  H = 842;
const ML = 48,
  MR = 48;
const CW = W - ML - MR; // content width

const C = {
  navy: rgb(0.07, 0.13, 0.26),
  primary: rgb(0.11, 0.38, 0.82),
  accent: rgb(0.06, 0.6, 0.85),
  dark: rgb(0.1, 0.11, 0.13),
  mid: rgb(0.38, 0.41, 0.46),
  light: rgb(0.6, 0.63, 0.68),
  xlight: rgb(0.8, 0.82, 0.85),
  white: rgb(1, 1, 1),
  bg: rgb(0.97, 0.97, 0.98),
  bg2: rgb(0.93, 0.95, 0.98),
  border: rgb(0.87, 0.88, 0.9),
  green: rgb(0.06, 0.6, 0.35),
  greenBg: rgb(0.9, 0.97, 0.93),
  amber: rgb(0.82, 0.5, 0.05),
  amberBg: rgb(0.99, 0.95, 0.88),
  red: rgb(0.8, 0.15, 0.15),
  redBg: rgb(0.99, 0.91, 0.91),
};

// ─── Drawing helpers ───────────────────────────────────────────────────────────

function hline(page: PDFPage, y: number, color = C.border, thickness = 0.4) {
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness, color });
}

function sectionLabel(
  page: PDFPage,
  y: number,
  text: string,
  font: PDFFont,
  fontBold: PDFFont
): number {
  // Accent bar left + label
  page.drawRectangle({ x: ML, y: y - 11, width: 3, height: 14, color: C.primary });
  page.drawText(text, { x: ML + 10, y, size: 8, font: fontBold, color: C.primary });
  return y - 22;
}

function pill(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  color: ReturnType<typeof rgb>,
  bg: ReturnType<typeof rgb>,
  font: PDFFont
) {
  const tw = font.widthOfTextAtSize(text, 7);
  page.drawRectangle({ x, y: y - 4, width: tw + 10, height: 13, color: bg });
  page.drawText(text, { x: x + 5, y, size: 7, font, color });
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
    date_from?: string;
    date_to?: string;
    animal_ids?: string[];
  };
  if (!body.farm_id) return NextResponse.json({ error: "farm_id_required" }, { status: 400 });

  const sb = getAdmin();

  const [{ data: profile }, { data: farm }] = await Promise.all([
    sb.from("profiles").select("id, full_name, email").eq("privy_did", privyDid).single(),
    sb
      .from("farms")
      .select("name, legal_id, address, region, country")
      .eq("id", body.farm_id)
      .single(),
  ]);
  if (!farm) return NextResponse.json({ error: "farm_not_found" }, { status: 404 });

  let q = sb
    .from("milk_records")
    .select(
      "id, animal_id, recorded_on, shift, liters, fat_pct, protein_pct, scc, temperature_c, notes, animals(tag, name)"
    )
    .eq("farm_id", body.farm_id)
    .order("recorded_on", { ascending: true });

  if (body.date_from) q = q.gte("recorded_on", body.date_from);
  if (body.date_to) q = q.lte("recorded_on", body.date_to);
  if (body.animal_ids?.length) q = q.in("animal_id", body.animal_ids);

  const { data: records } = await q;
  const rows = (records ?? []) as unknown as MilkRecord[];
  if (!rows.length) return NextResponse.json({ error: "no_records" }, { status: 404 });

  // ─── Aggregations ────────────────────────────────────────────────────────────
  const totalLiters = rows.reduce((s, r) => s + Number(r.liters), 0);
  const fats = rows.filter((r) => r.fat_pct !== null).map((r) => Number(r.fat_pct));
  const proteins = rows.filter((r) => r.protein_pct !== null).map((r) => Number(r.protein_pct));
  const sccs = rows.filter((r) => r.scc !== null).map((r) => Number(r.scc));
  const temps = rows.filter((r) => r.temperature_c !== null).map((r) => Number(r.temperature_c));
  const avgFat = fats.length ? avg(fats) : null;
  const avgProtein = proteins.length ? avg(proteins) : null;
  const avgScc = sccs.length ? avg(sccs) : null;
  const avgTemp = temps.length ? avg(temps) : null;
  const quality = classifyMilk(avgFat, avgProtein, avgScc);

  // Weekly buckets
  const byWeek: Record<
    string,
    { liters: number; fat: number[]; protein: number[]; scc: number[] }
  > = {};
  for (const r of rows) {
    const d = new Date(r.recorded_on);
    const ws = new Date(d);
    ws.setDate(d.getDate() - d.getDay());
    const key = ws.toISOString().slice(0, 10);
    if (!byWeek[key]) byWeek[key] = { liters: 0, fat: [], protein: [], scc: [] };
    byWeek[key].liters += Number(r.liters);
    if (r.fat_pct !== null) byWeek[key].fat.push(Number(r.fat_pct));
    if (r.protein_pct !== null) byWeek[key].protein.push(Number(r.protein_pct));
    if (r.scc !== null) byWeek[key].scc.push(Number(r.scc));
  }
  const weeks = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));

  // Per-animal
  const byAnimal: Record<
    string,
    {
      tag: string;
      name: string | null;
      liters: number;
      fat: number[];
      protein: number[];
      count: number;
    }
  > = {};
  for (const r of rows) {
    const ao = Array.isArray(r.animals) ? r.animals[0] : r.animals;
    const key = r.animal_id ?? "farm";
    const tag = ao?.tag ?? "Finca";
    if (!byAnimal[key])
      byAnimal[key] = { tag, name: ao?.name ?? null, liters: 0, fat: [], protein: [], count: 0 };
    byAnimal[key].liters += Number(r.liters);
    byAnimal[key].count += 1;
    if (r.fat_pct !== null) byAnimal[key].fat.push(Number(r.fat_pct));
    if (r.protein_pct !== null) byAnimal[key].protein.push(Number(r.protein_pct));
  }

  // ─── PDF build ───────────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const farmName = t(farm.name ?? "Finca El Progreso");
  const generatedBy = t(profile?.full_name ?? profile?.email ?? privyDid);
  const nowStr = t(new Date().toLocaleString("es-VE"));
  const periodStr = `${body.date_from ? t(new Date(body.date_from + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })) : "Inicio"} — ${body.date_to ? t(new Date(body.date_to + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })) : "Hoy"}`;

  let page = pdf.addPage([W, H]);
  let y = H;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    // Thin left accent bar on every page
    page.drawRectangle({ x: 0, y: 0, width: 4, height: H, color: C.navy });
    y = H - 36;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 72) newPage();
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Cover header
  // ══════════════════════════════════════════════════════════════════════════════

  // Full-width dark navy header block
  const headerH = 148;
  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: C.navy });

  // Decorative diagonal accent — simulate with rotated thin rects using overlapping approach
  // Right-side geometric accent: two overlapping rectangles
  page.drawRectangle({
    x: W - 120,
    y: H - headerH,
    width: 120,
    height: headerH,
    color: rgb(0.1, 0.19, 0.36),
  });
  page.drawRectangle({
    x: W - 70,
    y: H - headerH,
    width: 70,
    height: headerH,
    color: rgb(0.11, 0.23, 0.45),
  });

  // Left accent stripe
  page.drawRectangle({ x: 0, y: H - headerH, width: 5, height: headerH, color: C.accent });

  // Eyebrow label
  page.drawText("FINCA EL PROGRESO  |  SISTEMA DE TRAZABILIDAD", {
    x: ML,
    y: H - 22,
    size: 6.5,
    font,
    color: rgb(0.45, 0.6, 0.85),
  });

  // Title
  page.drawText("REPORTE DE", { x: ML, y: H - 42, size: 22, font, color: rgb(0.55, 0.7, 0.95) });
  page.drawText("CALIDAD LACTEA", { x: ML, y: H - 66, size: 28, font: fontBold, color: C.white });

  // Subtitle
  page.drawText("Analisis de produccion, composicion y clasificacion COVENIN 903", {
    x: ML,
    y: H - 84,
    size: 8,
    font,
    color: rgb(0.55, 0.65, 0.8),
  });

  // Farm + period info row inside header
  page.drawRectangle({
    x: ML - 4,
    y: H - 138,
    width: CW + 8,
    height: 44,
    color: rgb(0.04, 0.08, 0.18),
  });
  page.drawText(t("Unidad de produccion:"), {
    x: ML + 4,
    y: H - 106,
    size: 7,
    font,
    color: rgb(0.45, 0.6, 0.85),
  });
  page.drawText(farmName, { x: ML + 4, y: H - 120, size: 10, font: fontBold, color: C.white });

  const farmAddr = [farm.address, farm.region, farm.country].filter(Boolean).join(", ");
  if (farmAddr) {
    page.drawText(t(farmAddr), {
      x: ML + 4,
      y: H - 132,
      size: 7,
      font,
      color: rgb(0.45, 0.6, 0.85),
    });
  }

  // Period block right-aligned in info row
  page.drawText("Periodo analizado:", {
    x: W - MR - 160,
    y: H - 106,
    size: 7,
    font,
    color: rgb(0.45, 0.6, 0.85),
  });
  page.drawText(periodStr, {
    x: W - MR - 160,
    y: H - 120,
    size: 9,
    font: fontBold,
    color: C.white,
  });
  page.drawText(`${rows.length} registros`, {
    x: W - MR - 160,
    y: H - 132,
    size: 7,
    font,
    color: rgb(0.45, 0.6, 0.85),
  });

  y = H - headerH - 18;

  // Meta line
  page.drawText(
    t(
      `Generado: ${nowStr}   |   Por: ${generatedBy}${farm.legal_id ? `   |   RIF: ${farm.legal_id}` : ""}`
    ),
    {
      x: ML,
      y,
      size: 7,
      font,
      color: C.light,
    }
  );
  y -= 18;

  // ══════════════════════════════════════════════════════════════════════════════
  // GRADE BANNER
  // ══════════════════════════════════════════════════════════════════════════════
  const qClr = rgb(...quality.color);
  const qBgClr = rgb(...quality.bg);
  const bannerH = 56;

  // Background
  page.drawRectangle({ x: ML, y: y - bannerH, width: CW, height: bannerH, color: qBgClr });
  // Left thick accent
  page.drawRectangle({ x: ML, y: y - bannerH, width: 5, height: bannerH, color: qClr });

  // Grade circle
  const circleX = ML + 34,
    circleY = y - bannerH / 2;
  page.drawRectangle({ x: circleX - 16, y: circleY - 15, width: 30, height: 30, color: qClr });
  page.drawText(quality.grade, {
    x: quality.grade === "-" ? circleX - 6 : circleX - 8,
    y: circleY - 7,
    size: 20,
    font: fontBold,
    color: C.white,
  });

  // Label + description
  page.drawText(quality.label, { x: ML + 58, y: y - 16, size: 14, font: fontBold, color: qClr });
  page.drawText(
    "Evaluacion basada en norma COVENIN 903  |  Grasa >= 3.2%  |  Proteina >= 2.8%  |  SCC <= 400,000 cel/mL",
    {
      x: ML + 58,
      y: y - 30,
      size: 7,
      font,
      color: C.mid,
    }
  );
  page.drawText(
    `Total producido en el periodo: ${round2(totalLiters)} L  (${rows.length} registros)`,
    {
      x: ML + 58,
      y: y - 43,
      size: 7.5,
      font: fontBold,
      color: C.dark,
    }
  );

  y -= bannerH + 20;

  // ══════════════════════════════════════════════════════════════════════════════
  // KPI CARDS — 4 columns
  // ══════════════════════════════════════════════════════════════════════════════
  y = sectionLabel(page, y, "INDICADORES DEL PERIODO", font, fontBold);

  const cardH = 68;
  const cardGap = 8;
  const cardW = (CW - cardGap * 3) / 4;

  type KpiCard = {
    label: string;
    value: string;
    sub: string;
    accent: ReturnType<typeof rgb>;
    accentBg: ReturnType<typeof rgb>;
  };
  const kpiCards: KpiCard[] = [
    {
      label: "Total producido",
      value: `${round2(totalLiters)} L`,
      sub: `${rows.length} registros`,
      accent: C.primary,
      accentBg: C.bg2,
    },
    {
      label: "Promedio grasa",
      value: avgFat !== null ? `${round2(avgFat)}%` : "Sin datos",
      sub:
        avgFat !== null
          ? avgFat >= 3.2
            ? "Optima (>=3.2%)"
            : "Baja (<3.2%)"
          : `${fats.length} muestras`,
      accent: avgFat !== null ? (avgFat >= 3.2 ? C.green : C.amber) : C.xlight,
      accentBg: avgFat !== null ? (avgFat >= 3.2 ? C.greenBg : C.amberBg) : C.bg,
    },
    {
      label: "Promedio proteina",
      value: avgProtein !== null ? `${round2(avgProtein)}%` : "Sin datos",
      sub:
        avgProtein !== null
          ? avgProtein >= 2.8
            ? "Optima (>=2.8%)"
            : "Baja (<2.8%)"
          : `${proteins.length} muestras`,
      accent: avgProtein !== null ? (avgProtein >= 2.8 ? C.green : C.amber) : C.xlight,
      accentBg: avgProtein !== null ? (avgProtein >= 2.8 ? C.greenBg : C.amberBg) : C.bg,
    },
    {
      label: "Promedio SCC",
      value: avgScc !== null ? `${Math.round(avgScc / 1000)}k` : "Sin datos",
      sub:
        avgScc !== null
          ? avgScc <= 200000
            ? "Optimo (<=200k)"
            : avgScc <= 400000
              ? "Aceptable"
              : "Alto (>400k)"
          : "cel/mL",
      accent:
        avgScc !== null
          ? avgScc <= 200000
            ? C.green
            : avgScc <= 400000
              ? C.amber
              : C.red
          : C.xlight,
      accentBg:
        avgScc !== null
          ? avgScc <= 200000
            ? C.greenBg
            : avgScc <= 400000
              ? C.amberBg
              : C.redBg
          : C.bg,
    },
  ];

  for (let i = 0; i < kpiCards.length; i++) {
    const cx = ML + i * (cardW + cardGap);
    const k = kpiCards[i];
    // Card background
    page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: cardH, color: k.accentBg });
    // Top accent bar
    page.drawRectangle({ x: cx, y: y - 3, width: cardW, height: 3, color: k.accent });
    // Label
    page.drawText(k.label, { x: cx + 8, y: y - 16, size: 7, font, color: C.mid });
    // Value
    page.drawText(k.value, { x: cx + 8, y: y - 34, size: 16, font: fontBold, color: k.accent });
    // Sub
    page.drawText(k.sub, { x: cx + 8, y: y - 50, size: 7, font, color: C.mid });
    // Bottom hint line
    page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: 1, color: k.accent });
  }

  // Extra KPIs row — temp + shifts
  const shifts = { AM: 0, PM: 0 };
  for (const r of rows) {
    if (r.shift?.toUpperCase().includes("AM") || r.shift?.toUpperCase().includes("MANA"))
      shifts.AM++;
    else shifts.PM++;
  }

  y -= cardH + 14;

  // Two smaller stat pills
  const extraStats = [
    avgTemp !== null ? `Temp. promedio: ${round2(avgTemp)} deg C` : null,
    `Ordenos AM: ${shifts.AM}  |  PM: ${shifts.PM}`,
  ].filter(Boolean) as string[];

  for (const stat of extraStats) {
    pill(page, ML + extraStats.indexOf(stat) * 220, y, stat, C.mid, C.bg, font);
  }
  y -= 22;

  // ══════════════════════════════════════════════════════════════════════════════
  // BAR CHART — VOLUMEN SEMANAL
  // ══════════════════════════════════════════════════════════════════════════════
  if (weeks.length >= 1) {
    ensureSpace(140);
    y = sectionLabel(page, y, "VOLUMEN SEMANAL DE PRODUCCION (Litros)", font, fontBold);

    const chartH = 90;
    const chartW = CW;
    const maxL = Math.max(...weeks.map(([, d]) => d.liters), 1);
    const barSlot = Math.floor(chartW / Math.max(weeks.length, 1));
    const barW = Math.max(8, Math.min(40, barSlot - 8));

    // Y-axis gridlines + labels (4 levels)
    for (let lvl = 0; lvl <= 4; lvl++) {
      const ly = y - chartH + (lvl / 4) * chartH;
      const val = Math.round(maxL * (1 - lvl / 4));
      page.drawLine({
        start: { x: ML + 28, y: ly },
        end: { x: ML + chartW, y: ly },
        thickness: 0.3,
        color: C.border,
      });
      page.drawText(String(val), { x: ML, y: ly - 3, size: 6, font, color: C.xlight });
    }

    // Bars
    for (let i = 0; i < weeks.length; i++) {
      const [weekKey, data] = weeks[i];
      const wq = classifyMilk(
        data.fat.length ? avg(data.fat) : null,
        data.protein.length ? avg(data.protein) : null,
        data.scc.length ? avg(data.scc) : null
      );
      const barClr = rgb(...wq.color);
      const barH = maxL > 0 ? (data.liters / maxL) * (chartH - 4) : 2;
      const bx = ML + 28 + i * barSlot + (barSlot - barW) / 2;

      // Bar fill (two-tone: lighter base + solid top strip)
      page.drawRectangle({
        x: bx,
        y: y - chartH + 1,
        width: barW,
        height: barH - 3,
        color: rgb(...(wq.bg as [number, number, number])),
      });
      page.drawRectangle({
        x: bx,
        y: y - chartH + barH - 3,
        width: barW,
        height: 3,
        color: barClr,
      });

      // Value label on top
      const valLabel = Math.round(data.liters).toString();
      const vw = font.widthOfTextAtSize(valLabel, 6);
      if (barH > 12) {
        page.drawText(valLabel, {
          x: bx + barW / 2 - vw / 2,
          y: y - chartH + barH + 2,
          size: 6,
          font,
          color: C.mid,
        });
      }

      // X-axis label
      const weekLabel = t(
        new Date(weekKey + "T12:00:00").toLocaleDateString("es-VE", {
          day: "2-digit",
          month: "short",
        })
      );
      const lw = font.widthOfTextAtSize(weekLabel, 5.5);
      page.drawText(weekLabel, {
        x: bx + barW / 2 - lw / 2,
        y: y - chartH - 12,
        size: 5.5,
        font,
        color: C.light,
      });
    }

    // X-axis baseline
    page.drawLine({
      start: { x: ML + 28, y: y - chartH },
      end: { x: ML + chartW, y: y - chartH },
      thickness: 0.6,
      color: C.mid,
    });
    y -= chartH + 18;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // WEEKLY TABLE
  // ══════════════════════════════════════════════════════════════════════════════
  ensureSpace(60 + weeks.length * 20);
  y = sectionLabel(page, y, "TENDENCIA SEMANAL DETALLADA", font, fontBold);

  const tCols = [120, 60, 60, 60, 60, 127];
  const tColsX = tCols.reduce<number[]>(
    (acc, w, i) => [...acc, (acc[i - 1] ?? ML) + (i === 0 ? 0 : tCols[i - 1])],
    []
  );
  const tHdrs = ["Semana (inicio)", "Litros", "Grasa %", "Proteina %", "SCC k", "Clasificacion"];
  const tRowH = 19;

  // Header row
  page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: C.navy });
  for (let i = 0; i < tHdrs.length; i++) {
    page.drawText(tHdrs[i], {
      x: tColsX[i] + 5,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: C.white,
    });
  }
  y -= tRowH;

  let alt = false;
  for (const [weekKey, data] of weeks) {
    ensureSpace(tRowH + 4);
    const wFat = data.fat.length ? avg(data.fat) : null;
    const wProt = data.protein.length ? avg(data.protein) : null;
    const wScc = data.scc.length ? avg(data.scc) : null;
    const wq = classifyMilk(wFat, wProt, wScc !== null ? wScc : null);

    if (alt) page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: C.bg });

    const weekLabel = t(
      new Date(weekKey + "T12:00:00").toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
    const cells = [
      weekLabel,
      round2(data.liters),
      wFat !== null ? round2(wFat) : "—",
      wProt !== null ? round2(wProt) : "—",
      wScc !== null ? Math.round(wScc / 1000).toString() : "—",
      wq.label,
    ];
    for (let i = 0; i < cells.length; i++) {
      const isClass = i === 5;
      page.drawText(cells[i], {
        x: tColsX[i] + 5,
        y: y - 10,
        size: isClass ? 7.5 : 8,
        font: isClass ? fontBold : font,
        color: isClass ? rgb(...wq.color) : C.dark,
      });
    }
    page.drawLine({
      start: { x: ML, y: y - tRowH + 3 },
      end: { x: W - MR, y: y - tRowH + 3 },
      thickness: 0.25,
      color: C.border,
    });
    y -= tRowH;
    alt = !alt;
  }
  y -= 10;

  // ══════════════════════════════════════════════════════════════════════════════
  // PER-ANIMAL TABLE (only if multiple animals)
  // ══════════════════════════════════════════════════════════════════════════════
  const animalEntries = Object.entries(byAnimal);
  if (animalEntries.length > 1) {
    ensureSpace(60 + animalEntries.length * 20);
    y = sectionLabel(page, y, "PRODUCCION POR ANIMAL", font, fontBold);

    const aCols = [65, 110, 55, 65, 90, 122];
    const aColsX = aCols.reduce<number[]>(
      (acc, w, i) => [...acc, (acc[i - 1] ?? ML) + (i === 0 ? 0 : aCols[i - 1])],
      []
    );
    const aHdrs = ["Arete", "Nombre", "Registros", "Total (L)", "Grasa prom.", "Proteina prom."];

    page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: C.navy });
    for (let i = 0; i < aHdrs.length; i++) {
      page.drawText(aHdrs[i], {
        x: aColsX[i] + 5,
        y: y - 10,
        size: 7.5,
        font: fontBold,
        color: C.white,
      });
    }
    y -= tRowH;

    alt = false;
    for (const [, a] of animalEntries) {
      ensureSpace(tRowH + 4);
      if (alt)
        page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: C.bg });

      const aFatAvg = a.fat.length ? avg(a.fat) : null;
      const aProtAvg = a.protein.length ? avg(a.protein) : null;
      const aCells = [
        t(a.tag),
        t(a.name ?? "—"),
        String(a.count),
        round2(a.liters),
        aFatAvg !== null ? `${round2(aFatAvg)}%` : "—",
        aProtAvg !== null ? `${round2(aProtAvg)}%` : "—",
      ];

      const fatColor = aFatAvg !== null ? (aFatAvg >= 3.2 ? C.green : C.amber) : C.light;
      const protColor = aProtAvg !== null ? (aProtAvg >= 2.8 ? C.green : C.amber) : C.light;

      for (let i = 0; i < aCells.length; i++) {
        page.drawText(aCells[i], {
          x: aColsX[i] + 5,
          y: y - 10,
          size: 8,
          font,
          color: i === 4 ? fatColor : i === 5 ? protColor : C.dark,
        });
      }
      page.drawLine({
        start: { x: ML, y: y - tRowH + 3 },
        end: { x: W - MR, y: y - tRowH + 3 },
        thickness: 0.25,
        color: C.border,
      });
      y -= tRowH;
      alt = !alt;
    }
    y -= 10;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // REFERENCE TABLE (COVENIN 903)
  // ══════════════════════════════════════════════════════════════════════════════
  ensureSpace(120);
  y = sectionLabel(page, y, "PARAMETROS DE REFERENCIA  —  NORMA COVENIN 903", font, fontBold);

  const refRows = [
    {
      param: "Grasa (%)",
      a: ">= 3.2",
      b: "3.0 — 3.2",
      c: "< 3.0",
      ca: C.green,
      cb: C.amber,
      cc: C.red,
    },
    {
      param: "Proteina (%)",
      a: ">= 2.8",
      b: "2.6 — 2.8",
      c: "< 2.6",
      ca: C.green,
      cb: C.amber,
      cc: C.red,
    },
    {
      param: "SCC (cel/mL)",
      a: "<= 200,000",
      b: "200,001 — 400,000",
      c: "> 400,000",
      ca: C.green,
      cb: C.amber,
      cc: C.red,
    },
    {
      param: "Temperatura (deg C)",
      a: "< 4",
      b: "4 — 6",
      c: "> 6",
      ca: C.green,
      cb: C.amber,
      cc: C.red,
    },
    {
      param: "Acidez (Dornic)",
      a: "15 — 18",
      b: "18 — 20",
      c: "> 20",
      ca: C.green,
      cb: C.amber,
      cc: C.red,
    },
  ];

  const rColW = [CW * 0.33, CW * 0.22, CW * 0.22, CW * 0.23];
  const rColX = [ML, ML + rColW[0], ML + rColW[0] + rColW[1], ML + rColW[0] + rColW[1] + rColW[2]];

  // Header
  page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: C.navy });
  const rHdrs = [
    "Parametro",
    "Calidad A  (Optima)",
    "Calidad B  (Aceptable)",
    "Calidad C  (Observar)",
  ];
  for (let i = 0; i < rHdrs.length; i++) {
    page.drawText(rHdrs[i], {
      x: rColX[i] + 5,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: C.white,
    });
  }
  y -= tRowH;

  for (let ri = 0; ri < refRows.length; ri++) {
    ensureSpace(tRowH + 4);
    const r = refRows[ri];
    const bg = ri % 2 === 0 ? C.bg : C.white;
    page.drawRectangle({ x: ML, y: y - tRowH + 3, width: CW, height: tRowH, color: bg });

    // Column A accent stripe
    page.drawRectangle({ x: rColX[1], y: y - tRowH + 3, width: 3, height: tRowH, color: C.green });
    page.drawRectangle({ x: rColX[2], y: y - tRowH + 3, width: 3, height: tRowH, color: C.amber });
    page.drawRectangle({ x: rColX[3], y: y - tRowH + 3, width: 3, height: tRowH, color: C.red });

    page.drawText(r.param, { x: rColX[0] + 5, y: y - 10, size: 8, font, color: C.dark });
    page.drawText(r.a, { x: rColX[1] + 9, y: y - 10, size: 8, font: fontBold, color: r.ca });
    page.drawText(r.b, { x: rColX[2] + 9, y: y - 10, size: 8, font: fontBold, color: r.cb });
    page.drawText(r.c, { x: rColX[3] + 9, y: y - 10, size: 8, font: fontBold, color: r.cc });

    page.drawLine({
      start: { x: ML, y: y - tRowH + 3 },
      end: { x: W - MR, y: y - tRowH + 3 },
      thickness: 0.25,
      color: C.border,
    });
    y -= tRowH;
  }
  y -= 8;

  // ══════════════════════════════════════════════════════════════════════════════
  // FOOTER (last page)
  // ══════════════════════════════════════════════════════════════════════════════
  // El footer se ancla al fondo de la página (ocupa hasta ~y=125). Si el contenido
  // llegó demasiado abajo, abrimos una página nueva para evitar el solapamiento.
  const FOOTER_RESERVED = 132;
  if (y < FOOTER_RESERVED) newPage();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fincaelprogreso.com";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/dashboard/reportes`, {
    margin: 1,
    width: 120,
    color: { dark: "#0d2042", light: "#ffffff" },
  });
  const qrPng = await pdf.embedPng(qrDataUrl);

  const lastPage = pdf.getPage(pdf.getPageCount() - 1);
  const footerY = 60;

  // Footer divider
  lastPage.drawLine({
    start: { x: ML, y: footerY + 52 },
    end: { x: W - MR - 90, y: footerY + 52 },
    thickness: 0.4,
    color: C.border,
  });
  lastPage.drawRectangle({ x: ML, y: footerY + 52, width: 40, height: 2, color: C.primary });

  // Footer text block
  lastPage.drawText("Finca El Progreso  —  Sistema de Trazabilidad Ganadera", {
    x: ML,
    y: footerY + 38,
    size: 7.5,
    font: fontBold,
    color: C.dark,
  });
  lastPage.drawText(t(`Generado el ${nowStr}  |  Por: ${generatedBy}`), {
    x: ML,
    y: footerY + 26,
    size: 7,
    font,
    color: C.mid,
  });
  lastPage.drawText("Los datos provienen del registro blockchain de trazabilidad inmutable.", {
    x: ML,
    y: footerY + 14,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText(`Periodo: ${periodStr}  |  Paginas: ${pdf.getPageCount()}`, {
    x: ML,
    y: footerY + 2,
    size: 6.5,
    font,
    color: C.xlight,
  });

  // QR code
  lastPage.drawImage(qrPng, { x: W - MR - 68, y: footerY - 4, width: 68, height: 68 });
  lastPage.drawText("Verificar en plataforma", {
    x: W - MR - 68,
    y: footerY - 14,
    size: 5.5,
    font,
    color: C.light,
  });

  // Left accent bar on first page too
  pdf.getPage(0).drawRectangle({ x: 0, y: 0, width: 5, height: H, color: C.accent });

  // Page numbers
  const totalPages = pdf.getPageCount();
  for (let pi = 0; pi < totalPages; pi++) {
    const pg = pdf.getPage(pi);
    const label = `${pi + 1} / ${totalPages}`;
    pg.drawText(label, {
      x: W - MR - font.widthOfTextAtSize(label, 7),
      y: 20,
      size: 7,
      font,
      color: C.xlight,
    });
  }

  const pdfBytes = await pdf.save();
  const filename = `calidad-lactea-${body.date_from ?? "inicio"}-${body.date_to ?? "hoy"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
