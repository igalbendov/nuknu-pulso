# NUKNU · Pulso — Hub del equipo (acceso por PIN)

El punto de entrada del ecosistema **NUKNU**. Cada persona entra con su **PIN**
(lo crea la primera vez) y accede a:

- **Muro** — novedades importantes del equipo. **Público**: lo ven todos.
- **Rendiciones** — cada uno ve **las suyas**; el admin ve las de todos.
- **Minutas** — cada uno ve **las suyas**; el admin ve las de todas.
- **Apps** — abre ReuNote y Rendiciones.

Un solo acceso, mismo look que ReuNote, listo para **Vercel** e instalable en el
celular (PWA).

---

## ⚙️ Dos modos

- **Modo demo (por defecto):** funciona ya, pero los datos quedan en cada
  dispositivo. Sirve para probar y mostrar.
- **Modo real (compartido):** cuando conectás el **backend gratis de Google**
  (carpeta `backend/`), todo pasa a ser compartido entre el equipo, a costo
  cero. Es el mismo mecanismo que ya usa tu app de Rendiciones.

Para activarlo: seguí `backend/README.md` y pegá la URL en `lib/config.js`
(`BACKEND_URL`).

---

## 🚀 Subirlo a Vercel sin ser programador

1. Creá cuenta gratis en **GitHub** y en **Vercel** (entrá a Vercel con GitHub).
2. En GitHub, **New** repositorio → `nuknu-pulso`.
3. **"uploading an existing file"** → arrastrá todos los archivos de esta
   carpeta (menos `node_modules` y `.next`). **Commit**.
4. En Vercel: **Add New… → Project** → elegí `nuknu-pulso` → **Deploy**.
5. Te da una dirección `…vercel.app`. Esa la compartís con el equipo.

Instalar en el celular: abrir la dirección → menú del navegador → **"Agregar a
pantalla de inicio"**.

---

## ✏️ Personalizar

- `lib/config.js` → `BACKEND_URL` (backend real) y `ADMIN_NAMES` (quién ve todo).
- `lib/seed.js` → nombres del equipo, categorías, cumpleaños, y datos de ejemplo
  del modo demo.

---

## 🗺️ Qué falta (próximos pasos)

Esto es la **base**: identidad por PIN + hub + muro. Para cerrar el círculo:

1. Conectar **ReuNote** para que **guarde cada minuta** (llamada a `saveMinuta`).
2. Apuntar **Rendiciones** para que escriba también en esta base y aparezca
   dentro de Pulso filtrada por persona.

Ambos se apoyan en el mismo backend gratis de Google.
