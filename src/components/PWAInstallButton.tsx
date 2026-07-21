"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Ya instalada como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Ya fue descartada en esta sesión
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  if (installed || dismissed || !prompt) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 sm:right-6 sm:bottom-6 sm:left-auto sm:translate-x-0">
      <div className="border-primary/20 bg-card flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl">
        <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Download className="text-primary h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">Instalar app</p>
          <p className="text-foreground/50 text-xs">Acceso offline desde tu pantalla</p>
        </div>
        <button
          onClick={install}
          className="bg-primary hover:bg-primary/90 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={dismiss}
          className="text-foreground/40 hover:text-foreground rounded-lg p-1 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
