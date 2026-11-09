# Publicar OpenVireo 1.0 en Cloudflare Pages

Guía paso a paso para publicar la versión 1.0 como sitio estático en tu cuenta de Cloudflare, primero con la dirección gratuita `*.pages.dev` y, desde el 8 de noviembre de 2026, con el dominio propio `https://openvireo.space` (§ 10). Sigue la decisión del 7 de noviembre de 2026 (`AGENTS.md`):

- Se publica solo el sitio estático: la salida normal de `npm run build`, sin código de la nube opcional.
- Las investigaciones se guardan solo en el equipo del estudiante.
- La analítica de visitas es agregada y sin cookies (Cloudflare Web Analytics).
- No se despliegan cuentas, base de datos, correo ni Workers.

Desde el 8 de noviembre de 2026 (decisión tuya, `AGENTS.md`), cada push a `main` que pasa todas las pruebas se publica solo, con GitHub Actions (§ 11). El despliegue a mano de los pasos 4–6 sigue sirviendo para la primera vez o para emergencias, y lo ejecutas o autorizas tú. Ningún agente inicia sesión en Cloudflare por ti ni ve el token.

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
- Al terminar, Wrangler muestra la dirección del despliegue (`https://<id>.openvireo.pages.dev`). La dirección de producción es `https://openvireo.space`; `https://openvireo.pages.dev` redirige a ella (§ 10).
- Subir unos 676 MiB tarda varios minutos. Si se corta, repite el comando: Pages solo sube los archivos que faltan.
- **Regla para versiones futuras:** nunca cambies los bytes de un archivo que ya está publicado en `/original/…` o `/camera/…`. Esos archivos se guardan en la caché un día por su nombre. Si hay que volver a trocear un original o rehacer un extracto, publícalo con una ruta nueva (y su SHA-256 en el manifiesto).

## 7. Activar Web Analytics (una sola vez)

1. En el panel: **Workers & Pages → openvireo → Metrics → Web Analytics → Enable** (en algunas versiones del panel: **Analytics & Logs → Web Analytics**).
2. Pages inserta por sí solo el script de medición (`static.cloudflareinsights.com/beacon.min.js`) en las páginas HTML del siguiente despliegue. Vuelve a desplegar (paso 6) para que aparezca.
3. La CSP de `public/_headers` ya admite `https://static.cloudflareinsights.com` (script) y `https://cloudflareinsights.com` (envío de datos). No hay que cambiar el código ni añadir ningún token al repositorio.
4. Web Analytics no usa cookies ni crea perfiles de visitante. El aviso de privacidad de la aplicación (Help › About OpenVireo and privacy) lo explica.

Si al cabo de un día el panel no muestra visitas, comprueba en la consola del navegador que el script no está bloqueado. Si la causa fuera `Referrer-Policy: same-origin`, cámbiala a `strict-origin-when-cross-origin` en `public/_headers`. Esto no se pudo verificar sin contactar con Cloudflare.

## 8. Lista de comprobación después de desplegar

1. Abre `https://openvireo.space`. Se muestra el observatorio ("Start with the sky.").
2. Recorre brevemente cada ejercicio y comprueba que carga sin errores en la consola del navegador (F12):
   - **Hubble** (`/#galaxy-exposure`, y Analyzer → *Hubble diagram & distances*);
   - **Estructura a gran escala** (`/#lss-survey`);
   - **Clasificación estelar** (`/#classification`);
   - **Fotometría de las Pléyades** (`/#photometer`);
   - **Diagramas HR de cúmulos** (`/#cluster-database`);
   - **Púlsares** (`/#radio-control` y `/#pulsar-analysis`);
   - **Objeto X** (`/#object-x`). Elige *Orbit file → ObjX_MPC.CMO* y pulsa *Build the asteroid list…*: la lista debe construirse sin error.
