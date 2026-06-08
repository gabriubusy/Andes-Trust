"use client";

import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Loader2, ShieldAlert } from "lucide-react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { toast } from "sonner";

type Props = {
  entityType: "animals" | "vaccinations" | "treatments" | "weighings" | "certifications" | "sales";
  entityId: string;
  payload?: unknown;
  anchor?: boolean;
  onDone?: (result: { payload_hash: string; anchor_tx: string | null }) => void;
};

export default function SignAnchorButton({ entityType, entityId, anchor = true, onDone }: Props) {
  const { getAccessToken } = usePrivy();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();

  const mut = useMutation({
    mutationFn: async () => {
      const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (!wallet) throw new Error("Sin wallet");
      const signerAddress = wallet.address as `0x${string}`;

      const hashRes = await fetch(`/api/sign?entity_type=${entityType}&entity_id=${entityId}`);
      const hashJson = await hashRes.json();
      if (!hashRes.ok || !hashJson.payload_hash) throw new Error(hashJson.error ?? "no_hash");
      const expectedHash = hashJson.payload_hash as `0x${string}`;

      const { signature } = await signMessage({ message: expectedHash });

      const privyToken = await getAccessToken();
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          signature,
          signer_address: signerAddress,
          anchor,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "fail");
      return json as { payload_hash: string; anchor_tx: string | null };
    },
    onSuccess: (data) => {
      toast.success("Guardado correctamente");
      onDone?.(data);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const Icon = mut.isError ? ShieldAlert : ShieldCheck;

  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      title={
        mut.isError
          ? (mut.error as Error).message
          : mut.isSuccess
            ? `Anclado: ${mut.data?.anchor_tx ?? "—"}`
            : "Firmar y anclar en blockchain"
      }
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
        mut.isSuccess
          ? "border-emerald-500/40 text-emerald-600"
          : mut.isError
            ? "border-red-500/40 text-red-600"
            : "border-border hover:border-primary/40 hover:text-primary"
      } disabled:opacity-50`}
    >
      {mut.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {mut.isSuccess ? "Firmado" : "Firmar"}
    </button>
  );
}
