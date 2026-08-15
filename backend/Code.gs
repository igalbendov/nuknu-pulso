/**
 * ─────────────────────────────────────────────────────────────
 *  NUKNU · Backend del ecosistema (Google Apps Script)
 * ─────────────────────────────────────────────────────────────
 *  Guarda usuarios (con PIN), novedades del muro y minutas, todo
 *  en una Google Sheet. Es GRATIS (parte de tu cuenta de Google).
 *
 *  CÓMO INSTALARLO — ver backend/README.md (pasos con capturas de texto).
 *  En resumen:
 *   1. Crea una Google Sheet nueva.
 *   2. Extensiones → Apps Script. Pega TODO este archivo.
 *   3. Cambia SECRET por una frase secreta tuya.
 *   4. Implementar → Nueva implementación → App web →
 *      "Ejecutar como: yo" · "Quién tiene acceso: Cualquiera".
 *   5. Copia la URL que termina en /exec y pégala en lib/config.js
 *      (BACKEND_URL) de la app Pulso.
 * ─────────────────────────────────────────────────────────────
 */

// 🔒 Cambiá esto por una frase secreta tuya (cualquier texto largo).
var SECRET = "cambia-esta-frase-secreta-nuknu";

// Nombres con rol de administrador (ven todo). Deben coincidir con el login.
var ADMINS = ["Igal"];

