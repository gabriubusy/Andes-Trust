"use client";

// =====================================================================
// Aviso para las escrituras que NO pueden encolarse.
//
// Sólo pesajes, vacunas, tratamientos, leche y traslados van a la cola
// offline. El resto (editar o eliminar un animal, catálogos, ventas,
// reproducción…) necesita servidor: o depende de ids que genera Postgres,
// o son operaciones que no tiene sentido diferir.
//
// Sin este aviso el usuario rellenaba el formulario, pulsaba guardar, veía
// un error rojo y el modal seguía abierto — sin forma de saber que aquello
// jamás iba a funcionar sin señal. Mejor decirlo antes de que escriba nada
// y desactivar el botón, como ya hace el alta de animal.
// =====================================================================

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * ¿Hay red ahora mismo? Se inicializa en `true` y se corrige en efecto para
 * no desincronizar el HTML del servidor con el del cliente.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

type Props = {
  /** Qué se está intentando hacer, en infinitivo: "editar este animal". */
  readonly action: string;
};

export default function OfflineWriteNotice({ action }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-xs text-amber-700 dark:text-amber-400">
        <span className="font-semibold">Sin conexión.</span> Para {action} hace falta internet, y
        esta acción no puede guardarse en el dispositivo. Los pesajes, vacunas, tratamientos,
        registros de leche y traslados sí se guardan sin señal y se envían solos al recuperarla.
      </p>
    </div>
  );
}
