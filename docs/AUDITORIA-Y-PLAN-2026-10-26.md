# OpenVireo: auditoría del avance y plan para terminar funcionalidades

Corte auditado: `7c8e26a` (rama `claude/three-phase-workflow`), 26 oct 2026.
Fuente original contrastada: `CLEA_VEO.exe` de VIREO (SHA-256 `781bc970…c52c54c`). Lo inspeccioné estáticamente con REA (`inspect-pe-resources`) y decodifiqué sus 81 formularios Delphi: menús, botones y opciones. No ejecuté CLEA.
Método: leí el código de la app y la abrí en el navegador local; corrí las pruebas unitarias y el typecheck. Cinco revisiones de solo lectura repasaron las cuatro áreas del original y el informe. No cambié código.

---

## 1. Resumen

- **El informe de inventario es correcto en los datos, pero da una imagen engañosa.** Sus cifras se pueden comprobar: las pruebas, los 1279 recursos y los 92 archivos de evidencia existen. Lo que falla es el encuadre:
  - Mide el avance con 64 entradas que valen lo mismo.
  - 10 de esas entradas pertenecen a otros programas de CLEA que todavía no se han empezado.
  - "Parcial" junta cosas casi terminadas con cosas apenas empezadas.
  - No dice qué puede terminar hoy un estudiante.
- **Qué puede terminar hoy un estudiante, de los 7 ejercicios de VIREO:**
  - Pléyades y Clasificación: sí, con límites.
  - Hubble: sí, pero solo con 3 de las 13 galaxias.
  - Cúmulos HR: solo por la ruta de base de datos.
  - Púlsares: no. Falta el catálogo de púlsares y no hay guía.
  - LSS y Object X: no.
- **Hay tres causas del avance lento:**
  1. **Se busca una fidelidad extrema en cada rama pequeña.** Cada objeto o instrumento nuevo exige recuperar su propio campo y su propia rama del binario. No hay un motor general de campos conectado a la interfaz.
  2. **El esfuerzo no está priorizado.** Desde el 22 de octubre, el 100 % de los commits fueron a Radio, aunque el propio plan manda cerrar primero Hubble como piloto. Además, después de que el camino principal de Radio ya funcionaba, se escribieron unas 21 mil líneas en cosas periféricas: cuatro puntos de entrada a un mismo guardado verificado, formato y búsqueda de la Hot List, audición y foco. Mientras tanto, los 4 bloqueos que impiden usar el ejercicio no recibieron ningún commit.
  3. **Faltan decisiones tuyas sobre datos.** El instalador original trae `Pulsars.dat`, las listas `.HTL` de los ejercicios y los catálogos de galaxias, variables y QSO. Ninguno está en la app, porque añadir recursos fuera de los 1279 aprobados necesita tu permiso. Eso bloquea más que cualquier tarea de código.
- **Cómo se reparte lo escrito:** un 33 % es documentación y procedencia, un 39 % son pruebas y solo un 28 % es código de producto. Ese 28 % incluye unos 0,55 MB de texto explicativo de la interfaz.

---

## 2. Validación del informe `OpenVireo_Inventario_general_2026-10-26.docx`

### Lo que es correcto
| Afirmación | Verificación |
|---|---|
| Commit `7c8e26a` | Coincide con HEAD. |
| 2944 pruebas en 234 archivos | Mi ejecución dio 2945 pruebas en 235 archivos. La diferencia es un archivo de prueba temporal sin commit (`src/core/tmpProbe.test.ts`). Hay 11 pruebas omitidas, cosa que el informe no menciona. |
| 1279 recursos comprobados | Sí: los 1279 coinciden en tamaño y SHA-256. |
| Typecheck | `tsc --noEmit` pasa. El build no lo volví a correr. |
| Evidencias citadas | Los 92 archivos citados existen. Algunos tienen contenido viejo: `RADIO-ANTENNA.md` todavía habla de un candidato anterior con 2251 pruebas. |
| D07, I06, I07 y P04 pasan de pendiente a parcial | I06, I07 y P04 sí tienen trabajo nuevo de Radio. La evidencia de D07 (DAT) es anterior al registro del 22 de octubre; lo único nuevo en D07 es la exportación de Radio. |
| P01 completo | Tiene acta técnica. Hay unos 146 KB de texto de interfaz fuera del catálogo de textos que verifica P01. |

