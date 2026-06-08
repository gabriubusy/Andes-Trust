// POST /api/reports/calidad-lactea
// body: { farm_id, date_from?, date_to?, animal_ids? }
// Genera PDF de Reporte de Calidad LÃ¡ctea con estadÃ­sticas de producciÃ³n,
// grasa%, proteÃ­na%, SCC y grÃ¡fica de barras ASCII por perÃ­odo.

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

// Clasifica calidad segÃºn estÃ¡ndares venezolanos (COVENIN 903)
function classifyMilk(
  fat: number | null,
  protein: number | null,
  scc: number | null
): { label: string; color: [number, number, number] } {
  if (fat === null && protein === null) return { label: "Sin datos", color: [0.6, 0.6, 0.6] };
  const fatOk = fat !== null ? fat >= 3.2 : true;
  const proteinOk = protein !== null ? protein >= 2.8 : true;
  const sccOk = scc !== null ? scc <= 400000 : true;
  if (fatOk && proteinOk && sccOk)
    return { label: "Calidad A (Ã“ptima)", color: [0.13, 0.65, 0.4] };
  if ((!fatOk || !proteinOk) && sccOk)
    return { label: "Calidad B (Aceptable)", color: [0.85, 0.55, 0.1] };
  return { label: "Calidad C (ObservaciÃ³n)", color: [0.85, 0.2, 0.2] };
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

  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email")
    .eq("privy_did", privyDid)
    .single();
  const { data: farm } = await sb
    .from("farms")
    .select("name, legal_id, address, region, country")
    .eq("id", body.farm_id)
    .single();
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

  // â”€â”€â”€ EstadÃ­sticas globales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalLiters = rows.reduce((s, r) => s + Number(r.liters), 0);
  const fats = rows.filter((r) => r.fat_pct !== null).map((r) => Number(r.fat_pct));
  const proteins = rows.filter((r) => r.protein_pct !== null).map((r) => Number(r.protein_pct));
  const sccs = rows.filter((r) => r.scc !== null).map((r) => Number(r.scc));
  const avgFat = avg(fats);
  const avgProtein = avg(proteins);
  const avgScc = avg(sccs);
  const quality = classifyMilk(
    fats.length ? avgFat : null,
    proteins.length ? avgProtein : null,
    sccs.length ? avgScc : null
  );

  // Agrupar por semana para tabla de tendencia
  const byWeek: Record<
    string,
    { liters: number; fat: number[]; protein: number[]; scc: number[] }
  > = {};
  for (const r of rows) {
    const d = new Date(r.recorded_on);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!byWeek[key]) byWeek[key] = { liters: 0, fat: [], protein: [], scc: [] };
    byWeek[key].liters += Number(r.liters);
    if (r.fat_pct !== null) byWeek[key].fat.push(Number(r.fat_pct));
    if (r.protein_pct !== null) byWeek[key].protein.push(Number(r.protein_pct));
    if (r.scc !== null) byWeek[key].scc.push(Number(r.scc));
  }
  const weeks = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));

  // Agrupar por animal
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
    const animalObj = Array.isArray(r.animals) ? r.animals[0] : r.animals;
    const key = r.animal_id ?? "farm";
    const tag = animalObj?.tag ?? "Finca (total)";
    const name = animalObj?.name ?? null;
    if (!byAnimal[key]) byAnimal[key] = { tag, name, liters: 0, fat: [], protein: [], count: 0 };
    byAnimal[key].liters += Number(r.liters);
    byAnimal[key].count += 1;
    if (r.fat_pct !== null) byAnimal[key].fat.push(Number(r.fat_pct));
    if (r.protein_pct !== null) byAnimal[key].protein.push(Number(r.protein_pct));
  }

  // â”€â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595;
  const H = 842;
  const margin = 44;

  const C = {
    primary: rgb(0.145, 0.439, 0.937),
    dark: rgb(0.08, 0.09, 0.1),
    mid: rgb(0.35, 0.38, 0.42),
    light: rgb(0.6, 0.63, 0.67),
    white: rgb(1, 1, 1),
    bg: rgb(0.96, 0.97, 0.98),
    border: rgb(0.88, 0.89, 0.91),
    green: rgb(0.13, 0.65, 0.4),
    amber: rgb(0.85, 0.55, 0.1),
    red: rgb(0.85, 0.2, 0.2),
    blue10: rgb(0.93, 0.96, 1.0),
  };

  let page = pdf.addPage([W, H]);
  let y = H;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 60) {
      page = pdf.addPage([W, H]);
      y = H - 40;
    }
  };

  // â”€â”€ Banda superior â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  page.drawRectangle({ x: 0, y: H - 88, width: W, height: 88, color: C.primary });
  page.drawText("REPORTE DE CALIDAD LÃCTEA", {
    x: margin,
    y: H - 34,
    size: 18,
    font: fontBold,
    color: C.white,
  });
  page.drawText("AnÃ¡lisis de producciÃ³n, composiciÃ³n y clasificaciÃ³n de leche", {
    x: margin,
    y: H - 52,
    size: 9,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  const farmName = farm.name ?? "Finca El Progreso";
  const periodStr = `${body.date_from ?? "Inicio"} â†’ ${body.date_to ?? "Hoy"}`;
  page.drawText(farmName, { x: margin, y: H - 68, size: 9, font: fontBold, color: C.white });
  page.drawText(`PerÃ­odo: ${periodStr}`, {
    x: W - margin - font.widthOfTextAtSize(`PerÃ­odo: ${periodStr}`, 9),
    y: H - 68,
    size: 9,
    font,
    color: rgb(0.78, 0.88, 1),
  });

  y = H - 104;

  // â”€â”€ Info finca + generaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const farmAddr = [farm.address, farm.region, farm.country].filter(Boolean).join(", ");
  if (farm.legal_id) {
    page.drawText(`RIF: ${farm.legal_id}${farmAddr ? ` Â· ${farmAddr}` : ""}`, {
      x: margin,
      y,
      size: 8,
      font,
      color: C.mid,
    });
    y -= 13;
  }
  const generatedBy = profile?.full_name ?? profile?.email ?? privyDid;
  page.drawText(`Generado: ${new Date().toLocaleString("es-VE")} Â· Por: ${generatedBy}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: C.mid,
  });
  y -= 20;

  // â”€â”€ KPI cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ensureSpace(80);
  const cardW = (W - margin * 2 - 12) / 4;
  const cards = [
    {
      label: "Total producido",
      value: `${round2(totalLiters)} L`,
      sub: `${rows.length} registros`,
    },
    {
      label: "Promedio grasa",
      value: fats.length ? `${round2(avgFat)}%` : "Sin datos",
      sub: `${fats.length} muestras`,
    },
    {
      label: "Promedio proteÃ­na",
      value: proteins.length ? `${round2(avgProtein)}%` : "Sin datos",
      sub: `${proteins.length} muestras`,
    },
    {
      label: "Promedio SCC",
      value: sccs.length ? `${Math.round(avgScc).toLocaleString()}` : "Sin datos",
      sub: "cel/mL",
    },
  ];
  for (let i = 0; i < cards.length; i++) {
    const cx = margin + i * (cardW + 4);
    page.drawRectangle({
      x: cx,
      y: y - 56,
      width: cardW,
      height: 62,
      color: C.blue10,
    });
    page.drawText(cards[i].label, { x: cx + 8, y: y - 12, size: 7, font, color: C.mid });
    page.drawText(cards[i].value, {
      x: cx + 8,
      y: y - 30,
      size: 13,
      font: fontBold,
      color: C.primary,
    });
    page.drawText(cards[i].sub, { x: cx + 8, y: y - 46, size: 7, font, color: C.light });
  }
  y -= 72;

  // â”€â”€ Badge calidad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ensureSpace(36);
  const qColor = rgb(...quality.color);
  page.drawRectangle({
    x: margin,
    y: y - 26,
    width: W - margin * 2,
    height: 32,
    color: qColor,
  });
  const qText = `ClasificaciÃ³n general: ${quality.label}`;
  page.drawText(qText, { x: margin + 12, y: y - 14, size: 11, font: fontBold, color: C.white });
  page.drawText(
    "Basado en COVENIN 903 Â· ParÃ¡metros: grasa â‰¥ 3.2%, proteÃ­na â‰¥ 2.8%, SCC â‰¤ 400,000 cel/mL",
    {
      x: margin + 12,
      y: y - 24,
      size: 7,
      font,
      color: rgb(1, 1, 1),
    }
  );
  y -= 44;

  // â”€â”€ Tabla por semana â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ensureSpace(50);
  page.drawText("TENDENCIA SEMANAL", { x: margin, y, size: 8, font: fontBold, color: C.primary });
  y -= 16;

  // Encabezados tabla
  const colsW = [W - margin * 2 - 300, 70, 70, 70, 90];
  const colsX = [
    margin,
    margin + colsW[0],
    margin + colsW[0] + colsW[1],
    margin + colsW[0] + colsW[1] + colsW[2],
    margin + colsW[0] + colsW[1] + colsW[2] + colsW[3],
  ];
  const headers = ["Semana (inicio)", "Litros", "Grasa %", "ProteÃ­na %", "ClasificaciÃ³n"];

  page.drawRectangle({ x: margin, y: y - 14, width: W - margin * 2, height: 20, color: C.primary });
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: colsX[i] + 4,
      y: y - 8,
      size: 7.5,
      font: fontBold,
      color: C.white,
    });
  }
  y -= 20;

  let rowAlt = false;
  for (const [week, data] of weeks) {
    ensureSpace(20);
    const weekFat = data.fat.length ? avg(data.fat) : null;
    const weekProt = data.protein.length ? avg(data.protein) : null;
    const weekScc = data.scc.length ? avg(data.scc) : null;
    const wq = classifyMilk(weekFat, weekProt, weekScc);
    const wqColor = rgb(...wq.color);

    if (rowAlt)
      page.drawRectangle({ x: margin, y: y - 14, width: W - margin * 2, height: 18, color: C.bg });

    const weekLabel = new Date(week + "T12:00:00").toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const cells = [
      weekLabel,
      round2(data.liters),
      weekFat !== null ? round2(weekFat) : "â€”",
      weekProt !== null ? round2(weekProt) : "â€”",
      wq.label,
    ];
    for (let i = 0; i < cells.length; i++) {
      const cellColor = i === 4 ? wqColor : C.dark;
      page.drawText(cells[i], {
        x: colsX[i] + 4,
        y: y - 9,
        size: 8,
        font: i === 4 ? fontBold : font,
        color: cellColor,
      });
    }
    page.drawLine({
      start: { x: margin, y: y - 14 },
      end: { x: W - margin, y: y - 14 },
      thickness: 0.3,
      color: C.border,
    });
    y -= 18;
    rowAlt = !rowAlt;
  }
  y -= 10;

  // â”€â”€ Tabla por animal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (Object.keys(byAnimal).length > 1) {
    ensureSpace(60);
    page.drawText("PRODUCCIÃ“N POR ANIMAL", {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: C.primary,
    });
    y -= 16;

    const aHeaders = [
      "Animal",
      "Nombre",
      "Registros",
      "Total (L)",
      "Prom. grasa %",
      "Prom. proteÃ­na %",
    ];
    const aColsW = [70, 130, 60, 70, 90, 90];
    const aColsX = [margin];
    for (let i = 1; i < aColsW.length; i++) aColsX.push(aColsX[i - 1] + aColsW[i - 1]);

    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: W - margin * 2,
      height: 20,
      color: C.primary,
    });
    for (let i = 0; i < aHeaders.length; i++) {
      page.drawText(aHeaders[i], {
        x: aColsX[i] + 4,
        y: y - 8,
        size: 7,
        font: fontBold,
        color: C.white,
      });
    }
    y -= 20;

    rowAlt = false;
    for (const [, a] of Object.entries(byAnimal)) {
      ensureSpace(18);
      if (rowAlt)
        page.drawRectangle({
          x: margin,
          y: y - 14,
          width: W - margin * 2,
          height: 18,
          color: C.bg,
        });
      const aCells = [
        a.tag,
        a.name ?? "â€”",
        String(a.count),
        round2(a.liters),
        a.fat.length ? round2(avg(a.fat)) : "â€”",
        a.protein.length ? round2(avg(a.protein)) : "â€”",
      ];
      for (let i = 0; i < aCells.length; i++) {
        page.drawText(aCells[i], { x: aColsX[i] + 4, y: y - 9, size: 8, font, color: C.dark });
      }
      page.drawLine({
        start: { x: margin, y: y - 14 },
        end: { x: W - margin, y: y - 14 },
        thickness: 0.3,
        color: C.border,
      });
      y -= 18;
      rowAlt = !rowAlt;
    }
    y -= 10;
  }

  // â”€â”€ GrÃ¡fica de barras de producciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (weeks.length > 1) {
    ensureSpace(120);
    page.drawText("VOLUMEN SEMANAL (L)", {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: C.primary,
    });
    y -= 12;

    const chartH = 80;
    const chartW = W - margin * 2;
    const barW = Math.min(30, Math.floor((chartW - 20) / weeks.length) - 4);
    const maxL = Math.max(...weeks.map(([, d]) => d.liters));

    page.drawLine({
      start: { x: margin, y: y - chartH },
      end: { x: margin, y },
      thickness: 0.5,
      color: C.border,
    });
    page.drawLine({
      start: { x: margin, y: y - chartH },
      end: { x: margin + chartW, y: y - chartH },
      thickness: 0.5,
      color: C.border,
    });

    for (let i = 0; i < weeks.length; i++) {
      const [week, data] = weeks[i];
      const barH = maxL > 0 ? (data.liters / maxL) * (chartH - 10) : 0;
      const bx = margin + 10 + i * (barW + 4);
      page.drawRectangle({ x: bx, y: y - chartH + 1, width: barW, height: barH, color: C.primary });
      const weekShort = week.slice(5); // MM-DD
      page.drawText(weekShort, { x: bx, y: y - chartH - 10, size: 6, font, color: C.light });
    }
    y -= chartH + 24;
  }

  // â”€â”€ ParÃ¡metros de referencia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ensureSpace(80);
  page.drawText("PARÃMETROS DE REFERENCIA (COVENIN 903)", {
    x: margin,
    y,
    size: 8,
    font: fontBold,
    color: C.primary,
  });
  y -= 16;

  const params = [
    ["ParÃ¡metro", "Calidad A", "Calidad B", "ObservaciÃ³n"],
    ["Grasa (%)", "â‰¥ 3.2", "3.0 â€“ 3.2", "< 3.0"],
    ["ProteÃ­na (%)", "â‰¥ 2.8", "2.6 â€“ 2.8", "< 2.6"],
    ["SCC (cel/mL)", "â‰¤ 200,000", "200,001 â€“ 400,000", "> 400,000"],
    ["Temperatura (Â°C)", "< 4", "4 â€“ 6", "> 6"],
  ];
  const pColW = [
    (W - margin * 2) * 0.34,
    (W - margin * 2) * 0.22,
    (W - margin * 2) * 0.22,
    (W - margin * 2) * 0.22,
  ];
  const pColX = [
    margin,
    margin + pColW[0],
    margin + pColW[0] + pColW[1],
    margin + pColW[0] + pColW[1] + pColW[2],
  ];
  const pColors = [C.dark, C.green, C.amber, C.red];

  for (let ri = 0; ri < params.length; ri++) {
    ensureSpace(18);
    const isHeader = ri === 0;
    if (isHeader)
      page.drawRectangle({
        x: margin,
        y: y - 14,
        width: W - margin * 2,
        height: 20,
        color: C.primary,
      });
    else if (ri % 2 === 0)
      page.drawRectangle({ x: margin, y: y - 14, width: W - margin * 2, height: 18, color: C.bg });
    for (let ci = 0; ci < params[ri].length; ci++) {
      const color = isHeader ? C.white : ci === 0 ? C.dark : pColors[ci];
      page.drawText(params[ri][ci], {
        x: pColX[ci] + 4,
        y: y - 9,
        size: 8,
        font: isHeader ? fontBold : font,
        color,
      });
    }
    page.drawLine({
      start: { x: margin, y: y - 14 },
      end: { x: W - margin, y: y - 14 },
      thickness: 0.3,
      color: C.border,
    });
    y -= 18;
  }
  y -= 10;

  // â”€â”€ QR + pie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ensureSpace(100);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fincaelprogreso.com";
  const qrUrl = `${appUrl}/dashboard/reportes`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 100 });
  const qrPng = await pdf.embedPng(qrDataUrl);

  const lastPage = pdf.getPage(pdf.getPageCount() - 1);
  const lastY = margin + 10;
  lastPage.drawImage(qrPng, { x: W - margin - 72, y: lastY, width: 72, height: 72 });

  lastPage.drawLine({
    start: { x: margin, y: lastY + 80 },
    end: { x: W - margin - 80, y: lastY + 80 },
    thickness: 0.5,
    color: C.border,
  });
  lastPage.drawText("Este reporte fue generado por la plataforma Finca El Progreso.", {
    x: margin,
    y: lastY + 66,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText(`Generado el ${new Date().toLocaleString("es-VE")} Â· ${generatedBy}`, {
    x: margin,
    y: lastY + 54,
    size: 7,
    font,
    color: C.light,
  });
  lastPage.drawText("Los datos provienen del registro blockchain de trazabilidad de la finca.", {
    x: margin,
    y: lastY + 42,
    size: 7,
    font,
    color: C.light,
  });

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
