import type {WEB_HELP_EN} from '../../../help/webHelp';
import type {Translation} from '../../maps';
/** Front ES-HELP: Spanish (es-419) for OpenVireo's own help topics (Help › Temas de ayuda…). The labels quoted from OpenVireo's
 * screen are the Spanish ones the interface already shows; VIREO's own menu names come from originals.json. A web adaptation by
 * OpenVireo, not CLEA's. Text only: the topic ids, block kinds and related links are the English source's (webHelp.ts). */
const p=(text:string)=>text;
const steps=(...items:string[])=>items;
const list=(...items:string[])=>items;
const topic=(title:string,blocks:readonly (string|readonly string[]|{head:readonly string[];rows:readonly (readonly string[])[]})[])=>({title,blocks});

const START={title:'Empieza aquí',topics:[
 topic('Qué es OpenVireo',[
  p('OpenVireo es una versión para el navegador de VIREO, el Observatorio Virtual Educativo de Project CLEA (Gettysburg College). Está reconstruida a partir del comportamiento recuperado de VIREO y de sus archivos de datos originales; no es el programa propio de CLEA.'),
  p('No se instala nada y no hay inicio de sesión ni cuenta. Todo se ejecuta en esta pestaña del navegador, y tu trabajo se queda en la pestaña hasta que lo guardes como archivo en tu computadora.'),
  p('La versión 1.0 contiene los siete ejercicios de VIREO: la ley de Hubble, la estructura a gran escala (LSS), la clasificación estelar, la fotometría de las Pléyades, los diagramas HR de cúmulos, los púlsares y la búsqueda del Objeto X. Cada uno tiene una guía en Guías de los ejercicios, en el encabezado.'),
 ]),
 topic('Primeros pasos',[
  p('Si tu instructor te dio un ejercicio, abre primero su guía: la guía enumera cada paso y te lleva a la página correcta. Para explorar libremente:'),
  steps(
   'Abre Observatorio en el encabezado (grupo Observatorio óptico).',
   'Presiona Abrir la cúpula.',
   'En Elige un objeto, escoge un objetivo de la lista (o escribe en Buscar en catálogo) y luego presiona Apuntar el telescopio.',
   'Abre Reloj del observatorio y seguimiento espectral y presiona Activar seguimiento. Las cámaras y los espectrómetros necesitan el seguimiento.',
   'Cambia a la vista del telescopio y usa un instrumento: Abrir el espectrómetro, la cámara CCD o la cámara IR, o Multi-Spec.',
   'Mide lo que registraste en una página de Análisis y luego guarda tu trabajo (consulta Guardar tu trabajo).'),
 ]),
 topic('Guías de los ejercicios',[
  p('El grupo Guías de los ejercicios, en el encabezado, tiene un botón por ejercicio: Guía de la práctica de Hubble, Guía LSS, Guía del Objeto X, Guía de púlsares, Guía de la práctica de las Pléyades, Guía de clasificación y Guía del diagrama HR de cúmulos.'),
  p('Una guía se abre como una ventana con pasos numerados. Una marca indica cada paso que completaste, y un botón como Continuar al siguiente paso o Ir al siguiente paso te lleva a la página del paso siguiente. Cierra la guía cuando quieras y vuelve a abrirla desde el encabezado; tu avance se conserva mientras la pestaña siga abierta.'),
  p('Abrir una guía también inicia ese ejercicio, como lo hacía elegir un ejercicio en VIREO: define qué telescopios están abiertos (consulta Telescopios y Solicitar tiempo) y si se muestran los nombres y las magnitudes de los objetos. En el ejercicio del Objeto X, la identidad del objeto permanece oculta hasta que la reveles.'),
 ]),
 topic('Si vienes de VIREO (Windows)',[
  p('Si conoces el programa de Windows, o si tu hoja de ejercicios se escribió para él, esta tabla muestra dónde está cada paso de VIREO en OpenVireo.'),
  {head:['En VIREO (Windows)','En OpenVireo'],rows:[
   ['Archivo › Iniciar sesión...','No hace falta: no hay cuentas ni inicio de sesión. Los nombres en las impresiones quedan en blanco.'],
   ['Archivo › Ejecutar ejercicio','Abre la guía del ejercicio en Guías de los ejercicios, en el encabezado.'],
   ['Archivo › Fijar fecha/hora de observación e ID...','Reloj del sitio › Fijar fecha/hora… en la página Observatorio (UT). La página del Objeto X tiene su propio cuadro de fecha y hora (Fijar el reloj del observatorio); su cuadro de ID rotula tus datos guardados.'],
   ['Telescopios › Óptico','La tarjeta Telescopio óptico en la página Observatorio: elige un perfil y luego Usar este telescopio.'],
   ['Telescopios › Óptico › Solicitar tiempo','El cuadro Solicitar tiempo de la misma tarjeta (solo en los ejercicios en los que VIREO restringe los telescopios más grandes).'],
   ['Telescopios › Radio','Radiotelescopio en el encabezado (grupo Radioobservatorio).'],
   ['Interruptor Abrir/Cerrar la cúpula','Abrir la cúpula / Cerrar la cúpula en la página Observatorio.'],
   ['Botón del panel de control del telescopio','Cambia a la vista del telescopio y luego usa Mover el telescopio y las tarjetas de los instrumentos.'],
   ['Herramientas › (herramientas de análisis)','El grupo Análisis en el encabezado: Analizador de espectros, Clasificación estelar, Base de datos de cúmulos, Sondeo LSS, Datos LSS, Objeto X, Estrellas variables; Datos de radio para los púlsares.'],
   ['Herramientas › Editores de resultados','El grupo Editores de resultados en el encabezado: Resultados de observación y Resultados de púlsares.'],
   ['Cargar datos guardados...','Restaurar investigación (JSON) en la barra de copia de seguridad, o el botón de carga del editor de resultados desde el que guardaste.'],
   ['Herramientas › Hoja de cálculo','Usa Descargar CSV de resultados y abre el archivo en cualquier programa de hojas de cálculo.'],
   ['Herramientas › Procesamiento de imágenes (DS9)','Las imágenes de las cámaras se guardan como descargas FITS y se pueden abrir en Archivos › Imágenes guardadas o en cualquier visor de FITS, incluido DS9.'],
   ['Archivo › Salir del observatorio','Guarda tu trabajo y luego cierra la pestaña del navegador. El menú Archivo de Mover el telescopio tiene Salir del observatorio, que muestra el recordatorio de VIREO.'],
   ['Teclado: Alt, NumLock y MouseKeys','Las teclas normales del navegador: consulta Menús, teclado y celulares.'],
  ]},
 ]),
]};

