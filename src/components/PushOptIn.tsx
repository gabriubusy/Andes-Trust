"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
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
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/subscribe");
      const { vapid_public_key } = await keyRes.json();
      if (!vapid_public_key) throw new Error("VAPID key no configurada en servidor");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public_key) as BufferSource,
      });

      const token = await getAccessToken();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          user_agent: navigator.userAgent,
        }),
      });
      setStatus("subscribed");
    } catch (e) {
      console.error(e);
      if (Notification.permission === "denied") setStatus("denied");
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

  return (
    <button
      type="button"
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      disabled={busy}
      className="border-border hover:border-primary/40 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "subscribed" ? (
        <Bell className="h-3 w-3" />
      ) : (
        <BellOff className="h-3 w-3" />
      )}
      {status === "subscribed" ? "Notificaciones activas" : "Activar push"}
    </button>
  );
}
