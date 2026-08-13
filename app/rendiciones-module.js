"use client";
import { useEffect, useState, useCallback } from "react";
import * as api from "@/lib/api";

const CATS = ["Marketing", "Insumos / Materiales", "Transporte", "Alimentación", "Arriendo / Servicios", "Otros"];
const MEDIOS = ["Tarjeta crédito", "Tarjeta débito", "Transferencia", "Efectivo"];
const CAT_ICON = { "Marketing": "◆", "Insumos / Materiales": "▣", "Transporte": "▲", "Alimentación": "●", "Arriendo / Servicios": "■", "Otros": "◇" };
const clp = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CL");
const todayS = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { if (!d) return ""; const s = String(d).split("T")[0]; if (!s.includes("-")) return String(d); const [y, m, dd] = s.split("-"); return `${dd}/${m}/${y}`; };
const toB64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
const BADGE = { Aprobado: "b-green", Pendiente: "b-amber", Rechazado: "b-red" };

function Nueva({ user, onDone }) {
  const init = { fecha: todayS(), monto: "", cat: "", mp: "", num: "", desc: "" };
  const [f, setF] = useState(init), [file, setFile] = useState(null), [st, setSt] = useState("idle"), [err, setErr] = useState("");
  const upd = (k, v) => { if (st === "success") setSt("idle"); setF((p) => ({ ...p, [k]: v })); };
  async function submit() {
    setErr("");
    if (!f.fecha || !f.monto || !f.cat || !f.mp || !f.desc.trim()) { setErr("Completá los campos obligatorios."); return; }
    setSt("loading");
    try {
      let fd = null, fn = null, fm = null;
      if (file) { fd = await toB64(file); fn = file.name; fm = file.type; }
      const r = await api.submitRend({ autor: user.nombre, fechaGasto: f.fecha, monto: Number(f.monto), categoria: f.cat, medioPago: f.mp, numDoc: f.num, descripcion: f.desc.trim(), fileData: fd, fileName: fn, fileMime: fm });
      if (r.ok) { setF(init); setFile(null); setSt("success"); onDone(); } else { setErr(r.error || "Error al enviar."); setSt("idle"); }
    } catch (e) { setErr("Error: " + e.message); setSt("idle"); }
  }
  return (
    <div className="card">
      {st === "success" && <div className="toast">✓ Rendición enviada. Queda pendiente de aprobación.</div>}
      <div className="fgrid">
        <div><label className="f">Fecha del gasto</label><input type="date" value={f.fecha} onChange={(e) => upd("fecha", e.target.value)} /></div>
        <div><label className="f">Monto (CLP)</label><input type="number" min="0" placeholder="0" value={f.monto} onChange={(e) => upd("monto", e.target.value)} /></div>
        <div><label className="f">Categoría</label><select value={f.cat} onChange={(e) => upd("cat", e.target.value)}><option value="">Seleccionar…</option>{CATS.map((o) => <option key={o}>{o}</option>)}</select></div>
        <div><label className="f">Medio de pago</label><select value={f.mp} onChange={(e) => upd("mp", e.target.value)}><option value="">Seleccionar…</option>{MEDIOS.map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="full"><label className="f">N° Boleta / Factura <em>(opcional)</em></label><input placeholder="Ej: 004538" value={f.num} onChange={(e) => upd("num", e.target.value)} /></div>
        <div className="full"><label className="f">Descripción</label><textarea placeholder="¿En qué se gastó? Proveedor, detalle…" value={f.desc} onChange={(e) => upd("desc", e.target.value)} /></div>
        <div className="full"><label className="f">Comprobante <em>(recomendado)</em></label>
          <label className="dz"><input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} style={{ display: "none" }} />
            <div className="dz-text">Adjuntar boleta o comprobante</div>
            <div className="dz-sub">{file ? <span style={{ color: "var(--clay)" }}>✓ {file.name}</span> : "JPG, PNG o PDF"}</div>
          </label>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 16 }}>
        {err && <span className="ferr" style={{ margin: 0 }}>{err}</span>}
        <button className="btn btn-primary" onClick={submit} disabled={st === "loading"}>{st === "loading" ? "Enviando…" : "Enviar rendición"}</button>
      </div>
    </div>
  );
}

