"use client";
import { useEffect, useState } from "react";
import { TEAM_NAMES, initials, avatarColor } from "@/lib/seed";
import * as api from "@/lib/api";

function fmt(d) { if (!d) return ""; const s = String(d).split("T")[0]; if (!s.includes("-")) return String(d); const [y, m, dd] = s.split("-"); return `${dd}/${m}`; }
function vencidaTxt(vence, estado) {
  if (!vence || estado === "hecha") return "";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = String(vence).split("-").map(Number);
  if (!y) return "";
  const dv = new Date(y, m - 1, d);
  const diff = Math.round((dv - hoy) / 86400000);
  if (diff < 0) return "vencida";
  if (diff === 0) return "vence hoy";
  if (diff === 1) return "vence mañana";
  return "";
}

export default function TareasModule({ user, admin }) {
  const [list, setList] = useState(null);
  const [names, setNames] = useState(TEAM_NAMES);
  const [titulo, setTitulo] = useState(""), [asig, setAsig] = useState(""), [vence, setVence] = useState("");
  const [fEstado, setFEstado] = useState("pendiente"), [soloMias, setSoloMias] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() { api.listTareas().then((t) => setList(t)); }
  useEffect(() => { load(); api.listProfiles().then((ps) => { const ns = ps.map((p) => p.nombre).filter(Boolean); if (ns.length) setNames(ns); }); }, []);

  async function crear() {
    if (!titulo.trim()) return;
    setBusy(true);
    const item = await api.addTarea({ titulo: titulo.trim(), asignadoA: asig, creadoPor: user.nombre, vence });
    setList((l) => [item, ...(l || [])]);
    setTitulo(""); setAsig(""); setVence(""); setBusy(false);
  }
  async function toggle(t) {
    const nuevo = t.estado === "hecha" ? "pendiente" : "hecha";
    setList((l) => l.map((x) => x.id === t.id ? { ...x, estado: nuevo } : x));
    await api.toggleTarea(t.id, nuevo);
  }
  async function borrar(t) {
    setList((l) => l.filter((x) => x.id !== t.id));
    await api.deleteTarea(t.id);
  }

  const filtered = (list || [])
    .filter((t) => fEstado === "todas" || t.estado === fEstado)
    .filter((t) => !soloMias || (t.asignadoA || "").toLowerCase() === user.nombre.toLowerCase() || (t.creadoPor || "").toLowerCase() === user.nombre.toLowerCase())
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const pend = (list || []).filter((t) => t.estado !== "hecha").length;

  return (
    <div>
      <div className="card">
        <h2>Nueva tarea</h2>
        <input placeholder="¿Qué hay que hacer? Ej: Apertura de tienda Pausa" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ marginBottom: 12 }} onKeyDown={(e) => e.key === "Enter" && crear()} />
        <div className="fgrid">
          <div><label className="f">Asignar a</label><select value={asig} onChange={(e) => setAsig(e.target.value)}><option value="">Sin asignar</option>{names.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="f">Vence <em>(opcional)</em></label><input type="date" value={vence} onChange={(e) => setVence(e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={crear} disabled={busy || !titulo.trim()}>{busy ? "Creando…" : "Crear tarea"}</button>
        </div>
      </div>

      <div className="sec-hdr"><h2>Tareas {pend > 0 ? `· ${pend} pendientes` : ""}</h2></div>
      <div className="fbar">
        {[["pendiente", "Pendientes"], ["hecha", "Hechas"], ["todas", "Todas"]].map(([v, l]) => <button key={v} className={"chip" + (fEstado === v ? " on" : "")} onClick={() => setFEstado(v)}>{l}</button>)}
        <button className={"chip" + (soloMias ? " on" : "")} onClick={() => setSoloMias((s) => !s)}>Solo mías</button>
      </div>

      {list === null ? <div className="loading">Cargando…</div> :
        filtered.length === 0 ? <div className="empty">No hay tareas {fEstado === "pendiente" ? "pendientes" : ""}.</div> :
          filtered.map((t) => {
            const venc = vencidaTxt(t.vence, t.estado);
            const puedeBorrar = admin || (t.creadoPor || "").toLowerCase() === user.nombre.toLowerCase();
            return (
              <div className="row-item" key={t.id}>
                <button className={"check" + (t.estado === "hecha" ? " done" : "")} onClick={() => toggle(t)} aria-label="marcar">{t.estado === "hecha" ? "✓" : ""}</button>
                <div className="ri-body">
                  <div className="ri-title" style={t.estado === "hecha" ? { textDecoration: "line-through", color: "var(--muted)" } : {}}>{t.titulo}</div>
                  <div className="ri-meta">
                    {t.asignadoA ? <span className="asg"><span className="pav xs" style={{ background: avatarColor(t.asignadoA) }}>{initials(t.asignadoA)}</span> {t.asignadoA}</span> : "Sin asignar"}
                    {t.vence ? ` · ${fmt(t.vence)}` : ""}
                    {venc ? <span className={"venc" + (venc === "vencida" ? " late" : "")}> · {venc}</span> : ""}
                  </div>
                </div>
                {puedeBorrar && <button className="del-x" onClick={() => borrar(t)} aria-label="eliminar">✕</button>}
              </div>
            );
          })}
    </div>
  );
}