// ── Utilidades ──────────────────────────────────────────────
function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}
function hashPin_(nombre, pin) {
  var raw = (nombre || "").toLowerCase() + "|" + pin + "|" + SECRET;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function isAdmin_(nombre) {
  return ADMINS.map(function (a) { return a.toLowerCase(); }).indexOf((nombre || "").toLowerCase()) !== -1;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function rows_(sh) {
  var v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  var head = v[0];
  return v.slice(1).map(function (r) {
    var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}

// ── Entradas ────────────────────────────────────────────────
function doGet(e) { return json_({ ok: true, msg: "NUKNU backend activo" }); }

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) {}
  var a = d.action;
  try {
    if (a === "userExists")      return json_({ ok: true, exists: userExists_(d.nombre) });
    if (a === "checkAccess")     return json_({ ok: true, authorized: isAuthorized_(d.nombre), hasPin: userExists_(d.nombre) });
    if (a === "register")        return register_(d.nombre, d.pin);
    if (a === "login")           return login_(d.nombre, d.pin);
    if (a === "removePerson")    return removePerson_(d);
    if (a === "listNews")        return json_({ ok: true, news: listNews_() });
    if (a === "postNews")        return json_({ ok: true, item: postNews_(d) });
    if (a === "listMinutas")     return json_({ ok: true, minutas: listMinutas_(d.nombre, d.isAdmin) });
    if (a === "saveMinuta")      return json_({ ok: true, item: saveMinuta_(d) });
    if (a === "listRendiciones") return json_({ ok: true, rendiciones: listRendiciones_(d.nombre, d.isAdmin) });
    if (a === "submitRend")      return submitRend_(d);
    if (a === "updateRendStatus")return updateRendStatus_(d);
    if (a === "listProfiles")    return json_({ ok: true, profiles: listProfiles_() });
    if (a === "saveProfile")     return saveProfile_(d);
    if (a === "toggleLike")      return toggleLike_(d);
    if (a === "listComments")    return json_({ ok: true, comments: listComments_() });
    if (a === "addComment")      return addComment_(d);
    if (a === "listTareas")      return json_({ ok: true, tareas: listTareas_() });
    if (a === "addTarea")        return addTarea_(d);
    if (a === "toggleTarea")     return toggleTarea_(d);
    if (a === "deleteTarea")     return deleteTarea_(d);
    if (a === "saveSubscription")return saveSubscription_(d);
    if (a === "listSubscriptions")return json_({ ok: true, subs: listSubscriptions_() });
    if (a === "removeSubscription")return removeSubscription_(d);
    return json_({ ok: false, error: "Acción desconocida: " + a });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ── Usuarios / PIN ──────────────────────────────────────────
function usersSheet_() { return sheet_("Usuarios", ["nombre", "pinHash", "creado"]); }

function userExists_(nombre) {
  var sh = usersSheet_();
  return rows_(sh).some(function (u) {
    return String(u.nombre).toLowerCase() === (nombre || "").toLowerCase();
  });
}
// ¿La persona fue autorizada por el admin? (está en el roster / Perfiles)
// Los administradores siempre están autorizados (para no quedar bloqueados).
function isAuthorized_(nombre) {
  if (isAdmin_(nombre)) return true;
  return rows_(profSheet_()).some(function (p) {
    return String(p.nombre).toLowerCase() === String(nombre || "").toLowerCase();
  });
}
function register_(nombre, pin) {
  if (!nombre || !pin) return json_({ ok: false, error: "Faltan datos." });
  if (!isAuthorized_(nombre)) return json_({ ok: false, error: "No estás autorizado. Pídele al administrador que te agregue al equipo." });
  if (userExists_(nombre)) return json_({ ok: false, error: "Ese nombre ya tiene un PIN." });
  usersSheet_().appendRow([nombre.trim(), hashPin_(nombre, pin), new Date()]);
  return json_({ ok: true, nombre: nombre.trim() });
}
// Quita a una persona: borra su acceso (PIN), su perfil y sus suscripciones. Solo admin.
function removePerson_(d) {
  if (!isAdmin_(d.by)) return json_({ ok: false, error: "Solo el administrador puede quitar personas." });
  var name = String(d.nombre || "").toLowerCase();
  [profSheet_(), usersSheet_(), subsSheet_()].forEach(function (sh) {
    var data = sh.getDataRange().getValues(), head = data[0], iN = head.indexOf("nombre");
    if (iN < 0) return;
    for (var r = data.length - 1; r >= 1; r--) { if (String(data[r][iN]).toLowerCase() === name) sh.deleteRow(r + 1); }
  });
  return json_({ ok: true });
}
function login_(nombre, pin) {
  var sh = usersSheet_();
  var u = rows_(sh).filter(function (x) {
    return String(x.nombre).toLowerCase() === (nombre || "").toLowerCase();
  })[0];
  if (!u) return json_({ ok: false, error: "No existe una cuenta con ese nombre." });
  if (String(u.pinHash) !== hashPin_(nombre, pin)) return json_({ ok: false, error: "PIN incorrecto." });
  return json_({ ok: true, nombre: u.nombre, isAdmin: isAdmin_(u.nombre) });
}

// ── Muro de novedades (público) ─────────────────────────────
// agrega columnas nuevas a una hoja existente sin perder datos
function ensureCols_(sh, cols) {
  var lastC = Math.max(1, sh.getLastColumn());
  var head = sh.getRange(1, 1, 1, lastC).getValues()[0];
  var changed = false;
  cols.forEach(function (c) { if (head.indexOf(c) === -1) { head.push(c); changed = true; } });
  if (changed) sh.getRange(1, 1, 1, head.length).setValues([head]);
  return head;
}
function newsSheet_() {
  var sh = sheet_("Novedades", ["id", "autor", "cat", "text", "ts", "likes"]);
  ensureCols_(sh, ["mediaUrl", "mediaType", "mediaId", "mediaName", "likedBy"]);
  return sh;
}
function muroFolder_() {
  var it = DriveApp.getFoldersByName("NUKNU Muro");
  return it.hasNext() ? it.next() : DriveApp.createFolder("NUKNU Muro");
}
function listNews_() {
  return rows_(newsSheet_()).map(function (n) {
    return {
      id: n.id, autor: n.autor, cat: n.cat, text: n.text, ts: Number(n.ts) || null,
      likes: Number(n.likes) || 0, mediaUrl: n.mediaUrl || "", mediaType: n.mediaType || "",
      mediaId: n.mediaId || "", mediaName: n.mediaName || "", likedBy: String(n.likedBy || "")
    };
  }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
}
function postNews_(d) {
  var mediaUrl = "", mediaType = "", mediaId = "", mediaName = "";
  if (d.fileData && d.fileName) {
    try {
      var bytes = Utilities.base64Decode(d.fileData);
      var blob = Utilities.newBlob(bytes, d.fileMime || "application/octet-stream", d.fileName);
      var f = muroFolder_().createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      mediaId = f.getId(); mediaName = d.fileName; mediaUrl = f.getUrl();
      var mime = d.fileMime || "";
      mediaType = mime.indexOf("image") === 0 ? "image" : mime.indexOf("video") === 0 ? "video" : "file";
    } catch (e) { mediaUrl = ""; }
  }
  var id = "n" + new Date().getTime(), ts = new Date().getTime();
  var sh = newsSheet_(), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var obj = { id: id, autor: d.autor, cat: d.cat, text: d.text, ts: ts, likes: 0, mediaUrl: mediaUrl, mediaType: mediaType, mediaId: mediaId, mediaName: mediaName, likedBy: "" };
  sh.appendRow(head.map(function (h) { return obj[h] !== undefined ? obj[h] : ""; }));
  return obj;
}
function toggleLike_(d) {
  var sh = newsSheet_(), data = sh.getDataRange().getValues(), head = data[0];
  var iId = head.indexOf("id"), iLb = head.indexOf("likedBy"), iLk = head.indexOf("likes");
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]) === String(d.id)) {
      var lb = String(data[r][iLb] || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var idx = lb.map(function (x) { return x.toLowerCase(); }).indexOf(String(d.nombre).toLowerCase());
      var liked; if (idx >= 0) { lb.splice(idx, 1); liked = false; } else { lb.push(d.nombre); liked = true; }
      sh.getRange(r + 1, iLb + 1).setValue(lb.join(", "));
      sh.getRange(r + 1, iLk + 1).setValue(lb.length);
      return json_({ ok: true, likes: lb.length, liked: liked });
    }
  }
  return json_({ ok: false });
}
function commentsSheet_() { return sheet_("Comentarios", ["id", "newsId", "autor", "texto", "ts"]); }
function listComments_() {
  return rows_(commentsSheet_()).map(function (c) {
    return { id: c.id, newsId: c.newsId, autor: c.autor, texto: c.texto, ts: Number(c.ts) || null };
  });
}
function addComment_(d) {
  var id = "c" + new Date().getTime(), ts = new Date().getTime();
  commentsSheet_().appendRow([id, d.newsId, d.autor, d.texto, ts]);
  return json_({ ok: true, item: { id: id, newsId: d.newsId, autor: d.autor, texto: d.texto, ts: ts } });
}

// ── Tareas / checklists ─────────────────────────────────────
function tareasSheet_() { return sheet_("Tareas", ["id", "titulo", "asignadoA", "creadoPor", "vence", "estado", "tienda", "ts"]); }
function listTareas_() {
  return rows_(tareasSheet_()).map(function (t) {
    return { id: t.id, titulo: t.titulo, asignadoA: t.asignadoA, creadoPor: t.creadoPor, vence: t.vence, estado: t.estado || "pendiente", tienda: t.tienda, ts: Number(t.ts) || null };
  });
}
function addTarea_(d) {
  var id = "t" + new Date().getTime(), ts = new Date().getTime();
  tareasSheet_().appendRow([id, d.titulo, d.asignadoA || "", d.creadoPor || "", d.vence || "", "pendiente", d.tienda || "", ts]);
  return json_({ ok: true, item: { id: id, titulo: d.titulo, asignadoA: d.asignadoA || "", creadoPor: d.creadoPor || "", vence: d.vence || "", estado: "pendiente", tienda: d.tienda || "", ts: ts } });
}
function toggleTarea_(d) {
  var sh = tareasSheet_(), data = sh.getDataRange().getValues(), head = data[0], iId = head.indexOf("id"), iEs = head.indexOf("estado");
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]) === String(d.id)) {
      var nuevo = d.estado || (String(data[r][iEs]) === "hecha" ? "pendiente" : "hecha");
      sh.getRange(r + 1, iEs + 1).setValue(nuevo);
      return json_({ ok: true, estado: nuevo });
    }
  }
  return json_({ ok: false });
}
function deleteTarea_(d) {
  var sh = tareasSheet_(), data = sh.getDataRange().getValues(), head = data[0], iId = head.indexOf("id");
  for (var r = data.length - 1; r >= 1; r--) { if (String(data[r][iId]) === String(d.id)) sh.deleteRow(r + 1); }
  return json_({ ok: true });
}

