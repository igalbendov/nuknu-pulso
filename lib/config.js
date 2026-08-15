// ─────────────────────────────────────────────────────────────
// Configuración del ecosistema NUKNU
// ─────────────────────────────────────────────────────────────

// Backend compartido (Google Apps Script). Mientras esté vacío o en "#",
// la app funciona en MODO DEMO (los datos quedan en cada dispositivo).
// Cuando publiques el backend de Google (ver carpeta /backend), pega aquí la
// URL que termina en /exec y todo pasa a ser compartido y real.
export const BACKEND_URL = "https://script.google.com/macros/s/AKfycbw7ZI_CILopf0NHxNtJTlYsaekvT-mczb1l-PLKxrI-r5zFp4Xzk53LScuuO8s1yHH0/exec";

// Personas con rol de administrador (ven TODO: rendiciones y minutas de todos).
// El resto ve solo lo suyo. Debe coincidir con el nombre con que inician sesión.
export const ADMIN_NAMES = ["Igal"];

export const DEMO_MODE = !BACKEND_URL || BACKEND_URL === "#";

// Versión visible de la app (se muestra en el menú del usuario).
export const APP_VERSION = "1.4.0";

// Clave pública para notificaciones push (VAPID). Es pública, puede ir acá.
// La clave PRIVADA va como variable de entorno VAPID_PRIVATE_KEY en Vercel.
export const VAPID_PUBLIC = "BNjIOw-4NACzpoYSp2_BbcF03HjqJlMfTWZ_IlRarz8ApfIyfHuRiDJitJZUPaC1vHB6nZCp749aGgquV6UWvIE";