### Lo que es inexacto o engañoso
1. **Dice que los criterios no cambiaron, y sí cambiaron.** Desde el commit base `b6537f6` se reescribieron 11 criterios: A06, A08, D05, I01, I08, I10, N03, N04, P02, E04 y E05. Varios pasaron a ser descripciones del estado actual, por ejemplo "A06 is not complete". Así "completo" se convierte en una meta que se mueve.
2. **El conteo 1/46/15/1/1 no está en el repo.** Es una reclasificación de quien redactó el informe. El registro del repo (`docs/ACCEPTANCE-CURRENT.json`) sigue marcando D07, I06, I07 y P04 como bloqueados.
3. **El denominador mezcla cosas muy distintas.**
   - Las 6 entradas Q son frentes de calidad, no capacidades.
   - E07, E09–E15, X01 y X02, que son 10 entradas, son otros programas de CLEA. Sus instaladores están en `CLEA_Labex1.zip`, pero no se han extraído ni inspeccionado.
   - Si se cuenta solo VIREO, quedan 54 entradas.
4. **"Parcial" no distingue el grado de avance.** E03 y E04 casi se pueden usar; E02 y E05 solo analizan datos suministrados; D05 cubre una única variante de FITS.
5. **Hay entradas subestimadas y sobrestimadas.**
   - P02 está subestimado. Radio, LSS, imágenes FITS y la observación HR no se guardan en absoluto en "Save investigation". No es que se guarden "no íntegramente".
   - I02 está sobrestimado por lo vago. "Adquisiciones admitidas" significa 1 estrella y 3 galaxias.
6. **Omite problemas visibles en la interfaz.** La página de Radio todavía dice que la grabación, Align y la adquisición no están disponibles, y sí lo están (`src/i18n/en.json:2129`, `:2138`, `:2146`). Las páginas están llenas de notas técnicas que un estudiante no puede entender.
7. **"50 flujos sin omisiones" es una muestra.** Equivale a cerca del 7 % de la suite e2e: 136 archivos y unas 896 pruebas. La suite completa no se corrió en este corte.
8. **No explica el orden del trabajo ni el tiempo que falta.** No dice que todo lo posterior al 22 de octubre fue Radio, aunque el plan pide terminar Hubble primero. Tampoco da una estimación de lo que queda.

---

## 3. El original contra la app

Inventario de VIREO extraído con REA: 81 formularios. Incluyen el panel de entorno con 7 ejercicios y el "Virtual Observatory"; el telescopio óptico y el de radio; fotómetro, espectrómetro, multiespectrómetro, cámara CCD y cámara IR; clasificación, medición de espectros, diagrama HR, cuña LSS y análisis de púlsares; estrellas variables y curvas de luz; Object X; el archivo HST; y las opciones, sitio, hora y Hot Lists.

### Por área
| Área | Qué se puede usar | Qué falta |
|---|---|---|
| Observatorio óptico | Abrir la cúpula, ver el cielo GSC hasta magnitud 12, apuntar, mover N/S/E/W, slew programado, 3 telescopios, reloj UT/LST, Hot List propia. | No existe el diálogo de opciones ópticas. Faltan Request Time, la información de campo y de variables, Print, sitio y fecha editables, y la entrada de coordenadas en h/m/s y en B1950. Uso aproximado: 20–25 %. |
| Espectrómetro | 5 configuraciones fijas: 1 campo de cielo, 1 estrella y 3 galaxias. | Adquisición de cualquier objetivo, rango espectral y guardar o imprimir. |
| Fotómetro | Banco de las Pléyades con 16, 14 y 10 de las 24 estrellas (según telescopio), filtros UBV y aperturas 5, 10 y 15. | No se llega apuntando el telescopio. Faltan R/I y cualquier campo general. |
| CCD, IR y multiespectrómetro | Nada. Solo hay diálogos informativos y un visor FITS. | La lógica de la cámara existe en el código pero no tiene interfaz, y depende de un catálogo en línea (NOMAD). El multiespectrómetro no tiene código. |
| Clasificación | Las 25 prácticas, los 8 atlas, las vistas traza/foto/combinada/diferencia, cursor y tipo manual. | El ancho equivalente solo funciona entre 3900 y 4500 Å; falta la tabla de líneas, invertir la traza y clasificar estrellas propias (hoy solo 1). |
| Medición de espectros | Cargar SP/CSV/SSP, listas de líneas y registrar z. | El zoom y pan son limitados, y la z medida no llega a "Observational Results". |
| Observational Results | Editores DAT/TXT/CSV, pero solo para archivos creados por el CLEA original. | Guardar, imprimir y buscar los resultados propios del estudiante. |
| HR de cúmulos | Los 16 cúmulos, ZAMS, isócronas y exclusiones. | El marco nativo (los ejes web ocultan 76 de los 609 puntos de 30 Dor), el informe de parámetros, la lista y búsqueda de cúmulos, y la ruta desde observaciones propias. |
| LSS | Cuña de un `.TXT` suministrado. | Selección de campos, adquisición de muchas galaxias, registro de redshift y Auto Plot. |
| Radio y púlsares | Panel, receptor, Record e Identify, análisis con cursores, registro y exportación CSV. Están montados y se llega a ellos. | `Pulsars.dat` no está incluido; hay unos 9 pasos de preparación manual; los textos contradicen la app; no hay una prueba de punta a punta con dos frecuencias ni una guía. |
| Variables, QSO, Object X y HST | Nada. | Todo. Además faltan `ObjectX.HTL` y los archivos de órbitas. |

