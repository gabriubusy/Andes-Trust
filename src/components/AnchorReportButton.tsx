"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Loader2, ShieldAlert, ExternalLink, WifiOff } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

type Props = {
  /** id del reporte en regulatory_reports */
  reportId: string;
  /** tx existente si ya fue anclado */
  txHash?: string | null;
  /** el reporte debe tener payload_hash para poder anclarse */
  disabled?: boolean;
  onDone?: (txHash: string) => void;
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://amoy.polygonscan.com";

export default function AnchorReportButton({ reportId, txHash, disabled = false, onDone }: Props) {
  const { getAccessToken } = usePrivy();
  const [online, setOnline] = useState(true);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/reports/${reportId}/anchor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(
          json.error === "relayer_not_configured"
            ? "El anclaje no está configurado en este entorno (falta el contrato o el relayer)."
            : (json.error ?? "Error al anclar")
        );
      }
      return json as { anchored: boolean; anchor_tx: string | null };
    },
    onSuccess: (data) => {
      if (data.anchor_tx) {
        toast.success("Reporte INSAI anclado en blockchain");
        onDone?.(data.anchor_tx);
      }
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const resolvedTxHash = mut.isSuccess ? mut.data?.anchor_tx : txHash;

  if (resolvedTxHash) {
    return (
      <a
        href={`${EXPLORER}/tx/${resolvedTxHash}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
        title="Ver transacción en blockchain"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Anclado
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    );
  }

  if (disabled) {
    return (
      <span
        title="El reporte no tiene hash de integridad para anclar"
        className="border-border text-foreground/30 inline-flex cursor-not-allowed items-center gap-1 rounded-lg border px-2 py-1 text-[11px]"
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        Anclar
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (online ? mut.mutate() : setShowOfflineModal(true))}
        disabled={mut.isPending || mut.isSuccess}
        title={mut.isError ? friendlyErrorMessage(mut.error) : "Anclar en blockchain"}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
          mut.isError
            ? "border-red-500/40 text-red-500"
            : "border-border text-foreground/50 hover:border-primary/40 hover:text-primary"
        } disabled:opacity-50`}
      >
        {mut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : mut.isError ? (
          <ShieldAlert className="h-3.5 w-3.5" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        {mut.isPending ? "Anclando…" : mut.isError ? "Reintentar" : "Anclar"}
      </button>
      {showOfflineModal && (
        <Modal
          title="Sin conexión a internet"
          onClose={() => setShowOfflineModal(false)}
          maxWidth="sm"
        >
          <div className="flex items-start gap-3">
            <WifiOff className="text-foreground/50 mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-foreground/70 text-sm">
              Anclar en blockchain requiere conexión a internet. Vuelve a intentarlo cuando
              recuperes la señal.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
