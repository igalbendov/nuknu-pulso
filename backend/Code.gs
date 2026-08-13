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
    if (a === "register")        return register_(d.nombre, d.pin);
    if (a === "login")           return login_(d.nombre, d.pin);
    if (a === "listNews")        return json_({ ok: true, news: listNews_() });
    if (a === "postNews")        return json_({ ok: true, item: postNews_(d) });
    if (a === "listMinutas")     return json_({ ok: true, minutas: listMinutas_(d.nombre, d.isAdmin) });
    if (a === "saveMinuta")      return json_({ ok: true, item: saveMinuta_(d) });
    if (a === "listRendiciones") return json_({ ok: true, rendiciones: listRendiciones_(d.nombre, d.isAdmin) });
    if (a === "submitRend")      return submitRend_(d);
    if (a === "updateRendStatus")return updateRendStatus_(d);
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
function register_(nombre, pin) {
  if (!nombre || !pin) return json_({ ok: false, error: "Faltan datos." });
  if (userExists_(nombre)) return json_({ ok: false, error: "Ese nombre ya tiene un PIN." });
  usersSheet_().appendRow([nombre.trim(), hashPin_(nombre, pin), new Date()]);
  return json_({ ok: true, nombre: nombre.trim() });
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
function newsSheet_() { return sheet_("Novedades", ["id", "autor", "cat", "text", "ts", "likes"]); }
function listNews_() {
  return rows_(newsSheet_()).map(function (n) {
    return { id: n.id, autor: n.autor, cat: n.cat, text: n.text, ts: Number(n.ts) || null, likes: Number(n.likes) || 0 };
  }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
}
function postNews_(d) {
  var id = "n" + new Date().getTime();
  var ts = new Date().getTime();
  newsSheet_().appendRow([id, d.autor, d.cat, d.text, ts, 0]);
  return { id: id, autor: d.autor, cat: d.cat, text: d.text, ts: ts, likes: 0 };
}

// ── Minutas (privadas por autor; admin ve todo) ─────────────
function minutasSheet_() { return sheet_("Minutas", ["id", "autor", "fecha", "titulo", "resumen", "acciones", "contenido"]); }
function listMinutas_(nombre, isAdmin) {
  var all = rows_(minutasSheet_());
  var admin = isAdmin || isAdmin_(nombre);
  return all.filter(function (m) {
    return admin || String(m.autor).toLowerCase() === (nombre || "").toLowerCase();
  }).map(function (m) {
    return { id: m.id, autor: m.autor, fecha: m.fecha, titulo: m.titulo, resumen: m.resumen, acciones: Number(m.acciones) || 0 };
  });
}
// ReuNote llamará a esto para guardar cada minuta.
function saveMinuta_(d) {
  var id = "m" + new Date().getTime();
  minutasSheet_().appendRow([id, d.autor, d.fecha || new Date().toISOString().slice(0,10), d.titulo || "Minuta", d.resumen || "", d.acciones || 0, d.contenido || ""]);
  return { id: id };
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
