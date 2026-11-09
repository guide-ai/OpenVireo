import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front ES2: Spanish (es-419) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_ES:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'Observatorio virtual (instructor, VIREO)',
 virtualObservatoryAdaptation:'Adaptación web: en VIREO, esta opción de instructor, desactivada por defecto, habilita Ejecutar ejercicio (Run Exercise) › Observatorio virtual (todos los instrumentos), el modo en el que los estudiantes tienen Archivo (File) › Lista de QSO (QSO List). Aquí solo se abre en modo instructor, la forma web del Modo de demostración (Demonstration Mode), sin contraseña; está desactivada por defecto y la página no la guarda: solo Guardar cambios (Save Updates) la escribe, en un archivo de opciones que conservas. Salir la desactiva y su único efecto es mostrar Archivo › Lista de QSO.',
 sortDisabled:'Opciones de ordenamiento (Sort Options) solo está disponible en el Modo de edición (Edit Mode), como en VIREO; sin él, la lista se ordena por magnitud.',
 limitLabel:'Magnitud límite, V',
 withheld:'Las filas cercanas a los objetivos del Objeto X no se muestran, para que la lista no pueda revelar qué es un objetivo del Objeto X aún no revelado. Es una regla web: VIREO muestra esta lista solo en su modo Observatorio virtual (Virtual Observatory) o, durante el Objeto X, en el Modo de edición (Edit Mode).',
 editModeColumns:'Columnas del Modo de edición (Edit Mode): Z es el corrimiento al rojo del catálogo; B−V y U−B entre paréntesis son colores medios asignados. Ningún objetivo de ejercicio está en esta lista.',
 noActivate:'Hacer doble clic en una fila no hace nada, como en VIREO; usa Selección (Selection) para agregar un QSO a la lista de objetos.',
 csvDisabled:'En VIREO, Separado por comas (Comma Delimit) está desactivado para esta lista.',
 modeless:'La lista sigue abierta mientras observas; vuelve a elegir Archivo (File) › Lista de QSO (QSO List) para cambiar el límite o el orden.',
 printStudent:'Adaptación web: sin el Modo de edición (Edit Mode), VIREO imprime el número de mesa de laboratorio y los nombres de los estudiantes debajo de la fecha; este sitio no registra ninguno de los dos, así que imprime el “(no registrado)” (Not Recorded) de VIREO y ningún nombre.',
 fileError:(reason:string)=>`Adaptación web: la copia incluida ${reason}.`,
 fileReasons:Object.freeze({download:'no se pudo descargar',size:'no tiene su tamaño registrado',sha256:'no coincide con su SHA-256 registrado'}),
 objectXUnavailable:'No se puede mostrar la lista de QSO: no se pudieron cargar las posiciones de los objetivos del Objeto X y, sin ellas, la lista podría revelar un objetivo aún no revelado.',
 loading:'Cargando el catálogo de QSO…',
 noSelection:'Primero selecciona una fila de QSO.',
 hst:Object.freeze({
  newTab:'(sitio externo, se abre en una pestaña nueva)',
  note:`Adaptación web: VIREO abría ${HST_ARCHIVE.defaultUrl} (la “URL del archivo de noticias del HST”, “${HST_ARCHIVE.optionsLabel}” en las opciones de archivos [File Options] de VIREO) en una ventana del navegador. Esa página ya no existe; este enlace abre su equivalente actual en hubblesite.org, que la NASA ahora sirve como su galería de imágenes del Hubble (Hubble Images). No se envía nada con él.`,
 }),
});