function Lista({ user, admin, refreshKey }) {
  const [exps, setExps] = useState(null), [fil, setFil] = useState(admin ? "Pendiente" : "todos");
  const load = useCallback(async () => { setExps(null); setExps(await api.listRendiciones(user.nombre, admin)); }, [user, admin]);
  useEffect(() => { load(); }, [load, refreshKey]);
  async function update(id, estado, cmt) { setExps((p) => p.map((e) => e.id === id ? { ...e, estado, comentario: cmt } : e)); try { await api.updateRend(id, estado, cmt); } catch (e) { load(); } }
  const tabs = [["todos", "Todas"], ["Pendiente", "Pend."], ["Aprobado", "Aprob."], ["Rechazado", "Rech."]];
  const list = (exps || []).filter((e) => fil === "todos" || e.estado === fil);
  const pend = (exps || []).filter((e) => e.estado === "Pendiente").length;
  const total = (exps || []).filter((e) => e.estado === "Aprobado").reduce((a, e) => a + Number(e.monto || 0), 0);
  return (
    <div>
      {admin && <div className="stats">
        <div className="stat"><div className="stat-lbl">Total</div><div className="stat-val">{(exps || []).length}</div></div>
        <div className="stat"><div className="stat-lbl">Pendientes</div><div className="stat-val">{pend}</div></div>
        <div className="stat"><div className="stat-lbl">Aprob.</div><div className="stat-val">{(exps || []).filter((e) => e.estado === "Aprobado").length}</div></div>
        <div className="stat"><div className="stat-lbl">Monto aprob.</div><div className="stat-val" style={{ fontSize: 15 }}>{clp(total)}</div></div>
      </div>}
      <div className="fbar">{tabs.map(([v, l]) => <button key={v} className={"chip" + (fil === v ? " on" : "")} onClick={() => setFil(v)}>{l}</button>)}</div>
      {exps === null ? <div className="loading">Cargando…</div> :
        list.length === 0 ? <div className="empty">No hay rendiciones con ese filtro.</div> :
          list.map((e) => (
            <div className="row-item" key={e.id}>
              <div className="ri-icon">{CAT_ICON[e.categoria] || "◇"}</div>
              <div className="ri-body">
                <div className="ri-title">{e.desc || "Sin descripción"}</div>
                <div className="ri-meta">{admin && <b style={{ color: "var(--ink)" }}>{e.autor} · </b>}{fmtDate(e.fecha)} · {e.categoria}{e.medioPago ? ` · ${e.medioPago}` : ""}</div>
                {e.fileUrl && <a className="ri-link" href={e.fileUrl} target="_blank" rel="noopener noreferrer">Ver comprobante ↗</a>}
                {e.comentario && <div className="ri-sub">“{e.comentario}”</div>}
              </div>
              <div className="ri-right">
                <div className="ri-amount">{clp(e.monto)}</div>
                {admin && e.estado === "Pendiente" ?
                  <div className="actions">
                    <button className="btn btn-sm" onClick={() => update(e.id, "Aprobado", "")}>Aprobar</button>
                    <button className="btn btn-sm" onClick={() => update(e.id, "Rechazado", "")}>Rechazar</button>
                  </div> :
                  <span className={"badge " + (BADGE[e.estado] || "b-amber")}>{e.estado}</span>}
              </div>
            </div>
          ))}
    </div>
  );
}

export default function RendicionesModule({ user, admin }) {
  const [view, setView] = useState("nueva");
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <div className="fbar" style={{ marginBottom: 16 }}>
        <button className={"chip" + (view === "nueva" ? " on" : "")} onClick={() => setView("nueva")}>+ Nueva</button>
        <button className={"chip" + (view === "mias" ? " on" : "")} onClick={() => setView("mias")}>Mis gastos</button>
        {admin && <button className={"chip" + (view === "admin" ? " on" : "")} onClick={() => setView("admin")}>Revisar</button>}
      </div>
      {view === "nueva" && <Nueva user={user} onDone={() => setRefresh((r) => r + 1)} />}
      {view === "mias" && <Lista user={user} admin={false} refreshKey={refresh} />}
      {view === "admin" && admin && <Lista user={user} admin={true} refreshKey={refresh} />}
    </div>
  );
}
