import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ES2: Spanish (es-419) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_ES:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'no llegó un fragmento del catálogo',
  integrity:'un fragmento del catálogo no coincidió con su tamaño y SHA-256 registrados',
  index:'no se pudo leer el índice del catálogo, o no coincide con este sitio',
  budget:'este campo necesita a la vez más fragmentos del catálogo de los que este sitio mantiene en memoria',
  'missing-tile':'este sitio pidió el fragmento del catálogo equivocado (por favor, repórtalo)',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'en VIREO este campo lee más allá del final de una franja de declinación de su catálogo, lo que provoca un error de entrada/salida y deja una lista de estrellas parcial. En su lugar, este sitio no muestra ningún campo [adaptación web].',
  regions:'VIREO advertiría "¡El campo contiene demasiadas regiones!" y conservaría las primeras 100 regiones; este sitio no lo reproduce [adaptación web].',
  budget:'el campo tiene más registros de catálogo de los que este sitio lee en una franja de declinación [límite web].',
  plan:'este sitio leyó fuera de los fragmentos del catálogo que había planeado (por favor, repórtalo).',
  source:'un archivo de catálogo incluido no tiene la forma esperada (por favor, repórtalo).',
  input:'esta posición del telescopio no es un punto válido del cielo.',
  evidence:'el motor de campos encontró que sus registros son incoherentes (por favor, repórtalo).',
 } as Record<string,string>),
});
