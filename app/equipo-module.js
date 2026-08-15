"use client";
import { useEffect, useState } from "react";
import { initials, avatarColor } from "@/lib/seed";
import * as api from "@/lib/api";
import { enablePush, pushSupported } from "@/lib/push";

function Notificaciones({ user }) {
  const [st, setSt] = useState("idle"); // idle | ok | denied | unsupported | error
  const soportado = typeof window !== "undefined" ? pushSupported() : true;
  async function activar() {
    setSt("loading");
    const r = await enablePush(user.nombre);
    setSt(r.ok ? "ok" : (r.reason === "denied" ? "denied" : r.reason === "unsupported" ? "unsupported" : "error"));
  }
  return (
    <div className="card">
      <h2>🔔 Notificaciones</h2>
      <p className="hint" style={{ marginTop: 0 }}>Reciba un aviso en este dispositivo cuando haya una novedad importante en el equipo.</p>
      {st === "ok" ? <div className="toast">Notificaciones activadas en este dispositivo ✓</div> :
        <button className="btn btn-primary" onClick={activar} disabled={st === "loading" || !soportado}>{st === "loading" ? "Activando…" : "Activar notificaciones"}</button>}
      {st === "denied" && <p className="ferr" style={{ textAlign: "left" }}>El navegador bloqueó el permiso. Actívelo desde los ajustes del sitio y vuelva a intentar.</p>}
      {(st === "unsupported" || !soportado) && <p className="hint">En iPhone, primero agregue la app a la pantalla de inicio (desde Safari) y ábrala desde ahí; recién ahí se pueden activar las notificaciones.</p>}
      {st === "error" && <p className="ferr" style={{ textAlign: "left" }}>No se pudo activar. En iPhone, abra la app desde el ícono de la pantalla de inicio.</p>}
    </div>
  );
}

const TIENDAS = ["Tienda Pausa Pasteur", "Tienda Casa Costanera", "Oficina", "Terreno", "Otro"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function cumpleTexto(mmdd) {
  if (!mmdd) return "";
  const m = String(mmdd).match(/(\d{2})-(\d{2})/);
  if (!m) return "";
  return parseInt(m[2], 10) + " de " + (MESES[parseInt(m[1], 10) - 1] || "");
}

function MiPerfil({ user, onSaved }) {
  const [f, setF] = useState({ nombreCompleto: "", cargo: "", tienda: "", fechaNac: "" });
  const [st, setSt] = useState("idle");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const mine = ps.find((p) => (p.nombre || "").toLowerCase() === user.nombre.toLowerCase());
      if (mine) setF({ nombreCompleto: mine.nombreCompleto || "", cargo: mine.cargo || "", tienda: mine.tienda || "", fechaNac: mine.fechaNac ? "" : "" , fechaNacMMDD: mine.fechaNac || "" });
      setLoaded(true);
    });
  }, [user]);
  const upd = (k, v) => { if (st === "ok") setSt("idle"); setF((p) => ({ ...p, [k]: v })); };
  async function guardar() {
    setSt("loading");
    // fechaNac puede venir como YYYY-MM-DD (input date). Guardamos MM-DD.
    let mmdd = f.fechaNacMMDD || "";
    if (f.fechaNac) { const m = f.fechaNac.match(/\d{4}-(\d{2})-(\d{2})/); if (m) mmdd = m[1] + "-" + m[2]; }
    try {
      await api.saveProfile({ nombre: user.nombre, nombreCompleto: f.nombreCompleto.trim(), cargo: f.cargo.trim(), tienda: f.tienda, fechaNac: mmdd, email: user.email || "" });
      setSt("ok"); onSaved(); setTimeout(() => setSt("idle"), 2500);
    } catch (e) { setSt("idle"); }
  }
  return (
    <div className="card">
      <h2>Mi perfil</h2>
      {st === "ok" && <div className="toast">Perfil guardado correctamente.</div>}
      <div className="fgrid">
        <div className="full"><label className="f">Nombre completo</label><input placeholder="Ej: Fernanda Deichler" value={f.nombreCompleto} onChange={(e) => upd("nombreCompleto", e.target.value)} /></div>
        <div><label className="f">Cargo</label><input placeholder="Ej: Vendedora" value={f.cargo} onChange={(e) => upd("cargo", e.target.value)} /></div>
        <div><label className="f">Tienda / área</label><select value={f.tienda} onChange={(e) => upd("tienda", e.target.value)}><option value="">Seleccionar…</option>{TIENDAS.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="full"><label className="f">Fecha de nacimiento {f.fechaNacMMDD && !f.fechaNac ? `(actual: ${cumpleTexto(f.fechaNacMMDD)})` : ""}</label><input type="date" value={f.fechaNac} onChange={(e) => upd("fechaNac", e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button className="btn btn-primary" onClick={guardar} disabled={st === "loading" || !loaded}>{st === "loading" ? "Guardando…" : "Guardar perfil"}</button>
      </div>
      <p className="hint">Con su fecha de nacimiento, el equipo verá su cumpleaños en el Muro.</p>
    </div>
  );
}

function Directorio({ refreshKey }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.listProfiles().then(setList); }, [refreshKey]);
  return (
    <>
      <div className="sec-hdr"><h2>Directorio del equipo</h2></div>
      {list === null ? <div className="loading">Cargando…</div> :
        list.length === 0 ? <div className="empty">Aún no hay perfiles. Complete el suyo arriba.</div> :
          list.map((p, i) => (
            <div className="row-item" key={i}>
              <div className="pav" style={{ background: avatarColor(p.nombre || p.nombreCompleto || "?") }}>{initials(p.nombreCompleto || p.nombre)}</div>
              <div className="ri-body">
                <div className="ri-title">{p.nombreCompleto || p.nombre}</div>
                <div className="ri-meta">{[p.cargo, p.tienda].filter(Boolean).join(" · ") || "Sin cargo"}</div>
              </div>
              {p.fechaNac && <div className="ri-right"><span className="badge b-amber">🎂 {cumpleTexto(p.fechaNac)}</span></div>}
            </div>
          ))}
    </>
  );
}

export default function EquipoModule({ user }) {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <MiPerfil user={user} onSaved={() => setRefresh((r) => r + 1)} />
      <Notificaciones user={user} />
      <Directorio refreshKey={refresh} />
    </div>
  );
}
