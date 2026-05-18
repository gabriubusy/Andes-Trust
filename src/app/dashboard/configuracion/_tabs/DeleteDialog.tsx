"use client";

import { Loader2 } from "lucide-react";

export function DeleteDialog({
  title,
  body,
  onCancel,
  onConfirm,
  pending,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-2 text-base font-bold">{title}</h2>
        <p className="text-foreground/70 mb-6 text-sm">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border-border text-foreground/80 hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
