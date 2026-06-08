"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, ExternalLink, ScanLine } from "lucide-react";

type Props = {
  slug: string;
  animalId: string;
};

export default function PublicQRBlock({ slug, animalId }: Props) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fichaUrl = origin ? `${origin}/t/${slug}` : `/t/${slug}`;
  const verifyUrl = origin
    ? `${origin}/api/verify/animals/${animalId}`
    : `/api/verify/animals/${animalId}`;

  const QrCard = ({
    url,
    label,
    sublabel,
    accent,
  }: {
    url: string;
    label: string;
    sublabel: string;
    accent: string;
  }) => (
    <div className="bg-background border-border flex flex-col items-center gap-3 rounded-2xl border p-4 flex-1">
      <div className="bg-white rounded-xl p-3 shadow-sm">
        {url ? (
          <QRCodeCanvas value={url} size={120} bgColor="#ffffff" fgColor="#0f172a" level="M" />
        ) : (
          <div className="h-30 w-30 animate-pulse rounded-lg bg-neutral-100" />
        )}
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${accent}`}>{label}</p>
        <p className="text-foreground/40 text-[10px] mt-0.5">{sublabel}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* QR codes side by side */}
      <div className="flex gap-3">
        <QrCard
          url={fichaUrl}
          label="Ficha pública"
          sublabel="Ver información del animal"
          accent="text-primary"
        />
        <QrCard
          url={verifyUrl}
          label="Verificar firma"
          sublabel="Auditar blockchain"
          accent="text-emerald-500"
        />
      </div>

      {/* Info + CTA */}
      <div className="bg-background border-border rounded-2xl border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5">
            <ShieldCheck className="text-emerald-500 h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-semibold">¿Cómo verificar?</p>
            <p className="text-foreground/50 text-xs leading-relaxed">
              Escanea el QR <span className="text-emerald-500 font-medium">«Verificar firma»</span>{" "}
              para auditar la firma criptográfica y el registro en blockchain de este animal.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Verificar firma
          </a>
          <a
            href={fichaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border text-foreground/70 hover:bg-muted inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir ficha
          </a>
        </div>
      </div>
    </div>
  );
}
