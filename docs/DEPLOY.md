# Publicar OpenVireo 1.0 en Cloudflare Pages

Guía paso a paso para publicar la versión 1.0 como sitio estático en tu cuenta de Cloudflare, con la dirección gratuita `*.pages.dev`. Sigue la decisión del 7 de noviembre de 2026 (`AGENTS.md`):

- Se publica solo el sitio estático: la salida normal de `npm run build`, sin código de la nube opcional.
- Las investigaciones se guardan solo en el equipo del estudiante.
- La analítica de visitas es agregada y sin cookies (Cloudflare Web Analytics).
- No se despliegan cuentas, base de datos, correo ni Workers.

Tú ejecutas o autorizas cada despliegue. Ningún agente inicia sesión en Cloudflare ni despliega por ti.

> **Nunca** pongas tokens, contraseñas ni identificadores de cuenta en el repositorio, en `.env`, en los registros ni en las revisiones. `wrangler login` guarda su credencial en tu carpeta de usuario, fuera del repositorio.

## 0. Qué se publica

- `dist/` contiene unos 2023 archivos y unos 676 MiB. Cloudflare Pages admite archivos de menos de 25 MiB y, en el plan gratuito, menos de 20 000 archivos.
- `npm run build` termina con `scripts/check-deploy-limits.mjs`, que falla si se supera algún límite. Muestra el número de archivos, el total y el archivo más grande.
- El único original que superaba 25 MiB, `Orbit/ObjX_MPC.CMO` (30 989 466 B), se sirve en tres trozos byte a byte, como el GSC:
  - los trozos son `original/orbit/ObjX_MPC/000.bin` a `002.bin`, de 65 536 registros cada uno;
  - sus SHA-256 y el del archivo completo están en `docs/LOCAL-RESOURCES.json` (`assembled[]`);
  - el navegador comprueba cada trozo y el archivo completo antes de usarlo.
