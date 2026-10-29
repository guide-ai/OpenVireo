# Servicios externos, alojamiento y backend

Actualizado el 27 oct 2026. Las decisiones aprobadas también constan en `AGENTS.md`, que es la fuente que rige.

## 1. Decisiones tomadas (usuario, 27 oct 2026)

| Tema | Decisión |
|---|---|
| Catálogo de las cámaras CCD/IR | El servicio original (`http://www.nofs.navy.mil/cgi-bin/vo_cone.cgi`) no respondió el 27 oct 2026, así que ni el CLEA original puede tomar imágenes hoy. Se sustituye por CDS/VizieR, NOMAD (I/297) y USNO-B1 (I/284), con dos modos: **(A)** extractos estáticos acotados para los campos de los ejercicios, publicados con su consulta, fecha, hash y las citas de CDS/VizieR y del catálogo; **(B)** consulta en vivo desde el navegador para cualquier campo, como hacía el original. VizieR respondió con `Access-Control-Allow-Origin: *`, así que no hace falta backend propio. El espejo oficial de CfA (`vizier.cfa.harvard.edu`) queda cubierto por la misma aprobación (27 oct 2026), registrando en la procedencia qué host sirvió cada extracto o respuesta. |
| Datos de Object X | Se aprueban `Orbit/ObjX_AST.CMO` (4 750 326 B) y `Orbit/ObjX_MPC.CMO` (30 989 466 B), byte a byte. Los hashes están en `AGENTS.md`. |
| GSC para LSS | Subconjuntos acotados de N2230/N3000, solo para la franja LSS. |

Condiciones del modo en vivo (B):
- solo envía a CDS las coordenadas y el radio de la consulta;
- se etiqueta como adaptación web (VOTable de VizieR en lugar del ASCII de NOFS);
- las pruebas usan respuestas grabadas, para que sean deterministas;
- si VizieR no responde, la cámara lo dice con claridad y no inventa campos.

Las condiciones de CDS piden citar el conjunto de datos y el servicio ("CDS/VizieR", DOI 10.26093/cds/vizier). La redistribución depende de la licencia de cada catálogo, que hay que comprobar antes de publicar extractos.

## 2. ¿El sitio puede ser estático?

**El simulador sí; el producto completo, probablemente no.** Todo lo que existe hoy y todo lo de las fases 1–3 corre en el navegador: catálogos, simulación, mediciones y guardado en JSON. Es así por diseño, porque los cálculos son deterministas y comprobables. VizieR tampoco necesita backend. Sin embargo, estas funciones previsibles sí lo necesitan:

| Necesidad | ¿Backend? | Alternativa sin backend propio |
|---|---|---|
| Saber si el sitio se usa (condición para la fase 4) | No necesariamente | Analítica agregada sin cookies del propio proveedor de hosting. |
| Cuentas de estudiante y guardar el trabajo entre dispositivos | **Sí** (autenticación y base de datos) | Hoy se descarga y se vuelve a cargar un JSON. |
| Funciones para docentes: clases, entregas, ver el avance del grupo | **Sí** | No hay. |
| Caché o proxy de VizieR si limita el uso o deja de responder | Opcional | Extractos estáticos (A). |
| Programas de la fase 4 (Sol, XMM, Júpiter…) | Desconocido | Se sabrá tras inventariar `CLEA_Labex1.zip`. |

Si hay cuentas de estudiantes, y sobre todo de menores, aparecen obligaciones de privacidad (por ejemplo COPPA y FERPA en EE. UU., o el RGPD en Europa). Eso pesa más en la elección que el hosting en sí.

**Recomendación:** publicar primero el simulador como sitio estático en una plataforma que permita añadir backend después sin migrar. El backend se agrega cuando haya una necesidad concreta (cuentas o docentes), no antes.

## 3. Opciones de alojamiento

Medidas de hoy: build de unos 75 MB y 1194 archivos. Con los archivos de Object X y los paquetes LSS quedará en torno a 115 MB. El archivo más grande será `ObjX_MPC.CMO`, de 31 MB.

| Opción | Estático | Backend después | Límites relevantes | Encaje |
|---|---|---|---|---|
| **Cloudflare** (Pages o Workers con assets, más Workers, D1 y R2) | Sí, plan gratuito | Workers (funciones), D1 (SQL), R2 (archivos) en la misma cuenta | **25 MiB por archivo** y 20 000 archivos en el plan gratuito. `ObjX_MPC.CMO` no cabe como asset y habría que servirlo desde R2. | **Recomendada**: mismo proveedor para estático y backend, analítica sin cookies. |
| **GitHub Pages** | Sí, gratis, desde `guide-ai/OpenVireo` | No; el backend iría aparte (por ejemplo Supabase o Fly.io) | Sitio de hasta 1 GB y 100 GB/mes de ancho de banda (límite blando) | La más simple para empezar, pero obliga a otro proveedor para el backend. |
| **Netlify** | Sí | Functions y almacenamiento | El plan gratuito usa créditos (300/mes), lo que hace el consumo menos predecible | Válida. |
| **Vercel** | Sí | Functions | El plan Hobby solo admite uso personal no comercial. Si el proyecto pertenece a una organización, conviene el plan Pro (20 USD por asiento al mes). | Menos adecuada. |
| **VPS propio** (Hetzner, DigitalOcean…) | Sí | Lo que haga falta | Mantenimiento, seguridad y copias de respaldo a nuestro cargo | Solo si algún día hace falta algo que las plataformas no permitan. |

