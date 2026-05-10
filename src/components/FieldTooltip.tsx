"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";

export default function FieldTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.top + window.scrollY - 8,
      left: r.left + r.width / 2 + window.scrollX,
    });
  };

  const hide = () => setPos(null);

  return (
    <span className="relative ml-1 inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label="Ayuda"
        className="text-foreground/40 hover:text-foreground/70 transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {pos && (
        <span
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
          className="border-border pointer-events-none w-56 rounded-lg border bg-neutral-900 px-3 py-2 text-xs text-neutral-100 shadow-xl dark:bg-neutral-800"
        >
          {text}
          <span className="border-border absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b bg-neutral-900 dark:bg-neutral-800" />
        </span>
      )}
    </span>
  );
}
