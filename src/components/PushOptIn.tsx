"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Traduce el fallo real (DOMException del navegador o marcador propio). */
function describePushError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  const message = (e as { message?: string })?.message ?? "";

  if (message === "sw_timeout")
    return "El service worker no está activo. Recarga la página e intenta de nuevo.";
  if (message === "vapid_missing")
    return "El servidor no tiene configuradas las claves VAPID. Revisa el despliegue.";
  if (message === "save_failed") return "No se pudo guardar la suscripción en el servidor.";
  if (/failed to fetch|networkerror/i.test(message))
    return "Sin conexión con el servidor. Revisa tu red.";
  if (name === "NotSupportedError") return "Este navegador no soporta notificaciones push.";
  if (name === "NotAllowedError") return "El permiso de notificaciones fue rechazado.";
  if (name === "AbortError")
    return "El navegador rechazó la suscripción. Si usas Brave, activa «Usar Google para mensajería push» en brave://settings/privacy. Si no, revisa tu conexión y reintenta.";
  return message || "Error desconocido al suscribirse.";
}

export default function PushOptIn() {
  const { getAccessToken, authenticated } = usePrivy();
  const [status, setStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") setStatus("denied");

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("subscribed");
    });
  }, []);

  const subscribe = async () => {
    if (!authenticated) return;

    // Web Push exige contexto seguro. Abrir la app por http://IP-local (no
    // https, no localhost) hace fallar `subscribe` con errores opacos; mejor
    // decirlo claro antes de intentarlo.
    if (!window.isSecureContext) {
      toast.error("Las notificaciones requieren HTTPS", {
        description: "Abre la app por su dirección https://, no por una IP local.",
      });
      return;
    }

    setBusy(true);
    try {
      // `serviceWorker.ready` se queda colgado para siempre si no hay SW
      // registrado (p. ej. en desarrollo se desregistra a propósito). Con un
      // límite de tiempo damos un mensaje útil en vez de un spinner eterno.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sw_timeout")), 8000)),
      ]);

      const keyRes = await fetch("/api/push/subscribe");
      const { vapid_public_key } = (await keyRes.json()) as { vapid_public_key?: string };
      if (!vapid_public_key) throw new Error("vapid_missing");

      // Una suscripción previa creada con OTRA clave VAPID hace que subscribe()
      // falle con AbortError. Se limpia antes para partir de cero.
      const prev = await reg.pushManager.getSubscription();
      if (prev) await prev.unsubscribe();

      const appKey = urlBase64ToUint8Array(vapid_public_key) as BufferSource;
      const doSubscribe = () =>
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });

      let sub;
      try {
        sub = await doSubscribe();
      } catch (err) {
        // AbortError suele ser transitorio (el servicio de push tarda en
        // responder): un reintento tras una breve pausa lo resuelve a menudo.
        if ((err as { name?: string })?.name === "AbortError") {
          await new Promise((r) => setTimeout(r, 1500));
          sub = await doSubscribe();
        } else {
          throw err;
        }
      }

      const token = await getAccessToken();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("subscribed");
      toast.success("Notificaciones activadas");
    } catch (e) {
      console.error("[push] subscribe failed", e);
      if (Notification.permission === "denied") {
        setStatus("denied");
        toast.error("Permiso de notificaciones bloqueado", {
          description: "Actívalo en los ajustes del navegador para este sitio.",
        });
        return;
      }
      toast.error("No se pudieron activar las notificaciones", {
        description: describePushError(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { sent?: number };
      if (data.sent && data.sent > 0) {
        toast.success("Notificación de prueba enviada", {
          description: "Debería llegar en unos segundos.",
        });
      } else {
        toast.error("No se envió ninguna notificación", {
          description:
            "No hay una suscripción activa en este dispositivo o faltan las claves VAPID en el servidor.",
        });
      }
    } catch {
      toast.error("No se pudo enviar la prueba.");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const token = await getAccessToken();
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  };

  if (status === "unsupported") return null;
  if (status === "denied") {
    return (
      <span className="text-foreground/40 inline-flex items-center gap-1 text-xs">
        <BellOff className="h-3 w-3" /> Push bloqueado
      </span>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          title="Enviar una notificación de prueba"
          className="border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
          Probar
        </button>
        <button
          type="button"
          onClick={unsubscribe}
          disabled={busy}
          title="Desactivar notificaciones"
          className="border-border text-foreground/50 hover:text-foreground inline-flex items-center rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
        >
          <BellOff className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={busy}
      className="border-border hover:border-primary/40 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3" />}
      Activar push
    </button>
  );
}
