"use client";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, REACTIONS, SALES_STORES, BIRTHDAYS, initials, avatarColor, catOf } from "@/lib/seed";
import * as api from "@/lib/api";
import { notifyTeam } from "@/lib/push";

// ── helpers ──────────────────────────────────────────────────
function relTime(it) {
  const min = it.ts ? (Date.now() - it.ts) / 60000 : it.min;
  if (min == null) return ""; if (min < 1) return "recién"; if (min < 60) return `hace ${Math.round(min)} min`;
  const h = Math.floor(min / 60); if (h < 24) return `hace ${h} h`; return `hace ${Math.floor(h / 24)} d`;
}
function toB64(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); }); }
const clp = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CL");
function currentPeriod() { const d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
function periodLabel(p) {
  const M = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const m = String(p || "").match(/(\d{4})-(\d{2})/); if (!m) return p || "";
  return (M[parseInt(m[2], 10) - 1] || "") + " " + m[1];
}
function sortNews(list) {
  return [...list].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return (b.ts || 0) - (a.ts || 0);
  });
}
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
function mentionsIn(text, names) {
  const found = new Set(), re = /@([A-Za-zÀ-ÿ0-9_]+)/g; let m;
  while ((m = re.exec(String(text || "")))) {
    const w = m[1].toLowerCase(); const hit = (names || []).find((n) => n.toLowerCase() === w);
    if (hit) found.add(hit);
  }
  return [...found];
}

// ── texto con menciones resaltadas ───────────────────────────
function MentionText({ text }) {
  const parts = String(text || "").split(/(@[A-Za-zÀ-ÿ0-9_]+)/g);
  return <>{parts.map((p, i) => (p[0] === "@" ? <span className="mention" key={i}>{p}</span> : <span key={i}>{p}</span>))}</>;
}

// ── campo con autocompletar de menciones @ ───────────────────
function MentionField({ value, onChange, names, placeholder, kind }) {
  const ref = useRef(null);
  const [sug, setSug] = useState(null);
  function onInput(e) {
    const v = e.target.value; onChange(v);
    const pos = e.target.selectionStart != null ? e.target.selectionStart : v.length;
    const m = v.slice(0, pos).match(/@([A-Za-zÀ-ÿ0-9_]*)$/);
    if (m && names && names.length) {
      const q = m[1].toLowerCase();
      const items = names.filter((n) => n.toLowerCase().startsWith(q)).slice(0, 6);
      setSug(items.length ? { items, start: pos - m[1].length, pos } : null);
    } else setSug(null);
  }
  function pick(n) {
    const el = ref.current, v = value;
    const pos = el && el.selectionStart != null ? el.selectionStart : v.length;
    const before = v.slice(0, sug.start), after = v.slice(pos);
    const nv = before + n + " " + after; onChange(nv); setSug(null);
    setTimeout(() => { if (el) { el.focus(); const cp = (before + n + " ").length; try { el.setSelectionRange(cp, cp); } catch (e) {} } }, 0);
  }
  const common = { ref, value, placeholder, onChange: onInput, onBlur: () => setTimeout(() => setSug(null), 150) };
  return (
    <div className="mfield">
      {kind === "textarea" ? <textarea className="pub-text" {...common} /> : <input {...common} />}
      {sug && <div className="m-sug">{sug.items.map((n) => <button key={n} onMouseDown={(e) => { e.preventDefault(); pick(n); }}>@{n}</button>)}</div>}
    </div>
  );
}

// ── media ────────────────────────────────────────────────────
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

