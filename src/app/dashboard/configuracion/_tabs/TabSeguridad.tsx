"use client";

import { useState } from "react";
import { usePrivy, useLinkWithPasskey, type PasskeyWithMetadata } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Fingerprint, Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TabSeguridad() {
  const { user, unlinkPasskey } = usePrivy();
  const { linkWithPasskey } = useLinkWithPasskey();
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const passkeys = (user?.linkedAccounts.filter((a) => a.type === "passkey") ??
    []) as PasskeyWithMetadata[];

  async function handleAdd() {
    setAdding(true);
    try {
      await linkWithPasskey();
      toast.success("Passkey registrado");
    } catch {
      toast.error("No se pudo registrar el passkey. Intenta de nuevo.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(credentialId: string) {
    if (!confirm("¿Quitar este passkey? Ya no podrás usarlo para iniciar sesión.")) return;
    setRemovingId(credentialId);
    try {
      await unlinkPasskey(credentialId);
      toast.success("Passkey eliminado");
    } catch {
      toast.error("No se pudo eliminar el passkey.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-card border-border rounded-2xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-foreground flex items-center gap-2 text-base font-bold">
              <Fingerprint className="text-primary h-4 w-4" /> Inicio de sesión con Passkey
            </h3>
            <p className="text-foreground/50 mt-0.5 text-xs">
              Entra con la huella, Face ID o el PIN de tu dispositivo, sin esperar un código por
              correo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Agregar passkey
          </button>
        </div>

        {passkeys.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed p-6 text-center">
            <Fingerprint className="text-foreground/15 mx-auto mb-2 h-8 w-8" />
            <p className="text-foreground/50 text-sm">Aún no tienes un passkey registrado.</p>
            <p className="text-foreground/30 mt-1 text-xs">
              Agrega uno para poder iniciar sesión sin código por correo en este dispositivo.
            </p>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {passkeys.map((pk) => (
              <li key={pk.credentialId} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                    <ShieldCheck className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {pk.authenticatorName ?? pk.createdWithDevice ?? "Dispositivo"}
                    </p>
                    <p className="text-foreground/40 text-xs">
                      Agregado el {fmtDate(pk.firstVerifiedAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(pk.credentialId)}
                  disabled={removingId === pk.credentialId}
                  className="text-foreground/40 hover:bg-destructive/10 hover:text-destructive rounded-lg p-2 disabled:opacity-50"
                  title="Quitar passkey"
                >
                  {removingId === pk.credentialId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
