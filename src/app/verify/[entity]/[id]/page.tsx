import Image from "next/image";
import { ShieldCheck, ShieldAlert, ShieldX, ExternalLink, Hash, Clock, User } from "lucide-react";
import { verifyEntity } from "@/lib/verify/verifyEntity";

export const dynamic = "force-dynamic";

const ENTITY_LABEL: Record<string, string> = {
  animals: "Animal",
  vaccinations: "Vacunación",
  treatments: "Tratamiento",
  weighings: "Pesaje",
  certifications: "Certificación",
  sales: "Venta",
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://amoy.polygonscan.com";

function shortHash(h: string) {
  return h.slice(0, 10) + "…" + h.slice(-8);
}

function shortAddr(a: string) {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function shortId(id: string) {
  return id.length > 16 ? id.slice(0, 8) + "…" + id.slice(-6) : id;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const data = await verifyEntity(entity, id);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <ShieldX className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mb-1 text-lg font-bold text-white">Registro no encontrado</h1>
          <p className="text-sm text-neutral-400">No existe un registro con ese identificador.</p>
        </div>
      </main>
    );
  }

  const hasSignatures = data.signatures.length > 0;
  const hasAnchors = data.anchors.length > 0;
  const label = ENTITY_LABEL[entity] ?? entity;

  const StatusIcon = data.integrity_ok
    ? ShieldCheck
    : hasSignatures || hasAnchors
      ? ShieldAlert
      : ShieldX;

  const statusColor = data.integrity_ok
    ? "text-emerald-400"
    : hasSignatures || hasAnchors
      ? "text-amber-400"
      : "text-neutral-500";

  const statusBg = data.integrity_ok
    ? "bg-emerald-500/10 border-emerald-500/20"
    : hasSignatures || hasAnchors
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-neutral-800 border-neutral-700";

  const statusText = data.integrity_ok
    ? "Integridad verificada"
    : hasSignatures || hasAnchors
      ? "Firmado — sin anclar o modificado"
      : "Sin firmar";

  const statusDesc = data.integrity_ok
    ? "El registro no ha sido alterado desde que fue firmado y anclado en blockchain."
    : hasSignatures || hasAnchors
      ? "El registro tiene firmas pero los hashes no coinciden completamente o falta el ancla blockchain."
      : "Este registro aún no tiene firma digital ni registro en blockchain.";

  const statusGlow = data.integrity_ok
    ? "bg-emerald-500/20"
    : hasSignatures || hasAnchors
      ? "bg-amber-500/20"
      : "bg-neutral-500/10";

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 pt-2 pb-1 opacity-80">
          <Image src="/logo.png" alt="Logo" width={96} height={28} className="h-5 w-auto" />
        </div>

        {/* Header */}
        <div className="pb-1 text-center">
          <p className="mb-1.5 text-[11px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            Verificación de trazabilidad
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">{data.summary.title}</h1>
          {data.summary.subtitle && (
            <p className="mt-1 text-sm text-neutral-400">{data.summary.subtitle}</p>
          )}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1">
            <span className="text-[10px] font-medium text-neutral-400">{label}</span>
            <span className="text-neutral-700">·</span>
            <code className="font-mono text-[10px] text-neutral-500">{shortId(id)}</code>
          </div>
        </div>

        {/* Status card — la prueba de confianza, arriba y prominente */}
        <div className={`relative overflow-hidden rounded-2xl border p-7 ${statusBg} text-center`}>
          <div
            className={`pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${statusGlow}`}
          />
          <div className="relative">
            <div
              className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-950/50 ring-1 ring-inset ${
                data.integrity_ok
                  ? "ring-emerald-500/40"
                  : hasSignatures || hasAnchors
                    ? "ring-amber-500/40"
                    : "ring-neutral-700"
              }`}
            >
              <StatusIcon className={`h-8 w-8 ${statusColor}`} />
            </div>
            <h2 className={`mb-1.5 text-lg font-bold ${statusColor}`}>{statusText}</h2>
            <p className="mx-auto max-w-xs text-xs leading-relaxed text-neutral-400">
              {statusDesc}
            </p>
          </div>
        </div>

        {/* Resumen legible */}
        {data.summary.fields.length > 0 && (
          <div className="grid grid-cols-3 gap-3 divide-x divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-center">
            {data.summary.fields.map((f, i) => (
              <div key={i} className="px-1">
                <p className="mb-1 text-[10px] tracking-wide text-neutral-600 uppercase">
                  {f.label}
                </p>
                <p className="text-sm font-semibold text-neutral-100">{f.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Current hash */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Hash actual del registro
            </span>
          </div>
          <code className="font-mono text-xs break-all text-neutral-300">{data.current_hash}</code>
        </div>

        {/* Signatures */}
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-300">Firmas digitales</span>
            </div>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
              {data.signatures.length}
            </span>
          </div>
          {!hasSignatures ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-7">
              <User className="h-4 w-4 text-neutral-700" />
              <p className="text-xs text-neutral-600">Sin firmas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {data.signatures.map((s, i) => (
                <div key={i} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs text-neutral-300">
                      {shortAddr(s.signer)}
                    </code>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.signature_valid
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {s.signature_valid ? "✓ Firma válida" : "✗ Firma inválida"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          s.hash_matches_current
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {s.hash_matches_current ? "Hash ✓" : "Hash modificado"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">{fmtDate(s.signed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blockchain anchors */}
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-300">Anclas blockchain</span>
            </div>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
              {data.anchors.length}
            </span>
          </div>
          {!hasAnchors ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-7">
              <ShieldCheck className="h-4 w-4 text-neutral-700" />
              <p className="text-xs text-neutral-600">Sin registros en blockchain</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {data.anchors.map((a, i) => (
                <div key={i} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400 uppercase">
                        {a.network}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          a.matches_current
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {a.matches_current ? "Hash ✓" : "Hash modificado"}
                      </span>
                    </div>
                    <a
                      href={`${EXPLORER}/tx/${a.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-500 transition-colors hover:text-violet-400"
                      title="Ver en explorador"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <code className="font-mono text-[10px] text-neutral-500">
                    {shortHash(a.tx_hash)}
                  </code>
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">{fmtDate(a.anchored_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="pb-6 text-center text-[10px] text-neutral-700">
          Verificación criptográfica · Finca El Progreso
        </p>
      </div>
    </main>
  );
}
