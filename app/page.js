"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, BIRTHDAYS, initials, avatarColor, catOf } from "@/lib/seed";
import { ADMIN_NAMES, DEMO_MODE, APP_VERSION } from "@/lib/config";
import * as api from "@/lib/api";
import { notifyTeam } from "@/lib/push";
import RendicionesModule from "./rendiciones-module";
import MinutasModule from "./minutas-module";
import EquipoModule from "./equipo-module";
import TareasModule from "./tareas-module";

const SESSION_KEY = "nuknu-session-v1";
const isAdminName = (n) => ADMIN_NAMES.map((x) => x.toLowerCase()).includes(String(n).toLowerCase());

function Mark({ size = 42 }) {
  return <img className="mark" src="/mark.png" alt="NUKNU" width={size} height={size} />;
}

// ═══════════ LOGIN ═══════════
function LoginGate({ onLogin }) {
  const [step, setStep] = useState("name");
  const [nombre, setNombre] = useState(""), [pin, setPin] = useState(""), [pin2, setPin2] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function cont() {
    setErr(""); if (nombre.trim().length < 2) { setErr("Ingrese su nombre."); return; }
    setBusy(true);
    try {
      const { authorized, hasPin } = await api.checkAccess(nombre);
      if (!authorized) { setErr("No estás autorizado/a. Pídele al administrador que te agregue al equipo."); setBusy(false); return; }
      setStep(hasPin ? "login" : "create");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function entrar() {
    setErr(""); if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN debe tener de 4 a 6 números."); return; }
    setBusy(true); try { onLogin(await api.login(nombre.trim(), pin)); } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function crear() {
    setErr(""); if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN debe tener de 4 a 6 números."); return; }
    if (pin !== pin2) { setErr("Los PIN no coinciden."); return; }
    setBusy(true); try { await api.register(nombre.trim(), pin); onLogin(await api.login(nombre.trim(), pin)); } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <div className="login-card">
        <Mark size={64} />
        <img className="wm-img big" src="/wordmark.png" alt="nuknu" style={{ margin: "14px auto 4px" }} />
        <div className="tagsub" style={{ marginBottom: 22 }}>Team</div>
        {step === "name" && <>
          <input autoFocus placeholder="Su nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && cont()} />
          <button className="btn btn-primary full" onClick={cont} disabled={busy}>{busy ? "…" : "Continuar"}</button>
        </>}
        {step === "login" && <>
          <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Hola, {nombre.trim()} · ingrese su PIN</div>
          <input autoFocus type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
          <button className="btn btn-primary full" onClick={entrar} disabled={busy}>Ingresar</button>
          <button className="btn-link" style={{ marginTop: 12 }} onClick={() => { setStep("name"); setPin(""); setErr(""); }}>No soy {nombre.trim()}</button>
        </>}
        {step === "create" && <>
          <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Primera vez · cree su PIN (de 4 a 6 números)</div>
          <input autoFocus type="password" inputMode="numeric" placeholder="Nuevo PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <input type="password" inputMode="numeric" placeholder="Repita el PIN" value={pin2} onChange={(e) => setPin2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && crear()} />
          <button className="btn btn-primary full" onClick={crear} disabled={busy}>Crear PIN e ingresar</button>
          <button className="btn-link" style={{ marginTop: 12 }} onClick={() => { setStep("name"); setPin(""); setPin2(""); setErr(""); }}>Volver</button>
        </>}
        {err && <div className="ferr">{err}</div>}
        {DEMO_MODE && <div className="demo-note">Modo de prueba · el acceso queda en este dispositivo.</div>}
      </div>
    </div>
  );
}

// ═══════════ MURO ═══════════
function nextBirthday(people) {
  const now = new Date(), y = now.getFullYear(); let best = null;
  for (const b of people) {
    const raw = b.fechaNac || b.fecha; if (!raw) continue;
    const mm = parseInt(String(raw).slice(0, 2), 10), dd = parseInt(String(raw).slice(3, 5), 10);
    if (!mm || !dd) continue;
    const nombre = b.nombreCompleto || b.nombre;
    let date = new Date(y, mm - 1, dd);
    if (date < new Date(y, now.getMonth(), now.getDate())) date = new Date(y + 1, mm - 1, dd);
    if (!best || date < best.date) best = { nombre, date };
  }
  if (!best) return null;
  const today = new Date(y, now.getMonth(), now.getDate());
  return { ...best, diff: Math.round((best.date - today) / 86400000) };
}
function relTime(it) {
  const min = it.ts ? (Date.now() - it.ts) / 60000 : it.min;
  if (min == null) return ""; if (min < 1) return "recién"; if (min < 60) return `hace ${Math.round(min)} min`;
  const h = Math.floor(min / 60); if (h < 24) return `hace ${h} h`; return `hace ${Math.floor(h / 24)} d`;
}
function toB64(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); }); }

