import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'no se pudo descargar',size:'no tiene su tamaño registrado',sha256:'no coincide con su SHA-256 registrado'});

/** Front ES2: Spanish (es-419) for the Front P web texts (spectrometer routes, prints, About box, hot-list notes); ES1's two strings are kept. A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_ES:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'Dónde tomar un espectro',
  intro:'El espectrómetro de VIREO se usa desde el observatorio, con el telescopio apuntado a un objetivo. En OpenVireo cada ejercicio tiene su propia ruta verificada al espectrómetro:',
  routesTitle:'Rutas al espectrómetro',
  routes:Object.freeze([
   Object.freeze({label:'Exposición de estrella de catálogo',help:'el espectro de la estrella compatible del catálogo, con Guardar e Imprimir.'}),
   Object.freeze({label:'Exposición de galaxias',help:'las trece galaxias de Hubble.HTL (ley de Hubble).'}),
   Object.freeze({label:'Sondeo LSS',help:'espectros de galaxias en los nueve campos LSS.'}),
   Object.freeze({label:'Objeto X',help:'espectros de los objetivos del Objeto X.'}),
   Object.freeze({label:'Multi-Spec',help:'la tarjeta del espectrómetro multiobjeto en el observatorio, en los campos de ejercicio incluidos (y en la práctica del Objeto X).'}),
   Object.freeze({label:'Analizador de espectros',help:'mide desplazamientos de líneas y registra corrimientos al rojo.'}),
   Object.freeze({label:'Clasificación',help:'clasifica espectros de estrellas comparándolos con los estándares.'}),
  ]),
  retired:'Esta página mostraba una vista previa de perfiles de fuente preparados (M82, Coma1, Coma2) antes de que existiera la adquisición. Se retiró el 2026-10-29; las rutas de arriba la reemplazan.',
 }),
 clusterGuide:Object.freeze({nav:'Guía del diagrama HR de cúmulos'}),
 multiSpecPrint:Object.freeze({unavailable:'Imprimir el campo de selección (Print Selection Field) no está disponible: aquí no se muestra ningún campo de Multi-Spec.'}),
 infoListPrint:Object.freeze({
  note:'Vista previa de impresión de la página de lista de VIREO: la fecha y la hora (aquí en el formato de tu navegador), la línea de la mesa de laboratorio (no se registra en este sitio), la línea del estudiante (en blanco: aquí no se inicia sesión), el título de la ventana y las líneas de la lista, en Courier. El interlineado y las sangrías siguen la página de VIREO; no se reproducen las métricas de la impresora. El título del trabajo de impresión de VIREO no se imprime en la página.',
 }),
 siteInfo:Object.freeze({
  note:'En VIREO, esta ventana de lista oculta sus menús Buscar (Search), Guardar texto (Save Text) y Editar (Edit) para la información del sitio, así que solo se ofrecen Imprimir (Print) y Cerrar (Close).',
  printNote:'Adaptación web: VIREO imprime las líneas de la lista bajo su encabezado compartido en la impresora; aquí se imprimen la fecha, el título y las líneas.',
 }),
 hotListEdit:Object.freeze({
  note:'Editar, Eliminar y Deshacer (Edit, Delete, Undo) cambian la lista de objetos compartida, como lo hace el editor de Listas de objetos originales; Deshacer revierte solo la última edición o eliminación hecha aquí.',
  deleteNote:'Adaptación web: la fila se quita de la lista compartida; Deshacer la vuelve a poner donde estaba en el archivo (VIREO la reinserta según su AR).',
 }),
 hotListPopup:Object.freeze({
  note:'Editar, Eliminar y Deshacer (Edit, Delete, Undo) están en el editor de Listas de objetos originales de esta página.',
 }),
 cameraFieldSize:Object.freeze({
  note:'Para el telescopio aplicado, como lo muestra VIREO al abrir la cámara (aquí con dos decimales).',
 }),
 terminateSlew:Object.freeze({
  note:'Adaptación web: VIREO suspende el movimiento mientras pregunta; aquí el telescopio sigue moviéndose hasta que respondas (si llega antes, la pregunta se cierra). Sí lo detiene donde está; No deja que continúe.',
 }),
 comparison:Object.freeze({
  clear:'Borrar la comparación',none:'Ninguna (borrada)',
  note:'Espectro de comparación (Comparison Spectrum) › Borrar (Clear) de VIREO: quita las líneas de comparación del gráfico y de la tabla. Elige una lista para volver a mostrarlas. El estado borrado no se guarda; una investigación guardada conserva la lista elegida.',
 }),
 results:Object.freeze({
  help:'Herramientas › Editores de resultados (Results Editors) de VIREO. Resultados de observación abre tus resultados de observación en el analizador de espectros; Resultados de púlsares abre las mediciones de púlsares guardadas en el análisis de púlsares.',
 }),
 pulsarPrint:Object.freeze({
  note:'Imprimir ventana (Print Window) de VIREO (PrintScreen1Click 0x56d9d8, Front RE5) imprime su propio encabezado y los parámetros de los datos, y luego la imagen de la ventana. Como en VIREO, abrirla cambia todos los paneles al modo de cursor vertical, y los paneles se imprimen con los colores de impresión de VIREO (fondo blanco; ejes, etiquetas y trazos negros; los cursores conservan sus colores). En horizontal se imprime “(Screen Image Printed on Next Page)” (la imagen de pantalla va en la página siguiente) y la imagen queda en la página 2. Adaptación web: la orientación se elige aquí (VIREO toma la de la impresora), la fecha es la del navegador, los nombres de la mesa y del estudiante dicen “(Not Recorded)” (no registrado), porque no hay inicio de sesión, y la imagen son los paneles web, no la imagen de la ventana de VIREO.',
  orientation:'Orientación de la página',portrait:'Vertical',landscape:'Horizontal',
 }),
 wedgePrint:Object.freeze({
  note:'Adaptación web: Imprimir (Print) de VIREO fija el esquema de colores al contrario de la opción Imprimir en color (Print in Color) (scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3), así que imprime en blanco y negro a menos que esa opción esté marcada (desactivada por defecto en VIREO; Opciones de simulación óptica, Optical Simulation Options). Esta impresión sigue la opción y usa el diseño de impresión del navegador. El resaltado de la selección no se imprime.',
 }),
 printSky:Object.freeze({
  note:'VIREO imprime su encabezado (la fecha y la hora, aquí en el formato de tu navegador; el número de mesa de laboratorio solo cuando hay uno registrado; luego la línea del nombre del estudiante, en blanco aquí porque OpenVireo no tiene inicio de sesión), la imagen del cielo con los colores invertidos y a escala 1.5, y el pie con el centro del campo, el tamaño del campo, el telescopio y el instrumento. Adaptación web: el navegador compone la página e imprime la vista tal como se muestra.',
  noInstrument:'(no se eligió ningún instrumento en la vista del telescopio de OpenVireo)',
 }),
 about:Object.freeze({
  nativeNote:'El cuadro Acerca de (About) de VIREO, con sus textos tal como se leyeron del programa original (su logotipo no se incluye). El resto de esta ventana describe esta reconstrucción web.',
  siteTitle:'Este sitio',
  site:'OpenVireo es una reconstrucción web gratuita y no comercial de VIREO de Project CLEA para estudiantes, hecha en el navegador a partir del comportamiento recuperado de VIREO y de sus archivos de datos originales. No es el programa de CLEA ni afirma ser equivalente a él; las adaptaciones web se señalan donde aparecen. La traducción al español es una adaptación web de OpenVireo; los archivos y textos de CLEA no cambian.',
  worksTitle:'Qué funciona',
  works:Object.freeze([
   'Los siete ejercicios de VIREO tienen una ruta web para estudiantes: la ley de Hubble (13 galaxias), la estructura a gran escala, la clasificación estelar, la fotometría de las Pléyades (24 estrellas), los diagramas HR de cúmulos, los púlsares y la búsqueda del Objeto X.',
   'Observatorio óptico: cúpula, telescopios, vistas del buscador y del telescopio, movimiento del telescopio con el límite del horizonte opcional, listas de objetos, sitio y fecha, información del catálogo y del campo, y las listas de estrellas variables y de QSO.',
   'Instrumentos: espectrómetro y fotómetro para los objetivos de los ejercicios, cámaras CCD e infrarroja (consulta del catálogo en vivo), el espectrómetro multiobjeto (Multi-Spec, en los campos de ejercicio incluidos y en la práctica del Objeto X) y el radiotelescopio con su receptor y el análisis de púlsares.',
   'Análisis: medición y clasificación de espectros, ajustes de Hubble y de las Pléyades, el diagrama de cuña de LSS, tus resultados de observación y las investigaciones guardadas.',
  ]),
  privacyTitle:'Privacidad',
  privacy:Object.freeze([
   'Sin cookies y sin cuentas: OpenVireo nunca te pide tu nombre, tu dirección de correo electrónico ni una contraseña.',
   'Tus investigaciones, opciones y resultados se guardan solo en tu computadora: en el almacenamiento propio de este navegador o en archivos que eliges descargar. No se sube nada.',
   'Las visitas se cuentan solo en conjunto y sin cookies (Cloudflare Web Analytics). Como cualquier servicio de alojamiento web, Cloudflare recibe los datos técnicos de cada solicitud, como tu dirección IP, para servir la página.',
   'La consulta del catálogo en vivo de las cámaras CCD e infrarroja envía solo las coordenadas del cielo y el radio del campo a CDS/VizieR (o a uno de sus espejos oficiales). Tu navegador se conecta directamente con ese servidor, así que, como cualquier sitio web, este ve tu dirección IP.',
   'Los enlaces externos (el Archivo de imágenes del HST, Ayuda › Sitios web) se abren en una pestaña nueva solo cuando haces clic en ellos, y no se envía nada con ellos.',
  ]),
  creditsTitle:'Créditos',
  credits:Object.freeze([
   'Project CLEA, Gettysburg College: creador de VIREO y de sus archivos de datos. Con el apoyo de la National Science Foundation y de Gettysburg College.',
   'Datos de púlsares: probablemente derivados del catálogo de púlsares del ATNF (Manchester, Hobbs, Teoh & Hobbs 2005); ese origen es incierto.',
   'Catálogos de las cámaras: CDS/VizieR (doi:10.26093/cds/vizier); NOMAD (Zacharias et al. 2004); USNO-B1.0 (Monet et al. 2003); 2MASS (Skrutskie et al. 2006) a través de NOMAD.',
   'Campos de estrellas: subconjuntos acotados del catálogo de estrellas guía (Guide Star Catalog) tal como viene con VIREO.',
  ]),
 }),
 print:Object.freeze({
  title:'Vista previa de impresión',button:'Imprimir…',close:'Cerrar',error:'No se puede imprimir en este navegador.',
  missing:'No hay nada que imprimir: la imagen no se muestra en este momento.',
 }),
 pulsarsHtl:Object.freeze({
  button:'Cargar Pulsars.HTL incluido (púlsares)',
  note:'Adaptación web: la lista de púlsares de VIREO, Pulsars.HTL (8 púlsares), se incluye byte a byte con este sitio; en VIREO la abres con Cargar lista de objetos... (Load Hot List...) desde su carpeta. Cargarla reemplaza la lista de objetos actual, como lo hace Cargar lista de objetos...',
  error:(code:BundledHotListFailure)=>`La lista de púlsares incluida (Pulsars.HTL) ${FILE_REASONS[code]}; la lista de objetos actual no cambió.`,
 }),
});
