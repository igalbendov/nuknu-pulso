"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, BIRTHDAYS, initials, avatarColor, catOf } from "@/lib/seed";
import { ADMIN_NAMES, DEMO_MODE, APP_VERSION } from "@/lib/config";
import * as api from "@/lib/api";
import RendicionesModule from "./rendiciones-module";
import MinutasModule from "./minutas-module";
import EquipoModule from "./equipo-module";

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
    setBusy(true); try { const e = await api.userExists(nombre); setStep(e ? "login" : "create"); } catch (e) { setErr(e.message); } setBusy(false);
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
        <div className="tagsub" style={{ marginBottom: 22 }}>Pulso</div>
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
function Muro({ user }) {
  const [news, setNews] = useState([]), [text, setText] = useState(""), [cat, setCat] = useState("general"), [liked, setLiked] = useState({});
  const [bday, setBday] = useState(null);
  useEffect(() => { api.listNews().then(setNews); }, []);
  useEffect(() => { api.listProfiles().then((ps) => { const withB = ps.filter((p) => p.fechaNac); setBday(nextBirthday(withB.length ? withB : BIRTHDAYS)); }).catch(() => setBday(nextBirthday(BIRTHDAYS))); }, []);
  async function publish() { const t = text.trim(); if (!t) return; const item = await api.postNews({ autor: user.nombre, cat, text: t }); setNews((n) => [item, ...n]); setText(""); setCat("general"); }
  function like(id) { setLiked((l) => { const on = !l[id]; setNews((n) => { const nx = n.map((it) => it.id === id ? { ...it, likes: Math.max(0, (it.likes || 0) + (on ? 1 : -1)) } : it); api.saveNews(nx); return nx; }); return { ...l, [id]: on }; }); }
  return (
    <>
      {bday && bday.diff <= 7 && <div className="bday"><span className="cake">🎂</span><div><b>{bday.diff === 0 ? `Hoy cumple ${bday.nombre}` : `Pronto cumple ${bday.nombre}`}</b><div className="bday-sub">{bday.diff === 0 ? "Déjenle un saludo" : `En ${bday.diff} día${bday.diff > 1 ? "s" : ""}`}</div></div></div>}
      <div className="card">
        <textarea className="pub-text" placeholder="Comparta una novedad con el equipo…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="pub-foot">
          <div className="cat-row">{CATEGORIES.map((c) => <button key={c.key} className={"cat-chip" + (cat === c.key ? " on" : "")} onClick={() => setCat(c.key)}>{c.label}</button>)}</div>
          <button className="btn btn-primary btn-sm" onClick={publish} disabled={!text.trim()}>Publicar</button>
        </div>
      </div>
      {news.map((it) => { const c = catOf(it.cat); return (
        <div className="news" key={it.id}>
          <div className="news-top">
            <div className="pav" style={{ background: avatarColor(it.autor) }}>{initials(it.autor)}</div>
            <div className="news-who"><div className="news-name">{it.autor}</div><div className="news-time">{relTime(it)}</div></div>
            <span className="cat-tag" style={{ background: c.soft, color: c.color }}>{c.label}</span>
          </div>
          <div className="news-text">{it.text}</div>
          {it.photo && <div className="news-img" style={{ background: it.photo }} />}
          <div className="news-react"><button className={"like" + (liked[it.id] ? " on" : "")} onClick={() => like(it.id)}>{liked[it.id] ? "♥" : "♡"} {it.likes || 0}</button></div>
        </div>
      ); })}
    </>
  );
}

// ═══════════ HUB ═══════════
function Hub({ user, onLogout }) {
  const [tab, setTab] = useState("muro");
  const [menu, setMenu] = useState(false);
  const admin = isAdminName(user.nombre);
  const label = { muro: "Muro", rendiciones: "Rendiciones", minutas: "Minutas", equipo: "Equipo" }[tab];
  return (
    <div className="wrap">
      <header className="app">
        <div className="brand"><Mark /><div><img className="wm-img" src="/wordmark.png" alt="nuknu" /><div className="tagsub">Pulso · {label}</div></div></div>
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
      {tab === "rendiciones" && <RendicionesModule user={user} admin={admin} />}
      {tab === "minutas" && <MinutasModule user={user} admin={admin} />}
      {tab === "equipo" && <EquipoModule user={user} />}

      <footer className="app">NUKNU · Pulso {DEMO_MODE ? "· prueba" : ""}</footer>

      <nav className="tabbar">
        <button className={"tab" + (tab === "muro" ? " on" : "")} onClick={() => setTab("muro")}><span className="ic">◒</span>Muro</button>
        <button className={"tab" + (tab === "rendiciones" ? " on" : "")} onClick={() => setTab("rendiciones")}><span className="ic">▤</span>Rendiciones</button>
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