- `dist/_headers` (desde `public/_headers`) fija las cabeceras de seguridad (CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`) y la caché. Pages lo aplica por sí solo.
- El enrutado usa `#` (por ejemplo `/#object-x`), así que no hace falta ninguna regla de reescritura. `dist/404.html` hace que una dirección inexistente responda 404, en lugar de la página principal que Pages sirve por defecto.

## 1. Requisitos (una sola vez)

1. Una cuenta de Cloudflare (la gratuita basta).
2. Node 22 y las dependencias instaladas en la raíz del proyecto:
   ```sh
   npm ci --ignore-scripts
   ```
3. La herramienta `wrangler` en la versión fijada: **4.150.0**, la misma que `worker/package.json`. Puedes usarla de dos formas:
   - con `npx wrangler@4.150.0 …`, que la descarga de npm la primera vez;
   - o desde `worker/node_modules`, después de `cd worker && npm ci`.

   Desactiva la telemetría en la terminal donde la uses:
   ```sh
   export WRANGLER_SEND_METRICS=false
   ```

## 2. Iniciar sesión (lo haces tú)

```sh
npx wrangler@4.150.0 login
```

Se abre el navegador y autorizas a Wrangler en tu cuenta. Comprueba con qué cuenta entraste:

```sh
npx wrangler@4.150.0 whoami
```

No copies la salida de `whoami` en issues, documentos ni chats: muestra el correo y el identificador de la cuenta.

## 3. Crear el proyecto de Pages (una sola vez)

```sh
npx wrangler@4.150.0 pages project create openvireo --production-branch=main
```

Con Wrangler 4.150.0, `pages project create` intenta pasar el proyecto a la nueva versión de Pages integrada en Workers, y eso falla con "Missing entry-point" sin crear nada. Añade `--force` solo en este comando para crearlo en Pages clásico, que es lo que describe esta guía. Así se creó `openvireo` el 8 de noviembre de 2026. Los comandos siguientes (`pages deploy`) ya van directos a Pages y no necesitan `--force`.

El proyecto se llama siempre `openvireo`; mantén `--project-name=openvireo` en todos los comandos. La dirección pública suele ser `https://openvireo.pages.dev`. Si ese subdominio de `pages.dev` ya está ocupado, Cloudflare asigna otro (por ejemplo `https://openvireo-xyz.pages.dev`) y lo muestra al crear el proyecto y en el panel. En ese caso, cambia solo las direcciones de los pasos 8 y 9 por la que muestre Cloudflare.

También puedes crear el proyecto en el panel: **Workers & Pages → Create → Pages → Upload assets**, con el nombre `openvireo`. No conectes Git: esta versión se publica por subida directa.

## 4. Compilar

Desde la raíz del proyecto, con el árbol limpio en la rama `main`:

```sh
git status            # sin cambios pendientes
npm run build
```

La compilación debe terminar con estas tres líneas:

```
Ordinary build is free of optional-cloud code.
Deploy limits: 2023 files, … bytes (… MiB); largest original/orbit/ObjX_MPC/000.bin, 10616832 bytes (10.1 MiB).
Every file is under 26214400 bytes and the count is under 20000.
```

Si `VITE_OPENVIREO_CLOUD` está definida en tu entorno, quítala (`unset VITE_OPENVIREO_CLOUD`): la versión 1.0 no incluye la nube.

## 5. Prueba local con la semántica de Pages (recomendada antes de cada despliegue)

Esta prueba sirve `dist/` con `wrangler pages dev` en `127.0.0.1`, que aplica `_headers` igual que Pages. No necesita sesión ni cuenta, y la prueba bloquea toda petición que no sea local.

```sh
(cd worker && npm ci)                        # una sola vez: wrangler 4.150.0 fijado
npm run test:pages
```

Usa el puerto 6310; para otro puerto, define `OPENVIREO_PAGES_PORT=63xx`. Necesita el navegador de Playwright. Si no está en `.local/browsers`, indica dónde está con `PLAYWRIGHT_BROWSERS_PATH`.

La prueba comprueba:

- las cabeceras de la página, de un recurso con hash y de un archivo original;
- que ninguna ruta principal produce violaciones de CSP ni errores;
- que la consulta en vivo a VizieR pasa la política, con una respuesta grabada y sin red;
- que `ObjX_MPC.CMO` se carga de sus trozos con el SHA-256 correcto;
- que el aviso de privacidad y los créditos están visibles.

## 6. Desplegar

Despliega **fuera del horario de clase**. Una pestaña que ya estaba abierta sigue pidiendo los archivos de la versión anterior, y esos archivos dejan de existir. La parte que aún no había cargado muestra entonces el aviso "A new version of OpenVireo was published", con *Save investigation* y *Reload the page*. El estudiante debe guardar y recargar. El resto de su trabajo en esa pestaña no se pierde, pero tiene que recargar.

Ejecuta el comando **desde la raíz del repositorio, nunca desde `worker/`**. En `worker/`, Wrangler leería `worker/wrangler.jsonc`, que es la configuración del backend opcional, no la de este sitio.

```sh
npx wrangler@4.150.0 pages deploy dist --project-name=openvireo --branch=main
```

- `--branch=main` publica en producción, porque `main` es la rama de producción del proyecto. Otra rama crearía una vista previa en `https://<rama>.openvireo.pages.dev`.
- Al terminar, Wrangler muestra la dirección del despliegue (`https://<id>.openvireo.pages.dev`). La dirección de producción es `https://openvireo.pages.dev`.
- Subir unos 676 MiB tarda varios minutos. Si se corta, repite el comando: Pages solo sube los archivos que faltan.
- **Regla para versiones futuras:** nunca cambies los bytes de un archivo que ya está publicado en `/original/…` o `/camera/…`. Esos archivos se guardan en la caché un día por su nombre. Si hay que volver a trocear un original o rehacer un extracto, publícalo con una ruta nueva (y su SHA-256 en el manifiesto).

## 7. Activar Web Analytics (una sola vez)

1. En el panel: **Workers & Pages → openvireo → Metrics → Web Analytics → Enable** (en algunas versiones del panel: **Analytics & Logs → Web Analytics**).
2. Pages inserta por sí solo el script de medición (`static.cloudflareinsights.com/beacon.min.js`) en las páginas HTML del siguiente despliegue. Vuelve a desplegar (paso 6) para que aparezca.
3. La CSP de `public/_headers` ya admite `https://static.cloudflareinsights.com` (script) y `https://cloudflareinsights.com` (envío de datos). No hay que cambiar el código ni añadir ningún token al repositorio.
4. Web Analytics no usa cookies ni crea perfiles de visitante. El aviso de privacidad de la aplicación (Help › About this site and privacy (web)) lo explica.

Si al cabo de un día el panel no muestra visitas, comprueba en la consola del navegador que el script no está bloqueado. Si la causa fuera `Referrer-Policy: same-origin`, cámbiala a `strict-origin-when-cross-origin` en `public/_headers`. Esto no se pudo verificar sin contactar con Cloudflare.

## 8. Lista de comprobación después de desplegar

1. Abre `https://openvireo.pages.dev`. Se muestra el observatorio ("Start with the sky.").
2. Recorre brevemente cada ejercicio y comprueba que carga sin errores en la consola del navegador (F12):
   - **Hubble** (`/#galaxy-exposure`, y Analyzer → *Hubble diagram & distances*);
   - **Estructura a gran escala** (`/#lss-survey`);
   - **Clasificación estelar** (`/#classification`);
   - **Fotometría de las Pléyades** (`/#photometer`);
   - **Diagramas HR de cúmulos** (`/#cluster-database`);
   - **Púlsares** (`/#radio-control` y `/#pulsar-analysis`);
   - **Objeto X** (`/#object-x`). Elige *Orbit file → ObjX_MPC.CMO* y pulsa *Build the asteroid list…*: la lista debe construirse sin error.
3. Cámaras: apunta a un campo, marca *Ask VizieR live* y haz una exposición corta. La imagen debe aparecer y los detalles deben nombrar el servidor de VizieR que respondió.
4. Abre **Help › About this site and privacy (web)** y comprueba el aviso de privacidad y los créditos (Project CLEA, NSF, Gettysburg College y ATNF).
5. Comprueba las cabeceras desde una terminal:
   ```sh
   curl -sI https://openvireo.pages.dev/ | grep -iE 'content-security-policy|x-content-type-options|referrer-policy|permissions-policy|x-frame-options|cache-control'
   curl -sI https://openvireo.pages.dev/original/hotlists/Hubble.HTL | grep -i cache-control
   curl -s https://openvireo.pages.dev/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'   # copia la ruta para el siguiente
   curl -sI https://openvireo.pages.dev/assets/index-XXXX.js | grep -i cache-control
   ```
   Lo esperado:
   - en `/`: `cache-control: no-cache` y la CSP completa;
   - en `/original/…`: `public, max-age=86400, stale-while-revalidate=604800`;
   - en `/assets/…`: `public, max-age=31536000, immutable`.
6. Comprueba que el archivo entero de 31 MB no está publicado: `curl -sI https://openvireo.pages.dev/original/orbit/ObjX_MPC.CMO` debe devolver `404`, nunca `application/octet-stream` de 30 989 466 bytes.

## 9. Volver atrás (rollback)

Cada despliegue queda guardado. Para volver al anterior:

- **Panel:** **Workers & Pages → openvireo → Deployments**. En el despliegue bueno, abre el menú **⋯ → Rollback to this deployment**. El cambio es inmediato.
- **Terminal:** lista los despliegues con
  ```sh
  npx wrangler@4.150.0 pages deployment list --project-name=openvireo
  ```
  Después, vuelve a desplegar desde Git la versión buena:
  ```sh
  git checkout <commit-bueno> && npm run build
  npx wrangler@4.150.0 pages deploy dist --project-name=openvireo --branch=main
  ```

`index.html` se sirve con `no-cache`, así que los visitantes ven la versión restaurada en su siguiente visita. Igual que un despliegue, un rollback hace que las pestañas abiertas tengan que recargar: si puedes, hazlo fuera del horario de clase. Los recursos con hash de `/assets/` no chocan entre versiones.

## 10. Más adelante: dominio propio

Cuando compres el dominio, y con una nueva aprobación según `AGENTS.md`:

1. Añade el dominio a Cloudflare (**Websites → Add a site**) y cambia sus servidores DNS a los que indique Cloudflare.
2. En **Workers & Pages → openvireo → Custom domains → Set up a custom domain**, escribe el nombre (por ejemplo `openvireo.example`). Cloudflare crea el registro DNS y el certificado.
3. Comprueba las cabeceras con `curl -I` en el nuevo dominio (paso 8.5). `_headers` se aplica igual.
4. Opcional: redirige `openvireo.pages.dev` al dominio con una regla de redirección (**Rules → Redirect Rules**) o con `public/_redirects`.
5. Las cuentas, la base de datos, el correo y los Workers siguen fuera de esta versión. Cada uno necesita su propia aprobación (`docs/EXTERNAL-SERVICES.md` §4).
