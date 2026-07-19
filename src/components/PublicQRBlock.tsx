"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, Shield, ExternalLink, ScanLine } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";

type Props = {
  slug: string;
  animalId: string;
};

function QrCard({
  url,
  label,
  sublabel,
  accent,
}: {
  url: string;
  label: string;
  sublabel: string;
  accent: string;
}) {
  return (
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
}

export default function PublicQRBlock({ slug, animalId }: Props) {
  const { supabase } = useSupabase();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // ¿Tiene el registro alguna prueba criptográfica (firma o ancla)?
  // Sin ella no debemos prometer una "auditoría blockchain" que no existe.
  const proofQuery = useQuery({
    queryKey: ["animal-proof", animalId],
    enabled: !!supabase && !!animalId,
    queryFn: async () => {
      if (!supabase) return false;
      const [{ count: sigs }, { count: anchors }] = await Promise.all([
        supabase
          .from("signatures")
          .select("id", { count: "exact", head: true })
          .eq("entity_type", "animals")
          .eq("entity_id", animalId),
        supabase
          .from("blockchain_records")
          .select("id", { count: "exact", head: true })
          .eq("entity_type", "animals")
          .eq("entity_id", animalId),
      ]);
      return (sigs ?? 0) > 0 || (anchors ?? 0) > 0;
    },
  });
  // Hasta confirmar, asumimos "sin prueba" para no prometer de más.
  const hasProof = proofQuery.data === true;

  const fichaUrl = origin ? `${origin}/t/${slug}` : `/t/${slug}`;
  const verifyUrl = origin ? `${origin}/verify/animals/${animalId}` : `/verify/animals/${animalId}`;

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
          label={hasProof ? "Verificar firma" : "Verificar registro"}
          sublabel={hasProof ? "Auditar firma y blockchain" : "Consultar estado"}
          accent={hasProof ? "text-emerald-500" : "text-foreground/60"}
        />
      </div>

      {/* Info + CTA */}
      <div className="bg-background border-border rounded-2xl border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
              hasProof ? "bg-emerald-500/10" : "bg-muted"
            }`}
          >
            {hasProof ? (
              <ShieldCheck className="text-emerald-500 h-4 w-4" />
            ) : (
              <Shield className="text-foreground/50 h-4 w-4" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-semibold">¿Cómo verificar?</p>
            {hasProof ? (
              <p className="text-foreground/50 text-xs leading-relaxed">
                Escanea el QR{" "}
                <span className="text-emerald-500 font-medium">«Verificar firma»</span> para auditar
                la firma criptográfica y el registro en blockchain de este animal.
              </p>
            ) : (
              <p className="text-foreground/50 text-xs leading-relaxed">
                Escanea el QR de verificación para consultar el estado criptográfico del registro.
                Este animal <span className="text-foreground/70 font-medium">aún no tiene</span>{" "}
                firma digital ni anclaje en blockchain.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              hasProof
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border text-foreground/70 hover:bg-muted border"
            }`}
          >
            <ScanLine className="h-3.5 w-3.5" />
            {hasProof ? "Verificar firma" : "Ver verificación"}
          </a>
          <a
            href={fichaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              hasProof
                ? "border-border text-foreground/70 hover:bg-muted border"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir ficha
          </a>
        </div>
      </div>
    </div>
  );
}
