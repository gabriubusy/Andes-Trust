"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, Shield, ScanLine } from "lucide-react";
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
    <div className="bg-background border-border flex flex-1 flex-col items-center gap-3 rounded-2xl border p-4">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        {url ? (
          <QRCodeCanvas value={url} size={120} bgColor="#ffffff" fgColor="#0f172a" level="M" />
        ) : (
          <div className="h-30 w-30 animate-pulse rounded-lg bg-neutral-100" />
        )}
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${accent}`}>{label}</p>
        <p className="text-foreground/40 mt-0.5 text-[11px]">{sublabel}</p>
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

  // ¿Está el registro anclado en blockchain? Esa es la prueba en esta app
  // (no hay firmas de wallet). Sin ancla no prometemos una "auditoría".
  const proofQuery = useQuery({
    queryKey: ["animal-proof", animalId],
    enabled: !!supabase && !!animalId,
    queryFn: async () => {
      if (!supabase) return false;
      const { count } = await supabase
        .from("blockchain_records")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "animals")
        .eq("entity_id", animalId);
      return (count ?? 0) > 0;
    },
  });
  // Hasta confirmar, asumimos "sin prueba" para no prometer de más.
  const hasProof = proofQuery.data === true;

  const fichaUrl = origin ? `${origin}/t/${slug}` : `/t/${slug}`;
  const verifyUrl = origin ? `${origin}/verify/animals/${animalId}` : `/verify/animals/${animalId}`;

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
          label="Verificar registro"
          sublabel={hasProof ? "Auditar el anclaje en blockchain" : "Consultar estado"}
          accent={hasProof ? "text-emerald-500" : "text-foreground/60"}
        />
      </div>

      {/* Info + CTA */}
      <div className="bg-background border-border space-y-3 rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              hasProof ? "bg-emerald-500/10" : "bg-muted"
            }`}
          >
            {hasProof ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ) : (
              <Shield className="text-foreground/50 h-4 w-4" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-semibold">¿Cómo verificar?</p>
            {hasProof ? (
              <p className="text-foreground/50 text-xs leading-relaxed">
                Escanea el QR{" "}
                <span className="font-medium text-emerald-500">«Verificar registro»</span> para
                auditar el anclaje en blockchain de este animal.
              </p>
            ) : (
              <p className="text-foreground/50 text-xs leading-relaxed">
                Escanea el QR de verificación para consultar el estado del registro. Este animal{" "}
                <span className="text-foreground/70 font-medium">aún no tiene</span> anclaje en
                blockchain.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Sin "Abrir ficha": este bloque se muestra dentro de la propia
              ficha pública, así que ese botón llevaba a donde ya estás. */}
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {hasProof ? "Verificar registro" : "Ver verificación"}
          </a>
        </div>
      </div>
    </div>
  );
}
