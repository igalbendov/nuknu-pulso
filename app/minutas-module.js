"use client";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";

const ACTION_CUES = ["hay que","tenemos que","tengo que","tienes que","tiene que","tienen que","debemos","debería","deberíamos","necesito","necesitamos","necesita","vamos a","voy a","va a","van a","queda pendiente","quedó pendiente","pendiente","falta","hace falta","coordinar","organizar","enviar","mandar","subir","confirmar","comprar","llamar","contactar","revisar","preparar","agendar","planificar","cerrar","cuadrar"];
const CHUNK_MS = 25000; // transcribe cada ~25s (casi en vivo y sin archivos pesados)

function fmt(ms){ const s=Math.floor(ms/1000),m=Math.floor(s/60); return ("0"+m).slice(-2)+":"+("0"+(s%60)).slice(-2); }
function extractActions(text){
  const sents = text.replace(/\s+/g," ").split(/(?<=[.;])\s+/);
  const out=[], seen={};
  sents.forEach((raw)=>{ const s=raw.trim(); if(s.length<12) return; const low=" "+s.toLowerCase()+" ";
    if(!ACTION_CUES.some((c)=>low.indexOf(" "+c)!==-1)) return; const k=s.toLowerCase().slice(0,50); if(seen[k]) return; seen[k]=1;
    let clean=s.charAt(0).toUpperCase()+s.slice(1); if(clean.length>160) clean=clean.slice(0,160)+"…"; out.push(clean); });
  return out.slice(0,15);
}
function pickMime(){
  if (typeof MediaRecorder === "undefined") return "";
  const opts=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/aac","audio/ogg"];
  for(const o of opts){ try{ if(MediaRecorder.isTypeSupported(o)) return o; }catch(e){} }
  return "";
}

