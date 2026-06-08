"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Link2, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { publicTokenUrl, qrCodePngDataUrl } from "@/lib/qr/generate";

type Props = {
  slug: string;
  animalTag: string;
  animalName?: string | null;
};

export default function AnimalQrCard({ slug, animalTag, animalName }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-sm">
      {/* Card principal con fondo degradado */}
      <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
        {/* Header con gradiente */}
        <div className="from-primary/10 to-primary/5 border-border/50 border-b bg-gradient-to-br px-6 py-5 text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-foreground text-base font-bold">Código QR de trazabilidad</h3>
          <p className="text-foreground/50 mt-0.5 text-xs">
            Escanea para ver la ficha pública verificada
          </p>
        </div>

        {/* QR + info */}
        <div className="flex flex-col items-center gap-5 p-6">
          {/* Marco del QR */}
          <div className="ring-border/20 rounded-2xl bg-white p-4 shadow-inner ring-1">
            {url ? (
              <QRCodeCanvas value={url} size={200} level="M" includeMargin={false} />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-neutral-100" />
            )}
          </div>

          {/* Identidad del animal */}
          <div className="text-center">
            <p className="text-foreground font-mono text-lg font-bold tracking-wide">{animalTag}</p>
            {animalName && <p className="text-foreground/60 mt-0.5 text-sm">{animalName}</p>}
          </div>

          {/* URL truncada */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="border-border/50 text-primary/70 hover:text-primary inline-flex max-w-full items-center gap-1 truncate rounded-full border bg-white/5 px-3 py-1 font-mono text-[10px] transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{url}</span>
            </a>
          )}

          {/* Acciones */}
          <div className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={downloadPng}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar PNG
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="border-border text-foreground/80 hover:bg-muted inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-500">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Copiar enlace público
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/50 border-t px-6 py-3 text-center">
          <p className="text-foreground/30 text-[10px]">
            Verificado · Finca El Progreso · Sistema de trazabilidad bovino
          </p>
        </div>
      </div>
    </div>
  );
}