// ── barra de reacciones ──────────────────────────────────────
function ReactionBar({ it, user, onReact }) {
  const [pick, setPick] = useState(false);
  const reacts = it.reacts || {};
  const low = user.nombre.toLowerCase();
  const mine = Object.keys(reacts).find((k) => (reacts[k] || []).some((x) => String(x).toLowerCase() === low));
  const entries = Object.entries(reacts).filter(([, arr]) => arr && arr.length);
  return (
    <div className="react-bar">
      {entries.map(([e, arr]) => (
        <button key={e} className={"react-pill" + (e === mine ? " on" : "")} onClick={() => onReact(it.id, e)} title={arr.join(", ")}>
          <span className="re">{e}</span> {arr.length}
        </button>
      ))}
      <div className="react-add-wrap">
        <button className="react-add" onClick={() => setPick((p) => !p)}>{mine ? "Cambiar" : "＋ Reaccionar"}</button>
        {pick && <>
          <div className="menu-ov" onClick={() => setPick(false)} />
          <div className="react-menu">{REACTIONS.map((r) => (
            <button key={r.e} className={"rm" + (r.e === mine ? " on" : "")} title={r.label} onClick={() => { onReact(it.id, r.e); setPick(false); }}>{r.e}</button>
          ))}</div>
        </>}
      </div>
    </div>
  );
}

// ── encuesta ─────────────────────────────────────────────────
function PollView({ it, user, onVote }) {
  const ex = it.extra || {}, opciones = ex.opciones || [], votos = ex.votos || {};
  const low = user.nombre.toLowerCase();
  const myVote = Object.keys(votos).find((k) => (votos[k] || []).some((x) => String(x).toLowerCase() === low));
  const voted = myVote != null;
  const total = Object.values(votos).reduce((a, v) => a + (v ? v.length : 0), 0);
  return (
    <div className="poll">
      {opciones.map((op, i) => {
        const arr = votos[String(i)] || [], c = arr.length, pct = total ? Math.round((c / total) * 100) : 0;
        const isMine = String(i) === myVote;
        return (
          <button key={i} className={"poll-opt" + (isMine ? " on" : "")} onClick={() => onVote(it.id, String(i))} title={arr.join(", ")}>
            <span className="poll-fill" style={{ width: (voted ? pct : 0) + "%" }} />
            <span className="poll-lbl">{isMine ? "◉" : "○"} {op}</span>
            {voted && <span className="poll-pct">{pct}%</span>}
          </button>
        );
      })}
      <div className="poll-total">{total} voto{total !== 1 ? "s" : ""}{voted ? "" : " · toque una opción para votar"}</div>
    </div>
  );
}

// ── confirmación de lectura (novedades fijadas) ──────────────
function ReadReceipt({ it, user, teamCount, onRead }) {
  const read = it.readBy || [];
  const low = user.nombre.toLowerCase();
  const iRead = read.some((x) => String(x).toLowerCase() === low);
  const [open, setOpen] = useState(false);
  const M = Math.max(teamCount || 0, read.length);
  return (
    <div className="read-bar">
      {iRead ? <span className="read-ok">✓ Confirmaste la lectura</span>
        : <button className="btn btn-sm btn-primary" onClick={() => onRead(it.id)}>Confirmar lectura</button>}
      <button className="read-count" onClick={() => setOpen((o) => !o)}>👁 Visto por {read.length}{M ? ` de ${M}` : ""}</button>
      {open && read.length > 0 && <div className="read-list">{read.join(", ")}</div>}
    </div>
  );
}

