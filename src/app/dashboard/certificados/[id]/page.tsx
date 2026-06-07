"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Link2,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { QRCodeCanvas } from "qrcode.react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import SignAnchorButton from "@/components/SignAnchorButton";
import { qrCodePngDataUrl } from "@/lib/qr/generate";

const CERT_TYPE_LABELS: Record<string, string> = {
  origin: "Origen",
  health: "Sanidad",
  organic: "Orgánico",
  welfare: "Bienestar animal",
  export: "Exportación",
  other: "Otro",
};

type CertDetail = {
  id: string;
  type: string;
  issuer: string | null;
  issued_at: string | null;
  valid_until: string | null;
  document_url: string | null;
  metadata: Record<string, string>;
  created_at: string;
  animals: { id: string; tag: string; name: string | null } | null;
};

export default function CertificadoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { supabase } = useSupabase();
  const qc = useQueryClient();
  const [origin, setOrigin] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const verifyUrl = origin ? `${origin}/api/verify/certifications/${id}` : "";

  const { getAccessToken } = usePrivy();

  async function downloadPdf() {
    setDownloading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/reports/certificado", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ certification_id: id }),
      });
      if (!res.ok) throw new Error("Error generando PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  const certQuery = useQuery<CertDetail>({
    queryKey: ["certification", id],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("certifications")
        .select(
          "id, type, issuer, issued_at, valid_until, document_url, metadata, created_at, animals(id, tag, name)"
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as CertDetail;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase!.from("certifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certifications"] });
      router.push("/dashboard/certificados");
    },
  });

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

  const now = Date.now();
  const isExpired = (v: string | null) => (v ? new Date(v).getTime() < now : false);
  const isNearExpiry = (v: string | null) => {
    if (!v) return false;
    const diff = (new Date(v).getTime() - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  const cert = certQuery.data;

  return (
    <DashboardShell title="Detalle certificado" subtitle="Certificados">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/certificados"
          className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>
      </div>

      {certQuery.isLoading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-foreground/60 text-sm">Cargando…</span>
        </div>
      )}

      {cert && (
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                  {CERT_TYPE_LABELS[cert.type] ?? cert.type}
                </span>
                <h2 className="text-foreground text-xl font-bold">
                  Certificado de {CERT_TYPE_LABELS[cert.type] ?? cert.type}
                </h2>
                {cert.issuer && (
                  <p className="text-foreground/60 mt-1 text-sm">Emitido por: {cert.issuer}</p>
                )}
              </div>

              {/* Estado */}
              {isExpired(cert.valid_until) ? (
                <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Vencido
                </span>
              ) : isNearExpiry(cert.valid_until) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> Por vencer
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> Vigente
                </span>
              )}
            </div>

            {/* Datos */}
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">
                  Animal
                </dt>
                <dd className="text-foreground mt-1 font-mono text-sm">
                  {cert.animals ? (
                    <Link
                      href={`/dashboard/animales/${cert.animals.id}`}
                      className="text-primary hover:underline"
                    >
                      {cert.animals.tag}
                      {cert.animals.name ? ` · ${cert.animals.name}` : ""}
                    </Link>
                  ) : (
                    "Finca (general)"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">
                  Fecha emisión
                </dt>
                <dd className="text-foreground mt-1 text-sm">{fmt(cert.issued_at)}</dd>
              </div>
              <div>
                <dt className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">
                  Vence
                </dt>
                <dd
                  className={`mt-1 text-sm font-medium ${isExpired(cert.valid_until) ? "text-destructive" : "text-foreground"}`}
                >
                  {fmt(cert.valid_until)}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/50 text-xs font-semibold tracking-wider uppercase">
                  Registrado
                </dt>
                <dd className="text-foreground/70 mt-1 text-sm">{fmt(cert.created_at)}</dd>
              </div>
            </dl>

            {cert.metadata?.notes && (
              <div className="bg-muted/50 border-border mt-5 rounded-xl border p-4">
                <p className="text-foreground/60 mb-1 text-xs font-semibold tracking-wider uppercase">
                  Notas
                </p>
                <p className="text-foreground/80 text-sm">{cert.metadata.notes}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Generando PDF…" : "Descargar PDF"}
              </button>
              {cert.document_url && (
                <a
                  href={cert.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border text-foreground/70 hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> Ver documento oficial
                </a>
              )}
            </div>
          </div>

          {/* Firma criptográfica */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <h3 className="text-foreground mb-1 text-base font-bold">
              Firma digital e inmutabilidad
            </h3>
            <p className="text-foreground/60 mb-4 text-xs">
              Firma este certificado con tu wallet para anclarlo en blockchain y hacerlo verificable
              por terceros.
            </p>
            <SignAnchorButton
              entityType="certifications"
              entityId={id}
              anchor
              onDone={() => qc.invalidateQueries({ queryKey: ["certification", id] })}
            />
          </div>

          {/* QR verificable */}
          <div className="bg-card border-border rounded-2xl border p-6">
            <div className="mb-4 flex items-center gap-2">
              <QrCode className="text-primary h-5 w-5" />
              <h3 className="text-foreground text-base font-bold">QR de verificación</h3>
            </div>
            <p className="text-foreground/60 mb-4 text-xs">
              Cualquier persona puede escanear este código para verificar la autenticidad del
              certificado.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                {verifyUrl ? (
                  <QRCodeCanvas value={verifyUrl} size={180} level="M" includeMargin={false} />
                ) : (
                  <div className="h-[180px] w-[180px] animate-pulse bg-neutral-100 rounded" />
                )}
              </div>
              <div className="flex flex-col gap-2 sm:pt-2">
                {verifyUrl && (
                  <p className="text-foreground/50 max-w-[260px] truncate font-mono text-[10px]">
                    {verifyUrl}
                  </p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!verifyUrl) return;
                    const dataUrl = await qrCodePngDataUrl(verifyUrl, 1024);
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `qr-certificado-${id}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  <Download className="h-4 w-4" /> Descargar QR
                </button>
                <button
                  type="button"
                  onClick={() => verifyUrl && navigator.clipboard.writeText(verifyUrl)}
                  className="border-border text-foreground/80 hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
                >
                  <Link2 className="h-4 w-4" /> Copiar enlace
                </button>
              </div>
            </div>
          </div>

          {/* Zona de peligro */}
          <div className="bg-card border-destructive/20 rounded-2xl border p-6">
            <h3 className="text-foreground mb-1 text-sm font-bold">Eliminar certificado</h3>
            <p className="text-foreground/60 mb-4 text-xs">Esta acción no se puede deshacer.</p>
            <button
              type="button"
              onClick={() => {
                if (confirm("¿Eliminar este certificado? Esta acción es irreversible.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="border-destructive/40 text-destructive hover:bg-destructive/5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
