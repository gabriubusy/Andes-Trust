"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export default function Modal({ title, description, onClose, children, maxWidth = "md" }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-card border-border w-full ${widths[maxWidth]} rounded-2xl border shadow-2xl`}
      >
        {/* Header */}
        <div className="border-border flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-foreground text-base leading-tight font-bold">{title}</h2>
            {description && <p className="text-foreground/50 mt-0.5 text-xs">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground hover:bg-muted -mt-1 -mr-1 ml-4 rounded-lg p-1.5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