// ── Suscripciones de notificaciones push ────────────────────
function subsSheet_() { return sheet_("Suscripciones", ["nombre", "endpoint", "sub", "ts"]); }
function saveSubscription_(d) {
  var sh = subsSheet_(), data = sh.getDataRange().getValues(), head = data[0], iE = head.indexOf("endpoint");
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iE]) === String(d.endpoint)) { sh.getRange(r + 1, 1, 1, 4).setValues([[d.nombre, d.endpoint, d.sub, new Date()]]); return json_({ ok: true }); }
  }
  sh.appendRow([d.nombre, d.endpoint, d.sub, new Date()]);
  return json_({ ok: true });
}
function listSubscriptions_() {
  return rows_(subsSheet_()).map(function (s) { return { nombre: s.nombre, endpoint: s.endpoint, sub: s.sub }; });
}
function removeSubscription_(d) {
  var sh = subsSheet_(), data = sh.getDataRange().getValues(), head = data[0], iE = head.indexOf("endpoint");
  for (var r = data.length - 1; r >= 1; r--) { if (String(data[r][iE]) === String(d.endpoint)) sh.deleteRow(r + 1); }
  return json_({ ok: true });
}

// ── Minutas (privadas por autor; admin ve todo) ─────────────
function minutasSheet_() { return sheet_("Minutas", ["id", "autor", "fecha", "titulo", "resumen", "acciones", "contenido"]); }
function listMinutas_(nombre, isAdmin) {
  var all = rows_(minutasSheet_());
  var admin = isAdmin || isAdmin_(nombre);
  return all.filter(function (m) {
    return admin || String(m.autor).toLowerCase() === (nombre || "").toLowerCase();
  }).map(function (m) {
    return { id: m.id, autor: m.autor, fecha: m.fecha, titulo: m.titulo, resumen: m.resumen, acciones: Number(m.acciones) || 0, contenido: m.contenido || "" };
  });
}
// ReuNote llamará a esto para guardar cada minuta.
function saveMinuta_(d) {
  var id = "m" + new Date().getTime();
  minutasSheet_().appendRow([id, d.autor, d.fecha || new Date().toISOString().slice(0,10), d.titulo || "Minuta", d.resumen || "", d.acciones || 0, d.contenido || ""]);
  return { id: id };
}

