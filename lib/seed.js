// Datos iniciales del muro de novedades NUKNU.
// Editá libremente: nombres, categorías, novedades y cumpleaños.

// Apps hermanas del ecosistema NUKNU.
// Reemplazá "url" por la dirección donde tengas publicada cada app.
// (Si aún no la publicás, dejá "#" y el botón queda deshabilitado.)
export const ECOSYSTEM = [
  {
    key: "reunote",
    nombre: "ReuNote",
    desc: "Transcribe reuniones e identifica quién habla",
    emoji: "🎙️",
    url: "#", // ← pega aquí la URL de ReuNote cuando la publiques
    color: "#3d51a0",
  },
  {
    key: "rendiciones",
    nombre: "Rendiciones",
    desc: "Registra gastos con boleta y aprobación",
    emoji: "🧾",
    url: "/rendiciones.html", // va incluida en el mismo sitio (mismo login)
    color: "#B5623A",
  },
];

// Categorías de novedad (etiqueta + color). "importante" va primero y destaca.
export const CATEGORIES = [
  { key: "importante", label: "Importante", color: "var(--clay)",  soft: "rgba(156,91,63,.12)" },
  { key: "tienda",     label: "Tienda",     color: "var(--sage)",  soft: "rgba(110,123,99,.14)" },
  { key: "promo",      label: "Promo",      color: "var(--ochre)", soft: "rgba(169,134,63,.14)" },
  { key: "general",    label: "General",    color: "var(--slate)", soft: "rgba(94,107,122,.14)" },
];

// Reacciones disponibles en el muro (la primera, ♥, es la de "me gusta").
export const REACTIONS = [
  { e: "♥",  label: "Me gusta" },
  { e: "👏", label: "Aplausos" },
  { e: "🔥", label: "Genial" },
  { e: "😄", label: "Divertido" },
  { e: "💡", label: "Buena idea" },
  { e: "🙌", label: "Vamos" },
];

// Canales con metas de venta (para el panel de metas del muro).
// El avance se llena solo desde Shopify por cada uno.
export const SALES_STORES = ["Tienda Pausa Pasteur", "Tienda Casa Costanera", "Página Web", "Nuknu at Home"];

// Metas de ejemplo (solo modo demo). periodo en formato YYYY-MM.
export const SEED_METAS = [
  { id: "g1", tienda: "Tienda Pausa Pasteur", periodo: "2026-08", meta: 8000000, avance: 5922101 },
  { id: "g2", tienda: "Tienda Casa Costanera", periodo: "2026-08", meta: 6500000, avance: 5240445 },
  { id: "g3", tienda: "Página Web", periodo: "2026-08", meta: 3000000, avance: 2380483 },
  { id: "g4", tienda: "Nuknu at Home", periodo: "2026-08", meta: 500000, avance: 59900 },
];

// Nombres del equipo (para elegir quién publica). Editá libremente.
export const TEAM_NAMES = [
  "Igal", "Javiera", "Catalina", "Fernanda", "Antonia", "Rosa", "Matías",
];

// Cumpleaños del equipo. Formato de fecha: "MM-DD".
export const BIRTHDAYS = [
  { nombre: "Fernanda", fecha: "08-12" },
  { nombre: "Catalina", fecha: "09-03" },
  { nombre: "Matías",   fecha: "10-21" },
];

// Novedades de ejemplo (las más nuevas se muestran arriba).
// "min" = hace cuántos minutos se publicó (solo para el ejemplo).
export const SEED_NEWS = [
  {
    id: "n1",
    autor: "Igal",
    cat: "importante",
    tipo: "post",
    pinned: true,
    text: "Este fin de semana hacemos 2x1 en accesorios (sábado y domingo). Los carteles llegan mañana a las dos tiendas. Aplicar desde la apertura 🙌 @Javiera confirma que lleguen a Pausa Pasteur.",
    min: 55,
    likes: 4,
    reacts: { "♥": ["Fernanda", "Rosa"], "👏": ["Javiera", "Catalina"] },
    readBy: ["Fernanda", "Javiera"],
  },
  {
    id: "np",
    autor: "Igal",
    cat: "general",
    tipo: "encuesta",
    text: "¿Qué horario prefieren para la reunión de equipo de esta semana?",
    min: 120,
    reacts: {},
    extra: { opciones: ["Lunes 9:00", "Miércoles 18:00", "Viernes 10:00"], votos: { "0": ["Fernanda"], "1": ["Rosa", "Catalina"] } },
  },
  {
    id: "nr",
    autor: "Fernanda",
    cat: "general",
    tipo: "reconocimiento",
    text: "Cerró la venta más grande del mes y ayudó a una clienta difícil con una paciencia enorme. ¡Grande! 👏",
    min: 200,
    reacts: { "👏": ["Igal", "Rosa", "Catalina"], "🔥": ["Javiera"] },
    extra: { para: "Javiera" },
  },
  {
    id: "n2",
    autor: "Javiera",
    cat: "tienda",
    tipo: "post",
    text: "Llegó el stock nuevo de aros ✨ ya está en vitrina en Pausa Pasteur, se ven increíbles.",
    min: 180,
    photo: "linear-gradient(135deg,#e8d3c0,#cbb298)",
    likes: 6,
    reacts: { "♥": ["Igal", "Fernanda", "Rosa"] },
  },
  {
    id: "n3",
    autor: "Rosa",
    cat: "general",
    tipo: "post",
    text: "Recordatorio: las boletas de gastos de julio se rinden hasta el viernes en la app de Rendiciones. Después de esa fecha quedan para el próximo mes.",
    min: 320,
    likes: 2,
    reacts: { "♥": ["Igal", "Fernanda"] },
  },
];

// Datos de ejemplo SOLO para modo demo (cuando no hay backend conectado).
// En modo real, estos vienen del backend / de las apps de Rendiciones y ReuNote.
export const SEED_RENDICIONES = [
  { id: "r1", autor: "Igal",    fecha: "2026-08-05", monto: 18900, categoria: "Alimentación", estado: "Aprobado",  desc: "Delivery almuerzo equipo" },
  { id: "r2", autor: "Igal",    fecha: "2026-08-08", monto: 42000, categoria: "Marketing",     estado: "Pendiente", desc: "Impresión de carteles promo" },
  { id: "r3", autor: "Javiera", fecha: "2026-08-07", monto: 6500,  categoria: "Transporte",    estado: "Aprobado",  desc: "Uber a bodega" },
  { id: "r4", autor: "Rosa",    fecha: "2026-08-09", monto: 12300, categoria: "Insumos / Materiales", estado: "Rechazado", desc: "Bolsas (faltó boleta)" },
];

export const SEED_MINUTAS = [
  { id: "m1", autor: "Igal", fecha: "2026-08-06", titulo: "Planificación semanal", resumen: "Se definió la promo 2x1 y turnos de agosto.", acciones: 3 },
  { id: "m2", autor: "Igal", fecha: "2026-08-10", titulo: "Reunión con proveedor de aros", resumen: "Nuevo pedido para septiembre, precios acordados.", acciones: 2 },
  { id: "m3", autor: "Rosa", fecha: "2026-08-09", titulo: "Cierre contable julio", resumen: "Pendientes de rendición y cuadre de caja.", acciones: 4 },
];

export function initials(name) {
  const p = String(name).trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || p[0]?.[1] || "")).toUpperCase();
}

// color estable por persona (para el avatar)
const AV_COLORS = ["#8C867A", "#9C5B3F", "#6E7B63", "#5E6B7A", "#A9863F", "#9C5B6B", "#7A6E5E", "#4A6B3A"];
export function avatarColor(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function catOf(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];
}