const OBSERVATORY={title:'El observatorio',topics:[
 topic('Cúpula, apuntado y seguimiento',[
  p('La página Observatorio sigue tres pasos: 1 · Abre la cúpula, 2 · Elige y apunta, 3 · Explora un instrumento.'),
  list(
   'Abrir la cúpula muestra el cielo y habilita los controles del telescopio. La vista del campo cambia entre Buscador · 2.5° y Telescopio · 15′.',
   'Elige un objeto enumera objetivos sugeridos, la lista del ejercicio de Hubble y todos los objetivos del catálogo; Buscar en catálogo aplica un filtro a la lista (Esc lo borra). Apuntar el telescopio centra el telescopio en tu elección. En Escribir coordenadas, Apuntar a las coordenadas apunta a cualquier ascensión recta y declinación.',
   'Mover el telescopio mueve el telescopio mientras mantienes presionado un botón de dirección (con el mouse, Espacio o Enter). Su menú tiene Fijar coordenadas…, Ver/seleccionar de la lista… (las listas de objetos) y Agregar el objeto o la posición actual a la lista….',
   'El seguimiento está en Reloj del observatorio y seguimiento espectral: Activar seguimiento mantiene la posición del telescopio mientras corre el reloj. Las cámaras y los espectrómetros se niegan a tomar datos mientras el seguimiento está desactivado.'),
 ]),
 topic('Telescopios y Solicitar tiempo',[
  p('La tarjeta Telescopio óptico de la página Observatorio ofrece los tres telescopios de VIREO: el de 0.4 m, el de 0.9 m de KPNO y el de 4 m de KPNO. Elige uno en Perfil de telescopio para examinar o seleccionar y presiona Usar este telescopio. Los menús de VIREO llaman al de 0.9 m el telescopio de 1.0 metros.'),
  p('En los ejercicios de fotometría de las Pléyades, de diagramas HR de cúmulos y de clasificación, los telescopios más grandes están restringidos, como en VIREO. Entonces aparece en la tarjeta un cuadro Solicitar tiempo, con Solicitar el telescopio de 1.0 metros y Solicitar el telescopio de 4.0 metros. Si se concede el tiempo, obtienes un número de usos; si no, puedes volver a solicitarlo después de unos minutos. El de 0.4 m siempre está disponible, y los ejercicios de Hubble, LSS y Objeto X dejan abiertos todos los telescopios.'),
 ]),
 topic('Fecha, hora y sitio',[
  p('Reloj del observatorio y seguimiento espectral inicia y pausa el reloj del observatorio y activa o desactiva el seguimiento.'),
  p('Reloj del sitio · escenario UT fijo establece la fecha y la hora de observación con Fijar fecha/hora… (en UT, no en hora local). Información del sitio… muestra el observatorio y Parámetros del sitio… cambia su sitio para los relojes y el horizonte. Usa la fecha y la hora que da tu material del ejercicio.'),
 ]),
 topic('Instrumentos',[
  list(
   'Espectrómetro: Abrir el espectrómetro en la página Observatorio, o las páginas de los ejercicios (Exposición de estrella, Exposición de galaxia, Sondeo LSS, Objeto X). El botón Espectrómetro del encabezado indica dónde se toma cada tipo de espectro.',
   'Fotómetro: Fotometría de las Pléyades en el encabezado.',
   'Exposición del cielo, Exposición de estrella y Exposición de galaxia en el encabezado toman espectros del fondo de cielo, de la estrella compatible del catálogo y de las galaxias de Hubble.',
   'Cámaras CCD e IR: la tarjeta de la cámara en la página Observatorio. Iniciar exposición toma una imagen; Guardar imagen (FITS) la descarga. Los campos sin una lista de estrellas incluida pueden consultar en vivo el servicio de catálogos VizieR (solo se envían las coordenadas y el radio).',
   'Multi-Spec: la tarjeta del espectrómetro multiobjeto en la página Observatorio.',
   'Radiotelescopio: consulta Radiotelescopio y púlsares.'),
  p('Cada instrumento tiene su propio botón de Ayuda. Muestra la ayuda de VIREO para ese instrumento, traducida, con Ver original (inglés); donde el panel de OpenVireo difiere del de VIREO, el propio panel tiene una nota web.'),
 ]),
 topic('Radiotelescopio y púlsares',[
  p('Radiotelescopio, en el encabezado, abre el panel de control del radiotelescopio. Inícialo con Iniciar ejercicio de púlsares, apunta a un púlsar y registra su señal con el receptor. El panel tiene su propio menú Ayuda con la ayuda de radio de VIREO.'),
  p('Datos de radio abre el análisis de púlsares: mide el periodo y el retraso entre frecuencias con los cursores, en tu registro o en un archivo .PLR guardado. Las mediciones registradas se pierden al volver a cargar la página a menos que las guardes: Guardar investigación conserva tu registro y las mediciones confirmadas (consulta Guardar tu trabajo).'),
 ]),
]};

