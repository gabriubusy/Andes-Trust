"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Link2 } from "lucide-react";
import { publicTokenUrl, qrCodePngDataUrl } from "@/lib/qr/generate";

type Props = {
  slug: string;
  animalTag: string;
  animalName?: string | null;
};

export default function AnimalQrCard({ slug, animalTag, animalName }: Props) {
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? publicTokenUrl(slug, origin) : "";

  const downloadPng = async () => {
    if (!url) return;
    const dataUrl = await qrCodePngDataUrl(url, 1024);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${animalTag}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4">
          {url ? (
            <QRCodeCanvas value={url} size={200} level="M" includeMargin={false} />
          ) : (
            <div className="h-[200px] w-[200px] animate-pulse bg-neutral-100" />
          )}
        </div>
        <div className="text-center">
          <div className="text-foreground font-mono text-sm font-semibold">{animalTag}</div>
          {animalName && <div className="text-foreground/60 text-xs">{animalName}</div>}
          {url && (
            <div className="text-foreground/50 mt-2 max-w-[260px] truncate font-mono text-[10px]">
              {url}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Descargar PNG
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="border-border text-foreground/80 hover:bg-muted inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
          >
            <Link2 className="h-4 w-4" /> Copiar enlace público
          </button>
        </div>
      </div>
    </div>
  );
}
