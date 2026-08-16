"use client";
import { VAPID_PUBLIC } from "./config";
import * as api from "./api";

function urlB64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function enablePush(nombre) {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
    });
    await api.saveSubscription(nombre, sub.toJSON ? sub.toJSON() : sub);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "error", message: String(e && e.message || e) };
  }
}

// Dispara un aviso al equipo vía la función serverless.
// - excludeName: no notificar al autor.
// - onlyNames: si se entrega, notifica SOLO a esas personas (para menciones @).
export async function notifyTeam({ title, body, url, excludeName, onlyNames }) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url: url || "/", excludeName, onlyNames }),
    });
  } catch (e) {}
}
