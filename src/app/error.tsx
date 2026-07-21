"use client";

// Red de seguridad de toda la app: sin este boundary, cualquier error no
// capturado en un componente cliente desmonta el árbol de React y deja la
// pantalla muerta —el usuario no puede ni navegar a otra sección—.

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  const isNetwork = /failed to fetch|networkerror|load failed|fetch failed/i.test(
    error?.message ?? ""
  );

  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>

        <h1 className="text-foreground mb-2 text-lg font-bold">
          {isNetwork ? "Sin conexión con el servidor" : "Algo salió mal"}
        </h1>

        <p className="text-foreground/60 mb-6 text-sm leading-relaxed">
          {isNetwork
            ? "No pudimos contactar al servidor. Revisa tu conexión e inténtalo de nuevo; tus registros guardados en el dispositivo no se han perdido."
            : "Ocurrió un error inesperado en esta pantalla. Puedes reintentar o volver al inicio."}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="border-border text-foreground/80 hover:bg-muted inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Ir al panel
          </Link>
        </div>

        {error?.digest && (
          <p className="text-foreground/30 mt-6 font-mono text-[11px]">ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