### Por ejercicio de VIREO (puede un estudiante terminarlo hoy)
| Ejercicio | Estado real | Bloqueo principal |
|---|---|---|
| Pléyades (E04) | **Sí, con límites** | 8 de las 24 estrellas no se pueden medir; no hay guía; los resultados solo se guardan como JSON. |
| Clasificación (E03) | **Sí (prácticas)** | Solo 1 estrella propia; no hay guía. |
| Hubble (E01) | **Sí, débil** | Solo 3 de 13 galaxias, de 2 grupos, así que el ajuste tiene poco valor científico. |
| Cúmulos HR (E05) | **A medias** | La ruta de base de datos funciona; la de observación no. |
| Púlsares (E06) | **No (sí para un experto)** | Falta `Pulsars.dat`, la preparación es manual y los textos son contradictorios. |
| LSS (E02) | **No** | Falta adquirir muchas galaxias y elegir campos. |
| Object X (E08) | **No** | Faltan CCD, astrometría y datos. |

---

## 4. Decisiones que necesito de ti (bloquean más que el código)

1. **Incluir datos originales de VIREO que ya tienes en `CLEA_Vireo.zip`.** Por orden de impacto:
   - `Pulsars.dat` (285 KB) y `Pulsars.HTL`: desbloquean el ejercicio de púlsares.
   - `PLEIADES.HTL`, `Hubble.HTL`, `LSS_Field01–09.HTL` y `ObjectX.HTL`: son las listas de los ejercicios.
   - `CLEA_GLX.DAT`, `CLEA_VStrs.dat` y `CLEA_QSO.DAT` (4,4 MB): necesarios para más galaxias y para los campos con variables.
   - El GSC completo (~500 MB): solo hace falta para un motor de campos general. Se puede dejar para después.
   - Antes de incluirlos conviene revisar `License.rtf` y `Copyright.txt`. AGENTS.md exige tu aprobación expresa para añadir recursos.
2. **Redefinir "terminado".** Propongo que "terminado" signifique que un estudiante completa el ejercicio en la app con una guía, que hay una prueba e2e de ese recorrido, y que las adaptaciones web quedan etiquetadas. La fidelidad nativa de cada rama periférica deja de ser requisito para cerrar.
3. **Sacar del tablero principal E07, E09–E15, X01 y X02.** Son otros programas de CLEA y se tratarían como un proyecto posterior.

---

## 5. Plan de implementación (prioridad: terminar funcionalidades)

**Reglas de trabajo para Codex y Claude durante este plan**
- **Un tablero de 7 ejercicios.** Cada uno tiene una lista de pasos del estudiante, y los pasos se marcan en verde solo con una prueba e2e.
- **Límite de trabajo en curso.** Máximo 2 ejercicios a la vez. No se abre nada nuevo mientras un ejercicio del lote siga sin poder completarse.
- **Revisión por funcionalidad, no por microincremento.** Una revisión de Claude al cerrar cada funcionalidad completa.
- **Nada de variantes periféricas antes de que funcione el camino principal.** Por ejemplo, cuatro entradas a un mismo guardado, formatos de impresión o detalles de foco.
- **Las adaptaciones se etiquetan y se documentan en una línea**, no en un documento por contrato.
- **Siguen vigentes las reglas de AGENTS.md.** No se inventan datos, espectros ni ruido; lo incompleto se marca como tal; no se ejecuta CLEA.

Las estimaciones son en días de trabajo de un agente concentrado. No están calibradas.

