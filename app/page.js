"use client";

import { useEffect, useState } from "react";
import { initials } from "@/lib/seed";
import { ADMIN_EMAILS, DEMO_MODE, APP_VERSION } from "@/lib/config";
import * as api from "@/lib/api";
import MuroModule from "./muro-module";
import RendicionesModule from "./rendiciones-module";
import MinutasModule from "./minutas-module";
import EquipoModule from "./equipo-module";
import TareasModule from "./tareas-module";

const SESSION_KEY = "nuknu-session-v1";
const isAdminEmail = (e) => ADMIN_EMAILS.map((x) => x.toLowerCase()).includes(String(e || "").toLowerCase());

function Mark({ size = 42 }) {
  return <img className="mark" src="/mark.png" alt="NUKNU" width={size} height={size} />;
}

// ═══════════ LOGIN (por email) ═══════════
function LoginGate({ onLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(""), [pin, setPin] = useState(""), [pin2, setPin2] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e).trim());
  async function cont() {
    setErr(""); if (!validEmail(email)) { setErr("Ingrese un correo válido."); return; }
    setBusy(true);
    try {
      const { authorized, hasPin } = await api.checkAccess(email);
      if (!authorized) { setErr("Ese correo no está autorizado. Pídele al administrador que te agregue al equipo."); setBusy(false); return; }
      setStep(hasPin ? "login" : "create");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function entrar() {
    setErr(""); if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN debe tener de 4 a 6 números."); return; }
    setBusy(true); try { onLogin(await api.login(email, pin)); } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function crear() {
    setErr(""); if (!/^\d{4,6}$/.test(pin)) { setErr("El PIN debe tener de 4 a 6 números."); return; }
    if (pin !== pin2) { setErr("Los PIN no coinciden."); return; }
    setBusy(true); try { await api.register(email, pin); onLogin(await api.login(email, pin)); } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <div className="login-card">
        <Mark size={64} />
        <img className="wm-img big" src="/wordmark.png" alt="nuknu" style={{ margin: "14px auto 4px" }} />
        <div className="tagsub" style={{ marginBottom: 22 }}>Team</div>
        {step === "email" && <>
          <input autoFocus type="email" inputMode="email" autoCapitalize="none" placeholder="Su correo" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && cont()} />
          <button className="btn btn-primary full" onClick={cont} disabled={busy}>{busy ? "…" : "Continuar"}</button>
        </>}
        {step === "login" && <>
          <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Ingrese su PIN</div>
          <input autoFocus type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
          <button className="btn btn-primary full" onClick={entrar} disabled={busy}>Ingresar</button>
          <button className="btn-link" style={{ marginTop: 12 }} onClick={() => { setStep("email"); setPin(""); setErr(""); }}>Cambiar correo</button>
        </>}
        {step === "create" && <>
          <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Primera vez · cree su PIN (de 4 a 6 números)</div>
          <input autoFocus type="password" inputMode="numeric" placeholder="Nuevo PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <input type="password" inputMode="numeric" placeholder="Repita el PIN" value={pin2} onChange={(e) => setPin2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && crear()} />
          <button className="btn btn-primary full" onClick={crear} disabled={busy}>Crear PIN e ingresar</button>
          <button className="btn-link" style={{ marginTop: 12 }} onClick={() => { setStep("email"); setPin(""); setPin2(""); setErr(""); }}>Volver</button>
        </>}
        {err && <div className="ferr">{err}</div>}
        {DEMO_MODE && <div className="demo-note">Modo de prueba · el acceso queda en este dispositivo.</div>}
      </div>
    </div>
  );
}

// ═══════════ HUB ═══════════
const TIENDAS_M = ["Tienda Pausa Pasteur", "Tienda Casa Costanera", "Oficina", "Terreno", "Otro"];
function ProfileModal({ user, onClose }) {
  const [f, setF] = useState({ nombre: "", nombreCompleto: "", cargo: "", tienda: "", fechaNac: "" });
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const mine = ps.find((p) => (p.email || "").toLowerCase() === (user.email || "").toLowerCase());
      if (mine) { setF({ nombre: mine.nombre || user.nombre || "", nombreCompleto: mine.nombreCompleto || "", cargo: mine.cargo || "", tienda: mine.tienda || "", fechaNac: "" }); setExisting(mine.fechaNac || ""); }
      else setF((x) => ({ ...x, nombre: user.nombre || "" }));
    });
  }, [user]);
  async function guardar() {
    setBusy(true);
    let mmdd = existing; if (f.fechaNac) { const m = f.fechaNac.match(/\d{4}-(\d{2})-(\d{2})/); if (m) mmdd = m[1] + "-" + m[2]; }
    try { await api.saveProfile({ email: user.email, nombre: f.nombre.trim() || (f.nombreCompleto.trim().split(" ")[0]), nombreCompleto: f.nombreCompleto.trim(), cargo: f.cargo.trim(), tienda: f.tienda, fechaNac: mmdd, by: user.email }); } catch (e) {}
    setBusy(false); onClose();
  }
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 15, color: "var(--ink)" }}>¡Bienvenido/a a Nuknu Team!</h2>
        <p className="hint" style={{ marginTop: 0 }}>Complete su perfil. Aparece en el directorio del equipo y activa su cumpleaños.</p>
        <div className="fgrid">
          <div><label className="f">Nombre (cómo lo ven)</label><input autoFocus placeholder="Ej: Fernanda" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
          <div><label className="f">Nombre completo</label><input placeholder="Ej: Fernanda Deichler" value={f.nombreCompleto} onChange={(e) => setF({ ...f, nombreCompleto: e.target.value })} /></div>
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
  const admin = user.isAdmin || isAdminEmail(user.email);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const mine = ps.find((p) => (p.email || "").toLowerCase() === (user.email || "").toLowerCase());
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

      {tab === "muro" && <MuroModule user={user} admin={admin} />}
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
  useEffect(() => { try { const s = localStorage.getItem(SESSION_KEY); if (s) { const u = JSON.parse(s); if (u && u.email) setUser(u); } } catch {} setReady(true); }, []);
  function login(u) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {} setUser(u); }
  function logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} setUser(null); }
  if (!ready) return null;
  return user ? <Hub user={user} onLogout={logout} /> : <LoginGate onLogin={login} />;
}
