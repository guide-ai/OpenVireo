import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front ES8a: Spanish (es-419) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA's. */
export const RADIO_R1_ES:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:"Archivo ▸ Guardar datos registrados... (Save Recorded Data...) de VIREO (SvRcData1Click 0x567f70) ejecuta el mismo guardado que Guardar (Save) del Análisis de púlsares; está habilitado mientras existan datos registrados. Aquí abre el Análisis de púlsares, cuyo guardado verificado escribe el registro (adaptación web).",
 optionEffects:Object.freeze([
  "Graficar posiciones de púlsares (Plot Pulsar Positions; desactivado): dibuja los púlsares del catálogo en el mapa del cielo de radio.",
  "Escribir archivo de lista de objetos (Write Hot List File; desactivado): muestra Mover ▸ Lista de objetos ▸ Guardar lista actualizada....",
  "Pos. exacta para la lista de objetos (Exact Pos for Hot List; desactivado): Agregar el objeto actual a la lista (Add Current Item to List) almacena la posición del púlsar en el catálogo en lugar de la posición del telescopio.",
  "Funciones de sonido (Sound Features; activado): el receptor reproduce su sonido de pulso cuando existe un dispositivo de sonido.",
  "Modo de prueba (Test Mode; desactivado): un ajuste del instructor; Fijar coordenadas (Set Coordinates) mueve el telescopio al instante.",
  "Identificación del púlsar (Pulsar Identification; Usar nombre B1950): da nombre al título del receptor, al encabezado del registro y a las entradas de Agregar el objeto actual a la lista.",
  "Tipo de telescopio (Telescope Type; Totalmente orientable): únicamente Solo tránsito (Transit Only) cambia el comportamiento de VIREO; Arecibo no tiene código propio y se comporta como Totalmente orientable.",
 ]),
 optionEffectsTitle:"Qué hacen estos ajustes de VIREO (se muestran con sus valores compilados; aquí no se pueden editar):",
 findNote:"Buscar (Find) recorre cada línea almacenada (el texto del original de cada medición, tal como lo escribe Registrar [Record]) desde el principio o después de la fila seleccionada, sin distinguir mayúsculas y sin volver a empezar al final, como en VIREO. Como VIREO, recuerda tu última búsqueda en minúsculas. Adaptación web: el texto almacenado es de este sitio; puede diferir del de VIREO en la parte final del nombre de archivo (el navegador no da la carpeta) y, rara vez, en el último dígito de un número. La búsqueda recordada dura mientras esta página esté abierta.",
 saveDataOff:"Todavía no hay nada registrado: VIREO mantiene este elemento deshabilitado hasta que el análisis contenga datos registrados.",
});
