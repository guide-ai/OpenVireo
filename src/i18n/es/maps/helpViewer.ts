import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front ES-HELP: Spanish (es-419) for the help viewer's language switch and the Spectral Line Table window. VIREO's own texts
 * (the missing-file message and its caption) are VIREO's, translated as web adaptations. A web adaptation by OpenVireo, not CLEA's. */
export const HELP_VIEWER_ES:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'Traducción: adaptación web de OpenVireo (no es de CLEA)',
 originalLabel:'Original: el texto exacto de VIREO, en inglés',
 viewOriginal:'Ver original (inglés)',
 viewTranslation:'Ver traducción',
 translationError:'No se pudo mostrar la ayuda traducida (no coincidió con el archivo original del que se tradujo). La ayuda en inglés sigue disponible.',
 searchFoldNote:'En la traducción, la búsqueda ignora los acentos y las mayúsculas, lo cual es una adaptación web. La búsqueda propia de VIREO, que se conserva en la vista original, solo ignora las mayúsculas de la A a la Z.',
 spectralLines:Object.freeze({
  listCaption:'Líneas espectrales',
  rows:'Líneas espectrales',helpRows:'Texto de ayuda de la línea espectral',close:'Cerrar',
  loading:'Cargando la lista de líneas espectrales de VIREO…',
  error:'No se pudieron cargar los archivos de líneas espectrales de VIREO (SPECLNS.LNL, SPECLNS.TXT), o no coincidieron con su tamaño y SHA-256 registrados.',
  retry:'Intentar de nuevo',ok:'Aceptar',
  note:'La lista de líneas espectrales de VIREO (SPECLNS.LNL). Haz doble clic en una línea, o presiona Enter, para leer su ayuda de SPECLNS.TXT. Igual que VIREO, la ayuda se busca por el nombre de la línea, así que algunas líneas (por ejemplo las últimas líneas de He I) muestran la sección de la primera línea con ese nombre. Un solo clic (o una tecla de flecha) mueve el cursor de clasificación a la línea, en la columna de píxeles más cercana de la pantalla; luego la lista selecciona la línea más cercana a esa columna, como hace VIREO (así, Fe I 4143.878 selecciona He I 4143.76 en la vista completa). Las teclas de flecha siguen la misma regla, de modo que con la flecha hacia abajo no se puede pasar de He I 4143.76 a Fe I 4143.88; usa Fin o Inicio, o haz clic en una línea posterior, para pasar de largo.',
  missing:(file:string)=>`No se puede abrir el archivo de ayuda de líneas espectrales.\r\n\r\nNombre del archivo: ${file}\r\n\r\n¡No se encontró el archivo!`,
  missingCaption:'¡Ayuda de líneas espectrales no disponible!',
  cursorAt:(wl:string)=>`Cursor en: ${wl} Å (VIREO muestra la longitud de onda de la columna de píxeles del cursor, no la longitud de onda propia de la línea).`,
  cursorOutside:'La línea queda fuera del rango mostrado, así que no se dibuja ningún cursor (en VIREO las lecturas del cursor se borran, o apuntan más allá del borde derecho).',
  textErrorCaption:'Error del archivo de ayuda',
  textError:(file:string)=>`No se pudo cargar el archivo de ayuda de líneas espectrales de VIREO (${file}), o no coincidió con su tamaño y SHA-256 registrados. La lista de líneas sigue abierta; vuelve a intentar con la línea.`,
 }),
});