function Recorder({ user, onSaved }) {
  const [titulo,setTitulo]=useState("");
  const [text,setText]=useState("");           // transcripción acumulada
  const [rec,setRec]=useState(false);
  const [pending,setPending]=useState(0);       // chunks transcribiéndose
  const [err,setErr]=useState("");
  const [preview,setPreview]=useState("");
  const [saveSt,setSaveSt]=useState("idle");
  const [supported,setSupported]=useState(true);
  const [now,setNow]=useState(0);

  const streamRef=useRef(null), mrRef=useRef(null), timerRef=useRef(null);
  const onRef=useRef(false);                     // ¿seguimos grabando?
  const idxRef=useRef(0), nextFlush=useRef(0), resultsRef=useRef({});
  const startRef=useRef(0), elapsedRef=useRef(0);

  useEffect(()=>{
    if (typeof window!=="undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder==="undefined")) setSupported(false);
    const iv=setInterval(()=>setNow(Date.now()),500);
    return ()=>{ clearInterval(iv); cleanup(); };
  },[]);

  function cleanup(){
    onRef.current=false;
    try{ if(mrRef.current && mrRef.current.state!=="inactive") mrRef.current.stop(); }catch(e){}
    if(streamRef.current){ try{ streamRef.current.getTracks().forEach(t=>t.stop()); }catch(e){} streamRef.current=null; }
    clearTimeout(timerRef.current);
  }

  function flush(){
    while(resultsRef.current[nextFlush.current]!==undefined){
      const t=resultsRef.current[nextFlush.current];
      if(t) setText(prev=> (prev? prev+" ":"") + t.trim());
      delete resultsRef.current[nextFlush.current];
      nextFlush.current++;
    }
  }

  async function transcribe(blob, idx, mime){
    setPending(p=>p+1);
    try{
      const fd=new FormData();
      const ext = mime.includes("mp4")||mime.includes("aac") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      fd.append("file", blob, "audio."+ext);
      const r=await fetch("/api/transcribe",{method:"POST",body:fd});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){ setErr(data.error||"Error de transcripción."); resultsRef.current[idx]=""; }
      else { resultsRef.current[idx]=data.text||""; setErr(""); }
    }catch(e){ setErr("No se pudo transcribir el audio."); resultsRef.current[idx]=""; }
    flush();
    setPending(p=>Math.max(0,p-1));
  }

  function startChunk(mime){
    if(!onRef.current || !streamRef.current) return;
    let mr;
    try{ mr = mime ? new MediaRecorder(streamRef.current,{mimeType:mime,audioBitsPerSecond:32000}) : new MediaRecorder(streamRef.current); }
    catch(e){ try{ mr=new MediaRecorder(streamRef.current); }catch(e2){ setErr("Este navegador no permite grabar."); return; } }
    mrRef.current=mr;
    const chunks=[];
    mr.ondataavailable=(e)=>{ if(e.data && e.data.size>0) chunks.push(e.data); };
    mr.onstop=()=>{
      if(chunks.length){ const blob=new Blob(chunks,{type:mime||"audio/webm"}); transcribe(blob, idxRef.current++, mime||"audio/webm"); }
      if(onRef.current) startChunk(mime); // siguiente tramo
    };
    mr.start();
    timerRef.current=setTimeout(()=>{ try{ if(mr.state!=="inactive") mr.stop(); }catch(e){} }, CHUNK_MS);
  }

  async function start(){
    setErr("");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;
    }catch(e){ setErr("No se pudo acceder al micrófono. Dale permiso al navegador."); return; }
    onRef.current=true; setRec(true); startRef.current=Date.now();
    startChunk(pickMime());
  }
  function stop(){
    onRef.current=false; setRec(false);
    elapsedRef.current += Date.now()-startRef.current;
    clearTimeout(timerRef.current);
    try{ if(mrRef.current && mrRef.current.state!=="inactive") mrRef.current.stop(); }catch(e){} // dispara transcripción final
    if(streamRef.current){ try{ streamRef.current.getTracks().forEach(t=>t.stop()); }catch(e){} streamRef.current=null; }
  }

  const shownMs = elapsedRef.current + (rec ? now-startRef.current : 0);

  function generar(){
    const acts=extractActions(text);
    const L=[]; L.push("# "+(titulo.trim()||"Minuta"));
    L.push(""); L.push("## Resumen"); L.push(text? text.slice(0,600)+(text.length>600?"…":"") : "(sin transcripción)");
    L.push(""); L.push("## Acciones"); if(acts.length) acts.forEach(a=>L.push("- [ ] "+a)); else L.push("(no se detectaron acciones)");
    L.push(""); L.push("## Transcripción"); L.push(text||"(vacío)");
    setPreview(L.join("\n"));
  }
  async function guardar(){
    const acts=extractActions(text);
    setSaveSt("loading");
    try{
      await api.saveMinuta({autor:user.nombre,fecha:new Date().toISOString().slice(0,10),titulo:titulo.trim()||"Minuta",resumen:text.slice(0,220),acciones:acts.length});
      setSaveSt("done"); onSaved(); setTimeout(()=>setSaveSt("idle"),2500);
    }catch(e){ setSaveSt("idle"); setErr("No se pudo guardar la minuta."); }
  }
  function limpiar(){ setText(""); setPreview(""); setTitulo(""); elapsedRef.current=0; idxRef.current=0; nextFlush.current=0; resultsRef.current={}; setErr(""); }

  return (
    <div className="card">
      {!supported && <div className="toast-warn">Este navegador no permite grabar audio. Probá con una versión más nueva; igual podés escribir la minuta y guardarla.</div>}
      <label className="f">Título de la reunión</label>
      <input placeholder="Ej: Planificación semanal" value={titulo} onChange={(e)=>setTitulo(e.target.value)} style={{marginBottom:14}} />
      <div className="rec-bar">
        {!rec ? <button className="btn btn-primary" onClick={start} disabled={!supported}>● Grabar</button>
              : <button className="btn" onClick={stop}>■ Detener</button>}
        <span className={"rec-dot"+(rec?" live":"")} />
        <span className="rec-status">{rec?"Grabando…":"Detenido"} <span className="timer">{fmt(shownMs)}</span>{pending>0 && " · transcribiendo…"}</span>
      </div>
      <div className="transcript">
        {!text && !rec && <span className="rec-status">Grabá tu reunión desde cualquier dispositivo. El audio se transcribe solo cada pocos segundos.</span>}
        {text && <div>{text}</div>}
        {rec && !text && <span className="rec-status interim">Escuchando… la transcripción aparece a medida que hablás.</span>}
      </div>
      {err && <div className="ferr" style={{textAlign:"left"}}>{err}</div>}
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        <button className="btn btn-sm" onClick={generar}>Generar minuta</button>
        <button className="btn btn-primary btn-sm" onClick={guardar} disabled={saveSt==="loading"}>{saveSt==="loading"?"Guardando…":saveSt==="done"?"✓ Guardada":"Guardar en NUKNU"}</button>
        <button className="btn btn-sm" onClick={limpiar}>Limpiar</button>
      </div>
      {preview && <div className="min-preview">{preview}</div>}
    </div>
  );
}

function MisMinutas({ user, admin, refreshKey }) {
  const [list,setList]=useState(null);
  useEffect(()=>{ api.listMinutas(user.nombre,admin).then(setList); },[user,admin,refreshKey]);
  return (
    <>
      <div className="sec-hdr"><h2>{admin?"Minutas del equipo":"Mis minutas"}</h2></div>
      {list===null ? <div className="loading">Cargando…</div> :
        list.length===0 ? <div className="empty">Aún no hay minutas guardadas.</div> :
        list.map((m)=>(
          <div className="row-item" key={m.id}>
            <div className="ri-icon">✎</div>
            <div className="ri-body">
              <div className="ri-title">{m.titulo}</div>
              <div className="ri-meta">{admin && <b style={{color:"var(--ink)"}}>{m.autor} · </b>}{m.fecha}{m.acciones?` · ${m.acciones} acciones`:""}</div>
              {m.resumen && <div className="ri-sub">{m.resumen}</div>}
            </div>
          </div>
        ))}
    </>
  );
}

export default function MinutasModule({ user, admin }) {
  const [refresh,setRefresh]=useState(0);
  return (
    <div>
      <Recorder user={user} onSaved={()=>setRefresh(r=>r+1)} />
      <MisMinutas user={user} admin={admin} refreshKey={refresh} />
    </div>
  );
}
