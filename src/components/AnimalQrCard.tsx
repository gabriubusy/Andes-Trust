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
    <div className="w-full">
      {/* Card principal — QR a la izquierda, información a la derecha */}
      <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
        <div className="flex flex-col md:flex-row">
          {/* Panel izquierdo: QR */}
          <div className="from-primary/10 to-primary/5 border-border/50 flex flex-col items-center justify-center gap-4 border-b bg-linear-to-br p-6 md:border-r md:border-b-0 md:p-8">
            <div className="ring-border/20 rounded-2xl bg-white p-4 shadow-inner ring-1">
              {url ? (
                <QRCodeCanvas value={url} size={240} level="M" includeMargin={false} />
              ) : (
                <div className="h-60 w-60 animate-pulse rounded-lg bg-neutral-100" />
              )}
            </div>

            {/* Identidad del animal */}
            <div className="text-center">
              <p className="text-foreground font-mono text-lg font-bold tracking-wide">
                {animalTag}
              </p>
              {animalName && <p className="text-foreground/60 mt-0.5 text-sm">{animalName}</p>}
            </div>
          </div>

          {/* Panel derecho: información y acciones */}
          <div className="flex flex-1 flex-col justify-center gap-5 p-6 md:p-8">
            {/* Encabezado */}
            <div>
              <div className="bg-primary/10 text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-full">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-foreground text-lg font-bold">Código QR de trazabilidad</h3>
              <p className="text-foreground/50 mt-1 text-sm">
                Escanea para ver la ficha pública verificada del animal.
              </p>
            </div>

            {/* URL truncada */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="border-border/50 text-primary/70 hover:text-primary bg-muted/30 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-3 py-1.5 font-mono text-xs transition-colors"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={downloadPng}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                <Download className="h-4 w-4" />
                Descargar PNG
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="border-border text-foreground/80 hover:bg-muted inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
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

            {/* Nota de verificación */}
            <p className="text-foreground/30 text-[12px]">
              Verificado · Finca El Progreso · Sistema de trazabilidad bovino
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