// ── tarjeta de novedad ───────────────────────────────────────
function PostCard({ it, user, admin, names, teamCount, comments, onReact, onVote, onComment, onPin, onRead, onDelete }) {
  const c = catOf(it.cat);
  const [open, setOpen] = useState(false);
  const [cmt, setCmt] = useState("");
  const [menu, setMenu] = useState(false);
  const isReco = it.tipo === "reconocimiento";
  const isPoll = it.tipo === "encuesta";
  const mine = comments.filter((x) => x.newsId === it.id).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  async function send() { const t = cmt.trim(); if (!t) return; setCmt(""); await onComment(it.id, t); setOpen(true); }
  return (
    <div className={"news" + (it.pinned ? " pinned" : "") + (isReco ? " reco" : "")}>
      {it.pinned && <div className="pin-badge">📌 Fijada</div>}
      <div className="news-top">
        <div className="pav" style={{ background: avatarColor(it.autor) }}>{initials(it.autor)}</div>
        <div className="news-who"><div className="news-name">{it.autor}</div><div className="news-time">{relTime(it)}</div></div>
        {!isReco && !isPoll && <span className="cat-tag" style={{ background: c.soft, color: c.color }}>{c.label}</span>}
        {isPoll && <span className="cat-tag" style={{ background: "rgba(94,107,122,.14)", color: "var(--slate)" }}>Encuesta</span>}
        {admin && <div className="post-menu-wrap">
          <button className="post-menu-btn" onClick={() => setMenu((m) => !m)} aria-label="opciones">⋯</button>
          {menu && <>
            <div className="menu-ov" onClick={() => setMenu(false)} />
            <div className="post-menu">
              <button onClick={() => { onPin(it.id, !it.pinned); setMenu(false); }}>{it.pinned ? "Dejar de fijar" : "📌 Fijar arriba"}</button>
              <button className="danger" onClick={() => { onDelete(it.id); setMenu(false); }}>Borrar</button>
            </div>
          </>}
        </div>}
      </div>
      {isReco && <div className="reco-head"><span className="reco-emoji">👏</span> Reconocimiento para <b>{(it.extra && it.extra.para) || ""}</b></div>}
      {it.text && <div className="news-text"><MentionText text={it.text} /></div>}
      {isPoll && <PollView it={it} user={user} onVote={onVote} />}
      <Media it={it} />
      {it.pinned && <ReadReceipt it={it} user={user} teamCount={teamCount} onRead={onRead} />}
      <div className="news-foot">
        <ReactionBar it={it} user={user} onReact={onReact} />
        <button className="like" onClick={() => setOpen((o) => !o)}>💬 {mine.length}</button>
      </div>
      {open && <div className="comments">
        {mine.map((x) => (
          <div className="comment" key={x.id}>
            <div className="pav sm" style={{ background: avatarColor(x.autor) }}>{initials(x.autor)}</div>
            <div><span className="c-autor">{x.autor}</span> <span className="c-text"><MentionText text={x.texto} /></span></div>
          </div>
        ))}
        <div className="c-add">
          <MentionField value={cmt} onChange={setCmt} names={names} placeholder="Escriba un comentario… use @ para mencionar" />
          <button className="btn btn-primary btn-sm" onClick={send} disabled={!cmt.trim()}>Enviar</button>
        </div>
      </div>}
    </div>
  );
}

