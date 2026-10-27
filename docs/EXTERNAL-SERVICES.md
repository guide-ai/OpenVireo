# Servicios externos: evaluación y decisiones pendientes

Fecha: 27 oct 2026. Responde al punto 4 de la conversación del 27 oct: "es muy probable que necesitemos servicios externos para que la herramienta quede completa". Hasta que decidas, rige la regla de `AGENTS.md`: sin backend ni servicios.

## 1. Qué depende de algo externo

| Necesidad | Para qué | Tipo | Estado comprobado |
|---|---|---|---|
| Catálogo NOMAD / USNO-B1 | Cámaras CCD e IR (I04, I05) y, por tanto, Object X (E08) | Servicio en línea | El original consulta `http://www.nofs.navy.mil/cgi-bin/vo_cone.cgi` (`docs/CAMERA-PIPELINE-AUTHORITY.md`). El 27 oct 2026 ese host no respondió: **ni el CLEA original puede tomar imágenes CCD hoy**. |
| Mismo catálogo vía VizieR (CDS) | Sustituto del anterior | Servicio en línea | `https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out` respondió con filas de NOMAD y `Access-Control-Allow-Origin: *`. Un navegador puede consultarlo sin backend propio. |
| Archivos de órbitas de Object X | E08 | Datos locales del instalador, no un servicio | En `CLEA_Vireo.zip`: `Orbit/ObjX_AST.CMO` (4 750 326 B, SHA-256 `341134bf9033989fa2c7fa9008551fa8ef015ee158ec5a25c04754696e58ba12`) y `Orbit/ObjX_MPC.CMO` (30 989 466 B, SHA-256 `b41e03f14dcef5a54dea67e156e0e7cf2b654432a85bf6d10611ed8e6d25802e`). No están en la lista aprobada el 26 oct. |
| Alojamiento del sitio | Saber si el sitio "va a ser usado" (condición para la fase 4) | Hosting estático | `AGENTS.md` prohíbe hoy el alojamiento público y el despliegue. Sin publicar el sitio no se puede medir el uso. |
| Programas de la fase 4 (Sol, XMM, Júpiter…) | Futuro | Desconocido | Hay que inventariar `CLEA_Labex1.zip` antes de saberlo. Se evaluará entonces. |

LSS (E02) y los puntos 2.3–2.7 del observatorio **no** necesitan servicios: usan `CLEA_GLX.DAT`, las `LSS_FieldNN.HTL` (ya aprobadas) y datos locales.

## 2. Opciones para el catálogo de la cámara

**A. Extractos estáticos (recomendada para cerrar los ejercicios).** Un script local consulta VizieR una vez por cada campo que usan los ejercicios (los de Object X y los que admita la cámara). El resultado se guarda como JSON con la consulta, la fecha, el hash y la cita de CDS/NOMAD. La app no hace llamadas en tiempo de ejecución.
- A favor: funciona sin conexión, es determinista y se puede probar en e2e. Cumple la regla actual de "sin servicios" en tiempo de ejecución.
- En contra: solo cubre campos predefinidos, igual que el resto de la app hoy. Implica publicar subconjuntos de NOMAD. CDS lo permite para uso no comercial con cita, pero hay que comprobar las condiciones antes de publicar.

**B. Consulta en vivo a VizieR desde el navegador.** Equivale al comportamiento original, que admite cualquier campo.
- A favor: cualquier campo, sin backend.
- En contra: depende de que CDS esté disponible, los resultados no son deterministas (las pruebas tendrían que usar respuestas grabadas) y se envían a CDS las coordenadas que mira el estudiante. Además, VizieR devuelve VOTable, no el formato ASCII de NOFS que ya se recuperó, así que hace falta un adaptador etiquetado como adaptación web.
- Se podría ofrecer como modo opcional "catálogo en línea", sumado a A.

**C. Backend o proxy propio.** No hace falta, porque VizieR ya permite CORS. Se descarta mientras no haya otra necesidad.

## 3. Decisiones que necesito

1. **Catálogo de la cámara:** ¿apruebas A (extractos estáticos de VizieR, publicados con su cita)? ¿Y B como modo opcional?
2. **Object X:** ¿apruebas incluir byte a byte `ObjX_AST.CMO` y `ObjX_MPC.CMO`, con la misma base de licencia que la aprobación del 26 oct? Juntos pesan unos 36 MB. Si no, E08 queda fuera.
3. **Alojamiento:** ¿quieres publicar el sitio como estático (por ejemplo GitHub Pages desde `guide-ai/OpenVireo`) para medir el uso? Si sí, ¿con alguna analítica, o solo contadores agregados sin cookies?

Sin la decisión 1 no se puede cerrar E08 ni las cámaras. Lo demás de las fases 1–3 avanza sin estas decisiones.
