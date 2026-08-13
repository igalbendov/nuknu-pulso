// Capa de datos del ecosistema NUKNU.
// - Si hay BACKEND_URL configurado → habla con el backend real (Google Apps Script).
// - Si no → MODO DEMO: todo se guarda en el navegador (localStorage).
// Las funciones son asíncronas para que cambiar a backend real sea transparente.

import { BACKEND_URL, DEMO_MODE } from "./config";
import { SEED_NEWS, SEED_RENDICIONES, SEED_MINUTAS } from "./seed";

const K_USERS = "nuknu-users-v1";
const K_NEWS = "nuknu-news-v1";
const K_MIN = "nuknu-minutas-v1";
const K_REND = "nuknu-rend-v1";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// hash liviano solo para el modo demo (la seguridad real vive en el backend)
function demoHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "d" + h.toString(16);
}

// ── Llamadas al backend real ────────────────────────────────
async function call(action, payload = {}) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, ...payload }),
    redirect: "follow",
  });
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error("Respuesta inválida del servidor");
  }
}

// ── AUTENTICACIÓN ────────────────────────────────────────────

// ¿Ya existe una cuenta con ese nombre?
export async function userExists(nombre) {
  const name = nombre.trim();
  if (DEMO_MODE) {
    const users = read(K_USERS, {});
    return !!users[name.toLowerCase()];
  }
  const r = await call("userExists", { nombre: name });
  return !!r.exists;
}

// Registrar (crear PIN la primera vez)
export async function register(nombre, pin) {
  const name = nombre.trim();
  if (DEMO_MODE) {
    const users = read(K_USERS, {});
    if (users[name.toLowerCase()]) throw new Error("Ese nombre ya tiene un PIN.");
    users[name.toLowerCase()] = { nombre: name, pin: demoHash(pin) };
    write(K_USERS, users);
    return { nombre: name };
  }
  const r = await call("register", { nombre: name, pin });
  if (!r.ok) throw new Error(r.error || "No se pudo registrar.");
  return { nombre: name };
}

// Iniciar sesión con PIN
export async function login(nombre, pin) {
  const name = nombre.trim();
  if (DEMO_MODE) {
    const users = read(K_USERS, {});
    const u = users[name.toLowerCase()];
    if (!u) throw new Error("No existe una cuenta con ese nombre.");
    if (u.pin !== demoHash(pin)) throw new Error("PIN incorrecto.");
    return { nombre: u.nombre };
  }
  const r = await call("login", { nombre: name, pin });
  if (!r.ok) throw new Error(r.error || "PIN incorrecto.");
  return { nombre: r.nombre || name };
}

// ── MURO DE NOVEDADES (público) ──────────────────────────────
export async function listNews() {
  if (DEMO_MODE) {
    const saved = read(K_NEWS, null);
    return saved || SEED_NEWS;
  }
  const r = await call("listNews");
  return r.news || [];
}

export async function postNews({ autor, cat, text }) {
  if (DEMO_MODE) {
    const list = read(K_NEWS, null) || SEED_NEWS;
    const item = { id: "u" + Date.now(), autor, cat, text, ts: Date.now(), likes: 0 };
    const next = [item, ...list];
    write(K_NEWS, next);
    return item;
  }
  const r = await call("postNews", { autor, cat, text });
  return r.item;
}

export async function saveNews(list) {
  if (DEMO_MODE) write(K_NEWS, list);
}

// ── MIS RENDICIONES ──────────────────────────────────────────
// admin=true → devuelve todas; si no, solo las del usuario.
export async function listRendiciones(nombre, isAdmin) {
  if (DEMO_MODE) {
    const extra = read(K_REND, []);
    const all = [...extra, ...SEED_RENDICIONES];
    return isAdmin
      ? all
      : all.filter((r) => r.autor.toLowerCase() === nombre.toLowerCase());
  }
  const r = await call("listRendiciones", { nombre, isAdmin });
  return r.rendiciones || [];
}

export async function submitRend(d) {
  if (DEMO_MODE) {
    const all = read(K_REND, []);
    all.unshift({
      id: "r" + Date.now(), autor: d.autor, fecha: d.fechaGasto, monto: Number(d.monto) || 0,
      categoria: d.categoria, estado: "Pendiente", desc: d.descripcion,
      medioPago: d.medioPago, numDoc: d.numDoc, fileUrl: "", comentario: "",
    });
    write(K_REND, all);
    return { ok: true };
  }
  return call("submitRend", d);
}

export async function updateRend(id, estado, comentario) {
  if (DEMO_MODE) {
    const all = read(K_REND, []).map((e) => (e.id === id ? { ...e, estado, comentario } : e));
    write(K_REND, all);
    return { ok: true };
  }
  return call("updateRendStatus", { id, estado, comentario });
}

// ── MIS MINUTAS ──────────────────────────────────────────────
export async function listMinutas(nombre, isAdmin) {
  if (DEMO_MODE) {
    const extra = read(K_MIN, []);
    const all = [...extra, ...SEED_MINUTAS];
    return isAdmin
      ? all
      : all.filter((m) => m.autor.toLowerCase() === nombre.toLowerCase());
  }
  const r = await call("listMinutas", { nombre, isAdmin });
  return r.minutas || [];
}

export async function saveMinuta(d) {
  if (DEMO_MODE) {
    const all = read(K_MIN, []);
    all.unshift({ id: "m" + Date.now(), autor: d.autor, fecha: d.fecha, titulo: d.titulo, resumen: d.resumen, acciones: d.acciones });
    write(K_MIN, all);
    return { ok: true };
  }
  return call("saveMinuta", d);
}
