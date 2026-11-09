import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front ES2: Spanish (es-419) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_ES:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'Efectos de sonido',
 toggle:'Efectos de sonido (los sonidos de la cúpula y del telescopio de VIREO)',
 hint:'Sonido para la cúpula, el movimiento, etc.',
 note:'Apagado salvo que lo actives, y solo durante esta visita. No se descarga nada mientras está apagado; al activarlo se prepara el sonido del motor, y los demás se cargan cuando se necesitan por primera vez. En VIREO era una opción de instructor, activada por defecto. La puerta de la cúpula suena mientras se abre o se cierra, y luego suena uno de ocho sonidos finales; un movimiento manual reproduce el servo, y un movimiento a coordenadas, el motor. Varios de estos efectos de 1992–93 pueden provenir de una colección de terceros que CLEA incluyó.',
 loading:'Cargando el sonido…',
 failed:'Las funciones de sonido de VIREO no están disponibles: este navegador no pudo cargar o reproducir el sonido, así que Efectos de sonido (Sound Effects) se volvió a apagar.',
 channel:{dome:'Sonido de la cúpula',telescope:'Sonido del telescopio'},
});
