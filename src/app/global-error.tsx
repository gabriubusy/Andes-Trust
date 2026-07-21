"use client";

// Último recurso: captura errores que ocurren en el propio layout raíz,
// donde `app/error.tsx` ya no puede montarse. Debe renderizar <html>/<body>
// porque sustituye al layout entero.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0b1220",
          color: "#e6edf7",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            La aplicación no pudo cargarse
          </h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            Ocurrió un error grave al iniciar. Recarga la página para volver a intentarlo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2f6df6",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "0.7rem 1.4rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
          {error?.digest && (
            <p style={{ fontSize: "0.7rem", opacity: 0.35, marginTop: "1.5rem" }}>
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