function Media({ it }) {
  if (!it.mediaType) return it.photo ? <div className="news-img" style={{ background: it.photo }} /> : null;
  const isData = String(it.mediaUrl || "").startsWith("data:");
  if (it.mediaType === "image") {
    const src = isData ? it.mediaUrl : (it.mediaId ? `https://drive.google.com/thumbnail?id=${it.mediaId}&sz=w1000` : it.mediaUrl);
    return <a href={it.mediaUrl || src} target="_blank" rel="noopener noreferrer"><img className="news-media" src={src} alt="" loading="lazy" /></a>;
  }
  if (it.mediaType === "video") {
    if (isData) return <video className="news-media" src={it.mediaUrl} controls />;
    return <iframe className="news-media" src={`https://drive.google.com/file/d/${it.mediaId}/preview`} allow="autoplay" />;
  }
  return <a className="media-file" href={it.mediaUrl} target="_blank" rel="noopener noreferrer">📎 {it.mediaName || "Ver archivo"}</a>;
}

function PostCard({ it, user, comments, onLike, onComment }) {
  const c = catOf(it.cat);
  const likedBy = String(it.likedBy || "").split(",").map((s) => s.trim()).filter(Boolean);
  const iLiked = likedBy.map((x) => x.toLowerCase()).includes(user.nombre.toLowerCase());
  const [open, setOpen] = useState(false);
  const [cmt, setCmt] = useState("");
  const mine = comments.filter((x) => x.newsId === it.id).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  async function send() { const t = cmt.trim(); if (!t) return; setCmt(""); await onComment(it.id, t); setOpen(true); }
  return (
    <div className="news">
      <div className="news-top">
        <div className="pav" style={{ background: avatarColor(it.autor) }}>{initials(it.autor)}</div>
        <div className="news-who"><div className="news-name">{it.autor}</div><div className="news-time">{relTime(it)}</div></div>
        <span className="cat-tag" style={{ background: c.soft, color: c.color }}>{c.label}</span>
      </div>
      {it.text && <div className="news-text">{it.text}</div>}
      <Media it={it} />
      <div className="news-react">
        <button className={"like" + (iLiked ? " on" : "")} onClick={() => onLike(it.id)} title={likedBy.join(", ")}>{iLiked ? "♥" : "♡"} {it.likes || 0}</button>
        <button className="like" onClick={() => setOpen((o) => !o)}>💬 {mine.length}</button>
      </div>
      {open && <div className="comments">
        {mine.map((x) => (
          <div className="comment" key={x.id}>
            <div className="pav sm" style={{ background: avatarColor(x.autor) }}>{initials(x.autor)}</div>
            <div><span className="c-autor">{x.autor}</span> <span className="c-text">{x.texto}</span></div>
          </div>
        ))}
        <div className="c-add">
          <input placeholder="Escriba un comentario…" value={cmt} onChange={(e) => setCmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn btn-primary btn-sm" onClick={send} disabled={!cmt.trim()}>Enviar</button>
        </div>
      </div>}
    </div>
  );
}

function Muro({ user }) {
  const [news, setNews] = useState([]), [comments, setComments] = useState([]);
  const [text, setText] = useState(""), [cat, setCat] = useState("general");
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [bday, setBday] = useState(null);
  useEffect(() => { api.listNews().then(setNews); api.listComments().then(setComments); }, []);
  useEffect(() => { api.listProfiles().then((ps) => { const withB = ps.filter((p) => p.fechaNac); setBday(nextBirthday(withB.length ? withB : BIRTHDAYS)); }).catch(() => setBday(nextBirthday(BIRTHDAYS))); }, []);

  async function publish() {
    const t = text.trim(); if (!t && !file) return;
    setErr(""); setBusy(true);
    try {
      let fileData = null, fileName = null, fileMime = null;
      if (file) { fileData = await toB64(file); fileName = file.name; fileMime = file.type; }
      const item = await api.postNews({ autor: user.nombre, cat, text: t, fileData, fileName, fileMime });
      setNews((n) => [item, ...n]); setText(""); setCat("general"); setFile(null);
      notifyTeam({ title: `${user.nombre} publicó una novedad`, body: t.slice(0, 90) || "(adjunto)", url: "/", excludeName: user.nombre });
    } catch (e) { setErr("No se pudo publicar. Intente con un archivo más liviano."); }
    setBusy(false);
  }
  async function onLike(id) {
    const r = await api.toggleLike(id, user.nombre);
    setNews((n) => n.map((it) => {
      if (it.id !== id) return it;
      const lb = String(it.likedBy || "").split(",").map((s) => s.trim()).filter(Boolean);
      const has = lb.map((x) => x.toLowerCase()).includes(user.nombre.toLowerCase());
      const nlb = r.liked && !has ? [...lb, user.nombre] : (!r.liked ? lb.filter((x) => x.toLowerCase() !== user.nombre.toLowerCase()) : lb);
      return { ...it, likes: r.likes, likedBy: nlb.join(", ") };
    }));
  }
  async function onComment(newsId, texto) {
    const item = await api.addComment({ newsId, autor: user.nombre, texto });
    setComments((cs) => [...cs, item]);
  }

  function pickFile(e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 12 * 1024 * 1024) { setErr("El archivo supera 12 MB. Use uno más liviano o un video corto."); setFile(null); e.target.value = ""; return; }
    setErr(""); setFile(f);
  }

  return (
    <>
      {bday && bday.diff <= 7 && <div className="bday"><span className="cake">🎂</span><div><b>{bday.diff === 0 ? `Hoy cumple ${bday.nombre}` : `Pronto cumple ${bday.nombre}`}</b><div className="bday-sub">{bday.diff === 0 ? "Déjenle un saludo" : `En ${bday.diff} día${bday.diff > 1 ? "s" : ""}`}</div></div></div>}
      <div className="card">
        <textarea className="pub-text" placeholder="Comparta una novedad con el equipo…" value={text} onChange={(e) => setText(e.target.value)} />
        {file && <div className="attach-chip">📎 {file.name} <button onClick={() => setFile(null)}>✕</button></div>}
        {err && <div className="ferr" style={{ textAlign: "left", marginTop: 0 }}>{err}</div>}
        <div className="pub-foot">
          <div className="cat-row">{CATEGORIES.map((c) => <button key={c.key} className={"cat-chip" + (cat === c.key ? " on" : "")} onClick={() => setCat(c.key)}>{c.label}</button>)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <label className="btn btn-sm" style={{ cursor: "pointer" }}>📎<input type="file" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={pickFile} style={{ display: "none" }} /></label>
            <button className="btn btn-primary btn-sm" onClick={publish} disabled={busy || (!text.trim() && !file)}>{busy ? "Publicando…" : "Publicar"}</button>
          </div>
        </div>
      </div>
      {news.map((it) => <PostCard key={it.id} it={it} user={user} comments={comments} onLike={onLike} onComment={onComment} />)}
    </>
  );
}

// ═══════════ HUB ═══════════
const TIENDAS_M = ["Tienda Pausa Pasteur", "Tienda Casa Costanera", "Oficina", "Terreno", "Otro"];
function ProfileModal({ user, onClose }) {
  const [f, setF] = useState({ nombreCompleto: "", cargo: "", tienda: "", fechaNac: "" });
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const mine = ps.find((p) => (p.nombre || "").toLowerCase() === user.nombre.toLowerCase());
      if (mine) { setF({ nombreCompleto: mine.nombreCompleto || "", cargo: mine.cargo || "", tienda: mine.tienda || "", fechaNac: "" }); setExisting(mine.fechaNac || ""); }
    });
  }, [user]);
  async function guardar() {
    setBusy(true);
    let mmdd = existing; if (f.fechaNac) { const m = f.fechaNac.match(/\d{4}-(\d{2})-(\d{2})/); if (m) mmdd = m[1] + "-" + m[2]; }
    try { await api.saveProfile({ nombre: user.nombre, nombreCompleto: f.nombreCompleto.trim(), cargo: f.cargo.trim(), tienda: f.tienda, fechaNac: mmdd, by: user.nombre }); } catch (e) {}
    setBusy(false); onClose();
  }
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 15, color: "var(--ink)" }}>¡Bienvenido/a a Nuknu Team!</h2>
        <p className="hint" style={{ marginTop: 0 }}>Complete su perfil. Aparece en el directorio del equipo y activa su cumpleaños.</p>
        <label className="f">Nombre completo</label>
        <input autoFocus placeholder="Ej: Fernanda Deichler" value={f.nombreCompleto} onChange={(e) => setF({ ...f, nombreCompleto: e.target.value })} style={{ marginBottom: 12 }} />
        <div className="fgrid">
          <div><label className="f">Cargo</label><input placeholder="Ej: Vendedora" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></div>
          <div><label className="f">Tienda / área</label><select value={f.tienda} onChange={(e) => setF({ ...f, tienda: e.target.value })}><option value="">Seleccionar…</option>{TIENDAS_M.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="full"><label className="f">Fecha de nacimiento {existing ? "(ya cargada)" : ""}</label><input type="date" value={f.fechaNac} onChange={(e) => setF({ ...f, fechaNac: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary full" style={{ marginTop: 16 }} onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</button>
        <button className="btn-link" style={{ marginTop: 10, width: "100%" }} onClick={onClose}>Completar después</button>
      </div>
    </div>
  );
}

function Hub({ user, onLogout }) {
  const [tab, setTab] = useState("muro");
  const [menu, setMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const admin = isAdminName(user.nombre);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const mine = ps.find((p) => (p.nombre || "").toLowerCase() === user.nombre.toLowerCase());
      if (!mine || !mine.nombreCompleto) setShowProfile(true);
    }).catch(() => {});
  }, [user]);
  const label = { muro: "Muro", tareas: "Tareas", rendiciones: "Rendiciones", minutas: "Minutas", equipo: "Equipo" }[tab];
  return (
    <div className="wrap">
      <header className="app">
        <div className="brand"><Mark /><div><img className="wm-img" src="/wordmark.png" alt="nuknu" /><div className="tagsub">Team · {label}</div></div></div>
        <div style={{ position: "relative" }}>
          <button className="user-pill" onClick={() => setMenu((m) => !m)} title="Menú">
            <span className="u-av">{initials(user.nombre)}</span>
            <span>{user.nombre.split(" ")[0]}{admin ? " · admin" : ""}</span>
            <span style={{ color: "var(--muted)", marginLeft: 2 }}>▾</span>
          </button>
          {menu && <>
            <div className="menu-ov" onClick={() => setMenu(false)} />
            <div className="user-menu">
              <div className="um-head">{user.nombre}{admin ? " · admin" : ""}</div>
              <button className="um-item" onClick={() => { setTab("equipo"); setMenu(false); }}>Mi perfil</button>
              <button className="um-item" onClick={() => { setMenu(false); onLogout(); }}>Cerrar sesión</button>
              <div className="um-ver">Versión {APP_VERSION}</div>
            </div>
          </>}
        </div>
      </header>

      {tab === "muro" && <Muro user={user} />}
      {tab === "tareas" && <TareasModule user={user} admin={admin} />}
      {tab === "rendiciones" && <RendicionesModule user={user} admin={admin} />}
      {tab === "minutas" && <MinutasModule user={user} admin={admin} />}
      {tab === "equipo" && <EquipoModule user={user} admin={admin} />}

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}

      <footer className="app">Nuknu Team {DEMO_MODE ? "· prueba" : ""}</footer>

      <nav className="tabbar">
        <button className={"tab" + (tab === "muro" ? " on" : "")} onClick={() => setTab("muro")}><span className="ic">◒</span>Muro</button>
        <button className={"tab" + (tab === "tareas" ? " on" : "")} onClick={() => setTab("tareas")}><span className="ic">✓</span>Tareas</button>
        <button className={"tab" + (tab === "rendiciones" ? " on" : "")} onClick={() => setTab("rendiciones")}><span className="ic">▤</span>Gastos</button>
        <button className={"tab" + (tab === "minutas" ? " on" : "")} onClick={() => setTab("minutas")}><span className="ic">◍</span>Minutas</button>
        <button className={"tab" + (tab === "equipo" ? " on" : "")} onClick={() => setTab("equipo")}><span className="ic">◇</span>Equipo</button>
      </nav>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem(SESSION_KEY); if (s) setUser(JSON.parse(s)); } catch {} setReady(true); }, []);
  function login(u) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {} setUser(u); }
  function logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} setUser(null); }
  if (!ready) return null;
  return user ? <Hub user={user} onLogout={logout} /> : <LoginGate onLogin={login} />;
}