### Fase 1: hacer completables 4 ejercicios (~1–2 semanas)
| # | Trabajo | Ejercicio | Esfuerzo | Depende de |
|---|---|---|---|---|
| 1.1 | Incluir `Pulsars.dat` y cargarlo automáticamente al activar Radio, como el original. El selector de archivo queda como alternativa. | E06 | S | Decisión 1 |
| 1.2 | Corregir los 3 textos contradictorios de Radio y quitar las etiquetas `+0x…` que ve el estudiante. | E06 | S | — |
| 1.3 | Botón "Iniciar ejercicio de púlsares" que haga los pasos de preparación. Avisar si Add Channel desarma Record. | E06 | S–M | — |
| 1.4 | Prueba e2e del camino principal: dos frecuencias, comparar el retardo con la DM y el período con P. | E06 | S–M | 1.1 |
| 1.5 | Guardar Radio y las mediciones de púlsares en "Save investigation". | E06, P02 | M | — |
| 1.6 | Guía dentro de la app para Púlsares, Pléyades, Clasificación y HR, con el formato de `HubbleLabGuide`. | E03–E06 | M | — |
| 1.7 | Fotómetro conectado al apuntado del telescopio para las 16 estrellas admitidas. Incluir `PLEIADES.HTL`. | E04 | S–M | Decisión 1 |
| 1.8 | HR de base de datos: marco nativo, sliders, E(B−V) prellenado e informe "View/Print Parameters". | E05 | S–M | — |
| 1.9 | Pasar los pares B/V confirmados del fotómetro al panel "Data from Observations". | E04, E05 | M | 1.7 |
| 1.10 | Clasificación: quitar el límite de 3900–4500 Å del ancho equivalente, añadir la tabla de líneas y "Reverse Trace". | E03 | S | — |
| 1.11 | Modo estudiante: mover las notas técnicas a un panel "Notas de investigación" plegado. | Todos (Q02) | M | — |
| 1.12 | Resultados propios: llevar la z medida y la velocidad a "Observational Results", con guardar texto/CSV e imprimir con `window.print`. | E01, E03, P05 | M | — |

**Salida de la fase 1:** Pléyades, Clasificación, HR (por base de datos y por observaciones propias de Pléyades) y Púlsares se pueden completar de principio a fin con guía y prueba e2e.

### Fase 2: Hubble completo y observatorio utilizable (~2–3 semanas)
| # | Trabajo | Esfuerzo |
|---|---|---|
| 2.1 | Motor general de campos conectado a la interfaz, reutilizando `catalogPopulation`, `catalogMerge`, `galaxyScene` y `detectorRaster` con `CLEA_GLX.DAT`. | L |
| 2.2 | Galaxias de Hubble: empezar por los casos sin ejes (CorBor‑1 y ‑3), después variables y QSO en el campo. Meta: al menos 8 de 13. | M por caso |
| 2.3 | Hot List óptica completa, reutilizando la búsqueda de Radio: Print, h/m/s, Slew to Selection y Add Current Item. | S |
| 2.4 | Coordenadas en h/m/s y d/′/″, más la época B1950 una vez trazada la precesión. | S + S–M |
| 2.5 | Fecha/hora y sitio editables, solo para los relojes y el horizonte. | S–M |
| 2.6 | Diálogo de opciones ópticas mínimo: Limit Slewing y el horizonte. El resto se marca explícitamente como ausente. | S–M |
| 2.7 | Espectrómetro: rango espectral, y guardar o imprimir el espectro propio. | S–M |

**Salida de la fase 2:** Hubble con al menos 8 galaxias, y un observatorio óptico parecido al original en el uso diario.

### Fase 3: LSS, cámaras y Object X (después de la fase 2)
- LSS (E02): listas `LSS_FieldNN.HTL`, adquisición de muchas galaxias con el motor de la fase 2, registro de redshift y conexión con la cuña que ya existe. Esfuerzo L. El multiespectrómetro (I03) se puede dejar para después si se adquiere con el espectrómetro normal.
- CCD e IR (I04, I05): hay que decidir qué hacer con NOMAD, el catálogo en línea del que depende la cámara, y después conectar la lógica que ya existe a una interfaz. Esfuerzo L.
- Object X (E08): depende de CCD, astrometría, `ObjectX.HTL` y los archivos de órbitas. Esfuerzo L.
- Variables y curvas de luz (TVStarListForm1, TLtCrvDsplyForm1): necesita `CLEA_VStrs.dat`. Esfuerzo M.

### Fase 4: otros programas de CLEA (proyecto aparte)
E07 y E09–E15 (astrometría, Sol, tránsitos, Júpiter, Roemer, Mercurio, flujo solar, XMM), X01 y X02. El primer paso es extraer e inventariar con REA los instaladores de `CLEA_Labex1.zip`, y después priorizar.