## 4. Decisiones que necesito

**Decidido por el usuario el 27 oct 2026:**

- **Cuentas:** sí habrá creación de cuentas, así que el producto tendrá backend (autenticación y base de datos).
- **Qué se guarda (nivel B):**
  - **Perfil mínimo:** correo para entrar y un alias. El nombre real no es obligatorio.
  - **Investigaciones en la nube:** el mismo JSON de "Save investigation", con nombre y fecha. Se guardan en R2, con el índice en D1.
  - **Preferencias:** tema, idioma y opciones del telescopio.
  - **Progreso y resultados:** el avance por ejercicio (los 7) y los resultados clave del estudiante (por ejemplo H₀, la DM del púlsar, la distancia de las Pléyades o el tipo del Objeto X), calculados a partir de las investigaciones guardadas, sin rastreo adicional.
  - **Fuera de la primera versión:** las funciones para docentes (nivel C: clases, entregas, panel del profesor). El modelo de datos debe permitir añadirlas después sin migrar.
- **Público:** general, cualquier persona y sin institución. Por eso las cuentas son opcionales y el simulador funciona sin entrar. Se guardan los datos mínimos, el usuario puede exportar y borrar su cuenta, y hay que fijar una edad mínima en los términos, porque puede haber menores (COPPA; RGPD con 13–16 años según el país).
- **Entrada:** enlace por correo, sin contraseña. Enviar esos correos requiere un servicio de envío, que es otro servicio externo y se elegirá y aprobará al implementar el backend.
- **Proveedor:** Cloudflare (sitio estático, y Workers, D1 y R2 cuando haga falta backend).
- **Dominio y despliegue:** todavía no hay dominio ni cuenta; el usuario comprará un dominio pronto. Mientras tanto no se despliega nada y la prohibición de `AGENTS.md` sigue vigente.
- **Analítica:** sí, métricas de visitas. Propuesta por defecto: Cloudflare Web Analytics, agregada y sin cookies.

Preguntas que siguen abiertas:


1. **Público y cuentas:** ¿quién usará el sitio (universidades, secundaria, público general)? ¿Hacen falta cuentas o funciones para docentes en la primera versión? De eso depende si el primer despliegue incluye backend.
2. **Proveedor:** ¿Cloudflare (recomendado), GitHub Pages u otro? ¿Bajo qué cuenta u organización, y con qué dominio?
3. **Despliegue:** `AGENTS.md` prohíbe hoy el alojamiento público y el despliegue. Para publicar hace falta tu aprobación explícita de ese cambio.
4. **Analítica:** ¿solo contadores agregados sin cookies, o algo más?

## 5. Recursos originales que faltan aprobar

**Estado:** los grupos 1 y 2 quedaron aprobados por el usuario el 27 oct 2026, con los términos exactos en `AGENTS.md`. De las plantillas jspect2 solo entran las que pidan las estrellas de los campos publicados.

Para el inventario se compararon los 698 archivos de `CLEA_Vireo.zip` (todos con SHA-256) con el manifiesto y las aprobaciones, y con las cadenas de nombres de archivo de `CLEA_VEO.exe`. La lista completa por archivo está en la carpeta de investigación (`resource-inventory/members.tsv`). Solo se incluye lo que las fases 1–3 necesitan.

### Grupo 1 — archivos pequeños (~145 KB en total), byte a byte

