import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { qrCodePngBuffer } from "@/lib/qr/generate";
import { publicTokenUrl } from "@/lib/qr/generate";

export type LabelInput = {
  slug: string;
  tag: string;
  name?: string | null;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 28;
const COLS = 3;
const ROWS = 4;

export async function generateLabelsPdf(labels: LabelInput[], origin: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const usableW = A4_WIDTH - MARGIN * 2;
  const usableH = A4_HEIGHT - MARGIN * 2;
  const cellW = usableW / COLS;
  const cellH = usableH / ROWS;
  const perPage = COLS * ROWS;

  for (let i = 0; i < labels.length; i += perPage) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const slice = labels.slice(i, i + perPage);

    for (let idx = 0; idx < slice.length; idx++) {
      const label = slice[idx];
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = MARGIN + col * cellW;
      const y = A4_HEIGHT - MARGIN - (row + 1) * cellH;

      page.drawRectangle({
        x,
        y,
        width: cellW,
        height: cellH,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      });

      const qrPng = await qrCodePngBuffer(publicTokenUrl(label.slug, origin), 512);
      const qrImage = await pdf.embedPng(qrPng);
      const qrSize = Math.min(cellW, cellH) - 50;
      const qrX = x + (cellW - qrSize) / 2;
      const qrY = y + cellH - qrSize - 10;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

      const tagText = label.tag;
      const tagWidth = fontBold.widthOfTextAtSize(tagText, 11);
      page.drawText(tagText, {
        x: x + (cellW - tagWidth) / 2,
        y: y + 22,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (label.name) {
        const nameText = label.name.length > 28 ? `${label.name.slice(0, 28)}…` : label.name;
        const nameWidth = font.widthOfTextAtSize(nameText, 8);
        page.drawText(nameText, {
          x: x + (cellW - nameWidth) / 2,
          y: y + 8,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }
  }

  return pdf.save();
}