---

### Decisión 1: aprobada (usuario, 26 oct 2026)
Quedó registrada en `AGENTS.md`. Estos son los archivos, todos de `CLEA_Vireo.zip` (SHA-256 `58dc02a6…6778b`, carpeta `program files/CLEA/VIREO/`):

| Archivo | Bytes | SHA-256 |
|---|---|---|
| Pulsars.dat | 285692 | `ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa` |
| Pulsars.HTL | 688 | `9dfba54887a0bf493ca665f53e69f48c13f3a54f7aa4f878912914468e28a439` |
| PLEIADES.HTL | 2064 | `f992103946e8f809ac9bb6806fafa6424933ba6e78cfee6fb5740e4ab3b038a2` |
| Hubble.HTL | 1118 | `02cab4d0d036778535a33e0dd7fe66b78fc0371da75dc32e0b26ee48513f7986` |
| ObjectX.HTL | 1462 | `fd9e68e4c1cd1c89584581be329c157af1edf139aabc7591f397fd49858243b3` |
| LSS_Field01.HTL | 1978 | `4981140366916c6aa410afe7905a165bceb89af47686375c4f0cf60f42acbe9e` |
| LSS_Field02.HTL | 2150 | `994bfeb21bcde528faeb3969fb25c24fe7a0c8de8940c33beffec50248b4ec3d` |
| LSS_Field03.HTL | 2150 | `1b62cf132edca82187a793b6ed2671eea715b040b884412e6131cf0aa0a2e830` |
| LSS_Field04.HTL | 1978 | `d19f8c5b3fc159e991baaa4572c1357bff15bdfdf72e83062fadebd17eb5ea53` |
| LSS_Field05.HTL | 2064 | `7c2b82906a816398398ae1d62adb82d030675f28201623563b1bbf0baf90b8fe` |
| LSS_Field06.HTL | 1806 | `799d7c24623114f012899ad2b538fe8e128364e5f084816392a4243a822fa253` |
| LSS_Field07.HTL | 2236 | `ee4b402123321c5127badb72761e6f766205d5fc19f6877d6c90165def0d3d62` |
| LSS_Field08.HTL | 2150 | `ae677d270a1e11cf6a09bafa890716065c81b8a20e267570fa8c9b44599b3b2d` |
| LSS_Field09.HTL | 2322 | `b4ab710dd3adb9fe0f6cc980978688faa5c522dba233df972edcd8800d89350e` |
| CLEA_GLX.DAT | 1420071 | `4c1c9c99babaae19e22834df9bfcfa375a659257c4b7dd267a9da7d8ef16f753` |
| CLEA_VStrs.dat | 2865524 | `55b7e3c392caf7d9df729b8222c4f2164fc0e23bde5da7c4e6c05ff679dc87de` |
| CLEA_QSO.DAT | 117988 | `69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5` |

**Base de la aprobación:** `License.rtf` de CLEA permite hacer copias gratuitas y sin fines comerciales para estudiantes, y prohíbe distribuirlas con fines de lucro.

**Créditos que hay que poner:**
- Project CLEA (Gettysburg College), como autor.
- NSF y Gettysburg College, como financiadores.
- Para `Pulsars.dat`, el ATNF Pulsar Catalogue (Manchester et al. 2005), como fuente probable, indicando que ese origen no está confirmado.

## 6. Próximo paso sugerido
1. Que decidas sobre los datos (sección 4, punto 1). Con solo `Pulsars.dat` y las `.HTL` se desbloquea la mayor parte de la fase 1.
2. Que Codex adopte el tablero de 7 ejercicios y las reglas de trabajo de la sección 5, y arranque la fase 1 en dos frentes en paralelo: Púlsares (1.1–1.5) y Pléyades/HR (1.7–1.9).

### Anexos (en la carpeta de investigación, fuera del repo)
Carpeta: `/home/dobleuber/Documents/Codex/2026-10-17/task-2/analysis/claude-audit-2026-10-26/`
- `veo-res.json`: salida de REA `inspect-pe-resources`.
- `veo-forms.json`: los 81 formularios decodificados (`dfm.py`).
- `veo-menus.txt`: menús y controles por formulario (`menus.py`).
- `audit-optical.md`, `audit-spectral.md`, `audit-clusters-lss.md`, `audit-radio.md`: auditoría formulario por formulario, con evidencia `archivo:línea`.
- `audit-report-check.md`: verificación del informe.
