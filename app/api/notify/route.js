// Función serverless: envía notificaciones push a todo el equipo.
// La clave privada vive en VAPID_PRIVATE_KEY (variable de entorno en Vercel).
import webpush from "web-push";
import { BACKEND_URL, VAPID_PUBLIC } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return Response.json({ error: "Falta VAPID_PRIVATE_KEY en Vercel." }, { status: 500 });
  if (!BACKEND_URL) return Response.json({ error: "Sin backend configurado." }, { status: 500 });

  webpush.setVapidDetails("mailto:pulso@nuknu.com", VAPID_PUBLIC, priv);

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const { title, body: msg, url, excludeName } = body;

  // Traer suscripciones del backend (Apps Script)
  let subs = [];
  try {
    const r = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "listSubscriptions" }),
      redirect: "follow",
    });
    const data = await r.json();
    subs = data.subs || [];
  } catch (e) {
    return Response.json({ error: "No se pudieron leer las suscripciones." }, { status: 502 });
  }

  const payload = JSON.stringify({ title: title || "Nuknu Team", body: msg || "", url: url || "/" });
  const targets = subs.filter((s) => (s.nombre || "").toLowerCase() !== String(excludeName || "").toLowerCase());

  const results = await Promise.allSettled(
    targets.map((s) => {
      let sub;
      try { sub = JSON.parse(s.sub); } catch (e) { return Promise.resolve(); }
      return webpush.sendNotification(sub, payload).catch((err) => {
        if (err && (err.statusCode === 410 || err.statusCode === 404)) {
          fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "removeSubscription", endpoint: s.endpoint }),
            redirect: "follow",
          }).catch(() => {});
        }
      });
    })
  );

  return Response.json({ ok: true, sent: results.length });
}
