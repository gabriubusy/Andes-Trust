"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
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
import { toast } from "sonner";
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
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const verifyUrl = origin ? `${origin}/verify/certifications/${id}` : "";

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
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  async function downloadQr() {
    if (!verifyUrl) return;
    const dataUrl = await qrCodePngDataUrl(verifyUrl, 1024);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-certificado-${id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("QR descargado");
  }

  async function copyLink() {
    if (!verifyUrl) return;
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
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

  const anchorQuery = useQuery<string | null>({
    queryKey: ["anchor", "certifications", id],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("blockchain_records")
        .select("tx_hash")
        .eq("entity_type", "certifications")
        .eq("entity_id", id)
        .maybeSingle();
      if (error) throw error;
      return data?.tx_hash ?? null;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase!.from("certifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certifications"] });
      toast.success("Certificado eliminado");
      router.push("/dashboard/certificados");
    },
    onError: (err) => toast.error((err as Error).message),
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
  const typeLabel = cert ? (CERT_TYPE_LABELS[cert.type] ?? cert.type) : "";

  return (
    <DashboardShell title="Detalle certificado" subtitle="Certificados">
      <Link
        href="/dashboard/certificados"
        className="text-foreground/70 hover:text-foreground inline-flex w-fit cursor-pointer items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>

      {certQuery.isLoading && (
        <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_360px]">
          {/* Columna principal */}
          <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-muted/50 h-14 w-14 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted/40 h-4 w-20 rounded-full" />
                  <div className="bg-muted/60 h-5 w-48 rounded-full" />
                  <div className="bg-muted/40 h-3 w-32 rounded-full" />
                </div>
                <div className="bg-muted/40 h-6 w-20 rounded-full" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-muted/30 border-border/50 space-y-2 rounded-xl border px-3 py-2.5"
                  >
                    <div className="bg-muted/40 h-2.5 w-12 rounded-full" />
                    <div className="bg-muted/60 h-3.5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="bg-muted/50 mt-6 h-9 w-36 rounded-xl" />
            </div>
            {/* Firma */}
            <div className="bg-card border-border space-y-3 rounded-2xl border p-6 shadow-sm">
              <div className="bg-muted/60 h-4 w-56 rounded-full" />
              <div className="bg-muted/40 h-3 w-full max-w-md rounded-full" />
              <div className="bg-muted/50 h-7 w-24 rounded-lg" />
            </div>
          </div>
          {/* Columna QR */}
          <div className="bg-card border-border h-fit space-y-4 rounded-2xl border p-6 shadow-sm">
            <div className="bg-muted/60 h-4 w-40 rounded-full" />
            <div className="bg-muted/40 h-3 w-full rounded-full" />
            <div className="bg-muted/40 mx-auto h-52 w-52 rounded-2xl" />
            <div className="bg-muted/50 h-9 w-full rounded-lg" />
            <div className="bg-muted/40 h-9 w-full rounded-lg" />
          </div>
        </div>
      )}

      {cert && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ── Columna principal ─────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="from-primary/20 to-primary/5 border-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br">
                    <Award className="text-primary h-7 w-7" />
                  </div>
                  <div>
                    <span className="bg-primary/10 text-primary mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {typeLabel}
                    </span>
                    <h2 className="text-foreground text-xl font-bold tracking-tight">
                      Certificado de {typeLabel}
                    </h2>
                    {cert.issuer && (
                      <p className="text-foreground/60 mt-1 text-sm">Emitido por: {cert.issuer}</p>
                    )}
                  </div>
                </div>

                {/* Estado */}
                {isExpired(cert.valid_until) ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> Vencido
                  </span>
                ) : isNearExpiry(cert.valid_until) ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> Por vencer
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> Vigente
                  </span>
                )}
              </div>

              {/* Datos en tarjetas */}
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DataTile label="Animal">
                  {cert.animals ? (
                    <Link
                      href={`/dashboard/animales/${cert.animals.id}`}
                      className="text-primary cursor-pointer font-mono hover:underline"
                    >
                      {cert.animals.tag}
                      {cert.animals.name ? ` · ${cert.animals.name}` : ""}
                    </Link>
                  ) : (
                    <span className="text-foreground/70">Finca (general)</span>
                  )}
                </DataTile>
                <DataTile label="Fecha emisión">{fmt(cert.issued_at)}</DataTile>
                <DataTile label="Vence">
                  <span className={isExpired(cert.valid_until) ? "text-red-500" : undefined}>
                    {fmt(cert.valid_until)}
                  </span>
                </DataTile>
                <DataTile label="Registrado">{fmt(cert.created_at)}</DataTile>
              </dl>

              {cert.metadata?.notes && (
                <div className="bg-muted/40 border-border mt-5 rounded-xl border p-4">
                  <p className="text-foreground/50 mb-1 text-[10px] font-semibold tracking-wider uppercase">
                    Notas
                  </p>
                  <p className="text-foreground/80 text-sm">{cert.metadata.notes}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={downloading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="border-border text-foreground/70 hover:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> Ver documento oficial
                  </a>
                )}
              </div>
            </div>

            {/* Firma criptográfica */}
            <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5" />
                <h3 className="text-foreground text-base font-bold">
                  Firma digital e inmutabilidad
                </h3>
              </div>
              <p className="text-foreground/60 mb-4 text-xs">
                Ancla este certificado en blockchain para hacerlo verificable e inmutable por
                terceros.
              </p>
              <SignAnchorButton
                entityType="certifications"
                entityId={id}
                anchor
                txHash={anchorQuery.data}
                onDone={() => {
                  qc.invalidateQueries({ queryKey: ["certification", id] });
                  qc.invalidateQueries({ queryKey: ["anchor", "certifications", id] });
                }}
              />
            </div>

            {/* Zona de peligro */}
            <div className="bg-card border-red-500/20 rounded-2xl border p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <h3 className="text-foreground text-sm font-bold">Eliminar certificado</h3>
              </div>
              <p className="text-foreground/60 mb-4 text-xs">Esta acción no se puede deshacer.</p>
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground/70 text-sm">¿Seguro?</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleteMutation.isPending}
                    className="text-foreground/60 hover:text-foreground hover:bg-muted inline-flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Columna QR verificable ────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <QrCode className="text-primary h-5 w-5" />
                <h3 className="text-foreground text-base font-bold">QR de verificación</h3>
              </div>
              <p className="text-foreground/60 mb-5 text-xs">
                Cualquier persona puede escanear este código para verificar la autenticidad del
                certificado.
              </p>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  {verifyUrl ? (
                    <QRCodeCanvas value={verifyUrl} size={200} level="M" includeMargin={false} />
                  ) : (
                    <div className="h-50 w-50 animate-pulse rounded bg-neutral-100" />
                  )}
                </div>
                {verifyUrl && (
                  <p className="text-foreground/50 w-full truncate text-center font-mono text-[10px]">
                    {verifyUrl}
                  </p>
                )}
                <div className="flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!verifyUrl}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" /> Descargar QR
                  </button>
                  <button
                    type="button"
                    onClick={copyLink}
                    disabled={!verifyUrl}
                    className="border-border text-foreground/80 hover:bg-muted inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar enlace
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function DataTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border-border/50 rounded-xl border px-3 py-2.5">
      <dt className="text-foreground/45 text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-foreground mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}
