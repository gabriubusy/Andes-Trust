"use client";

import { QRCodeCanvas } from "qrcode.react";

type Props = {
  slug: string;
  animalId: string;
};

export default function PublicQRBlock({ slug, animalId }: Props) {
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/verify/animals/${animalId}`
      : `/api/verify/animals/${animalId}`;

  const fichaUrl =
    typeof window !== "undefined" ? `${window.location.origin}/t/${slug}` : `/t/${slug}`;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
      <div className="flex flex-col items-center gap-2">
        <QRCodeCanvas
          value={fichaUrl}
          size={140}
          bgColor="transparent"
          fgColor="currentColor"
          className="text-foreground rounded-xl"
        />
        <p className="text-foreground/50 text-[10px]">Ficha pública</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRCodeCanvas
          value={verifyUrl}
          size={140}
          bgColor="transparent"
          fgColor="currentColor"
          className="text-foreground rounded-xl"
        />
        <p className="text-foreground/50 text-[10px]">Verificar firma</p>
      </div>
      <div className="text-foreground/50 space-y-1 text-xs sm:flex-1">
        <p className="font-medium">¿Cómo verificar?</p>
        <p>
          Escanea el QR derecho para auditar la firma criptográfica y el registro en blockchain de
          este animal.
        </p>
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Abrir verificación →
        </a>
      </div>
    </div>
  );
}