| Archivo | Para qué | Tamaño · SHA-256 | Confianza |
|---|---|---|---|
| `Spectra/Galaxies/GLXYSP.LST` | Asociar galaxias con su espectro: Coma-2 (NGC 4889) en Hubble; NGC 4670 y NGC 4889 en LSS; NGC 4262, 4449 y 4631 en Object X. El ejecutable lo carga por defecto (0x5a23f7). | 576 B · `0a7a352d37c5a899e2304048c660b7703646fbb616f49e5c7ddf75b84d3c166a` | Confirmada |
| `Spectra/Galaxies/NGC4670.SP` | Espectro de NGC 4670 (LSS, campo 3) | 27 616 B · `228149e937449b4731421c0b81fc14545dabc514cd3af4a1c9b4e78f8f12170a` | Probable |
| `Images/Galaxies/GLIMAGES.LST` | Asociación con imágenes fotográficas, que cambia qué galaxias se pueden adquirir. Hoy solo hay una versión derivada que pierde 4 columnas. | 10 103 B · `fd5b98163259b3b4f7e0da1185930ef393e349fbfa07bcc3b6abfd97552c0a01` | Confirmada |
| `QSOSpect.dat` | Espectros de cuásares: 3C 273, HE 0353-3919 y HS 1603+3820 en Object X, y cualquier cuásar que caiga en la rendija. | 49 506 B · `7ab662914042f0cf9213b3e988834fc61d68f57751f89f9d69e46f06e7d7a9cd` | Probable |
| `Spectra/jspect2/JSPEC2.SPI` | Índice de plantillas estelares, para adquirir cualquier estrella del campo con el motor general. | 3 168 B · `5abf48cbd3e52a18278c9bd38ad939f6f019ee80f28743d5486dec59c677a0aa` | Confirmada |
| `Spectra/jspect2/A0000046.SP` y las demás plantillas concretas que pidan las estrellas de los campos (no las 106 restantes) | Estrellas de Object X, por ejemplo N3000-01915. | 55 980 B · `ed50d12a757da8eb063188e6f2da3c7e7842a68b21c4eb4e35c5a1cff654414c` | Probable |
| `LSSFields.LST` | Nombres y centros de los 9 campos del formulario "Select LSS Field". Sin él, los nombres se toman de las HTL y se etiqueta como adaptación. | 460 B · `1c9cdcc56bd3b5cd801f519104e95bb671b2305818afb47ad8369f04af64070f` | Opcional |
| `VarTypeHlp.TXT` | Texto "List Type Codes" de la ventana de estrellas variables. Se puede reescribir con texto propio. | 743 B · `d92f4a14aa7a2923d2921d4ab7fe90a38870e8667b7274629884b69bb6c5f445` | Opcional |

### Grupo 2 — subconjuntos acotados del GSC (±0,375° por objetivo, como en LSS)

- **Object X**: un subconjunto por cada objetivo de espectroscopía de `ObjectX.HTL`. Afecta a las bandas N6000 (NGC 2403), N0730 a 12,3 h (NGC 4262), N3730 (NGC 4449 y HS 1603+3820), N3000 a Dec 32,3–32,5° (NGC 4631, fuera de lo aprobado para LSS), N0000 a 12,48 h (3C 273) y S3730 (HE 0353-3919). Además, N1500, porque las áreas de NGC 4262 y N0730-00120 cruzan +15°; está cubierta, ya que la aprobación es por área de objetivo y no por banda (coordinador, 27 oct 2026). Si el telescopio construye campos de asteroides, que dependen de la fecha, harán falta más.
- **Hubble UM-I-3** (objetivo 36805, banda N5230): queda a unos 5′ de los campos ya publicados y probablemente lee otros registros.
- **Reutilizar los registros de la franja LSS para Hubble**: Coma-1/2 y Boötes-1/2 caen dentro de los paquetes LSS, pero la aprobación dice "solo para la franja LSS". Pido permiso para usar esos mismos registros en esos objetivos, sin añadir datos nuevos.

### Lo que no hace falta en las fases 1–3

Programas nativos e instaladores; sonidos WAV; imágenes de interfaz, cursores e iconos; las 114 estrellas de carbono; las otras 26 galaxias SP y las 104 plantillas jspect2 restantes; `JACOBY2.INX`; isócronas `isocsumm*` e `isocz019nov`; claves de respuestas (`CLASSIFY.KEY`, `Unknowns.xls`), porque nada se califica; registros de demostración; `ObjX_MPC.CMO.sav`; y la documentación y los textos de ayuda (sirven de fuente para escribir las guías, no se publican).

### Necesidades que no están en el zip

- **Catálogo de cámaras:** resuelto con VizieR (§1). Para el filtro I, la CCD usa USNO-B1.
- `http://xena.harvard.edu/software/catalogs/tmpsc.html` aparece en el ejecutable con un papel desconocido; posiblemente sea 2MASS para la cámara IR. Se investigará con la cámara IR.
- **Archivo HST:** decidido por el usuario el 2026-10-28 (AGENTS.md) y aplicado en Front O2 (docs/QSO-LIST-HST.md). Tools › HST Image Archive... es un enlace externo que se abre en una pestaña nueva solo al hacer clic (`rel="noopener noreferrer"`), sin enviar datos ni hacer peticiones antes. La dirección original, `http://hubblesite.org/newscenter/archive/browse/`, ya no lleva al archivo: el 2026-10-28 el puerto 80 rechazó la conexión, y por https redirige a la portada de la misión en science.nasa.gov. El enlace usa su equivalente actual en el mismo sitio, `https://hubblesite.org/resource-gallery/images`, que redirige a la galería «Hubble Images» de science.nasa.gov. El diálogo THSTImgDlg nunca se muestra en el original y no contiene ninguna URL de MAST.
- **Medición de posiciones en Object X:** el original usa herramientas externas (CLEA Toolkit y SAOImage DS9). La web necesita su propia herramienta de medición; ningún programa nativo se puede incluir.
- **Anomalía del original:** `GLIMAGES.LST` nombra imágenes que no están en el zip, entre ellas NGC4449.BMP, un objetivo de Object X. Hay que ver qué hace el original cuando falta el archivo.