const ANALYSIS={title:'Análisis y resultados',topics:[
 topic('Páginas de análisis',[
  list(
   'Analizador de espectros: alinea líneas de referencia con un espectro para medir su corrimiento al rojo y conserva tus resultados.',
   'Clasificación estelar: compara un espectro con las estrellas estándar del atlas y elige su tipo espectral.',
   'Base de datos de cúmulos: grafica diagramas HR de cúmulos y ajusta la secuencia principal y las isócronas.',
   'Sondeo LSS: toma los espectros de galaxias de los campos del sondeo. Datos LSS: grafica los corrimientos al rojo en un diagrama de cuña.',
   'Objeto X: identifica un objeto desconocido a partir de su identificador y sus coordenadas.',
   'Estrellas variables: busca una estrella variable y grafica su curva de luz.',
   'Datos de radio: mide púlsares (consulta Radiotelescopio y púlsares).'),
 ]),
 topic('Guardar tu trabajo',[
  p('OpenVireo no guarda nada en un servidor. La mayor parte de tu trabajo vive en esta pestaña y se pierde al volver a cargarla o cerrarla, así que guárdalo como archivo en tu computadora.'),
  list(
   'Guardar investigación (en la barra de copia de seguridad, cerca de la parte superior de la página) descarga un archivo con tus espectros, mediciones y ajustes. Restaurar investigación (JSON) vuelve a cargar ese archivo más adelante. Qué incluye una copia de seguridad enumera exactamente lo que abarca.',
   'Resultados de observación (en el grupo Editores de resultados) abre tus corrimientos al rojo confirmados: Descargar texto de resultados, Descargar CSV de resultados (para un programa de hojas de cálculo) e Imprimir resultados.',
   'Guardar investigación también conserva tu registro de púlsares y las mediciones de púlsares confirmadas. Para un archivo .CSV usa Guardar mediciones registradas (.CSV) en Datos de radio; Resultados de púlsares abre un archivo guardado para revisarlo.',
   'Las imágenes de las cámaras se descargan como archivos FITS; ábrelas en Archivos › Imágenes guardadas.',
   'Las listas de objetos se guardan como archivos .HTL desde el editor de Listas de objetos originales.'),
  p('Solo el tema de color, qué secciones del menú dejaste abiertas, si ya viste el recorrido, si la tecla ? abre la ayuda, el Modo de demostración del instructor y el cuaderno de observación de clasificación los recuerda el propio navegador.'),
 ]),
 topic('Impresión',[
  p('Algunos botones de impresión, como Imprimir resultados e Imprimir espectro, abren directamente el cuadro de diálogo de impresión de tu navegador. Otros, como Imprimir imagen del cielo... e Imprimir diagrama de cuña..., primero muestran una vista previa de impresión cuyo botón Imprimir… lo abre. El cuadro de diálogo de impresión del navegador también puede guardar como PDF.'),
 ]),
 topic('Terminar un ejercicio',[
  p('Guarda tu investigación y los archivos de resultados que necesites para tu informe, y luego cierra la pestaña del navegador. Salir del observatorio, en el menú Archivo de Mover el telescopio, muestra el recordatorio de fin de ejercicio de VIREO; una página web no puede cerrarse sola, así que cierras la pestaña tú.'),
 ]),
]};

