import QRCode from "qrcode";

export function publicTokenUrl(slug: string, origin?: string) {
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://andestrust.com";
  return `${base.replace(/\/$/, "")}/t/${slug}`;
}

export async function qrCodePngDataUrl(content: string, size = 1024) {
  return QRCode.toDataURL(content, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export async function qrCodePngBuffer(content: string, size = 1024) {
  return QRCode.toBuffer(content, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    type: "png",
  });
}

export async function qrCodeSvgString(content: string, size = 512) {
  return QRCode.toString(content, {
    type: "svg",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
