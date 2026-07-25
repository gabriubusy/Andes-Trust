"use client";

// =====================================================================
// Visor de imagen a pantalla completa con zoom y desplazamiento.
//
// Sin dependencias externas: el zoom es un transform CSS (scale + translate)
// para que funcione offline igual que el resto de la app. El padre monta el
// componente sólo cuando hay algo que mostrar (src != null) y lo desmonta en
// onClose; así el estado de zoom se reinicia solo entre imágenes.
// =====================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.5;

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function Lightbox({ src, alt = "", onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const reset = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = clamp(s + delta);
      if (next === 1) setPos({ x: 0, y: 0 }); // al volver a 1x se recentra
      return next;
    });
  }, []);

  // Cierre con Escape y bloqueo del scroll de fondo mientras está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomBy(STEP);
      if (e.key === "-") zoomBy(-STEP);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, zoomBy]);

  // Rueda del ratón: zoom. Se registra como listener nativo NO pasivo porque
  // el onWheel de React es pasivo y no permite preventDefault (la página
  // haría scroll por detrás del visor).
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? STEP : -STEP);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return; // sin zoom no hay nada que arrastrar
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const zoomed = scale > 1;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Barra de controles */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => zoomBy(-STEP)}
          disabled={scale <= MIN_SCALE}
          aria-label="Alejar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] text-center text-xs font-medium text-white/80 tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(STEP)}
          disabled={scale >= MAX_SCALE}
          aria-label="Acercar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!zoomed}
          aria-label="Restablecer zoom"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Superficie de la imagen */}
      <div
        ref={surfaceRef}
        className="flex h-full w-full items-center justify-center overflow-hidden p-4 sm:p-10"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => (zoomed ? reset() : zoomBy(1.5))}
        style={{ cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full touch-none select-none object-contain"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[11px] text-white/50">
        Doble clic o rueda para acercar · arrastra para mover · Esc para cerrar
      </p>
    </div>
  );
}
