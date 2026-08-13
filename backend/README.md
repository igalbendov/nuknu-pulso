# Backend gratis de NUKNU (Google Apps Script)

Esto convierte el ecosistema en **compartido y real** — que cada persona entre
con su PIN desde su celular y vea lo suyo, y el muro lo vean todos — usando una
**Google Sheet** como base de datos. **No cuesta nada**: es parte de tu cuenta
de Google, igual que ya funciona tu app de Rendiciones.

## Pasos (10–15 min, sin programar)

1. Entrá a **sheets.google.com** y creá una **hoja nueva**. Ponele
   "NUKNU · Base" (el nombre da igual).
2. En el menú, **Extensiones → Apps Script**. Se abre un editor.
3. Borrá lo que haya y **pegá todo el contenido de `Code.gs`** (el archivo que
   está en esta misma carpeta).
4. Arriba del archivo, cambiá dos cosas:
   - `SECRET` → una frase secreta tuya (cualquier texto largo e inventado).
   - `ADMINS` → los nombres que pueden ver todo (ej: `["Igal"]`).
5. Hacé clic en **Guardar** (ícono de diskette).
6. Arriba a la derecha: **Implementar → Nueva implementación**.
   - Tipo: elegí **Aplicación web**.
   - "Ejecutar como": **Yo**.
   - "Quién tiene acceso": **Cualquier persona**.
   - **Implementar**. Google te pedirá autorizar — aceptá con tu cuenta.
7. Te muestra una **URL que termina en `/exec`**. **Copiala.**
8. Abrí `lib/config.js` en el proyecto de Pulso y pegá esa URL en
   `BACKEND_URL`. Volvé a publicar en Vercel (o si ya está en GitHub, actualizá
   el archivo ahí).

Listo: Pulso deja el "modo demo" y pasa a ser compartido. Las pestañas
**Usuarios**, **Novedades**, **Minutas** y **Rendiciones** se crean solas en la
Sheet la primera vez que se usan.

## Cómo se conectan las otras apps

- **ReuNote:** para que guarde cada minuta, se le agrega una llamada a
  `saveMinuta` con el nombre de quien la creó. (Ese es el próximo paso que
  habíamos hablado.)
- **Rendiciones:** hoy usa su propia Sheet. Se puede apuntar a que también
  escriba en la pestaña `Rendiciones` de esta base, y así aparecen dentro de
  Pulso filtradas por persona.

## Seguridad

Los PIN **no se guardan en texto**: se guardan cifrados (hash SHA-256 con tu
`SECRET`). Aun así, un PIN corto es seguridad liviana — apropiado para datos
internos del equipo. Si algún día manejás algo muy sensible, conviene pasar a
inicio de sesión con Google.