// ── Perfiles del equipo (nombre, cargo, tienda, cumpleaños) ──
function profSheet_() { return sheet_("Perfiles", ["nombre", "nombreCompleto", "cargo", "tienda", "fechaNac", "email", "actualizado"]); }
function bday_(v) {
  if (v instanceof Date) return ("0" + (v.getMonth() + 1)).slice(-2) + "-" + ("0" + v.getDate()).slice(-2);
  var s = String(v || "").trim();
  var m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[2] + "-" + m[3];
  return s;
}
function listProfiles_() {
  return rows_(profSheet_()).map(function (p) {
    return { nombre: p.nombre, nombreCompleto: p.nombreCompleto, cargo: p.cargo, tienda: p.tienda, fechaNac: bday_(p.fechaNac), email: p.email };
  });
}
function saveProfile_(d) {
  if (!d.nombre) return json_({ ok: false, error: "Falta el nombre." });
  // Solo podés editar tu propio perfil; el admin puede crear/editar el de cualquiera.
  var self = String(d.nombre).toLowerCase() === String(d.by || "").toLowerCase();
  if (!self && !isAdmin_(d.by)) return json_({ ok: false, error: "Solo el administrador puede crear o editar el perfil de otra persona." });
  var sh = profSheet_(), data = sh.getDataRange().getValues(), head = data[0], iN = head.indexOf("nombre");
  var fila = [d.nombre, d.nombreCompleto || "", d.cargo || "", d.tienda || "", d.fechaNac || "", d.email || "", new Date()];
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iN]).toLowerCase() === String(d.nombre).toLowerCase()) {
      sh.getRange(r + 1, 1, 1, fila.length).setValues([fila]);
      sh.getRange(r + 1, head.indexOf("fechaNac") + 1).setNumberFormat("@"); // fecha como texto
      return json_({ ok: true });
    }
  }
  sh.appendRow(fila);
  var last = sh.getLastRow();
  sh.getRange(last, head.indexOf("fechaNac") + 1).setNumberFormat("@");
  return json_({ ok: true });
}

