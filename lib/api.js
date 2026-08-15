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
const K_PROF = "nuknu-profiles-v1";
const K_COM = "nuknu-comments-v1";
const K_TAR = "nuknu-tareas-v1";

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

// ¿Está autorizada (creada por el admin) y ya tiene PIN?
export async function checkAccess(nombre) {
  const name = nombre.trim();
  if (DEMO_MODE) {
    const users = read(K_USERS, {});
    return { authorized: true, hasPin: !!users[name.toLowerCase()] };
  }
  const r = await call("checkAccess", { nombre: name });
  return { authorized: !!r.authorized, hasPin: !!r.hasPin };
}

export async function removePerson(nombre, by) {
  if (DEMO_MODE) return { ok: true };
  return call("removePerson", { nombre, by });
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

export async function postNews(payload) {
  const { autor, cat, text, fileData, fileName, fileMime } = payload;
  if (DEMO_MODE) {
    const list = read(K_NEWS, null) || SEED_NEWS;
    let mediaUrl = "", mediaType = "";
    if (fileData && fileName) {
      mediaUrl = `data:${fileMime || "application/octet-stream"};base64,${fileData}`;
      mediaType = (fileMime || "").indexOf("image") === 0 ? "image" : (fileMime || "").indexOf("video") === 0 ? "video" : "file";
    }
    const item = { id: "u" + Date.now(), autor, cat, text, ts: Date.now(), likes: 0, mediaUrl, mediaType, mediaName: fileName || "", likedBy: "" };
    write(K_NEWS, [item, ...list]);
    return item;
  }
  const r = await call("postNews", { autor, cat, text, fileData, fileName, fileMime });
  return r.item;
}

export async function saveNews(list) {
  if (DEMO_MODE) write(K_NEWS, list);
}

export async function toggleLike(id, nombre) {
  if (DEMO_MODE) {
    const list = read(K_NEWS, null) || SEED_NEWS;
    let res = { likes: 0, liked: false };
    const next = list.map((n) => {
      if (n.id !== id) return n;
      const lb = String(n.likedBy || "").split(",").map((s) => s.trim()).filter(Boolean);
      const idx = lb.map((x) => x.toLowerCase()).indexOf(nombre.toLowerCase());
      if (idx >= 0) lb.splice(idx, 1); else lb.push(nombre);
      res = { likes: lb.length, liked: idx < 0 };
      return { ...n, likedBy: lb.join(", "), likes: lb.length };
    });
    write(K_NEWS, next);
    return res;
  }
  const r = await call("toggleLike", { id, nombre });
  return { likes: r.likes || 0, liked: !!r.liked };
}

export async function listComments() {
  if (DEMO_MODE) return read(K_COM, []);
  const r = await call("listComments");
  return r.comments || [];
}

export async function addComment({ newsId, autor, texto }) {
  if (DEMO_MODE) {
    const all = read(K_COM, []);
    const item = { id: "c" + Date.now(), newsId, autor, texto, ts: Date.now() };
    write(K_COM, [...all, item]);
    return item;
  }
  const r = await call("addComment", { newsId, autor, texto });
  return r.item;
}

// ── TAREAS ───────────────────────────────────────────────────
export async function listTareas() {
  if (DEMO_MODE) return read(K_TAR, []);
  const r = await call("listTareas");
  return r.tareas || [];
}
export async function addTarea(d) {
  if (DEMO_MODE) {
    const all = read(K_TAR, []);
    const item = { id: "t" + Date.now(), estado: "pendiente", ts: Date.now(), ...d };
    write(K_TAR, [item, ...all]);
    return item;
  }
  const r = await call("addTarea", d);
  return r.item;
}
export async function toggleTarea(id, estado) {
  if (DEMO_MODE) {
    const all = read(K_TAR, []).map((t) => (t.id === id ? { ...t, estado: estado || (t.estado === "hecha" ? "pendiente" : "hecha") } : t));
    write(K_TAR, all);
    return { ok: true };
  }
  return call("toggleTarea", { id, estado });
}
export async function deleteTarea(id) {
  if (DEMO_MODE) { write(K_TAR, read(K_TAR, []).filter((t) => t.id !== id)); return { ok: true }; }
  return call("deleteTarea", { id });
}

// ── NOTIFICACIONES PUSH (suscripciones) ──────────────────────
export async function saveSubscription(nombre, sub) {
  if (DEMO_MODE) return { ok: true };
  return call("saveSubscription", { nombre, endpoint: sub.endpoint, sub: JSON.stringify(sub) });
}
export async function removeSubscription(endpoint) {
  if (DEMO_MODE) return { ok: true };
  return call("removeSubscription", { endpoint });
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

// ── PERFILES DEL EQUIPO ──────────────────────────────────────
export async function listProfiles() {
  if (DEMO_MODE) return read(K_PROF, []);
  const r = await call("listProfiles");
  return r.profiles || [];
}

export async function saveProfile(d) {
  if (DEMO_MODE) {
    const all = read(K_PROF, []).filter((p) => (p.nombre || "").toLowerCase() !== (d.nombre || "").toLowerCase());
    all.push(d);
    write(K_PROF, all);
    return { ok: true };
  }
  return call("saveProfile", d);
}

export async function saveMinuta(d) {
  if (DEMO_MODE) {
    const all = read(K_MIN, []);
    all.unshift({ id: "m" + Date.now(), autor: d.autor, fecha: d.fecha, titulo: d.titulo, resumen: d.resumen, acciones: d.acciones, contenido: d.contenido || "" });
    write(K_MIN, all);
    return { ok: true };
  }
  return call("saveMinuta", d);
}