// ── panel de metas de venta por tienda (avance automático desde Shopify) ──
function MetasCard({ user, admin }) {
  const [metas, setMetas] = useState(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState("idle"); // idle | loading | ok | error
  const [syncMsg, setSyncMsg] = useState("");
  const period = currentPeriod();
  function load() { api.listMetas().then((all) => setMetas((all || []).filter((m) => m.periodo === period))); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  function startEdit() {
    const d = {};
    SALES_STORES.forEach((t) => { const m = (metas || []).find((x) => x.tienda === t) || {}; d[t] = { meta: m.meta || "" }; });
    setDraft(d); setEdit(true);
  }
  async function save() {
    setBusy(true);
    for (const t of SALES_STORES) {
      const d = draft[t]; if (!d || d.meta === "" || d.meta == null) continue;
      await api.saveMeta({ tienda: t, periodo: period, meta: Number(d.meta) || 0, by: user.email });
    }
    setBusy(false); setEdit(false); load();
  }
  async function actualizar() {
    setSync("loading"); setSyncMsg("");
    try {
      const r = await api.syncSales(user.email);
      if (r && r.ok) { setSync("ok"); if (r.demo) setSyncMsg("(demo) En producción, trae la venta real de Shopify."); load(); setTimeout(() => setSync("idle"), 3000); }
      else { setSync("error"); setSyncMsg(r && r.error ? r.error : "No se pudo actualizar."); }
    } catch (e) { setSync("error"); setSyncMsg("No se pudo conectar con Shopify."); }
  }
  if (metas === null) return null;
  const hay = metas.some((m) => m.meta);
  if (!hay && !admin) return null;
  const anyRow = metas.length > 0;
  return (
    <div className="card metas">
      <div className="metas-hdr">
        <h2 style={{ margin: 0 }}>🎯 Metas de venta · {periodLabel(period)}</h2>
        {admin && !edit && <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-sm" onClick={actualizar} disabled={sync === "loading"}>{sync === "loading" ? "Actualizando…" : "↻ Actualizar"}</button>
          <button className="btn btn-sm" onClick={startEdit}>{hay ? "Metas" : "Definir metas"}</button>
        </div>}
      </div>

      {!edit && SALES_STORES.map((t) => {
        const m = metas.find((x) => x.tienda === t);
        if (!m || !m.meta) return null;
        const pct = Math.min(100, Math.round((m.avance / m.meta) * 100));
        return (
          <div className="meta-row" key={t}>
            <div className="meta-top"><span className="meta-store">{t}</span><span className="meta-num">{clp(m.avance)} <span className="meta-goal">/ {clp(m.meta)}</span></span></div>
            <div className="meta-bar"><span className={"meta-fill" + (pct >= 100 ? " done" : "")} style={{ width: pct + "%" }} /></div>
            <div className="meta-pct">{pct}%{pct >= 100 ? " · ¡meta cumplida! 🎉" : ""}</div>
          </div>
        );
      })}
      {!edit && !hay && admin && <p className="hint" style={{ marginTop: 0 }}>Aún no hay metas de este mes. Toca “Definir metas” para cargar el objetivo de cada canal; la venta se actualiza sola desde Shopify.</p>}
      {!edit && hay && <div className="meta-auto">La venta se actualiza automáticamente desde Shopify.</div>}
      {sync === "ok" && <div className="toast" style={{ marginTop: 10, marginBottom: 0 }}>Ventas actualizadas ✓ {syncMsg}</div>}
      {sync === "error" && <div className="ferr" style={{ textAlign: "left" }}>{syncMsg}</div>}

      {edit && <div className="metas-edit">
        <p className="hint" style={{ marginTop: 0 }}>Cargue solo la <b>meta</b> del mes por canal. El avance lo trae Shopify solo.</p>
        {SALES_STORES.map((t) => (
          <div className="meta-edit-row" key={t}>
            <label className="f" style={{ marginBottom: 0 }}>{t}</label>
            <input type="number" min="0" placeholder="Meta del mes (CLP)" value={draft[t]?.meta ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [t]: { ...p[t], meta: e.target.value } }))} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button className="btn btn-sm" onClick={() => setEdit(false)}>Cancelar</button>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar metas"}</button>
        </div>
      </div>}
    </div>
  );
}

// ── compositor (novedad / encuesta / reconocimiento) ─────────
function Composer({ user, names, onPosted }) {
  const [mode, setMode] = useState("novedad");
  const [text, setText] = useState(""), [cat, setCat] = useState("general"), [file, setFile] = useState(null);
  const [q, setQ] = useState(""), [opts, setOpts] = useState(["", ""]);
  const [para, setPara] = useState(""), [recoText, setRecoText] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");

  function pickFile(e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 12 * 1024 * 1024) { setErr("El archivo supera 12 MB. Use uno más liviano o un video corto."); setFile(null); e.target.value = ""; return; }
    setErr(""); setFile(f);
  }
  function notifyMentions(t, base) {
    const men = mentionsIn(t, names);
    if (men.length) notifyTeam({ title: `${user.nombre} te mencionó`, body: (base || t).slice(0, 90), url: "/", excludeName: user.nombre, onlyNames: men });
  }
  async function publishNovedad() {
    const t = text.trim(); if (!t && !file) return;
    setErr(""); setBusy(true);
    try {
      let fileData = null, fileName = null, fileMime = null;
      if (file) { fileData = await toB64(file); fileName = file.name; fileMime = file.type; }
      const item = await api.postNews({ autor: user.nombre, cat, text: t, tipo: "post", fileData, fileName, fileMime });
      onPosted(item); setText(""); setCat("general"); setFile(null);
      notifyTeam({ title: `${user.nombre} publicó una novedad`, body: t.slice(0, 90) || "(adjunto)", url: "/", excludeName: user.nombre });
      notifyMentions(t);
    } catch (e) { setErr("No se pudo publicar. Intente con un archivo más liviano."); }
    setBusy(false);
  }
  async function publishEncuesta() {
    const question = q.trim(); const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (!question) { setErr("Escriba la pregunta."); return; }
    if (clean.length < 2) { setErr("Agregue al menos dos opciones."); return; }
    setErr(""); setBusy(true);
    try {
      const item = await api.postNews({ autor: user.nombre, cat: "general", text: question, tipo: "encuesta", extra: { opciones: clean, votos: {} } });
      onPosted(item); setQ(""); setOpts(["", ""]);
      notifyTeam({ title: `${user.nombre} abrió una encuesta`, body: question.slice(0, 90), url: "/", excludeName: user.nombre });
    } catch (e) { setErr("No se pudo publicar la encuesta."); }
    setBusy(false);
  }
  async function publishReco() {
    const to = para.trim(); const t = recoText.trim();
    if (!to) { setErr("Elija a quién reconocer."); return; }
    if (!t) { setErr("Escriba el reconocimiento."); return; }
    setErr(""); setBusy(true);
    try {
      const item = await api.postNews({ autor: user.nombre, cat: "general", text: t, tipo: "reconocimiento", extra: { para: to } });
      onPosted(item); setPara(""); setRecoText("");
      notifyTeam({ title: `👏 ${user.nombre} reconoció a ${to}`, body: t.slice(0, 90), url: "/", excludeName: user.nombre });
    } catch (e) { setErr("No se pudo publicar el reconocimiento."); }
    setBusy(false);
  }

  return (
    <div className="card composer">
      <div className="comp-modes">
        <button className={"comp-mode" + (mode === "novedad" ? " on" : "")} onClick={() => { setMode("novedad"); setErr(""); }}>Novedad</button>
        <button className={"comp-mode" + (mode === "encuesta" ? " on" : "")} onClick={() => { setMode("encuesta"); setErr(""); }}>Encuesta</button>
        <button className={"comp-mode" + (mode === "reconocimiento" ? " on" : "")} onClick={() => { setMode("reconocimiento"); setErr(""); }}>Reconocimiento</button>
      </div>

      {mode === "novedad" && <>
        <MentionField value={text} onChange={setText} names={names} kind="textarea" placeholder="Comparta una novedad con el equipo… use @ para mencionar" />
        {file && <div className="attach-chip">📎 {file.name} <button onClick={() => setFile(null)}>✕</button></div>}
        {err && <div className="ferr" style={{ textAlign: "left", marginTop: 0 }}>{err}</div>}
        <div className="pub-foot">
          <div className="cat-row">{CATEGORIES.map((cc) => <button key={cc.key} className={"cat-chip" + (cat === cc.key ? " on" : "")} onClick={() => setCat(cc.key)}>{cc.label}</button>)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <label className="btn btn-sm" style={{ cursor: "pointer" }}>📎<input type="file" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={pickFile} style={{ display: "none" }} /></label>
            <button className="btn btn-primary btn-sm" onClick={publishNovedad} disabled={busy || (!text.trim() && !file)}>{busy ? "Publicando…" : "Publicar"}</button>
          </div>
        </div>
      </>}

      {mode === "encuesta" && <>
        <input placeholder="Pregunta de la encuesta" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        {opts.map((o, i) => (
          <div className="poll-opt-edit" key={i}>
            <input placeholder={`Opción ${i + 1}`} value={o} onChange={(e) => setOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
            {opts.length > 2 && <button className="del-x" onClick={() => setOpts((p) => p.filter((_, j) => j !== i))} aria-label="quitar">✕</button>}
          </div>
        ))}
        {opts.length < 5 && <button className="btn-link" style={{ marginTop: 2 }} onClick={() => setOpts((p) => [...p, ""])}>+ Agregar opción</button>}
        {err && <div className="ferr" style={{ textAlign: "left" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={publishEncuesta} disabled={busy}>{busy ? "Publicando…" : "Publicar encuesta"}</button>
        </div>
      </>}

      {mode === "reconocimiento" && <>
        <label className="f">¿A quién reconoce?</label>
        {names && names.length
          ? <select value={para} onChange={(e) => setPara(e.target.value)} style={{ marginBottom: 10 }}><option value="">Seleccionar…</option>{names.map((n) => <option key={n}>{n}</option>)}</select>
          : <input placeholder="Nombre de la persona" value={para} onChange={(e) => setPara(e.target.value)} style={{ marginBottom: 10 }} />}
        <textarea className="pub-text" placeholder="¿Qué hizo? Cuéntele al equipo por qué merece un aplauso 👏" value={recoText} onChange={(e) => setRecoText(e.target.value)} />
        {err && <div className="ferr" style={{ textAlign: "left" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={publishReco} disabled={busy}>{busy ? "Publicando…" : "Publicar reconocimiento"}</button>
        </div>
      </>}
    </div>
  );
}

// ── Muro ─────────────────────────────────────────────────────
export default function Muro({ user, admin }) {
  const [news, setNews] = useState([]), [comments, setComments] = useState([]);
  const [names, setNames] = useState([]), [teamCount, setTeamCount] = useState(0);
  const [bday, setBday] = useState(null);

  useEffect(() => { api.listNews().then((n) => setNews(sortNews(n))); api.listComments().then(setComments); }, []);
  useEffect(() => {
    api.listProfiles().then((ps) => {
      const nm = ps.map((p) => (p.nombre || (p.nombreCompleto || "").split(" ")[0])).filter(Boolean);
      setNames(Array.from(new Set(nm)));
      setTeamCount(ps.length);
      const withB = ps.filter((p) => p.fechaNac);
      setBday(nextBirthday(withB.length ? withB : BIRTHDAYS));
    }).catch(() => setBday(nextBirthday(BIRTHDAYS)));
  }, []);

  function onPosted(item) { setNews((n) => sortNews([item, ...n])); }
  async function onReact(id, emoji) {
    const { reacts } = await api.reactNews(id, user.nombre, emoji);
    const total = Object.values(reacts).reduce((a, v) => a + v.length, 0);
    setNews((n) => n.map((it) => (it.id === id ? { ...it, reacts, likes: total } : it)));
  }
  async function onVote(id, opt) {
    const { extra } = await api.votePoll(id, user.nombre, opt);
    setNews((n) => n.map((it) => (it.id === id ? { ...it, extra } : it)));
  }
  async function onComment(newsId, texto) {
    const item = await api.addComment({ newsId, autor: user.nombre, texto });
    setComments((cs) => [...cs, item]);
    const men = mentionsIn(texto, names);
    if (men.length) notifyTeam({ title: `${user.nombre} te mencionó en un comentario`, body: texto.slice(0, 90), url: "/", excludeName: user.nombre, onlyNames: men });
  }
  async function onPin(id, pinned) {
    setNews((n) => sortNews(n.map((it) => (it.id === id ? { ...it, pinned } : it))));
    await api.pinNews(id, pinned, user.email);
  }
  async function onRead(id) {
    const { readBy } = await api.markRead(id, user.nombre);
    setNews((n) => n.map((it) => (it.id === id ? { ...it, readBy } : it)));
  }
  async function onDelete(id) {
    setNews((n) => n.filter((it) => it.id !== id));
    await api.deleteNews(id, user.email);
  }

  return (
    <>
      {bday && bday.diff <= 7 && <div className="bday"><span className="cake">🎂</span><div><b>{bday.diff === 0 ? `Hoy cumple ${bday.nombre}` : `Pronto cumple ${bday.nombre}`}</b><div className="bday-sub">{bday.diff === 0 ? "Déjenle un saludo" : `En ${bday.diff} día${bday.diff > 1 ? "s" : ""}`}</div></div></div>}
      <MetasCard user={user} admin={admin} />
      <Composer user={user} names={names} onPosted={onPosted} />
      {news.map((it) => (
        <PostCard key={it.id} it={it} user={user} admin={admin} names={names} teamCount={teamCount}
          comments={comments} onReact={onReact} onVote={onVote} onComment={onComment} onPin={onPin} onRead={onRead} onDelete={onDelete} />
      ))}
    </>
  );
}
