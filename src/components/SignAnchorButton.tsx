"use client";

import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Loader2, ShieldAlert, ExternalLink } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

type Props = {
  entityType: "animals" | "vaccinations" | "treatments" | "weighings" | "certifications" | "sales";
  entityId: string;
  anchor?: boolean;
  onDone?: (result: { payload_hash: string; anchor_tx: string | null }) => void;
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://amoy.polygonscan.com";

export default function SignAnchorButton({ entityType, entityId, anchor = true, onDone }: Props) {
  const { getAccessToken } = usePrivy();

  const mut = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, anchor }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al anclar");
      return json as { payload_hash: string; anchor_tx: string | null };
    },
    onSuccess: (data) => {
      toast.success("Registro anclado en blockchain");
      onDone?.(data);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  if (mut.isSuccess && mut.data?.anchor_tx) {
    return (
      <a
        href={`${EXPLORER}/tx/${mut.data.anchor_tx}`}
        target="_blank"
        rel="noreferrer"
        className="border-emerald-500/40 text-emerald-600 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
        title="Ver transacción en blockchain"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Anclado
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={mut.isPending || mut.isSuccess}
      title={mut.isError ? (mut.error as Error).message : "Anclar en blockchain"}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
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
  );
}