// ── Rendiciones (privadas por autor; admin ve todo) ─────────
// Si integrás la app de Rendiciones para que escriba en la pestaña
// "Rendiciones" de esta misma Sheet, esto ya las devuelve filtradas.
function rendSheet_() { return sheet_("Rendiciones", ["id", "autor", "fecha", "monto", "categoria", "estado", "desc", "medioPago", "numDoc", "fileUrl", "comentario"]); }
function listRendiciones_(nombre, isAdmin) {
  var all = rows_(rendSheet_());
  var admin = isAdmin || isAdmin_(nombre);
  return all.filter(function (r) {
    return admin || String(r.autor).toLowerCase() === (nombre || "").toLowerCase();
  }).map(function (r) {
    return { id: r.id, autor: r.autor, fecha: r.fecha, monto: Number(r.monto) || 0,
             categoria: r.categoria, estado: r.estado, desc: r.desc,
             medioPago: r.medioPago, numDoc: r.numDoc, fileUrl: r.fileUrl, comentario: r.comentario };
  }).reverse();
}

// Carpeta de Drive para los comprobantes (se crea sola).
function driveFolder_() {
  var name = "NUKNU Rendiciones";
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// Registrar una rendición nueva (opcionalmente con comprobante en base64).
function submitRend_(d) {
  var fileUrl = "";
  if (d.fileData && d.fileName) {
    try {
      var bytes = Utilities.base64Decode(d.fileData);
      var blob = Utilities.newBlob(bytes, d.fileMime || "application/octet-stream", d.fileName);
      var file = driveFolder_().createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } catch (err) { fileUrl = ""; }
  }
  var id = "r" + new Date().getTime();
  // columnas: id, autor, fecha, monto, categoria, estado, desc, medioPago, numDoc, fileUrl, comentario
  var sh = sheet_("Rendiciones", ["id","autor","fecha","monto","categoria","estado","desc","medioPago","numDoc","fileUrl","comentario"]);
  sh.appendRow([id, d.autor, d.fechaGasto || d.fecha, Number(d.monto)||0, d.categoria,
                "Pendiente", d.descripcion || d.desc, d.medioPago || "", d.numDoc || "", fileUrl, ""]);
  return json_({ ok: true, id: id, fileUrl: fileUrl });
}

// Aprobar / rechazar (solo lo usa el admin desde la app).
function updateRendStatus_(d) {
  var sh = sheet_("Rendiciones", ["id","autor","fecha","monto","categoria","estado","desc","medioPago","numDoc","fileUrl","comentario"]);
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var iId = head.indexOf("id"), iEst = head.indexOf("estado"), iCom = head.indexOf("comentario");
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]) === String(d.id)) {
      sh.getRange(r + 1, iEst + 1).setValue(d.estado);
      if (iCom >= 0) sh.getRange(r + 1, iCom + 1).setValue(d.comentario || "");
      return json_({ ok: true });
    }
  }
  return json_({ ok: false, error: "No se encontró la rendición." });
}