3. Cámaras: apunta a un campo, marca *Ask VizieR live* y haz una exposición corta. La imagen debe aparecer y los detalles deben nombrar el servidor de VizieR que respondió.
4. Abre **Help › About OpenVireo and privacy** y comprueba el aviso de privacidad y los créditos (Project CLEA, NSF, Gettysburg College y ATNF).
5. Comprueba las cabeceras desde una terminal:
   ```sh
   curl -sI https://openvireo.space/ | grep -iE 'content-security-policy|x-content-type-options|referrer-policy|permissions-policy|x-frame-options|cache-control'
   curl -sI https://openvireo.space/original/hotlists/Hubble.HTL | grep -i cache-control
   curl -s https://openvireo.space/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'   # copia la ruta para el siguiente
   curl -sI https://openvireo.space/assets/index-XXXX.js | grep -i cache-control
   ```
   Lo esperado:
   - en `/`: `cache-control: no-cache` y la CSP completa;
   - en `/original/…`: `public, max-age=86400, stale-while-revalidate=604800`;
   - en `/assets/…`: `public, max-age=31536000, immutable`.
6. Comprueba que el archivo entero de 31 MB no está publicado: `curl -sI https://openvireo.space/original/orbit/ObjX_MPC.CMO` debe devolver `404`, nunca `application/octet-stream` de 30 989 466 bytes.

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

## 10. Dominio propio: openvireo.space

Desde el 8 de noviembre de 2026 el sitio se publica en `https://openvireo.space` (decisión tuya, `AGENTS.md`). Así quedó configurado, por si hay que rehacerlo:

1. **Registro:** el dominio está registrado en Namecheap. Un dominio nuevo no puede transferirse a otro registrador durante 60 días; no hace falta transferirlo para usarlo con Pages.
2. **DNS en Cloudflare:** **Add a domain → Connect a domain** con `openvireo.space`, plan Free. Al importar los registros se borraron el `A` y el CNAME `www` de la página de estacionamiento de Namecheap, y también sus MX y TXT de reenvío de correo, que dejan de funcionar fuera del DNS de Namecheap. En Namecheap, **Domain List → Manage → Nameservers → Custom DNS** con los dos servidores que da Cloudflare (`bryce.ns.cloudflare.com` y `diana.ns.cloudflare.com`), con DNSSEC desactivado. El registro de `.space` puede tardar en recibir el cambio; mientras tanto Cloudflare muestra "Invalid nameservers".
3. **Dominios de Pages:** **Workers & Pages → openvireo → Custom domains → Set up a custom domain**, primero `openvireo.space` y después `www.openvireo.space`. Cloudflare crea los registros DNS y los certificados.
4. **www → sin www:** en la zona `openvireo.space`, **Rules → Overview → Redirect from WWW to root** (`https://www.*` → `https://${1}`, 301, *Preserve query string*). El aviso de que `www` no está detrás del proxy es falso: el registro lo creó Pages y sí pasa por Cloudflare; se despliega con *Ignore and deploy rule anyway*.
5. **openvireo.pages.dev → dominio:** con **Bulk Redirects**, en el nivel de la cuenta, porque `pages.dev` no es una zona tuya y ni las Redirect Rules ni `public/_redirects` pueden redirigirlo. Una entrada: origen `openvireo.pages.dev`, destino `https://openvireo.space`, 301, con *Preserve query string*, *Subpath matching* y *Preserve path suffix*, y **sin** *Include subdomains*, para que las vistas previas `<id>.openvireo.pages.dev` sigan funcionando.
6. **Comprobación:** las cabeceras del paso 8.5 en el dominio, y que `www.openvireo.space` y `openvireo.pages.dev` respondan `301` hacia `https://openvireo.space` conservando ruta y parámetros:
   ```sh
   curl -sI https://www.openvireo.space/a?b=1 | grep -iE '^HTTP|^location'
   curl -sI https://openvireo.pages.dev/a?b=1 | grep -iE '^HTTP|^location'
   ```
7. El correo del dominio (por ejemplo Cloudflare Email Routing), las cuentas, la base de datos y los Workers siguen fuera de esta versión. Cada uno necesita su propia aprobación (`docs/EXTERNAL-SERVICES.md` §4).

## 11. Despliegue automático (CI/CD con GitHub Actions)

El flujo `.github/workflows/ci-cd.yml` corre en GitHub en cada push y en cada pull request:

1. **Tipos, pruebas unitarias y recursos:** `tsc`, Vitest, la comprobación de los recursos originales y de los límites de Pages.
2. **Pruebas del navegador:** la suite completa de Playwright, repartida en 4 trabajos en paralelo.
3. **Compilación y pruebas de Pages:** `npm run build` y `npm run test:pages`, que sirve `dist/` con `wrangler pages dev` en local (sin cuenta).
4. **Despliegue:** solo en un push a `main`, y solo si los tres anteriores pasan. Compila de nuevo y publica `dist/` en el proyecto `openvireo` con `wrangler pages deploy … --branch=main`.

Si una prueba falla, no se despliega nada y la versión publicada sigue igual. GitHub te avisa por correo. Las evidencias del fallo quedan 7 días como artefacto del run (**Actions → el run → Artifacts**).

### 11.1 Configuración (una sola vez, la haces tú)

El flujo necesita dos secretos. Se guardan en el **entorno** `production` de GitHub, que solo puede usar la rama `main`. Así, ningún flujo de otra rama (incluidas las ramas `claude/…` de los agentes) puede leerlos. Nunca van en el repositorio, en `.env` ni en los registros.

1. **Crea el entorno y limítalo a `main`:**
   1. Entra en **GitHub → guide-ai/OpenVireo → Settings → Environments → New environment**.
   2. Ponle el nombre `production`.
   3. En **Deployment branches and tags**, elige **Selected branches and tags → Add deployment branch or tag rule → `main`**.
   4. No añadas revisores: el despliegue es automático (decisión del 8 de noviembre de 2026).
2. **Crea un token de Cloudflare solo para Pages:**
   1. Entra en **dash.cloudflare.com → icono de perfil → My Profile → API Tokens → Create Token**.
   2. Elige **Create Custom Token**.
   3. En **Permissions**, añade solo **Account · Cloudflare Pages · Edit**.
   4. En **Account Resources**, elige **Include · tu cuenta**.
   5. Opcional: pon una fecha de caducidad (**TTL**) y apúntala para renovarlo.
   6. Pulsa **Continue to summary → Create Token** y copia el token. Cloudflare solo lo muestra una vez.
3. **Busca el ID de tu cuenta.** Está en el panel (**Workers & Pages → Account details → Account ID**) o en la salida de:
   ```sh
   worker/node_modules/.bin/wrangler whoami
   ```
4. **Guarda los dos valores como secretos del entorno `production`.** Desde la raíz del proyecto, con `gh` autenticado:
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN --env production -R guide-ai/OpenVireo
   ```
   ```sh
   gh secret set CLOUDFLARE_ACCOUNT_ID --env production -R guide-ai/OpenVireo
   ```
   Cada comando te pide el valor y no lo muestra. También puedes hacerlo en **Settings → Environments → production → Environment secrets → Add environment secret**.
5. **Lanza el primer despliegue automático:** haz un push a `main`, o abre **Actions → CI/CD → Run workflow** sobre `main`.

### 11.2 Uso diario

- **Publicar:** fusiona en `main` y haz push. El run completo tarda unos 25–35 minutos; la dirección de producción es `https://openvireo.space`.
- **Ver el estado:** **GitHub → Actions**, o desde la terminal:
  ```sh
  gh run list -R guide-ai/OpenVireo --limit 5
  ```
- **Fuera del horario de clase:** un despliegue obliga a recargar las pestañas abiertas (§ 6). Si una clase está en curso, espera para hacer push a `main` o trabaja en otra rama.
- **Volver atrás:** igual que en § 9 (rollback en el panel), o con `git revert` del commit y un push, que vuelve a desplegar la versión anterior.
- **Pull requests:** corren todas las pruebas pero nunca despliegan. Los de forks no tienen acceso a los secretos.
- **Cambiar el token:** crea uno nuevo (11.1), sustituye el secreto con `gh secret set CLOUDFLARE_API_TOKEN --env production -R guide-ai/OpenVireo` y revoca el anterior en Cloudflare.
- **Qué no corre en CI:** las pruebas del backend opcional (`worker/`, `playwright.cloud.config.ts`), porque ese backend no se despliega.