const SITE={title:'Usar el sitio',topics:[
 topic('Menús, teclado y celulares',[
  list(
   'El menú agrupa todas las páginas en secciones: Observatorio óptico, Radioobservatorio, Análisis, Editores de resultados, Archivos y Guías de los ejercicios. Haz clic en el nombre de una sección para abrirla o cerrarla; la sección de la página en la que estás se abre sola, y el navegador recuerda las demás. En un celular, el menú está detrás del botón Menú.',
   'Ayuda siempre está en la parte superior de la página, también en un celular. Presiona la tecla ? en cualquier lugar fuera de un campo de texto para abrir estos temas de ayuda; puedes desactivar esa tecla más abajo.',
   'Ayuda › Hacer el recorrido por el sitio vuelve a mostrar el recorrido de la primera visita.',
   'Código fuente e Informar un problema, al pie del menú y en Ayuda, abren la página de OpenVireo en GitHub en una pestaña nueva. Informar un problema inicia una incidencia nueva con el nombre de la página en la que estabas ya escrito; GitHub te pide iniciar sesión, y no se envía nada hasta que lo envíes allí.',
   'Tab y Mayús+Tab se mueven entre los controles; Enter o Espacio presiona un botón.',
   'Esc cierra los menús y los cuadros de diálogo.',
   'Los botones de dirección (del telescopio y de radio) se mueven mientras los mantienes presionados con el mouse, Espacio o Enter.',
   'Los cursores del espectro se mueven con las teclas de flecha (Mayús para pasos más grandes); Enter o Espacio aplica, Esc cancela.',
   'El interruptor de tema elige los colores Sistema, Claro u Oscuro.'),
  'Abrir los temas de ayuda con la tecla ?',
 ]),
 topic('Modo instructor',[
  p('Modo instructor…, en el encabezado, después de una confirmación, abre las opciones de instructor de VIREO en esta pestaña del navegador: Opciones de simulación óptica… en el menú de Mover el telescopio y las preferencias de radio, que están cerradas para los estudiantes. No tiene contraseña, no es un bloqueo y no muestra respuestas. Salir lo desactiva.'),
 ]),
 topic('La ayuda original de VIREO',[
  p('Los botones de Ayuda dentro de cada instrumento y herramienta muestran la ayuda propia de VIREO para esa ventana, traducida al español como adaptación web de OpenVireo; Ver original (inglés) muestra el texto del programa original sin cambios.'),
  p('La ayuda de la ventana principal de VIREO describía los menús del programa de Windows, que OpenVireo reemplaza con sus propias páginas, así que no se ofrece aquí: Si vienes de VIREO (Windows) relaciona cada uno de esos menús con su lugar en OpenVireo.'),
 ]),
]};

export const WEB_HELP_ES:Translation<typeof WEB_HELP_EN>=Object.freeze({
 caption:'Ayuda de OpenVireo',
 close:'Cerrar',
 navLabel:'Temas de ayuda',
 related:'Véase también:',
 groups:[START,OBSERVATORY,ANALYSIS,SITE],
});
