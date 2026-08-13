"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES, TEAM_NAMES, BIRTHDAYS, ECOSYSTEM,
  initials, avatarColor, catOf,
} from "@/lib/seed";
import { ADMIN_NAMES, DEMO_MODE } from "@/lib/config";
import * as api from "@/lib/api";

const SESSION_KEY = "nuknu-session-v1";
const clp = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CL");
const isAdminName = (n) => ADMIN_NAMES.map((x) => x.toLowerCase()).includes(String(n).toLowerCase());

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-label="Pulso">
      <defs>
        <linearGradient id="plsG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3a6b" /><stop offset="1" stopColor="#3d51a0" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="84" height="84" rx="22" fill="url(#plsG)" />
      <path d="M18 50 h14 l6 -16 l10 30 l7 -20 h13" fill="none" stroke="#fff"
        strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="34" r="5" fill="#ff5a4d" />
    </svg>
  );
}

// ══════════════════ LOGIN POR PIN ══════════════════
function LoginGate({ onLogin }) {
  const [step, setStep] = useState("name"); // name | login | create
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function continuar() {
    setErr("");
    const n = nombre.trim();
    if (n.length < 2) { setErr("Escribí tu nombre."); return; }
    setBusy(true);
    try {
      const exists = await api.userExists(n);
      setStep(exists ? "login" : "create");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function entrar() {
    setErr("");
    if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN son 4 a 6 números."); return; }
    setBusy(true);
    try {
      const u = await api.login(nombre.trim(), pin);
      onLogin(u);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  async function crear() {
    setErr("");
    if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN son 4 a 6 números."); return; }
    if (pin !== pin2) { setErr("Los PIN no coinciden."); return; }
    setBusy(true);
    try {
      await api.register(nombre.trim(), pin);
      const u = await api.login(nombre.trim(), pin);
      onLogin(u);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <Logo />
          <h1 className="wm" style={{ marginTop: 12 }}>nuknu · <span>Pulso</span></h1>
          <div className="sub">Tu acceso al equipo</div>
        </div>

        {step === "name" && (
          <>
            <label className="flabel">¿Cómo te llamás?</label>
            <input className="finput" autoFocus placeholder="Tu nombre" value={nombre}
              list="team" onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && continuar()} />
            <datalist id="team">{TEAM_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
            <button className="btn-primary full" onClick={continuar} disabled={busy}>
              {busy ? "..." : "Continuar →"}
            </button>
          </>
        )}

        {step === "login" && (
          <>
            <label className="flabel">Hola, {nombre.trim()} 👋 — ingresá tu PIN</label>
            <input className="finput" autoFocus type="password" inputMode="numeric"
              placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && entrar()} />
            <button className="btn-primary full" onClick={entrar} disabled={busy}>Entrar</button>
            <button className="btn-link" onClick={() => { setStep("name"); setPin(""); setErr(""); }}>← No soy {nombre.trim()}</button>
          </>
        )}

        {step === "create" && (
          <>
            <label className="flabel">Bienvenido/a, {nombre.trim()} ✨ — creá tu PIN</label>
            <p className="hint" style={{ marginTop: 0 }}>Es tu primera vez. Elegí un PIN de 4 a 6 números; lo usarás para entrar.</p>
            <input className="finput" autoFocus type="password" inputMode="numeric"
              placeholder="Nuevo PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            <input className="finput" type="password" inputMode="numeric"
              placeholder="Repetí el PIN" value={pin2} onChange={(e) => setPin2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crear()} />
            <button className="btn-primary full" onClick={crear} disabled={busy}>Crear PIN y entrar</button>
            <button className="btn-link" onClick={() => { setStep("name"); setPin(""); setPin2(""); setErr(""); }}>← Volver</button>
          </>
        )}

        {err && <p className="ferr">{err}</p>}
        {DEMO_MODE && <p className="demo-note">Modo demo · el acceso vive en este dispositivo. Conectá el backend de Google para que sea compartido.</p>}
      </div>
    </div>
  );
}

// ══════════════════ MURO ══════════════════
function nextBirthday() {
  const now = new Date(), y = now.getFullYear();
  let best = null;
  for (const b of BIRTHDAYS) {
    const [mm, dd] = b.fecha.split("-").map(Number);
    let date = new Date(y, mm - 1, dd);
    if (date < new Date(y, now.getMonth(), now.getDate())) date = new Date(y + 1, mm - 1, dd);
    if (!best || date < best.date) best = { ...b, date };
  }
  if (!best) return null;
  const today = new Date(y, now.getMonth(), now.getDate());
  return { ...best, diff: Math.round((best.date - today) / 86400000) };
}
function relTime(it) {
  const min = it.ts ? (Date.now() - it.ts) / 60000 : it.min;
  if (min == null) return "";
  if (min < 1) return "recién";
  if (min < 60) return `hace ${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function Muro({ user }) {
  const [news, setNews] = useState([]);
  const [text, setText] = useState("");
  const [cat, setCat] = useState("general");
  const [liked, setLiked] = useState({});
  const bday = useMemo(() => nextBirthday(), []);

  useEffect(() => { api.listNews().then(setNews); }, []);

  async function publish() {
    const t = text.trim(); if (!t) return;
    const item = await api.postNews({ autor: user.nombre, cat, text: t });
    setNews((n) => [item, ...n]); setText(""); setCat("general");
  }
  function like(id) {
    setLiked((l) => {
      const on = !l[id];
      setNews((n) => {
        const next = n.map((it) => it.id === id ? { ...it, likes: Math.max(0, (it.likes || 0) + (on ? 1 : -1)) } : it);
        api.saveNews(next); return next;
      });
      return { ...l, [id]: on };
    });
  }

  return (
    <>
      {bday && bday.diff <= 7 && (
        <div className="bday">
          <span className="cake">🎂</span>
          <div>
            <b>{bday.diff === 0 ? `¡Hoy cumple ${bday.nombre}!` : `Pronto cumple ${bday.nombre}`}</b>
            <div className="bday-sub">{bday.diff === 0 ? "Déjale un saludo 🎉" : `En ${bday.diff} día${bday.diff > 1 ? "s" : ""}`}</div>
          </div>
        </div>
      )}
      <div className="card">
        <textarea className="pub-text" rows={2} placeholder={`Comparte una novedad con el equipo, ${user.nombre.split(" ")[0]}…`}
          value={text} onChange={(e) => setText(e.target.value)} />
        <div className="pub-foot">
          <div className="cat-row">
            {CATEGORIES.map((c) => (
              <button key={c.key} className={"cat-chip" + (cat === c.key ? " on" : "")}
                style={cat === c.key ? { background: c.color, borderColor: "transparent", color: "#fff" } : {}}
                onClick={() => setCat(c.key)}>{c.label}</button>
            ))}
          </div>
          <button className="btn-primary pub-btn" onClick={publish} disabled={!text.trim()}>Publicar</button>
        </div>
      </div>
      {news.map((it) => {
        const c = catOf(it.cat);
        return (
          <div className="news" key={it.id}>
            <div className="news-top">
              <div className="pav" style={{ background: avatarColor(it.autor) }}>{initials(it.autor)}</div>
              <div className="news-who"><div className="news-name">{it.autor}</div><div className="news-time">{relTime(it)}</div></div>
              <span className="cat-tag" style={{ background: c.soft, color: c.color }}>{c.label}</span>
            </div>
            <div className="news-text">{it.text}</div>
            {it.photo && <div className="news-img" style={{ background: it.photo }} />}
            <div className="news-react">
              <button className={"like" + (liked[it.id] ? " on" : "")} onClick={() => like(it.id)}>
                {liked[it.id] ? "❤️" : "🤍"} {it.likes || 0}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════ MIS RENDICIONES ══════════════════
const BADGE = { Aprobado: "b-green", Pendiente: "b-amber", Rechazado: "b-red" };
function Rendiciones({ user, admin }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.listRendiciones(user.nombre, admin).then(setList); }, [user, admin]);
  const rUrl = ECOSYSTEM.find((a) => a.key === "rendiciones")?.url || "#";
  return (
    <>
      <div className="sec-hdr">
        <h2>🧾 {admin ? "Rendiciones del equipo" : "Mis rendiciones"}</h2>
        <a className={"mini-open" + (rUrl === "#" ? " disabled" : "")} href={rUrl} target="_blank" rel="noopener noreferrer">+ Nueva</a>
      </div>
      {admin && <p className="hint" style={{ marginTop: 0 }}>Como administrador ves las de todo el equipo.</p>}
      {list === null ? <div className="loading">Cargando…</div> :
        list.length === 0 ? <div className="empty">Aún no tenés rendiciones.</div> :
        list.map((r) => (
          <div className="row-item" key={r.id}>
            <div className="ri-body">
              <div className="ri-title">{r.desc}</div>
              <div className="ri-meta">{admin && <b>{r.autor} · </b>}{r.fecha} · {r.categoria}</div>
            </div>
            <div className="ri-right">
              <div className="ri-amount">{clp(r.monto)}</div>
              <span className={"badge " + (BADGE[r.estado] || "b-amber")}>{r.estado}</span>
            </div>
          </div>
        ))}
    </>
  );
}

// ══════════════════ MIS MINUTAS ══════════════════
function Minutas({ user, admin }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.listMinutas(user.nombre, admin).then(setList); }, [user, admin]);
  const url = ECOSYSTEM.find((a) => a.key === "reunote")?.url || "#";
  return (
    <>
      <div className="sec-hdr">
        <h2>🎙️ {admin ? "Minutas del equipo" : "Mis minutas"}</h2>
        <a className={"mini-open" + (url === "#" ? " disabled" : "")} href={url} target="_blank" rel="noopener noreferrer">+ Nueva</a>
      </div>
      {admin && <p className="hint" style={{ marginTop: 0 }}>Como administrador ves las de todo el equipo.</p>}
      {list === null ? <div className="loading">Cargando…</div> :
        list.length === 0 ? <div className="empty">Aún no tenés minutas guardadas.</div> :
        list.map((m) => (
          <div className="row-item" key={m.id}>
            <div className="ri-body">
              <div className="ri-title">{m.titulo}</div>
              <div className="ri-meta">{admin && <b>{m.autor} · </b>}{m.fecha}{m.acciones ? ` · ${m.acciones} acciones` : ""}</div>
              {m.resumen && <div className="ri-sub">{m.resumen}</div>}
            </div>
          </div>
        ))}
    </>
  );
}

// ══════════════════ APPS ══════════════════
function Apps() {
  return (
    <div className="card">
      <h2>🧩 Ecosistema NUKNU</h2>
      <p className="hint" style={{ marginTop: 0 }}>Un solo acceso; desde acá abrís tus herramientas.</p>
      {ECOSYSTEM.map((a) => (
        <div className="app-tile" key={a.key}>
          <div className="app-ic" style={{ background: a.color }}>{a.emoji}</div>
          <div className="app-info"><div className="app-name">{a.nombre}</div><div className="app-desc">{a.desc}</div></div>
          <a className={"app-open" + (a.url === "#" ? " disabled" : "")} href={a.url} target="_blank" rel="noopener noreferrer">Abrir →</a>
        </div>
      ))}
    </div>
  );
}

// ══════════════════ HUB ══════════════════
function Hub({ user, onLogout }) {
  const [tab, setTab] = useState("muro");
  const admin = isAdminName(user.nombre);
  const today = useMemo(() => {
    const d = new Date();
    const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
    const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
  }, []);
  return (
    <div className="wrap">
      <header className="app">
        <div className="brand">
          <Logo />
          <div><h1 className="wm">nuknu · <span>Pulso</span></h1><div className="sub" style={{ textTransform: "capitalize" }}>{today}</div></div>
        </div>
        <button className="user-pill" onClick={onLogout} title="Cerrar sesión">
          <span className="u-av" style={{ background: avatarColor(user.nombre) }}>{initials(user.nombre)}</span>
          <span>{user.nombre.split(" ")[0]}{admin ? " · admin" : ""}</span>
        </button>
      </header>

      {tab === "muro" && <Muro user={user} />}
      {tab === "rendiciones" && <Rendiciones user={user} admin={admin} />}
      {tab === "minutas" && <Minutas user={user} admin={admin} />}
      {tab === "apps" && <Apps />}

      <footer className="app">
        <div>{DEMO_MODE ? "Modo demo · datos en este dispositivo" : "Conectado al equipo"}</div>
        <div className="family">🧩 <b style={{ color: "var(--text)" }}>&nbsp;NUKNU</b> · Pulso · ReuNote · Rendiciones</div>
      </footer>

      <nav className="tabbar">
        <button className={"tab" + (tab === "muro" ? " on" : "")} onClick={() => setTab("muro")}><span className="ic">📣</span>Muro</button>
        <button className={"tab" + (tab === "rendiciones" ? " on" : "")} onClick={() => setTab("rendiciones")}><span className="ic">🧾</span>Rendiciones</button>
        <button className={"tab" + (tab === "minutas" ? " on" : "")} onClick={() => setTab("minutas")}><span className="ic">🎙️</span>Minutas</button>
        <button className={"tab" + (tab === "apps" ? " on" : "")} onClick={() => setTab("apps")}><span className="ic">🧩</span>Apps</button>
      </nav>
    </div>
  );
}

// ══════════════════ ROOT ══════════════════
export default function Home() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem(SESSION_KEY); if (s) setUser(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  function login(u) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {} setUser(u); }
  function logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} setUser(null); }
  if (!ready) return null;
  return user ? <Hub user={user} onLogout={logout} /> : <LoginGate onLogin={login} />;
}
